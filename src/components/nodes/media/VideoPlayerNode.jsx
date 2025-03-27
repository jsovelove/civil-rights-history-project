import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { FaPlay } from 'react-icons/fa';

/**
 * VideoPlayerNode - Node for displaying and controlling YouTube videos
 */
const VideoPlayerNode = ({ data }) => {
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

  // State for player controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const timeUpdateIntervalRef = useRef(null);
  const localVideoRef = useRef(null);

  // Use either the provided ref or our local ref
  const videoRef = data.videoRef || localVideoRef;

  // Ensure YouTube URL has required API parameters
  const getEnhancedYoutubeUrl = (url) => {
    if (!url) return '';
    
    // Parse the URL to add required parameters
    const urlObj = new URL(url);
    urlObj.searchParams.set('enablejsapi', '1');
    urlObj.searchParams.set('origin', window.location.origin);
    
    return urlObj.toString();
  };

  // Get timestamp markers from all of the key points
  const timestampMarkers = data.summaries && data.summaries.keyPoints ? 
    data.summaries.keyPoints.map(point => ({
      time: convertTimestampToSeconds(point.timestamp),
      label: point.topic
    })).sort((a, b) => a.time - b.time) : [];

  // Effect to set up interval for updating current time
  useEffect(() => {
    if (data.youtubeEmbedUrl) {
      console.log('Setting up YouTube player communication');
      
      // Create message event listener for YouTube iframe API messages
      const messageHandler = (event) => {
        if (event.data && typeof event.data === 'string') {
          try {
            const parsedData = JSON.parse(event.data);
            console.log('YouTube API message:', parsedData);
            
            if (parsedData.event === 'onStateChange') {
              // Update playing state based on player state
              setIsPlaying(parsedData.info === 1); // 1 = playing
              console.log('Player state changed:', parsedData.info);
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
            // console.log('Non-parseable message:', event.data);
          }
        }
      };
      
      // Add event listener for messages from iframe
      window.addEventListener('message', messageHandler);
      
      // Set up interval to request current time
      timeUpdateIntervalRef.current = setInterval(() => {
        if (videoRef && videoRef.current && videoRef.current.contentWindow) {
          try {
            // Request current player state
            videoRef.current.contentWindow.postMessage(JSON.stringify({
              event: 'listening',
              id: 'player',
              channel: 'widget'
            }), '*');
            
            // Also request current player status
            videoRef.current.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'getPlayerState',
              args: []
            }), '*');
          } catch (error) {
            console.error('Error getting video time:', error);
          }
        } else {
          console.log('Video ref not ready yet');
        }
      }, 1000);

      // Cleanup function
      return () => {
        window.removeEventListener('message', messageHandler);
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
        }
      };
    }
  }, [data.youtubeEmbedUrl, videoRef, videoDuration]);

  // Play/pause the video
  const handlePlayPause = () => {
    if (!videoRef || !videoRef.current) {
      console.error('Video reference not available');
      return;
    }
    
    try {
      console.log('Attempting to', isPlaying ? 'pause' : 'play', 'video');
      
      if (isPlaying) {
        // Pause video
        videoRef.current.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'pauseVideo',
          args: []
        }), '*');
      } else {
        // Play video
        videoRef.current.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: []
        }), '*');
      }
      
      // Toggle locally in case the event listener doesn't catch it
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error controlling video:', error);
    }
  };

  // Jump to a specific timestamp
  const jumpToTimestamp = (seconds) => {
    if (!videoRef || !videoRef.current) {
      console.error('Video reference not available');
      return;
    }
    
    try {
      console.log('Jumping to timestamp:', seconds);
      
      videoRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true]
      }), '*');
      
      // Also update current position indicator
      setCurrentTime(seconds);
      
      if (data.onUpdateTimestamp) {
        data.onUpdateTimestamp(formatTime(seconds));
      }
    } catch (error) {
      console.error('Error seeking video:', error);
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
  const enhancedYoutubeUrl = getEnhancedYoutubeUrl(data.youtubeEmbedUrl);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full min-w-[520px] relative">
      <Handle 
        type="target" 
        position={Position.Top} 
        id="video-input"
        style={{ top: -10, background: '#ef4444' }}
      />
      
      {/* Direct handle with proper styling */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="video-output"
        style={{ 
          bottom: -10, 
          left: '50%', 
          transform: 'translateX(-50%)',
          background: '#ef4444',
          width: 12,
          height: 12,
          border: '2px solid white',
          zIndex: 1000
        }}
      />
      
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <FaPlay className="mr-2 text-red-500" />
        Video Player
      </h3>
      
      <div className="flex flex-col gap-4">
        {enhancedYoutubeUrl ? (
          <div className="relative w-full pt-[56.25%]">
            <iframe
              ref={videoRef}
              src={enhancedYoutubeUrl}
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">No video loaded</p>
          </div>
        )}
        
        {data.currentTimestamp && (
          <div className="text-sm text-gray-600">
            Current timestamp: {data.currentTimestamp}
          </div>
        )}
        
        {/* Video Controls */}
        {enhancedYoutubeUrl && (
          <div className="flex flex-col space-y-3">
            {/* Improved Timeline */}
            <div className="relative w-full h-8 bg-gray-100 rounded-lg cursor-pointer border border-gray-200">
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
                  <div className="w-0.5 h-full bg-blue-500"></div>
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
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={goToPrevMarker} 
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  title="Previous marker"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={handlePlayPause}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={goToNextMarker}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200" 
                  title="Next marker"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <div className="text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </div>
            </div>
          </div>
        )}
        
        {/* Keypoints List */}
        {data.summaries && data.summaries.keyPoints && data.summaries.keyPoints.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 text-gray-700">Key Points</h4>
            <div className="max-h-[200px] overflow-y-auto pr-2">
              {data.summaries.keyPoints.map((point, index) => {
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
                          <svg className="w-3 h-3 text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
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
      </div>
    </div>
  );
};

export default VideoPlayerNode; 