/**
 * @fileoverview Optimized PlaylistBuilder component with fast loading and caching.
 * 
 * This component provides dramatically improved performance through:
 * - Progressive loading (first video loads immediately)
 * - Intelligent caching via playlistService
 * - Reduced Firestore operations
 * - Background loading of remaining content
 */

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { parseTimestampRange } from "../utils/timeUtils";
import VideoPlayer from "../components/VideoPlayer";
import {
  getPlaylistProgressive,
  getKeywordCount,
  getKeywordsWithMultipleClips,
  getSampleSegmentsForKeyword,
  getRelatedKeywords,
  clearCache
} from "../services/playlistService";
import ArrowLeftIcon from "../assetts/vectors/arrow left.svg";
import ArrowRightIcon from "../assetts/vectors/arrow right.svg";
import DownArrowIcon from "../assetts/vectors/down arrow.svg";
import SimpleArrowLeftIcon from "../assetts/vectors/simple arrow left.svg";
import SimpleArrowRightIcon from "../assetts/vectors/simple arrow right.svg";

/**
 * PlaylistBuilder - Optimized component for fast playlist loading
 */
const PlaylistBuilder = () => {
  // Routing and navigation
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Search and results state
  const [keyword, setKeyword] = useState("");
  const [videoQueue, setVideoQueue] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalClipsForKeyword, setTotalClipsForKeyword] = useState(0);
  
  // Player control states
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState(null);
  
  // "Up Next" feature state
  const [availableKeywords, setAvailableKeywords] = useState([]);
  const [nextKeyword, setNextKeyword] = useState("");
  const [nextKeywordThumbnail, setNextKeywordThumbnail] = useState("");
  const [playlistEnded, setPlaylistEnded] = useState(false);
  
  // Playlist navigation state
  const [playlistStartIndex, setPlaylistStartIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3); // Dynamic based on screen width
  
  // Refs for managing timeouts
  const autoplayTimeoutRef = useRef(null);

  /**
   * Set keyword from URL parameters when they change
   */
  useEffect(() => {
    const keywordParam = searchParams.get("keywords");
    if (keywordParam) {
      console.log(`Found keyword: ${keywordParam}`);
      setKeyword(keywordParam);
    }
  }, [searchParams]);

  /**
   * Load playlist with progressive loading when keyword changes
   */
  useEffect(() => {
    if (keyword) {
      // Clear cache to ensure we get fresh metadataV2 data
      clearCache();
      loadPlaylistProgressive();
    }
  }, [keyword]);

  /**
   * Load available keywords for "up next" feature (low priority)
   */
  useEffect(() => {
    // Load this in the background, doesn't block main loading
    loadAvailableKeywords();
  }, []);

  /**
   * Calculate how many playlist items can fit based on screen width
   */
  useEffect(() => {
    const calculateItemsPerView = () => {
      const screenWidth = window.innerWidth;
      const sidebarWidth = 96; // 48px padding on each side (px-12)
      const availableWidth = screenWidth - sidebarWidth;
      const itemWidth = 504; // Width of each playlist item
      const gapWidth = 24; // Gap between items (gap-6)
      
      // Calculate how many full items can fit, but reserve space for partial clip indicator
      const fullItems = Math.floor((availableWidth + gapWidth) / (itemWidth + gapWidth)) - 1;
      
      // Ensure at least 1 item and max reasonable number
      const clampedItems = Math.max(1, Math.min(fullItems, 5));
      setItemsPerView(clampedItems);
    };

    // Calculate on mount and resize
    calculateItemsPerView();
    window.addEventListener('resize', calculateItemsPerView);

    return () => window.removeEventListener('resize', calculateItemsPerView);
  }, []);

  /**
   * Select next keyword when available keywords are loaded
   */
  useEffect(() => {
    if (availableKeywords.length > 0 && keyword) {
      selectNextKeyword();
    }
  }, [availableKeywords, keyword]);

  /**
   * Auto-navigate to next keyword playlist when current playlist ends
   */
  useEffect(() => {
    if (playlistEnded && nextKeyword) {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
      }

      autoplayTimeoutRef.current = setTimeout(() => {
        console.log(`Navigating to next playlist: ${nextKeyword}`);
        navigate(`?keywords=${encodeURIComponent(nextKeyword)}`);
        setPlaylistEnded(false);
      }, 3000);
    }

    return () => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
      }
    };
  }, [playlistEnded, nextKeyword, navigate]);

  /**
   * Reset states when changing videos
   */
  useEffect(() => {
    if (videoQueue.length > 0) {
      setCurrentTime(0);
      setSeekToTime(null);
    }
  }, [currentVideoIndex]);

  /**
   * Progressive playlist loading - first video loads immediately
   */
  const loadPlaylistProgressive = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get keyword count immediately from cache
      const count = await getKeywordCount(keyword);
      setTotalClipsForKeyword(count);

      if (count === 0) {
        setError("No videos found for this keyword");
        setLoading(false);
        return;
      }

      // Progressive loading: first video loads immediately
      await getPlaylistProgressive(
        [keyword],
        // onFirstVideo - called immediately with first video
        (firstVideo, totalCount) => {
          console.log(`First video loaded for "${keyword}":`, firstVideo.name);
          
          // Validate first video
          if (isValidVideo(firstVideo)) {
            setVideoQueue([firstVideo]);
            setCurrentVideoIndex(0);
            setIsPlaying(true);
            setCurrentTime(0);
            setPlaylistEnded(false);
            setLoading(false); // Main loading complete!
            setBackgroundLoading(true); // Show background loading indicator
          } else {
            console.warn('First video invalid, continuing with full load...');
            // Fall back to full loading if first video is invalid
          }
        },
        // onComplete - called with full playlist
        (allVideos) => {
          console.log(`Full playlist loaded: ${allVideos.length} videos`);
          
          // Filter valid videos
          const validVideos = allVideos.filter(isValidVideo);
          
          if (validVideos.length > 0) {
            setVideoQueue(validVideos);
            // Don't reset currentVideoIndex if user has already started playing
            if (videoQueue.length <= 1) {
              setCurrentVideoIndex(0);
            }
          } else {
            setError("No videos with valid timestamps found for this keyword");
          }
          
          setBackgroundLoading(false);
          if (videoQueue.length === 0) {
            setLoading(false);
          }
        }
      );

    } catch (err) {
      console.error("Error loading playlist:", err);
      setError("Error loading playlist");
      setLoading(false);
      setBackgroundLoading(false);
    }
  };

  /**
   * Validate video has proper timestamp and data
   */
  const isValidVideo = (video) => {
    try {
      const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);
      
      if (isNaN(startSeconds) || startSeconds < 0) {
        return false;
      }
      
      if (endSeconds && endSeconds <= startSeconds) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * Load available keywords for "up next" feature
   */
  const loadAvailableKeywords = async () => {
    try {
      const keywords = await getKeywordsWithMultipleClips();
      setAvailableKeywords(keywords);
    } catch (err) {
      console.error("Error loading available keywords:", err);
    }
  };

  /**
   * Select next keyword using related keywords for better recommendations
   */
  const selectNextKeyword = async () => {
    try {
      // Try to get related keywords first for better recommendations
      const relatedKeywords = await getRelatedKeywords(keyword, 3);
      const candidateKeywords = relatedKeywords.length > 0 ? relatedKeywords : availableKeywords;
      
      // Filter out current keyword
      const filteredKeywords = candidateKeywords.filter(k => k !== keyword.toLowerCase());
      
      if (filteredKeywords.length === 0) return;

      // Select random from candidates
      const randomIndex = Math.floor(Math.random() * filteredKeywords.length);
      const selected = filteredKeywords[randomIndex];
      
      setNextKeyword(selected);
      
      // Load thumbnail for next keyword
      loadNextKeywordThumbnail(selected);
    } catch (err) {
      console.error("Error selecting next keyword:", err);
    }
  };

  /**
   * Load thumbnail for next keyword
   */
  const loadNextKeywordThumbnail = async (keyword) => {
    try {
      const sampleVideos = await getSampleSegmentsForKeyword(keyword, 1);
      
      if (sampleVideos.length > 0 && sampleVideos[0].thumbnailUrl) {
        setNextKeywordThumbnail(sampleVideos[0].thumbnailUrl);
      } else {
        setNextKeywordThumbnail("");
      }
    } catch (err) {
      console.error("Error loading thumbnail:", err);
      setNextKeywordThumbnail("");
    }
  };

  /**
   * Navigate to next keyword playlist
   */
  const handlePlayNextKeyword = () => {
    if (nextKeyword) {
      navigate(`?keywords=${encodeURIComponent(nextKeyword)}`);
    }
  };

  /**
   * Navigation handlers
   */
  const handleNext = () => {
    if (currentVideoIndex < videoQueue.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setIsPlaying(true);
    }
  };

  const handlePrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      setIsPlaying(true);
    }
  };

  /**
   * Handle video end event
   */
  const handleVideoEnd = () => {
    setTimeout(() => {
      if (currentVideoIndex < videoQueue.length - 1) {
        setCurrentVideoIndex(currentVideoIndex + 1);
      } else {
        setPlaylistEnded(true);
      }
    }, 500);
  };

  /**
   * Player control handlers
   */
  const handlePlayVideo = () => setIsPlaying(true);
  const handlePauseVideo = () => setIsPlaying(false);
  const handleTimeUpdate = (time) => setCurrentTime(time);

  /**
   * Playlist navigation handlers
   */
  const handlePlaylistPrevious = () => {
    setPlaylistStartIndex(Math.max(0, playlistStartIndex - 1));
  };

  const handlePlaylistNext = () => {
    const maxStartIndex = Math.max(0, videoQueue.length - itemsPerView);
    setPlaylistStartIndex(Math.min(maxStartIndex, playlistStartIndex + 1));
  };

  /**
   * Get current video
   */
  const getCurrentVideo = () => {
    if (!videoQueue.length || currentVideoIndex >= videoQueue.length) {
      return null;
    }
    return videoQueue[currentVideoIndex];
  };

  // Loading state - only show for initial load, not background loading
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
        <p className="text-gray-600">Loading first video...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const currentVideo = getCurrentVideo();

  return (
    <div className="w-full min-h-screen overflow-hidden" style={{backgroundColor: '#EBEAE9'}}>
      {/* Header */}
      <div className="w-full h-12 px-12 py-9 relative">
        {/* Back to Timeline button */}
        <div className="absolute right-12 top-9">
          <div className="text-stone-900 text-base font-light font-mono cursor-pointer hover:opacity-80"
               onClick={() => navigate('/')}>
            Back to Timeline
          </div>
        </div>
        
        {/* Project title */}
        <div className="w-full h-11 absolute left-12 top-10">
          <div className="inline-flex justify-center items-center gap-2.5">
            <div className="justify-start">
              <span className="text-stone-900 text-4xl font-normal" style={{fontFamily: 'Source Serif Pro, serif'}}>Civil Rights </span>
              <span className="text-stone-900 text-4xl font-bold leading-9" style={{fontFamily: 'Source Serif Pro, serif'}}>History Project</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header divider */}
      <div className="w-full h-px bg-black mx-12" style={{width: 'calc(100% - 6rem)'}} />

      {/* Metadata and Next Timeline Event - positioned under header */}
      <div className="px-12 pt-4 flex justify-between items-center">
        {/* Chapters/Interviews metadata */}
        <div className="flex items-center gap-4 text-red-500 text-base font-light font-mono">
          <span>{totalClipsForKeyword} Chapters from {videoQueue.length > 0 ? videoQueue.length : '0'} Interviews</span>
          {backgroundLoading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
              <span className="text-sm">Loading remaining clips...</span>
            </div>
          )}
        </div>
        
        {/* Next Timeline Event */}
        <div className="inline-flex items-center gap-2.5 cursor-pointer hover:opacity-80" onClick={handlePlayNextKeyword}>
          <div className="text-red-500 text-base font-light font-mono">
            {nextKeyword ? `Next: ${nextKeyword}` : 'Next Timeline Event'}
          </div>
          <div className="w-3.5 h-2.5 border border-red-500" />
        </div>
      </div>

      {/* Main content */}
      <div className="px-12 pt-4">
        {/* Topic title */}
        <div className="mb-8">
          <h1 className="text-stone-900 text-8xl font-medium mb-4" style={{fontFamily: 'Acumin Pro, Inter, sans-serif'}}>
            {keyword || 'Topic Playlist'}
          </h1>
        </div>

        {/* Main video and content area */}
        <div className="flex gap-6 mb-8">
          {/* Video player section */}
          <div className="flex-shrink-0">
            {/* Video player */}
            <div className="w-[960px] h-[540px] relative rounded-xl overflow-hidden mb-4">
              {currentVideo ? (
                <VideoPlayer
                  video={currentVideo}
                  onVideoEnd={handleVideoEnd}
                  onPlay={handlePlayVideo}
                  onPause={handlePauseVideo}
                  onTimeUpdate={handleTimeUpdate}
                  isPlaying={isPlaying}
                  seekToTime={seekToTime}
                />
              ) : (
                <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white text-xl">
                  No video available
                </div>
              )}
            </div>
            
            {/* Controls under video player */}
            <div className="flex justify-between items-center">
              {/* View Topic Tags - left aligned */}
              <div className="inline-flex items-center gap-3 cursor-pointer hover:opacity-80">
                <div className="text-stone-900 text-xl font-light font-mono">View Topic Tags</div>
                <img src={DownArrowIcon} alt="Expand" className="w-3 h-2" />
              </div>

              {/* Navigation buttons - right aligned */}
              <div className="flex items-center gap-8">
                {/* Previous Chapter */}
                <div className="w-48 h-6 cursor-pointer hover:opacity-80" onClick={handlePrevious}>
                  <div className="inline-flex justify-between items-center w-full">
                    <img src={ArrowLeftIcon} alt="Previous" className="w-5 h-4" />
                    <div className="text-stone-900 text-xl font-light font-mono">Prev. Chapter</div>
                  </div>
                </div>

                {/* Next Chapter */}
                <div className="w-44 h-6 cursor-pointer hover:opacity-80" onClick={handleNext}>
                  <div className="inline-flex justify-between items-center w-full">
                    <div className="text-stone-900 text-xl font-light font-mono">Next Chapter</div>
                    <img src={ArrowRightIcon} alt="Next" className="w-5 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side content */}
          <div className="flex-1 pt-0">
            {currentVideo && (
              <>
                {/* Interviewee names */}
                <div className="mb-6">
                  <h2 className="text-black text-5xl font-semibold" style={{fontFamily: 'Inter, sans-serif'}}>
                    {currentVideo.name}
                  </h2>
                </div>

                {/* Watch Full Interview link */}
                <div className="mb-8 inline-flex items-center gap-2.5 cursor-pointer hover:opacity-80"
                     onClick={() => navigate(`/interview-player?documentName=${encodeURIComponent(currentVideo.documentName)}`)}>
                  <div className="text-red-500 text-base font-light font-mono">Watch Full Interview</div>
                  <div className="w-3.5 h-2.5 border border-red-500" />
                </div>

                {/* Description */}
                <div className="text-black text-2xl font-normal leading-relaxed" style={{fontFamily: 'FreightText Pro, serif'}}>
                  {currentVideo.summary}
                </div>
              </>
            )}
          </div>
        </div>



        {/* Event Playlist */}
        <div className="w-full">
          <div className="mb-14">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-black text-5xl font-medium" style={{fontFamily: 'Inter, sans-serif'}}>Event Playlist</h2>
              {/* Playlist navigation arrows */}
              <div className="flex items-center gap-4">
                <button 
                  className="cursor-pointer hover:opacity-80 disabled:opacity-30" 
                  onClick={handlePlaylistPrevious}
                  disabled={playlistStartIndex === 0}
                >
                  <img src={SimpleArrowLeftIcon} alt="Previous" className="w-4 h-7" />
                </button>
                <button 
                  className="cursor-pointer hover:opacity-80 disabled:opacity-30" 
                  onClick={handlePlaylistNext}
                  disabled={playlistStartIndex >= Math.max(0, videoQueue.length - itemsPerView)}
                >
                  <img src={SimpleArrowRightIcon} alt="Next" className="w-4 h-7" />
                </button>
              </div>
            </div>
            
            {/* Playlist items */}
            <div className="flex gap-6 overflow-hidden">
              {videoQueue.slice(playlistStartIndex, playlistStartIndex + itemsPerView + (playlistStartIndex + itemsPerView < videoQueue.length ? 1 : 0)).map((video, relativeIndex) => {
                const index = playlistStartIndex + relativeIndex;
                return (
                <div key={video.id} 
                     className="flex-shrink-0 w-[504px] cursor-pointer hover:opacity-80"
                     onClick={() => setCurrentVideoIndex(index)}>
                  <div className="flex flex-col items-center gap-3">
                    {/* Video thumbnail */}
                    <div className="w-[504px] h-72 bg-zinc-300 rounded overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img className="w-full h-full object-cover" src={video.thumbnailUrl} alt={video.name} />
                      ) : (
                        <div className="w-full h-full bg-zinc-300" />
                      )}
                    </div>
                    
                    {/* Video info */}
                    <div className="w-full h-16 relative">
                      <div className="absolute left-0 bottom-0 text-stone-900 text-base font-light font-mono">
                        {video.roleSimplified} | {(() => {
                          // Calculate clip length from timestamp
                          try {
                            const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);
                            if (startSeconds !== undefined && endSeconds !== undefined) {
                              const durationSeconds = endSeconds - startSeconds;
                              const minutes = Math.floor(durationSeconds / 60);
                              const seconds = Math.floor(durationSeconds % 60);
                              return `${minutes}:${seconds.toString().padStart(2, '0')} Minutes`;
                            }
                          } catch (error) {
                            console.error('Error parsing timestamp:', error);
                          }
                          return video.clipLength || video.duration || '-- Minutes';
                        })()}
                      </div>
                      <div className="w-full absolute top-0 left-0 text-stone-900 text-4xl font-bold font-['Source_Serif_4']">
                        {video.name}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
              
              {/* Background loading indicator for remaining videos */}
              {backgroundLoading && (
                <div className="flex-shrink-0 w-[504px] flex flex-col items-center justify-center gap-3">
                  <div className="w-[504px] h-72 bg-zinc-200 rounded overflow-hidden flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-400" />
                  </div>
                  <div className="text-zinc-500 text-base font-light font-mono">
                    Loading more clips...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistBuilder;