/**
 * @fileoverview TranscriptSummary component for processing interview transcripts with AI using React Flow.
 * 
 * This component provides an interface for uploading, processing, and viewing
 * AI-generated summaries of interview transcripts. It uses React Flow to create a workflow
 * with nodes for transcript input, prompt editing, and result display.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  Panel,
  BezierEdge, 
  StraightEdge, 
  StepEdge,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaUpload, FaPlay, FaYoutube, FaSave, FaPlusCircle, FaMinusCircle, FaEdit, FaMagic } from 'react-icons/fa';
import dagre from 'dagre';

// Import Firebase
import { db } from '../services/firebase';

// Import BasicFlow component
import BasicFlowContent from '../examples/BasicFlow';

// Import node components and utilities
import { nodeTypes } from '../components/nodes';
import TranscriptHeader from '../components/TranscriptHeader';
import ErrorDisplay from '../components/ErrorDisplay';
import LoadingIndicator from '../components/LoadingIndicator';
import NodesToolbar from '../components/NodesToolbar';
import VideoPanel from '../components/VideoPanel';

// Import hooks and utilities
import useTranscriptData from '../hooks/useTranscriptData';
import useNodeDragAndDrop from '../hooks/useNodeDragAndDrop';
import { 
  readFileAsText, 
  getSummariesFromChatGPT, 
  saveProcessedTranscript 
} from '../utils/transcriptUtils';
import {
  createNodeFromType, 
  getNodeConfig 
} from '../utils/nodeUtils';

// Development mode flag (we're keeping this for other potential uses, but not for layout)
const DEV_MODE = import.meta.env.DEV;

// Define edge types once outside the component
const edgeTypes = {
  default: BezierEdge,
  straight: StraightEdge,
  step: StepEdge
};

// Layout direction enum
const LAYOUT_DIRECTION = {
  HORIZONTAL: 'LR',
  VERTICAL: 'TB',
};

// Auto layout function using dagre
const getLayoutedElements = (nodes, edges, direction = LAYOUT_DIRECTION.HORIZONTAL) => {
  if (nodes.length === 0) return { nodes, edges };
  
  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  
  // Optimized parameters for horizontal layout
  const nodeWidth = 350;
  const nodeHeight = 250;
  const rankSeparation = 350;  // Space between columns
  const nodeSeparation = 450;  // Space between rows
  
  // Set graph options
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSeparation,
    nodesep: nodeSeparation,
    edgesep: 100,
    marginx: 70,
    marginy: 120,
  });
  
  // Default to assigning node and edge data as a new object to avoid mutations
  dagreGraph.setDefaultNodeLabel(() => ({}));
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Add nodes to dagre graph with dimensions
  nodes.forEach((node) => {
    // Get node style dimensions if specified
    const nodeStyle = node.style || {};
    const nodeStyleWidth = nodeStyle.width;
    const nodeStyleHeight = nodeStyle.height;
    
    dagreGraph.setNode(node.id, { 
      width: nodeStyleWidth || (
        node.type === 'resultsDisplay' ? nodeWidth + 100 : 
        node.type === 'metadata' ? nodeWidth + 50 : 
        node.type === 'keywordBubble' ? 600 :
        nodeWidth
      ),
      height: nodeStyleHeight || (
        node.type === 'resultsDisplay' ? nodeHeight + 100 : 
        node.type === 'videoPlayer' ? nodeHeight + 150 : 
        node.type === 'keywordBubble' ? 550 :
        nodeHeight 
      )
    });
  });
  
  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  // Calculate layout
  dagre.layout(dagreGraph);
  
  // Assign calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Keep the original style properties
    const style = { ...(node.style || {}) };
    
    // For keyword bubble node, use a fixed position far to the right
    if (node.type === 'keywordBubble') {
      style.width = style.width || 600;
      style.height = style.height || 550;
      
      // Calculate the average y position of all metadata nodes for centering
      let metadataNodes = [];
      let avgY = 0;
      
      // Find all metadata nodes to calculate average Y position
      nodes.forEach(otherNode => {
        if (otherNode.type === 'metadata') {
          const otherPosition = dagreGraph.node(otherNode.id);
          if (otherPosition) {
            metadataNodes.push({
              id: otherNode.id,
              y: otherPosition.y
            });
          }
        }
      });
      
      if (metadataNodes.length > 0) {
        const totalY = metadataNodes.reduce((sum, node) => sum + node.y, 0);
        avgY = totalY / metadataNodes.length;
      } else {
        // If no metadata nodes, use the provided position
        avgY = nodeWithPosition ? nodeWithPosition.y : 0;
      }
      
      // Use a fixed absolute X position that's far to the right
      // This ensures consistent positioning regardless of other nodes
      const fixedXPosition = 3000;
      
      console.log('Using fixed position for keyword bubble:', fixedXPosition);
      
      return {
        ...node,
        position: {
          x: fixedXPosition,
          y: avgY - (style.height / 2), // Center vertically using average metadata node Y position
        },
        style
      };
    }
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
      style
    };
  });
  
  return { nodes: layoutedNodes, edges };
};

// Helper function to format YouTube URLs
const formatYoutubeUrl = (url) => {
  if (!url) return "";
  
  // If it's already an embed URL, return it
  if (url.includes('youtube.com/embed')) {
    return url;
  }
  
  try {
    // Handle standard YouTube URLs
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // Handle youtu.be format
    if (url.includes('youtu.be')) {
      const videoId = url.split('/').pop().split('?')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
  } catch (error) {
    console.warn("Error parsing YouTube URL:", error);
  }
  
  // Return original if we couldn't parse it
  return url;
};

/**
 * TranscriptSummaryContent - Component for AI-powered transcript analysis using React Flow
 */
