import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { extractVideoId, parseKeywords } from "../utils/timeUtils";

const RelatedClips = ({ currentKeyword, excludeIds = [], onAddToPlaylist }) => {
  const [relatedClips, setRelatedClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentKeyword) {
      fetchRelatedClips(currentKeyword);
    }
  }, [currentKeyword, excludeIds.toString()]); // Added excludeIds as a dependency

  const fetchRelatedClips = async (keyword) => {
    try {
      setLoading(true);
      
      const keywordsArray = parseKeywords(keyword);
      if (keywordsArray.length === 0) {
        setRelatedClips([]);
        setLoading(false);
        return;
      }

      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));
      const results = [];

      for (const interviewDoc of interviewsSnapshot.docs) {
        const interviewId = interviewDoc.id;
        const interviewData = interviewDoc.data();
        
        // Extract the videoEmbedLink from the parent interview document
        const parentVideoEmbedLink = interviewData.videoEmbedLink;
        const parentThumbnailUrl = getThumbnailUrl(parentVideoEmbedLink);
        
        const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
        const querySnapshot = await getDocs(subSummariesRef);

        querySnapshot.forEach((docSnapshot) => {
          const subSummary = docSnapshot.data();
          const documentKeywords = (subSummary.keywords || "").split(",").map(k => k.trim().toLowerCase());
          const hasMatch = keywordsArray.some(kw => documentKeywords.includes(kw));
          
          if (hasMatch && !excludeIds.includes(docSnapshot.id)) {
            results.push({
              id: docSnapshot.id,
              documentId: `${interviewId}_${docSnapshot.id}`, // Create a truly unique ID
              documentName: interviewId,
              ...subSummary,
              ...interviewData,
              // Use the parent document's videoEmbedLink for the thumbnail
              thumbnailUrl: parentThumbnailUrl,
              _debug_parentVideoEmbedLink: parentVideoEmbedLink
            });
          }
        });
      }
      
      // Log how many thumbnails we have vs. how many clips
      const thumbnailCount = results.filter(r => r.thumbnailUrl).length;
      console.log(`Found thumbnails for ${thumbnailCount} out of ${results.length} clips`);
      
      // Remove any duplicates by using a unique composite key
      const uniqueResults = Array.from(new Map(
        results.map(item => [`${item.id}_${item.documentName}`, item])
      ).values());
      
      setRelatedClips(uniqueResults);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching related clips:", err);
      setError("Error loading related clips");
      setLoading(false);
    }
  };

  const getThumbnailUrl = (videoEmbedLink) => {
    if (!videoEmbedLink) return null;
    
    try {
      // First try the standard extraction
      let videoId = extractVideoId(videoEmbedLink);
      
      // If that fails, try additional parsing methods
      if (!videoId) {
        // Handle direct YouTube URLs
        if (videoEmbedLink.includes('youtube.com/watch')) {
          const url = new URL(videoEmbedLink);
          videoId = url.searchParams.get('v');
        } 
        // Handle YouTube embed URLs
        else if (videoEmbedLink.includes('youtube.com/embed/')) {
          const parts = videoEmbedLink.split('youtube.com/embed/');
          if (parts.length > 1) {
            videoId = parts[1].split('?')[0]; // Remove query parameters
          }
        }
        // Handle youtu.be short URLs
        else if (videoEmbedLink.includes('youtu.be/')) {
          const parts = videoEmbedLink.split('youtu.be/');
          if (parts.length > 1) {
            videoId = parts[1].split('?')[0]; // Remove query parameters
          }
        }
        // Handle iframe tags
        else if (videoEmbedLink.includes('<iframe') && videoEmbedLink.includes('src=')) {
          const srcMatch = videoEmbedLink.match(/src=["'](.*?)["']/);
          if (srcMatch && srcMatch[1]) {
            return getThumbnailUrl(srcMatch[1]); // Recursive call with the src URL
          }
        }
      }
      
      if (videoId) {
        // Use medium quality default thumbnail
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
      
      console.log("Could not extract video ID from:", videoEmbedLink);
    } catch (err) {
      console.error("Error extracting video ID for thumbnail:", err, "from link:", videoEmbedLink);
    }
    
    return null;
  };

  const handleClipClick = (clip) => {
    if (onAddToPlaylist) {
      onAddToPlaylist(clip);
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  if (relatedClips.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Related Clips
      </h3>
      
      <div className="overflow-x-auto pb-4">
        <div className="flex space-x-4" style={{ minWidth: 'min-content' }}>
          {relatedClips.map((clip, index) => (
            <div 
              // Use a combination of index, id, and documentName to ensure uniqueness
              key={`${clip.documentId || `${clip.id}_${clip.documentName}`}_${index}`}
              className="flex-shrink-0 w-64 bg-gray-50 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleClipClick(clip)}
            >
              {clip.thumbnailUrl ? (
                <div className="relative pb-[56.25%] bg-gray-200">
                  <img 
                    src={clip.thumbnailUrl} 
                    alt={clip.name || 'Video thumbnail'} 
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    onError={(e) => {
                      console.log("Thumbnail failed to load:", clip.thumbnailUrl);
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `
                        <div class="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-200">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      `;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center hover:bg-black hover:bg-opacity-30 transition-all">
                    <span className="text-white font-medium rounded-full p-2 bg-blue-600 opacity-0 hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-36 bg-gray-200 flex flex-col items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-500 text-sm">Video Preview</span>
                </div>
              )}
              
              <div className="p-3">
                <h4 className="font-medium text-gray-900 line-clamp-1" title={clip.name}>
                  {clip.name || 'Unnamed clip'}
                </h4>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1" title={clip.topic || ''}>
                  {clip.topic || 'No topic'}
                </p>
                {clip.timestamp && (
                  <p className="text-xs text-gray-400 mt-1">
                    {clip.timestamp}
                  </p>
                )}
                <button 
                  className="mt-2 w-full py-1 px-2 bg-blue-50 text-blue-600 text-sm font-medium rounded hover:bg-blue-100 transition-colors"
                >
                  Add to Playlist
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelatedClips;