/**
 * @fileoverview Enhanced caching service for related terms with localStorage persistence.
 * 
 * This service provides persistent caching of related terms calculations to improve
 * performance across sessions and reduce redundant calculations.
 */

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  STORAGE_KEY: 'civil-rights-related-terms-cache',
  VERSION_KEY: 'civil-rights-related-terms-version',
  CURRENT_VERSION: '1.0.0',
  EXPIRY_HOURS: 24, // Cache expires after 24 hours
  MAX_CACHE_SIZE: 5 * 1024 * 1024 // 5MB max cache size
};

/**
 * Gets related terms from cache if available and not expired
 * @returns {Object|null} Cached related terms or null if not available/expired
 */
export function getCachedRelatedTerms() {
  try {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      console.warn('localStorage not available, skipping cache');
      return null;
    }

    // Check cache version
    const cachedVersion = localStorage.getItem(CACHE_CONFIG.VERSION_KEY);
    if (cachedVersion !== CACHE_CONFIG.CURRENT_VERSION) {
      console.log('Cache version mismatch, clearing cache');
      clearRelatedTermsCache();
      return null;
    }

    // Get cached data
    const cachedDataStr = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
    if (!cachedDataStr) {
      return null;
    }

    const cachedData = JSON.parse(cachedDataStr);
    
    // Check if cache has expired
    const now = new Date().getTime();
    const cacheAge = now - cachedData.timestamp;
    const maxAge = CACHE_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
    
    if (cacheAge > maxAge) {
      console.log('Related terms cache expired, clearing');
      clearRelatedTermsCache();
      return null;
    }

    console.log('Using cached related terms data');
    return cachedData.relatedTerms;

  } catch (error) {
    console.error('Error reading related terms cache:', error);
    clearRelatedTermsCache();
    return null;
  }
}

/**
 * Saves related terms to cache with timestamp
 * @param {Object} relatedTerms - The related terms data to cache
 */
export function setCachedRelatedTerms(relatedTerms) {
  try {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      console.warn('localStorage not available, skipping cache save');
      return;
    }

    const cacheData = {
      relatedTerms,
      timestamp: new Date().getTime(),
      version: CACHE_CONFIG.CURRENT_VERSION
    };

    const cacheDataStr = JSON.stringify(cacheData);
    
    // Check cache size
    if (cacheDataStr.length > CACHE_CONFIG.MAX_CACHE_SIZE) {
      console.warn('Related terms cache data too large, not caching');
      return;
    }

    // Save to localStorage
    localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, cacheDataStr);
    localStorage.setItem(CACHE_CONFIG.VERSION_KEY, CACHE_CONFIG.CURRENT_VERSION);
    
    console.log('Related terms cached successfully');

  } catch (error) {
    console.error('Error saving related terms cache:', error);
    // If we can't save (e.g., quota exceeded), clear cache to free space
    clearRelatedTermsCache();
  }
}

/**
 * Clears the related terms cache
 */
export function clearRelatedTermsCache() {
  try {
    if (typeof Storage !== 'undefined') {
      localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
      localStorage.removeItem(CACHE_CONFIG.VERSION_KEY);
      console.log('Related terms cache cleared');
    }
  } catch (error) {
    console.error('Error clearing related terms cache:', error);
  }
}

/**
 * Gets cache statistics for debugging
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  try {
    if (typeof Storage === 'undefined') {
      return { available: false };
    }

    const cachedDataStr = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
    const cachedVersion = localStorage.getItem(CACHE_CONFIG.VERSION_KEY);
    
    if (!cachedDataStr) {
      return {
        available: true,
        cached: false,
        version: cachedVersion,
        size: 0
      };
    }

    const cachedData = JSON.parse(cachedDataStr);
    const now = new Date().getTime();
    const cacheAge = now - cachedData.timestamp;
    const maxAge = CACHE_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000;
    
    return {
      available: true,
      cached: true,
      version: cachedVersion,
      size: cachedDataStr.length,
      ageHours: Math.round(cacheAge / (60 * 60 * 1000) * 100) / 100,
      expired: cacheAge > maxAge,
      topicCount: Object.keys(cachedData.relatedTerms || {}).length
    };

  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { available: true, error: error.message };
  }
}

/**
 * Validates cache integrity
 * @returns {boolean} True if cache is valid
 */
export function validateCache() {
  try {
    const cachedData = getCachedRelatedTerms();
    if (!cachedData) {
      return false;
    }

    // Check if it's an object
    if (typeof cachedData !== 'object' || cachedData === null) {
      console.warn('Invalid cache data type');
      clearRelatedTermsCache();
      return false;
    }

    // Check if it has the expected structure
    const sampleTopic = Object.keys(cachedData)[0];
    if (sampleTopic && Array.isArray(cachedData[sampleTopic])) {
      // Check if related terms have expected properties
      const sampleRelatedTerm = cachedData[sampleTopic][0];
      if (sampleRelatedTerm && 
          typeof sampleRelatedTerm.topic === 'string' &&
          typeof sampleRelatedTerm.relevanceScore === 'number') {
        return true;
      }
    }

    console.warn('Invalid cache data structure');
    clearRelatedTermsCache();
    return false;

  } catch (error) {
    console.error('Error validating cache:', error);
    clearRelatedTermsCache();
    return false;
  }
}

/**
 * Hook for React components to use cached related terms
 * @returns {Object} Cache utilities and data
 */
export function useRelatedTermsCache() {
  const getCached = () => {
    const cached = getCachedRelatedTerms();
    return cached && validateCache() ? cached : null;
  };

  const setCached = (data) => {
    setCachedRelatedTerms(data);
  };

  const clearCache = () => {
    clearRelatedTermsCache();
  };

  const getStats = () => {
    return getCacheStats();
  };

  return {
    getCached,
    setCached,
    clearCache,
    getStats,
    isAvailable: typeof Storage !== 'undefined'
  };
}

