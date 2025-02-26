import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { parseKeywords, extractVideoId, convertTimestampToSeconds, extractStartTimestamp, parseTimestampRange } from "../utils/timeUtils";
import IntegratedTimeline from "../components/IntegratedTimeline";
import PlayerControls from "../components/PlayerControls";
import UpNextBox from "../components/UpNextBox";

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

  // New state for Up Next feature
  const [availableKeywords, setAvailableKeywords] = useState([]);
  const [nextKeyword, setNextKeyword] = useState("");
  const [nextKeywordThumbnail, setNextKeywordThumbnail] = useState("");
  const [playlistEnded, setPlaylistEnded] = useState(false);

  const iframeRef = useRef(null);
  const timerRef = useRef(null);
  const lastTimeUpdateRef = useRef(Date.now());
  const autoplayTimeoutRef = useRef(null);

  useEffect(() => {
    // Debug total duration calculation
    if (videoQueue.length > 0) {
      const calculatedDuration = videoQueue.reduce((total, video) => {
        const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);
        return total + (endSeconds - startSeconds || 300);
      }, 0);
      console.log("Calculated total duration:", calculatedDuration);
      setTotalDuration(calculatedDuration);
    }
  }, [videoQueue]);

  // Get keyword from URL
  useEffect(() => {
    const keywordParam = searchParams.get("keywords");
    if (keywordParam) {
      console.log(`Found keyword: ${keywordParam}`);
      setKeyword(keywordParam);
    }
  }, [searchParams]);

  // Search videos when keyword changes
  useEffect(() => {
    if (keyword) {
      console.log(`Searching videos for: ${keyword}`);
      searchVideos();
    }
  }, [keyword]);

  // Fetch all available keywords when component mounts
  useEffect(() => {
    fetchAvailableKeywords();
  }, []);

  // Select a new "up next" keyword when the available keywords change
  useEffect(() => {
    if (availableKeywords.length > 0 && keyword) {
      selectRandomNextKeyword();
    }
  }, [availableKeywords, keyword]);

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

  // Timer for tracking time
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (videoQueue.length > 0 && isPlaying) {
      console.log("Starting timer for manual time tracking");

      timerRef.current = setInterval(() => {
        setCurrentTime((prevTime) => {
          const newTime = prevTime + 1; // Increment by 1 second

          // Update playlist time based on elapsed time
          setPlaylistTime(calculateElapsedTimeBeforeCurrent() + newTime);

          // Auto-advance if the video reaches the end
          const currentVideo = videoQueue[currentVideoIndex];
          if (currentVideo) {
            const { startSeconds, endSeconds } = parseTimestampRange(currentVideo.timestamp);
            const duration = endSeconds - startSeconds;

            if (newTime >= duration) {
              console.log("End of video reached, auto-advancing");

              // Check if this is the last video in the queue
              if (currentVideoIndex === videoQueue.length - 1) {
                console.log("Playlist ended, preparing to play next keyword");
                setPlaylistEnded(true);
                return newTime; // Keep the time to avoid auto-advancing
              } else {
                setTimeout(() => setCurrentVideoIndex((prev) => prev + 1), 500);
                return 0; // Reset time for the next video
              }
            }
          }

          return newTime;
        });
      }, 1000); // Update every second
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [videoQueue, currentVideoIndex, isPlaying]);

  // Update time tracking when changing videos
  useEffect(() => {
    if (videoQueue.length > 0) {
      // Reset current time in this video
      setCurrentTime(0);

      // But keep the playlist time, just update lastTimeUpdateRef
      lastTimeUpdateRef.current = Date.now();

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

  // Fetch all available keywords from Firestore
  const fetchAvailableKeywords = async () => {
    try {
      const allKeywords = new Set();
      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));

      for (const interviewDoc of interviewsSnapshot.docs) {
        const interviewId = interviewDoc.id;
        const subSummariesRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
        const querySnapshot = await getDocs(subSummariesRef);

        querySnapshot.forEach((docSnapshot) => {
          const subSummary = docSnapshot.data();
          const documentKeywords = (subSummary.keywords || "").split(",").map(k => k.trim().toLowerCase());

          documentKeywords.forEach(keyword => {
            if (keyword) allKeywords.add(keyword);
          });
        });
      }

      const keywordsArray = Array.from(allKeywords);
      console.log(`Found ${keywordsArray.length} total keywords:`, keywordsArray);
      setAvailableKeywords(keywordsArray);
    } catch (err) {
      console.error("Error fetching available keywords:", err);
    }
  };

  // Select a random keyword for "up next"
  const selectRandomNextKeyword = () => {
    if (availableKeywords.length === 0) return;

    // Filter out the current keyword
    const filteredKeywords = availableKeywords.filter(k => k !== keyword);

    if (filteredKeywords.length === 0) return;

    // Select a random keyword
    const randomIndex = Math.floor(Math.random() * filteredKeywords.length);
    const selected = filteredKeywords[randomIndex];

    console.log(`Selected next keyword: ${selected}`);
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

  // Utility function to shuffle an array
  const shuffleArray = (array) => {
    return array.sort(() => Math.random() - 0.5);
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

      let results = await fetchRelevantSegments(keywordsArray);

      if (results.length > 0) {
        // Shuffle and pick up to 3 random videos
        results = shuffleArray(results).slice(0, 3);

        console.log(`Selected ${results.length} random videos`);
        setVideoQueue(results);
        setCurrentVideoIndex(0);
        setIsPlaying(true);
        setCurrentTime(0);
        setPlaylistTime(0);
        lastTimeUpdateRef.current = Date.now();
        setPlaylistEnded(false); // Reset playlist ended state
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
            ...interviewData
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

  // Play/Pause control via postMessage API
  const handlePlayVideo = () => {
    if (!iframeRef.current) return;

    try {
      console.log("Play requested");
      const iframe = iframeRef.current;
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'playVideo'
      }), '*');

      setIsPlaying(true);
      lastTimeUpdateRef.current = Date.now(); // Reset time reference
    } catch (err) {
      console.error("Error playing video:", err);
    }
  };

  const handlePauseVideo = () => {
    if (!iframeRef.current) return;

    try {
      console.log("Pause requested");
      const iframe = iframeRef.current;
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'pauseVideo'
      }), '*');

      setIsPlaying(false);
    } catch (err) {
      console.error("Error pausing video:", err);
    }
  };

  // Get current video information
  const getCurrentVideo = () => {
    if (!videoQueue.length || currentVideoIndex >= videoQueue.length) {
      return null;
    }
    return videoQueue[currentVideoIndex];
  };

  // Get YouTube embed URL with enablejsapi=1 for postMessage control
  const getEmbedUrl = () => {
    const video = getCurrentVideo();
    if (!video) return '';

    try {
      const videoId = extractVideoId(video.videoEmbedLink);
      const [startRaw] = video.timestamp.split(" - ");
      const startSeconds = convertTimestampToSeconds(extractStartTimestamp(startRaw));

      // Direct YouTube embed URL with autoplay and start time, plus JS API enabled
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startSeconds}&controls=0&enablejsapi=1&origin=${window.location.origin}`;
    } catch (err) {
      console.error("Error getting embed URL:", err);
      return '';
    }
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
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Page header */}
      <div style={{
        marginBottom: '24px'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          Keyword Playlist
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            fontSize: '14px',
            fontWeight: '600',
            padding: '4px 12px',
            borderRadius: '6px'
          }}>
            {keyword}
          </span>
        </div>
      </div>

      {/* Main content area */}
      <div style={{ position: 'relative' }}>
        {/* UpNext Box positioned to the right */}
        {nextKeyword && (
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            zIndex: '10'
          }}>
            <UpNextBox
              nextKeyword={nextKeyword}
              thumbnailUrl={nextKeywordThumbnail}
              onPlay={handlePlayNextKeyword}
            />
          </div>
        )}

        {/* Video Player Container */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          {/* Video player */}
          <div style={{
            width: '100%',
            maxWidth: '720px',
            height: '480px',
            backgroundColor: '#000000',
            margin: '0 auto',
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {currentVideo ? (
              <iframe
                ref={iframeRef}
                src={getEmbedUrl()}
                width="720"
                height="480"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video player"
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%'
                }}
              ></iframe>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                color: '#ffffff',
                fontWeight: '500'
              }}>
                No videos available
              </div>
            )}
          </div>

          {/* Timeline */}
          {hasVideos && (
            <div style={{
              marginTop: '24px',
              marginBottom: '16px',
              width: '100%',
              maxWidth: '720px',
              margin: '24px auto 0'
            }}>
              <IntegratedTimeline
                videoQueue={videoQueue}
                currentVideoIndex={currentVideoIndex}
                setCurrentVideoIndex={setCurrentVideoIndex}
                currentTime={currentTime}
                totalDuration={totalDuration}
              />
            </div>
          )}
          
          {/* Integrated player controls */}
          <div style={{
            width: '100%',
            maxWidth: '720px',
            margin: '20px auto 0',
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 0'
          }}>
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
        </div>

        {/* Video info card */}
        {currentVideo && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 8px 0'
            }}>
              {currentVideo.name}
            </h2>
            <p style={{
              fontSize: '14px',
              fontStyle: 'italic',
              color: '#6b7280',
              margin: '0 0 16px 0'
            }}>
              {currentVideo.role}
            </p>
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <p style={{
                margin: '0',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#374151'
              }}>
                {currentVideo.summary}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistBuilder;