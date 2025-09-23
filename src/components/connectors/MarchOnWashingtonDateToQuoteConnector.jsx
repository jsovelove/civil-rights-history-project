import { useState, useEffect } from 'react';

/**
 * MarchOnWashingtonDateToQuoteConnector - Custom connector from March on Washington date to quote with ellipse
 */
export default function MarchOnWashingtonDateToQuoteConnector({ fromRef, toRef }) {
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

        // Start from right of March on Washington date badge
        const startX = fromRect.right;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop -148;

        // End above the quote (center horizontally)
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + scrollTop - 175; // 20px above the quote

        // Calculate elbow points for right -> down path with ellipse (1 elbow)
        const screenCenter = window.innerWidth / 2;
        const horizontalDistance = Math.max(0, screenCenter - startX); // Distance to reach center of page
        const verticalDistance = endY - startY - 10; // Vertical drop to above quote (minus ellipse space)
        
        const elbowX = startX + horizontalDistance;
        const elbowY = startY;
        
        const segments = [
          // Horizontal segment right from date badge
          {
            type: 'horizontal',
            x: startX,
            y: startY,
            width: horizontalDistance
          },
          // Vertical segment down to above quote
          {
            type: 'vertical',
            x: elbowX,
            y: startY,
            height: verticalDistance
          },
          // Ellipse at the end - positioned exactly where the vertical line ends
          {
            type: 'ellipse',
            x: elbowX - 2, // Center the ellipse on the vertical line
            y: startY + verticalDistance - 2, // Position exactly at the end of the vertical line
            width: 4,
            height: 4
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
            segment.type === 'horizontal' ? 'h-px' : 
            segment.type === 'vertical' ? 'w-px' : 
            'rounded-full'
          }`}
          style={{
            left: segment.type === 'horizontal' ? segment.x : segment.x,
            top: segment.y,
            width: segment.type === 'horizontal' ? segment.width : 
                   segment.type === 'ellipse' ? segment.width : undefined,
            height: segment.type === 'vertical' ? segment.height :
                    segment.type === 'ellipse' ? segment.height : undefined,
            position: 'absolute',
            zIndex: 0
          }}
        />
      ))}
    </>
  );
}
