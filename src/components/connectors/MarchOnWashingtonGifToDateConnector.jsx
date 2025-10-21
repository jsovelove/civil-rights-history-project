import { useState, useEffect } from 'react';

/**
 * MarchOnWashingtonGifToDateConnector - Custom connector from March on Washington GIF center to date badge with 2 elbows
 */
export default function MarchOnWashingtonGifToDateConnector({ fromRef, toRef }) {
  const [connectorPath, setConnectorPath] = useState({ 
    segments: [], 
    show: false 
  });

  useEffect(() => {
    const updateConnector = () => {
      if (fromRef.current && toRef.current) {
        const fromRect = fromRef.current.getBoundingClientRect();
        const toRect = toRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Start from center of March on Washington GIF
        const startX = fromRect.left + fromRect.width / 2;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop;

        // End at left side of March on Washington date badge
        const endX = toRect.left + 118;
        const endY = toRect.top + toRect.height / 2 + scrollTop - 175;

        // Calculate elbow points for center -> down -> left -> down path (2 elbows)
        const verticalDistance1 = 450; // First vertical drop from GIF center
        const horizontalDistance = Math.abs(startX - endX); // Distance to go left to date badge
        const verticalDistance2 = endY - (startY + verticalDistance1); // Final vertical drop to date badge
        
        const firstElbowX = startX;
        const firstElbowY = startY + verticalDistance1;
        const secondElbowX = endX;
        const secondElbowY = firstElbowY;
        
        const segments = [
          // First vertical segment down from GIF center
          {
            type: 'vertical',
            x: startX,
            y: startY,
            height: verticalDistance1
          },
          // Horizontal segment left to align with date badge
          {
            type: 'horizontal',
            x: endX,
            y: firstElbowY,
            width: horizontalDistance
          },
          // Final vertical segment down to date badge
          {
            type: 'vertical',
            x: endX,
            y: firstElbowY,
            height: verticalDistance2
          }
        ];

        setConnectorPath({ segments, show: true });
      }
    };

    updateConnector();
    window.addEventListener('resize', updateConnector);
    window.addEventListener('scroll', updateConnector);

    return () => {
      window.removeEventListener('resize', updateConnector);
      window.removeEventListener('scroll', updateConnector);
    };
  }, [fromRef, toRef]);

  if (!connectorPath.show) return null;

  return (
    <>
      {connectorPath.segments.map((segment, index) => (
        <div
          key={index}
          className={`absolute bg-red-500 opacity-100 pointer-events-none ${
            segment.type === 'horizontal' ? 'h-px' : 'w-px'
          }`}
          style={{
            left: segment.type === 'horizontal' ? segment.x : segment.x,
            top: segment.y,
            width: segment.type === 'horizontal' ? segment.width : undefined,
            height: segment.type === 'vertical' ? segment.height : undefined,
            position: 'absolute',
            zIndex: 0
          }}
        />
      ))}
    </>
  );
}
