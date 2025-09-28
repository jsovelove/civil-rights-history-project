/**
 * Collection Mapper Service
 * 
 * Handles field mapping between interviewSummaries and metadataV2 collections
 * to enable seamless transition between data structures.
 */

/**
 * Maps interview data from either collection to a standardized format
 * @param {Object} data - Raw document data
 * @param {string} sourceCollection - Source collection name ('interviewSummaries' or 'metadataV2')
 * @returns {Object} Mapped interview data
 */
export const mapInterviewData = (data, sourceCollection) => {
  if (sourceCollection === 'metadataV2') {
    return {
      // Direct mappings (same field names)
      id: data.id,
      documentName: data.documentName,
      mainSummary: data.mainSummary,
      role: data.role,
      roleSimplified: data.roleSimplified || data.role,
      videoEmbedLink: data.videoEmbedLink,
      createdAt: data.createdAt,
      
      // Enhanced fields from metadataV2
      processingInfo: data.processingInfo || {},
      keyThemes: data.keyThemes || [],
      historicalSignificance: data.historicalSignificance || '',
      metadata: data.metadata || {},
      sourceFile: data.sourceFile || '',
      sourceDirectory: data.sourceDirectory || '',
      updatedAt: data.updatedAt || data.createdAt,
      topicsAndThemes: data.topicsAndThemes || {},
      
      // Derived fields for backward compatibility
      name: data.documentName, // Usually the same
      birthday: '', // Not available in metadataV2
      birthplace: '', // Not available in metadataV2
      discussionTopics: [], // Not directly available, could be derived from themes
      
      // Processing status (derived from processingInfo)
      transcriptionStatus: data.processingInfo?.processed_at ? 'completed' : 'unknown',
      progressPercent: 100, // Assume completed if in metadataV2
      progressMessage: 'Completed',
    };
  } else {
    // Map from interviewSummaries (legacy)
    return {
      id: data.id,
      documentName: data.documentName,
      mainSummary: data.mainSummary,
      role: data.role,
      roleSimplified: data.roleSimplified || data.role,
      videoEmbedLink: data.videoEmbedLink,
      createdAt: data.createdAt,
      name: data.name || data.documentName,
      birthday: data.birthday || '',
      birthplace: data.birthplace || '',
      discussionTopics: data.discussionTopics || [],
      transcriptionStatus: data.transcriptionStatus || 'unknown',
      progressPercent: data.progressPercent || 0,
      progressMessage: data.progressMessage || '',
      error: data.error || '',
      errorAt: data.errorAt || null,
      
      // Default values for metadataV2 fields
      processingInfo: {},
      keyThemes: [],
      historicalSignificance: '',
      metadata: {},
      sourceFile: '',
      sourceDirectory: '',
      updatedAt: data.createdAt,
      topicsAndThemes: {},
    };
  }
};

/**
 * Maps subsummary/segment data from either collection format
 * @param {Object} data - Raw segment data
 * @param {string} sourceCollection - Source collection name
 * @returns {Object} Mapped segment data
 */
export const mapSubSummaryData = (data, sourceCollection) => {
  if (sourceCollection === 'metadataV2') {
    return {
      id: data.id,
      topic: data.topic || 'Untitled Segment',
      summary: data.summary || '',
      timestamp: data.timestamp || '',
      
      // Enhanced fields from metadataV2
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      chapterNumber: data.chapterNumber || 0,
      mainTopicCategory: data.mainTopicCategory || '',
      relatedEvents: data.relatedEvents || [],
      notableQuotes: data.notableQuotes || [],
      keywordMatchingInfo: data.keywordMatchingInfo || {},
      createdAt: data.createdAt,
      
      // Handle keywords - convert array to string for compatibility if needed
      keywords: Array.isArray(data.keywords) 
        ? data.keywords.join(', ') 
        : (data.keywords || ''),
      keywordsArray: Array.isArray(data.keywords) ? data.keywords : [],
      
      // Legacy field for compatibility
      discussionTopic: '', // Not available in metadataV2
    };
  } else {
    // Legacy interviewSummaries format
    return {
      id: data.id,
      topic: data.topic || 'Untitled Segment',
      summary: data.summary || '',
      timestamp: data.timestamp || '',
      keywords: data.keywords || '', // Already a string
      discussionTopic: data.discussionTopic || '',
      
      // Default values for metadataV2 fields
      startTime: extractStartTime(data.timestamp),
      endTime: extractEndTime(data.timestamp),
      chapterNumber: 0,
      mainTopicCategory: '',
      relatedEvents: [],
      notableQuotes: [],
      keywordMatchingInfo: {},
      keywordsArray: data.keywords ? data.keywords.split(',').map(k => k.trim()) : [],
      createdAt: null,
    };
  }
};

