import React, { useEffect, useRef, useState } from "react";
import { extractVideoId, convertTimestampToSeconds, extractStartTimestamp, parseTimestampRange } from "../utils/timeUtils";

const VideoPlayer = ({ 
  video, 
  onVideoEnd, 
  onPlay, 
  onPause, 
  onTimeUpdate, 
  isPlaying,
  seekToTime // New prop for seeking to a specific time
}) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerState, setPlayerState] = useState(null);
  const seekTimeRef = useRef(null);
  
  // Extract time information from video
  const getVideoTimeBoundaries = () => {
    if (!video) return { startSeconds: 0, endSeconds: 0 };
    
    try {
      const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);
      
      // Ensure we have valid values and apply reasonable defaults/constraints
      const validStartSeconds = Number.isFinite(startSeconds) ? Math.max(0, startSeconds) : 0;
      
      // If endSeconds is missing or invalid, default to startSeconds + 5 minutes
      const validEndSeconds = Number.isFinite(endSeconds) && endSeconds > validStartSeconds
        ? endSeconds
        : validStartSeconds + 300;
        
      console.log(`Video boundaries: ${validStartSeconds}s to ${validEndSeconds}s (duration: ${validEndSeconds - validStartSeconds}s)`);
      
      return { 
        startSeconds: validStartSeconds, 
        endSeconds: validEndSeconds
      };
    } catch (error) {
      console.error("Error parsing timestamp:", error, "Using defaults");
      return { startSeconds: 0, endSeconds: 300 };
    }
  };

  // Initialize or update the YouTube player
  useEffect(() => {
    if (!video || !containerRef.current) return;

    const videoId = extractVideoId(video.videoEmbedLink);
    if (!videoId) {
      console.error("Invalid video embed link:", video.videoEmbedLink);
      return;
    }

    const { startSeconds } = getVideoTimeBoundaries();

    const initPlayer = () => {
      // Clean up any existing player
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      try {
        // Create a new player
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: "405",
          width: "720",
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            start: startSeconds,
            enablejsapi: 1
          },
          events: {
            onReady: (event) => {
              console.log("YouTube Player Ready");
              
              // Check if the start time is valid for this video
              const videoDuration = event.target.getDuration();
              console.log(`Video actual duration: ${videoDuration}s`);
              
              // If start time is beyond video duration, notify about the issue
              if (startSeconds >= videoDuration) {
                console.error(`Invalid timestamp: start time (${startSeconds}s) is beyond video duration (${videoDuration}s)`);
                // Play from beginning instead
                event.target.seekTo(0, true);
                
                // Notify parent that this clip has an invalid timestamp
                if (video && video.id && onVideoEnd) {
                  console.warn(`Skipping invalid clip with ID: ${video.id}`);
                  // Add a short delay to ensure UI updates properly
                  setTimeout(() => {
                    onVideoEnd();
                  }, 500);
                  return;
                }
              }
              
              // Reset time tracking before changing player ready state
              if (onTimeUpdate) {
                onTimeUpdate(0); // Ensure time starts at 0
              }
              
              setIsPlayerReady(true);
              
              // Force the player to the validated start time
              event.target.seekTo(Math.min(startSeconds, videoDuration - 1), true);
              
              // Ensure initial play state is correct
              if (isPlaying) {
                event.target.playVideo();
              } else {
                event.target.pauseVideo();
              }
            },
            onStateChange: (event) => {
              const newState = event.data;
              setPlayerState(newState);
              
              // Handle state changes
              if (newState === window.YT.PlayerState.PLAYING) {
                // When video first starts playing, ensure time is at 0 relative to clip start
                if (onTimeUpdate) {
                  const currentAbsoluteTime = event.target.getCurrentTime();
                  const clipRelativeTime = Math.max(0, currentAbsoluteTime - startSeconds);
                  // Only reset to 0 if we're very close to the start to avoid jumps during normal playback
                  if (clipRelativeTime < 1) {
                    onTimeUpdate(0);
                  }
                }
                
                if (onPlay) onPlay();
              } else if (newState === window.YT.PlayerState.PAUSED) {
                if (onPause) onPause();
              } else if (newState === window.YT.PlayerState.ENDED) {
                if (onVideoEnd) onVideoEnd();
              }
            },
            onError: (event) => {
              console.error("YouTube player error:", event.data);
              
              // If video can't be played (e.g., deleted or private), skip to next
              if (onVideoEnd) {
                console.warn("Video error detected, skipping to next clip");
                setTimeout(() => {
                  onVideoEnd();
                }, 500);
              }
            }
          }
        });
      } catch (error) {
        console.error("Error creating YouTube player:", error);
      }
    };

    // Initialize YouTube API if not already done
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Load YouTube API
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      
      window.onYouTubeIframeAPIReady = initPlayer;
      
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Cleanup function
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      setIsPlayerReady(false);
    };
  }, [video]); // Only re-initialize when video changes

  // Handle play/pause state changes from parent component
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error("Error controlling player:", error);
    }
  }, [isPlaying, isPlayerReady]);

  // Handle seek requests
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || seekToTime === undefined || seekToTime === null) return;
    
    // Only process if seekToTime is different from the last processed seek
    if (seekTimeRef.current !== seekToTime) {
      try {
        const { startSeconds } = getVideoTimeBoundaries();
        const absoluteSeekTime = startSeconds + seekToTime;
        
        console.log(`Seeking to ${seekToTime}s within clip (absolute: ${absoluteSeekTime}s)`);
        
        playerRef.current.seekTo(absoluteSeekTime, true);
        
        // Update our reference to the last processed seek time
        seekTimeRef.current = seekToTime;
      } catch (error) {
        console.error("Error seeking:", error);
      }
    }
  }, [seekToTime, isPlayerReady]);

  // Time tracking effect - uses a separate timer that's synchronized with the actual video time
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    const { startSeconds, endSeconds } = getVideoTimeBoundaries();
    const duration = endSeconds - startSeconds;
    
    // Immediately sync time on player ready/play state change
    const syncTimeImmediately = () => {
      try {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const absoluteTime = playerRef.current.getCurrentTime();
          const relativeTime = Math.max(0, absoluteTime - startSeconds);
          
          // Make sure we don't report a time before clip start
          if (onTimeUpdate && relativeTime >= 0) {
            onTimeUpdate(relativeTime);
          }
        }
      } catch (error) {
        console.error("Error syncing time immediately:", error);
      }
    };
    
    // Sync immediately on mount or when play state changes
    syncTimeImmediately();
    
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Only run the timer if the video is playing
    if (isPlaying) {
      // Use a faster update interval for smoother timeline movement
      timerIntervalRef.current = setInterval(() => {
        try {
          if (!playerRef.current || !playerRef.current.getCurrentTime) {
            return; // Safety check
          }
          
          // Get the current time from the player
          const absoluteTime = playerRef.current.getCurrentTime();
          const currentTime = Math.max(0, absoluteTime - startSeconds);
          
          // Skip time updates if the player is buffering or not actually playing
          const playerState = playerRef.current.getPlayerState();
          if (playerState !== window.YT.PlayerState.PLAYING) {
            return;
          }
          
          // Update the parent component with the current time
          if (onTimeUpdate) {
            onTimeUpdate(currentTime);
          }
          
          // Check if we've reached the end timestamp
          // Use a small buffer (0.5s) to avoid skipping due to timing precision issues
          if (currentTime >= (duration - 0.5)) {
            console.log(`Reached end of clip: ${currentTime}s / ${duration}s`);
            if (onVideoEnd) {
              // Ensure we stop the interval before calling onVideoEnd to prevent race conditions
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
              onVideoEnd();
            }
          }
        } catch (error) {
          console.error("Error in time tracking:", error);
        }
      }, 250); // Update more frequently for smoother timeline
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPlaying, isPlayerReady, video]);

  return (
    <div className="video-player-wrapper relative">
      <div ref={containerRef} className="rounded-lg shadow-lg bg-black w-full aspect-video"></div>
      {!isPlayerReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;