/**
 * Utility functions for React Flow
 */
import { addEdge } from 'reactflow';

/**
 * Get default nodes for transcript flow
 * 
 * @param {number} column1X - X position for first column
 * @param {number} column2X - X position for second column
 * @param {number} row1Y - Y position for first row
 * @param {number} row2Y - Y position for second row
 * @param {number} nodeWidth - Width of nodes
 * @param {Object} props - Props for node data
 * @returns {Array} Default nodes configuration
 */
export const getDefaultNodes = (column1X, column2X, row1Y, row2Y, nodeWidth, props) => [
  {
    id: '1',
    type: 'transcriptInput',
    position: { x: column1X, y: row1Y },
    style: { width: nodeWidth },
    data: { 
      onTranscriptUpload: props.handleTranscriptUpload,
      onAudioUpload: props.handleAudioUpload,
      documentName: props.documentName,
      onDocumentNameChange: props.setDocumentName,
      youtubeUrl: props.youtubeUrl,
      onYoutubeUrlChange: props.setYoutubeUrl,
      onYoutubeUrlSubmit: props.handleYoutubeUrlSubmit
    },
  },
  {
    id: '2',
    type: 'promptEditing',
    position: { x: column1X, y: row2Y },
    style: { width: nodeWidth },
    data: { 
      systemMessage: props.systemMessage,
      onSystemMessageChange: props.setSystemMessage,
      onProcess: props.processTranscript,
      canProcess: !!props.transcript
    },
  },
  {
    id: '3',
    type: 'resultsDisplay',
    position: { x: column2X, y: row1Y },
    style: { width: nodeWidth + 200 },
    data: { 
      summaries: props.summaries,
      audioUrl: props.audioUrl,
      audioRef: props.audioRef,
      jumpToTimestamp: props.jumpToTimestamp,
      onSaveToDatabase: props.handleSaveToDatabase,
      savingToDatabase: props.savingToDatabase,
      savedToDatabase: props.savedToDatabase,
      onSummaryChange: props.handleSummaryChange,
      onKeyPointChange: props.handleKeyPointChange,
      onAddKeyPoint: props.handleAddKeyPoint,
      onRemoveKeyPoint: props.handleRemoveKeyPoint,
      onEditSummary: props.handleEditSummary
    },
  },
  {
    id: '4',
    type: 'videoPlayer',
    position: { x: column2X, y: row2Y },
    style: { width: nodeWidth + 100 },
    data: {
      youtubeEmbedUrl: props.youtubeEmbedUrl,
      videoRef: props.videoRef,
      currentTimestamp: props.currentTimestamp,
      summaries: props.summaries,
      onUpdateTimestamp: props.setCurrentTimestamp
    },
  }
];

/**
 * Get default edges for transcript flow
 * 
 * @returns {Array} Default edges configuration
 */
export const getDefaultEdges = () => [
  { 
    id: 'e1-2', 
    source: '1', 
    target: '2',
    sourceHandle: 'transcript-output',
    targetHandle: 'prompt-left-input',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 }
  },
  { 
    id: 'e2-3', 
    source: '2', 
    target: '3',
    sourceHandle: 'prompt-output',
    targetHandle: 'results-left-input',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 }
  },
  {
    id: 'e4-3',
    source: '4',
    target: '3',
    sourceHandle: 'video-output',
    targetHandle: 'results-input',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 }
  }
];

/**
 * Get edge types for React Flow
 * 
 * @param {Object} edgeComponents - Edge components (BezierEdge, StraightEdge, StepEdge)
 * @returns {Object} Edge types configuration
 */
export const getEdgeTypes = (edgeComponents) => {
  const { BezierEdge, StraightEdge, StepEdge } = edgeComponents;
  return {
    bezier: BezierEdge,
    straight: StraightEdge,
    step: StepEdge,
  };
};

/**
 * Connect nodes with an edge
 * 
 * @param {Object} params - Connection parameters
 * @param {Function} setEdges - Function to set edges state
 */
export const connectNodes = (params, setEdges) => {
  setEdges((eds) => 
    addEdge(
      { 
        ...params, 
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }, 
      eds
    )
  );
};

/**
 * Align selected nodes horizontally
 * 
 * @param {Array} selectedNodes - Currently selected nodes
 * @param {Function} setNodes - Function to set nodes state
 */
