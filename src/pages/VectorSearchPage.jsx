import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { vectorSearch } from '../services/embeddings';
import { enhanceSearchResults } from '../services/firebase';

/**
 * VectorSearchPage - Semantic search interface using vector embeddings
 * 
 * This component provides a semantic search interface that goes beyond
 * keyword matching to understand conceptual meaning in content.
 * 
 * @returns {React.ReactElement} The semantic search page
 */
export default function VectorSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

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

  // Note: fetchResultMetadata function is now handled by enhanceSearchResults from firebase service

  /**
   * Handles semantic search form submission
   * Generates embeddings for the query and performs vector similarity search
   * 
   * @param {React.FormEvent} e - Form submit event
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const searchResults = await vectorSearch(searchQuery, 20);
      const enhancedResults = await enhanceSearchResults(searchResults);
      setResults(enhancedResults);
    } catch (error) {
      console.error("Error during vector search:", error);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Navigates to the clip player for a specific result
   * 
   * @param {string} documentName - Document name identifier
   * @param {string} clipId - Clip/segment identifier
   */
  const navigateToClip = (documentName, clipId) => {
    navigate(`/clip-player?documentName=${encodeURIComponent(documentName)}&clipId=${encodeURIComponent(clipId)}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      <div className="w-full max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
          Semantic Search
        </h1>
        <p className="text-base leading-relaxed text-gray-600 mb-10 max-w-xxl mx-auto">
        Use natural language to search by concepts, themes, and meaning — not just keywords
        </p>
        
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <SearchIcon className="w-5 h-5 text-gray-500" />
            </div>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-12 pr-32 py-5 border border-gray-200 bg-white rounded-xl shadow-sm outline-none text-base text-gray-900 transition-all duration-300 focus:shadow-blue-300 focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-sm border-none cursor-pointer transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md disabled:opacity-70"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {isSearching ? (
        // Loading state
        <div className="p-12 flex justify-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : results.length > 0 ? (
        // Results display
        <div className="w-full">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => (
              <div 
                key={result.id} 
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigateToClip(result.documentId, result.segmentId)}
              >
                {/* Thumbnail with timestamp overlay */}
                <div className="relative pb-[56.25%] bg-gray-200">
                  {result.thumbnailUrl ? (
                    <img 
                      src={result.thumbnailUrl} 
                      alt={result.topic || result.documentId} 
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
                      {result.timestamp}
                    </span>
                  </div>
                </div>
                
                {/* Result metadata */}
                <div className="p-4">
                  {/* Topic as title */}
                  <h3 className="text-base font-medium text-blue-600 mb-1 line-clamp-1">
                    {result.topic || "Untitled Segment"}
                  </h3>
                  
                  {/* Interviewee name */}
                  <p className="text-sm text-gray-500 mb-2 font-medium">
                    {result.personName}
                  </p>
                  
                  {/* Summary text */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {result.summary}
                  </p>
                  
                  {/* Keywords */}
                  {result.keywords && (
                    <div className="flex flex-wrap gap-1">
                      {result.keywords.split(",").map((kw, i) => (
                        <span 
                          key={i} 
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"
                        >
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Similarity score */}
                  <div className="mt-2 text-xs text-gray-500">
                    {(result.similarity * 100).toFixed(1)}% match
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // No results state
        <div className="w-full max-w-4xl mx-auto text-center p-6 bg-white rounded-xl shadow-md">
          <p className="text-gray-500">
            {searchQuery ? 'No results found. Try different search terms.' : 'Enter a search query above to find relevant content.'}
          </p>
        </div>
      )}
    </div>
  );
} 