import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { vectorSearch } from '../services/embeddings';
import { collection, getDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * VectorSearchOverlay - Modal overlay for semantic search
 * 
 * Features:
 * - Dark backdrop overlay
 * - Red shadow effect on search box
 * - Chivo Mono font
 * - Semantic search with results
 * 
 * @param {boolean} isOpen - Whether the overlay is open
 * @param {function} onClose - Function to close the overlay
 * @returns {React.ReactElement} The search overlay modal
 */
export default function VectorSearchOverlay({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  // Animation and close handling
  useEffect(() => {
    if (isOpen) {
      // Prevent layout shift by preserving scrollbar space
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      // Restore original styles after animation
      setTimeout(() => {
        document.body.style.overflow = 'unset';
        document.body.style.paddingRight = '0px';
      }, 300);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match the transition duration
  };

  /**
   * Extracts YouTube video ID from various YouTube URL formats
   * 
   * @param {string} videoEmbedLink - YouTube URL
   * @returns {string|null} YouTube video ID or null if not valid
   */
  const extractVideoId = (videoEmbedLink) => {
    if (!videoEmbedLink) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const match = videoEmbedLink.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  /**
   * Fetches additional metadata for search results
   * 
   * @param {Array} searchResults - Results from vector search
   * @returns {Promise<Array>} Enhanced results with metadata
   */
  const fetchResultMetadata = async (searchResults) => {
    const enhancedResults = [];
    
    for (const result of searchResults) {
      try {
        const interviewDoc = await getDoc(doc(db, "interviewSummaries", result.documentId));
        const interviewData = interviewDoc.data();
        
        let segmentData = null;
        if (result.segmentId) {
          const segmentDoc = await getDoc(doc(db, "interviewSummaries", result.documentId, "subSummaries", result.segmentId));
          segmentData = segmentDoc.data();
        }
        
        const thumbnailUrl = interviewData.videoEmbedLink ?
          `https://img.youtube.com/vi/${extractVideoId(interviewData.videoEmbedLink)}/mqdefault.jpg` : null;
        
        enhancedResults.push({
          ...result,
          personName: interviewData.name || "Unknown",
          topic: segmentData?.topic || "Untitled Segment",
          timestamp: segmentData?.timestamp || "",
          summary: segmentData?.summary || result.textPreview,
          keywords: segmentData?.keywords || "",
          thumbnailUrl
        });
      } catch (error) {
        console.error(`Error fetching metadata for result ${result.id}:`, error);
        enhancedResults.push(result);
      }
    }
    
    return enhancedResults;
  };

  /**
   * Handles semantic search form submission
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const searchResults = await vectorSearch(searchQuery, 20);
      const enhancedResults = await fetchResultMetadata(searchResults);
      setResults(enhancedResults);
    } catch (error) {
      console.error("Error during vector search:", error);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Navigates to the clip player for a specific result
   */
  const navigateToClip = (documentName, clipId) => {
    navigate(`/clip-player?documentName=${encodeURIComponent(documentName)}&clipId=${encodeURIComponent(clipId)}`);
    handleClose();
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ease-out ${
      isAnimating ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Dark backdrop */}
      <div 
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          isAnimating 
            ? 'backdrop-blur-sm backdrop-brightness-75 opacity-100' 
            : 'backdrop-blur-none backdrop-brightness-100 opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal content - expands when results are shown */}
      <div className={`relative w-full ${results.length > 0 ? 'max-w-7xl' : 'max-w-4xl'} mx-4 max-h-[95vh] bg-white rounded-2xl shadow-2xl overflow-hidden font-mono transition-all duration-500 ease-out ${
        isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
      }`}>
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Search header */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            Semantic Search
          </h2>
          
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              {/* Search input with red shadow effect */}
              <div className="relative">
                {/* Red shadow element */}
                <div className="absolute inset-0 bg-red-500 rounded-lg transform translate-x-1 translate-y-1 opacity-70"></div>
                
                {/* Main input container */}
                <div className="relative bg-white border-2 border-black rounded-lg">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-gray-500" />
                  </div>
                  
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by concepts, themes, and meaning..."
                    className="w-full pl-12 pr-32 py-4 text-base text-gray-900 bg-transparent focus:outline-none font-mono"
                    autoFocus
                  />
                  
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-black text-white font-mono rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Results section */}
        <div className="flex-1 overflow-y-auto max-h-[75vh] p-8">
          {isSearching ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
            </div>
          ) : results.length > 0 ? (
            <div>
              {/* Results header */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  <span className="text-red-500">{results.length.toString().padStart(2, '0')}</span> Interviews
                </h3>
                <p className="text-gray-600">
                  Search Results for "{searchQuery}"
                </p>
              </div>

              {/* Interview grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {results.map((result) => (
                  <div 
                    key={result.id} 
                    className="group cursor-pointer transition-all duration-200 hover:transform hover:scale-105"
                    onClick={() => navigateToClip(result.documentId, result.segmentId)}
                  >
                    {/* Large thumbnail */}
                    <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden mb-4 shadow-lg">
                      {result.thumbnailUrl ? (
                        <img 
                          src={result.thumbnailUrl} 
                          alt={result.personName || result.documentId} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                          <svg className="h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Timestamp overlay - only visible on hover */}
                      {result.timestamp && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="text-white text-sm font-mono">
                            {result.timestamp}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Interview info */}
                    <div className="text-center">
                      <h4 className="text-lg font-bold text-gray-900 mb-1">
                        {result.personName || "Unknown"}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Activist, Educator
                      </p>
                      
                      {/* Topic/segment info */}
                      {result.topic && (
                        <p className="text-xs text-blue-600 font-semibold mb-2">
                          {result.topic}
                        </p>
                      )}
                      
                      {/* Match score */}
                      <div className="text-xs text-gray-500 font-mono">
                        {(result.similarity * 100).toFixed(1)}% match
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Related Topics section */}
              {results.length > 0 && (
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    <span className="text-red-500">{Math.min(8, results.length).toString().padStart(2, '0')}</span> Related Topics
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(new Set(
                      results.flatMap(result => 
                        result.keywords ? result.keywords.split(",").map(kw => kw.trim()) : []
                      )
                    )).slice(0, 8).map((keyword, i) => (
                      <button
                        key={i}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 font-mono">
                {searchQuery ? 'No results found. Try different search terms.' : 'Enter a search query to find relevant content.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 