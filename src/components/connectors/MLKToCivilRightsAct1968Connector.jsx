import { useState, useEffect } from 'react';

/**
 * MLKToCivilRightsAct1968Connector - Custom connector from MLK assassination date to Civil Rights Act of 1968 date
 * Path: right → down → left → down → right → down
 */
export default function MLKToCivilRightsAct1968Connector({ fromRef, toRef }) {
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

        // Start from right of MLK assassination date badge
        const startX = fromRect.right;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop;

        // End at top of Civil Rights Act of 1968 date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + scrollTop;

        // Calculate path: right → down → left → down → right → down
        const horizontalDistance1 = 300; // How far right to go initially
        const verticalDistance1 = 200; // First vertical drop
        const horizontalDistance2 = 400; // Distance to go left
        const verticalDistance2 = 300; // Second vertical drop
        const horizontalDistance3 = endX - (startX + horizontalDistance1 - horizontalDistance2); // Distance to go right to align with target
        const verticalDistance3 = endY - (startY + verticalDistance1 + verticalDistance2); // Final vertical drop to Civil Rights Act date
        
        // Calculate elbow points
        const firstElbowX = startX + horizontalDistance1;
        const firstElbowY = startY;
        
        const secondElbowX = firstElbowX;
        const secondElbowY = startY + verticalDistance1;
        
        const thirdElbowX = firstElbowX - horizontalDistance2;
        const thirdElbowY = secondElbowY;
        
        const fourthElbowX = thirdElbowX;
        const fourthElbowY = secondElbowY + verticalDistance2;
        
        const fifthElbowX = endX;
        const fifthElbowY = fourthElbowY;
        
        const segments = [
          // 1. Horizontal segment right from MLK date
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
            y: firstElbowY,
            height: verticalDistance1
          },
          // 3. Horizontal segment left
          {
            type: 'horizontal',
            x: thirdElbowX,
            y: secondElbowY,
            width: horizontalDistance2
          },
          // 4. Second vertical segment down
          {
            type: 'vertical',
            x: thirdElbowX,
            y: thirdElbowY,
            height: verticalDistance2
          },
          // 5. Horizontal segment right to align with Civil Rights Act date
          {
            type: 'horizontal',
            x: fourthElbowX,
            y: fourthElbowY,
            width: horizontalDistance3
          },
          // 6. Final vertical segment down to Civil Rights Act date
          {
            type: 'vertical',
            x: endX,
            y: fifthElbowY,
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




