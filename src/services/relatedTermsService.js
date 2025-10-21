/**
 * @fileoverview Service for calculating and managing related terms between topics in the glossary.
 * 
 * This service analyzes co-occurrence patterns between topics across video clips
 * to identify semantically related terms that can be displayed as navigation links.
 */

import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from './firebase';
import { getCachedRelatedTerms, setCachedRelatedTerms } from './relatedTermsCache';

/**
 * Calculates related terms for all topics based on co-occurrence analysis
 * @returns {Object} Map of topic -> array of related terms with scores
 */
export async function calculateRelatedTerms() {
  console.log('Starting related terms calculation...');
  
  // Check cache first
  const cachedRelatedTerms = getCachedRelatedTerms();
  if (cachedRelatedTerms) {
    console.log('Using cached related terms');
    return cachedRelatedTerms;
  }
  
  try {
    // Get all topics from events_and_topics collection
    const eventsAndTopicsCollection = collection(db, 'events_and_topics');
    const eventsSnapshot = await getDocs(eventsAndTopicsCollection);
    
    // Create a set of all valid topic names (normalized)
    const validTopics = new Set();
    const topicNameMap = new Map(); // normalized -> original name
    
    eventsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const topicName = data.eventTopic || doc.id;
      const normalizedName = topicName.toLowerCase().trim();
      validTopics.add(normalizedName);
      topicNameMap.set(normalizedName, topicName);
    });
    
    console.log(`Found ${validTopics.size} valid topics to analyze`);
    
    // Analyze co-occurrence patterns in clips
    const coOccurrenceMatrix = await analyzeCoOccurrence(validTopics);
    
    // Calculate related terms for each topic
    const relatedTermsMap = {};
    
    for (const [normalizedTopic, originalTopic] of topicNameMap) {
      const relatedTerms = calculateTopicRelations(
        normalizedTopic, 
        coOccurrenceMatrix, 
        topicNameMap,
        5 // max related terms per topic
      );
      
      if (relatedTerms.length > 0) {
        relatedTermsMap[originalTopic] = relatedTerms;
      }
    }
    
    console.log(`Calculated related terms for ${Object.keys(relatedTermsMap).length} topics`);
    
    // Cache the results
    setCachedRelatedTerms(relatedTermsMap);
    
    return relatedTermsMap;
    
  } catch (error) {
    console.error('Error calculating related terms:', error);
    return {};
  }
}

/**
 * Analyzes co-occurrence patterns between topics across all clips
 * @param {Set} validTopics - Set of normalized topic names to analyze
 * @returns {Map} Co-occurrence matrix with counts
 */
async function analyzeCoOccurrence(validTopics) {
  const coOccurrenceMatrix = new Map();
  
  // Initialize matrix
  for (const topic of validTopics) {
    coOccurrenceMatrix.set(topic, new Map());
  }
  
  // Get all clips (subSummaries) to analyze
  const subSummariesSnapshot = await getDocs(collectionGroup(db, 'subSummaries'));
  console.log(`Analyzing ${subSummariesSnapshot.size} clips for co-occurrence patterns...`);
  
  subSummariesSnapshot.forEach((doc) => {
    const subSummary = doc.data();
    
    // Extract keywords from this clip
    let keywords = [];
    if (typeof subSummary.keywords === 'string') {
      keywords = subSummary.keywords.split(",").map(kw => kw.trim().toLowerCase());
    } else if (Array.isArray(subSummary.keywords)) {
      keywords = subSummary.keywords.map(kw => kw.toLowerCase().trim());
    }
    
    // Filter to only valid topics
    const validKeywordsInClip = keywords.filter(kw => validTopics.has(kw));
    
    // Record co-occurrences for all pairs in this clip
    for (let i = 0; i < validKeywordsInClip.length; i++) {
      for (let j = i + 1; j < validKeywordsInClip.length; j++) {
        const topic1 = validKeywordsInClip[i];
        const topic2 = validKeywordsInClip[j];
        
        // Record bidirectional co-occurrence
        recordCoOccurrence(coOccurrenceMatrix, topic1, topic2);
        recordCoOccurrence(coOccurrenceMatrix, topic2, topic1);
      }
    }
  });
  
  return coOccurrenceMatrix;
}

