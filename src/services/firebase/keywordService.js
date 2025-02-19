import { collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from './config';

/**
 * Fetches popular keywords from Firestore
 * @param {number} count - Number of keywords to fetch
 * @returns {Promise<Array>} Promise resolving to array of keyword objects
 */
export async function fetchPopularKeywords(count = 10) {
  try {
    // Try to get keywords sorted by count if the field exists
    const keywordsQuery = query(
      collection(db, 'keywordSummaries'),
      orderBy('count', 'desc'),
      limit(count)
    );
    
    let keywordsSnapshot;
    try {
      keywordsSnapshot = await getDocs(keywordsQuery);
    } catch (err) {
      // If ordering by count fails (field doesn't exist), get without ordering
      console.warn('Ordering by count failed, fetching keywords without ordering', err);
      keywordsSnapshot = await getDocs(collection(db, 'keywordSummaries'));
    }
    
    const keywords = keywordsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // If we couldn't order by count in the query, do it manually
    // and take only the requested count
    if (keywords.length > count && !keywordsQuery) {
      keywords.sort((a, b) => (b.count || 0) - (a.count || 0));
      return keywords.slice(0, count);
    }
    
    return keywords;
  } catch (error) {
    console.error('Error fetching popular keywords:', error);
    throw error;
  }
}

/**
 * Fetches a specific keyword by ID
 * @param {string} keywordId - Keyword ID to fetch
 * @returns {Promise<Object|null>} Promise resolving to keyword object or null
 */
export async function fetchKeyword(keywordId) {
  try {
    if (!keywordId) return null;
    
    const normalizedId = keywordId.trim().toLowerCase();
    const keywordDocRef = doc(db, 'keywordSummaries', normalizedId);
    const docSnap = await getDoc(keywordDocRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching keyword ${keywordId}:`, error);
    throw error;
  }
}

/**
 * Fetches keywords related to a specific keyword
 * @param {string} keywordId - Base keyword to find related keywords for
 * @param {number} count - Number of related keywords to fetch
 * @returns {Promise<Array>} Promise resolving to array of related keywords
 */
export async function fetchRelatedKeywords(keywordId, count = 5) {
  try {
    // First fetch the base keyword to get its related keywords if available
    const baseKeyword = await fetchKeyword(keywordId);
    
    if (baseKeyword?.relatedKeywords && Array.isArray(baseKeyword.relatedKeywords)) {
      // If the keyword has explicit related keywords, use those
      const relatedKeywordsData = [];
      
      for (const relatedId of baseKeyword.relatedKeywords.slice(0, count)) {
        const keyword = await fetchKeyword(relatedId);
        if (keyword) {
          relatedKeywordsData.push(keyword);
        }
      }
      
      return relatedKeywordsData;
    }
    
    // Otherwise fall back to popular keywords, excluding the base keyword
    const popularKeywords = await fetchPopularKeywords(count + 1);
    return popularKeywords.filter(k => 
      k.id.toLowerCase() !== keywordId.toLowerCase()
    ).slice(0, count);
    
  } catch (error) {
    console.error(`Error fetching related keywords for ${keywordId}:`, error);
    throw error;
  }
}

/**
 * Searches for keywords matching a search term
 * @param {string} searchTerm - Term to search for
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} Promise resolving to matching keywords
 */
export async function searchKeywords(searchTerm, limit = 10) {
  try {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return [];
    }
    
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (normalizedTerm.length < 2) {
      return [];
    }
    
    const keywordsSnapshot = await getDocs(collection(db, 'keywordSummaries'));
    const allKeywords = keywordsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter keywords that match the search term
    const matchingKeywords = allKeywords.filter(keyword => 
      keyword.id.toLowerCase().includes(normalizedTerm)
    );
    
    // Sort by relevance (exact match first, then by count if available)
    matchingKeywords.sort((a, b) => {
      // Exact matches come first
      if (a.id.toLowerCase() === normalizedTerm) return -1;
      if (b.id.toLowerCase() === normalizedTerm) return 1;
      
      // Then sort by count
      return (b.count || 0) - (a.count || 0);
    });
    
    return matchingKeywords.slice(0, limit);
  } catch (error) {
    console.error('Error searching keywords:', error);
    throw error;
  }
}