/**
 * @fileoverview Interview-specific vector search service
 * Handles vectorization and semantic search for interviews in the Interview Index
 */

import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase';

// Collections for interview vector search
const INTERVIEW_EMBEDDINGS_COLLECTION = 'interviewEmbeddings';

/**
 * Performs semantic search on vectorized interviews using Cloud Functions
 * @param {string} searchQuery - Natural language search query
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of results (default: 20)
 * @param {number} options.minSimilarity - Minimum similarity threshold (default: 0.3)
 * @returns {Promise<Array<Object>>} - Array of matching interviews with similarity scores
 */
export async function searchInterviewsSemanticaly(searchQuery, options = {}) {
  const {
    limit = 20,
    minSimilarity = 0.3
  } = options;
  
  try {
    console.log(`🔍 Semantic interview search for: "${searchQuery}"`);
    
    // Use Cloud Function for secure API key handling
    const functions = getFunctions();
    const vectorSearchFunction = httpsCallable(functions, 'vectorSearch');
    
    console.log('Calling Cloud Function for interview search...');
    const result = await vectorSearchFunction({
      query: searchQuery,
      limit: Math.max(1, Math.min(50, limit)),
      filters: {},
      collection: INTERVIEW_EMBEDDINGS_COLLECTION // Search in interviewEmbeddings collection
    });
    
    if (!result.data || !result.data.success) {
      throw new Error(result.data?.error || 'Interview search failed');
    }
    
    // Process and filter results by similarity threshold
    const allResults = result.data.results || [];
    const filteredResults = allResults
      .filter(r => r.similarity >= minSimilarity)
      .map(r => ({
        id: r.id,
        interviewId: r.documentId || r.interviewId,
        name: r.name,
        role: r.role,
        roleSimplified: r.roleSimplified,
        totalMinutes: r.totalMinutes,
        clipCount: r.clipCount,
        thumbnailUrl: r.thumbnailUrl,
        videoEmbedLink: r.videoEmbedLink,
        similarity: r.similarity,
        relevanceScore: r.similarity * 100 // Percentage for display
      }));
    
    console.log(`✅ Found ${filteredResults.length} relevant interviews`);
    return filteredResults;
    
  } catch (error) {
    console.error('Error in semantic interview search:', error);
    throw error;
  }
}

/**
 * Checks if interviews have been vectorized
 * @returns {Promise<Object>} - Status object with count and sample
 */
export async function checkInterviewVectorizationStatus() {
  try {
    const embeddingsSnapshot = await getDocs(collection(db, INTERVIEW_EMBEDDINGS_COLLECTION));
    const count = embeddingsSnapshot.size;
    
    const sample = [];
    embeddingsSnapshot.docs.slice(0, 5).forEach(doc => {
      const data = doc.data();
      sample.push({
        name: data.name,
        role: data.roleSimplified,
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

