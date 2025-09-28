import { useState, useEffect } from 'react';

/**
 * VotingRightsActToBlackPantherConnector - Custom connector from Voting Rights Act date to Black Panther Party date
 * Path: right → down → left → down
 */
export default function VotingRightsActToBlackPantherConnector({ fromRef, toRef }) {
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

        // Start from right of Voting Rights Act date badge
        const startX = fromRect.right;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 148;

        // End at top of Black Panther Party date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + scrollTop - 147;

        // Calculate path: right → down → left → down
        const horizontalDistance1 = 500; // How far right to go initially
        const verticalDistance1 = 600; // First vertical drop
        const horizontalDistance2 = Math.abs(endX - (startX + horizontalDistance1)); // How far left to go to align with target
        const verticalDistance2 = endY - (startY + verticalDistance1); // Final vertical drop
        
        // Calculate elbow points
        const firstElbowX = startX + horizontalDistance1;
        const firstElbowY = startY + verticalDistance1;
        
        const segments = [
          // 1. Horizontal segment right from Voting Rights Act date
          {
            type: 'horizontal',
            x: startX,
            y: startY,
            width: horizontalDistance1
          },
          // 2. First vertical segment down
          {
            type: 'vertical',
            x: firstElbowX,
            y: startY,
            height: verticalDistance1
          },
          // 3. Horizontal segment left to align with Black Panther date
          {
            type: 'horizontal',
            x: Math.min(firstElbowX, endX), // Start from the leftmost point
            y: firstElbowY,
            width: horizontalDistance2
          },
          // 4. Final vertical segment down to Black Panther Party date
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
