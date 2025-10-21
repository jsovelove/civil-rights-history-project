import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { getActiveCollection, mapInterviewData, mapSubSummaryData } from './collectionMapper.js';

/**
 * Generate and store embeddings for interview content
 * @param {string} textContent - The text to generate embeddings for
 * @param {string} documentId - Associated document ID
 * @param {string} segmentId - Associated segment ID (if applicable)
 * @param {Object} metadata - Additional metadata to store with embedding
 * @returns {Promise<string>} - ID of the stored embedding
 */
export async function generateAndStoreEmbeddings(textContent, documentId, segmentId = null, metadata = {}) {
  console.log(`Generating embedding for doc: ${documentId}, segment: ${segmentId || 'N/A'}`);
  
  if (!textContent || textContent.trim().length === 0) {
    console.error(`Empty or missing text content for doc: ${documentId}, segment: ${segmentId || 'N/A'}`);
    throw new Error('Text content is empty or missing');
  }
  
  console.log(`Text content sample: "${textContent.substring(0, 100)}..."`);
  console.log(`Text content length: ${textContent.length} characters`);
  
  try {
    // Option 1: Use an external API for embeddings
    console.log('Calling OpenAI API for embedding generation...');
    const apiKey = import.meta?.env?.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    console.log(`API Key status: ${apiKey ? 'Present (starts with ' + apiKey.substring(0, 3) + ')' : 'MISSING'}`);
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: textContent,
        model: "text-embedding-3-small"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(e => ({ error: 'Failed to parse error response' }));
      console.error('OpenAI API error:', errorData);
      console.error(`Response status: ${response.status} ${response.statusText}`);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Embedding generated successfully', {
      model: data.model,
      embeddingLength: data.data?.[0]?.embedding?.length || 'MISSING',
    });
    
    if (!data.data?.[0]?.embedding) {
      console.error('Embedding data missing in API response:', data);
      throw new Error('Embedding data missing in API response');
    }
    
    const embedding = data.data[0].embedding;
    
    // Store embedding in Firestore
    console.log('Storing embedding in Firestore...');
    // Use new collection for enhanced clip embeddings
    const collectionName = metadata.type === 'segment' ? "clipEmbeddings" : "embeddings";
    const embeddingsRef = collection(db, collectionName);
    
    const docRef = await addDoc(embeddingsRef, {
      embedding: embedding,
      documentId: documentId,
      segmentId: segmentId,
      textPreview: textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''), // Store truncated text for reference
      timestamp: new Date(),
      // Enhanced metadata for better search and filtering
      ...metadata,
      // Add searchable fields for faster filtering
      hasSegment: !!segmentId,
      contentLength: textContent.length,
      embeddingDimensions: embedding.length
    });
    
    console.log(`Embedding stored successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error generating or storing embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for all content in the database (supports both collections)
 * @param {function} progressCallback - Callback for progress updates
 * @param {function} statusCallback - Callback for status updates
 * @param {string} sourceCollection - Collection to process ('interviewSummaries' or 'metadataV2')
 * @returns {Promise<void>}
 */
export async function generateEmbeddingsForAllContent(progressCallback, statusCallback, sourceCollection = null) {
  try {
    console.log('Starting embedding generation for all content...');
    statusCallback('Fetching content from database...');
    
    // Use active collection if not specified
    const collectionName = sourceCollection || getActiveCollection();
    console.log(`Using collection: ${collectionName}`);
    
    // Get interview summaries from Firestore
    const interviewsRef = collection(db, collectionName);
    console.log(`Fetching interviews from ${collectionName}...`);
    const interviewsSnapshot = await getDocs(interviewsRef);
    
    if (interviewsSnapshot.empty) {
      console.log('No interviews found in database');
      statusCallback('No interviews found to embed');
      return;
    }
    
    console.log(`Found ${interviewsSnapshot.size} interviews to process`);
    statusCallback(`Processing ${interviewsSnapshot.size} interviews...`);
    
    // Debugging: Check a sample document structure
    if (interviewsSnapshot.docs.length > 0) {
      const sampleDoc = interviewsSnapshot.docs[0].data();
      console.log('Sample interview document structure:', Object.keys(sampleDoc));
      console.log('Sample interview summary field:', sampleDoc.summary ? `Present (${sampleDoc.summary.length} chars)` : 'MISSING');
    }
    
    let totalProcessed = 0;
    let totalItems = 0; // Will be calculated as we go
    let totalInterviews = interviewsSnapshot.size;
    let interviewsProcessed = 0;
    let missingData = { interviews: 0, summaries: 0, subsummaries: 0 };
    
    // First, get a count of all segments to process for progress calculation
    for (const interviewDoc of interviewsSnapshot.docs) {
      const interviewData = interviewDoc.data();
      // Count main summary
      if (interviewData.summary) {
        totalItems++;
      } else {
        missingData.summaries++;
      }
      
      // Count segments/subsummaries
      const subSummariesRef = collection(db, collectionName, interviewDoc.id, "subSummaries");
      const subSummariesSnapshot = await getDocs(subSummariesRef);
      
      if (subSummariesSnapshot.empty) {
        missingData.subsummaries++;
      }
      
      // Check for content field in subsummaries
      if (subSummariesSnapshot.docs.length > 0) {
        const sampleSubSummary = subSummariesSnapshot.docs[0].data();
        console.log(`Sample subsummary fields for ${interviewDoc.id}:`, Object.keys(sampleSubSummary));
        console.log('Sample subsummary summary field:', 
          sampleSubSummary.summary ? `Present (${sampleSubSummary.summary.length} chars)` : 'MISSING');
      }
      
      totalItems += subSummariesSnapshot.size;
    }
    
    statusCallback(`Found ${totalItems} total content items to process. Missing: ${JSON.stringify(missingData)}`);
    
    // Process each interview
    for (const interviewDoc of interviewsSnapshot.docs) {
      const interviewId = interviewDoc.id;
      const rawInterviewData = interviewDoc.data();
      
      // Map interview data using collection mapper
      const interviewData = mapInterviewData(rawInterviewData, collectionName);
      
      statusCallback(`Processing interview ${interviewData.documentName || interviewId} (${++interviewsProcessed}/${totalInterviews})`);
      console.log(`Processing interview ${interviewId}`, interviewData);
      
      // Generate embedding for the main summary
      if (interviewData.mainSummary) {
        try {
          statusCallback(`Generating embedding for interview summary ${interviewId}...`);
          
          // Get all keywords from subsummaries for the main summary
          const subSummariesRef = collection(db, collectionName, interviewId, "subSummaries");
          const subSummariesSnapshot = await getDocs(subSummariesRef);
          
          // Collect all unique keywords from segments
          const allKeywords = new Set();
          const allThemes = new Set();
          
          subSummariesSnapshot.forEach(doc => {
            const rawSubSummary = doc.data();
            const subSummary = mapSubSummaryData(rawSubSummary, collectionName);
            
            // Handle keywords (array or string)
            if (subSummary.keywordsArray && subSummary.keywordsArray.length > 0) {
              subSummary.keywordsArray.forEach(kw => allKeywords.add(kw.trim()));
            } else if (subSummary.keywords) {
              subSummary.keywords.split(',').forEach(kw => allKeywords.add(kw.trim()));
            }
            
            // Add themes from metadataV2
            if (subSummary.mainTopicCategory) {
              allThemes.add(subSummary.mainTopicCategory);
            }
          });
          
          // Create enhanced content for main summary
          const enhancedContent = [
            `Interview: ${interviewData.documentName || 'Untitled Interview'}`,
            `Role: ${interviewData.role || 'Unknown Role'}`,
            interviewData.mainSummary,
            interviewData.historicalSignificance ? `Historical Significance: ${interviewData.historicalSignificance}` : '',
            interviewData.keyThemes && interviewData.keyThemes.length > 0 ? `Key Themes: ${interviewData.keyThemes.join(', ')}` : '',
            allKeywords.size > 0 ? `Keywords: ${Array.from(allKeywords).join(', ')}` : '',
            allThemes.size > 0 ? `Topic Categories: ${Array.from(allThemes).join(', ')}` : ''
          ].filter(Boolean).join('\n\n');
          
          // Prepare metadata for storage
          const interviewMetadata = {
            type: 'interview',
            collection: collectionName,
            role: interviewData.role,
            keyThemes: interviewData.keyThemes || [],
            historicalSignificance: interviewData.historicalSignificance || '',
            processingInfo: interviewData.processingInfo || {}
          };
          
          await generateAndStoreEmbeddings(
            enhancedContent,
            interviewId,
            null,
            interviewMetadata
          );
          totalProcessed++;
          progressCallback((totalProcessed / totalItems) * 100);
        } catch (error) {
          console.error(`Error processing interview summary ${interviewId}:`, error);
          statusCallback(`Error processing summary: ${error.message}`);
        }
      } else {
        console.log(`Interview ${interviewId} has no summary field`);
      }
      
      // Generate embeddings for each segment/subsummary
      const subSummariesRef = collection(db, collectionName, interviewId, "subSummaries");
      const subSummariesSnapshot = await getDocs(subSummariesRef);
      
      if (!subSummariesSnapshot.empty) {
        console.log(`Found ${subSummariesSnapshot.size} subsummaries for interview ${interviewId}`);
        
        for (const subSummaryDoc of subSummariesSnapshot.docs) {
          const subSummaryId = subSummaryDoc.id;
          const rawSubSummary = subSummaryDoc.data();
          
          // Map subsummary data using collection mapper
          const subSummary = mapSubSummaryData(rawSubSummary, collectionName);
          
          // Use the 'summary' field for subsummaries
          if (subSummary.summary) {
            try {
              statusCallback(`Generating embedding for segment ${subSummaryId}...`);
              
              // Create enhanced content for subsummary with metadataV2 fields
              const enhancedContent = [
                `Topic: ${subSummary.topic || 'Untitled Segment'}`,
                `Interview: ${interviewData.documentName}`,
                `Timestamp: ${subSummary.timestamp}`,
                subSummary.summary,
                subSummary.mainTopicCategory ? `Category: ${subSummary.mainTopicCategory}` : '',
                subSummary.keywords ? `Keywords: ${subSummary.keywords}` : '',
                subSummary.relatedEvents && subSummary.relatedEvents.length > 0 ? `Related Events: ${subSummary.relatedEvents.join(', ')}` : '',
                subSummary.notableQuotes && subSummary.notableQuotes.length > 0 ? `Notable Quotes: ${subSummary.notableQuotes.join(' | ')}` : ''
              ].filter(Boolean).join('\n\n');
              
              // Prepare metadata for storage
              const segmentMetadata = {
                type: 'segment',
                collection: collectionName,
                interviewName: interviewData.documentName,
                interviewRole: interviewData.role,
                topic: subSummary.topic,
                timestamp: subSummary.timestamp,
                startTime: subSummary.startTime,
                endTime: subSummary.endTime,
                chapterNumber: subSummary.chapterNumber || 0,
                mainTopicCategory: subSummary.mainTopicCategory || '',
                relatedEvents: subSummary.relatedEvents || [],
                notableQuotes: subSummary.notableQuotes || [],
                keywordMatchingInfo: subSummary.keywordMatchingInfo || {},
                keywordsArray: subSummary.keywordsArray || []
              };
              
              await generateAndStoreEmbeddings(
                enhancedContent,
                interviewId,
                subSummaryId,
                segmentMetadata
              );
              totalProcessed++;
              progressCallback((totalProcessed / totalItems) * 100);
            } catch (error) {
              console.error(`Error processing segment ${subSummaryId}:`, error);
              statusCallback(`Error processing segment: ${error.message}`);
            }
          } else {
            console.log(`Subsummary ${subSummaryId} has no summary field. Available fields:`, Object.keys(rawSubSummary));
          }
        }
      } else {
        console.log(`Interview ${interviewId} has no subsummaries`);
      }
    }
    
    console.log(`Completed embedding generation. Processed ${totalProcessed}/${totalItems} items.`);
    statusCallback(`Completed embedding generation (${totalProcessed}/${totalItems})`);
  } catch (error) {
    console.error('Error in generateEmbeddingsForAllContent:', error);
    statusCallback(`Error: ${error.message}`);
    throw error;
  }
}

import { getFunctions, httpsCallable } from "firebase/functions";

export async function vectorSearch(query, limit = 10) {
  console.log(`Performing vector search for: "${query}"`);

  if (!query || query.trim().length === 0) {
    console.error("Empty search query");
    throw new Error("Search query cannot be empty");
  }

  try {
    const functions = getFunctions(); // Optionally: pass app instance
    const searchFunction = httpsCallable(functions, 'vectorSearch');

    console.log('Calling vector search Cloud Function...');
    const result = await searchFunction({
      query: query.trim(),
      limit: Math.max(1, Math.min(50, limit))
    });

    console.log('Vector search response:', result);

    if (!result.data || !result.data.success) {
      throw new Error(result.data?.error || 'Vector search failed');
    }

    return result.data.results;
  } catch (error) {
    console.error('Error in vector search:', error);
    throw error;
  }
}




/**
 * Calculate cosine similarity between two vectors
 * @param {Array} vec1 - First vector
 * @param {Array} vec2 - Second vector
 * @returns {number} - Similarity score between 0 and 1
 */
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    console.error(`Vector dimension mismatch: ${vec1.length} vs ${vec2.length}`);
    throw new Error('Vector dimensions do not match');
  }
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) {
    console.warn('Zero magnitude vector found in similarity calculation');
    return 0;
  }
  
  return dotProduct / (mag1 * mag2);
}

/**
 * OPTIMIZED CLIP VECTORIZATION - Generates embeddings specifically for clip search
 * This function focuses on creating the best possible vectors for finding clips by topic
 * 
 * @param {string} sourceCollection - Collection to process ('interviewSummaries' or 'metadataV2')
 * @param {function} progressCallback - Progress updates
 * @param {function} statusCallback - Status updates
 * @param {boolean} clipsOnly - If true, only process clips/segments (recommended)
 * @returns {Promise<void>}
 */
export async function generateClipEmbeddings(sourceCollection = null, progressCallback, statusCallback, clipsOnly = true) {
  try {
    const collectionName = sourceCollection || getActiveCollection();
    console.log(`🎬 Starting CLIP-FOCUSED embedding generation from ${collectionName}...`);
    statusCallback(`Generating embeddings for clips from ${collectionName}...`);
    
    const interviewsRef = collection(db, collectionName);
    const interviewsSnapshot = await getDocs(interviewsRef);
    
    if (interviewsSnapshot.empty) {
      statusCallback('No interviews found');
      return;
    }
    
    let totalClips = 0;
    let processedClips = 0;
    
    // Count total clips first
    for (const interviewDoc of interviewsSnapshot.docs) {
      const subSummariesRef = collection(db, collectionName, interviewDoc.id, "subSummaries");
      const subSummariesSnapshot = await getDocs(subSummariesRef);
      totalClips += subSummariesSnapshot.size;
    }
    
    statusCallback(`Found ${totalClips} clips to vectorize across ${interviewsSnapshot.size} interviews`);
    
    // Process each interview's clips
    for (const interviewDoc of interviewsSnapshot.docs) {
      const interviewId = interviewDoc.id;
      const rawInterviewData = interviewDoc.data();
      const interviewData = mapInterviewData(rawInterviewData, collectionName);
      
      statusCallback(`Processing clips from: ${interviewData.documentName}`);
      
      const subSummariesRef = collection(db, collectionName, interviewId, "subSummaries");
      const subSummariesSnapshot = await getDocs(subSummariesRef);
      
      for (const subSummaryDoc of subSummariesSnapshot.docs) {
        const subSummaryId = subSummaryDoc.id;
        const rawSubSummary = subSummaryDoc.data();
        const subSummary = mapSubSummaryData(rawSubSummary, collectionName);
        
        if (subSummary.summary) {
          try {
            statusCallback(`Vectorizing clip: ${subSummary.topic} (${processedClips + 1}/${totalClips})`);
            
            // OPTIMIZED CONTENT FOR CLIP SEARCH
            // Focus on making clips discoverable by topic and concept
            const clipContent = [
              // Primary content - what the clip is about
              `TOPIC: ${subSummary.topic}`,
              `CONTENT: ${subSummary.summary}`,
              
              // Context - who and when
              `SPEAKER: ${interviewData.documentName} (${interviewData.role})`,
              `TIMESTAMP: ${subSummary.timestamp}`,
              
              // Enhanced metadata for better topic matching
              subSummary.mainTopicCategory ? `CATEGORY: ${subSummary.mainTopicCategory}` : '',
              
              // Keywords for concept matching
              subSummary.keywords ? `KEYWORDS: ${subSummary.keywords}` : '',
              
              // Rich context from metadataV2
              subSummary.relatedEvents && subSummary.relatedEvents.length > 0 
                ? `RELATED EVENTS: ${subSummary.relatedEvents.join(', ')}` : '',
              
              subSummary.notableQuotes && subSummary.notableQuotes.length > 0 
                ? `NOTABLE QUOTES: ${subSummary.notableQuotes.join(' | ')}` : '',
                
              // Historical context for better thematic matching
              interviewData.historicalSignificance 
                ? `HISTORICAL CONTEXT: ${interviewData.historicalSignificance}` : '',
                
              // Key themes for conceptual search
              interviewData.keyThemes && interviewData.keyThemes.length > 0 
                ? `THEMES: ${interviewData.keyThemes.join(', ')}` : ''
                
            ].filter(Boolean).join('\n\n');
            
            // Enhanced metadata for filtering and display
            const clipMetadata = {
              type: 'segment',
              collection: collectionName,
              
              // Core clip info
              topic: subSummary.topic,
              timestamp: subSummary.timestamp,
              startTime: subSummary.startTime,
              endTime: subSummary.endTime,
              
              // Interview context
              interviewName: interviewData.documentName,
              interviewRole: interviewData.role,
              videoEmbedLink: interviewData.videoEmbedLink, // Add video link for thumbnail generation
              
              // Enhanced categorization
              mainTopicCategory: subSummary.mainTopicCategory || 'General',
              chapterNumber: subSummary.chapterNumber || 0,
              
              // Rich content indicators
              hasNotableQuotes: subSummary.notableQuotes && subSummary.notableQuotes.length > 0,
              hasRelatedEvents: subSummary.relatedEvents && subSummary.relatedEvents.length > 0,
              
              // Arrays for filtering
              relatedEvents: subSummary.relatedEvents || [],
              notableQuotes: subSummary.notableQuotes || [],
              keywordsArray: subSummary.keywordsArray || [],
              keyThemes: interviewData.keyThemes || [],
              
              // Keyword matching info for advanced search
              keywordMatchingInfo: subSummary.keywordMatchingInfo || {},
              
              // Content quality indicators
              contentLength: clipContent.length,
              summaryLength: subSummary.summary.length
            };
            
            await generateAndStoreEmbeddings(
              clipContent,
              interviewId,
              subSummaryId,
              clipMetadata
            );
            
            processedClips++;
            progressCallback((processedClips / totalClips) * 100);
            
          } catch (error) {
            console.error(`Error processing clip ${subSummaryId}:`, error);
            statusCallback(`Error processing clip: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`✅ Completed clip vectorization: ${processedClips}/${totalClips} clips processed`);
    statusCallback(`Completed! Vectorized ${processedClips} clips for topic search`);
    
  } catch (error) {
    console.error('❌ Error in clip embedding generation:', error);
    statusCallback(`Error: ${error.message}`);
    throw error;
  }
}

