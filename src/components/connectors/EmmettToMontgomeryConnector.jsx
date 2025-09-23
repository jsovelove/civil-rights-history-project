import { useState, useEffect } from 'react';

/**
 * EmmettToMontgomeryConnector - Custom connector from red rectangle to Montgomery date badge
 */
export default function EmmettToMontgomeryConnector({ fromRef, toRef }) {
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

         // Start from bottom center of red rectangle, but moved up
         const startX = fromRect.left + fromRect.width / 2;
         const startY = fromRect.bottom + scrollTop - 150; // Move starting point up by 30px

        // End at center of date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + toRect.height / 2 + scrollTop;

        // Calculate elbow points
        const verticalDropHeight = 100; // Drop down from red rectangle
        const horizontalY = startY + verticalDropHeight;
        
        const segments = [
          // Vertical segment down from red rectangle
          {
            type: 'vertical',
            x: startX,
            y: startY,
            height: verticalDropHeight
          },
          // Horizontal segment left to align with date badge
          {
            type: 'horizontal', 
            x: Math.min(startX, endX),
            y: horizontalY,
            width: Math.abs(endX - startX)
          },
          // Vertical segment down to date badge
          {
            type: 'vertical',
            x: endX,
            y: horizontalY,
            height: endY - horizontalY -175
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
