/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const OpenAI = require("openai");
const functions = require("firebase-functions");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

let openai;
let currentApiKey = "";

/**
 * Initializes or re-initializes the OpenAI client.
 * Ensures the API key is correctly sourced from environment variables.
 */
function initializeOpenAIClient() {
  logger.info("Attempting to initialize OpenAI client for v2 function...");
  // In v2, configuration set by `firebase functions:config:set foo.bar=VALUE`
  // is NOT available via functions.config(). It should be set as an environment variable.
  // We will expect OPENAI_API_KEY to be set directly as an environment variable.

  let keyToUse = process.env.OPENAI_API_KEY;

  if (keyToUse) {
    logger.info("Found API key in process.env.OPENAI_API_KEY.");
  } else {
    logger.warn("API key NOT found in process.env.OPENAI_API_KEY. This is required for v2 functions.");
    // Attempt to log FIREBASE_CONFIG for diagnostics, though it's not the primary method for secrets.
    if (process.env.FIREBASE_CONFIG) {
      logger.info("Raw process.env.FIREBASE_CONFIG output:", process.env.FIREBASE_CONFIG);
    }
  }

  if (!keyToUse) {
    logger.error("Critical: OpenAI API key (OPENAI_API_KEY env var) could not be determined. Using dummy key.");
    keyToUse = "dummy_key_for_initialization";
  } else {
    logger.info("OpenAI API key determined from process.env.OPENAI_API_KEY.");
  }

  if (openai && currentApiKey === keyToUse) {
    logger.info("OpenAI client already initialized with the correct key.");
    return;
  }

  currentApiKey = keyToUse;
  openai = new OpenAI({apiKey: currentApiKey});
  if (currentApiKey === "dummy_key_for_initialization") {
    logger.warn("OpenAI client initialized with DUMMY key. Calls will likely fail.");
  } else {
    logger.info("OpenAI client (re)initialized successfully with API key from environment.");
  }
}

// Initial attempt to initialize the client when the module loads.
initializeOpenAIClient();

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA First vector
 * @param {Array<number>} vecB Second vector
 * @return {number} Similarity score between 0 and 1
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  return dotProduct / (magA * magB);
}

/**
 * Perform vector search in Firestore
 * @param {Array<number>} queryEmbedding The query embedding vector
 * @param {number} limit Maximum number of results to return
 * @return {Promise<Array>} Sorted search results
 */
async function performVectorSearch(queryEmbedding, limit = 10) {
  // Get all documents with embeddings
  const embeddingsSnapshot = await db.collection("embeddings").get();

  const results = [];

  // Calculate similarity for each document
  embeddingsSnapshot.forEach((doc) => {
    const data = doc.data();

    if (data.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, data.embedding);
      results.push({
        id: doc.id,
        documentId: data.documentId,
        segmentId: data.segmentId,
        textPreview: data.textPreview,
        similarity,
      });
    }
  });

  // Sort by similarity score (highest first) and limit results
  return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
}

/**
 * Cloud Function to generate embeddings and store in Firestore
 */
exports.generateEmbedding = onCall({
  maxInstances: 10,
}, async (request) => {
  initializeOpenAIClient(); // Ensure client is up-to-date
  try {
    const {text, documentId, segmentId, textPreview} = request.data;
    if (!text) {
      logger.warn("generateEmbedding called without text");
      throw new Error("Missing required 'text' field");
    }
    logger.info(`Generating embedding for ${text.length} characters`);
    if (currentApiKey === "dummy_key_for_initialization") {
      logger.error("generateEmbedding: OpenAI API key is not properly configured.");
      throw new Error("OpenAI API key not configured");
    }

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    const embedding = embeddingResponse.data[0].embedding;
    logger.info(`Generated embedding with ${embedding.length} dimensions`);

    const embeddingDoc = {
      embedding: embedding,
      documentId: documentId || null,
      segmentId: segmentId || null,
      textPreview: textPreview || text.substring(0, 200),
      createdAt: new Date(),
    };
    const docRef = await db.collection("embeddings").add(embeddingDoc);
    logger.info(`Stored embedding with ID: ${docRef.id}`);
    return {
      success: true,
      id: docRef.id,
    };
  } catch (error) {
    logger.error("Error in generateEmbedding function:", error.message, error.stack);
    if (error.message.includes("API key not configured")) {
      throw error;
    }
    throw new Error(`Error generating embedding: ${error.message}`);
  }
});

/**
 * Cloud Function to perform vector search
 */
exports.vectorSearch = onCall({
  maxInstances: 10,
}, async (request) => {
  initializeOpenAIClient(); // Ensure client is up-to-date
  try {
    const {query, limit} = request.data;
    if (!query) {
      logger.warn("Vector search called without a query");
      throw new Error("Missing required 'query' field");
    }
    const previewLength = query.length > 50 ? 50 : query.length;
    logger.info(`Searching: "${query.substring(0, previewLength)}..."`);
    if (currentApiKey === "dummy_key_for_initialization") {
      logger.error("vectorSearch: OpenAI API key is not properly configured.");
      throw new Error("OpenAI API key not configured");
    }

    const queryEmbeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

    logger.info(`Generated query embedding with ${queryEmbedding.length} dimensions`);
    const results = await performVectorSearch(queryEmbedding, limit || 10);
    logger.info(`Found ${results.length} results`);
    return {
      success: true,
      results,
    };
  } catch (error) {
    logger.error("Error in vectorSearch function:", error.message, error.stack);
    if (error.message.includes("API key not configured")) {
      throw error;
    }
    throw new Error(`Error performing vector search: ${error.message}`);
  }
});