/**
 * Records a co-occurrence between two topics
 * @param {Map} matrix - The co-occurrence matrix
 * @param {string} topic1 - First topic
 * @param {string} topic2 - Second topic
 */
function recordCoOccurrence(matrix, topic1, topic2) {
  if (!matrix.has(topic1)) {
    matrix.set(topic1, new Map());
  }
  
  const topic1Relations = matrix.get(topic1);
  const currentCount = topic1Relations.get(topic2) || 0;
  topic1Relations.set(topic2, currentCount + 1);
}

/**
 * Calculates the most related terms for a given topic
 * @param {string} topic - The topic to find relations for
 * @param {Map} coOccurrenceMatrix - The co-occurrence matrix
 * @param {Map} topicNameMap - Map from normalized to original topic names
 * @param {number} maxResults - Maximum number of related terms to return
 * @returns {Array} Array of related terms with scores
 */
function calculateTopicRelations(topic, coOccurrenceMatrix, topicNameMap, maxResults = 5) {
  const topicRelations = coOccurrenceMatrix.get(topic);
  if (!topicRelations || topicRelations.size === 0) {
    return [];
  }
  
  // Convert to array and sort by co-occurrence count
  const relatedTerms = Array.from(topicRelations.entries())
    .map(([relatedTopic, count]) => ({
      topic: topicNameMap.get(relatedTopic),
      normalizedTopic: relatedTopic,
      coOccurrenceCount: count,
      // Calculate a simple relevance score (could be enhanced with TF-IDF, etc.)
      relevanceScore: count
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
  
  return relatedTerms;
}

/**
 * Gets related terms for a specific topic (with caching)
 * @param {string} topicName - The topic to get related terms for
 * @param {Object} relatedTermsCache - Cached related terms data
 * @returns {Array} Array of related terms
 */
export function getRelatedTermsForTopic(topicName, relatedTermsCache) {
  if (!relatedTermsCache || !topicName) {
    return [];
  }
  
  // Try exact match first
  if (relatedTermsCache[topicName]) {
    return relatedTermsCache[topicName];
  }
  
  // Try case-insensitive match
  const normalizedTopic = topicName.toLowerCase();
  for (const [cachedTopic, relatedTerms] of Object.entries(relatedTermsCache)) {
    if (cachedTopic.toLowerCase() === normalizedTopic) {
      return relatedTerms;
    }
  }
  
  return [];
}

/**
 * Filters related terms to only include those that exist in the current topic glossary
 * @param {Array} relatedTerms - Array of related terms
 * @param {Array} availableTopics - Array of topics available in the glossary
 * @returns {Array} Filtered related terms
 */
export function filterRelatedTermsByAvailability(relatedTerms, availableTopics) {
  if (!relatedTerms || !availableTopics) {
    return [];
  }
  
  const availableTopicNames = new Set(
    availableTopics.map(topic => topic.keyword?.toLowerCase() || topic.toLowerCase())
  );
  
  return relatedTerms.filter(relatedTerm => {
    const normalizedTopic = relatedTerm.normalizedTopic || relatedTerm.topic?.toLowerCase();
    return availableTopicNames.has(normalizedTopic);
  });
}

/**
 * Formats related terms for display in UI components
 * @param {Array} relatedTerms - Array of related terms
 * @param {number} maxDisplay - Maximum number to display
 * @returns {Array} Formatted related terms for UI
 */
export function formatRelatedTermsForDisplay(relatedTerms, maxDisplay = 5) {
  if (!relatedTerms || relatedTerms.length === 0) {
    return [];
  }
  
  return relatedTerms
    .slice(0, maxDisplay)
    .map(term => ({
      name: term.topic,
      relevanceScore: term.relevanceScore,
      coOccurrenceCount: term.coOccurrenceCount,
      // Generate URL for playlist builder
      playlistUrl: `/playlist-builder?keywords=${encodeURIComponent(term.topic)}`
    }));
}
