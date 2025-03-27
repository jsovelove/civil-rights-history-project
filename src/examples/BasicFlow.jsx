import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  Panel
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { FaPlusCircle } from 'react-icons/fa';
import useNodeDragAndDrop from '../hooks/useNodeDragAndDrop';
import { createNodeFromType, getNodeConfig } from '../utils/nodeUtils';

// Import node types from the node registry
import { nodeTypes } from '../components/nodes';
import VideoPanel from '../components/VideoPanel';
import NodesToolbar from '../components/NodesToolbar';

// Layout direction enum
const LAYOUT_DIRECTION = {
  HORIZONTAL: 'LR',
  VERTICAL: 'TB',
};

// Auto layout function using dagre
const getLayoutedElements = (nodes, edges, direction = LAYOUT_DIRECTION.HORIZONTAL) => {
  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  
  // Optimized parameters for horizontal layout
  const nodeWidth = 350;
  const nodeHeight = 250;
  const rankSeparation = 400;  // Increased from 350 to accommodate larger keyword bubble
  const nodeSeparation = 550;  // Increased from 500 to give more vertical space
  
  // Set graph options
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSeparation,
    nodesep: nodeSeparation,
    edgesep: 120,  // Increased from 100
    marginx: 100,  // Increased from 70
    marginy: 150,  // Increased from 120
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
    
    // Use style dimensions if available, otherwise use defaults based on node type
    dagreGraph.setNode(node.id, { 
      width: nodeStyleWidth || (
        node.type === 'resultsDisplay' ? nodeWidth + 100 : 
        node.type === 'metadata' ? nodeWidth + 50 : 
        node.type === 'keywordBubble' ? 600 :  // Updated from 450 to 600
        nodeWidth
      ),
      height: nodeStyleHeight || (
        node.type === 'resultsDisplay' ? nodeHeight + 100 : 
        node.type === 'videoPlayer' ? nodeHeight + 150 : 
        node.type === 'keywordBubble' ? 550 :  // Updated from 450 to 550
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
      style.width = 600;
      style.height = 550;
      
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
      const fixedXPosition = 5000;
      
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

// Function to create nodes and edges from interview data
const createNodesAndEdges = (data, openVideoPanel) => {
  const nodes = [];
  const edges = [];
  
  // Add an input node
  const inputNodeId = 'input-node';
  nodes.push({
    id: inputNodeId,
    type: 'transcriptInput',
    position: { x: 0, y: 0 },
    data: { 
      label: 'Transcript Input',
      queuedTranscripts: data.map(interview => ({
        documentName: interview.docName,
        youtubeUrl: interview.youtubeUrl,
        file: { name: `${interview.docName}.txt` } // Mock file object
      })),
      onProcessMultiple: () => {}, // No-op function for demo
      onQueueUpdate: () => {}     // No-op function for demo
    }
  });
  
  // Add a prompt editing node
  const promptNodeId = 'prompt-node';
  nodes.push({
    id: promptNodeId,
    type: 'promptEditing',
    position: { x: 0, y: 0 },
    data: { 
      label: 'System Prompt',
      systemMessage: "Analyze the provided civil rights oral history transcript to extract key information. Create a comprehensive summary of the entire interview capturing the main themes, historical context, and significance. Identify 5-6 key segments from the interview, noting timestamps, topics, and providing brief summaries of each segment.",
      model: "gpt-4o-mini"
    }
  });
  
  // Connect input to prompt node
  edges.push({
    id: `${inputNodeId}-${promptNodeId}`,
    source: inputNodeId,
    target: promptNodeId,
    animated: true,
    type: 'default',
  });
  
  // Create a single keyword bubble node that will combine all keywords
  const keywordNodeId = 'combined-keywords';
  
  // Now add result nodes for each interview
  data.forEach((interview, index) => {
    // Check if the interview has the expected structure
    if (!interview.docName || !interview.summary) {
      console.warn(`Interview at index ${index} is missing required fields`);
      return; // Skip this interview
    }
    
    const baseId = `interview-${index}`;
    const resultsNodeId = `${baseId}-results`;
    const metadataNodeId = `${baseId}-metadata`;
    
    // Create results display node
    nodes.push({
      id: resultsNodeId,
      type: 'resultsDisplay',
      position: { x: 0, y: 0 }, // Position will be set by auto-layout
      data: { 
        label: `Interview: ${interview.docName}`,
        documentName: interview.docName,
        summaries: interview.summary || {},
        overallSummary: interview.summary?.overallSummary || "No summary available",
        keyPoints: interview.summary?.keyPoints || [],
        timestamp: interview.timestamp || new Date().toISOString(),
        youtubeEmbedUrl: formatYoutubeUrl(interview.youtubeUrl || ""),
        openVideoPanel: (url, name, summaries) => {
          openVideoPanel(url || formatYoutubeUrl(interview.youtubeUrl || ""), 
                         name || interview.docName,
                         summaries || interview.summary || {})
        }
      }
    });
    
    // Create metadata node
    nodes.push({
      id: metadataNodeId,
      type: 'metadata',
      position: { x: 0, y: 0 }, // Position will be set by auto-layout
      data: { 
        label: `Metadata: ${interview.docName}`,
        documentName: interview.docName,
        youtubeUrl: interview.youtubeUrl || "",
        youtubeEmbedUrl: formatYoutubeUrl(interview.youtubeUrl || ""),
        summaries: {
          overallSummary: interview.summary?.overallSummary || "No summary available",
          keyPoints: interview.summary?.keyPoints?.map(point => ({
            topic: point.topic || "",
            timestamp: point.timestamp || "",
            summary: point.summary || "",
            content: point.summary || "",
            keywords: typeof point.keywords === 'string' 
              ? point.keywords 
              : Array.isArray(point.keywords) 
                ? point.keywords.join(', ') 
                : ""
          })) || []
        }
      }
    });
    
    // Connect prompt node to results node
    edges.push({
      id: `${promptNodeId}-${resultsNodeId}`,
      source: promptNodeId,
      target: resultsNodeId,
      animated: true,
      type: 'default',
    });
    
    // Connect results node to metadata node
    edges.push({
      id: `${resultsNodeId}-${metadataNodeId}`,
      source: resultsNodeId,
      target: metadataNodeId,
      animated: true,
      type: 'default',
    });
  });
  
  // Create a single keyword bubble node that combines all keywords from all interviews
  // This is added after all the interviews to ensure proper connections
  nodes.push({
    id: keywordNodeId,
    type: 'keywordBubble',
    position: { x: 0, y: 0 }, // Position will be set by auto-layout
    style: { width: 600, height: 550 }, // Increased size from 450x450 to 600x550
    data: { 
      label: 'Civil Rights Keywords Visualization',
      description: 'Combined keywords from all interviews',
      documentName: 'All Interviews',
      // Combine all summaries into one data structure for the bubble chart
      summaries: {
        overallSummary: data.map(interview => interview.summary?.overallSummary || "").join(" "),
        keyPoints: data.flatMap(interview => 
          interview.summary?.keyPoints?.map(point => ({
            topic: point.topic || "",
            keywords: point.keywords || ""
          })) || []
        )
      }
    }
  });
  
  // Connect all metadata nodes to the single keyword bubble node
  data.forEach((interview, index) => {
    if (!interview.docName || !interview.summary) return;
    
    const baseId = `interview-${index}`;
    const metadataNodeId = `${baseId}-metadata`;
    
    edges.push({
      id: `${metadataNodeId}-${keywordNodeId}`,
      source: metadataNodeId,
      target: keywordNodeId,
      animated: true,
      type: 'default',
    });
  });
  
  // Always apply auto layout
  return getLayoutedElements(nodes, edges, LAYOUT_DIRECTION.HORIZONTAL);
};

// Helper function to ensure YouTube URLs are in embed format
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

// Main component
function BasicFlowContent({ embedded = false }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showToolbar, setShowToolbar] = useState(true);
  
  // Video panel state
  const [videoPanel, setVideoPanel] = useState({
    isOpen: false,
    videoUrl: '',
    documentName: '',
    summaries: null
  });
  
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
  
  // Toggle toolbar visibility
  const toggleToolbar = () => {
    setShowToolbar(!showToolbar);
  };
  
  // Create a function to create nodes with the right props
  const createNodeWithProps = useCallback((type, position, label) => {
    // Get default node configuration
    const nodeConfig = getNodeConfig(type, {
      // Basic props
      openVideoPanel,
      
      // For metadata nodes
      documentName: 'Example Document',
      summaries: {
        overallSummary: 'This is an example summary for a node created from the toolbar.',
        keyPoints: [
          { topic: 'Example Topic 1', timestamp: '00:15', summary: 'Example point 1' },
          { topic: 'Example Topic 2', timestamp: '01:30', summary: 'Example point 2' }
        ]
      }
    });
    
    // Create the node with the right props
    return createNodeFromType(type, position, label, nodeConfig.data);
  }, [openVideoPanel]);

  // Setup drag and drop functionality
  const { onDragOver, onDrop } = useNodeDragAndDrop({
    onNodesChange: setNodes,
    createNodeFromType: createNodeWithProps
  });
  
  // Fixed layout direction to horizontal
  const layoutDirection = LAYOUT_DIRECTION.HORIZONTAL;
  
  // Function to apply layout to current nodes (for any future use)
  const applyLayout = useCallback(() => {
    if (nodes.length === 0) return;
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = 
      getLayoutedElements(nodes, edges, layoutDirection);
    
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, layoutDirection, setNodes, setEdges]);
  
  // Fetch interview data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Try multiple paths to find the JSON file
        let response;
        
        try {
          response = await fetch('./testResults.json');
          if (!response.ok) throw new Error("Not found at root path");
        } catch (e) {
          try {
            console.log("Trying at public/testResults.json...");
            response = await fetch('public/testResults.json');
            if (!response.ok) throw new Error("Not found in public folder");
          } catch (e2) {
            try {
              console.log("Trying at ./testResults.json...");
              response = await fetch('./testResults.json');
              if (!response.ok) throw new Error("Not found in current directory");
            } catch (e3) {
              throw new Error("Could not find testResults.json in any location");
            }
          }
        }
        
        const data = await response.json();
        
        // Check if data is an array
        if (!Array.isArray(data)) {
          setError("Invalid data format: expected an array of interviews");
          setLoading(false);
          return;
        }
        
        // Check if we have any valid interviews
        if (data.length === 0) {
          setError("No interview data found");
          setLoading(false);
          return;
        }
        
        setInterviews(data);
        
        // Generate nodes and edges for all interviews by default with auto layout
        // Pass the openVideoPanel function to use in nodes
        const { nodes, edges } = createNodesAndEdges(data, openVideoPanel);
        
        // Check if we have any valid nodes
        if (nodes.length === 0) {
          setError("No valid interview data could be processed");
          setLoading(false);
          return;
        }
        
        setNodes(nodes);
        setEdges(edges);
      } catch (error) {
        console.error("Error fetching test results:", error);
        setError(`Failed to load interview data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [setNodes, setEdges]);
  
  // Update nodes when selected interview changes
  useEffect(() => {
    if (interviews.length === 0) return;
    
    // Log the interview data for debugging
    console.log("Interview data:", interviews);
    
    if (selectedInterview === null) {
      // Show all interviews
      const { nodes, edges } = createNodesAndEdges(interviews, openVideoPanel);
      setNodes(nodes);
      setEdges(edges);
    } else {
      // Show only the selected interview
      const selectedData = [interviews[selectedInterview]];
      console.log("Selected interview:", selectedData[0]);
      const { nodes, edges } = createNodesAndEdges(selectedData, openVideoPanel);
      setNodes(nodes);
      setEdges(edges);
    }
  }, [selectedInterview, interviews, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      type: 'default'
    }, eds)),
    [setEdges]
  );
  
  // Function to handle interview selection
  const handleInterviewSelect = (e) => {
    const value = e.target.value;
    setSelectedInterview(value === "all" ? null : Number(value));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading interview data...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded my-4">
        <h3 className="font-bold mb-2">Error Loading Data</h3>
        <p>{error}</p>
        <div className="mt-4">
          <p className="text-sm text-gray-700">Troubleshooting steps:</p>
          <ul className="list-disc pl-5 text-sm text-gray-700 mt-2">
            <li>Check that the file <code className="bg-red-50 px-1">testResults.json</code> exists in the public folder</li>
            <li>Verify that the JSON is correctly formatted</li>
            <li>Make sure each interview has docName, summary, and youtubeUrl fields</li>
          </ul>
          
          <div className="mt-4 p-2 bg-red-50 rounded text-xs font-mono">
            <p className="mb-1 font-bold">Debug Info:</p>
            <p>Current path: {window.location.pathname}</p>
            <p>Base URL: {window.location.origin}</p>
            <p>Error details: {error.toString()}</p>
          </div>
          
          {!embedded && (
            <Link 
              to="/transcript-summary" 
              className="inline-block mt-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
            >
              Return to Transcript Summary
            </Link>
          )}
        </div>
      </div>
    );
  }

  const height = embedded ? '75vh' : '80vh';

  return (
    <div style={{ width: '100%', height, border: '1px solid #ccc' }} className="relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        onDragOver={onDragOver}
        onDrop={onDrop}
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
        
        {/* Nodes Toolbar - moved to top-left */}
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
              // This callback will be handled by the NodesToolbar component
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
        
        {/* Interview selection panel - moved to top-right */}
        <Panel position="top-right" className="bg-white p-3 rounded shadow">
          <div className="flex flex-col space-y-3">
            <h3 className="font-semibold text-sm">Civil Rights Interviews</h3>
            <select 
              value={selectedInterview === null ? "all" : selectedInterview}
              onChange={handleInterviewSelect}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">Show Complete Workflow</option>
              {interviews.map((interview, index) => (
                <option key={index} value={index}>
                  {interview.docName}
                </option>
              ))}
            </select>
            
            <div className="text-xs text-gray-600">
              {selectedInterview === null ? (
                <span>Showing all {interviews.length} processed interviews</span>
              ) : (
                <span>Showing interview: {interviews[selectedInterview]?.docName}</span>
              )}
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Video Panel */}
      <VideoPanel 
        isOpen={videoPanel.isOpen}
        onClose={closeVideoPanel}
        videoUrl={videoPanel.videoUrl}
        documentName={videoPanel.documentName}
        summaries={videoPanel.summaries}
      />
    </div>
  );
}

// Wrap with provider for standalone mode
export default function BasicFlow() {
  return (
    <div className="max-w-full mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Civil Rights Interview Analysis Workflow</h1>
          <p className="text-gray-600 text-sm">
            Complete demonstration of transcript processing workflow from input to visualization
          </p>
        </div>
        <Link 
          to="/transcript-summary"
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
        >
          Back to Transcript Summary
        </Link>
      </div>
      
      <ReactFlowProvider>
        <BasicFlowContent />
      </ReactFlowProvider>
    </div>
  );
} 

// Export the content component for embedding
export { BasicFlowContent }; 