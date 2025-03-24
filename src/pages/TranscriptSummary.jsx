/**
 * @fileoverview TranscriptSummary component for processing interview transcripts with AI using React Flow.
 * 
 * This component provides an interface for uploading, processing, and viewing
 * AI-generated summaries of interview transcripts. It uses React Flow to create a workflow
 * with nodes for transcript input, prompt editing, and result display.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  BezierEdge,
  StraightEdge,
  StepEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaUpload, FaPlay, FaYoutube, FaSave, FaPlusCircle, FaMinusCircle, FaEdit } from 'react-icons/fa';

// Import node components and utilities
import { nodeTypes } from '../components/nodes';
import VisualizationToolbar from '../components/VisualizationToolbar';
import TranscriptHeader from '../components/TranscriptHeader';
import ErrorDisplay from '../components/ErrorDisplay';
import LoadingIndicator from '../components/LoadingIndicator';
import AlignmentTools from '../components/AlignmentTools';

// Import hooks and utilities
import useTranscriptData from '../hooks/useTranscriptData';
import useDragAndDrop from '../hooks/useDragAndDrop';
import { 
  readFileAsText, 
  getSummariesFromChatGPT, 
  saveProcessedTranscript 
} from '../utils/transcriptUtils';
import {
  getDefaultNodes,
  getDefaultEdges,
  getEdgeTypes,
  connectNodes,
  alignNodesHorizontally,
  alignNodesVertically,
  distributeNodesHorizontally,
  distributeNodesVertically,
  makeEdgesOrthogonal
} from '../utils/flowUtils';

// Development mode flag
const DEV_MODE = import.meta.env.DEV;

// Edge type definition moved outside component
const getEdgeTypesObject = ({ BezierEdge, StraightEdge, StepEdge }) => ({
  bezier: BezierEdge,
  step: StepEdge,
  straight: StraightEdge,
  default: BezierEdge
});

/**
 * TranscriptSummaryContent - Component for AI-powered transcript analysis using React Flow
 * 
 * @returns {React.ReactElement} The transcript summary interface with React Flow
 */
function TranscriptSummaryContent() {
  // React refs
  const reactFlowWrapper = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  
  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Testing mode - Set to true to disable actual database operations
  const [testingMode] = useState(true);
  
  // Initialize transcript data
  const transcriptData = useTranscriptData();
  const {
    transcript,
    setTranscript,
    transcriptFile,
    setTranscriptFile,
    audioUrl,
    setAudioUrl,
    summaries,
    setSummaries,
    documentName,
    setDocumentName,
    systemMessage,
    setSystemMessage,
    savedToDatabase,
    setSavedToDatabase,
    youtubeUrl,
    setYoutubeUrl,
    youtubeEmbedUrl,
    setYoutubeEmbedUrl,
    currentTimestamp,
    setCurrentTimestamp,
    savingToDatabase,
    setSavingToDatabase,
    handleSummaryChange,
    handleEditSummary,
    handleKeyPointChange,
    handleAddKeyPoint,
    handleRemoveKeyPoint,
    handleYoutubeUrlSubmit,
    jumpToTimestamp,
    handleResetData
  } = transcriptData;
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [reactFlowInitialized, setReactFlowInitialized] = useState(false);
  
  // Development mode state
  const [isDevMode, setIsDevMode] = useState(() => {
    return DEV_MODE && localStorage.getItem('flow_dev_mode') === 'true';
  });

  // Grid and alignment settings
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);

  // React Flow instance
  const reactFlowInstance = useReactFlow();
  
  // Edge types - memoized to prevent re-creation on each render
  const edgeTypes = useMemo(() => 
    getEdgeTypesObject({ BezierEdge, StraightEdge, StepEdge }), 
    [BezierEdge, StraightEdge, StepEdge]
  );

  // Set up drag and drop handlers
  const {
    isDragging,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop
  } = useDragAndDrop(reactFlowInstance, setNodes, setEdges, summaries);

  // Initialize React Flow nodes and edges
  useEffect(() => {
    // Define the spacing and dimensions with more generous values
    const nodeWidth = 320;
    const nodeHeight = 400;
    const horizontalGap = 150;
    const verticalGap = 80;

    // Calculate positions with more generous spacing
    const column1X = 50;
    const column2X = column1X + nodeWidth + horizontalGap;
    const row1Y = 50;
    const row2Y = row1Y + nodeHeight + verticalGap;

    // Create default nodes with all the required data
    const defaultNodes = getDefaultNodes(column1X, column2X, row1Y, row2Y, nodeWidth, {
      handleTranscriptUpload,
      handleAudioUpload,
      documentName,
      setDocumentName,
      youtubeUrl,
      setYoutubeUrl,
      handleYoutubeUrlSubmit,
      systemMessage,
      setSystemMessage,
      processTranscript,
      transcript,
      summaries,
      audioUrl,
      audioRef,
      jumpToTimestamp: (timestamp) => jumpToTimestamp(timestamp, audioRef, videoRef),
      handleSaveToDatabase,
      savingToDatabase,
      savedToDatabase,
      handleSummaryChange,
      handleKeyPointChange,
      handleAddKeyPoint,
      handleRemoveKeyPoint,
      handleEditSummary,
      youtubeEmbedUrl,
      videoRef,
      currentTimestamp,
      setCurrentTimestamp
    });
    
    // Create default edges
    const defaultEdges = getDefaultEdges();

    // Try to load saved layout from localStorage
    const savedLayout = localStorage.getItem('flow_layout');
    
    if (savedLayout) {
      try {
        // Parse the saved layout
        const layoutData = JSON.parse(savedLayout);
        
        // Merge the saved positions with the default nodes
        const updatedNodes = defaultNodes.map(defaultNode => {
          // Find matching saved node position
          const savedNode = layoutData.nodes.find(n => n.id === defaultNode.id);
          
          if (savedNode) {
            // Merge the position and style from saved layout with data from default node
            return {
              ...defaultNode,
              position: savedNode.position,
              style: { ...defaultNode.style, ...savedNode.style }
            };
          }
          
          return defaultNode;
        });
        
        // Restore visualization nodes from saved layout
        const visualizationNodes = layoutData.nodes
          .filter(node => node.isVisualization && node.id.startsWith('viz-'))
          .map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            style: node.style || { width: 400, height: 400 },
            data: { 
              label: node.type === 'keywordBubble' ? 'Keyword Bubble Chart' : 'Location Map',
              summaries: summaries ? {
                overallSummary: summaries.overallSummary,
                keyPoints: summaries.keyPoints
              } : null
            }
          }));
        
        // Get all saved edges plus the default edges
        let allEdges = [...defaultEdges];
        
        // Add saved edges if they exist
        if (layoutData.edges) {
          // Filter out edges that connect to visualization nodes, as we'll restore them from saved layout
          allEdges = allEdges.filter(edge => 
            !edge.target.startsWith('viz-') && !edge.source.startsWith('viz-')
          );
          
          // Add edges from saved layout that connect to visualization nodes
          const visualizationEdges = layoutData.edges.filter(edge => 
            edge.target.startsWith('viz-') || edge.source.startsWith('viz-')
          );
          
          allEdges = [...allEdges, ...visualizationEdges];
        } else {
          // Fallback to creating default visualization edges if no saved edges
          const visualizationEdges = visualizationNodes.map(node => ({
            id: `e5-${node.id}`,
            source: '5', // Metadata node
            target: node.id,
            sourceHandle: 'metadata-output',
            targetHandle: 'viz-input',
            animated: true,
            style: { stroke: '#818cf8', strokeWidth: 2 }
          }));
          
          allEdges = [...allEdges, ...visualizationEdges];
        }
        
        // Set nodes and edges
        setNodes([...updatedNodes, ...visualizationNodes]);
        setEdges(allEdges);
      } catch (error) {
        console.error('Error loading saved layout:', error);
        // Fall back to default layout if there's an error
        setNodes(defaultNodes);
        setEdges(defaultEdges);
      }
    } else {
      // Use default layout
      setNodes(defaultNodes);
      setEdges(defaultEdges);
    }
  }, [summaries]);

  // Save current layout to localStorage
  const saveLayout = () => {
    try {
      // Get all node positions and edges
      const layout = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          style: node.style,
          // For visualization nodes, save the data too
          ...(node.id.startsWith('viz-') ? { 
            isVisualization: true 
          } : {})
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          animated: edge.animated,
          style: edge.style
        }))
      };
      
      localStorage.setItem('flow_layout', JSON.stringify(layout));
      
      // Show a non-blocking toast-like message instead of an alert
      const messageDiv = document.createElement('div');
      messageDiv.innerHTML = 'Layout saved successfully!';
      messageDiv.style.position = 'fixed';
      messageDiv.style.bottom = '20px';
      messageDiv.style.left = '50%';
      messageDiv.style.transform = 'translateX(-50%)';
      messageDiv.style.backgroundColor = '#4CAF50';
      messageDiv.style.color = 'white';
      messageDiv.style.padding = '10px 20px';
      messageDiv.style.borderRadius = '4px';
      messageDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      messageDiv.style.zIndex = '1000';
      
      document.body.appendChild(messageDiv);
      
      // Remove the message after 2 seconds
      setTimeout(() => {
        document.body.removeChild(messageDiv);
      }, 2000);
    } catch (error) {
      console.error('Error saving layout:', error);
      setError('Failed to save layout. Please try again.');
    }
  };

  // Reset layout to default
  const resetLayout = () => {
    if (window.confirm('Are you sure you want to reset the layout to default?')) {
      try {
        localStorage.removeItem('flow_layout');
        
        // Instead of reloading the page, just reset the nodes and edges
        const column1X = 50;
        const column2X = column1X + 320 + 150;
        const row1Y = 50;
        const row2Y = row1Y + 400 + 80;
        
        const defaultNodes = getDefaultNodes(column1X, column2X, row1Y, row2Y, 320, {
          handleTranscriptUpload,
          handleAudioUpload,
          documentName,
          setDocumentName,
          youtubeUrl,
          setYoutubeUrl,
          handleYoutubeUrlSubmit,
          systemMessage,
          setSystemMessage,
          processTranscript,
          transcript,
          summaries,
          audioUrl,
          audioRef,
          jumpToTimestamp: (timestamp) => jumpToTimestamp(timestamp, audioRef, videoRef),
          handleSaveToDatabase,
          savingToDatabase,
          savedToDatabase,
          handleSummaryChange,
          handleKeyPointChange,
          handleAddKeyPoint,
          handleRemoveKeyPoint,
          handleEditSummary,
          youtubeEmbedUrl,
          videoRef,
          currentTimestamp,
          setCurrentTimestamp
        });
        
        const defaultEdges = getDefaultEdges();
        
        setNodes(defaultNodes);
        setEdges(defaultEdges);
        
        // Show success message
        const messageDiv = document.createElement('div');
        messageDiv.innerHTML = 'Layout reset successfully!';
        messageDiv.style.position = 'fixed';
        messageDiv.style.bottom = '20px';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.backgroundColor = '#2196F3';
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.borderRadius = '4px';
        messageDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        messageDiv.style.zIndex = '1000';
        
        document.body.appendChild(messageDiv);
        
        // Remove the message after 2 seconds
        setTimeout(() => {
          document.body.removeChild(messageDiv);
        }, 2000);
      } catch (error) {
        console.error('Error resetting layout:', error);
        setError('Failed to reset layout. Please try again.');
      }
    }
  };

  // Toggle development mode
  const toggleDevMode = () => {
    const newDevMode = !isDevMode;
    setIsDevMode(newDevMode);
    localStorage.setItem('flow_dev_mode', newDevMode);
    // Don't remove saved layout when toggling dev mode
    window.location.reload();
  };

  // Toggle grid snapping
  const toggleGrid = useCallback(() => {
    setSnapToGrid(!snapToGrid);
  }, [snapToGrid]);

  // Update node styles when state changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        // Maintain node width settings to prevent resizing
        const style = node.style || {};
        
        if (node.id === '1') {
          return {
            ...node,
            data: {
              ...node.data,
              documentName,
              youtubeUrl,
            },
            style
          };
        } else if (node.id === '2') {
          return {
            ...node,
            data: {
              ...node.data,
              systemMessage,
              canProcess: !!transcript
            },
            style
          };
        } else if (node.id === '3') {
          return {
            ...node,
            data: {
              ...node.data,
              summaries,
              audioUrl,
              audioRef,
              jumpToTimestamp: (timestamp) => jumpToTimestamp(timestamp, audioRef, videoRef),
              onSaveToDatabase: handleSaveToDatabase,
              savingToDatabase,
              savedToDatabase,
              onSummaryChange: handleSummaryChange,
              onKeyPointChange: handleKeyPointChange,
              onAddKeyPoint: handleAddKeyPoint,
              onRemoveKeyPoint: handleRemoveKeyPoint,
              onEditSummary: handleEditSummary
            },
            style
          };
        } else if (node.id === '4') {
          return {
            ...node,
            data: {
              ...node.data,
              youtubeEmbedUrl,
              videoRef,
              currentTimestamp,
              summaries,
              onUpdateTimestamp: setCurrentTimestamp
            },
            style
          };
        }
        return node;
      })
    );
  }, [
    systemMessage, 
    transcript, 
    summaries, 
    audioUrl, 
    savingToDatabase, 
    savedToDatabase, 
    documentName, 
    youtubeUrl, 
    youtubeEmbedUrl,
    currentTimestamp
  ]);

  /**
   * Handles transcript file upload
   * 
   * @param {File} file - The uploaded transcript file
   */
  const handleTranscriptUpload = async (file) => {
    try {
      setTranscriptFile(file);
      const text = await readFileAsText(file);
      setTranscript(text);
      
      // Update node data to reflect that transcript is available
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === '2') {
            node.data = {
              ...node.data,
              canProcess: true
            };
          }
          return node;
        })
      );
    } catch (error) {
      console.error("Error reading transcript file:", error);
      setError("Failed to read transcript file");
    }
  };

  /**
   * Handles audio file upload
   * 
   * @param {File} file - The uploaded audio file
   */
  const handleAudioUpload = (file) => {
    const audioUrl = URL.createObjectURL(file);
    setAudioUrl(audioUrl);
  };

  /**
   * Processes the transcript using OpenAI API
   */
  const processTranscript = async () => {
    if (!transcript) return;
    
    try {
      setLoading(true);
      setError(null);

      if (!documentName) {
        const name = prompt("Enter the name of the document for this interview:");
        if (!name) {
        setError("Document name is required");
          setLoading(false);
        return;
      }
        setDocumentName(name.trim());
      }
      
      const summaries = await getSummariesFromChatGPT(transcript, systemMessage);
      
      setSummaries(summaries);
      // Reset the saved state when generating new results
      setSavedToDatabase(false);
    } catch (error) {
      console.error("Error processing transcript:", error);
      setError("Failed to process transcript");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles saving processed results to the database
   */
  const handleSaveToDatabase = async () => {
    try {
      setSavingToDatabase(true);
      
      // In testing mode, we just simulate the saving process
      if (testingMode) {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSavedToDatabase(true);
        setSavingToDatabase(false);
        return;
      }

      // This would be the real database operation in production
      await saveProcessedTranscript(documentName, summaries, db);
      
      setSavedToDatabase(true);
    } catch (error) {
      console.error("Error saving to database:", error);
      setError("Failed to save to database");
    } finally {
      setSavingToDatabase(false);
    }
  };

  // Connect two nodes with an edge
  const onConnect = useCallback(
    (params) => connectNodes(params, setEdges),
    [setEdges]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (edgesToDelete) => {
      if (!isDevMode) return; // Only allow deletion in dev mode
      setEdges((eds) => eds.filter((edge) => !edgesToDelete.some((e) => e.id === edge.id)));
    },
    [setEdges, isDevMode]
  );

  // Handle node selection
  const onSelectionChange = useCallback((params) => {
    setSelectedNodes(params.nodes || []);
  }, []);

  // Straighten all connections to be either horizontal or vertical
  const straightenConnections = useCallback(() => {
    // First identify nodes that need to be aligned
    const edgePairs = edges.map(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      const targetNode = nodes.find(node => node.id === edge.target);
      
      return { edge, sourceNode, targetNode };
    }).filter(pair => pair.sourceNode && pair.targetNode);
    
    // Adjust node positions to create straight lines
    setNodes(nds => {
      const newNodes = [...nds];
      
      // For each edge pair, determine if horizontal or vertical alignment makes more sense
      edgePairs.forEach(({ sourceNode, targetNode }) => {
        // Calculate distances
        const xDiff = Math.abs(sourceNode.position.x - targetNode.position.x);
        const yDiff = Math.abs(sourceNode.position.y - targetNode.position.y);
        
        // Find the node to adjust (prefer moving target)
        const nodeToAdjust = newNodes.find(node => node.id === targetNode.id);
        
        // Determine if we should align horizontally or vertically based on which 
        // requires the smaller movement
        if (xDiff < yDiff) {
          // Align horizontally (adjust x)
          nodeToAdjust.position = {
            ...nodeToAdjust.position,
            x: sourceNode.position.x,
          };
        } else {
          // Align vertically (adjust y)
          nodeToAdjust.position = {
            ...nodeToAdjust.position,
            y: sourceNode.position.y,
          };
        }
      });
      
      return newNodes;
    });
    
    // Make edges orthogonal to complete the effect
    makeEdgesOrthogonal(nodes, setEdges);
  }, [edges, nodes, setNodes, setEdges]);

  // React Flow initialization callback
  const onInit = useCallback((instance) => {
    setReactFlowInitialized(true);
  }, []);

  // Update visualization nodes when summaries change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'keywordBubble' || node.type === 'mapVisualization') {
          return {
            ...node,
            data: {
              ...node.data,
              summaries
            }
          };
        }
        return node;
      })
    );
  }, [summaries, setNodes]);

  return (
    <div className="max-w-full mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <TranscriptHeader
        isDevMode={isDevMode}
        DEV_MODE={DEV_MODE}
        toggleDevMode={toggleDevMode}
        saveLayout={saveLayout}
        resetLayout={resetLayout}
        summaries={summaries}
        handleResetData={handleResetData}
        testingMode={testingMode}
      />

        {/* Error State */}
      <ErrorDisplay error={error} />

      {/* React Flow Canvas */}
      <div 
        style={{ width: '100%', height: '85vh' }} 
        className="bg-white rounded-xl shadow-md overflow-hidden"
        ref={reactFlowWrapper}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ 
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            animated: true
          }}
          fitView={true}
          fitViewOptions={{ 
            padding: 0.2,
            includeHiddenNodes: false,
            minZoom: 0.5,
            maxZoom: 1.5
          }}
          minZoom={0.3}
          maxZoom={2.5}
          snapToGrid={snapToGrid}
          snapGrid={[gridSize, gridSize]}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          proOptions={{ hideAttribution: false }}
          connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
          style={{ background: '#f9fafb' }}
          onInit={onInit}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <Controls 
            showInteractive={true} 
            position="bottom-right"
          />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              switch (node.id) {
                case '1': return '#93c5fd'; // blue-300
                case '2': return '#bfdbfe'; // blue-200
                case '3': return '#dbeafe'; // blue-100
                case '4': return '#ef4444'; // red-500 for video player
                default: return node.type === 'keywordBubble' ? '#60a5fa' : 
                        node.type === 'mapVisualization' ? '#34d399' : '#ccc';
              }
            }}
            maskColor="rgba(240, 240, 240, 0.3)"
          />
          <Background variant="dots" gap={16} size={1} color="#e2e8f0" />
          
          {/* Loading indicator */}
          <LoadingIndicator loading={loading} message="Processing transcript..." />
          
          {/* Node Alignment Tools */}
          <AlignmentTools
            isDevMode={isDevMode}
            selectedNodes={selectedNodes}
            alignHorizontally={() => alignNodesHorizontally(selectedNodes, setNodes)}
            alignVertically={() => alignNodesVertically(selectedNodes, setNodes)}
            distributeHorizontally={() => distributeNodesHorizontally(selectedNodes, setNodes)}
            distributeVertically={() => distributeNodesVertically(selectedNodes, setNodes)}
            straightenConnections={straightenConnections}
            makeEdgesOrthogonal={() => makeEdgesOrthogonal(nodes, setEdges)}
            snapToGrid={snapToGrid}
            toggleGrid={toggleGrid}
          />
          
          {/* Visualization Toolbar - Only show after summaries are generated */}
          {summaries && (
            <Panel position="top-right" className="visualization-toolbar-panel">
              <VisualizationToolbar onDragStart={onDragStart} />
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function TranscriptSummary() {
  return (
    <ReactFlowProvider>
      <TranscriptSummaryContent />
    </ReactFlowProvider>
  );
}