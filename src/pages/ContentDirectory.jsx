import { useState, createContext, useEffect } from 'react';
import KeywordDirectory from '../components/KeywordDirectory';
import ClipsDirectory from '../components/ClipsDirectory';
import PeopleGrid from '../components/PeopleGrid';

export const DirectoryCacheContext = createContext(null);

export default function ContentDirectory() {
  const [activeTab, setActiveTab] = useState('keywords');
  const [clipSearchTerm, setClipSearchTerm] = useState('');
  const [statsData, setStatsData] = useState({
    keywordCount: 0,
    clipCount: 0,
    totalDuration: 0,
    peopleCount: 0
  });
  
  // Initialize cache state
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

  // Load cache from sessionStorage on initial mount
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

  // Save cache to sessionStorage when it changes
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

  // Update stats when cache changes
  useEffect(() => {
    const newStats = {
      keywordCount: cache.keywords?.length || 0,
      clipCount: cache.keywords?.reduce((sum, item) => sum + item.count, 0) || 0,
      totalDuration: cache.keywords?.reduce((sum, item) => sum + item.totalLengthSeconds, 0) || 0,
      peopleCount: cache.people?.length || 0
    };
    
    setStatsData(newStats);
  }, [cache.keywords, cache.people]);

  // Function to update cache
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

  // Function to add a search result to cache
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

  // Function to check if a search is in cache
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

  // Function to navigate to clips tab with a specific search term
  const navigateToClips = (searchTerm) => {
    // First change the tab, then update the search term to trigger the search effect
    setActiveTab('clips');
    // Use setTimeout to ensure the tab change happens first
    setTimeout(() => {
      setClipSearchTerm(searchTerm ? searchTerm.trim() : '');
    }, 10);
  };

  // Format time for display
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

        {/* Content Panels */}
        {activeTab === 'keywords' && <KeywordDirectory onViewAllClips={navigateToClips} />}
        {activeTab === 'clips' && <ClipsDirectory initialSearchTerm={clipSearchTerm} />}
        {activeTab === 'people' && <PeopleGrid />}
      </div>
    </DirectoryCacheContext.Provider>
  );
}