import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage, ref, getDownloadURL } from 'firebase/storage'
import { 
  mapInterviewData, 
  mapSubSummaryData, 
  getActiveCollection, 
  validateMappedData,
  processKeywords,
  normalizeDocumentId,
  getDocumentIdVariants
} from './collectionMapper.js'

const firebaseConfig = {
  apiKey: "AIzaSyDGolxlZNoEzk7z46ZMtSk9YsP32MlH45Q",
  authDomain: "llm-hyper-audio.firebaseapp.com",
  projectId: "llm-hyper-audio",
  storageBucket: "llm-hyper-audio.firebasestorage.app",
  messagingSenderId: "530304773274",
  appId: "1:530304773274:web:1764f58974d6c2fd060323",
  measurementId: "G-HFEKE65YC6"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)

/**
 * Get download URL for a file in Firebase Storage
 * @param {string} path - The path to the file in Firebase Storage
 * @returns {Promise<string>} - The download URL
 */
export const getStorageImageUrl = async (path) => {
  try {
    const imageRef = ref(storage, path)
    const url = await getDownloadURL(imageRef)
    return url
  } catch (error) {
    console.error('Error getting image URL from Firebase Storage:', error)
    throw error
  }
}

// ============================================================================
// ENHANCED INTERVIEW DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get a single interview document with proper field mapping
 * Handles both ID formats (spaces vs underscores) between collections
 * @param {string} documentId - The document ID
 * @returns {Promise<Object|null>} Mapped interview data or null if not found
 */
