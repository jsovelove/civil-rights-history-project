/**
 * @fileoverview TopicGlossary page for browsing interview topics in a card-based layout.
 * 
 * This page provides a glossary view of topics/keywords extracted from interviews,
 * displaying them in a clean card grid with topic titles and statistics.
 * It implements caching for performance and supports filtering and sorting.
 */

import { useState, useEffect, createContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// Create a context for caching (similar to ContentDirectory)
const TopicGlossaryCacheContext = createContext();

/**
 * TopicGlossary Page - Card-based topic directory with filtering and navigation
 * 
 * This page provides:
 * 1. A card grid layout of topics/keywords from interviews
 * 2. Statistics about each topic (interview count, clip count, total duration)
 * 3. Filtering and sorting capabilities
 * 4. Navigation to playlists and content
 * 5. Efficient data loading with caching
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
  const [sortBy, setSortBy] = useState('alphabetical'); // 'alphabetical', 'clipCount', 'interviewCount'
  const [cache, setCache] = useState({});
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
   */
  useEffect(() => {
    if (cache.keywords) {
      console.log('Using cached topic data');
      setTopicData(cache.keywords);
      setLoading(false);
    } else {
      fetchAndProcessTopics();
    }
  }, [cache.keywords]);

  /**
   * Update filtered and sorted topics when search term or sort option changes
   */
  useEffect(() => {
    let filtered = topicData;
    
    if (searchTerm) {
      // Check if this search is cached
      const cachedResults = getSearchFromCache('keywords', searchTerm);
      
      if (cachedResults) {
        console.log('Using cached topic search results');
        filtered = cachedResults;
      } else {
        // Filter topics based on search term
        filtered = topicData.filter(item => 
          item.keyword.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        // Cache the search results
        addSearchToCache('keywords', searchTerm, filtered);
      }
    }

    // Apply sorting - always alphabetical for the new layout
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.keyword.localeCompare(b.keyword);
        case 'clipCount':
          return b.count - a.count;
        case 'interviewCount':
          return b.interviewCount - a.interviewCount;
        default:
          return a.keyword.localeCompare(b.keyword);
      }
    });

    setFilteredTopics(sorted);
  }, [searchTerm, topicData, sortBy]);

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
   * Fetches pre-aggregated topics from the 'topicGlossary' collection in Firestore.
   */
  const fetchAndProcessTopics = async () => {
    try {
      setLoading(true);
      
      const glossaryCollection = collection(db, 'topicGlossary');
      const glossarySnapshot = await getDocs(glossaryCollection);
      
      const processedData = glossarySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // The keyword property is already on the document data, but we can ensure it's set
      processedData.forEach(item => {
        if (!item.keyword) {
          item.keyword = item.id;
        }
      });

      setTopicData(processedData);
      
      // No need to cache this data as it's already optimized
      // But if you want to, you can re-enable caching here.
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching topics:", error);
      setError("Failed to load topic data");
      setLoading(false);
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
   * Handles topic card click to view all clips
   */
  const handleTopicClick = (keyword) => {
    // Navigate to content directory with keyword filter
    navigate(`/content-directory?tab=keywords&keyword=${encodeURIComponent(keyword)}`);
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
    <div className="min-h-screen" style={{ backgroundColor: '#EBEAE9' }}>
      {/* Header Section */}
      <div className="w-full max-w-[1632px] mx-auto px-12 pt-3 pb-6">
        {/* Topic count */}
        <div className="mb-4">
          <span className="text-red-500 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
            {filteredTopics.length} Keywords
          </span>
        </div>

        {/* Main heading */}
        <div className="mb-8">
          <h1 className="text-stone-900 text-8xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            Topic Glossary
          </h1>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-black mb-6"></div>
      </div>

      {/* Controls Section */}
      <div className="w-full max-w-[1632px] mx-auto px-12 mb-8">
        <div className="flex justify-between items-center">
          {/* Search Section */}
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 relative">
              <div className="w-2.5 h-0 absolute left-[38.34px] top-[37.79px] origin-top-left rotate-[-133.05deg] border-2 border-stone-900"></div>
              <div className="w-6 h-6 absolute left-[10px] top-[13.17px] origin-top-left rotate-[-5.18deg] rounded-full border-2 border-stone-900"></div>
            </div>
            <div className="w-40 h-6">
              <input
                type="text"
                placeholder="Search in glossary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-stone-900 text-xl font-light bg-transparent border-none outline-none w-full"
                style={{ fontFamily: 'Chivo Mono, monospace' }}
              />
            </div>
          </div>

          {/* Filter and Sort Section */}
          <div className="flex items-center gap-8">
            {/* Filter */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 relative">
                <div className="w-9 h-0 absolute left-[42px] top-[12px] origin-top-left -rotate-180 border-2 border-stone-900"></div>
                <div className="w-9 h-0 absolute left-[42px] top-[24px] origin-top-left -rotate-180 border-2 border-stone-900"></div>
                <div className="w-9 h-0 absolute left-[42px] top-[36px] origin-top-left -rotate-180 border-2 border-stone-900"></div>
                <div className="w-2 h-2 absolute left-[11px] top-[9px] bg-gray-200 rounded-full border-2 border-stone-900"></div>
                <div className="w-2 h-2 absolute left-[29px] top-[21px] bg-gray-200 rounded-full border-2 border-stone-900"></div>
                <div className="w-2 h-2 absolute left-[17px] top-[33px] bg-gray-200 rounded-full border-2 border-stone-900"></div>
              </div>
              <span className="text-stone-900 text-xl font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                Filter
              </span>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-stone-900 text-xl font-light bg-transparent border-none outline-none"
                style={{ fontFamily: 'Chivo Mono, monospace' }}
              >
                <option value="alphabetical">Sort by: A-Z</option>
                <option value="clipCount">Sort by: Most Clips</option>
                <option value="interviewCount">Sort by: Most Interviews</option>
              </select>
              <div className="w-4 h-3 origin-top-left rotate-90 border border-stone-900"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Topics by Letter */}
      <div className="w-full max-w-[1632px] mx-auto px-12 pb-12">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-stone-900 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
              No topics found matching your search.
            </span>
          </div>
        ) : (
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

                {/* Topics Grid for this letter */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {groupedTopics[letter].map((topic) => (
                    <div 
                      key={topic.keyword}
                      className="w-64 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleTopicClick(topic.keyword)}
                    >
                      <div className="w-60 inline-flex flex-col justify-start items-start gap-4">
                        <div className="self-stretch flex flex-col justify-start items-start gap-4">
                          <div className="flex flex-col justify-start items-start gap-0.5">
                            <div className="text-stone-900 text-4xl font-bold font-['Source_Serif_4'] capitalize">
                              {topic.keyword}
                            </div>
                            <div className="text-stone-900 text-base font-light" style={{ fontFamily: 'Chivo Mono, monospace' }}>
                              {topic.interviewCount} Interview{topic.interviewCount !== 1 ? 's' : ''}, {formatDuration(topic.totalLengthSeconds)}
                            </div>
                          </div>
                          <div className="self-stretch text-stone-900 text-base font-normal font-['Source_Serif_4']">
                            {topic.description || `${topic.keyword} is discussed across ${topic.interviewCount} interviews, providing insights into this important aspect of the civil rights movement.`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 