/**
 * @fileoverview Topic-specific vector search service
 * Handles vectorization and semantic search for topics in the Topic Glossary
 */

import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase';

// Collections for topic vector search
const TOPIC_EMBEDDINGS_COLLECTION = 'topicEmbeddings';
const TOPIC_RELATIONS_COLLECTION = 'topicRelations';

/**
 * Generates an embedding for a single topic using OpenAI
 * @param {string} text - The text to embed
 * @returns {Promise<Array<number>>} - The embedding vector
 */
async function generateTopicEmbedding(text) {
  try {
    const apiKey = import.meta?.env?.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small"
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating topic embedding:', error);
    throw error;
  }
}

/**
 * Calculates cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} - Similarity score (0-1)
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vector dimensions do not match');
  }
  
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
 * Vectorizes a single topic and stores it in Firestore
 * @param {Object} topic - Topic object with keyword, description, category
 * @param {function} statusCallback - Optional callback for status updates
 * @returns {Promise<string>} - The document ID of the stored embedding
 */
export async function vectorizeTopic(topic, statusCallback = null) {
  try {
    if (statusCallback) {
      statusCallback(`Vectorizing: ${topic.keyword}`);
    }
    
    // Create rich text representation of the topic
    const topicText = [
      `TOPIC: ${topic.keyword}`,
      `DESCRIPTION: ${topic.description || topic.shortDescription}`,
      `CATEGORY: ${topic.category || 'general'}`,
      topic.shortDescription ? `SUMMARY: ${topic.shortDescription}` : '',
      // Include importance for better semantic matching
      `IMPORTANCE: ${topic.importanceScore || 5}/10`,
      // Include usage stats for context
      topic.interviewCount ? `Found in ${topic.interviewCount} interviews` : '',
    ].filter(Boolean).join('\n\n');
    
    console.log(`Generating embedding for: ${topic.keyword}`);
    const embedding = await generateTopicEmbedding(topicText);
    
    // Store the embedding with metadata
    const embeddingDoc = {
      embedding: embedding,
      topicId: topic.id,
      keyword: topic.keyword,
      category: topic.category || 'general',
      importanceScore: topic.importanceScore || 5,
      clipCount: topic.clipCount || topic.count || 0,
      interviewCount: topic.interviewCount || 0,
      textPreview: topicText.substring(0, 300),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = doc(db, TOPIC_EMBEDDINGS_COLLECTION, topic.id);
    await setDoc(docRef, embeddingDoc);
    
    console.log(`✅ Vectorized: ${topic.keyword}`);
    return docRef.id;
  } catch (error) {
    console.error(`Error vectorizing topic ${topic.keyword}:`, error);
    throw error;
  }
}

/**
 * Vectorizes all topics in the glossary
 * @param {Array<Object>} topics - Array of topic objects
 * @param {function} progressCallback - Callback for progress updates (0-100)
 * @param {function} statusCallback - Callback for status messages
 * @returns {Promise<Object>} - Summary of vectorization results
 */
export async function vectorizeAllTopics(topics, progressCallback = null, statusCallback = null) {
  const results = {
    total: topics.length,
    successful: 0,
    failed: 0,
    errors: []
  };
  
  if (statusCallback) {
    statusCallback(`Starting vectorization of ${topics.length} topics...`);
  }
  
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    
    try {
      await vectorizeTopic(topic, statusCallback);
      results.successful++;
      
      if (progressCallback) {
        progressCallback(((i + 1) / topics.length) * 100);
      }
      
      // Rate limit to avoid overwhelming OpenAI API
      // 3 requests per second = 333ms delay
      await new Promise(resolve => setTimeout(resolve, 350));
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        topic: topic.keyword,
        error: error.message
      });
      console.error(`Failed to vectorize ${topic.keyword}:`, error);
    }
  }
  
  if (statusCallback) {
    statusCallback(
      `✅ Completed! ${results.successful} successful, ${results.failed} failed`
    );
  }
  
  return results;
}

/**
 * Performs semantic search on vectorized topics using Cloud Functions
 * @param {string} searchQuery - Natural language search query
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of results (default: 20)
 * @param {string} options.category - Filter by category
 * @param {number} options.minSimilarity - Minimum similarity threshold (default: 0.3)
 * @returns {Promise<Array<Object>>} - Array of matching topics with similarity scores
 */
export async function searchTopicsSemanticaly(searchQuery, options = {}) {
  const {
    limit = 20,
    category = null,
    minSimilarity = 0.3
  } = options;
  
  try {
    console.log(`🔍 Semantic search for: "${searchQuery}"`);
    
    // Use Cloud Function for secure API key handling
    const functions = getFunctions();
    const vectorSearchFunction = httpsCallable(functions, 'vectorSearch');
    
    // Build filters for the search
    const filters = {};
    if (category && category !== 'all') {
      filters.category = category;
    }
    
    console.log('Calling Cloud Function for topic search...');
    const result = await vectorSearchFunction({
      query: searchQuery,
      limit: Math.max(1, Math.min(50, limit)),
      filters: filters,
      collection: TOPIC_EMBEDDINGS_COLLECTION // Search in topicEmbeddings collection
    });
    
    if (!result.data || !result.data.success) {
      throw new Error(result.data?.error || 'Topic search failed');
    }
    
    // Process and filter results by similarity threshold
    const allResults = result.data.results || [];
    const filteredResults = allResults
      .filter(r => r.similarity >= minSimilarity)
      .map(r => ({
        id: r.id,
        topicId: r.documentId || r.topicId,
        keyword: r.keyword,
        category: r.category,
        importanceScore: r.importanceScore,
        clipCount: r.clipCount,
        interviewCount: r.interviewCount,
        similarity: r.similarity,
        relevanceScore: r.similarity * 100 // Percentage for display
      }));
    
    console.log(`✅ Found ${filteredResults.length} relevant topics`);
    return filteredResults;
    
  } catch (error) {
    console.error('Error in semantic topic search:', error);
    throw error;
  }
}

