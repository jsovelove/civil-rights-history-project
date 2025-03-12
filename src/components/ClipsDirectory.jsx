import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DirectoryCacheContext } from '../pages/ContentDirectory';

export default function ClipsDirectory({ initialSearchTerm = '' }) {
  const [clipSearchTerm, setClipSearchTerm] = useState(initialSearchTerm);
  const [clipResults, setClipResults] = useState([]);
  const [clipSearchLoading, setClipSearchLoading] = useState(false);
  const [clipSearchPerformed, setClipSearchPerformed] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Get cache context
  const { getSearchFromCache, addSearchToCache } = useContext(DirectoryCacheContext);

  // Track when the initialSearchTerm changes to perform a search
  useEffect(() => {
    if (initialSearchTerm) {
      setClipSearchTerm(initialSearchTerm);
      handleClipSearch(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const handleClipSearch = async (searchTermToUse = clipSearchTerm) => {
    if (!searchTermToUse.trim()) {
      setClipResults([]);
      setClipSearchPerformed(false);
      return;
    }

    setClipSearchPerformed(true);
    
    // Check cache for this search term
    const cachedResults = getSearchFromCache('clips', searchTermToUse);
    
    if (cachedResults) {
      console.log('Using cached clip search results');
      setClipResults(cachedResults);
      return;
    }
    
    // If not in cache, perform the search
    setClipSearchLoading(true);
    
    try {
      const keywordsArray = searchTermToUse.split(',').map(kw => kw.trim().toLowerCase());
      const results = await fetchRelevantSegments(keywordsArray);
      
      setClipResults(results);
      
      // Cache the search results
      addSearchToCache('clips', searchTermToUse, results);
    } catch (error) {
      console.error("Error searching for clips:", error);
      setError("Failed to search for clips");
    } finally {
      setClipSearchLoading(false);
    }
  };

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
      
      const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
      const querySnapshot = await getDocs(subSummariesRef);
      
      querySnapshot.forEach((docSnapshot) => {
        const subSummary = docSnapshot.data();
        const documentKeywords = (subSummary.keywords || "").split(",").map(k => k.trim().toLowerCase());
        const hasMatch = keywordsArray.some(kw => documentKeywords.includes(kw));
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

  const extractVideoId = (videoEmbedLink) => {
    if (!videoEmbedLink) return null;
    
    // Handle YouTube embed links
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const match = videoEmbedLink.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleViewClip = (documentName, clipId) => {
    navigate(`/clip-player?documentName=${encodeURIComponent(documentName)}&clipId=${encodeURIComponent(clipId)}`);
  };

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
      {/* Search clips */}
      <div className="mb-6">
        <div className="max-w-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Clips by Keywords
          </label>
          <div className="flex">
            <input
              type="text"
              placeholder="Enter keywords (comma separated)..."
              value={clipSearchTerm}
              onChange={(e) => setClipSearchTerm(e.target.value)}
              className="flex-grow px-4 py-2.5 border border-gray-300 rounded-l-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClipSearch();
              }}
            />
            <button 
              onClick={() => handleClipSearch()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Clip search results */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {clipSearchLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : clipSearchPerformed ? (
          clipResults.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No clips found matching your search keywords.
            </div>
          ) : (
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Found {clipResults.length} clip{clipResults.length !== 1 ? 's' : ''}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clipResults.map((clip) => (
                  <div 
                    key={clip.id} 
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
                    <div className="p-4">
                      {/* Topic as clip title */}
                      <h3 className="text-base font-medium text-blue-600 mb-1 line-clamp-1">
                        {clip.topic || "Untitled Clip"}
                      </h3>
                      
                      {/* Interviewee name */}
                      <p className="text-sm text-gray-500 mb-2 font-medium">
                        {clip.personName}
                      </p>
                      
                      {/* Summary text */}
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {clip.summary}
                      </p>
                      
                      {/* Keywords */}
                      <div className="flex flex-wrap gap-1">
                        {(clip.keywords || "").split(",").map((kw, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"
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
          <div className="p-6 text-center text-gray-500">
            Enter keywords above to search for relevant clips.
          </div>
        )}
      </div>
    </>
  );
}