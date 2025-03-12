import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { parseKeywords, extractVideoId, parseTimestampRange } from "../utils/timeUtils";
import IntegratedTimeline from "../components/IntegratedTimeline";
import PlayerControls from "../components/PlayerControls";
import UpNextBox from "../components/UpNextBox";
import ShuffleButton from "../components/ShuffleButton";
import ConfirmationModal from "../components/ConfirmationModel";
import MetadataPanel from "../components/MetadataPanel";
import RelatedClips from "../components/RelatedClips";
import VideoPlayer from "../components/VideoPlayer";
import { Clock, Tag } from 'lucide-react'


const PlaylistBuilder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [videoQueue, setVideoQueue] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playlistTime, setPlaylistTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [showShuffleConfirmation, setShowShuffleConfirmation] = useState(false);
  const [seekToTime, setSeekToTime] = useState(null); // New state for seeking
  const [showAddedNotification, setShowAddedNotification] = useState(false); // For notification
  const notificationTimeoutRef = useRef(null); // Reference for timeout
  const [isAddingAllClips, setIsAddingAllClips] = useState(false);

  const [totalClipsForKeyword, setTotalClipsForKeyword] = useState(0);

  // Up Next feature state
  const [availableKeywords, setAvailableKeywords] = useState([]);
  const [keywordCounts, setKeywordCounts] = useState({}); // Track count of clips per keyword
  const [nextKeyword, setNextKeyword] = useState("");
  const [nextKeywordThumbnail, setNextKeywordThumbnail] = useState("");
  const [playlistEnded, setPlaylistEnded] = useState(false);

  const autoplayTimeoutRef = useRef(null);

  // Calculate total duration when videoQueue changes
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

  // Set keyword from URL params
  useEffect(() => {
    const keywordParam = searchParams.get("keywords");
    if (keywordParam) {
      console.log(`Found keyword: ${keywordParam}`);
      setKeyword(keywordParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (keyword) {
      // Only run searchVideos when the keyword changes, not when keywordCounts changes
      console.log(`Searching videos for: ${keyword}`);
      searchVideos();
    }
  }, [keyword]);

  useEffect(() => {
    if (keyword && keywordCounts[keyword]) {
      setTotalClipsForKeyword(keywordCounts[keyword]);
    } else if (keyword) {
      // If we don't have the count yet, we'll get it in fetchAvailableKeywords
      countTotalClipsForKeyword(keyword);
    }
  }, [keyword, keywordCounts]);

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

  // Clear notification timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Handle adding a clip to the playlist
  const handleAddToPlaylist = (clip) => {
    // Check if the clip is already in the queue
    const isAlreadyInQueue = videoQueue.some(video => video.id === clip.id);

    if (isAlreadyInQueue) {
      console.log("Clip is already in the playlist:", clip.id);
      // Show notification
      setShowAddedNotification({ message: "This clip is already in your playlist", type: "info" });

      // Clear after 3 seconds
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      notificationTimeoutRef.current = setTimeout(() => {
        setShowAddedNotification(false);
      }, 3000);

      return;
    }

    // Add the clip to the queue
    setVideoQueue(prevQueue => [...prevQueue, clip]);

    // Show success notification
    setShowAddedNotification({ message: "Clip added to playlist", type: "success" });

    // Clear notification after 3 seconds
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setShowAddedNotification(false);
    }, 3000);

    console.log("Added clip to playlist:", clip.id);
  };

  const handleAddAllToPlaylist = async () => {
    // Prevent multiple clicks
    if (isAddingAllClips) return;

    try {
      // Show loading state
      setIsAddingAllClips(true);

      // Get all clips for the current keyword
      const keywordsArray = parseKeywords(keyword);
      const allClips = await fetchRelevantSegments(keywordsArray);

      // Filter out clips that are already in the queue
      const existingIds = videoQueue.map(clip => clip.id);
      const newClips = allClips.filter(clip => !existingIds.includes(clip.id));

      if (newClips.length === 0) {
        // Show notification that all clips are already in playlist
        setShowAddedNotification({
          message: "All available clips are already in your playlist",
          type: "info"
        });
      } else {
        // Add all new clips to the queue
        setVideoQueue(prevQueue => [...prevQueue, ...newClips]);

        // Show success notification
        setShowAddedNotification({
          message: `Added ${newClips.length} clips to playlist`,
          type: "success"
        });
      }

      // Clear notification after 3 seconds
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      notificationTimeoutRef.current = setTimeout(() => {
        setShowAddedNotification(false);
      }, 3000);

    } catch (error) {
      console.error("Error adding all clips:", error);
      setShowAddedNotification({
        message: "Error adding clips to playlist",
        type: "error"
      });
    } finally {
      // Reset loading state regardless of outcome
      setIsAddingAllClips(false);
    }
  };

  // Fetch all available keywords when component mounts
  useEffect(() => {
    fetchAvailableKeywords();
  }, []);

  // Select a new "up next" keyword when the available keywords change
  useEffect(() => {
    if (availableKeywords.length > 0 && keyword) {
      selectRandomNextKeyword();
    }
  }, [availableKeywords, keyword, keywordCounts]);

  // Auto-navigate to next keyword playlist when current playlist ends
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

  // Reset current time and seek state when changing videos
  useEffect(() => {
    if (videoQueue.length > 0) {
      setCurrentTime(0);
      setSeekToTime(null); // Reset seek state when changing videos
      console.log("Video index changed to:", currentVideoIndex);
    }
  }, [currentVideoIndex]);

  // Function to calculate elapsed time up to current video
  const calculateElapsedTimeBeforeCurrent = () => {
    if (!videoQueue.length) return 0;

    let elapsed = 0;
    for (let i = 0; i < currentVideoIndex; i++) {
      const { startSeconds, endSeconds } = parseTimestampRange(videoQueue[i].timestamp);
      elapsed += (endSeconds - startSeconds) || 300;
    }

    return elapsed;
  };

  // Handle time updates from the video player
  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
    // Update playlist time based on elapsed time
    setPlaylistTime(calculateElapsedTimeBeforeCurrent() + time);
  };

  // Handle seeking within current video
  const handleSeek = (timeToSeek) => {
    console.log(`Seeking to ${timeToSeek}s within current video`);
    setSeekToTime(timeToSeek);
    // No need to update currentTime here, it will be updated via handleTimeUpdate
  };

  // Fetch all available keywords from Firestore and count their occurrences
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

  // Select a random keyword for "up next" that has more than 1 clip
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

  // Fetch a thumbnail for the next keyword
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

  // Handle playing the next keyword immediately
  const handlePlayNextKeyword = () => {
    if (nextKeyword) {
      navigate(`?keywords=${encodeURIComponent(nextKeyword)}`);
    }
  };

  // Handle the initial shuffle button click
  const handleShuffleClick = () => {
    setShowShuffleConfirmation(true);
  };

  // Handle shuffle confirmation
  const handleShuffleConfirm = () => {
    setShowShuffleConfirmation(false);
    // Use the existing search function which already includes shuffle logic
    searchVideos();
  };

  // Handle cancellation
  const handleShuffleCancel = () => {
    setShowShuffleConfirmation(false);
  };

  // Handle metadata updates from the MetadataPanel
  const handleMetadataUpdate = (updatedMetadata) => {
    // Update the video in the queue
    setVideoQueue(prevQueue => {
      const newQueue = [...prevQueue];
      newQueue[currentVideoIndex] = {
        ...newQueue[currentVideoIndex],
        ...updatedMetadata
      };
      return newQueue;
    });
  };

  // Utility function to shuffle an array
  const shuffleArray = (array) => {
    return array.sort(() => Math.random() - 0.5);
  };

  // Utility function to get video duration from YouTube
  const getYouTubeVideoDuration = async (videoId) => {
    // Use YouTube Data API if available, or fallback to loading video and checking
    return new Promise((resolve) => {
      try {
        // Create a temporary player to check duration
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        document.body.appendChild(tempContainer);

        const tempPlayer = new window.YT.Player(tempContainer, {
          height: '1',
          width: '1',
          videoId,
          events: {
            onReady: (event) => {
              try {
                const duration = event.target.getDuration();
                console.log(`Got duration for video ${videoId}: ${duration}s`);
                resolve(duration);
              } catch (error) {
                console.error(`Error getting duration for ${videoId}:`, error);
                resolve(0); // On error, return 0 which will be handled appropriately
              } finally {
                // Clean up
                if (tempPlayer) {
                  try {
                    tempPlayer.destroy();
                  } catch (e) {
                    console.error("Error destroying temp player:", e);
                  }
                }
                if (tempContainer.parentNode) {
                  document.body.removeChild(tempContainer);
                }
              }
            },
            onError: () => {
              console.error(`Could not load video ${videoId} for duration check`);
              if (tempContainer.parentNode) {
                document.body.removeChild(tempContainer);
              }
              resolve(0);
            }
          }
        });

        // Set timeout to avoid hanging
        setTimeout(() => {
          if (tempPlayer) {
            try {
              tempPlayer.destroy();
            } catch (e) {
              console.error("Error destroying temp player on timeout:", e);
            }
          }
          if (tempContainer.parentNode) {
            document.body.removeChild(tempContainer);
          }
          resolve(0);
        }, 10000); // 10-second timeout

      } catch (error) {
        console.error("Error in duration check:", error);
        resolve(0);
      }
    });
  };

  // Function to validate a video's timestamp against actual duration
  const validateVideoTimestamp = async (video) => {
    try {
      const videoId = extractVideoId(video.videoEmbedLink);
      if (!videoId) return false;

      const { startSeconds } = parseTimestampRange(video.timestamp);
      if (isNaN(startSeconds) || startSeconds < 0) return false;

      // Ensure YouTube API is loaded
      if (!window.YT || !window.YT.Player) {
        console.warn("YouTube API not loaded yet, can't validate duration");
        return true; // Skip validation if API not available
      }

      // Get video duration
      const duration = await getYouTubeVideoDuration(videoId);

      // Allow some margin (5 seconds) for timing differences
      const isValid = duration > 0 && startSeconds < (duration - 5);

      if (!isValid) {
        console.warn(`Invalid timestamp detected: ${video.timestamp} exceeds video duration ${duration}s for video ID ${videoId}`);
      }

      return isValid;
    } catch (error) {
      console.error("Error validating video timestamp:", error);
      return false;
    }
  };

  // Search for videos
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

        // Shuffle and get more candidates than we need, in case some fail validation
        const candidates = shuffleArray(results).slice(0, Math.min(10, results.length));

        console.log(`Checking durations for ${candidates.length} candidate videos...`);

        // Load YouTube API if needed
        if (!window.YT || !window.YT.Player) {
          console.log("Loading YouTube API...");
          await new Promise((resolve) => {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";

            window.onYouTubeIframeAPIReady = () => {
              console.log("YouTube API ready");
              resolve();
            };

            const firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            // Set timeout to resolve anyway after 5 seconds
            setTimeout(resolve, 5000);
          });
        }

        // Advanced validation: check actual video durations
        const validatedResults = [];

        for (const video of candidates) {
          // Check if we already have enough valid videos
          if (validatedResults.length >= 3) break;

          // Validate this video's timestamp against actual duration
          const isValid = await validateVideoTimestamp(video);

          if (isValid) {
            validatedResults.push(video);
          }
        }

        if (validatedResults.length > 0) {
          console.log(`Selected ${validatedResults.length} valid videos from ${candidates.length} candidates`);
          setVideoQueue(validatedResults);
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

  // Fetch video segments from Firestore
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

  // Player navigation
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

  // Video end handler
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

  // Play/Pause control
  const handlePlayVideo = () => {
    setIsPlaying(true);
  };

  const handlePauseVideo = () => {
    setIsPlaying(false);
  };

  // Get current video information
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
  const hasVideos = videoQueue.length > 0;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">

      {/* Notification */}
      {showAddedNotification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-md shadow-md transition-all duration-300 ${showAddedNotification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
          <div className="flex items-center">
            {showAddedNotification.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
            )}
            <span>{showAddedNotification.message}</span>
          </div>
        </div>
      )}

      {/* Updated Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {keyword}
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-blue-800 font-medium">
              {totalClipsForKeyword} total clip{totalClipsForKeyword !== 1 ? 's' : ''} available
            </span>
            <span className="mx-2 text-gray-400">•</span>
            <span className="text-gray-600">
              {videoQueue.length} clip{videoQueue.length !== 1 ? 's' : ''} in current playlist
            </span>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative">
        {/* UpNext Box positioned to the right */}
        {nextKeyword && (
          <div className="absolute top-0 right-0 z-10">
            <UpNextBox
              nextKeyword={nextKeyword}
              thumbnailUrl={nextKeywordThumbnail}
              onPlay={handlePlayNextKeyword}
            />
          </div>
        )}

        {/* Video Player Container */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {/* Video player */}
          <div className="w-full max-w-2xl mx-auto relative rounded-lg overflow-hidden">
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
              <div className="flex items-center justify-center w-full h-64 bg-gray-200 rounded-lg text-gray-600 font-medium">
                No videos available
              </div>
            )}
          </div>

          {/* Timeline */}
          {hasVideos && (
            <div className="mt-6 mb-4 w-full max-w-2xl mx-auto">
              <IntegratedTimeline
                videoQueue={videoQueue}
                currentVideoIndex={currentVideoIndex}
                setCurrentVideoIndex={setCurrentVideoIndex}
                currentTime={currentTime}
                totalDuration={totalDuration}
                onSeek={handleSeek}
              />
            </div>
          )}

          {/* Integrated player controls */}
          <div className="w-full max-w-2xl mx-auto py-3 mt-5">
            {/* Main playback controls */}
            <div className="flex justify-center items-center mb-4">
              <PlayerControls
                onPrevious={handlePrevious}
                onPlay={handlePlayVideo}
                onPause={handlePauseVideo}
                onNext={handleNext}
                isPlaying={isPlaying}
                hasPrevious={currentVideoIndex > 0}
                hasNext={currentVideoIndex < videoQueue.length - 1}
              />
            </div>

            {/* Additional controls below */}
            <div className="flex justify-center items-center space-x-4">
              <ShuffleButton onClick={handleShuffleClick} />

              <button
                onClick={handleAddAllToPlaylist}
                disabled={isAddingAllClips}
                className={`flex items-center justify-center ${isAddingAllClips
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                  } text-white px-4 py-2 rounded-md text-sm font-medium transition-colors w-44`}
                title="Add all remaining clips with this keyword to your playlist"
              >
                {isAddingAllClips ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  "Listen to Full Playlist"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Add the Metadata Panel with edit capability */}
        {currentVideo && (
          <MetadataPanel
            metadata={currentVideo}
            onMetadataUpdate={handleMetadataUpdate}
          />
        )}

        {/* Video info card */}
        {currentVideo && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              <span
                onClick={() => navigate(`/interview-player?documentName=${encodeURIComponent(currentVideo.documentName)}`)}
                className="hover:text-blue-600 hover:underline transition-colors cursor-pointer"
              >
                {currentVideo.name}
              </span>
            </h2>

            <p className="text-sm italic text-gray-500 mb-4">
              {currentVideo.role}
            </p>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <p className="m-0 text-base leading-relaxed text-gray-700">
                {currentVideo.summary}
              </p>
            </div>

            {/* Keywords */}
            {currentVideo.keywords && currentVideo.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(Array.isArray(currentVideo.keywords)
                  ? currentVideo.keywords
                  : currentVideo.keywords.split(',').map(k => k.trim())
                ).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1 cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={() => navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`)}
                  >
                    <Tag size={12} /> {keyword}
                  </span>
                ))}
              </div>
            )}

            {/* Link to standalone ClipPlayer view */}
            <div className="mt-4">
              <button
                className="text-sm text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                onClick={() =>
                  navigate(`/clip-player?documentName=${encodeURIComponent(currentVideo.documentName)}&clipId=${encodeURIComponent(currentVideo.id)}`)
                }
              >
                ▶ View this clip as a standalone page
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Related Clips Section */}
      {keyword && videoQueue.length > 0 && (
        <RelatedClips
          currentKeyword={keyword}
          excludeIds={videoQueue.map(video => video.id)}
          onAddToPlaylist={handleAddToPlaylist}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showShuffleConfirmation}
        onConfirm={handleShuffleConfirm}
        onCancel={handleShuffleCancel}
        message="Are you sure you want to hear a new set of clips on this topic?"
      />
    </div>
  );
};

export default PlaylistBuilder;