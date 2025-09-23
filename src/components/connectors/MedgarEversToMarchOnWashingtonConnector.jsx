import { useState, useEffect } from 'react';

/**
 * MedgarEversToMarchOnWashingtonConnector - Custom connector from Medgar Evers date to March on Washington GIF center
 */
export default function MedgarEversToMarchOnWashingtonConnector({ fromRef, toRef }) {
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

        // Start from right of Medgar Evers date badge
        const startX = fromRect.right;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 148;

        // End at center of March on Washington GIF
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + toRect.height / 2 + scrollTop;

        // Calculate elbow points for right -> down -> left -> down path
        const horizontalDistance1 = 450; // How far right to go initially
        const verticalDistance1 = 850; // First vertical drop (elbow down)
        const horizontalDistance2 = Math.abs(endX - (startX + horizontalDistance1)); // Distance to go left to center
        const verticalDistance2 = endY - (startY + verticalDistance1); // Final vertical drop to GIF center
        
        const firstElbowX = startX + horizontalDistance1;
        const firstElbowY = startY + verticalDistance1;
        const secondElbowX = endX;
        const secondElbowY = firstElbowY;
        
        const segments = [
          // Horizontal segment right from Medgar Evers date
          {
            type: 'horizontal',
            x: startX,
            y: startY,
            width: horizontalDistance1
          },
          // First vertical segment down (elbow down)
          {
            type: 'vertical',
            x: firstElbowX,
            y: startY,
            height: verticalDistance1
          },
          // Horizontal segment left to center alignment
          {
            type: 'horizontal',
            x: endX,
            y: firstElbowY,
            width: horizontalDistance2
          },
          // Final vertical segment down to GIF center
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
