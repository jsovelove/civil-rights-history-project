/**
 * @fileoverview TopicGlossary page for browsing curated civil rights topics in a card-based layout.
 * 
 * This page provides a glossary view of topics from the events_and_topics collection,
 * which contains AI-curated topics with rich descriptions and categorization.
 * It displays them in a clean card grid with topic titles, descriptions, and metadata.
 * It implements caching for performance and supports filtering, sorting, and category-based browsing.
 */

import { useState, useEffect, createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  searchTopicsSemanticaly, 
  checkTopicVectorizationStatus 
} from '../services/topicVectorSearch';
import ForceDirectedTopicGraph from '../components/visualization/ForceDirectedTopicGraph';

// Create a context for caching (similar to ContentDirectory)
const TopicGlossaryCacheContext = createContext();

/**
 * TopicGlossary Page - Card-based directory of curated civil rights topics
 * 
 * This page provides:
 * 1. A card grid layout of AI-curated topics from the events_and_topics collection
 * 2. Rich descriptions and categorization (concepts, places, people, events, organizations, legal)
 * 3. Advanced filtering by category and search functionality
 * 4. Sorting by importance, alphabetical order, or usage statistics
 * 5. Click-to-playlist functionality that loads all relevant clips for a topic
 * 6. Efficient data loading with caching for improved performance
 * 
 * @component
 * @returns {React.ReactElement} Topic glossary page
 */
