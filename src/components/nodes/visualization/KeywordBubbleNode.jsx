import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { FaChartBar } from 'react-icons/fa';
import { Group } from '@visx/group';
import { Pack } from '@visx/hierarchy';
import { Zoom } from '@visx/zoom';
import { hierarchy, stratify } from 'd3-hierarchy';

/**
 * KeywordBubbleNode - Visualizes keywords from transcript summary as a bubble chart
 * 
 * @param {Object} data - Component data including summaries from transcript processing
 * @returns {React.ReactElement} Bubble chart visualization of keywords
 */
const KeywordBubbleNode = ({ data }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [hoveredBubble, setHoveredBubble] = useState(null);

  // Extract keywords and their frequencies from the summaries
  const keywordData = useMemo(() => {
    if (!data.summaries) return [];

    // Create a map to count keyword frequencies
    const keywordMap = new Map();
    
    // Process overall summary keywords (this would need proper extraction)
    if (data.summaries.overallSummary) {
      // Simple keyword extraction from the overall summary (could be improved)
      const words = data.summaries.overallSummary
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      // Count word frequencies
      words.forEach(word => {
        keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
      });
    }
    
    // Process key point keywords
    if (data.summaries.keyPoints) {
      data.summaries.keyPoints.forEach(point => {
        // Use the explicitly defined keywords in each key point
        const keywords = point.keywords
          ? point.keywords.split(',').map(k => k.trim().toLowerCase())
          : [];
        
        keywords.forEach(keyword => {
          keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 3); // Give more weight to defined keywords
        });
        
        // Add topic as a keyword
        if (point.topic) {
          keywordMap.set(point.topic.toLowerCase(), (keywordMap.get(point.topic.toLowerCase()) || 0) + 5);
        }
      });
    }
    
    // Convert to array and sort by frequency
    const sortedKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50) // Limit to top 50 keywords
      .map(([keyword, count], index) => ({
        name: keyword,
        count,
        value: count,
        id: `keyword-${index}`,
        parentId: 'root'
      }));
    
    // Add root node
    sortedKeywords.unshift({
      name: 'Keywords',
      id: 'root',
      parentId: null,
      value: 0
    });
    
    return sortedKeywords;
  }, [data.summaries]);
  
  // Create hierarchy data for the bubble chart
  const hierarchyData = useMemo(() => {
    if (!keywordData.length) return null;
    
    // Create stratified data
    const stratifiedData = stratify()
      .id(d => d.id)
      .parentId(d => d.parentId)
      (keywordData);
    
    // Create hierarchy with sum values
    return hierarchy(stratifiedData)
      .sum(d => d.data.value)
      .sort((a, b) => b.value - a.value);
  }, [keywordData]);

  // Handle resizing of the container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  // Helper function to wrap text
  const wrapText = (text, width, fontSize) => {
    if (!text) return { lines: [], totalHeight: 0 };
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    // Approximate characters that can fit in width (very rough estimate)
    const charsPerWidth = width / (fontSize * 0.6);
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const newLine = `${currentLine} ${word}`;
      
      if (newLine.length < charsPerWidth) {
        currentLine = newLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    
    lines.push(currentLine); // Add the last line
    
    return {
      lines,
      totalHeight: lines.length * fontSize * 1.2, // Approximate line height
    };
  };
  
  return (
    <div 
      className="bg-white rounded-xl shadow-md w-full h-full overflow-hidden border-2 border-transparent hover:border-blue-100"
      ref={containerRef}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        id="viz-input"
        style={{ left: -10, background: '#818cf8', top: '50%', transform: 'translateY(-50%)' }}
      />
      
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <FaChartBar className="mr-2 text-blue-500" />
          Keyword Bubble Chart
        </h3>
        
        <div className="relative" style={{ height: dimensions.height - 50, width: '100%' }}>
          {!data.summaries ? (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
              <p className="text-gray-500">No data available</p>
            </div>
          ) : hierarchyData ? (
            <Zoom
              width={dimensions.width}
              height={dimensions.height - 50}
              scaleXMin={0.1}
              scaleXMax={4}
              scaleYMin={0.1}
              scaleYMax={4}
            >
              {zoom => (
                <div className="relative w-full h-full overflow-hidden">
                  <svg
                    width={dimensions.width}
                    height={dimensions.height - 50}
                    className="cursor-grab"
                  >
                    <rect
                      width={dimensions.width}
                      height={dimensions.height - 50}
                      rx={14}
                      fill="#f9fafb"
                      onTouchStart={zoom.dragStart}
                      onTouchMove={zoom.dragMove}
                      onTouchEnd={zoom.dragEnd}
                      onMouseDown={zoom.dragStart}
                      onMouseMove={zoom.dragMove}
                      onMouseUp={zoom.dragEnd}
                      onMouseLeave={() => {
                        if (zoom.isDragging) zoom.dragEnd();
                        setHoveredBubble(null);
                      }}
                    />
                    <Pack
                      root={hierarchyData}
                      size={[dimensions.width, dimensions.height - 50]}
                      padding={3}
                    >
                      {packData => {
                        const circles = packData.descendants().slice(1); // Skip root
                        return (
                          <Group transform={zoom.toString()}>
                            {circles.map((circle, i) => {
                              // Skip rendering if bubble is too small
                              if (circle.r < 5) return null;
                              
                              // Determine if text should be visible based on circle size
                              const fontSize = Math.min(16, Math.max(8, circle.r / 5));
                              const showText = circle.r > 20;
                              
                              // Get wrapped text
                              const textContent = wrapText(
                                circle.data.data.name,
                                circle.r * 1.5,
                                fontSize
                              );
                              
                              // Calculate color based on frequency
                              const maxCount = Math.max(...keywordData.map(d => d.count || 0));
                              const colorIntensity = Math.min(1, (circle.data.data.count || 0) / (maxCount * 0.7));
                              
                              // Dynamic color generation
                              const colorH = 210; // Blue hue
                              const colorS = 70 + (30 * colorIntensity); // Saturation: 70-100%
                              const colorL = 90 - (30 * colorIntensity); // Lightness: 90-60%
                              
                              const isHovered = hoveredBubble === circle.data.data.id;
                              
                              return (
                                <Group key={`circle-${i}`}>
                                  <circle
                                    cx={circle.x}
                                    cy={circle.y}
                                    r={circle.r}
                                    fill={`hsl(${colorH}, ${colorS}%, ${colorL}%)`}
                                    stroke={isHovered ? "#3b82f6" : "white"}
                                    strokeWidth={isHovered ? 2 : 1}
                                    onMouseEnter={() => setHoveredBubble(circle.data.data.id)}
                                    onMouseLeave={() => setHoveredBubble(null)}
                                    opacity={0.9}
                                  />
                                  {showText && (
                                    <text
                                      x={circle.x}
                                      y={circle.y}
                                      fontSize={fontSize}
                                      fontFamily="Arial"
                                      textAnchor="middle"
                                      fill="#1f2937"
                                      dy={-textContent.totalHeight / 2 + fontSize}
                                    >
                                      {textContent.lines.map((line, lineIndex) => (
                                        <tspan
                                          key={`line-${lineIndex}`}
                                          x={circle.x}
                                          dy={lineIndex === 0 ? 0 : fontSize * 1.2}
                                        >
                                          {line}
                                        </tspan>
                                      ))}
                                    </text>
                                  )}
                                </Group>
                              );
                            })}
                          </Group>
                        );
                      }}
                    </Pack>
                  </svg>
                  
                  {/* Zoom controls */}
                  <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md flex">
                    <button
                      onClick={() => zoom.scale({ scaleX: 1.2, scaleY: 1.2 })}
                      className="p-2 text-gray-600 hover:text-blue-600"
                    >
                      +
                    </button>
                    <button
                      onClick={() => zoom.scale({ scaleX: 0.8, scaleY: 0.8 })}
                      className="p-2 text-gray-600 hover:text-blue-600"
                    >
                      -
                    </button>
                    <button
                      onClick={() => zoom.reset()}
                      className="p-2 text-gray-600 hover:text-blue-600 text-xs"
                    >
                      Reset
                    </button>
                  </div>
                  
                  {/* Tooltip */}
                  {hoveredBubble && (() => {
                    const node = hierarchyData.descendants().find(d => d.data.data.id === hoveredBubble);
                    if (!node) return null;
                    
                    // Calculate tooltip position with proper zoom transformation
                    const left = node.x * zoom.transformMatrix.scaleX + zoom.transformMatrix.translateX;
                    const top = node.y * zoom.transformMatrix.scaleY + zoom.transformMatrix.translateY;
                    
                    return (
                      <div
                        className="absolute pointer-events-none bg-white p-2 rounded shadow-md text-xs border border-gray-200"
                        style={{
                          left,
                          top: top - 40,
                          transform: 'translate(-50%, -100%)',
                        }}
                      >
                        <div className="font-bold">
                          {node.data.data.name}
                        </div>
                        <div>
                          Count: {node.data.data.count}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </Zoom>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
              <p className="text-gray-500">Preparing visualization...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeywordBubbleNode; 