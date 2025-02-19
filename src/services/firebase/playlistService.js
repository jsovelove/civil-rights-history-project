import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './config';

/**
 * Fetches relevant interview segments based on keywords
 * @param {Array} keywords - Array of search keywords
 * @returns {Promise<Array>} Promise resolving to matching interview segments
 */
export async function fetchRelevantSubSummaries(keywords) {
  console.log('Searching for keywords:', keywords);
  
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    console.warn('No valid keywords provided');
    return [];
  }

  try {
    const interviewsSnapshot = await getDocs(collection(db, 'interviewSummaries'));
    const results = [];

    for (const interviewDoc of interviewsSnapshot.docs) {
      const interviewId = interviewDoc.id;
      const interviewData = interviewDoc.data();
      const { videoEmbedLink, name, role } = interviewData;

      const subSummariesRef = collection(db, 'interviewSummaries', interviewId, 'subSummaries');
      const querySnapshot = await getDocs(subSummariesRef);

      querySnapshot.forEach((doc) => {
        const subSummary = doc.data();
        
        // Parse keywords from the document
        const documentKeywords = subSummary.keywords
          ? subSummary.keywords.split(',').map(kw => kw.trim().toLowerCase())
          : [];

        // Check if any of the search keywords match
        const hasMatch = keywords.some(keyword => 
          documentKeywords.includes(keyword)
        );

        if (hasMatch) {
          results.push({
            documentName: interviewId,
            videoEmbedLink,
            name,
            role,
            id: doc.id,
            ...subSummary,
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error('Error fetching relevant sub-summaries:', error);
    throw error;
  }
}

/**
 * Fetches stored summary for a specific keyword
 * @param {string} keyword - Search keyword
 * @returns {Promise<string>} Promise resolving to summary text
 */
export async function fetchStoredSummary(keyword) {
  try {
    if (!keyword) {
      return 'Summary not available.';
    }
    
    const normalizedKeyword = keyword.trim().toLowerCase();
    const keywordDocRef = doc(db, 'keywordSummaries', normalizedKeyword);
    const docSnap = await getDoc(keywordDocRef);
    
    if (docSnap.exists()) {
      return docSnap.data().summary || 'Summary not available.';
    } else {
      return 'Summary not available for this keyword.';
    }
  } catch (error) {
    console.error('Error fetching stored summary:', error);
    return 'Error fetching summary. Please try again later.';
  }
}

/**
 * Fetches a saved playlist by ID
 * @param {string} playlistId - Playlist ID to fetch
 * @returns {Promise<Object|null>} Promise resolving to playlist object or null
 */
export async function fetchPlaylist(playlistId) {
  try {
    if (!playlistId) return null;
    
    const playlistDocRef = doc(db, 'playlists', playlistId);
    const docSnap = await getDoc(playlistDocRef);
    
    if (docSnap.exists()) {
      const playlistData = docSnap.data();
      
      // If the playlist contains segment references, fetch the actual segments
      if (playlistData.segments && Array.isArray(playlistData.segments)) {
        const resolvedSegments = [];
        
        for (const segmentRef of playlistData.segments) {
          if (segmentRef.interviewId && segmentRef.segmentId) {
            try {
              const segmentDocRef = doc(
                db, 
                'interviewSummaries', 
                segmentRef.interviewId, 
                'subSummaries',
                segmentRef.segmentId
              );
              const segmentSnap = await getDoc(segmentDocRef);
              
              if (segmentSnap.exists()) {
                // Get interview data to include name, role, videoEmbedLink
                const interviewDocRef = doc(db, 'interviewSummaries', segmentRef.interviewId);
                const interviewSnap = await getDoc(interviewDocRef);
                
                if (interviewSnap.exists()) {
                  const interviewData = interviewSnap.data();
                  
                  resolvedSegments.push({
                    id: segmentSnap.id,
                    documentName: segmentRef.interviewId,
                    ...segmentSnap.data(),
                    name: interviewData.name,
                    role: interviewData.role,
                    videoEmbedLink: interviewData.videoEmbedLink,
                  });
                }
              }
            } catch (segmentErr) {
              console.error(`Error fetching segment ${segmentRef.segmentId}:`, segmentErr);
            }
          }
        }
        
        return {
          id: docSnap.id,
          ...playlistData,
          resolvedSegments,
        };
      }
      
      return {
        id: docSnap.id,
        ...playlistData,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching playlist ${playlistId}:`, error);
    throw error;
  }
}

/**
 * Fetches featured playlists
 * @param {number} count - Number of playlists to fetch
 * @returns {Promise<Array>} Promise resolving to array of playlist objects
 */
export async function fetchFeaturedPlaylists(count = 4) {
  try {
    const playlistsSnapshot = await getDocs(collection(db, 'playlists'));
    const playlists = playlistsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(playlist => playlist.featured)
      .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
      .slice(0, count);
      
    return playlists;
  } catch (error) {
    console.error('Error fetching featured playlists:', error);
    throw error;
  }
}