export const alignNodesHorizontally = (selectedNodes, setNodes) => {
  if (selectedNodes.length < 2) return;
  
  // Calculate average Y position
  const avgY = selectedNodes.reduce((sum, node) => sum + node.position.y, 0) / selectedNodes.length;
  
  setNodes((nds) =>
    nds.map((node) => {
      if (selectedNodes.some(selectedNode => selectedNode.id === node.id)) {
        // Update node position to align horizontally
        return {
          ...node,
          position: {
            x: node.position.x,
            y: avgY,
          },
        };
      }
      return node;
    })
  );
};

/**
 * Align selected nodes vertically
 * 
 * @param {Array} selectedNodes - Currently selected nodes
 * @param {Function} setNodes - Function to set nodes state
 */
export const alignNodesVertically = (selectedNodes, setNodes) => {
  if (selectedNodes.length < 2) return;
  
  // Calculate average X position
  const avgX = selectedNodes.reduce((sum, node) => sum + node.position.x, 0) / selectedNodes.length;
  
  setNodes((nds) =>
    nds.map((node) => {
      if (selectedNodes.some(selectedNode => selectedNode.id === node.id)) {
        // Update node position to align vertically
        return {
          ...node,
          position: {
            x: avgX,
            y: node.position.y,
          },
        };
      }
      return node;
    })
  );
};

/**
 * Distribute nodes evenly horizontally
 * 
 * @param {Array} selectedNodes - Currently selected nodes
 * @param {Function} setNodes - Function to set nodes state
 */
export const distributeNodesHorizontally = (selectedNodes, setNodes) => {
  if (selectedNodes.length < 3) return;
  
  // Sort nodes by x position
  const sortedNodes = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
  
  // Calculate total distance
  const firstNode = sortedNodes[0];
  const lastNode = sortedNodes[sortedNodes.length - 1];
  const totalDistance = lastNode.position.x - firstNode.position.x;
  
  // Calculate step size
  const step = totalDistance / (sortedNodes.length - 1);
  
  // Update node positions
  setNodes((nds) =>
    nds.map((node) => {
      const index = sortedNodes.findIndex(n => n.id === node.id);
      if (index > 0 && index < sortedNodes.length - 1) {
        return {
          ...node,
          position: {
            x: firstNode.position.x + step * index,
            y: node.position.y,
          },
        };
      }
      return node;
    })
  );
};

/**
 * Distribute nodes evenly vertically
 * 
 * @param {Array} selectedNodes - Currently selected nodes
 * @param {Function} setNodes - Function to set nodes state
 */
export const distributeNodesVertically = (selectedNodes, setNodes) => {
  if (selectedNodes.length < 3) return;
  
  // Sort nodes by y position
  const sortedNodes = [...selectedNodes].sort((a, b) => a.position.y - b.position.y);
  
  // Calculate total distance
  const firstNode = sortedNodes[0];
  const lastNode = sortedNodes[sortedNodes.length - 1];
  const totalDistance = lastNode.position.y - firstNode.position.y;
  
  // Calculate step size
  const step = totalDistance / (sortedNodes.length - 1);
  
  // Update node positions
  setNodes((nds) =>
    nds.map((node) => {
      const index = sortedNodes.findIndex(n => n.id === node.id);
      if (index > 0 && index < sortedNodes.length - 1) {
        return {
          ...node,
          position: {
            x: node.position.x,
            y: firstNode.position.y + step * index,
          },
        };
      }
      return node;
    })
  );
};

/**
 * Make edges orthogonal (step-type edges)
 * 
 * @param {Array} nodes - Flow nodes
 * @param {Function} setEdges - Function to set edges state
 */
export const makeEdgesOrthogonal = (nodes, setEdges) => {
  setEdges((eds) => 
    eds.map((edge) => {
      // Find source and target nodes
      const sourceNode = nodes.find(node => node.id === edge.source);
      const targetNode = nodes.find(node => node.id === edge.target);
      
      if (sourceNode && targetNode) {
        // Create a new edge with orthogonal routing
        return {
          ...edge,
          type: 'step', // Use step type for orthogonal routing
          animated: edge.animated,
          style: { 
            ...edge.style,
            strokeWidth: 2,
            stroke: '#3b82f6',
          },
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        };
      }
      return edge;
    })
  );
}; 