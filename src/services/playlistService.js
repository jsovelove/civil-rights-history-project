/**
 * @fileoverview Optimized service for playlist-related data fetching with caching
 * 
 * This service provides optimized methods for fetching keyword-based video data
 * with intelligent caching, progressive loading, and minimal Firestore operations.
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { parseKeywords, extractVideoId } from "../utils/timeUtils";
import { getActiveCollection, mapInterviewData, mapSubSummaryData } from "./collectionMapper";

// In-memory cache for performance
let keywordIndex = null;
let keywordCounts = null;
let allSegments = null;
let cacheTimestamp = null;

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Check if cached data is still valid
 */
const isCacheValid = () => {
  return cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION;
};

/**
 * Build comprehensive keyword index from all interviews
 * This runs once and caches results for fast subsequent lookups
 */
const buildKeywordIndex = async () => {
  if (isCacheValid() && keywordIndex && keywordCounts && allSegments) {
    console.log('Using cached keyword index');
    return {
      keywordIndex,
      keywordCounts,
      allSegments
    };
  }

  console.log('Building fresh keyword index...');
  const startTime = Date.now();

  try {
    const tempKeywordIndex = {};
    const tempKeywordCounts = {};
    const tempAllSegments = [];

    const activeCollection = getActiveCollection();
    const interviewsSnapshot = await getDocs(collection(db, activeCollection));

    // Process all interviews in parallel where possible
    const processPromises = [];

    for (const interviewDoc of interviewsSnapshot.docs) {
      const processInterview = async () => {
        const interviewId = interviewDoc.id;
        const rawInterviewData = interviewDoc.data();
        
        // Map interview data using collection mapper
        const interviewData = mapInterviewData(rawInterviewData, activeCollection);

        // Get thumbnail URL once per interview
        const parentVideoEmbedLink = interviewData.videoEmbedLink;
        const thumbnailUrl = parentVideoEmbedLink ?
          `https://img.youtube.com/vi/${extractVideoId(parentVideoEmbedLink)}/mqdefault.jpg` : null;

        const subSummariesRef = collection(db, activeCollection, interviewId, "subSummaries");
        const querySnapshot = await getDocs(subSummariesRef);

        querySnapshot.forEach((docSnapshot) => {
          const rawSubSummary = docSnapshot.data();
          
          // Map subsummary data using collection mapper
          const subSummary = mapSubSummaryData(rawSubSummary, activeCollection);
          
          // Handle keywords - metadataV2 uses arrays, interviewSummaries uses comma-separated strings
          let documentKeywords = [];
          if (activeCollection === 'metadataV2') {
            // In metadataV2, keywords are already an array
            documentKeywords = Array.isArray(rawSubSummary.keywords) 
              ? rawSubSummary.keywords.map(k => k.trim().toLowerCase())
              : [];
          } else {
            // In interviewSummaries, keywords are comma-separated strings
            documentKeywords = (subSummary.keywords || "").split(",").map(k => k.trim().toLowerCase());
          }

          // Create segment object
          const segment = {
            id: docSnapshot.id,
            documentName: interviewId,
            ...subSummary,
            ...interviewData,
            thumbnailUrl,
            keywords: documentKeywords
          };

          tempAllSegments.push(segment);

          // Index by keywords
          documentKeywords.forEach(keyword => {
            if (keyword) {
              // Count occurrences
              tempKeywordCounts[keyword] = (tempKeywordCounts[keyword] || 0) + 1;

              // Index segments by keyword
              if (!tempKeywordIndex[keyword]) {
                tempKeywordIndex[keyword] = [];
              }
              tempKeywordIndex[keyword].push(segment);
            }
          });
        });
      };

      processPromises.push(processInterview());
    }

    // Wait for all interviews to be processed
    await Promise.all(processPromises);

    // Cache results
    keywordIndex = tempKeywordIndex;
    keywordCounts = tempKeywordCounts;
    allSegments = tempAllSegments;
    cacheTimestamp = Date.now();

    const endTime = Date.now();
    console.log(`Keyword index built in ${endTime - startTime}ms`);
    console.log(`Indexed ${Object.keys(keywordIndex).length} keywords across ${allSegments.length} segments`);

    return {
      keywordIndex,
      keywordCounts,
      allSegments
    };
  } catch (error) {
    console.error('Error building keyword index:', error);
    throw error;
  }
};

