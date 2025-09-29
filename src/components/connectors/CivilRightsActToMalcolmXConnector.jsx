import { useState, useEffect } from 'react';

/**
 * CivilRightsActToMalcolmXConnector - Custom connector from Civil Rights Act date to Malcolm X date
 */
export default function CivilRightsActToMalcolmXConnector({ fromRef, toRef }) {
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

        // Start from left of Civil Rights Act date badge
        const startX = fromRect.left;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop -148;

        // End at center of Malcolm X date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + toRect.height / 2 + scrollTop - 175;

        // Calculate elbow points for left -> down -> right -> down path
        const horizontalDistance1 = 100; // How far left to go initially
        const verticalDistance1 = 600; // First vertical drop (elbow down)
        const horizontalDistance2 = Math.abs(endX - (startX - horizontalDistance1)); // Distance to go right to target
        const verticalDistance2 = endY - (startY + verticalDistance1); // Final vertical drop to Malcolm X date
        
        const firstElbowX = startX - horizontalDistance1;
        const firstElbowY = startY + verticalDistance1;
        const secondElbowX = endX;
        const secondElbowY = firstElbowY;
        
        const segments = [
          // Horizontal segment left from Civil Rights Act date
          {
            type: 'horizontal',
            x: firstElbowX,
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
          // Horizontal segment right to align with Malcolm X date
          {
            type: 'horizontal',
            x: firstElbowX,
            y: firstElbowY,
            width: horizontalDistance2
          },
          // Final vertical segment down to Malcolm X date
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
