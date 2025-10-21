import { useState, useEffect } from 'react';

/**
 * BrownBeretsToLongHotSummerConnector - Custom connector from Brown Berets date to Long Hot Summer date
 * Path: right → down
 */
export default function BrownBeretsToLongHotSummerConnector({ fromRef, toRef }) {
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

        // Start from right of Brown Berets date badge
        const startX = fromRect.right;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 147;

        // End at top of Long Hot Summer date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + scrollTop - 147;

        // Calculate path: right → down
        const horizontalDistance = 300 + 300; // How far right to go
        const elbowX = startX + horizontalDistance;
        const verticalDistance = endY - startY;
        
        const segments = [
          // 1. Horizontal segment right from Brown Berets date
          {
            type: 'horizontal',
            x: startX,
            y: startY,
            width: horizontalDistance
          },
          // 2. Vertical segment down to Long Hot Summer date
          {
            type: 'vertical',
            x: elbowX,
            y: startY,
            height: verticalDistance
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