/**
 * Get segments for specific keywords (fast lookup using index)
 */
export const getSegmentsForKeywords = async (keywords) => {
  const { keywordIndex } = await buildKeywordIndex();
  
  const keywordsArray = Array.isArray(keywords) ? keywords : parseKeywords(keywords);
  const matchingSegments = new Set();

  keywordsArray.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    const segments = keywordIndex[keywordLower] || [];
    segments.forEach(segment => matchingSegments.add(segment));
  });

  return Array.from(matchingSegments);
};

/**
 * Get count of clips for specific keyword (instant lookup from cache)
 */
export const getKeywordCount = async (keyword) => {
  const { keywordCounts } = await buildKeywordIndex();
  return keywordCounts[keyword.toLowerCase()] || 0;
};

/**
 * Get all available keywords with their counts
 */
export const getAllKeywords = async () => {
  const { keywordCounts } = await buildKeywordIndex();
  return keywordCounts;
};

/**
 * Get keywords that have multiple clips (for "up next" suggestions)
 */
export const getKeywordsWithMultipleClips = async () => {
  const { keywordCounts } = await buildKeywordIndex();
  return Object.keys(keywordCounts).filter(keyword => keywordCounts[keyword] > 1);
};

/**
 * Get a random sample of segments for thumbnail/preview purposes
 */
export const getSampleSegmentsForKeyword = async (keyword, sampleSize = 3) => {
  const segments = await getSegmentsForKeywords([keyword]);
  
  if (segments.length <= sampleSize) {
    return segments;
  }

  // Return random sample
  const shuffled = segments.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, sampleSize);
};

/**
 * Progressive loading: Get first video immediately, then rest in background
 */
export const getPlaylistProgressive = async (keywords, onFirstVideo, onComplete) => {
  try {
    const segments = await getSegmentsForKeywords(keywords);
    
    if (segments.length === 0) {
      onComplete([]);
      return;
    }

    // Shuffle segments
    const shuffledSegments = segments.sort(() => 0.5 - Math.random());
    
    // Return first video immediately
    onFirstVideo(shuffledSegments[0], shuffledSegments.length);
    
    // Return complete playlist
    setTimeout(() => {
      onComplete(shuffledSegments);
    }, 0);
    
  } catch (error) {
    console.error('Error in progressive loading:', error);
    onComplete([]);
  }
};

/**
 * Get related keywords based on content similarity
 */
export const getRelatedKeywords = async (currentKeyword, limit = 5) => {
  const { keywordIndex, keywordCounts } = await buildKeywordIndex();
  
  const currentSegments = keywordIndex[currentKeyword.toLowerCase()] || [];
  if (currentSegments.length === 0) {
    return [];
  }

  // Find keywords that appear in the same segments
  const relatedKeywordScores = {};
  
  currentSegments.forEach(segment => {
    segment.keywords.forEach(keyword => {
      if (keyword !== currentKeyword.toLowerCase() && keywordCounts[keyword] > 1) {
        relatedKeywordScores[keyword] = (relatedKeywordScores[keyword] || 0) + 1;
      }
    });
  });

  // Sort by co-occurrence frequency and return top results
  return Object.entries(relatedKeywordScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([keyword]) => keyword);
};

/**
 * Clear cache (useful for testing or forced refresh)
 */
export const clearCache = () => {
  keywordIndex = null;
  keywordCounts = null;
  allSegments = null;
  cacheTimestamp = null;
  console.log('Playlist service cache cleared');
};

/**
 * Preload common keywords (can be called on app startup)
 */
export const preloadKeywords = async (commonKeywords = []) => {
  console.log('Preloading keyword index...');
  await buildKeywordIndex();
  
  // Optionally preload specific keyword data
  for (const keyword of commonKeywords) {
    await getSegmentsForKeywords([keyword]);
  }
  
  console.log('Preload complete');
};