/**
 * Utility function to extract start time from timestamp string
 * @param {string} timestamp - Timestamp in format "[HH:MM:SS - HH:MM:SS]" or "HH:MM:SS,000 - HH:MM:SS,000"
 * @returns {string} Start time
 */
function extractStartTime(timestamp) {
  if (!timestamp) return '';
  
  // Handle both formats: "[HH:MM:SS - HH:MM:SS]" and "HH:MM:SS,000 - HH:MM:SS,000"
  const cleanTimestamp = timestamp.replace(/[\[\]]/g, ''); // Remove brackets
  const parts = cleanTimestamp.split(' - ');
  
  if (parts.length >= 1) {
    return parts[0].trim();
  }
  
  return '';
}

/**
 * Utility function to extract end time from timestamp string
 * @param {string} timestamp - Timestamp string
 * @returns {string} End time
 */
function extractEndTime(timestamp) {
  if (!timestamp) return '';
  
  const cleanTimestamp = timestamp.replace(/[\[\]]/g, '');
  const parts = cleanTimestamp.split(' - ');
  
  if (parts.length >= 2) {
    return parts[1].trim();
  }
  
  return '';
}

/**
 * Determines which collection should be used based on feature flags
 * @returns {string} Collection name to use
 */
export const getActiveCollection = () => {
  // Feature flag - can be controlled via environment variable or config
  const USE_METADATA_V2 = process.env.REACT_APP_USE_METADATA_V2 === 'true' || true;
  return USE_METADATA_V2 ? 'metadataV2' : 'interviewSummaries';
};

/**
 * Normalize document ID to handle different formats between collections
 * @param {string} documentId - Document ID to normalize
 * @param {string} targetCollection - Target collection format
 * @returns {string} Normalized document ID
 */
export const normalizeDocumentId = (documentId, targetCollection) => {
  if (!documentId) return documentId;
  
  if (targetCollection === 'metadataV2') {
    // Convert spaces to underscores for metadataV2
    return documentId.replace(/\s+/g, '_');
  } else {
    // Convert underscores to spaces for interviewSummaries
    return documentId.replace(/_/g, ' ');
  }
};

/**
 * Try both ID formats to find a document in either collection
 * @param {string} documentId - Original document ID
 * @returns {Object} Object with both formats
 */
export const getDocumentIdVariants = (documentId) => {
  if (!documentId) return { original: documentId, withSpaces: documentId, withUnderscores: documentId };
  
  return {
    original: documentId,
    withSpaces: documentId.replace(/_/g, ' '),
    withUnderscores: documentId.replace(/\s+/g, '_')
  };
};

/**
 * Validates that required fields are present in mapped data
 * @param {Object} mappedData - Data after mapping
 * @param {string} dataType - Type of data ('interview' or 'segment')
 * @returns {Object} Validation result with isValid and errors
 */
export const validateMappedData = (mappedData, dataType) => {
  const errors = [];
  
  if (dataType === 'interview') {
    const requiredFields = ['documentName', 'mainSummary', 'videoEmbedLink'];
    
    requiredFields.forEach(field => {
      if (!mappedData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Check for valid video embed link
    if (mappedData.videoEmbedLink && !mappedData.videoEmbedLink.includes('youtube.com')) {
      errors.push('Invalid YouTube embed link format');
    }
    
  } else if (dataType === 'segment') {
    const requiredFields = ['topic', 'summary', 'timestamp'];
    
    requiredFields.forEach(field => {
      if (!mappedData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Converts legacy timestamp format to metadataV2 format
 * @param {string} legacyTimestamp - Format like "[00:10:30 - 00:15:45]"
 * @returns {string} Format like "00:10:30,000 - 00:15:45,000"
 */
export const convertTimestampFormat = (legacyTimestamp) => {
  if (!legacyTimestamp) return '';
  
  // Remove brackets and split
  const cleanTimestamp = legacyTimestamp.replace(/[\[\]]/g, '');
  const parts = cleanTimestamp.split(' - ');
  
  if (parts.length === 2) {
    const startTime = parts[0].trim();
    const endTime = parts[1].trim();
    
    // Add milliseconds if not present
    const formatTime = (time) => {
      return time.includes(',') ? time : `${time},000`;
    };
    
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }
  
  return legacyTimestamp;
};

/**
 * Enhanced keyword processing for better search and categorization
 * @param {Array|string} keywords - Keywords in any format
 * @returns {Object} Processed keyword information
 */
export const processKeywords = (keywords) => {
  let keywordArray = [];
  
  if (Array.isArray(keywords)) {
    keywordArray = keywords;
  } else if (typeof keywords === 'string') {
    keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }
  
  return {
    array: keywordArray,
    string: keywordArray.join(', '),
    count: keywordArray.length,
    normalized: keywordArray.map(k => k.toLowerCase().trim())
  };
};
