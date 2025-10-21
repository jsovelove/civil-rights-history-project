import { useState, useEffect } from 'react';

/**
 * BlackPantherToBrownBeretsConnector - Custom connector from Black Panther Party date to Brown Berets date
 * Path: right → down → left → down → left → down
 */
export default function BlackPantherToBrownBeretsConnector({ fromRef, toRef }) {
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

        // Start from center of Black Panther Party date badge
        const startX = fromRect.left + fromRect.width / 2 + 41;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 147;

        // End at top of Brown Berets date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + scrollTop - 147;

        // Calculate path: right → down → left → down → left → down
        const horizontalDistance1 = 600; // How far right to go initially
        const verticalDistance1 = 850; // First vertical drop
        const horizontalDistance2 = 300; // First left movement
        const verticalDistance2 = 650; // Second vertical drop
        const horizontalDistance3 = Math.abs(endX - (startX + horizontalDistance1 - horizontalDistance2)); // Final left movement to align with target
        const verticalDistance3 = endY - (startY + verticalDistance1 + verticalDistance2); // Final vertical drop
        
        // Calculate elbow points
        const point1X = startX + horizontalDistance1; // After first right
        const point1Y = startY;
        
        const point2X = point1X;
        const point2Y = startY + verticalDistance1; // After first down
        
        const point3X = point1X - horizontalDistance2; // After first left
        const point3Y = point2Y;
        
        const point4X = point3X;
        const point4Y = point2Y + verticalDistance2; // After second down
        
        const segments = [
          // 1. Horizontal segment right from Black Panther date
          {
            type: 'horizontal',
            x: startX,
            y: startY,
            width: horizontalDistance1
          },
          // 2. First vertical segment down
          {
            type: 'vertical',
            x: point1X,
            y: point1Y,
            height: verticalDistance1
          },
          // 3. First horizontal segment left
          {
            type: 'horizontal',
            x: point3X, // Start from the leftmost point
            y: point2Y,
            width: horizontalDistance2
          },
          // 4. Second vertical segment down
          {
            type: 'vertical',
            x: point3X,
            y: point3Y,
            height: verticalDistance2
          },
          // 5. Second horizontal segment left to align with Brown Berets date
          {
            type: 'horizontal',
            x: endX,
            y: point4Y,
            width: horizontalDistance3
          },
          // 6. Final vertical segment down to Brown Berets date
          {
            type: 'vertical',
            x: endX,
            y: point4Y,
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

