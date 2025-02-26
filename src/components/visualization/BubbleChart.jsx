import React, { useState, useEffect } from 'react';
import { Group } from '@visx/group';
import { Pack } from '@visx/hierarchy';
import { hierarchy } from 'd3-hierarchy';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Zoom } from '@visx/zoom';
import KeywordPlaylistLink from '../common/KeywordPlaylistLink';

const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 };

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const keywordCounts = {};
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

        // Convert data into hierarchy structure
        const rootData = {
          name: 'keywords',
          children: Object.entries(keywordCounts).map(([keyword, count]) => ({
            name: keyword,
            value: count,
          })),
        };

        setData(rootData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error loading data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  if (!data) return null;

  // Create d3-hierarchy root node, summing by keyword count
  const root = hierarchy(data)
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);

  // Compute dimensions for the pack layout
  const width = window.innerWidth;
  const height = window.innerHeight; // Full height of the viewport
  const packWidth = width - defaultMargin.left - defaultMargin.right;
  const packHeight = height - defaultMargin.top - defaultMargin.bottom;

  // Handle bubble click
  const handleBubbleClick = (circle) => {
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

  return (
    <div className="relative" style={{ width: '100%', height: '100vh' }}>
      {/* Info panel for selected bubble */}
      {selectedBubble && (
        <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold">{selectedBubble.name}</h3>
            <button
              onClick={() => setSelectedBubble(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            This topic appears {selectedBubble.value} times across all interviews.
          </p>
          <div className="mt-4">
            <KeywordPlaylistLink
              keyword={selectedBubble.name}
              buttonText="Watch related segments"
              className="w-full justify-center"
            />
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
      >
        {(zoom) => (
          <div
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              touchAction: 'none',
            }}
          >
            <svg width="100%" height="100%" ref={zoom.containerRef}>
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
              <Pack root={root} size={[packWidth, packHeight]} padding={12}>
                {(packData) => {
                  // Filter to only show leaf nodes (bubbles without children)
                  const circles = packData.descendants().filter((d) => !d.children);
                  return (
                    <Group transform={zoom.toString()} top={defaultMargin.top} left={defaultMargin.left}>
                      {circles.map((circle, i) => {
                        // Use computed circle radius (with a minimum value)
                        const radius = Math.max(circle.r, 20);
                        const isSelected = selectedBubble && selectedBubble.name === circle.data.name;

                        // Determine font size based on radius (capped)
                        const fontSize = Math.min(radius / 3.5, 14);
                        // Use a maximum characters per line based on the radius
                        const maxChars = Math.max(5, Math.floor(radius / 3));
                        const lines = wrapText(circle.data.name, maxChars);
                        // Calculate vertical offset to center the text
                        const lineHeight = fontSize;
                        const dyOffset = lines.length > 1 ? -((lines.length - 1) * lineHeight) / 2 : 0;

                        return (
                          <g
                            key={`circle-${i}`}
                            transform={`translate(${circle.x}, ${circle.y})`}
                            onMouseEnter={(e) =>
                              setHoveredBubble({
                                name: circle.data.name,
                                value: circle.data.value,
                                x: e.clientX,
                                y: e.clientY,
                              })
                            }
                            onMouseLeave={() => setHoveredBubble(null)}
                            onClick={() => handleBubbleClick(circle)}
                            style={{ cursor: 'pointer' }}
                          >
                            <circle
                              r={radius}
                              fill="white"
                              stroke="black"
                              strokeWidth={1}
                              className="transition-all duration-200"
                            />
                            <text
                              textAnchor="middle"
                              fontSize={fontSize}
                              fontWeight={isSelected ? 'bold' : 'normal'}
                              fill="black"
                              pointerEvents="none"
                              style={{
                                textShadow: '0 0 3px rgba(255,255,255,0.5)',
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
                style={{
                  position: 'absolute',
                  left: hoveredBubble.x + 8,
                  top: hoveredBubble.y - 20,
                  background: 'rgba(0,0,0,0.85)',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  pointerEvents: 'none',
                  fontSize: '14px',
                  zIndex: 50,
                }}
              >
                <strong>{hoveredBubble.name}</strong>: {hoveredBubble.value} mentions
                <div className="text-xs mt-1 text-blue-300">Click to explore</div>
              </div>
            )}
          </div>
        )}
      </Zoom>

      {/* Help text */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-70 px-3 py-2 rounded-md text-xs text-gray-600">
        <p>Scroll to zoom • Drag to pan • Click bubble to select</p>
      </div>
    </div>
  );
}
