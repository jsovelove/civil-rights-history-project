import { useState, useEffect } from 'react';

/**
 * FreedomRidersToMedgarEversConnector - Custom connector from Freedom Riders date to Medgar Evers date badge
 */
export default function FreedomRidersToMedgarEversConnector({ fromRef, toRef }) {
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

        // Start from left of Freedom Riders date badge
        const startX = fromRect.left;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 148;

        // End at left side of Medgar Evers date badge
        const endX = toRect.left + 105;
        const endY = toRect.top + toRect.height / 2 + scrollTop ;

        // Calculate elbow points for a more complex path with additional elbow
        const horizontalDistance1 = 100; // How far left to go initially
        const verticalDistance1 = 800; // First vertical drop
        const horizontalDistance2 = 250; // Second horizontal segment (further left)
        const verticalDistance2 = Math.abs(endY - (startY + verticalDistance1)) - 300; // Second vertical drop
        
        const firstElbowX = startX - horizontalDistance1;
        const firstElbowY = startY + verticalDistance1;
        const secondElbowX = firstElbowX + horizontalDistance2;
        const secondElbowY = firstElbowY + verticalDistance2;
        
        const segments = [
          // Horizontal segment left from Freedom Riders date
          {
            type: 'horizontal',
            x: firstElbowX,
            y: startY,
            width: horizontalDistance1
          },
          // First vertical segment down
          {
            type: 'vertical',
            x: firstElbowX,
            y: startY,
            height: verticalDistance1
          },
          // Second horizontal segment going right
          {
            type: 'horizontal',
            x: firstElbowX,
            y: firstElbowY,
            width: horizontalDistance2
          },
          // Second vertical segment down
          {
            type: 'vertical',
            x: secondElbowX,
            y: firstElbowY,
            height: verticalDistance2
          },
          // Final horizontal segment right to Medgar Evers date
          {
            type: 'horizontal',
            x: secondElbowX,
            y: secondElbowY,
            width: Math.abs(endX - secondElbowX)
          },
          // Final vertical segment to connect to Medgar Evers date
          {
            type: 'vertical',
            x: endX,
            y: secondElbowY,
            height: endY - secondElbowY - 174  // Subtract 50px to shrink the final vertical distance
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
