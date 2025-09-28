import { useState, useEffect } from 'react';

/**
 * SelmaToVotingRightsActConnector - Custom connector from Selma date to Voting Rights Act date
 * Path: right → down → left → down → right → down
 */
export default function SelmaToVotingRightsActConnector({ fromRef, toRef }) {
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

        // Start from right of Selma date badge
        const startX = fromRect.right;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 148;

        // End at top of Voting Rights Act date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + scrollTop - 147;

        // Calculate path: right → down → left → down → right → down
        const horizontalDistance1 = 400; // How far right to go initially
        const verticalDistance1 = 1050; // First vertical drop
        const horizontalDistance2 = 750; // How far left to go
        const verticalDistance2 = 650; // Second vertical drop
        const horizontalDistance3 = Math.abs(endX - (startX + horizontalDistance1 - horizontalDistance2)); // Final right movement
        const verticalDistance3 = endY - (startY + verticalDistance1 + verticalDistance2); // Final vertical drop
        
        // Calculate elbow points
        const firstElbowX = startX + horizontalDistance1;
        const firstElbowY = startY + verticalDistance1;
        
        const secondElbowX = firstElbowX - horizontalDistance2;
        const secondElbowY = firstElbowY + verticalDistance2;
        
        const thirdElbowX = endX;
        const thirdElbowY = secondElbowY;
        
        const segments = [
          // 1. Horizontal segment right from Selma date
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
          // 3. Horizontal segment left
          {
            type: 'horizontal',
            x: secondElbowX,
            y: firstElbowY,
            width: horizontalDistance2
          },
          // 4. Second vertical segment down
          {
            type: 'vertical',
            x: secondElbowX,
            y: firstElbowY,
            height: verticalDistance2
          },
          // 5. Horizontal segment right
          {
            type: 'horizontal',
            x: secondElbowX,
            y: secondElbowY,
            width: horizontalDistance3
          },
          // 6. Final vertical segment down to Voting Rights Act date
          {
            type: 'vertical',
            x: endX,
            y: secondElbowY,
            height: verticalDistance3
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