function TranscriptSummaryContent() {
  // React refs
  const reactFlowWrapper = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  
  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testingMode] = useState(true);
  const [flowView, setFlowView] = useState('none'); // 'none' or 'basic'
  const [showToolbar, setShowToolbar] = useState(false);
  const [queuedTranscripts, setQueuedTranscripts] = useState([]);
  const [showNotification, setShowNotification] = useState(true);
  const [processingStatus, setProcessingStatus] = useState({
    inProgress: false,
    current: 0,
    total: 0,
    message: ''
  });
  
  // State for video panel
  const [videoPanel, setVideoPanel] = useState({
    isOpen: false,
    videoUrl: '',
    documentName: '',
    summaries: null
  });
  
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
    handleResetData,
    model,
    setModel
  } = transcriptData;
  
  // React Flow state
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  // Custom node changes handler that applies auto layout after changes
  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      // Simply apply changes without automatic layout
      const newNodes = applyNodeChanges(changes, nds);
      return newNodes;
    });
  }, []);

  // Custom edge changes handler that applies auto layout after changes
  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      // Simply apply changes without automatic layout
      const newEdges = applyEdgeChanges(changes, eds);
      return newEdges;
    });
  }, []);

  // Connect nodes with auto layout - keep layout here as it's an explicit user action
  const onConnect = useCallback((params) => {
    setEdges((eds) => {
      const newEdges = addEdge({ 
        ...params, 
        animated: true,
        type: 'default'
      }, eds);
      
      // Apply layout after connection as this is a good UX expectation
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, newEdges);
      setNodes(layoutedNodes);
      return layoutedEdges;
    });
  }, [nodes, setNodes]);

  // Handle transcript file upload
  const handleTranscriptUpload = async (file) => {
    try {
      setTranscriptFile(file);
      const text = await readFileAsText(file);
      setTranscript(text);
    } catch (error) {
      console.error("Error reading transcript file:", error);
      setError("Failed to read transcript file");
    }
  };

  // Handle audio file upload
  const handleAudioUpload = (file) => {
    const audioUrl = URL.createObjectURL(file);
    setAudioUrl(audioUrl);
  };

  // Update the queued transcripts
  const handleQueueUpdate = (updatedQueue) => {
    setQueuedTranscripts(updatedQueue);
  };

  // Process a single transcript
  const processTranscript = async (transcriptText, docName, ytUrl, useModel = model) => {
    if (!transcriptText) return null;
    
    try {
      // Automatically set document name if not provided
      const processedDocName = docName || `Transcript-${Date.now()}`;
      
      // Process with OpenAI
      const summaryData = await getSummariesFromChatGPT(transcriptText, systemMessage, useModel);
      
      // Format YouTube URL if provided
      const formattedYoutubeUrl = ytUrl ? formatYoutubeUrl(ytUrl) : "";
      
      // Return the processed data
      return {
        documentName: processedDocName,
        transcript: transcriptText,
        summary: summaryData,
        youtubeUrl: ytUrl,
        youtubeEmbedUrl: formattedYoutubeUrl
      };
    } catch (error) {
      console.error("Error processing transcript:", error);
      throw error;
    }
  };

  // Process multiple transcripts
  const processMultipleTranscripts = async (transcriptQueue) => {
    if (transcriptQueue.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      setProcessingStatus({
        inProgress: true,
        current: 0,
        total: transcriptQueue.length,
        message: 'Starting batch processing...'
      });
      
      const processedResults = [];
      const newNodes = [...nodes];
      const newEdges = [...edges];
      
      // Get ID for prompt editing node if it exists
      const promptNodeId = nodes.find(node => node.type === 'promptEditing')?.id;
      // Get ID for transcript input node if it exists
      const inputNodeId = nodes.find(node => node.type === 'transcriptInput')?.id;
      
      // Process each transcript
      for (let i = 0; i < transcriptQueue.length; i++) {
        const item = transcriptQueue[i];
        
        setProcessingStatus({
          inProgress: true,
          current: i + 1,
          total: transcriptQueue.length,
          message: `Processing "${item.documentName}" (${i + 1}/${transcriptQueue.length})`
        });
        
        try {
          // Read file content
          const text = await readFileAsText(item.file);
          
          // Process the transcript
          const result = await processTranscript(text, item.documentName, item.youtubeUrl);
          
          if (result) {
            processedResults.push(result);
            
            // Create nodes for this transcript
            const baseId = `transcript-${Date.now()}-${i}`;
            const resultsNodeId = `${baseId}-results`;
            const metadataNodeId = `${baseId}-metadata`;
            
            // Results display node
            const resultsNode = {
              id: resultsNodeId,
              type: 'resultsDisplay',
              position: { x: 0, y: 0 }, // Position will be set by auto-layout
              data: { 
                label: `Results: ${result.documentName}`,
                documentName: result.documentName,
                summaries: result.summary,
                onSummaryChange: handleSummaryChange,
                onKeyPointChange: handleKeyPointChange,
                onAddKeyPoint: handleAddKeyPoint,
                onRemoveKeyPoint: handleRemoveKeyPoint,
                onEditSummary: handleEditSummary,
                onSaveToDatabase: handleSaveToDatabase,
                savingToDatabase: false,
                savedToDatabase: false,
                youtubeEmbedUrl: result.youtubeEmbedUrl,
                openVideoPanel: openVideoPanel
              }
            };
            
            // Metadata node
            const metadataNode = {
              id: metadataNodeId,
              type: 'metadata',
              position: { x: 0, y: 0 }, // Position will be set by auto-layout
              data: { 
                label: `Metadata: ${result.documentName}`,
                documentName: result.documentName,
                youtubeUrl: result.youtubeUrl || "",
                youtubeEmbedUrl: result.youtubeEmbedUrl,
                summaries: result.summary,
                transcript: text.substring(0, 300) + "...", // Preview of transcript
                savingToDatabase: false,
                savedToDatabase: false
              }
            };
            
            newNodes.push(resultsNode);
            newNodes.push(metadataNode);
            
            // Add edge from prompt node to results node if prompt node exists
            if (promptNodeId) {
              newEdges.push({
                id: `e-${promptNodeId}-${resultsNodeId}`,
                source: promptNodeId,
                target: resultsNodeId,
                animated: true,
                type: 'default'
              });
            }
            
            // Add edge from results node to metadata node
            newEdges.push({
              id: `e-${resultsNodeId}-${metadataNodeId}`,
              source: resultsNodeId,
              target: metadataNodeId,
              animated: true,
              type: 'default'
            });
          }
        } catch (error) {
          console.error(`Error processing "${item.documentName}":`, error);
        }
      }
      
      // Apply auto layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
      
      // Update the state with laid out nodes
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
      setProcessingStatus({
        inProgress: false,
        current: transcriptQueue.length,
        total: transcriptQueue.length,
        message: `Completed processing ${transcriptQueue.length} transcripts`
      });
      
      // Clear the queue after processing
      setQueuedTranscripts([]);
      
    } catch (error) {
      console.error("Error in batch processing:", error);
      setError("Failed to process transcripts batch");
      setProcessingStatus({
        inProgress: false,
        current: 0,
        total: 0,
        message: 'Error processing transcripts'
      });
    } finally {
      setLoading(false);
    }
  };

  // Save to database
  const handleSaveToDatabase = async () => {
    try {
      setSavingToDatabase(true);
      
      // Simulate database operation in testing mode
      if (testingMode) {
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

  // Function to open video panel
  const openVideoPanel = (videoUrl, documentName, summaries) => {
    setVideoPanel({
      isOpen: true,
      videoUrl,
      documentName,
      summaries
    });
  };
  
  // Function to close video panel
  const closeVideoPanel = () => {
    setVideoPanel(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // Create a function to create nodes with the right props
  const createNodeWithProps = useCallback((type, position, label) => {
    // Get default node configuration
    const nodeConfig = getNodeConfig(type, {
      // Input node props
      handleTranscriptUpload,
      handleAudioUpload,
      documentName,
      setDocumentName,
      youtubeUrl,
      setYoutubeUrl,
      handleYoutubeUrlSubmit,
      queuedTranscripts,
      onQueueUpdate: handleQueueUpdate,
      onProcessMultiple: processMultipleTranscripts,
      
      // Processing node props
      systemMessage,
      setSystemMessage,
      processTranscript,
      transcript,
      model,
      setModel,
      
      // Output node props
      summaries,
      audioUrl,
      audioRef,
      jumpToTimestamp,
      handleSaveToDatabase,
      savingToDatabase,
      savedToDatabase,
      handleSummaryChange,
      handleKeyPointChange,
      handleAddKeyPoint,
      handleRemoveKeyPoint,
      handleEditSummary,
      
      // Media node props
      youtubeEmbedUrl,
      videoRef,
      currentTimestamp,
      setCurrentTimestamp,
      
      // Add open video panel function for ResultsDisplayNode
      openVideoPanel
    });
    
    // Create the node with the right props
    return createNodeFromType(type, position, label, nodeConfig.data);
  }, [
    handleTranscriptUpload, handleAudioUpload, documentName, setDocumentName, 
    youtubeUrl, setYoutubeUrl, handleYoutubeUrlSubmit, systemMessage, 
    setSystemMessage, processTranscript, transcript, model, setModel, 
    summaries, audioUrl, audioRef, jumpToTimestamp, handleSaveToDatabase, 
    savingToDatabase, savedToDatabase, handleSummaryChange, handleKeyPointChange, 
    handleAddKeyPoint, handleRemoveKeyPoint, handleEditSummary, youtubeEmbedUrl, 
    videoRef, currentTimestamp, setCurrentTimestamp, queuedTranscripts,
    processMultipleTranscripts, openVideoPanel
  ]);

  // Setup drag and drop functionality
  const { onDragOver, onDrop } = useNodeDragAndDrop({
    onNodesChange: setNodes,
    createNodeFromType: createNodeWithProps
  });

  // Initialize nodes with default layout
  useEffect(() => {
    if (nodes.length === 0) {
      console.log("Initializing nodes with default layout");
      
      // Example of basic nodes
      const defaultNodes = [
        {
          id: '1',
          type: 'transcriptInput',
          position: { x: 100, y: 100 },
          data: { 
            label: 'Transcript Input',
            onTranscriptUpload: handleTranscriptUpload,
            onAudioUpload: handleAudioUpload,
            documentName,
            onDocumentNameChange: setDocumentName,
            youtubeUrl,
            onYoutubeUrlChange: setYoutubeUrl,
            onYoutubeUrlSubmit: handleYoutubeUrlSubmit,
            queuedTranscripts: [],
            onQueueUpdate: handleQueueUpdate,
            onProcessMultiple: processMultipleTranscripts
          }
        },
        {
          id: '2',
          type: 'promptEditing',
          position: { x: 100, y: 300 },
            data: {
            label: 'Prompt Editing',
            systemMessage,
            onSystemMessageChange: setSystemMessage,
            onProcess: processTranscript,
            model,
            onModelChange: setModel,
            canProcess: !!transcript
          }
        }
      ];
      
      // Set initial nodes and apply layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        defaultNodes, 
        [{
          id: 'e1-2',
          source: '1',
          target: '2',
          type: 'default',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 }
        }]
      );
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [
    nodes.length, 
    setNodes, 
    setEdges, 
    handleTranscriptUpload, 
    handleAudioUpload, 
    systemMessage, 
    setSystemMessage, 
    processTranscript, 
    model, 
    setModel, 
    transcript,
    documentName,
    setDocumentName,
    youtubeUrl,
    setYoutubeUrl,
    handleYoutubeUrlSubmit,
    processMultipleTranscripts
  ]);

  // Toggle toolbar visibility
  const toggleToolbar = () => {
    setShowToolbar(!showToolbar);
  };

  // Apply layout function for manual layout triggering if needed
  const applyLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <div className="max-w-full mx-auto p-4 bg-gray-50 min-h-screen font-sans">
      {/* Header with integrated Application Views */}
      <TranscriptHeader
        summaries={summaries}
        handleResetData={handleResetData}
        testingMode={testingMode}
        flowView={flowView}
        setFlowView={setFlowView}
      />
      
      {/* Error State */}
      <ErrorDisplay error={error} />

      {/* Loading indicator outside of ReactFlow for initial loading */}
      {loading && !flowView && (
        <div className="flex justify-center items-center p-4">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mr-3"></div>
          <span className="text-gray-500">Loading...</span>
        </div>
      )}

      {/* ReactFlow Area for Custom Analysis */}
      {flowView === 'none' ? (
        <div 
          style={{ width: '100%', height: '85vh' }} 
          className="bg-white rounded-xl shadow-md overflow-hidden relative"
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ animated: true }}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            <Controls 
              position="bottom-right"
              showZoom={true}
              showFitView={true}
              showInteractive={true}
              fitViewOptions={{ padding: 0.2 }}
              className="bg-white bg-opacity-80 p-1 rounded-lg shadow-md"
            />
            <MiniMap />
            <Background 
              variant="dots" 
              gap={16} 
              size={1.5}
              color="#aaaaaa"
              style={{ backgroundColor: "#f8fafc" }}
            />
            
            {/* Nodes Toolbar */}
            <Panel position="top-left" className={`transition-all duration-300 ${showToolbar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="relative">
                <button
                  onClick={toggleToolbar}
                  className="absolute -right-2 -top-2 bg-white p-1 rounded-full shadow-md hover:bg-gray-100 z-10"
                  title={showToolbar ? "Hide toolbar" : "Show toolbar"}
                >
                  {showToolbar ? "✕" : "✚"}
                </button>
                <NodesToolbar onDragStart={(event) => {
                  // This callback will be handled by the NodesToolbar component's handleDragStart function
                }} />
              </div>
            </Panel>
            
            {/* Show toolbar button when hidden */}
            {!showToolbar && (
              <Panel position="top-left">
                <button
                  onClick={toggleToolbar}
                  className="bg-blue-500 text-white p-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors flex items-center"
                >
                  <FaPlusCircle className="mr-2" />
                  Show Node Toolkit
                </button>
              </Panel>
            )}
            
            {/* Layout button */}
            <Panel position="top-right">
              <button
                onClick={applyLayout}
                className="bg-indigo-500 text-white p-3 rounded-lg shadow-md hover:bg-indigo-600 transition-colors flex items-center font-medium"
                title="Re-apply auto layout to organize nodes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Auto Layout
              </button>
            </Panel>
            
            {/* User notification about drag behavior */}
            {showNotification && (
              <Panel position="top-center" className="mt-2">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg shadow-md max-w-md text-sm relative">
                  <button 
                    onClick={() => setShowNotification(false)} 
                    className="absolute top-1 right-1 text-blue-500 hover:text-blue-700"
                    aria-label="Close notification"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <p>Nodes will now stay where you drop them! Use the <strong>Auto Layout</strong> button to organize your flow.</p>
                </div>
              </Panel>
            )}
            
            {/* Processing Status */}
            {processingStatus.inProgress && (
              <Panel position="bottom-center" className="mb-8 bg-white p-3 rounded-lg shadow-lg">
                <div className="text-center">
                  <div className="font-medium mb-1">Batch Processing</div>
                  <div className="text-sm text-gray-600">{processingStatus.message}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${(processingStatus.current / processingStatus.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {processingStatus.current} of {processingStatus.total} transcripts processed
                  </div>
                </div>
            </Panel>
          )}
            
            {/* Loading indicator */}
            <LoadingIndicator loading={loading} message="Processing transcript..." />
          </ReactFlow>
          
          {/* Video Panel */}
          <VideoPanel 
            isOpen={videoPanel.isOpen}
            onClose={closeVideoPanel}
            videoUrl={videoPanel.videoUrl}
            documentName={videoPanel.documentName}
            summaries={videoPanel.summaries}
            currentTimestamp={currentTimestamp}
            setCurrentTimestamp={setCurrentTimestamp}
          />
        </div>
      ) : (
        /* BasicFlow Component - Example View */
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <ReactFlowProvider>
            <BasicFlowContent embedded={true} />
          </ReactFlowProvider>
        </div>
      )}
    </div>
  );
}

/**
 * TranscriptSummary - Main component with ReactFlowProvider
 */
export default function TranscriptSummary() {
  return (
    <ReactFlowProvider>
      <TranscriptSummaryContent />
    </ReactFlowProvider>
  );
}