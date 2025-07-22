/**
 * @fileoverview ClipsDirectory component for searching and displaying interview clips.
 * 
 * This component provides a search interface to find and display interview clips
 * by keywords. It handles caching of search results for performance optimization
 * and presents search results in a grid layout with thumbnails and metadata.
 */

import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DirectoryCacheContext } from '../pages/ContentDirectory';

/**
 * ClipsDirectory - Displays a searchable directory of interview clips
 * 
 * This component provides an interface for searching interview clips by keywords
 * and presents the results in a grid layout. It handles:
 * 1. Keyword-based searching for interview clips
 * 2. Caching search results for improved performance
 * 3. Displaying clips with thumbnails, titles, and metadata
 * 4. Navigation to individual clip player
 * 
 * @component
 * @example
 * // Basic usage:
 * <ClipsDirectory />
 * 
 * // With initial search term:
 * <ClipsDirectory initialSearchTerm="voting rights" />
 * 
 * @param {Object} props - Component props
 * @param {string} [props.initialSearchTerm=''] - Initial search term to automatically search for
 * @returns {React.ReactElement} Clips directory interface
 */
export default function ClipsDirectory({ initialSearchTerm = '' }) {
  // Component state
  const [clipSearchTerm, setClipSearchTerm] = useState(initialSearchTerm);
  const [clipResults, setClipResults] = useState([]);
  const [clipSearchLoading, setClipSearchLoading] = useState(false);
  const [clipSearchPerformed, setClipSearchPerformed] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Retrieve search caching functions from context
  const { getSearchFromCache, addSearchToCache } = useContext(DirectoryCacheContext);

  /**
   * Handle initialSearchTerm changes
   * Automatically trigger a search when the initialSearchTerm prop changes
   */
  useEffect(() => {
    if (initialSearchTerm) {
      setClipSearchTerm(initialSearchTerm);
      handleClipSearch(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  /**
   * Handles clip search by keywords
   * 
   * This function:
   * 1. Validates search term
   * 2. Checks for cached results
   * 3. Performs a search against the database if needed
   * 4. Updates results and caches them
   * 
   * @param {string} searchTermToUse - Search term to use (defaults to current state)
   * @returns {Promise<void>}
   */
  const handleClipSearch = async (searchTermToUse = clipSearchTerm) => {
    // Validate search term is not empty
    if (!searchTermToUse.trim()) {
      setClipResults([]);
      setClipSearchPerformed(false);
      return;
    }

    setClipSearchPerformed(true);
    
    // Check cache for this search term to avoid redundant network requests
    const cachedResults = getSearchFromCache('clips', searchTermToUse);
    
    if (cachedResults) {
      console.log('Using cached clip search results');
      setClipResults(cachedResults);
      return;
    }
    
    // If not in cache, perform the search
    setClipSearchLoading(true);
    
    try {
      // Parse keywords from search term
      const keywordsArray = searchTermToUse.split(',').map(kw => kw.trim().toLowerCase());
      const results = await fetchRelevantSegments(keywordsArray);
      
      setClipResults(results);
      
      // Cache the search results for future use
      addSearchToCache('clips', searchTermToUse, results);
    } catch (error) {
      console.error("Error searching for clips:", error);
      setError("Failed to search for clips");
    } finally {
      setClipSearchLoading(false);
    }
  };

  /**
   * Fetches interview segments that match the provided keywords
   * 
   * Searches through all interview summaries and their subsummaries
   * to find clips that have matching keywords.
   * 
   * @param {string[]} keywordsArray - Array of normalized keywords to search for
   * @returns {Promise<Array>} Array of matching clip objects
   */
  const fetchRelevantSegments = async (keywordsArray) => {
    const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));
    const results = [];
    
    for (const interviewDoc of interviewsSnapshot.docs) {
      const interviewId = interviewDoc.id;
      const interviewData = interviewDoc.data();
      
      // Get the parent document's videoEmbedLink for thumbnails
      const parentVideoEmbedLink = interviewData.videoEmbedLink;
      const thumbnailUrl = parentVideoEmbedLink ?
        `https://img.youtube.com/vi/${extractVideoId(parentVideoEmbedLink)}/mqdefault.jpg` : null;
      
      // Get subsummaries (individual segments) for this interview
      const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
      const querySnapshot = await getDocs(subSummariesRef);
      
      // Process each segment and check for keyword matches
      querySnapshot.forEach((docSnapshot) => {
        const subSummary = docSnapshot.data();
        const documentKeywords = (subSummary.keywords || "").split(",").map(k => k.trim().toLowerCase());
        const hasMatch = keywordsArray.some(kw => documentKeywords.includes(kw));
        
        // Add matching segments to results
        if (hasMatch) {
          results.push({
            id: docSnapshot.id,
            documentName: interviewId,
            personName: interviewData.name || "Unknown",
            ...subSummary,
            ...interviewData,
            thumbnailUrl // Use the parent document's videoEmbedLink for thumbnails
          });
        }
      });
    }
    return results;
  };

  /**
   * Extracts YouTube video ID from various YouTube URL formats
   * 
   * @param {string} videoEmbedLink - YouTube URL
   * @returns {string|null} YouTube video ID or null if not valid
   */
  const extractVideoId = (videoEmbedLink) => {
    if (!videoEmbedLink) return null;
    
    // Regular expression to handle various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const match = videoEmbedLink.match(regExp);
    
    // Standard YouTube IDs are 11 characters
    return (match && match[2].length === 11) ? match[2] : null;
  };

  /**
   * Navigates to the clip player page for a specific clip
   * 
   * @param {string} documentName - Parent interview document ID
   * @param {string} clipId - Clip/segment ID to view
   */
  const handleViewClip = (documentName, clipId) => {
    navigate(`/clip-player?documentName=${encodeURIComponent(documentName)}&clipId=${encodeURIComponent(clipId)}`);
  };

  // Display error state if something went wrong
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="bg-white/80 backdrop-blur-sm border border-white/40 text-black px-6 py-4 rounded-lg shadow-sm" style={{
          fontFamily: 'Freight Text Pro, Lora, serif'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search clips */}
      <div className="mb-6">
        <div className="max-w-lg">
          <label className="block text-sm font-medium text-black/80 mb-2" style={{
            fontFamily: 'Freight Text Pro, Lora, serif'
          }}>
            Search Clips by Keywords
          </label>
          <div className="flex">
            <input
              type="text"
              placeholder="Enter keywords (comma separated)..."
              value={clipSearchTerm}
              onChange={(e) => setClipSearchTerm(e.target.value)}
              className="flex-grow px-4 py-2.5 border border-black/20 rounded-l-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:border-black/40 transition-colors bg-white/80 backdrop-blur-sm"
              style={{
                fontFamily: 'Freight Text Pro, Lora, serif'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClipSearch();
              }}
            />
            <button 
              onClick={() => handleClipSearch()}
              className="px-4 py-2.5 text-white rounded-r-lg focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: '#F2483C',
                fontFamily: 'Freight Text Pro, Lora, serif'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#D63C30'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#F2483C'}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Clip search results */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20">
        {clipSearchLoading ? (
          // Loading state
          <div className="p-12 flex justify-center">
            <div className="w-12 h-12 border-4 border-black/20 rounded-full animate-spin" style={{
              borderTopColor: '#F2483C'
            }}></div>
          </div>
        ) : clipSearchPerformed ? (
          clipResults.length === 0 ? (
            // No results state
            <div className="p-6 text-center text-black/60" style={{
              fontFamily: 'Freight Text Pro, Lora, serif'
            }}>
              No clips found matching your search keywords.
            </div>
          ) : (
            // Results display
            <div className="p-4">
              <h2 className="text-lg font-semibold text-black mb-4" style={{
                fontFamily: 'Freight Text Pro, Lora, serif'
              }}>
                Found {clipResults.length} clip{clipResults.length !== 1 ? 's' : ''}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clipResults.map((clip) => (
                  <div 
                    key={clip.id} 
                    className="bg-white/60 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer border border-white/40"
                    onClick={() => handleViewClip(clip.documentName, clip.id)}
                  >
                    {/* Clip thumbnail with timestamp overlay */}
                    <div className="relative pb-[56.25%] bg-black/10">
                      {clip.thumbnailUrl ? (
                        <img 
                          src={clip.thumbnailUrl} 
                          alt={clip.topic || clip.documentName} 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                        <span className="text-white text-xs font-medium font-mono">
                          {clip.timestamp}
                        </span>
                      </div>
                    </div>
                    {/* Clip metadata */}
                    <div className="p-4">
                      {/* Topic as clip title */}
                      <h3 className="text-base font-medium mb-1 line-clamp-1" style={{
                        color: '#F2483C',
                        fontFamily: 'Freight Text Pro, Lora, serif'
                      }}>
                        {clip.topic || "Untitled Clip"}
                      </h3>
                      
                      {/* Interviewee name */}
                      <p className="text-sm text-black/60 mb-2 font-mono tracking-wide">
                        {clip.personName}
                      </p>
                      
                      {/* Summary text */}
                      <p className="text-sm text-black/70 mb-3 line-clamp-2" style={{
                        fontFamily: 'Freight Text Pro, Lora, serif'
                      }}>
                        {clip.summary}
                      </p>
                      
                      {/* Keywords */}
                      <div className="flex flex-wrap gap-1">
                        {(clip.keywords || "").split(",").map((kw, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono tracking-wide"
                            style={{
                              backgroundColor: 'rgba(242, 72, 60, 0.1)',
                              color: '#F2483C'
                            }}
                          >
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          // Initial state - no search performed yet
          <div className="p-6 text-center text-black/60" style={{
            fontFamily: 'Freight Text Pro, Lora, serif'
          }}>
            Enter keywords above to search for relevant clips.
          </div>
        )}
      </div>
    </>
  );
}