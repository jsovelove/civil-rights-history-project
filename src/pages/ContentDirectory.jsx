/**
 * @fileoverview ContentDirectory page for browsing and searching through collection content.
 * 
 * This component serves as the main directory interface for the Civil Rights History Collection,
 * allowing users to browse and search through keywords, clips, and people. It implements
 * a tabbed interface and manages a context-based caching system to improve performance.
 */

import { useState, createContext, useEffect } from 'react';
import KeywordDirectory from '../components/KeywordDirectory';
import ClipsDirectory from '../components/ClipsDirectory';
import PeopleGrid from '../components/PeopleGrid';

/**
 * Context for sharing cache state and operations across directory components
 * @type {React.Context}
 */
export const DirectoryCacheContext = createContext(null);

/**
 * ContentDirectory - Main component for browsing and searching collection content
 * 
 * This component:
 * 1. Manages navigation between three content tabs: keywords, clips, and people
 * 2. Implements a caching system for search results and directory data
 * 3. Persists cache to sessionStorage for improved performance across page refreshes
 * 4. Displays collection statistics
 * 
 * @returns {React.ReactElement} The directory interface with tabs and content panels
 */
export default function ContentDirectory() {
  // Active tab state (keywords, clips, or people)
  const [activeTab, setActiveTab] = useState('keywords');
  // Search term state for the clips tab
  const [clipSearchTerm, setClipSearchTerm] = useState('');
  // Collection statistics for display
  const [statsData, setStatsData] = useState({
    keywordCount: 0,
    clipCount: 0,
    totalDuration: 0,
    peopleCount: 0
  });
  
  /**
   * Cache state structure for storing directory data and search results
   * 
   * @type {Object} Structure:
   * - keywords: Array of all keywords with metadata
   * - keywordSearches: Object mapping search terms to results for keywords
   * - clipSearches: Object mapping search terms to results for clips
   * - people: Array of all people with metadata
   * - lastFetched: Timestamp tracking when each data type was last fetched
   */
  const [cache, setCache] = useState({
    keywords: null,
    keywordSearches: {}, // { searchTerm: results }
    clipSearches: {},    // { searchTerm: results }
    people: null,
    lastFetched: {
      keywords: null,
      people: null
    }
  });

  /**
   * Load cache from sessionStorage on initial component mount
   * 
   * Restores previously cached data if it exists and is less than 1 hour old.
   * This improves performance by reducing redundant API calls.
   */
  useEffect(() => {
    try {
      const savedCache = sessionStorage.getItem('directoryCache');
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        
        // Check if the cache is recent (less than 1 hour old)
        const now = new Date().getTime();
        const cacheAge = now - (parsedCache.timestamp || 0);
        const ONE_HOUR = 60 * 60 * 1000;
        
        if (cacheAge < ONE_HOUR) {
          setCache(prevCache => ({
            ...prevCache,
            ...parsedCache.data
          }));
          console.log('Restored cache from session storage');
        } else {
          console.log('Cache expired, will fetch fresh data');
          sessionStorage.removeItem('directoryCache');
        }
      }
    } catch (error) {
      console.error('Error loading cache from session storage:', error);
    }
  }, []);

  /**
   * Save cache to sessionStorage whenever it changes
   * 
   * This ensures cache persistence across page refreshes and browser tabs,
   * improving the user experience by maintaining search results and reducing load times.
   */
  useEffect(() => {
    try {
      // Don't save empty cache
      if (!cache.keywords && !cache.people && 
          Object.keys(cache.keywordSearches).length === 0 && 
          Object.keys(cache.clipSearches).length === 0) {
        return;
      }
      
      sessionStorage.setItem('directoryCache', JSON.stringify({
        data: cache,
        timestamp: new Date().getTime()
      }));
    } catch (error) {
      console.error('Error saving cache to session storage:', error);
    }
  }, [cache]);

  /**
   * Update statistics whenever the cache data changes
   * 
   * Calculates and updates the stats displayed in the stats summary cards,
   * including total keywords, clips, content duration, and people.
   */
  useEffect(() => {
    const newStats = {
      keywordCount: cache.keywords?.length || 0,
      clipCount: cache.keywords?.reduce((sum, item) => sum + item.count, 0) || 0,
      totalDuration: cache.keywords?.reduce((sum, item) => sum + item.totalLengthSeconds, 0) || 0,
      peopleCount: cache.people?.length || 0
    };
    
    setStatsData(newStats);
  }, [cache.keywords, cache.people]);

  /**
   * Updates a specific section of the cache with new data
   * 
   * @param {string} key - The cache section to update ('keywords', 'people', etc.)
   * @param {any} data - The new data to store in the cache
   */
  const updateCache = (key, data) => {
    setCache(prevCache => ({
      ...prevCache,
      [key]: data,
      lastFetched: {
        ...prevCache.lastFetched,
        [key]: new Date().getTime()
      }
    }));
  };

  /**
   * Adds search results to the appropriate cache section
   * 
   * @param {string} type - The type of search ('keywords' or 'clips')
   * @param {string} searchTerm - The search term used
   * @param {Array} results - The search results to cache
   */
  const addSearchToCache = (type, searchTerm, results) => {
    const cacheKey = type === 'keywords' ? 'keywordSearches' : 'clipSearches';
    setCache(prevCache => ({
      ...prevCache,
      [cacheKey]: {
        ...prevCache[cacheKey],
        [searchTerm.toLowerCase()]: {
          results,
          timestamp: new Date().getTime()
        }
      }
    }));
  };

  /**
   * Retrieves search results from cache if available and recent
   * 
   * @param {string} type - The type of search ('keywords' or 'clips')
   * @param {string} searchTerm - The search term to look up
   * @returns {Array|null} Cached search results if available and fresh, otherwise null
   */
  const getSearchFromCache = (type, searchTerm) => {
    const cacheKey = type === 'keywords' ? 'keywordSearches' : 'clipSearches';
    const cachedSearch = cache[cacheKey][searchTerm.toLowerCase()];
    
    if (!cachedSearch) return null;
    
    // Check if cache is recent (less than 30 minutes old)
    const now = new Date().getTime();
    const cacheAge = now - cachedSearch.timestamp;
    const THIRTY_MINUTES = 30 * 60 * 1000;
    
    return cacheAge < THIRTY_MINUTES ? cachedSearch.results : null;
  };

  /**
   * Navigates to the clips tab with a specific search term
   * 
   * This function is used to link from keywords to their associated clips,
   * providing cross-navigation between directory sections.
   * 
   * @param {string} searchTerm - The search term to apply in the clips tab
   */
  const navigateToClips = (searchTerm) => {
    // First change the tab, then update the search term to trigger the search effect
    setActiveTab('clips');
    // Use setTimeout to ensure the tab change happens first
    setTimeout(() => {
      setClipSearchTerm(searchTerm ? searchTerm.trim() : '');
    }, 10);
  };

  /**
   * Formats seconds into a human-readable time string
   * 
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string (HH:MM:SS or MM:SS)
   */
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <DirectoryCacheContext.Provider value={{ 
      cache, 
      updateCache, 
      addSearchToCache, 
      getSearchFromCache 
    }}>
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Directory
          </h1>
          <p className="text-base text-gray-600 max-w-3xl leading-relaxed">
            Browse and search through keywords, clips, and people from the Civil Rights History Collection.
          </p>
        </div>

        {/* Stats summary - now shown on all tabs */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-800 mb-2">
                {statsData.keywordCount}
              </div>
              <div className="text-sm text-gray-500">
                Total Keywords
              </div>
            </div>
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-800 mb-2">
                {statsData.clipCount}
              </div>
              <div className="text-sm text-gray-500">
                Total Clips
              </div>
            </div>
            <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-800 mb-2">
                {formatTime(statsData.totalDuration)}
              </div>
              <div className="text-sm text-gray-500">
                Total Content Duration
              </div>
            </div>
            <div className="flex flex-col items-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-800 mb-2">
                {statsData.peopleCount}
              </div>
              <div className="text-sm text-gray-500">
                Total People
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('keywords')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'keywords'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Keywords
            </button>
            <button
              onClick={() => setActiveTab('clips')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clips'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Clips
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'people'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              People
            </button>
          </nav>
        </div>

        {/* Content Panels - Only one renders based on activeTab state */}
        {activeTab === 'keywords' && <KeywordDirectory onViewAllClips={navigateToClips} />}
        {activeTab === 'clips' && <ClipsDirectory initialSearchTerm={clipSearchTerm} />}
        {activeTab === 'people' && <PeopleGrid />}
      </div>
    </DirectoryCacheContext.Provider>
  );
}