/**
 * Finds topics semantically related to a given topic
 * @param {string} topicId - ID of the topic to find relations for
 * @param {number} limit - Maximum number of related topics (default: 5)
 * @param {boolean} useCache - Whether to use cached results (default: true)
 * @returns {Promise<Array<Object>>} - Array of related topics
 */
export async function getRelatedTopics(topicId, limit = 5, useCache = true) {
  try {
    // Check cache first if enabled
    if (useCache) {
      const cacheRef = doc(db, TOPIC_RELATIONS_COLLECTION, topicId);
      const cacheDoc = await getDoc(cacheRef);
      
      if (cacheDoc.exists()) {
        const data = cacheDoc.data();
        const cacheAge = Date.now() - new Date(data.cachedAt).getTime();
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        
        // Use cache if less than 1 week old
        if (cacheAge < ONE_WEEK) {
          console.log(`Using cached related topics for: ${data.keyword}`);
          return data.relatedTopics.slice(0, limit);
        }
      }
    }
    
    // Get the topic's embedding
    const topicEmbeddingRef = doc(db, TOPIC_EMBEDDINGS_COLLECTION, topicId);
    const topicEmbeddingDoc = await getDoc(topicEmbeddingRef);
    
    if (!topicEmbeddingDoc.exists()) {
      console.warn(`No embedding found for topic: ${topicId}`);
      return [];
    }
    
    const topicData = topicEmbeddingDoc.data();
    const topicEmbedding = topicData.embedding;
    
    console.log(`Finding topics related to: ${topicData.keyword}`);
    
    // Compare with all other topic embeddings
    const allEmbeddingsSnapshot = await getDocs(collection(db, TOPIC_EMBEDDINGS_COLLECTION));
    const similarities = [];
    
    allEmbeddingsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Skip the topic itself
      if (doc.id === topicId) return;
      
      if (data.embedding) {
        const similarity = cosineSimilarity(topicEmbedding, data.embedding);
        similarities.push({
          topicId: data.topicId,
          keyword: data.keyword,
          category: data.category,
          similarity: similarity,
          clipCount: data.clipCount,
          interviewCount: data.interviewCount
        });
      }
    });
    
    // Sort by similarity and take top results
    const relatedTopics = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    // Cache the results
    const cacheRef = doc(db, TOPIC_RELATIONS_COLLECTION, topicId);
    await setDoc(cacheRef, {
      topicId: topicId,
      keyword: topicData.keyword,
      relatedTopics: relatedTopics,
      cachedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Found ${relatedTopics.length} related topics`);
    return relatedTopics;
    
  } catch (error) {
    console.error('Error getting related topics:', error);
    return [];
  }
}

/**
 * Pre-computes related topics for all topics (batch job)
 * This should be run periodically or when topics are updated
 * @param {Array<Object>} topics - Array of topic objects
 * @param {function} progressCallback - Callback for progress updates
 * @param {function} statusCallback - Callback for status messages
 * @returns {Promise<Object>} - Summary of pre-computation results
 */
export async function precomputeAllTopicRelations(topics, progressCallback = null, statusCallback = null) {
  const results = {
    total: topics.length,
    successful: 0,
    failed: 0
  };
  
  if (statusCallback) {
    statusCallback(`Pre-computing relations for ${topics.length} topics...`);
  }
  
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    
    try {
      if (statusCallback) {
        statusCallback(`Processing ${i + 1}/${topics.length}: ${topic.keyword}`);
      }
      
      // Force fresh computation (bypass cache)
      await getRelatedTopics(topic.id, 8, false);
      results.successful++;
      
      if (progressCallback) {
        progressCallback(((i + 1) / topics.length) * 100);
      }
      
      // Small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      results.failed++;
      console.error(`Failed to compute relations for ${topic.keyword}:`, error);
    }
  }
  
  if (statusCallback) {
    statusCallback(
      `✅ Pre-computation complete! ${results.successful}/${results.total} topics processed`
    );
  }
  
  return results;
}

/**
 * Checks if topics have been vectorized
 * @returns {Promise<Object>} - Status object with count and sample
 */
export async function checkTopicVectorizationStatus() {
  try {
    const embeddingsSnapshot = await getDocs(collection(db, TOPIC_EMBEDDINGS_COLLECTION));
    const count = embeddingsSnapshot.size;
    
    const sample = [];
    embeddingsSnapshot.docs.slice(0, 5).forEach(doc => {
      const data = doc.data();
      sample.push({
        keyword: data.keyword,
        category: data.category,
        hasEmbedding: !!data.embedding
      });
    });
    
    return {
      isVectorized: count > 0,
      count: count,
      sample: sample
    };
  } catch (error) {
    console.error('Error checking vectorization status:', error);
    return {
      isVectorized: false,
      count: 0,
      sample: []
    };
  }
}

