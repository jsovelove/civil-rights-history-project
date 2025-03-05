import React, { useEffect, useState, useRef } from "react";
import { parseTimestampRange, formatTime, extractVideoId } from "../utils/timeUtils";

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
  }, [videoQueue, currentVideoIndex, currentTime, totalDuration]);

  const segments = videoQueue.map((video, index) => {
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

  // Handle click within the active thumbnail to seek
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
    const currentSegment = segments[currentVideoIndex];
    if (!currentSegment) return;
    
    // Calculate time to seek to
    const timeToSeek = positionPercent * currentSegment.duration;
    
    // Call the onSeek function with the calculated time
    if (onSeek) {
      onSeek(timeToSeek);
    }
  };

  // Handle mouse move over the active thumbnail to show seek preview
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

  // Handle mouse leave to clear seek preview
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
        {segments.map(segment => (
          <div
            key={`thumb-${segment.id}`}
            onClick={(e) => handleThumbnailClick(e, segment.id)}
            onMouseEnter={() => setHoveredIndex(segment.id)}
            onMouseLeave={() => {
              setHoveredIndex(null);
              handleThumbnailMouseLeave();
            }}
            onMouseMove={segment.isActive ? handleThumbnailMouseMove : null}
            style={{
              width: `${segment.width}%`,
              minWidth: '60px',
              padding: '0 2px',
              boxSizing: 'border-box',
              position: 'relative',
              cursor: 'pointer'
            }}
            ref={segment.isActive ? activeThumbnailRef : null}
          >
            <div style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '6px',
              border: `2px solid ${segment.isActive ? '#3b82f6' : '#d1d5db'}`,
              height: '70px',
              boxShadow: segment.isActive ? '0 2px 5px rgba(0,0,0,0.2)' : 'none'
            }}>
              {/* Thumbnail Image */}
              <img
                src={`https://img.youtube.com/vi/${segment.videoId}/mqdefault.jpg`}
                alt={`Thumbnail for segment ${segment.id + 1}`}
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
              {segment.isActive && (
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
              {segment.isActive && seekPreviewPosition !== null && (
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
              {segment.isActive && seekPreviewPosition !== null && (
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
            {hoveredIndex === segment.id && (
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
          </div>
        ))}
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
          
          for (let i = 0; i < segments.length; i++) {
            const segmentWidth = segments[i].width / 100; // Convert percentage to decimal
            
            if (positionPercent >= accumulatedWidth && 
                positionPercent <= accumulatedWidth + segmentWidth) {
              // This is the segment that was clicked
              targetSegment = i;
              
              // Calculate time within this segment
              const relativePositionInSegment = (positionPercent - accumulatedWidth) / segmentWidth;
              timeWithinSegment = relativePositionInSegment * segments[i].duration;
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
        {segments.map(segment => (
          <div 
            key={`bar-${segment.id}`}
            style={{
              width: `${segment.width}%`,
              height: '100%',
              backgroundColor: 'transparent', // Make segments transparent to show the progress bar underneath
              borderRight: segment.id < segments.length - 1 ? '1px solid #c4c4c4' : 'none',
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
        <div style={{ fontWeight: 'bold' }}>{playheadLeft.toFixed(1)}%</div>
        <div>{formatTime(totalDuration)}</div>
      </div>
    </div>
  );
};

export default IntegratedTimeline;