/**
 * Enhanced vector search with filtering capabilities
 * @param {string} query - Search query
 * @param {Object} filters - Optional filters for search
 * @param {number} limit - Maximum results to return
 * @returns {Promise<Array>} - Search results with enhanced metadata
 */
export async function enhancedVectorSearch(query, filters = {}, limit = 10) {
  console.log(`Performing enhanced vector search for: "${query}" with filters:`, filters);

  if (!query || query.trim().length === 0) {
    console.error("Empty search query");
    throw new Error("Search query cannot be empty");
  }

  try {
    const functions = getFunctions();
    const searchFunction = httpsCallable(functions, 'vectorSearch');

    console.log('Calling enhanced vector search Cloud Function...');
    const result = await searchFunction({
      query: query.trim(),
      limit: Math.max(1, Math.min(50, limit)),
      filters: filters,
      collection: 'clipEmbeddings' // Use new collection for clip searches
    });

    console.log('Enhanced vector search response:', result);

    if (!result.data || !result.data.success) {
      throw new Error(result.data?.error || 'Vector search failed');
    }

    return result.data.results;
  } catch (error) {
    console.error('Error in enhanced vector search:', error);
    throw error;
  }
}

/**
 * Search for clips by topic category
 * @param {string} query - Search query
 * @param {string} category - Topic category to filter by
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} - Filtered search results
 */
