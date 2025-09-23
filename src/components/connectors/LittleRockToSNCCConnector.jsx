import { useState, useEffect } from 'react';

/**
 * LittleRockToSNCCConnector - Custom connector from Little Rock date to SNCC date badge
 */
export default function LittleRockToSNCCConnector({ fromRef, toRef }) {
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

        // Start from left of Little Rock date badge
        const startX = fromRect.left;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 148;

        // End at center top of SNCC date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + scrollTop - 98;

        // Calculate center point for the path
        const screenCenterX = window.innerWidth / 2;
        const horizontalDistance1 = Math.abs(startX - screenCenterX); // Distance to screen center
        const verticalDropHeight = Math.abs(endY - startY) - 50; // Vertical distance
        
        const segments = [
          // Horizontal segment left from Little Rock date to screen center
          {
            type: 'horizontal',
            x: Math.min(startX, screenCenterX),
            y: startY,
            width: horizontalDistance1
          },
          // Vertical segment down through center
          {
            type: 'vertical',
            x: screenCenterX,
            y: startY,
            height: verticalDropHeight
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
