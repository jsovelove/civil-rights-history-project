import { useState, useEffect } from 'react';

/**
 * MontgomeryToLittleRockConnector - Custom connector from Montgomery date to Little Rock date badge
 */
export default function MontgomeryToLittleRockConnector({ fromRef, toRef }) {
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

        // Start from right of Montgomery date badge
        const startX = fromRect.right;
        const startY = fromRect.top + fromRect.height / 2 + scrollTop - 150;

        // End at center top of Little Rock date badge
        const endX = toRect.left + toRect.width / 2;
        const endY = toRect.top + scrollTop - 147;

        // Calculate elbow points - go right first, then down, then right again
        const horizontalDistance1 = 350; // First horizontal segment length
        const verticalDropHeight = Math.abs(endY - startY) - 50; // Vertical segment length
        const firstElbowX = startX + horizontalDistance1; // Go right first
        const secondElbowY = startY + verticalDropHeight;
        
        const segments = [
          // Horizontal segment right from Montgomery date
          {
            type: 'horizontal',
            x: startX,
            y: startY,
            width: horizontalDistance1
          },
          // Vertical segment down
          {
            type: 'vertical',
            x: firstElbowX,
            y: startY,
            height: verticalDropHeight
          },
          // Horizontal segment right to Little Rock date
          {
            type: 'horizontal', 
            x: firstElbowX,
            y: secondElbowY,
            width: Math.abs(endX - firstElbowX)
          },
          // Final vertical segment up to Little Rock date
          {
            type: 'vertical',
            x: endX,
            y: secondElbowY,
            height: endY - secondElbowY
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
