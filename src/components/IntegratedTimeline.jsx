/**
 * @fileoverview IntegratedTimeline component for visualizing and navigating a playlist of video segments.
 * 
 * This component provides a visual timeline interface that displays video segments as thumbnails,
 * shows playback progress, and allows users to navigate between segments and seek within them.
 * It implements a windowed display to handle large playlists efficiently.
 */

import React, { useEffect, useState, useRef } from "react";
import { parseTimestampRange, formatTime, extractVideoId } from "../utils/timeUtils";

/**
 * IntegratedTimeline - Interactive timeline for navigating video playlists
 * 
 * This component provides:
 * 1. A visual timeline of video segments with thumbnails
 * 2. Current playback progress visualization
 * 3. Seeking functionality within segments
 * 4. Navigation between segments
 * 5. Time display and percentage indicators
 * 6. Windowed view for efficient rendering of large playlists
 * 
 * @component
 * @example
 * <IntegratedTimeline 
 *   videoQueue={videoArray}
 *   currentVideoIndex={currentIndex}
 *   setCurrentVideoIndex={setCurrentIndex}
 *   currentTime={currentPlaybackTime}
 *   totalDuration={totalPlaylistDuration}
 *   onSeek={handleSeek}
 * />
 * 
 * @param {Object} props - Component props
 * @param {Array} props.videoQueue - Array of video objects in the playlist
 * @param {number} props.currentVideoIndex - Index of the currently playing video in the queue
 * @param {Function} props.setCurrentVideoIndex - Function to change the current video index
 * @param {number} props.currentTime - Current playback time within the current video
 * @param {number} props.totalDuration - Total duration of all videos in the playlist
 * @param {Function} props.onSeek - Function called when user seeks within a video
 * @returns {React.ReactElement} Timeline component
 */