export async function searchClipsByCategory(query, category, limit = 10) {
  return enhancedVectorSearch(query, { 
    type: 'segment',
    mainTopicCategory: category 
  }, limit);
}

/**
 * Search for clips by interview role
 * @param {string} query - Search query
 * @param {string} role - Interview role to filter by
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} - Filtered search results
 */
export async function searchClipsByRole(query, role, limit = 10) {
  return enhancedVectorSearch(query, { 
    type: 'segment',
    interviewRole: role 
  }, limit);
}

/**
 * Search for clips with notable quotes
 * @param {string} query - Search query
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} - Clips with notable quotes
 */
export async function searchClipsWithQuotes(query, limit = 10) {
  return enhancedVectorSearch(query, { 
    type: 'segment',
    hasNotableQuotes: true 
  }, limit);
}

/**
 * CLIP-FOCUSED VECTOR SEARCH - Main function for finding relevant clips by topic
 * This is the primary function for your clip search functionality
 * 
 * @param {string} query - Natural language query describing the topic/concept
 * @param {Object} options - Search options
 * @param {number} options.limit - Maximum number of clips to return (default: 15)
 * @param {string} options.category - Filter by mainTopicCategory
 * @param {string} options.role - Filter by interview role
 * @param {boolean} options.segmentsOnly - Only return clip segments, not full interviews
 * @returns {Promise<Array>} - Array of matching clip objects with enhanced metadata
 */
