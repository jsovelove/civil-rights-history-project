import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Group } from '@visx/group';
import { Pack } from '@visx/hierarchy';
import { hierarchy } from 'd3-hierarchy';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Zoom } from '@visx/zoom';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash/debounce';

const defaultMargin = { top: 40, right: 40, bottom: 40, left: 40 };

/**
 * Splits a given text into lines not exceeding maxChars per line.
 */
function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

export default function BubbleChartVisx() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredBubble, setHoveredBubble] = useState(null);
  const [selectedBubble, setSelectedBubble] = useState(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [visibleKeywords, setVisibleKeywords] = useState(150); // Default number of visible keywords
  const [searchTerm, setSearchTerm] = useState('');
  const [filterThreshold, setFilterThreshold] = useState(1); // Minimum frequency to display

  const navigate = useNavigate();

  // Debounced version of setHoveredBubble
  const debouncedSetHoveredBubble = useCallback(
    debounce((bubble) => {
      setHoveredBubble(bubble);
    }, 50),
    []
  );

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const keywordCounts = {};
        // Consider using a more efficient query structure in Firestore
        const interviewsSnapshot = await getDocs(collection(db, 'interviewSummaries'));

        const fetchSubSummaries = interviewsSnapshot.docs.map(async (interviewDoc) => {
          const subSummariesRef = collection(db, 'interviewSummaries', interviewDoc.id, 'subSummaries');
          const subSummariesSnapshot = await getDocs(subSummariesRef);

          subSummariesSnapshot.forEach((doc) => {
            const subSummary = doc.data();
            if (subSummary.keywords) {
              subSummary.keywords
                .split(',')
                .map((kw) => kw.trim().toLowerCase())
                .forEach((keyword) => {
                  keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                });
            }
          });
        });
        await Promise.all(fetchSubSummaries);

        // Store the full dataset
        const fullDataset = {
          name: 'keywords',
          children: Object.entries(keywordCounts).map(([keyword, count]) => ({
            name: keyword,
            value: count,
          })),
        };

        setData(fullDataset);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error loading data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and prepare data for visualization
  const processedData = useMemo(() => {
    if (!data) return null;

    // Apply search filter if any
    let filteredChildren = data.children;
    
    if (searchTerm) {
      filteredChildren = filteredChildren.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply minimum threshold filter
    filteredChildren = filteredChildren.filter(item => item.value >= filterThreshold);
    
    // Sort by value (frequency) in descending order
    filteredChildren = [...filteredChildren].sort((a, b) => b.value - a.value);
    
    // Limit to top N keywords
    const topKeywords = filteredChildren.slice(0, visibleKeywords);
    
    // If we have more than what we're showing, add an "Others" category
    const otherKeywords = filteredChildren.slice(visibleKeywords);
    
    const result = {
      name: 'keywords',
      children: topKeywords,
    };
    
    // Add "Others" group if needed and not searching
    if (otherKeywords.length > 0 && !searchTerm) {
      const otherCount = otherKeywords.reduce((sum, item) => sum + item.value, 0);
      const otherKeywordCount = otherKeywords.length;
      
      result.children.push({
        name: `${otherKeywordCount} more keywords`,
        value: otherCount,
        isOthers: true
      });
    }
    
    return result;
  }, [data, visibleKeywords, searchTerm, filterThreshold]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 px-6">
        <div className="bg-red-100 border border-red-500 text-red-700 px-6 py-4 rounded-lg max-w-xl text-center">
          {error}
        </div>
      </div>
    );
  }

  if (!processedData) return null;

  // Create d3-hierarchy root node, summing by keyword count
  const root = hierarchy(processedData)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);

  // Compute dimensions for the pack layout
  const { width, height } = dimensions;
  const packWidth = width - defaultMargin.left - defaultMargin.right;
  const packHeight = height - defaultMargin.top - defaultMargin.bottom;

  // Handle bubble click
  const handleBubbleClick = (circle) => {
    // For "Others" bubble, show more items
    if (circle.data.isOthers) {
      setVisibleKeywords(prev => prev + 50);
      return;
    }
    
    if (selectedBubble && selectedBubble.name === circle.data.name) {
      setSelectedBubble(null); // deselect if clicking the same bubble
    } else {
      setSelectedBubble({
        name: circle.data.name,
        value: circle.data.value,
        x: circle.x,
        y: circle.y,
        r: circle.r,
      });
    }
  };

  // Calculate color based on bubble size
  const getBubbleColor = (value, max, isOthers) => {
    if (isOthers) return "rgba(107, 114, 128, 0.3)"; // Gray for Others
    const intensity = Math.min(0.8, 0.3 + (value / max) * 0.5);
    return `rgba(37, 99, 235, ${intensity})`;
  };

  // Get maximum value for color scale
  const maxValue = root.children ? Math.max(...root.children.map(child => child.value)) : 1;

  return (
    <div className="w-full h-screen relative bg-gray-50 font-sans overflow-hidden">
      {/* Header with Controls */}
      <div className="absolute top-4 left-4 z-40 bg-white bg-opacity-90 p-4 rounded-lg shadow-sm w-72">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">
          Keyword Visualization
        </h2>
        
        {/* Search box */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        
        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Visible Keywords</label>
            <select 
              value={visibleKeywords} 
              onChange={(e) => setVisibleKeywords(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
              <option value="150">Top 150</option>
              <option value="200">Top 200</option>
              <option value="300">Top 300</option>
              <option value="500">Top 500</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Min. Frequency</label>
            <select 
              value={filterThreshold} 
              onChange={(e) => setFilterThreshold(Number(e.target.value))}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="5">5+</option>
              <option value="10">10+</option>
            </select>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          Showing {root.children?.length || 0} keywords
          {data && data.children && ` of ${data.children.length} total`}
        </p>
      </div>

      {/* Info panel for selected bubble */}
      {selectedBubble && (
        <div className="absolute top-36 left-4 z-50 bg-white rounded-xl shadow-md p-4 max-w-xs border border-gray-200">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900 m-0">
              {selectedBubble.name}
            </h3>
            <button
              onClick={() => setSelectedBubble(null)}
              className="bg-transparent border-0 text-gray-500 text-base cursor-pointer p-1 flex items-center justify-center rounded hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2 mb-4">
            This topic appears <strong>{selectedBubble.value}</strong> times across all interviews.
          </p>
          <div>
            <button
              onClick={() => navigate(`/playlist-builder?keywords=${encodeURIComponent(selectedBubble.name)}`)}
              className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium text-sm rounded-lg cursor-pointer flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Watch related segments
            </button>
          </div>
        </div>
      )}

      <Zoom
        width={width}
        height={height}
        scaleXMin={0.5}
        scaleXMax={3}
        scaleYMin={0.5}
        scaleYMax={3}
        initialTransformMatrix={{
          scaleX: 1,
          scaleY: 1,
          translateX: 0,
          translateY: 0,
          skewX: 0,
          skewY: 0
        }}
      >
        {(zoom) => (
          <div className="w-full h-full overflow-hidden relative touch-none flex justify-center items-center">
            <svg
              width="100%"
              height="100%"
              ref={zoom.containerRef}
              className="bg-white rounded-xl shadow-md mx-4 my-4 mt-20" // Margin top for header
            >
              {/* Background */}
              <rect
                width="100%"
                height="100%"
                fill="#ffffff"
                rx={14}
                onClick={() => {
                  zoom.reset();
                  setSelectedBubble(null);
                }}
              />

              {/* Center the visualization */}
              <Pack root={root} size={[packWidth, packHeight]} padding={16}>
                {(packData) => {
                  // Filter to only show leaf nodes (bubbles without children)
                  const circles = packData.descendants().filter((d) => !d.children);
                  return (
                    <Group
                      transform={zoom.toString()}
                      top={defaultMargin.top + (packHeight / 2 - packData.r)}
                      left={defaultMargin.left + (packWidth / 2 - packData.r)}
                    >
                      {circles.map((circle, i) => {
                        // Use computed circle radius (with a minimum value)
                        const radius = Math.max(circle.r, 20);
                        const isSelected = selectedBubble && selectedBubble.name === circle.data.name;
                        const isOthers = circle.data.isOthers;

                        // Determine font size based on radius (capped)
                        const fontSize = Math.min(radius / 3.5, 14);
                        // Use a maximum characters per line based on the radius
                        const maxChars = Math.max(5, Math.floor(radius / 3));
                        const lines = wrapText(circle.data.name, maxChars);
                        // Calculate vertical offset to center the text
                        const lineHeight = fontSize;
                        const dyOffset = lines.length > 1 ? -((lines.length - 1) * lineHeight) / 2 : 0;

                        // Set colors for bubbles
                        const strokeColor = isSelected ? '#2563eb' : isOthers ? '#9ca3af' : '#d1d5db';
                        const strokeWidth = isSelected ? 3 : 1;
                        // Add very subtle color tint based on size
                        const bubbleColor = isSelected ? '#f0f7ff' : isOthers ? '#f3f4f6' : '#ffffff';

                        return (
                          <g
                            key={`circle-${i}`}
                            transform={`translate(${circle.x}, ${circle.y})`}
                            onMouseEnter={() =>
                              debouncedSetHoveredBubble({
                                name: circle.data.name,
                                value: circle.data.value,
                                x: circle.x,
                                y: circle.y,
                                isOthers: circle.data.isOthers
                              })
                            }
                            onMouseLeave={() => debouncedSetHoveredBubble(null)}
                            onClick={() => handleBubbleClick(circle)}
                            className="cursor-pointer"
                          >
                            <circle
                              r={radius}
                              fill={bubbleColor}
                              stroke={strokeColor}
                              strokeWidth={strokeWidth}
                              style={{ transition: 'fill 0.3s, stroke 0.3s, stroke-width 0.3s' }}
                            />
                            <text
                              textAnchor="middle"
                              fontSize={fontSize}
                              fontWeight={isSelected ? 'bold' : 'normal'}
                              fill={isOthers ? "#6b7280" : "#111827"}
                              pointerEvents="none"
                              style={{
                                fontFamily: 'Inter, system-ui, sans-serif'
                              }}
                            >
                              {lines.map((line, index) => (
                                <tspan
                                  key={index}
                                  x="0"
                                  dy={index === 0 ? dyOffset : lineHeight}
                                >
                                  {line}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        );
                      })}
                    </Group>
                  );
                }}
              </Pack>
            </svg>

            {/* Tooltip */}
            {hoveredBubble && !selectedBubble && (
              <div
                className="absolute bg-gray-900 bg-opacity-90 text-white p-2 px-3 rounded-lg pointer-events-none text-sm z-50 shadow-md max-w-xs"
                style={{
                  left: zoom.transformMatrix.translateX + hoveredBubble.x * zoom.transformMatrix.scaleX,
                  top: zoom.transformMatrix.translateY + hoveredBubble.y * zoom.transformMatrix.scaleY - 20,
                }}
              >
                <div className="font-semibold">{hoveredBubble.name}</div>
                <div>{hoveredBubble.value} mentions</div>
                <div className="text-xs mt-1 text-blue-200">
                  {hoveredBubble.isOthers ? "Click to show more keywords" : "Click to explore"}
                </div>
              </div>
            )}
          </div>
        )}
      </Zoom>

      {/* Help text */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 py-2 px-3 rounded-lg text-xs text-gray-600 shadow-sm flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1.5 text-gray-500">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <span>Scroll to zoom • Drag to pan • Click bubble to select</span>
      </div>
    </div>
  );
}