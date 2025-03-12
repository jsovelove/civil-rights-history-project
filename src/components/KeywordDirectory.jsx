import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DirectoryCacheContext } from '../pages/ContentDirectory';

export default function KeywordDirectory({ onViewAllClips }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keywordData, setKeywordData] = useState([]);
  const [expandedKeyword, setExpandedKeyword] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredKeywords, setFilteredKeywords] = useState([]);
  const navigate = useNavigate();

  // Get cache context
  const { cache, updateCache, addSearchToCache, getSearchFromCache } = useContext(DirectoryCacheContext);

  // Initialize data from cache or fetch new data
  useEffect(() => {
    if (cache.keywords) {
      console.log('Using cached keyword data');
      setKeywordData(cache.keywords);
      setLoading(false);
    } else {
      fetchAndProcessKeywords();
    }
  }, [cache.keywords]);

  // Update filtered keywords when search term changes
  useEffect(() => {
    if (searchTerm) {
      // Check if this search is cached
      const cachedResults = getSearchFromCache('keywords', searchTerm);
      
      if (cachedResults) {
        console.log('Using cached keyword search results');
        setFilteredKeywords(cachedResults);
      } else {
        // Filter keywords based on search term
        const filtered = keywordData.filter(item => 
          item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredKeywords(filtered);
        
        // Cache the search results
        addSearchToCache('keywords', searchTerm, filtered);
      }
    } else {
      setFilteredKeywords(keywordData);
    }
  }, [searchTerm, keywordData]);

  const fetchAndProcessKeywords = async () => {
    try {
      setLoading(true);
      const keywordCounts = {};
      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));

      // Process interviews
      for (const interviewDoc of interviewsSnapshot.docs) {
        const interviewId = interviewDoc.id;
        const interviewData = interviewDoc.data();
        const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
        const subSummariesSnapshot = await getDocs(subSummariesRef);

        subSummariesSnapshot.forEach((doc) => {
          const subSummary = doc.data();
          if (subSummary.keywords) {
            const keywords = subSummary.keywords.split(",").map(kw => kw.trim().toLowerCase());
            keywords.forEach(keyword => {
              if (!keywordCounts[keyword]) {
                keywordCounts[keyword] = { count: 0, summaries: [] };
              }
              keywordCounts[keyword].count++;
              
              // Add parent interview data for thumbnails and person name
              const enrichedSummary = {
                ...subSummary,
                id: doc.id,
                documentName: interviewId,
                videoEmbedLink: interviewData.videoEmbedLink,
                personName: interviewData.name || "Unknown", // Add person name from parent
                thumbnailUrl: interviewData.videoEmbedLink ? 
                  `https://img.youtube.com/vi/${extractVideoId(interviewData.videoEmbedLink)}/mqdefault.jpg` : 
                  null
              };
              
              keywordCounts[keyword].summaries.push(enrichedSummary);
            });
          }
        });
      }

      // Transform data for display and filter out keywords with only 1 clip
      const processedData = Object.entries(keywordCounts)
        .filter(([_, details]) => details.count > 1) // Filter out keywords with only 1 occurrence
        .map(([keyword, details]) => {
          let totalLengthSeconds = 0;
          details.summaries.forEach(subSummary => {
            if (subSummary.timestamp && subSummary.timestamp.includes(" - ")) {
              const start = extractStartTimestamp(subSummary.timestamp);
              const end = extractStartTimestamp(subSummary.timestamp.split(" - ")[1]);
              totalLengthSeconds += Math.max(0, convertTimestampToSeconds(end) - convertTimestampToSeconds(start));
            }
          });
          return {
            keyword,
            count: details.count,
            totalLengthSeconds,
            summaries: details.summaries
          };
        })
        .sort((a, b) => b.count - a.count);

      setKeywordData(processedData);
      setFilteredKeywords(processedData);
      
      // Store in cache
      updateCache('keywords', processedData);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching keywords:", error);
      setError("Failed to load keyword data");
      setLoading(false);
    }
  };

  const extractVideoId = (videoEmbedLink) => {
    if (!videoEmbedLink) return null;
    
    // Handle YouTube embed links
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const match = videoEmbedLink.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const extractStartTimestamp = (rawTimestamp) => {
    const match = rawTimestamp.match(/(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)/);
    return match ? match[1] : "00:00";
  };

  const convertTimestampToSeconds = (timestamp) => {
    const parts = timestamp.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const toggleKeyword = (keyword) => {
    if (expandedKeyword === keyword) {
      setExpandedKeyword(null);
    } else {
      setExpandedKeyword(keyword);
    }
  };

  const handleViewPlaylist = (keyword) => {
    navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`);
  };
  
  const handleEditPlaylist = (keyword) => {
    navigate(`/playlist-editor?keywords=${encodeURIComponent(keyword)}`);
  };

  const handleViewClip = (documentName, clipId) => {
    navigate(`/clip-player?documentName=${encodeURIComponent(documentName)}&clipId=${encodeURIComponent(clipId)}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50">
        <div className="bg-red-100 border border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search filter */}
      <div className="mb-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter Keywords
          </label>
          <input
            type="text"
            placeholder="Type to filter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Keywords list */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {filteredKeywords.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No keywords found matching your search.
          </div>
        ) : (
          <ul className="list-none m-0 p-0 border-t border-gray-100">
            {filteredKeywords.map((item) => (
              <li 
                key={item.keyword} 
                className="border-b border-gray-100 transition-colors hover:bg-gray-50"
              >
                <div className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 
                        className="text-lg font-semibold text-blue-600 mb-2 cursor-pointer transition-colors hover:text-blue-800"
                        onClick={() => toggleKeyword(item.keyword)}
                      >
                        {item.keyword}
                      </h3>
                      <div className="my-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                          {item.count} clips
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                          {formatTime(item.totalLengthSeconds)} total length
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewPlaylist(item.keyword)}
                        className="inline-flex items-center px-3 py-2 border-0 rounded-md bg-blue-600 text-white text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Play
                      </button>
                      <button
                        onClick={() => handleEditPlaylist(item.keyword)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-600 text-sm font-medium cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Expanded content with clip thumbnails */}
                  {expandedKeyword === item.keyword && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-base font-medium text-gray-600">
                          Clips with this keyword:
                        </h4>
                        <button
                          onClick={() => onViewAllClips(item.keyword)}
                          className="text-blue-600 text-sm font-medium flex items-center hover:text-blue-800"
                        >
                          View all {item.count} clips
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Grid of clip thumbnails */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {item.summaries.slice(0, 6).map((clip, idx) => (
                          <div 
                            key={idx} 
                            className="bg-gray-50 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleViewClip(clip.documentName, clip.id)}
                          >
                            <div className="relative pb-[56.25%] bg-gray-200">
                              {clip.thumbnailUrl ? (
                                <img 
                                  src={clip.thumbnailUrl} 
                                  alt={clip.topic || clip.documentName} 
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                                <span className="text-white text-xs font-medium">
                                  {clip.timestamp}
                                </span>
                              </div>
                            </div>
                            <div className="p-3">
                              {/* Topic as clip title */}
                              <h4 className="text-sm font-medium text-blue-600 mb-1 line-clamp-1">
                                {clip.topic || "Untitled Clip"}
                              </h4>
                              
                              {/* Interviewee name */}
                              <p className="text-xs text-gray-500 mb-2">
                                {clip.personName}
                              </p>
                              
                              {/* Summary */}
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {clip.summary}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* View all clips button (centered, for small screens) */}
                      <div className="md:hidden mt-4 text-center">
                        <button
                          onClick={() => onViewAllClips(item.keyword)}
                          className="inline-flex items-center px-4 py-2 border-0 rounded-md bg-blue-600 text-white text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700"
                        >
                          View all {item.count} clips
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
  
  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}