export const getInterviewData = async (documentId) => {
  try {
    const collectionName = getActiveCollection()
    const idVariants = getDocumentIdVariants(documentId)
    
    // Try different ID formats
    const idsToTry = [
      idVariants.original,
      idVariants.withSpaces,
      idVariants.withUnderscores
    ].filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates
    
    for (const idToTry of idsToTry) {
      try {
        const docRef = doc(db, collectionName, idToTry)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const rawData = { id: docSnap.id, ...docSnap.data() }
          const mappedData = mapInterviewData(rawData, collectionName)
          
          // Validate the mapped data
          const validation = validateMappedData(mappedData, 'interview')
          if (!validation.isValid) {
            console.warn(`Validation warnings for ${documentId}:`, validation.errors)
          }
          
          return mappedData
        }
      } catch (idError) {
        console.warn(`Failed to fetch with ID "${idToTry}":`, idError.message)
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching interview data:', error)
    throw error
  }
}

/**
 * Get all segments/subsummaries for an interview with proper field mapping
 * Handles both ID formats (spaces vs underscores) between collections
 * @param {string} documentId - The interview document ID
 * @returns {Promise<Array>} Array of mapped segment data
 */
export const getInterviewSegments = async (documentId) => {
  try {
    const collectionName = getActiveCollection()
    const idVariants = getDocumentIdVariants(documentId)
    
    // Try different ID formats
    const idsToTry = [
      idVariants.original,
      idVariants.withSpaces,
      idVariants.withUnderscores
    ].filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates
    
    for (const idToTry of idsToTry) {
      try {
        const subRef = collection(db, collectionName, idToTry, 'subSummaries')
        const subSnap = await getDocs(subRef)
        
        if (!subSnap.empty) {
          const segments = []
          subSnap.forEach((doc) => {
            const rawData = { id: doc.id, ...doc.data() }
            const mappedData = mapSubSummaryData(rawData, collectionName)
            
            // Validate the mapped data
            const validation = validateMappedData(mappedData, 'segment')
            if (!validation.isValid) {
              console.warn(`Validation warnings for segment ${doc.id}:`, validation.errors)
            }
            
            segments.push(mappedData)
          })
          
          return segments
        }
      } catch (idError) {
        console.warn(`Failed to fetch segments with ID "${idToTry}":`, idError.message)
      }
    }
    
    return []
  } catch (error) {
    console.error('Error fetching interview segments:', error)
    throw error
  }
}

/**
 * Get all interviews with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of results
 * @param {string} options.orderBy - Field to order by
 * @param {string} options.orderDirection - 'asc' or 'desc'
 * @returns {Promise<Array>} Array of mapped interview data
 */
export const getAllInterviews = async (options = {}) => {
  try {
    const collectionName = getActiveCollection()
    const { 
      limit: queryLimit = 50, 
      orderBy: orderField = 'createdAt', 
      orderDirection = 'desc' 
    } = options
    
    let q = collection(db, collectionName)
    
    // Add ordering if specified
    if (orderField) {
      q = query(q, orderBy(orderField, orderDirection))
    }
    
    // Add limit if specified
    if (queryLimit) {
      q = query(q, limit(queryLimit))
    }
    
    const querySnapshot = await getDocs(q)
    const interviews = []
    
    querySnapshot.forEach((doc) => {
      const rawData = { id: doc.id, ...doc.data() }
      const mappedData = mapInterviewData(rawData, collectionName)
      interviews.push(mappedData)
    })
    
    return interviews
  } catch (error) {
    console.error('Error fetching all interviews:', error)
    throw error
  }
}

/**
 * Search interviews by keyword with enhanced processing
 * @param {string} keyword - Keyword to search for
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of matching interviews and segments
 */
export const searchInterviewsByKeyword = async (keyword, options = {}) => {
  try {
    const { includeSegments = true, limit: queryLimit = 20 } = options
    const results = []
    
    // Get all interviews first
    const interviews = await getAllInterviews({ limit: 100 })
    
    for (const interview of interviews) {
      let interviewMatches = false
      const matchingSegments = []
      
      // Check if keyword matches interview-level data
      const keywordLower = keyword.toLowerCase()
      if (
        interview.documentName.toLowerCase().includes(keywordLower) ||
        interview.mainSummary.toLowerCase().includes(keywordLower) ||
        interview.role.toLowerCase().includes(keywordLower) ||
        (interview.keyThemes && interview.keyThemes.some(theme => 
          theme.toLowerCase().includes(keywordLower)
        ))
      ) {
        interviewMatches = true
      }
      
      // If including segments, search through them
      if (includeSegments) {
        try {
          const segments = await getInterviewSegments(interview.id)
          
          for (const segment of segments) {
            const keywords = processKeywords(segment.keywords)
            
            if (
              segment.topic.toLowerCase().includes(keywordLower) ||
              segment.summary.toLowerCase().includes(keywordLower) ||
              keywords.normalized.some(kw => kw.includes(keywordLower)) ||
              (segment.mainTopicCategory && segment.mainTopicCategory.toLowerCase().includes(keywordLower))
            ) {
              matchingSegments.push(segment)
            }
          }
        } catch (error) {
          console.warn(`Error fetching segments for ${interview.id}:`, error)
        }
      }
      
      // Add to results if there are matches
      if (interviewMatches || matchingSegments.length > 0) {
        results.push({
          interview,
          matchingSegments,
          matchType: interviewMatches ? 'interview' : 'segments'
        })
      }
      
      // Stop if we've reached the limit
      if (results.length >= queryLimit) {
        break
      }
    }
    
    return results
  } catch (error) {
    console.error('Error searching interviews by keyword:', error)
    throw error
  }
}

/**
 * Get enhanced metadata for search results (used by vector search components)
 * @param {Array} searchResults - Results from vector search
 * @returns {Promise<Array>} Enhanced results with metadata
 */
export const enhanceSearchResults = async (searchResults) => {
  const enhancedResults = []
  
  for (const result of searchResults) {
    try {
      // Get interview data
      const interviewData = await getInterviewData(result.documentId)
      
      // Get segment data if segmentId is provided
      let segmentData = null
      if (result.segmentId) {
        const segments = await getInterviewSegments(result.documentId)
        segmentData = segments.find(seg => seg.id === result.segmentId)
      }
      
      // Extract video ID for thumbnail
      const extractVideoId = (videoEmbedLink) => {
        if (!videoEmbedLink) return null
        const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/
        const match = videoEmbedLink.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
      }
      
      const thumbnailUrl = interviewData?.videoEmbedLink ?
        `https://img.youtube.com/vi/${extractVideoId(interviewData.videoEmbedLink)}/mqdefault.jpg` : null
      
      enhancedResults.push({
        ...result,
        personName: interviewData?.documentName || "Unknown",
        topic: segmentData?.topic || "Untitled Segment",
        timestamp: segmentData?.timestamp || "",
        summary: segmentData?.summary || result.textPreview,
        keywords: segmentData?.keywords || "",
        thumbnailUrl,
        
        // Enhanced fields from metadataV2
        keyThemes: interviewData?.keyThemes || [],
        historicalSignificance: interviewData?.historicalSignificance || '',
        mainTopicCategory: segmentData?.mainTopicCategory || '',
        relatedEvents: segmentData?.relatedEvents || [],
        notableQuotes: segmentData?.notableQuotes || [],
        processingInfo: interviewData?.processingInfo || {},
        metadata: interviewData?.metadata || {}
      })
    } catch (error) {
      console.error(`Error enhancing search result ${result.id}:`, error)
      // Include the result anyway, just without the additional metadata
      enhancedResults.push(result)
    }
  }
  
  return enhancedResults
}

/**
 * Get collection statistics and health information
 * @returns {Promise<Object>} Collection statistics
 */
export const getCollectionStats = async () => {
  try {
    const collectionName = getActiveCollection()
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)
    
    const stats = {
      collectionName,
      totalDocuments: snapshot.size,
      documentsWithVideo: 0,
      documentsWithProcessingInfo: 0,
      totalSegments: 0,
      avgSegmentsPerDocument: 0
    }
    
    let totalSegmentCount = 0
    
    for (const doc of snapshot.docs) {
      const data = doc.data()
      
      if (data.videoEmbedLink) {
        stats.documentsWithVideo++
      }
      
      if (data.processingInfo) {
        stats.documentsWithProcessingInfo++
      }
      
      // Count segments
      try {
        const segmentsRef = collection(db, collectionName, doc.id, 'subSummaries')
        const segmentsSnapshot = await getDocs(segmentsRef)
        totalSegmentCount += segmentsSnapshot.size
      } catch (error) {
        console.warn(`Error counting segments for ${doc.id}:`, error)
      }
    }
    
    stats.totalSegments = totalSegmentCount
    stats.avgSegmentsPerDocument = stats.totalDocuments > 0 ? 
      Math.round(totalSegmentCount / stats.totalDocuments) : 0
    
    return stats
  } catch (error) {
    console.error('Error getting collection stats:', error)
    throw error
  }
}
