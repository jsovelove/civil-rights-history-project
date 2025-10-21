import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { searchClipsByTopic } from '../services/embeddings';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  const [topicDefinition, setTopicDefinition] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [topicsCache, setTopicsCache] = useState([]);
  const navigate = useNavigate();

  // Load topics for autocomplete when overlay opens
  useEffect(() => {
    if (isOpen && topicsCache.length === 0) {
      fetchTopicsForAutocomplete();
    }
  }, [isOpen]);

  /**
   * Fetches topics from events_and_topics collection for autocomplete
   */
  const fetchTopicsForAutocomplete = async () => {
    try {
      const eventsAndTopicsCollection = collection(db, 'events_and_topics');
      const eventsSnapshot = await getDocs(eventsAndTopicsCollection);
      
      const topics = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          keyword: data.eventTopic || doc.id,
          description: data.description || data.updatedLongDescription || '',
          category: data.aiCuration?.category || 'other',
          importanceScore: data.aiCuration?.importanceScore || 5
        };
      });

      // Sort by importance score, then alphabetically
      topics.sort((a, b) => {
        if (b.importanceScore !== a.importanceScore) {
          return b.importanceScore - a.importanceScore;
        }
        return a.keyword.localeCompare(b.keyword);
      });

      setTopicsCache(topics);
    } catch (error) {
      console.error("Error fetching topics for autocomplete:", error);
    }
  };

  /**
   * Filters topics based on search query and returns suggestions
   */
  const getSuggestions = (query) => {
    if (!query.trim() || topicsCache.length === 0) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    return topicsCache
      .filter(topic => 
        topic.keyword.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 8); // Limit to 8 suggestions
  };

  /**
   * Handles input change and updates suggestions
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim()) {
      const newSuggestions = getSuggestions(value);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  /**
   * Handles keyboard navigation in autocomplete
   */
  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  /**
   * Handles suggestion selection
   */
  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.keyword);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Trigger search with the selected suggestion
    setTimeout(() => {
      handleSearch({ preventDefault: () => {} });
    }, 100);
  };

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

  // Close on Escape key and handle clicks outside suggestions
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showSuggestions) {
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        } else {
          handleClose();
        }
      }
    };

    const handleClickOutside = (e) => {
      // Close suggestions if clicking outside the search area
      if (showSuggestions && !e.target.closest('.search-container')) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showSuggestions]);

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
   * Fetches topic definition from events_and_topics collection
   * 
   * @param {string} topicName - The topic to search for
   * @returns {Promise<string>} Topic definition or fallback text
   */
  const fetchTopicDefinition = async (topicName) => {
    try {
      const eventsAndTopicsRef = collection(db, 'events_and_topics');
      
      // Try exact match first (case-insensitive)
      const exactQuery = query(eventsAndTopicsRef, where('eventTopic', '==', topicName));
      let snapshot = await getDocs(exactQuery);
      
      if (snapshot.empty) {
        // Try case-insensitive search by converting to lowercase
        const allDocsSnapshot = await getDocs(eventsAndTopicsRef);
        const matchingDoc = allDocsSnapshot.docs.find(doc => {
          const data = doc.data();
          const eventTopic = data.eventTopic || doc.id;
          return eventTopic.toLowerCase() === topicName.toLowerCase();
        });
        
        if (matchingDoc) {
          const data = matchingDoc.data();
          return data.description || data.updatedLongDescription || 
            `${topicName} is a significant topic in the Civil Rights Movement. Explore interviews and stories from activists who experienced and shaped this important aspect of history.`;
        }
      } else {
        const doc = snapshot.docs[0];
        const data = doc.data();
        return data.description || data.updatedLongDescription || 
          `${topicName} is a significant topic in the Civil Rights Movement. Explore interviews and stories from activists who experienced and shaped this important aspect of history.`;
      }
      
      // Fallback if no match found
      return `${topicName} is a significant topic in the Civil Rights Movement. Explore interviews and stories from activists who experienced and shaped this important aspect of history.`;
      
    } catch (error) {
      console.error('Error fetching topic definition:', error);
      return `${topicName} is a significant topic in the Civil Rights Movement. Explore interviews and stories from activists who experienced and shaped this important aspect of history.`;
    }
  };

  /**
   * Handles semantic search form submission using enhanced clip search
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setTopicDefinition(''); // Clear previous definition
    try {
      // Fetch topic definition and search results in parallel
      const [clipResults, definition] = await Promise.all([
        searchClipsByTopic(searchQuery, { limit: 20 }),
        fetchTopicDefinition(searchQuery)
      ]);
      
      // Set the topic definition
      setTopicDefinition(definition);
      
      // Transform results to match expected format for display
      const enhancedResults = clipResults.map((clip) => {
        // Generate thumbnail URL from video embed link if available
        let thumbnailUrl = clip.thumbnailUrl;
        if (!thumbnailUrl && clip.videoEmbedLink) {
          const videoId = extractVideoId(clip.videoEmbedLink);
          thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
          console.log(`Generated thumbnail for ${clip.interviewName}:`, thumbnailUrl);
        } else if (clip.videoEmbedLink) {
          console.log(`Video link available for ${clip.interviewName}:`, clip.videoEmbedLink);
        } else {
          console.log(`No video link for ${clip.interviewName}`);
        }
        
        return {
          id: clip.id || `${clip.documentId}-${clip.segmentId}`,
          documentId: clip.documentId,
          segmentId: clip.segmentId,
          personName: clip.interviewName,
          clipTitle: clip.topic || clip.displayTitle || 'Untitled Segment', // Use clip topic as title
          timestamp: clip.timestamp,
          summary: clip.textPreview || clip.summary,
          keywords: clip.keywordsArray ? clip.keywordsArray.join(', ') : '',
          similarity: clip.topicRelevance || clip.similarity,
          thumbnailUrl,
          
          // Enhanced metadata from our new system
          role: clip.interviewRole,
          mainTopicCategory: clip.mainTopicCategory,
          relatedEvents: clip.relatedEvents || [],
          notableQuotes: clip.notableQuotes || [],
          hasQuotes: clip.hasQuotes,
          hasEvents: clip.hasEvents
        };
      });

      // Remove duplicates based on documentId + segmentId combination
      const uniqueResults = enhancedResults.filter((result, index, self) => 
        index === self.findIndex(r => 
          r.documentId === result.documentId && r.segmentId === result.segmentId
        )
      );
      
      setResults(uniqueResults);
    } catch (error) {
      console.error("Error during enhanced clip search:", error);
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
        
        {/* Conditional Header - Standard header when results are loaded */}
        {(isSearching || results.length > 0) ? (
          /* Standard Universal Header */
          <header className="relative" style={{ backgroundColor: '#EBEAE9' }}>
            <div className="w-full px-4 sm:px-8 lg:px-12 py-6 lg:py-9">
              <div className="flex justify-between items-start">
                {/* Logo/Title */}
                <div className="cursor-pointer" onClick={handleClose}>
                  <div style={{ fontFamily: 'Source Serif 4, serif' }}>
                    <span className="text-stone-900 text-4xl font-normal">Civil Rights </span>
                    <br />
                    <span className="text-stone-900 text-4xl font-bold leading-9">History Project</span>
                  </div>
                </div>

                {/* Close button in header style */}
                <button
                  onClick={handleClose}
                  className="p-1 text-black hover:opacity-70 transition-opacity"
                >
                  <X size={18} className="lg:w-6 lg:h-6" />
                </button>
              </div>
            </div>
          </header>
        ) : (
          /* Original Large Title Layout for Empty State */
          <>
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-12 z-10 w-12 h-12 flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <div className="w-6 h-6 outline outline-2 outline-offset-[-1px] outline-black">
                <X size={24} strokeWidth={2} />
              </div>
            </button>

            {/* Large Title */}
            <div className="w-full h-20 absolute left-12 top-9">
              <div className="text-stone-900 text-6xl font-normal leading-[66.46px]" style={{ fontFamily: 'Source Serif 4, serif' }}>
                <span className="font-normal">Civil Rights </span>
                <span className="font-bold tracking-[2.56px]">History</span>
                <span className="font-bold"> Project</span>
              </div>
            </div>
          </>
        )}

        {/* Search section - positioned differently based on header state */}
        <div className={`max-w-[1632px] w-full h-14 ${
          (isSearching || results.length > 0) 
            ? 'absolute left-0 right-0 px-12' // Full width below standard header with padding
            : 'absolute left-12' // Original position for large title layout, no padding
        }`} style={{ 
          top: (isSearching || results.length > 0) ? '140px' : '156px' 
        }}>
          <form onSubmit={handleSearch} className="w-full h-full flex max-w-[1632px] search-container">
            {/* Search input */}
            <div className="flex-1 h-14 relative border-l border-t border-b border-stone-900 bg-white">
              {/* Search label - only show when input is empty */}
              {!searchQuery && (
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-black text-2xl font-light font-['Inter'] pointer-events-none">
                  Search
                </div>
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder=""
                className="w-full h-full px-6 text-black text-2xl font-light font-['Inter'] bg-transparent border-none outline-none placeholder-gray-400 flex items-center"
                style={{ lineHeight: '56px' }}
                autoFocus
              />
              
              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border-l border-r border-b border-stone-900 z-10 max-h-80 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.id}
                      className={`px-6 py-3 cursor-pointer transition-colors border-b border-gray-200 last:border-b-0 ${
                        index === selectedSuggestionIndex 
                          ? 'bg-gray-100' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => selectSuggestion(suggestion)}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    >
                      <div className="text-black text-2xl font-light font-['Inter']">
                        {suggestion.keyword}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        {/* Results section - New Figma-based layout */}
        {(isSearching || results.length > 0) && (
          <div className="absolute left-0 right-0 bottom-0 overflow-y-auto" style={{ 
            top: '220px',
            backgroundColor: '#EBEAE9'
          }}>
            {isSearching ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="px-12 pb-12">
                {/* Search Term Section */}
                <div className="w-full mb-12">
                  <div className="w-full inline-flex flex-col justify-start items-start gap-6">
                    {/* Divider line and search results count */}
                    <div className="w-full h-8 relative">
                      <div className="w-full h-0 left-0 top-[31px] absolute outline outline-1 outline-offset-[-0.50px] outline-black" />
                      <div className="w-full h-5 left-0 top-0 absolute">
                        <div className="justify-start text-red-500 text-base font-light font-['Chivo_Mono']">
                          {results.length} search results for "{searchQuery}"
                        </div>
                      </div>
                    </div>
                    
                    {/* Search term title and definition */}
                    <div className="w-full flex justify-between items-start gap-12">
                      {/* Large search term title */}
                      <div className="flex-1">
                        <div className="justify-start text-black text-8xl font-medium font-['Acumin_Pro']">
                          {searchQuery}
                        </div>
                      </div>
                      
                      {/* Definition section */}
                      <div className="w-[765px]">
                        <div className="justify-start text-stone-900 text-3xl font-medium font-['FreightText_Pro']">
                          {topicDefinition || `${searchQuery} is a significant topic in the Civil Rights Movement. Explore interviews and stories from activists who experienced and shaped this important aspect of history.`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Watch Related Interviews Button */}
                <div className="w-full mb-12">
                  <div 
                    className="inline-flex justify-start items-center gap-2.5 mb-8 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => {
                      navigate(`/playlist-builder?keywords=${encodeURIComponent(searchQuery)}`);
                      handleClose();
                    }}
                  >
                    <div className="text-center justify-start text-stone-900 text-xl font-light font-['Chivo_Mono']">
                      Watch Related Interviews
                    </div>
                    <div className="w-3.5 h-2.5 outline outline-1 outline-offset-[-0.50px] outline-stone-900" />
                  </div>
                </div>

                {/* Interviews Section */}
                <div className="w-full mb-12">
                  <div className="w-full inline-flex flex-col justify-start items-start gap-6">
                    {/* Section divider and title */}
                    <div className="w-full h-8 relative">
                      <div className="w-full h-0 left-0 top-[31px] absolute outline outline-1 outline-offset-[-0.50px] outline-black" />
                    </div>
                    <div className="justify-start">
                      <span className="text-red-500 text-8xl font-medium font-['Acumin_Pro']">
                        {results.length.toString().padStart(2, '0')}
                      </span>
                      <span className="text-black text-8xl font-medium font-['Acumin_Pro']"> Interviews</span>
                    </div>
                  </div>

                  {/* Interview grid - 3 columns */}
                  <div className="grid grid-cols-3 gap-8 mt-12">
                    {results.map((result) => (
                      <div 
                        key={result.id} 
                        className="group cursor-pointer hover:opacity-90 transition-opacity duration-200"
                        onClick={() => navigateToClip(result.documentId, result.segmentId)}
                      >
                        <div className="flex flex-col gap-4">
                          {/* Interview thumbnail */}
                          <div className="w-full aspect-[4/3] bg-zinc-300 relative overflow-hidden">
                            {result.thumbnailUrl ? (
                              <img 
                                src={result.thumbnailUrl} 
                                alt={result.personName || result.documentId} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                                <svg className="h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          {/* Interview info - Clean spacing */}
                          <div className="flex flex-col gap-2">
                            {/* Speaker name */}
                            <h3 className="text-stone-900 text-2xl font-bold leading-tight" style={{ fontFamily: 'Source Serif 4, serif' }}>
                              {result.personName || "Unknown Speaker"}
                            </h3>
                            
                            {/* Clip title and duration */}
                            <p className="text-stone-900 text-sm font-light font-['Chivo_Mono'] leading-relaxed">
                              {result.clipTitle || "Untitled Segment"} | {result.timestamp || "Duration Unknown"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related Topics Section */}
                <div className="w-full">
                  <div className="w-full inline-flex flex-col justify-start items-start gap-6">
                    {/* Section divider and title */}
                    <div className="w-full h-8 relative">
                      <div className="w-full h-0 left-0 top-[31px] absolute outline outline-1 outline-offset-[-0.50px] outline-black" />
                    </div>
                    <div className="justify-start">
                      <span className="text-red-500 text-8xl font-medium font-['Acumin_Pro']">
                        {Math.min(21, Array.from(new Set([
                          ...results.flatMap(result => 
                            result.keywords ? result.keywords.split(",").map(kw => kw.trim()) : []
                          ),
                          ...results.flatMap(result => result.relatedEvents || []),
                          ...results.map(result => result.mainTopicCategory).filter(Boolean)
                        ])).length).toString().padStart(2, '0')}
                      </span>
                      <span className="text-black text-8xl font-medium font-['Acumin_Pro']"> Related Topics</span>
                    </div>
                  </div>

                  {/* Related topics tag cloud */}
                  <div className="w-full mt-8">
                    <div className="flex flex-wrap gap-4">
                      {Array.from(new Set([
                        ...results.flatMap(result => 
                          result.keywords ? result.keywords.split(",").map(kw => kw.trim()) : []
                        ),
                        ...results.flatMap(result => result.relatedEvents || []),
                        ...results.map(result => result.mainTopicCategory).filter(Boolean)
                      ])).slice(0, 21).map((keyword, i) => (
                        <div
                          key={i}
                          className="px-6 py-3 rounded-[50px] outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchQuery(keyword);
                            handleSearch({ preventDefault: () => {} });
                          }}
                        >
                          <div className="text-center text-black text-base font-light font-['Chivo_Mono']">
                            {keyword}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
} 