const IntegratedTimeline = ({ 
  videoQueue, 
  currentVideoIndex, 
  setCurrentVideoIndex,
  currentTime,
  totalDuration,
  onSeek
}) => {
  const timelineRef = useRef(null);
  const playheadRef = useRef(null);
  const [playheadLeft, setPlayheadLeft] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [seekPreviewPosition, setSeekPreviewPosition] = useState(null);
  const activeThumbnailRef = useRef(null);
  
  // State for windowed rendering of clips
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const maxVisibleClips = 8; // Maximum number of clips to show at once

  /**
   * Update timeline state when playback position changes
   * 
   * Calculates total elapsed time and playhead position based on
   * current playback position within the playlist.
   */
  useEffect(() => {
    // Calculate elapsed time up to current video
    let elapsed = 0;
    for (let i = 0; i < currentVideoIndex; i++) {
      if (videoQueue[i]) {
        const { startSeconds, endSeconds } = parseTimestampRange(videoQueue[i].timestamp);
        elapsed += (endSeconds - startSeconds) || 300;
      }
    }
    
    // Add current time within current video, ensuring it's not negative
    const adjustedCurrentTime = Math.max(0, currentTime);
    elapsed += adjustedCurrentTime;
    
    setTotalElapsedTime(elapsed);

    // Calculate and set playhead position
    if (totalDuration && totalDuration > 0) {
      const percent = (elapsed / totalDuration) * 100;
      // Ensure the playhead stays within bounds (0-100%)
      setPlayheadLeft(Math.min(Math.max(0, percent), 100));
    }
    
    // Update visible window when currentVideoIndex changes
    updateVisibleWindow();
  }, [videoQueue, currentVideoIndex, currentTime, totalDuration]);

  /**
   * Updates the visible window of clips based on current video index
   * 
   * This implements a sliding window approach to only render a subset of
   * clips at once, improving performance for large playlists.
   */
  const updateVisibleWindow = () => {
    // If current video is outside the visible window, adjust the window
    if (currentVideoIndex < visibleStartIndex) {
      // Current video is before visible range, slide window back
      setVisibleStartIndex(Math.max(0, currentVideoIndex));
    } 
    else if (currentVideoIndex >= visibleStartIndex + maxVisibleClips) {
      // Current video is after visible range, slide window forward
      setVisibleStartIndex(Math.max(0, currentVideoIndex - maxVisibleClips + 1));
    }
  };

  /**
   * Process all segments in the video queue to calculate their properties
   */
  const allSegments = videoQueue.map((video, index) => {
    const { startSeconds, endSeconds } = parseTimestampRange(video.timestamp);
    const duration = (endSeconds - startSeconds) || 300;
    const width = (duration / totalDuration) * 100;
    const videoId = extractVideoId(video.videoEmbedLink);

    return {
      id: index,
      width,
      duration,
      isActive: index === currentVideoIndex,
      videoId,
      name: video.name || 'Untitled'
    };
  });

  /**
   * Get only the segments that should be visible in the current window
   */
  const visibleSegments = allSegments.slice(
    visibleStartIndex, 
    visibleStartIndex + maxVisibleClips
  );

  /**
   * Handle click events on segment thumbnails
   * 
   * When clicking on a thumbnail:
   * - If it's not the current segment, switch to that segment
   * - If it's the current segment, seek within that segment
   * 
   * @param {Event} event - Click event
   * @param {number} segmentId - ID of the clicked segment
   */
  const handleThumbnailClick = (event, segmentId) => {
    // Only process if clicking on the current active segment
    if (segmentId !== currentVideoIndex) {
      setCurrentVideoIndex(segmentId);
      return;
    }

    const thumbnailElement = activeThumbnailRef.current;
    if (!thumbnailElement) return;

    // Get click position relative to the thumbnail
    const rect = thumbnailElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    
    // Calculate position as percentage of width
    const positionPercent = clickX / rect.width;
    
    // Current segment duration
    const currentSegment = allSegments[currentVideoIndex];
    if (!currentSegment) return;
    
    // Calculate time to seek to
    const timeToSeek = positionPercent * currentSegment.duration;
    
    // Call the onSeek function with the calculated time
    if (onSeek) {
      onSeek(timeToSeek);
    }
  };

  /**
   * Handle mouse movement over the active thumbnail to show seek preview
   * 
   * @param {Event} event - Mouse move event
   */
  const handleThumbnailMouseMove = (event) => {
    if (hoveredIndex !== currentVideoIndex) return;
    
    const thumbnailElement = activeThumbnailRef.current;
    if (!thumbnailElement) return;

    // Get mouse position relative to the thumbnail
    const rect = thumbnailElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    
    // Calculate position as percentage of width
    const positionPercent = mouseX / rect.width;
    setSeekPreviewPosition(positionPercent);
  };

  /**
   * Handle mouse leave to clear seek preview
   */
  const handleThumbnailMouseLeave = () => {
    setSeekPreviewPosition(null);
  };

  return (
    <div>
      {/* Thumbnail Row */}
      <div 
        ref={timelineRef}
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#e5e7eb',
          marginBottom: '10px',
          borderRadius: '8px',
          overflow: 'hidden',
          padding: '10px',
          boxSizing: 'border-box',
          border: '1px solid #d1d5db',
          display: 'flex'
        }}
      >
        {visibleSegments.map(segment => {
          // Calculate width relative to visible segments for better display
          const actualSegmentId = segment.id;
          const isActiveSegment = segment.isActive;
          
          return (
            <div
              key={`thumb-${actualSegmentId}`}
              onClick={(e) => handleThumbnailClick(e, actualSegmentId)}
              onMouseEnter={() => setHoveredIndex(actualSegmentId)}
              onMouseLeave={() => {
                setHoveredIndex(null);
                handleThumbnailMouseLeave();
              }}
              onMouseMove={isActiveSegment ? handleThumbnailMouseMove : null}
              style={{
                width: `${100 / visibleSegments.length}%`,
                minWidth: '60px',
                padding: '0 2px',
                boxSizing: 'border-box',
                position: 'relative',
                cursor: 'pointer'
              }}
              ref={isActiveSegment ? activeThumbnailRef : null}
            >
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '6px',
                border: `2px solid ${isActiveSegment ? '#3b82f6' : '#d1d5db'}`,
                height: '70px',
                boxShadow: isActiveSegment ? '0 2px 5px rgba(0,0,0,0.2)' : 'none'
              }}>
                {/* Thumbnail Image */}
                <img
                  src={`https://img.youtube.com/vi/${segment.videoId}/mqdefault.jpg`}
                  alt={`Thumbnail for segment ${actualSegmentId + 1}`}
                  style={{
                    width: '100%',
                    maxHeight: '80px', 
                    objectFit: 'contain',
                    borderRadius: '6px',
                  }}
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/120x60?text=No+Thumbnail";
                  }}
                />

                {/* Progress Overlay on Active Thumbnail */}
                {isActiveSegment && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${(currentTime / segment.duration) * 100}%`,
                      backgroundColor: 'rgba(59, 130, 246, 0.4)', 
                      transition: 'width 0.2s linear'
                    }}
                  />
                )}

                {/* Seek Preview Overlay (only shown when hovering on active thumbnail) */}
                {isActiveSegment && seekPreviewPosition !== null && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${seekPreviewPosition * 100}%`,
                      backgroundColor: 'rgba(239, 68, 68, 0.4)', 
                      pointerEvents: 'none',
                      zIndex: 5
                    }}
                  />
                )}

                {/* Preview Time Indicator (only shown when hovering on active thumbnail) */}
                {isActiveSegment && seekPreviewPosition !== null && (
                  <div style={{
                    position: 'absolute',
                    top: '5px',
                    left: `${seekPreviewPosition * 100}%`,
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    zIndex: 6,
                    pointerEvents: 'none'
                  }}>
                    {formatTime(seekPreviewPosition * segment.duration)}
                  </div>
                )}

                {/* Duration Label */}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  fontSize: '11px',
                  textAlign: 'center',
                  padding: '2px 0'
                }}>
                  {formatTime(segment.duration)}
                </div>
              </div>

              {/* Hover tooltip */}
              {hoveredIndex === actualSegmentId && (
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#1f2937',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  zIndex: 50,
                  whiteSpace: 'nowrap'
                }}>
                  {segment.name} ({formatTime(segment.duration)})
                </div>
              )}
              
              {/* Clip number indicator */}
              <div style={{
                position: 'absolute',
                top: '5px',
                left: '5px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {actualSegmentId + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Timeline Bar with Playhead - WITH CONSISTENT PROGRESS INDICATOR */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: '8px',
          backgroundColor: '#d1d5db', // Base gray color
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '10px',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const positionPercent = clickX / rect.width;
          
          // Find which segment contains this position
          let accumulatedWidth = 0;
          let targetSegment = 0;
          let timeWithinSegment = 0;
          
          for (let i = 0; i < allSegments.length; i++) {
            const segmentWidth = allSegments[i].width / 100; // Convert percentage to decimal
            
            if (positionPercent >= accumulatedWidth && 
                positionPercent <= accumulatedWidth + segmentWidth) {
              // This is the segment that was clicked
              targetSegment = i;
              
              // Calculate time within this segment
              const relativePositionInSegment = (positionPercent - accumulatedWidth) / segmentWidth;
              timeWithinSegment = relativePositionInSegment * allSegments[i].duration;
              break;
            }
            
            accumulatedWidth += segmentWidth;
          }
          
          // Change to the target segment if it's not the current one
          if (targetSegment !== currentVideoIndex) {
            setCurrentVideoIndex(targetSegment);
          }
          
          // Seek within the target segment
          if (onSeek && targetSegment === currentVideoIndex) {
            onSeek(timeWithinSegment);
          }
        }}
      >
        {/* Show segment divisions with subtle borders */}
        {allSegments.map(segment => (
          <div 
            key={`bar-${segment.id}`}
            style={{
              width: `${segment.width}%`,
              height: '100%',
              backgroundColor: 'transparent', // Make segments transparent to show the progress bar underneath
              borderRight: segment.id < allSegments.length - 1 ? '1px solid #c4c4c4' : 'none',
              position: 'relative',
              zIndex: 2 // Set a higher z-index for segment dividers
            }}
          />
        ))}

        {/* Single continuous blue progress bar - this spans the entire timeline */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${playheadLeft}%`, // Use the same percentage as the playhead position
            backgroundColor: '#3b82f6', // Blue progress indicator
            transition: 'width 0.2s linear',
            zIndex: 1 // Set a lower z-index so segment dividers appear on top
          }}
        />

        {/* Playhead Indicator on Bottom Bar */}
        <div 
          ref={playheadRef}
          style={{
            position: 'absolute',
            top: '-3px', 
            left: `${playheadLeft}%`,
            transform: 'translateX(-50%)',
            width: '4px',
            height: '14px',
            backgroundColor: 'red',
            borderRadius: '2px',
            zIndex: 10, // Highest z-index to appear on top
            transition: 'left 0.1s linear'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'red'
          }}></div>
        </div>
      </div>

      {/* Time Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 10px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        fontSize: '12px',
        marginBottom: '10px'
      }}>
        <div>{formatTime(totalElapsedTime)}</div>
        <div style={{ fontWeight: 'bold' }}>
          Clip {currentVideoIndex + 1}/{videoQueue.length} ({playheadLeft.toFixed(1)}%)
        </div>
        <div>{formatTime(totalDuration)}</div>
      </div>
    </div>
  );
};

export default IntegratedTimeline;