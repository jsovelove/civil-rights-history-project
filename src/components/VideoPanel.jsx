import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaCompress, FaExpand, FaTimes } from 'react-icons/fa';

const VideoPanel = ({ 
  isOpen, 
  onClose, 
  videoUrl, 
  summaries, 
  documentName,
  currentTimestamp,
  setCurrentTimestamp
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const videoRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);

  // Format time in seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert timestamp to seconds
  const convertTimestampToSeconds = (timestamp) => {
    if (!timestamp) return 0;
    
    // Handle ranges by taking just the first part
    let startTime = timestamp;
    if (timestamp.includes(" - ")) {
      startTime = timestamp.split(" - ")[0];
    }
    
    // Parse the timestamp into total seconds
    const parts = startTime.split(":").map(Number);
    
    // Handle HH:MM:SS format
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } 
    // Handle MM:SS format
    else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    
    return 0;
  };

  // Get timestamp markers from all of the key points
  const timestampMarkers = summaries && summaries.keyPoints ? 
    summaries.keyPoints.map(point => ({
      time: convertTimestampToSeconds(point.timestamp),
      label: point.topic
    })).sort((a, b) => a.time - b.time) : [];

  // Load YouTube API script dynamically
  useEffect(() => {
    if (!window.YT) {
      // Create YouTube API script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      // Setup global callback
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API ready');
      };
    }
  }, []);

  // Effect to set up interval for updating current time
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      console.log('Setting up YouTube player communication');
      
      // Create message event listener for YouTube iframe API messages
      const messageHandler = (event) => {
        if (event.data && typeof event.data === 'string') {
          try {
            const parsedData = JSON.parse(event.data);
            console.log('YouTube API message:', parsedData);
            
            if (parsedData.event === 'onReady') {
              console.log('Player ready');
              setPlayerReady(true);
            } else if (parsedData.event === 'onStateChange') {
              // Update playing state based on player state
              console.log('Player state changed:', parsedData.info);
              setIsPlaying(parsedData.info === 1); // 1 = playing
            } else if (parsedData.event === 'infoDelivery' && parsedData.info) {
              // Update time and other info
              if (parsedData.info.currentTime) {
                setCurrentTime(parsedData.info.currentTime);
              }
              if (parsedData.info.playerState !== undefined) {
                setIsPlaying(parsedData.info.playerState === 1);
              }
              if (parsedData.info.duration && parsedData.info.duration !== videoDuration) {
                setVideoDuration(parsedData.info.duration);
                console.log('Duration updated:', parsedData.info.duration);
              }
            }
          } catch (e) {
            // Not a parseable message, ignore
          }
        }
      };
      
      // Add event listener for messages from iframe
      window.addEventListener('message', messageHandler);
      
      // Set up interval to request current time - with delay to let iframe load
      setTimeout(() => {
        timeUpdateIntervalRef.current = setInterval(() => {
          if (videoRef.current && videoRef.current.contentWindow) {
            try {
              // Request current player state
              videoRef.current.contentWindow.postMessage(JSON.stringify({
                event: 'listening',
                id: 'player',
                channel: 'widget'
              }), '*');
              
              // Also request current player status
              sendCommand('getPlayerState');
              sendCommand('getCurrentTime');
              sendCommand('getDuration');
            } catch (error) {
              console.error('Error getting video time:', error);
            }
          }
        }, 1000);
      }, 1500);

      // Cleanup function
      return () => {
        window.removeEventListener('message', messageHandler);
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
        }
      };
    }
  }, [videoUrl, videoDuration]);

  // Helper function to send commands to the YouTube player
  const sendCommand = (functionName, args = []) => {
    if (!videoRef.current || !videoRef.current.contentWindow) {
      console.error('Video reference not available');
      return false;
    }
    
    try {
      videoRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: functionName,
        args: args
      }), '*');
      return true;
    } catch (error) {
      console.error(`Error sending ${functionName} command:`, error);
      return false;
    }
  };

  // Ensure YouTube URL has required API parameters
  const getEnhancedYoutubeUrl = (url) => {
    if (!url) return '';
    
    try {
      // Parse the URL to add required parameters
      const urlObj = new URL(url);
      urlObj.searchParams.set('enablejsapi', '1');
      urlObj.searchParams.set('origin', window.location.origin);
      urlObj.searchParams.set('autoplay', '0');
      urlObj.searchParams.set('controls', '0'); // Hide native controls
      urlObj.searchParams.set('rel', '0'); // Don't show related videos
      urlObj.searchParams.set('showinfo', '0'); // Don't show video title
      
      return urlObj.toString();
    } catch (error) {
      console.error('Error enhancing YouTube URL:', error);
      return url;
    }
  };

  // Play/pause the video
  const handlePlayPause = () => {
    console.log('Play/Pause clicked, current state:', isPlaying);
    
    if (isPlaying) {
      // Pause video
      if (sendCommand('pauseVideo')) {
        setIsPlaying(false);
      }
    } else {
      // Play video
      if (sendCommand('playVideo')) {
        setIsPlaying(true);
      }
    }
  };

  // Jump to a specific timestamp
  const jumpToTimestamp = (seconds) => {
    console.log('Jumping to timestamp:', seconds);
    
    // First pause the video
    sendCommand('pauseVideo');
    
    // Then seek to time
    if (sendCommand('seekTo', [seconds, true])) {
      setCurrentTime(seconds);
      
      if (setCurrentTimestamp) {
        setCurrentTimestamp(formatTime(seconds));
      }
      
      // Play the video after seeking
      setTimeout(() => {
        sendCommand('playVideo');
        setIsPlaying(true);
      }, 200);
    }
  };

  // Find the next timestamp marker after the current time
  const goToNextMarker = () => {
    if (!timestampMarkers.length) return;
    
    const nextMarker = timestampMarkers.find(marker => marker.time > currentTime);
    
    if (nextMarker) {
      jumpToTimestamp(nextMarker.time);
    } else {
      // Loop back to first marker if at the end
      jumpToTimestamp(timestampMarkers[0].time);
    }
  };

  // Find the previous timestamp marker before the current time
  const goToPrevMarker = () => {
    if (!timestampMarkers.length) return;
    
    // Find markers before current time, take the latest one
    const prevMarkers = timestampMarkers.filter(marker => marker.time < currentTime);
    if (prevMarkers.length > 0) {
      jumpToTimestamp(prevMarkers[prevMarkers.length - 1].time);
    } else {
      // Go to the last marker if at the beginning
      jumpToTimestamp(timestampMarkers[timestampMarkers.length - 1].time);
    }
  };

  // Get the currently playing keypoint based on current time
  const getCurrentKeypoint = () => {
    if (!timestampMarkers.length) return null;
    
    // Find the last marker that starts before current time
    for (let i = timestampMarkers.length - 1; i >= 0; i--) {
      if (timestampMarkers[i].time <= currentTime) {
        return timestampMarkers[i];
      }
    }
    
    return null;
  };

  // Get current keypoint
  const currentKeypoint = getCurrentKeypoint();

  // Enhanced YouTube embed URL with API parameters
  const enhancedYoutubeUrl = getEnhancedYoutubeUrl(videoUrl);

  // If closed, don't render anything
  if (!isOpen) return null;

  return (
    <div 
      className={`fixed right-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-50 flex flex-col
        ${isMinimized ? 'w-64' : 'w-[500px]'}`}
    >
      {/* Header */}
      <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 truncate">
          {isMinimized ? 'Video Player' : `Video: ${documentName || 'No Title'}`}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <FaExpand size={14} /> : <FaCompress size={14} />}
          </button>
          <button 
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-red-600"
            title="Close"
          >
            <FaTimes size={14} />
          </button>
        </div>
      </div>
      
      {/* Video Content */}
      <div className="flex-1 overflow-auto">
        {/* Video iframe - only show if not minimized */}
        {!isMinimized && enhancedYoutubeUrl && (
          <div className="relative pt-[56.25%]">
            <iframe
              ref={videoRef}
              src={enhancedYoutubeUrl}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        
        {/* Controls - show in both minimized and expanded states */}
        <div className="p-3">
          {/* Current timestamp */}
          <div className="text-sm text-gray-600 mb-2">
            {formatTime(currentTime)} / {formatTime(videoDuration)}
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={goToPrevMarker}
              className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Previous marker"
              disabled={!enhancedYoutubeUrl || timestampMarkers.length === 0}
            >
              <FaStepBackward size={16} />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
              title={isPlaying ? "Pause" : "Play"}
              disabled={!enhancedYoutubeUrl}
            >
              {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
            </button>
            
            <button
              onClick={goToNextMarker}
              className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Next marker"
              disabled={!enhancedYoutubeUrl || timestampMarkers.length === 0}
            >
              <FaStepForward size={16} />
            </button>
          </div>
          
          {/* Timeline - show only if not minimized */}
          {!isMinimized && enhancedYoutubeUrl && (
            <div className="relative w-full h-6 bg-gray-100 rounded-lg cursor-pointer mt-3 border border-gray-200">
              {/* Background ticks */}
              <div className="absolute inset-0 flex justify-between">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-full w-px bg-gray-200"></div>
                ))}
              </div>
              
              {/* Progress bar */}
              <div 
                className="absolute left-0 top-0 h-full bg-red-400 rounded-l-lg opacity-60"
                style={{ width: `${videoDuration ? (currentTime / videoDuration) * 100 : 0}%` }}
              ></div>
              
              {/* Current position marker */}
              <div 
                className="absolute top-0 h-full w-1 bg-red-600 z-10"
                style={{ 
                  left: `${videoDuration ? (currentTime / videoDuration) * 100 : 0}%`,
                  transform: 'translateX(-50%)'
                }}
              ></div>
              
              {/* Timestamp markers */}
              {timestampMarkers.map((marker, idx) => (
                <div 
                  key={idx}
                  className="absolute top-0 h-full flex flex-col items-center cursor-pointer group"
                  style={{ 
                    left: `${videoDuration ? (marker.time / videoDuration) * 100 : 0}%`,
                  }}
                  onClick={() => jumpToTimestamp(marker.time)}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1"></div>
                  <div className="absolute top-full mt-1 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs p-1 rounded whitespace-nowrap transform -translate-x-1/2 transition-opacity z-20">
                    {marker.label}
                  </div>
                </div>
              ))}
              
              <input
                type="range"
                min="0"
                max={videoDuration || 100}
                value={currentTime}
                onChange={(e) => jumpToTimestamp(Number(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>
        
        {/* Key Points - only show if not minimized */}
        {!isMinimized && summaries && summaries.keyPoints && summaries.keyPoints.length > 0 && (
          <div className="p-3 border-t">
            <h4 className="text-sm font-semibold mb-2 text-gray-700">Key Points</h4>
            <div className="max-h-[200px] overflow-y-auto">
              {summaries.keyPoints.map((point, index) => {
                const isCurrentKeypoint = currentKeypoint && 
                  point.topic === currentKeypoint.label && 
                  convertTimestampToSeconds(point.timestamp) === currentKeypoint.time;
                
                return (
                  <div 
                    key={index}
                    onClick={() => jumpToTimestamp(convertTimestampToSeconds(point.timestamp))}
                    className={`flex items-start p-2 rounded mb-1 cursor-pointer transition-colors ${
                      isCurrentKeypoint 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        {isCurrentKeypoint && (
                          <FaPlay className="text-blue-500 mr-1" size={10} />
                        )}
                        <span className={`font-medium text-sm ${isCurrentKeypoint ? 'text-blue-700' : 'text-gray-700'}`}>
                          {point.topic}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {point.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* No video message */}
        {!enhancedYoutubeUrl && (
          <div className="flex items-center justify-center h-40 text-gray-500">
            No video selected
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPanel; 