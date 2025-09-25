/**
 * @fileoverview PlaylistBuilder component for creating and playing keyword-based playlists.
 * 
 * This component provides a robust interface for creating, viewing, and controlling playlists
 * of video clips based on keywords from the Civil Rights History Collection. It includes
 * functionality for playlist navigation, clip management, video playback control, and
 * discovering related content.
 */

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { parseKeywords, extractVideoId, parseTimestampRange } from "../utils/timeUtils";
import VideoPlayer from "../components/VideoPlayer";

/**
 * PlaylistBuilder - Advanced component for building and playing keyword-based playlists
 * 
 * This component:
 * 1. Retrieves and manages video clips based on keyword search
 * 2. Provides a custom video player with playlist navigation
 * 3. Allows users to manage playlist content (add clips, shuffle)
 * 4. Suggests related content for discovery
 * 5. Provides an "Up Next" feature for continuous viewing across keywords
 * 
 * URL Parameters:
 * - keywords: The keyword(s) to search for, separated by commas
 * 
 * @returns {React.ReactElement} The playlist builder interface
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
  const [error, setError] = useState(null);
  const [totalClipsForKeyword, setTotalClipsForKeyword] = useState(0);
  
  // Player control states
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playlistTime, setPlaylistTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [seekToTime, setSeekToTime] = useState(null);
  
  // UI state
  
  // "Up Next" feature state
  const [availableKeywords, setAvailableKeywords] = useState([]);
  const [keywordCounts, setKeywordCounts] = useState({});
  const [nextKeyword, setNextKeyword] = useState("");
  const [nextKeywordThumbnail, setNextKeywordThumbnail] = useState("");
  const [playlistEnded, setPlaylistEnded] = useState(false);
  
  // Refs for managing timeouts
  const autoplayTimeoutRef = useRef(null);

  /**
   * Calculate total playlist duration when videoQueue changes
   */
  useEffect(() => {
    if (videoQueue.length > 0) {
      const calculatedDuration = videoQueue.reduce((total, video) => {
        const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);
        return total + (endSeconds - startSeconds || 300);
      }, 0);
      console.log("Calculated total duration:", calculatedDuration);
      setTotalDuration(calculatedDuration);
    }
  }, [videoQueue]);

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
   * Trigger video search when keyword changes
   */
  useEffect(() => {
    if (keyword) {
      // Only run searchVideos when the keyword changes, not when keywordCounts changes
      console.log(`Searching videos for: ${keyword}`);
      searchVideos();
    }
  }, [keyword]);

  /**
   * Update total clips count for the current keyword
   */
  useEffect(() => {
    if (keyword && keywordCounts[keyword]) {
      setTotalClipsForKeyword(keywordCounts[keyword]);
    } else if (keyword) {
      // If we don't have the count yet, we'll get it in fetchAvailableKeywords
      countTotalClipsForKeyword(keyword);
    }
  }, [keyword, keywordCounts]);

  /**
   * Count total clips available for a specific keyword
   * 
   * @param {string} keyword - The keyword to count clips for
   */
  const countTotalClipsForKeyword = async (keyword) => {
    if (!keyword) return;

    try {
      let count = 0;
      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));

      for (const interviewDoc of interviewsSnapshot.docs) {
        const interviewId = interviewDoc.id;
        const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
        const querySnapshot = await getDocs(subSummariesRef);

        querySnapshot.forEach((docSnapshot) => {
          const subSummary = docSnapshot.data();
          const documentKeywords = (subSummary.keywords || "").split(",").map(k => k.trim().toLowerCase());
          if (documentKeywords.includes(keyword.toLowerCase())) {
            count++;
          }
        });
      }

      console.log(`Total clips for keyword "${keyword}": ${count}`);
      setTotalClipsForKeyword(count);

      // Also update the keywordCounts state for future reference
      setKeywordCounts(prev => ({
        ...prev,
        [keyword]: count
      }));
    } catch (err) {
      console.error("Error counting clips:", err);
    }
  };


  /**
   * Fetch all available keywords on component mount
   */
  useEffect(() => {
    fetchAvailableKeywords();
  }, []);

  /**
   * Select a new "up next" keyword when the available keywords change
   */
  useEffect(() => {
    if (availableKeywords.length > 0 && keyword) {
      selectRandomNextKeyword();
    }
  }, [availableKeywords, keyword, keywordCounts]);

  /**
   * Auto-navigate to next keyword playlist when current playlist ends
   */
  useEffect(() => {
    if (playlistEnded && nextKeyword) {
      // Clear any existing timeout
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current);
      }

      // Set a timeout to navigate to the next keyword after 3 seconds
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
   * Reset current time and seek state when changing videos
   */
  useEffect(() => {
    if (videoQueue.length > 0) {
      setCurrentTime(0);
      setSeekToTime(null); // Reset seek state when changing videos
      console.log("Video index changed to:", currentVideoIndex);
    }
  }, [currentVideoIndex]);

  /**
   * Handle time updates from the video player
   * 
   * @param {number} time - Current playback time in seconds
   */
  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  /**
   * Fetch all available keywords from Firestore and count their occurrences
   */
  const fetchAvailableKeywords = async () => {
    try {
      const keywordCounter = {};
      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));

      for (const interviewDoc of interviewsSnapshot.docs) {
        const interviewId = interviewDoc.id;
        const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
        const querySnapshot = await getDocs(subSummariesRef);

        querySnapshot.forEach((docSnapshot) => {
          const subSummary = docSnapshot.data();
          const documentKeywords = (subSummary.keywords || "").split(",").map(k => k.trim().toLowerCase());

          documentKeywords.forEach(keyword => {
            if (keyword) {
              keywordCounter[keyword] = (keywordCounter[keyword] || 0) + 1;
            }
          });
        });
      }

      // Filter to only include keywords with more than 1 occurrence
      const keywordsWithMultipleClips = Object.keys(keywordCounter).filter(
        keyword => keywordCounter[keyword] > 1
      );

      console.log(`Found ${keywordsWithMultipleClips.length} keywords with multiple clips out of ${Object.keys(keywordCounter).length} total keywords`);
      setAvailableKeywords(keywordsWithMultipleClips);
      setKeywordCounts(keywordCounter);
    } catch (err) {
      console.error("Error fetching available keywords:", err);
    }
  };

  /**
   * Select a random keyword for "up next" that has more than 1 clip
   */
  const selectRandomNextKeyword = () => {
    if (availableKeywords.length === 0) return;

    // Filter out the current keyword
    const filteredKeywords = availableKeywords.filter(k => k !== keyword);

    if (filteredKeywords.length === 0) return;

    // Select a random keyword
    const randomIndex = Math.floor(Math.random() * filteredKeywords.length);
    const selected = filteredKeywords[randomIndex];

    console.log(`Selected next keyword: ${selected} with ${keywordCounts[selected] || '?'} clips`);
    setNextKeyword(selected);

    // Try to get a thumbnail for this keyword
    fetchThumbnailForKeyword(selected);
  };

  /**
   * Fetch a thumbnail image URL for the next keyword
   * 
   * @param {string} keyword - Keyword to fetch thumbnail for
   */
  const fetchThumbnailForKeyword = async (keyword) => {
    try {
      const keywordsArray = parseKeywords(keyword);
      if (keywordsArray.length === 0) return;

      const sampleVideos = await fetchRelevantSegments(keywordsArray);

      if (sampleVideos.length > 0) {
        // Try to extract a thumbnail from the first video
        const firstVideo = sampleVideos[0];
        if (firstVideo.videoEmbedLink) {
          const videoId = extractVideoId(firstVideo.videoEmbedLink);
          if (videoId) {
            // Use YouTube thumbnail URL
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            setNextKeywordThumbnail(thumbnailUrl);
            return;
          }
        }
      }

      // If no thumbnail found, clear it
      setNextKeywordThumbnail("");
    } catch (err) {
      console.error("Error fetching thumbnail:", err);
      setNextKeywordThumbnail("");
    }
  };

  /**
   * Navigate to the next keyword playlist immediately
   */
  const handlePlayNextKeyword = () => {
    if (nextKeyword) {
      navigate(`?keywords=${encodeURIComponent(nextKeyword)}`);
    }
  };


  /**
   * Randomly shuffle an array using Fisher-Yates algorithm
   * 
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  const shuffleArray = (array) => {
    return array.sort(() => Math.random() - 0.5);
  };


  /**
   * Search for videos based on the current keyword
   * Includes validation and filtering of results
   */
  const searchVideos = async () => {
    try {
      setLoading(true);

      const keywordsArray = parseKeywords(keyword);
      if (keywordsArray.length === 0) {
        setError("Please enter at least one keyword");
        setLoading(false);
        return;
      }

      // Initial search with basic filtering
      let results = await fetchRelevantSegments(keywordsArray);

      if (results.length > 0) {
        // Basic timestamp validation first (fast)
        results = results.filter(video => {
          try {
            const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);

            // Filter out clips with obviously invalid timestamps
            if (isNaN(startSeconds) || startSeconds < 0) {
              console.warn(`Filtering out video with invalid start time: ${video.id}, ${video.timestamp}`);
              return false;
            }

            // We can't fully validate against video duration yet (need to load video first)
            // but we can check for basic validity
            if (endSeconds && endSeconds <= startSeconds) {
              console.warn(`Filtering out video with invalid time range: ${video.id}, ${video.timestamp}`);
              return false;
            }

            return true;
          } catch (error) {
            console.warn(`Filtering out video with unparseable timestamp: ${video.id}, ${video.timestamp}`);
            return false;
          }
        });

        // Get all relevant clips for the event playlist but start with just the first one
        const allClips = shuffleArray(results);

        if (allClips.length > 0) {
          console.log(`Found ${allClips.length} clips for the event playlist`);
          setVideoQueue(allClips);
          setCurrentVideoIndex(0);
          setIsPlaying(true);
          setCurrentTime(0);
          setPlaylistTime(0);
          setPlaylistEnded(false); // Reset playlist ended state
        } else {
          setError("No videos with valid timestamps found for this keyword");
        }
      } else {
        setError("No videos found for this keyword");
      }

      setLoading(false);
    } catch (err) {
      console.error("Error searching videos:", err);
      setError("Error searching videos");
      setLoading(false);
    }
  };

  /**
   * Fetch video segments from Firestore that match the given keywords
   * 
   * @param {string[]} keywordsArray - Array of keywords to search for
   * @returns {Promise<Array>} Array of matching video segments
   */
  const fetchRelevantSegments = async (keywordsArray) => {
    const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));
    const results = [];

    for (const interviewDoc of interviewsSnapshot.docs) {
      const interviewId = interviewDoc.id;
      const interviewData = interviewDoc.data();

      // Get the parent document's videoEmbedLink for thumbnails
      const parentVideoEmbedLink = interviewData.videoEmbedLink;
      const thumbnailUrl = parentVideoEmbedLink ?
        `https://img.youtube.com/vi/${extractVideoId(parentVideoEmbedLink)}/mqdefault.jpg` : null;

      const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
      const querySnapshot = await getDocs(subSummariesRef);

      querySnapshot.forEach((docSnapshot) => {
        const subSummary = docSnapshot.data();
        const documentKeywords = (subSummary.keywords || "").split(",").map(k => k.trim().toLowerCase());
        const hasMatch = keywordsArray.some(kw => documentKeywords.includes(kw));
        if (hasMatch) {
          results.push({
            id: docSnapshot.id,
            documentName: interviewId,
            ...subSummary,
            ...interviewData,
            thumbnailUrl // Use the parent document's videoEmbedLink for thumbnails
          });
        }
      });
    }
    return results;
  };

  /**
   * Navigate to the next video in the queue
   */
  const handleNext = () => {
    if (currentVideoIndex < videoQueue.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setIsPlaying(true);
    }
  };

  /**
   * Navigate to the previous video in the queue
   */
  const handlePrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      setIsPlaying(true);
    }
  };

  /**
   * Handle video end event from the player
   * Advances to next video or marks playlist as ended
   */
  const handleVideoEnd = () => {
    console.log(`Video end triggered for index ${currentVideoIndex}/${videoQueue.length - 1}`);

    // Add a short delay before advancing to prevent rapid transitions
    // that might cause clips to be skipped
    setTimeout(() => {
      if (currentVideoIndex < videoQueue.length - 1) {
        // Move to the next video in the queue
        console.log(`Advancing to next video: ${currentVideoIndex + 1}`);
        setCurrentVideoIndex(currentVideoIndex + 1);
      } else {
        // This was the last video in the playlist
        console.log("Playlist ended, preparing to play next keyword");
        setPlaylistEnded(true);
      }
    }, 500);
  };

  /**
   * Play control handler
   */
  const handlePlayVideo = () => {
    setIsPlaying(true);
  };

  /**
   * Pause control handler
   */
  const handlePauseVideo = () => {
    setIsPlaying(false);
  };

  /**
   * Get the current video from the queue based on currentVideoIndex
   * 
   * @returns {Object|null} Current video object or null if queue is empty
   */
  const getCurrentVideo = () => {
    if (!videoQueue.length || currentVideoIndex >= videoQueue.length) {
      return null;
    }
    return videoQueue[currentVideoIndex];
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
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
    <div className="w-full min-h-screen bg-gray-200 overflow-hidden">
      {/* Header */}
      <div className="w-full h-12 px-12 py-9 relative">
        <div className="w-12 h-12 absolute right-12 top-9">
          <div className="w-6 h-6 absolute right-0 top-3 transform rotate-180 border border-stone-900" />
        </div>
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

      {/* Main content */}
      <div className="px-12 pt-16">
        {/* Topic title and metadata */}
        <div className="mb-8">
          <div className="text-red-500 text-base font-light font-mono mb-2">
            {totalClipsForKeyword} Chapters from {videoQueue.length > 0 ? videoQueue.length : '0'} Interviews
          </div>
          <h1 className="text-stone-900 text-8xl font-medium mb-4" style={{fontFamily: 'Acumin Pro, Inter, sans-serif'}}>
            {keyword || 'Topic Playlist'}
          </h1>
        </div>

        {/* Main video and content area */}
        <div className="flex gap-6 mb-20">
          {/* Video player */}
          <div className="flex-shrink-0">
            <div className="w-[1080px] h-[610px] relative rounded-xl overflow-hidden">
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

        {/* Navigation controls */}
        <div className="flex justify-between items-center mb-12">
          {/* View Topic Tags */}
          <div className="inline-flex items-center gap-3 cursor-pointer hover:opacity-80">
            <div className="text-stone-900 text-xl font-light font-mono">View Topic Tags</div>
            <div className="w-1 h-2.5 transform rotate-90 border border-stone-900" />
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-8">
            {/* Previous Chapter */}
            <div className="w-48 h-6 cursor-pointer hover:opacity-80" onClick={handlePrevious}>
              <div className="inline-flex justify-between items-center w-full">
                <div className="w-4 h-3 transform rotate-180 border border-stone-900" />
                <div className="text-stone-900 text-xl font-light font-mono">Prev. Chapter</div>
              </div>
            </div>

            {/* Next Chapter */}
            <div className="w-44 h-6 cursor-pointer hover:opacity-80" onClick={handleNext}>
              <div className="inline-flex justify-between items-center w-full">
                <div className="text-stone-900 text-xl font-light font-mono">Next Chapter</div>
                <div className="w-4 h-3 border border-stone-900" />
              </div>
            </div>
          </div>

          {/* Next Timeline Event */}
          <div className="inline-flex items-center gap-2.5 cursor-pointer hover:opacity-80" onClick={handlePlayNextKeyword}>
            <div className="text-red-500 text-base font-light font-mono">Next Timeline Event</div>
            <div className="w-3.5 h-2.5 border border-red-500" />
          </div>

          {/* Back to Timeline */}
          <div className="text-stone-900 text-base font-light font-mono cursor-pointer hover:opacity-80"
               onClick={() => navigate('/')}>
            Back to Timeline
          </div>
        </div>

        {/* Event Playlist */}
        <div className="w-full">
          <div className="mb-14">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-black text-5xl font-medium" style={{fontFamily: 'Inter, sans-serif'}}>Event Playlist</h2>
              {/* Playlist navigation arrows */}
              <div className="flex items-center gap-4">
                <div className="w-3 h-6 cursor-pointer hover:opacity-80">
                  <div className="w-3 h-6 transform rotate-180 border-2 border-stone-900" />
                </div>
                <div className="w-3 h-6 cursor-pointer hover:opacity-80">
                  <div className="w-3 h-6 border-2 border-stone-900" />
                </div>
              </div>
            </div>
            
            {/* Playlist items */}
            <div className="flex gap-6 overflow-x-auto">
              {videoQueue.map((video, index) => (
                <div key={video.id} 
                     className={`flex-shrink-0 w-[504px] cursor-pointer hover:opacity-80 ${index === currentVideoIndex ? 'opacity-100' : 'opacity-60'}`}
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
                        {video.role} | {video.duration || '-- Minutes'}
                      </div>
                      <div className="w-full absolute top-0 left-0 text-stone-900 text-4xl font-bold" style={{fontFamily: 'Source Serif 4, serif'}}>
                        {video.name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistBuilder;