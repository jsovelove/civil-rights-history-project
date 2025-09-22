/**
 * @fileoverview ContentDirectory page for browsing and searching through collection content.
 * 
 * This component serves as the main directory interface for the Civil Rights History Collection,
 * allowing users to browse and search through clips and people. It implements
 * a tabbed interface and manages a context-based caching system to improve performance.
 * 
 * Note: Keywords browsing is now available on the dedicated Topic Glossary page.
 */

import { useState, createContext, useEffect } from 'react';
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
 * 1. Manages navigation between two content tabs: clips and people
 * 2. Implements a caching system for search results and directory data
 * 3. Persists cache to sessionStorage for improved performance across page refreshes
 * 4. Displays collection statistics
 * 
 * @returns {React.ReactElement} The directory interface with tabs and content panels
 */
export default function ContentDirectory() {
  // Active tab state (clips or people)
  const [activeTab, setActiveTab] = useState('clips');
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
   * - clipSearches: Object mapping search terms to results for clips
   * - people: Array of all people with metadata
   * - lastFetched: Timestamp tracking when each data type was last fetched
   */
  const [cache, setCache] = useState({
    clipSearches: {},    // { searchTerm: results }
    people: null,
    lastFetched: {
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
      if (!cache.people && Object.keys(cache.clipSearches).length === 0) {
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
   * including total people. Note: Keywords and clips stats are now handled 
   * by the dedicated Topic Glossary page.
   */
  useEffect(() => {
    const newStats = {
      peopleCount: cache.people?.length || 0
    };
    
    setStatsData(newStats);
  }, [cache.people]);

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
   * @param {string} type - The type of search ('clips')
   * @param {string} searchTerm - The search term used
   * @param {Array} results - The search results to cache
   */
  const addSearchToCache = (type, searchTerm, results) => {
    const cacheKey = 'clipSearches';
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
   * @param {string} type - The type of search ('clips')
   * @param {string} searchTerm - The search term to look up
   * @returns {Array|null} Cached search results if available and fresh, otherwise null
   */
  const getSearchFromCache = (type, searchTerm) => {
    const cacheKey = 'clipSearches';
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
      <div className="font-body" style={{ backgroundColor: '#EBEAE9', minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto px-6 pt-4 pb-8">
          {/* Page header */}
          <div className="mb-8">
            <h1 style={{
              fontFamily: 'Freight Text Pro, Lora, serif',
              fontWeight: 500,
              fontSize: 'clamp(28px, 4vw, 48px)',
              lineHeight: '1.2',
              color: 'black'
            }}>
              Content{' '}
              <span style={{
                fontFamily: 'Freight Text Pro, Lora, serif',
                fontWeight: 900,
                color: '#F2483C'
              }}>
                Directory
              </span>
            </h1>
            <p className="text-base text-black/70 max-w-3xl leading-relaxed mt-3" style={{
              fontFamily: 'Freight Text Pro, Lora, serif',
              fontWeight: 400
            }}>
              Browse and search through clips and people from the Civil Rights History Collection. 
              Visit the <a href="#/topic-glossary" className="text-red-500 hover:underline" style={{ color: '#F2483C' }}>Topic Glossary</a> to explore keywords and topics.
            </p>
          </div>

          {/* Stats summary */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8 border border-white/20">
            <div className="flex justify-between items-center">
              <div className="flex flex-col items-center p-4 rounded-xl" style={{ backgroundColor: 'rgba(242, 72, 60, 0.1)' }}>
                <div className="text-2xl font-bold mb-2" style={{ 
                  color: '#F2483C',
                  fontFamily: 'Freight Text Pro, Lora, serif'
                }}>
                  {statsData.peopleCount}
                </div>
                <div className="text-sm text-black/60 font-mono tracking-wide">
                  TOTAL PEOPLE
                </div>
              </div>
              <div className="text-sm text-black/60" style={{ fontFamily: 'Freight Text Pro, Lora, serif' }}>
                For topic and keyword statistics, visit the{' '}
                <a href="#/topic-glossary" className="text-red-500 hover:underline" style={{ color: '#F2483C' }}>
                  Topic Glossary
                </a>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-black/20 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('clips')}
                className={`pb-4 px-1 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'clips'
                    ? 'text-black border-black'
                    : 'border-transparent text-black/60 hover:text-black hover:border-black/30'
                }`}
                style={{ fontFamily: 'Freight Text Pro, Lora, serif' }}
              >
                Clips
              </button>
              <button
                onClick={() => setActiveTab('people')}
                className={`pb-4 px-1 border-b-2 font-medium text-base transition-colors ${
                  activeTab === 'people'
                    ? 'text-black border-black'
                    : 'border-transparent text-black/60 hover:text-black hover:border-black/30'
                }`}
                style={{ fontFamily: 'Freight Text Pro, Lora, serif' }}
              >
                People
              </button>
            </nav>
          </div>

          {/* Content Panels - Only one renders based on activeTab state */}
          {activeTab === 'clips' && <ClipsDirectory initialSearchTerm={clipSearchTerm} />}
          {activeTab === 'people' && <PeopleGrid />}
        </div>
      </div>
    </DirectoryCacheContext.Provider>
  );
}