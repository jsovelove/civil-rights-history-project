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
// const functions = require("firebase-functions"); // Unused import

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
 * Perform vector search in Firestore with enhanced filtering for clips
 * @param {Array<number>} queryEmbedding The query embedding vector
 * @param {number} limit Maximum number of results to return
 * @param {Object} filters Optional filters for search results
 * @param {string} collectionName Collection to search in
 * @return {Promise<Array>} Sorted search results with enhanced metadata
 */
async function performVectorSearch(queryEmbedding, limit = 10, filters = {}, collectionName = "embeddings") {
  logger.info(`Starting vector search in collection: ${collectionName} with limit: ${limit}`);

  // Use pagination to process embeddings in batches to avoid memory issues
  const BATCH_SIZE = 100;
  const results = [];
  let lastDoc = null;
  let processedCount = 0;
  let hasMoreDocuments = true;

  while (hasMoreDocuments) {
    // Get next batch of documents
    let query = db.collection(collectionName).limit(BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const batchSnapshot = await query.get();

    if (batchSnapshot.empty) {
      hasMoreDocuments = false;
      break;
    }

    // Process current batch
    batchSnapshot.forEach((doc) => {
      const data = doc.data();
      processedCount++;

      if (data.embedding) {
        // Apply filters if provided
        let passesFilters = true;

        if (filters.type && data.type !== filters.type) {
          passesFilters = false;
        }

        if (filters.mainTopicCategory && data.mainTopicCategory !== filters.mainTopicCategory) {
          passesFilters = false;
        }

        if (filters.interviewRole && data.interviewRole !== filters.interviewRole) {
          passesFilters = false;
        }

        if (filters.hasNotableQuotes && !data.hasNotableQuotes) {
          passesFilters = false;
        }

        if (filters.collection && data.collection !== filters.collection) {
          passesFilters = false;
        }

        if (passesFilters) {
          const similarity = cosineSimilarity(queryEmbedding, data.embedding);
          // Check for duplicates before adding
          const isDuplicate = results.some((existing) =>
            existing.documentId === data.documentId &&
            existing.segmentId === data.segmentId,
          );

          if (!isDuplicate) {
            results.push({
              id: doc.id,
              documentId: data.documentId,
              segmentId: data.segmentId,
              textPreview: data.textPreview,
              similarity,

              // Enhanced metadata for clips
              type: data.type || "unknown",
              topic: data.topic || "Untitled",
              timestamp: data.timestamp || "",
              interviewName: data.interviewName || "Unknown Interview",
              interviewRole: data.interviewRole || "Unknown Role",
              mainTopicCategory: data.mainTopicCategory || "General",
              videoEmbedLink: data.videoEmbedLink || null, // Include video link for thumbnails

              // Rich content indicators
              hasNotableQuotes: data.hasNotableQuotes || false,
              hasRelatedEvents: data.hasRelatedEvents || false,
              notableQuotes: data.notableQuotes || [],
              relatedEvents: data.relatedEvents || [],

              // Additional metadata
              chapterNumber: data.chapterNumber || 0,
              keywordsArray: data.keywordsArray || [],
              keyThemes: data.keyThemes || [],
              collection: data.collection || "unknown",
            });
          }
        }
      }
    });

    // Keep only top results to manage memory
    if (results.length > limit * 3) {
      results.sort((a, b) => b.similarity - a.similarity);
      results.splice(limit * 2); // Keep top 2x limit for better accuracy
    }

    // Set up for next batch
    lastDoc = batchSnapshot.docs[batchSnapshot.docs.length - 1];

    // Break if we have enough high-quality results
    if (results.length >= limit * 2 && results[0].similarity > 0.7) {
      hasMoreDocuments = false;
    }
  }

  logger.info(`Processed ${processedCount} documents, found ${results.length} matching results`);

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
  memory: "512MiB", // Increase memory limit to handle large embedding collections
  timeoutSeconds: 60,
}, async (request) => {
  initializeOpenAIClient(); // Ensure client is up-to-date
  try {
    const {query, limit, filters, collection} = request.data;
    if (!query) {
      logger.warn("Vector search called without a query");
      throw new Error("Missing required 'query' field");
    }
    const previewLength = query.length > 50 ? 50 : query.length;
    logger.info(`Searching: "${query.substring(0, previewLength)}..." with filters:`, filters || "none");
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
    const searchCollection = collection || "embeddings";
    logger.info(`Searching in collection: ${searchCollection}`);
    const results = await performVectorSearch(queryEmbedding, limit || 10, filters || {}, searchCollection);
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
