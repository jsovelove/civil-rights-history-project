import React, { useEffect, useState, useRef } from "react";
import { parseTimestampRange, formatTime, extractVideoId } from "../utils/timeUtils";

const IntegratedTimeline = ({ 
  videoQueue, 
  currentVideoIndex, 
  setCurrentVideoIndex,
  currentTime,
  totalDuration
}) => {
  const timelineRef = useRef(null);
  const playheadRef = useRef(null);
  const [playheadLeft, setPlayheadLeft] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    let elapsed = 0;
    for (let i = 0; i < currentVideoIndex; i++) {
      if (videoQueue[i]) {
        const { startSeconds, endSeconds } = parseTimestampRange(videoQueue[i].timestamp);
        elapsed += (endSeconds - startSeconds) || 300;
      }
    }
    elapsed += currentTime;
    setTotalElapsedTime(elapsed);

    if (totalDuration && totalDuration > 0) {
      const percent = (elapsed / totalDuration) * 100;
      setPlayheadLeft(Math.min(percent, 100));
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

  return (
    <div>
      <h3 style={{ marginBottom: '10px', fontWeight: 'bold' }}>Video Timeline</h3>

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
            onClick={() => setCurrentVideoIndex(segment.id)}
            onMouseEnter={() => setHoveredIndex(segment.id)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              width: `${segment.width}%`,
              minWidth: '60px',
              padding: '0 2px',
              boxSizing: 'border-box',
              position: 'relative',
              cursor: 'pointer'
            }}
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
                  maxHeight: '80px', // Adjust based on your layout needs
                  objectFit: 'contain', // Keeps full image without cropping
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
                    backgroundColor: 'rgba(255, 0, 0, 0.5)', 
                    transition: 'width 0.2s linear'
                  }}
                />
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

      {/* Bottom Timeline Bar with Playhead */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '8px',
        backgroundColor: '#d1d5db',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '10px'
      }}>
        {segments.map(segment => (
          <div 
            key={`bar-${segment.id}`}
            style={{
              width: `${segment.width}%`,
              height: '100%',
              backgroundColor: segment.isActive ? '#bfdbfe' : '#f3f4f6',
              borderRight: '1px solid #d1d5db',
              position: 'relative'
            }}
          >
              {segment.isActive && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${(currentTime / segment.duration) * 100}%`,
                    backgroundColor: '#3b82f6',
                    opacity: 0.7
                  }}
                />
              )}
          </div>
        ))}

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
            zIndex: 9999,
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