export default function TopicGlossary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topicData, setTopicData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [sortBy, setSortBy] = useState('importance'); // 'alphabetical', 'clipCount', 'interviewCount', 'importance'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'concept', 'place', 'person', 'event', 'org', 'legal'
  const [cache, setCache] = useState({});
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [semanticSearchLoading, setSemanticSearchLoading] = useState(false);
  const [isVectorized, setIsVectorized] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'graph'
  const [semanticResults, setSemanticResults] = useState([]); // Store semantic search results for graph
  const navigate = useNavigate();

  // Cache functions
  const updateCache = (key, data) => {
    setCache(prev => ({ ...prev, [key]: data }));
  };

  const addSearchToCache = (type, searchTerm, results) => {
    const searchKey = `${type}_search_${searchTerm.toLowerCase()}`;
    setCache(prev => ({ ...prev, [searchKey]: results }));
  };

  const getSearchFromCache = (type, searchTerm) => {
    const searchKey = `${type}_search_${searchTerm.toLowerCase()}`;
    return cache[searchKey];
  };

  /**
   * Initialize data from cache or fetch new data
   * Also check if topics have been vectorized
   */
  useEffect(() => {
    let cancelled = false;
    
    const loadData = async () => {
      if (cache.keywords) {
        console.log('Using cached topic data');
        if (!cancelled) {
          setTopicData(cache.keywords);
          setLoading(false);
        }
      } else {
        console.log('No cached data, fetching topics...');
        await fetchAndProcessTopics();
      }
      
      // Check vectorization status
      try {
        const status = await checkTopicVectorizationStatus();
        if (!cancelled) {
          setIsVectorized(status.isVectorized);
          console.log(`Vector search ${status.isVectorized ? 'available' : 'not available'} (${status.count} topics vectorized)`);
        }
      } catch (error) {
        console.error('Error checking vectorization status:', error);
      }
    };
    
    loadData();
    
    return () => {
      cancelled = true;
    };
  }, []);


  /**
   * Update filtered and sorted topics when search term, sort option, or category filter changes
   * Uses semantic search if enabled and vectorization is available
   */
  useEffect(() => {
    let cancelled = false;
    
    const filterAndSortTopics = async () => {
      let filtered = topicData;
      
      // Apply search filter
      if (searchTerm) {
        // Use semantic search if enabled and available
        if (useSemanticSearch && isVectorized) {
          setSemanticSearchLoading(true);
          
          try {
            const results = await searchTopicsSemanticaly(searchTerm, {
              limit: 50,
              category: categoryFilter === 'all' ? null : categoryFilter,
              minSimilarity: 0.3
            });
            
            if (!cancelled) {
              // Enrich semantic results with full topic data for graph visualization
              const enrichedResults = results.map(result => {
                const fullTopic = topicData.find(t => t.id === result.topicId);
                return {
                  ...result,
                  description: fullTopic?.description || fullTopic?.shortDescription || '',
                  totalLengthSeconds: fullTopic?.totalLengthSeconds || 0
                };
              });
              setSemanticResults(enrichedResults);
              
              // Map semantic results back to full topic data
              const resultIds = new Set(results.map(r => r.topicId));
              filtered = topicData.filter(topic => resultIds.has(topic.id));
              
              // Sort by semantic relevance
              filtered.sort((a, b) => {
                const aResult = results.find(r => r.topicId === a.id);
                const bResult = results.find(r => r.topicId === b.id);
                return (bResult?.similarity || 0) - (aResult?.similarity || 0);
              });
              
              console.log(`✅ Semantic search found ${filtered.length} relevant topics`);
            }
          } catch (error) {
            console.error('Semantic search error:', error);
            // Fall back to keyword search
            filtered = keywordSearchTopics(searchTerm, topicData, categoryFilter);
          } finally {
            if (!cancelled) {
              setSemanticSearchLoading(false);
            }
          }
        } else {
          // Use keyword search
          filtered = keywordSearchTopics(searchTerm, topicData, categoryFilter);
        }
      } else {
        // No search term - apply category filter only
        if (categoryFilter !== 'all') {
          filtered = filtered.filter(item => item.category === categoryFilter);
        }
        
        // Apply sorting
        filtered = [...filtered].sort((a, b) => {
          switch (sortBy) {
            case 'alphabetical':
              return a.keyword.localeCompare(b.keyword);
            case 'clipCount':
              return b.count - a.count;
            case 'interviewCount':
              return b.interviewCount - a.interviewCount;
            case 'importance':
              if (b.importanceScore !== a.importanceScore) {
                return b.importanceScore - a.importanceScore;
              }
              return a.keyword.localeCompare(b.keyword);
            default:
              return a.keyword.localeCompare(b.keyword);
          }
        });
      }

      if (!cancelled) {
        setFilteredTopics(filtered);
      }
    };
    
    filterAndSortTopics();
    
    return () => {
      cancelled = true;
    };
  }, [searchTerm, topicData, sortBy, categoryFilter, useSemanticSearch, isVectorized]);
  
  /**
   * Keyword search fallback function - searches only by topic name
   */
  const keywordSearchTopics = (searchTerm, topics, categoryFilter) => {
    const cacheKey = `${searchTerm}_${categoryFilter}`;
    const cachedResults = getSearchFromCache('keywords', cacheKey);
    
    if (cachedResults) {
      console.log('Using cached keyword search results');
      return cachedResults;
    }
    
    // Only search by keyword/topic name, not description
    let filtered = topics.filter(item => 
      item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    addSearchToCache('keywords', cacheKey, filtered);
    return filtered;
  };

  /**
   * Groups topics by their first letter
   */
  const groupTopicsByLetter = (topics) => {
    const grouped = {};
    topics.forEach(topic => {
      const firstLetter = topic.keyword.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(topic);
    });
    return grouped;
  };

  /**
   * Fetches topics from the 'events_and_topics' collection and calculates actual
   * interview counts by searching through interview data.
   */
  const fetchAndProcessTopics = async () => {
    try {
      setLoading(true);
      
      // Get curated topics
      const eventsAndTopicsCollection = collection(db, 'events_and_topics');
      const eventsSnapshot = await getDocs(eventsAndTopicsCollection);
      
      // Get interview data to calculate actual usage stats
      console.log('Calculating actual interview counts for topics...');
      let usageStats = cache.topicUsageStats;
      
      if (!usageStats) {
        console.log('No cached usage stats found, calculating...');
        try {
          usageStats = await calculateTopicUsageStats();
          updateCache('topicUsageStats', usageStats);
        } catch (error) {
          console.error('Error calculating usage stats:', error);
          // Continue with empty stats if calculation fails
          usageStats = {};
        }
      } else {
        console.log('Using cached topic usage stats');
      }
      
      const processedData = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        const topicName = data.eventTopic || doc.id;
        
        // Look up actual usage stats for this topic
        const stats = usageStats[topicName.toLowerCase()] || usageStats[doc.id.toLowerCase()] || {
          clipCount: 0,
          interviewCount: 0,
          totalLengthSeconds: 0
        };
        
        return {
          id: doc.id,
          keyword: topicName,
          description: data.updatedLongDescription || data.description || `Learn about ${topicName} in the context of the civil rights movement.`,
          shortDescription: data.description || '',
          category: data.aiCuration?.category || 'other',
          importanceScore: data.aiCuration?.importanceScore || 5,
          originalFrequency: data.aiCuration?.originalFrequency || 0,
          
          // Use actual calculated stats
          clipCount: stats.clipCount,
          interviewCount: stats.interviewCount,
          totalLengthSeconds: stats.totalLengthSeconds,
          count: stats.clipCount,
          
          
          // Add original data for reference
          originalData: data
        };
      });

      // Sort by importance score and name
      processedData.sort((a, b) => {
        // First sort by importance score (higher first)
        if (b.importanceScore !== a.importanceScore) {
          return b.importanceScore - a.importanceScore;
        }
        // Then alphabetically
        return a.keyword.localeCompare(b.keyword);
      });

      setTopicData(processedData);
      updateCache('keywords', processedData); // Cache the processed data
      setLoading(false);
    } catch (error) {
      console.error("Error fetching topics:", error);
      setError("Failed to load topic data");
      setLoading(false);
    }
  };

  /**
   * Calculates actual usage statistics for topics by searching through interview data
   */
  const calculateTopicUsageStats = async () => {
    const usageStats = {};
    
    try {
      // Use collection group query to get all subSummaries efficiently
      const subSummariesSnapshot = await getDocs(collectionGroup(db, 'subSummaries'));
      
      console.log(`Analyzing ${subSummariesSnapshot.size} clips for topic usage...`);
      
      subSummariesSnapshot.forEach((doc) => {
        const subSummary = doc.data();
        const interviewId = doc.ref.parent.parent.id;
        
        // Process keywords (handle both string and array formats)
        let keywords = [];
        if (typeof subSummary.keywords === 'string') {
          keywords = subSummary.keywords.split(",").map(kw => kw.trim().toLowerCase());
        } else if (Array.isArray(subSummary.keywords)) {
          keywords = subSummary.keywords.map(kw => kw.toLowerCase());
        }
        
        keywords.forEach(keyword => {
          if (!keyword) return;
          
          if (!usageStats[keyword]) {
            usageStats[keyword] = {
              clipCount: 0,
              interviewIds: new Set(),
              totalLengthSeconds: 0,
            };
          }
          
          const stats = usageStats[keyword];
          stats.clipCount++;
          stats.interviewIds.add(interviewId);
          
          // Calculate duration from timestamp
          if (subSummary.timestamp && subSummary.timestamp.includes(" - ")) {
            const start = extractStartTimestamp(subSummary.timestamp);
            const end = extractStartTimestamp(subSummary.timestamp.split(" - ")[1]);
            const duration = Math.max(0, convertTimestampToSeconds(end) - convertTimestampToSeconds(start));
            stats.totalLengthSeconds += duration;
          }
        });
      });
      
      // Convert Set to size for interviewCount
      const finalStats = {};
      Object.keys(usageStats).forEach(keyword => {
        finalStats[keyword] = {
          clipCount: usageStats[keyword].clipCount,
          interviewCount: usageStats[keyword].interviewIds.size,
          totalLengthSeconds: Math.round(usageStats[keyword].totalLengthSeconds)
        };
      });
      
      console.log(`Calculated usage stats for ${Object.keys(finalStats).length} keywords`);
      return finalStats;
      
    } catch (error) {
      console.error("Error calculating topic usage stats:", error);
      return {};
    }
  };

  /**
   * Extracts YouTube video ID from various URL formats
   */
  const extractVideoId = (videoEmbedLink) => {
    if (!videoEmbedLink) return null;
    
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const match = videoEmbedLink.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  /**
   * Extracts timestamp from formatted string, handling brackets
   */
  const extractStartTimestamp = (rawTimestamp) => {
    const match = rawTimestamp.match(/(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)/);
    return match ? match[1] : "00:00";
  };

  /**
   * Converts a timestamp string to seconds
   */
  const convertTimestampToSeconds = (timestamp) => {
    const parts = timestamp.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  /**
   * Handles topic card click to load playlist builder with all relevant clips
   */
  const handleTopicClick = (keyword) => {
    // Navigate to playlist builder with the selected topic/keyword
    navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`);
  };

  /**
   * Formats seconds as hours and minutes
   */
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-black/20 rounded-full animate-spin" style={{
          borderTopColor: '#F2483C'
        }}></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-200 flex justify-center items-center">
        <div className="bg-white border border-black text-black px-6 py-4" style={{
          fontFamily: 'Freight Text Pro, Crimson Text, serif'
        }}>
          {error}
        </div>
      </div>
    );
  }

  const groupedTopics = groupTopicsByLetter(filteredTopics);
  const sortedLetters = Object.keys(groupedTopics).sort();

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="w-full px-4 sm:px-8 lg:px-12 pt-3 pb-6">
        {/* Main heading */}
        <div className="mb-6 sm:mb-7 md:mb-8 lg:mb-[32px]">
          <h1 className="text-stone-900 text-8xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            Topic Glossary
          </h1>
        </div>

        {/* Topic count */}
        <div className="mb-[31px]">
          <span className="text-red-500 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
            {filteredTopics.length} Topics {categoryFilter !== 'all' ? `(${categoryFilter})` : ''}
          </span>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-black mb-6"></div>
      </div>

      {/* Controls Section */}
      <div className="w-full px-4 sm:px-8 lg:px-12 mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          {/* Search Section */}
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 relative">
              <div className="w-2.5 h-0 absolute left-[38.34px] top-[37.79px] origin-top-left rotate-[-133.05deg] border-2 border-stone-900"></div>
              <div className="w-6 h-6 absolute left-[10px] top-[13.17px] origin-top-left rotate-[-5.18deg] rounded-full border-2 border-stone-900"></div>
            </div>
            <div className="min-w-64 h-6 flex items-center gap-4">
              <input
                type="text"
                placeholder={useSemanticSearch ? "Search by concept or meaning..." : "Search in glossary"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-stone-900 text-xl font-light bg-transparent border-none outline-none w-full"
                style={{ fontFamily: 'Chivo Mono, monospace' }}
              />
              {semanticSearchLoading && (
                <div className="w-5 h-5 border-2 border-stone-900/20 border-t-red-500 rounded-full animate-spin"></div>
              )}
            </div>
            {isVectorized && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded border border-stone-900">
                <button
                  onClick={() => setUseSemanticSearch(false)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    !useSemanticSearch
                      ? 'text-white'
                      : 'text-stone-900 hover:text-stone-600'
                  }`}
                  style={{ 
                    fontFamily: 'Chivo Mono, monospace',
                    backgroundColor: !useSemanticSearch ? '#F2483C' : 'transparent'
                  }}
                >
                  Keyword
                </button>
                <button
                  onClick={() => setUseSemanticSearch(true)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    useSemanticSearch
                      ? 'text-white'
                      : 'text-stone-900 hover:text-stone-600'
                  }`}
                  style={{ 
                    fontFamily: 'Chivo Mono, monospace',
                    backgroundColor: useSemanticSearch ? '#F2483C' : 'transparent'
                  }}
                >
                  Semantic
                </button>
              </div>
            )}
          </div>

          {/* View Mode Toggle (only show during semantic search with results) */}
          {useSemanticSearch && searchTerm && filteredTopics.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded border border-stone-900">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'text-white'
                    : 'text-stone-900 hover:text-stone-600'
                }`}
                style={{ 
                  fontFamily: 'Chivo Mono, monospace',
                  backgroundColor: viewMode === 'grid' ? '#F2483C' : 'transparent'
                }}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'graph'
                    ? 'text-white'
                    : 'text-stone-900 hover:text-stone-600'
                }`}
                style={{ 
                  fontFamily: 'Chivo Mono, monospace',
                  backgroundColor: viewMode === 'graph' ? '#F2483C' : 'transparent'
                }}
              >
                Network
              </button>
            </div>
          )}

          {/* Filter Section */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 relative">
              <div className="w-9 h-0 absolute left-[42px] top-[12px] origin-top-left -rotate-180 border-2 border-stone-900"></div>
              <div className="w-9 h-0 absolute left-[42px] top-[24px] origin-top-left -rotate-180 border-2 border-stone-900"></div>
              <div className="w-9 h-0 absolute left-[42px] top-[36px] origin-top-left -rotate-180 border-2 border-stone-900"></div>
              <div className="w-2 h-2 absolute left-[11px] top-[9px] bg-gray-200 rounded-full border-2 border-stone-900"></div>
              <div className="w-2 h-2 absolute left-[29px] top-[21px] bg-gray-200 rounded-full border-2 border-stone-900"></div>
              <div className="w-2 h-2 absolute left-[17px] top-[33px] bg-gray-200 rounded-full border-2 border-stone-900"></div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-stone-900 text-xl font-light bg-transparent border-none outline-none"
              style={{ fontFamily: 'Chivo Mono, monospace' }}
            >
              <option value="all">All Categories</option>
              <option value="concept">Concepts</option>
              <option value="place">Places</option>
              <option value="person">People</option>
              <option value="event">Events</option>
              <option value="org">Organizations</option>
              <option value="legal">Legal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Topics by Letter OR Force-Directed Graph */}
      <div className="w-full px-4 sm:px-8 lg:px-12 pb-12">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-stone-900 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
              No topics found matching your search.
            </span>
          </div>
        ) : viewMode === 'graph' && useSemanticSearch && searchTerm ? (
          /* Force-Directed Network Graph View */
          <div className="w-full" style={{ height: '800px' }}>
            <ForceDirectedTopicGraph
              topics={semanticResults}
              searchQuery={searchTerm}
              onTopicClick={handleTopicClick}
              width={1400}
              height={800}
              similarityThreshold={0.7}
            />
          </div>
        ) : (
          /* Grid View */
          <div className="space-y-16">
            {sortedLetters.map((letter) => (
              <div key={letter} className="space-y-6">
                {/* Letter Header */}
                <div className="w-full inline-flex flex-col justify-start items-start gap-[5px]">
                  <div className="text-red-500 text-4xl font-semibold" style={{ fontFamily: 'Acumin Pro, Inter, sans-serif' }}>
                    {letter}
                  </div>
                  <div className="w-full h-0 border border-black"></div>
                </div>

                {/* Topics Grid for this letter - using padding to create left margin */}
                <div className="md:ml-[16.666%] lg:ml-[16.666%] xl:ml-[16.666%] 2xl:ml-[16.666%]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {groupedTopics[letter].map((topic, index) => (
                      <div 
                        key={topic.keyword}
                        className="w-64 cursor-pointer transition-all duration-300 group"
                        onClick={() => handleTopicClick(topic.keyword)}
                        title={`Click to build a playlist with all ${topic.clipCount} clips about "${topic.keyword}"`}
                      >
                        <div className="w-60 flex flex-col justify-start items-start gap-4">
                          <div className="self-stretch flex flex-col justify-start items-start gap-4">
                            <div className="flex flex-col justify-start items-start gap-0.5">
                              <div className="text-stone-900 text-4xl font-bold font-['Source_Serif_4'] capitalize transition-colors duration-300 group-hover:text-[#F2483C] group-hover:underline">
                                {topic.keyword}
                              </div>
                              <div className="text-stone-900 text-base font-light transition-colors duration-300 group-hover:text-[#F2483C]" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                                {topic.interviewCount} Interview{topic.interviewCount !== 1 ? 's' : ''}, {formatDuration(topic.totalLengthSeconds)}
                              </div>
                            </div>
                            <div className="self-stretch text-stone-900 text-base font-normal font-['Source_Serif_4'] transition-colors duration-300 group-hover:text-[#F2483C]">
                              {topic.shortDescription || topic.description?.substring(0, 200) + (topic.description?.length > 200 ? '...' : '') || `${topic.keyword} is an important topic in the context of the civil rights movement.`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 