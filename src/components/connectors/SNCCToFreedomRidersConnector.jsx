import { useState, useEffect } from 'react';

/**
 * SNCCToFreedomRidersConnector - Custom connector from SNCC date to Freedom Riders date badge
 */
export default function SNCCToFreedomRidersConnector({ fromRef, toRef }) {
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

        // Start from right of SNCC date badge
        const startX = fromRect.right;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 148;

        // End at right side of Freedom Riders date badge
        const endX = toRect.right;
        const endY = toRect.top + toRect.height / 2 + scrollTop - 98;

        // Calculate elbow points for the complex path
        const horizontalDistance1 = 600; // First horizontal segment length (right from SNCC)
        const verticalDistance1 = 850; // First vertical drop
        const horizontalDistance2 = 800; // Second horizontal segment (left)
        const verticalDistance2 = Math.abs(endY - (startY + verticalDistance1)) - 50; // Second vertical drop
        
        const firstElbowX = startX + horizontalDistance1;
        const firstElbowY = startY + verticalDistance1;
        const secondElbowX = firstElbowX - horizontalDistance2;
        const secondElbowY = firstElbowY + verticalDistance2;
        
        const segments = [
          // Horizontal segment right from SNCC date
          {
            type: 'horizontal',
            x: startX,
            y: startY,
            width: horizontalDistance1
          },
          // Vertical segment down (first elbow)
          {
            type: 'vertical',
            x: firstElbowX,
            y: startY,
            height: verticalDistance1
          },
          // Horizontal segment left (second elbow)
          {
            type: 'horizontal', 
            x: secondElbowX,
            y: firstElbowY,
            width: horizontalDistance2
          },
          // Vertical segment down (third elbow)
          {
            type: 'vertical',
            x: secondElbowX,
            y: firstElbowY,
            height: verticalDistance2
          },
          // Final horizontal segment left to Freedom Riders date
          {
            type: 'horizontal',
            x: endX,
            y: secondElbowY,
            width: secondElbowX - endX
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