export async function searchClipsByTopic(query, options = {}) {
  const {
    limit = 15,
    category = null,
    role = null,
    segmentsOnly = true
  } = options;

  console.log(`🔍 Searching clips for topic: "${query}"`);
  
  // Build filters for clip-specific search
  const filters = {
    type: 'segment' // Only search clip segments, not full interviews
  };
  
  if (category) filters.mainTopicCategory = category;
  if (role) filters.interviewRole = role;
  
  try {
    const results = await enhancedVectorSearch(query, filters, limit);
    
    // Enhance results with clip-specific data
    const clipResults = results.map(result => ({
      ...result,
      // Ensure clip-specific fields are available
      clipId: result.segmentId,
      interviewId: result.documentId,
      playUrl: `/clip-player?documentName=${encodeURIComponent(result.documentId)}&clipId=${encodeURIComponent(result.segmentId)}`,
      
      // Add relevance indicators for clips
      hasQuotes: result.notableQuotes && result.notableQuotes.length > 0,
      hasEvents: result.relatedEvents && result.relatedEvents.length > 0,
      topicRelevance: result.similarity || 0,
      
      // Format for display
      displayTitle: result.topic || 'Untitled Segment',
      displaySubtitle: `${result.interviewName} • ${result.timestamp}`,
      displayCategory: result.mainTopicCategory || 'General'
    }));
    
    console.log(`✅ Found ${clipResults.length} relevant clips`);
    return clipResults;
    
  } catch (error) {
    console.error('❌ Error searching clips by topic:', error);
    throw error;
  }
}

/**
 * Get related clips based on a specific clip
 * Useful for "More like this" functionality
 * 
 * @param {string} documentId - Interview document ID
 * @param {string} segmentId - Segment ID of the reference clip
 * @param {number} limit - Number of related clips to return
 * @returns {Promise<Array>} - Array of related clips
 */
export async function getRelatedClips(documentId, segmentId, limit = 8) {
  try {
    // Get the reference clip's content to search for similar ones
    const embeddingsRef = collection(db, 'clipEmbeddings');
    const q = query(embeddingsRef, 
      where('documentId', '==', documentId),
      where('segmentId', '==', segmentId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('Reference clip not found in embeddings');
      return [];
    }
    
    const referenceClip = snapshot.docs[0].data();
    const searchQuery = referenceClip.textPreview || referenceClip.topic || 'related content';
    
    // Search for similar clips, excluding the original
    const results = await searchClipsByTopic(searchQuery, { limit: limit + 1 });
    
    // Filter out the original clip
    return results.filter(clip => 
      !(clip.documentId === documentId && clip.segmentId === segmentId)
    ).slice(0, limit);
    
  } catch (error) {
    console.error('Error getting related clips:', error);
    return [];
  }
} 