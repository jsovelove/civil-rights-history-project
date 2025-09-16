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
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ease-out ${
      isAnimating ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          isAnimating 
            ? 'backdrop-blur-sm backdrop-brightness-75 opacity-100' 
            : 'backdrop-blur-none backdrop-brightness-100 opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Main overlay content */}
      <div className={`w-full h-full relative overflow-hidden transition-all duration-500 ease-out ${
        isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
      }`} style={{ backgroundColor: '#EBEAE9' }}>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-12 z-10 w-12 h-12 flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <div className="w-6 h-6 outline outline-2 outline-offset-[-1px] outline-black">
            <X size={24} strokeWidth={2} />
          </div>
        </button>

        {/* Title */}
        <div className="w-full h-20 absolute left-12 top-9">
          <div className="text-stone-900 text-6xl font-normal leading-[66.46px]" style={{ fontFamily: 'Source Serif 4, serif' }}>
            <span className="font-normal">Civil Rights </span>
            <span className="font-bold tracking-[2.56px]">History</span>
            <span className="font-bold"> Project</span>
          </div>
        </div>

        {/* Search section */}
        <div className="w-[1632px] h-14 absolute left-12" style={{ top: '156px' }}>
          <form onSubmit={handleSearch} className="w-full h-full flex">
            {/* Search input */}
            <div className="w-[1512px] h-14 relative border-l border-t border-b border-stone-900 bg-white">
              {/* Search label - only show when input is empty */}
              {!searchQuery && (
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-black text-2xl font-light font-['Inter'] pointer-events-none">
                  Search
                </div>
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder=""
                className="w-full h-full px-6 text-black text-2xl font-light font-['Inter'] bg-transparent border-none outline-none placeholder-gray-400 flex items-center"
                style={{ lineHeight: '56px' }}
                autoFocus
              />
            </div>
            
            {/* Search button */}
            <button
              type="submit"
              disabled={isSearching}
              className="w-14 h-14 p-1.5 outline outline-1 outline-offset-[-1px] outline-stone-900 inline-flex justify-center items-center bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 relative flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-black relative">
                  <div className="w-2.5 h-0.5 bg-black absolute -bottom-1 -right-1 rotate-45 origin-left"></div>
                </div>
              </div>
            </button>
          </form>
        </div>

        {/* Topic suggestion tags */}
        {!isSearching && results.length === 0 && (
          <div className="absolute left-12" style={{ top: '240px' }}>
            <div className="flex flex-wrap gap-4 items-center">
              <div 
                className="px-6 py-3 rounded-[50px] outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setSearchQuery('Desegregation');
                  handleSearch({ preventDefault: () => {} });
                }}
              >
                <div className="text-center text-black text-base font-light font-['Chivo_Mono']">Desegregation</div>
              </div>
              <div 
                className="px-6 py-3 rounded-[50px] outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setSearchQuery('Little Rock Nine');
                  handleSearch({ preventDefault: () => {} });
                }}
              >
                <div className="text-center text-black text-base font-light font-['Chivo_Mono']">Little Rock Nine</div>
              </div>
              <div 
                className="px-6 py-3 rounded-[50px] outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setSearchQuery('Black Panther Party');
                  handleSearch({ preventDefault: () => {} });
                }}
              >
                <div className="text-center text-black text-base font-light font-['Chivo_Mono']">Black Panther Party</div>
              </div>
              <div 
                className="px-6 py-3 rounded-[50px] outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setSearchQuery('Student Nonviolent Coordinating Committee');
                  handleSearch({ preventDefault: () => {} });
                }}
              >
                <div className="text-center text-black text-base font-light font-['Chivo_Mono']">Student Nonviolent Coordinating Committee</div>
              </div>
              <div 
                className="inline-flex justify-start items-center gap-2.5 ml-8 cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => navigate('/topic-glossary')}
              >
                <div className="text-center text-stone-900 text-base font-light font-['Chivo_Mono']">See Topic Glossary</div>
                <div className="w-3.5 h-2.5 outline outline-1 outline-offset-[-0.50px] outline-stone-900"></div>
              </div>
            </div>
          </div>
        )}

        {/* Results section */}
        {(isSearching || results.length > 0) && (
          <div className="absolute left-12 right-12 bottom-12 overflow-y-auto" style={{ top: '320px' }}>
            {isSearching ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              </div>
            ) : results.length > 0 ? (
              <div>
                {/* Results header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 font-['Inter']">
                    <span className="text-red-500">{results.length.toString().padStart(2, '0')}</span> Interviews
                  </h3>
                  <p className="text-gray-600 font-['Chivo_Mono']">
                    Search Results for "{searchQuery}"
                  </p>
                </div>

                {/* Interview grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {results.map((result) => (
                    <div 
                      key={result.id} 
                      className="group cursor-pointer transition-all duration-200 hover:transform hover:scale-105 bg-white outline outline-1 outline-black"
                      onClick={() => navigateToClip(result.documentId, result.segmentId)}
                    >
                      {/* Large thumbnail */}
                      <div className="relative w-full h-64 bg-gray-300 overflow-hidden">
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
                            <span className="text-white text-sm font-['Chivo_Mono']">
                              {result.timestamp}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Interview info */}
                      <div className="p-4 text-center">
                        <h4 className="text-lg font-bold text-gray-900 mb-1 font-['Inter']">
                          {result.personName || "Unknown"}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2 font-['Chivo_Mono']">
                          Activist, Educator
                        </p>
                        
                        {/* Topic/segment info */}
                        {result.topic && (
                          <p className="text-xs text-blue-600 font-semibold mb-2 font-['Chivo_Mono']">
                            {result.topic}
                          </p>
                        )}
                        
                        {/* Match score */}
                        <div className="text-xs text-gray-500 font-['Chivo_Mono']">
                          {(result.similarity * 100).toFixed(1)}% match
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Related Topics section */}
                {results.length > 0 && (
                  <div className="border-t border-gray-900 pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 font-['Inter']">
                      <span className="text-red-500">{Math.min(8, results.length).toString().padStart(2, '0')}</span> Related Topics
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {Array.from(new Set(
                        results.flatMap(result => 
                          result.keywords ? result.keywords.split(",").map(kw => kw.trim()) : []
                        )
                      )).slice(0, 8).map((keyword, i) => (
                        <div
                          key={i}
                          className="px-6 py-3 rounded-[50px] outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery(keyword);
                            handleSearch(e);
                          }}
                        >
                          <div className="text-center text-black text-base font-light font-['Chivo_Mono']">
                            {keyword}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
} 