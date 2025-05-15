import { collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Generate and store embeddings for interview content
 * @param {string} textContent - The text to generate embeddings for
 * @param {string} documentId - Associated document ID
 * @param {string} segmentId - Associated segment ID (if applicable)
 * @returns {Promise<string>} - ID of the stored embedding
 */
export async function generateAndStoreEmbeddings(textContent, documentId, segmentId = null) {
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
    console.log(`API Key status: ${import.meta.env.VITE_OPENAI_API_KEY ? 'Present (starts with ' + import.meta.env.VITE_OPENAI_API_KEY.substring(0, 3) + ')' : 'MISSING'}`);
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
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
    const embeddingsRef = collection(db, "embeddings");
    
    const docRef = await addDoc(embeddingsRef, {
      embedding: embedding,
      documentId: documentId,
      segmentId: segmentId,
      textContent: textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''), // Store truncated text for reference
      timestamp: new Date()
    });
    
    console.log(`Embedding stored successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error generating or storing embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for all content in the database
 * @param {function} progressCallback - Callback for progress updates
 * @param {function} statusCallback - Callback for status updates
 * @returns {Promise<void>}
 */
export async function generateEmbeddingsForAllContent(progressCallback, statusCallback) {
  try {
    console.log('Starting embedding generation for all content...');
    statusCallback('Fetching content from database...');
    
    // Get interview summaries from Firestore
    const interviewsRef = collection(db, "interviewSummaries");
    console.log('Fetching interview summaries from Firestore...');
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
      const subSummariesRef = collection(db, "interviewSummaries", interviewDoc.id, "subSummaries");
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
      const interviewData = interviewDoc.data();
      
      statusCallback(`Processing interview ${interviewData.title || interviewId} (${++interviewsProcessed}/${totalInterviews})`);
      console.log(`Processing interview ${interviewId}`, interviewData);
      
      // Generate embedding for the main summary
      if (interviewData.summary) {
        try {
          statusCallback(`Generating embedding for interview summary ${interviewId}...`);
          
          // Get all keywords from subsummaries for the main summary
          const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
          const subSummariesSnapshot = await getDocs(subSummariesRef);
          
          // Collect all unique keywords from segments
          const allKeywords = new Set();
          subSummariesSnapshot.forEach(doc => {
            const subSummary = doc.data();
            if (subSummary.keywords) {
              subSummary.keywords.split(',').forEach(kw => allKeywords.add(kw.trim()));
            }
          });
          
          // Create enhanced content for main summary
          const enhancedContent = [
            `Title: ${interviewData.title || 'Untitled Interview'}`,
            interviewData.summary,
            allKeywords.size > 0 ? `Keywords: ${Array.from(allKeywords).join(', ')}` : ''
          ].filter(Boolean).join('\n\n');
          
          await generateAndStoreEmbeddings(
            enhancedContent,
            interviewId
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
      const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
      const subSummariesSnapshot = await getDocs(subSummariesRef);
      
      if (!subSummariesSnapshot.empty) {
        console.log(`Found ${subSummariesSnapshot.size} subsummaries for interview ${interviewId}`);
        
        for (const subSummaryDoc of subSummariesSnapshot.docs) {
          const subSummaryId = subSummaryDoc.id;
          const subSummary = subSummaryDoc.data();
          
          // Use the 'summary' field for subsummaries instead of 'content' or 'text'
          if (subSummary.summary) {
            try {
              statusCallback(`Generating embedding for segment ${subSummaryId}...`);
              
              // Create enhanced content for subsummary
              const enhancedContent = [
                `Topic: ${subSummary.topic || 'Untitled Segment'}`,
                subSummary.summary,
                subSummary.keywords ? `Keywords: ${subSummary.keywords}` : ''
              ].filter(Boolean).join('\n\n');
              
              await generateAndStoreEmbeddings(
                enhancedContent,
                interviewId,
                subSummaryId
              );
              totalProcessed++;
              progressCallback((totalProcessed / totalItems) * 100);
            } catch (error) {
              console.error(`Error processing segment ${subSummaryId}:`, error);
              statusCallback(`Error processing segment: ${error.message}`);
            }
          } else {
            console.log(`Subsummary ${subSummaryId} has no summary field. Available fields:`, Object.keys(subSummary));
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

/**
 * Perform vector search using embeddings
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Ranked search results
 */
export async function vectorSearch(query, limit = 10) {
  console.log(`Performing vector search for: "${query}"`);
  
  try {
    // Generate embedding for the query
    console.log('Generating embedding for search query...');
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-3-small"
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error during search:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const queryEmbedding = data.data[0].embedding;
    console.log('Query embedding generated successfully');
    
    // Fetch all embeddings from the database
    console.log('Fetching stored embeddings from Firestore...');
    const embeddingsRef = collection(db, "embeddings");
    const embeddingsSnapshot = await getDocs(embeddingsRef);
    
    if (embeddingsSnapshot.empty) {
      console.log('No embeddings found in database');
      return [];
    }
    
    console.log(`Found ${embeddingsSnapshot.size} embeddings to compare against`);
    
    // Calculate similarity with each embedding
    const results = embeddingsSnapshot.docs.map(doc => {
      const data = doc.data();
      const similarity = cosineSimilarity(queryEmbedding, data.embedding);
      return {
        id: doc.id,
        documentId: data.documentId,
        segmentId: data.segmentId,
        similarity,
        textPreview: data.textContent
      };
    });
    
    // Sort by similarity and return top results
    results.sort((a, b) => b.similarity - a.similarity);
    console.log(`Returning top ${limit} results`);
    return results.slice(0, limit);
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