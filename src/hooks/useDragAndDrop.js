import { useCallback, useState } from 'react';

/**
 * Custom hook for managing drag and drop operations in React Flow
 * 
 * @param {Object} reactFlowInstance - The React Flow instance
 * @param {Function} setNodes - Function to set nodes state
 * @param {Function} setEdges - Function to set edges state
 * @param {Object|null} summaries - Summaries data
 * @returns {Object} Drag and drop handlers
 */
const useDragAndDrop = (reactFlowInstance, setNodes, setEdges, summaries) => {
  const [isDragging, setIsDragging] = useState(false);

  // Handle drag start
  const onDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle drag end
  const onDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle drag over
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node drop
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      // Get drag data
      const dragData = event.dataTransfer.getData('application/reactflow');
      
      // Return if the data is empty or the flow instance is not initialized
      if (!dragData || !reactFlowInstance) {
        return;
      }
      
      // Parse the drag data
      const nodeData = JSON.parse(dragData);
      
      // Get the drop position
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      
      // Create a new node
      const newNode = {
        id: `viz-${nodeData.id}-${Date.now()}`,
        type: nodeData.type,
        position,
        data: { 
          label: nodeData.label,
          // Only pass the data needed, avoid circular references
          summaries: summaries ? {
            overallSummary: summaries.overallSummary,
            keyPoints: summaries.keyPoints
          } : null
        },
        style: { width: 400, height: 400 },
      };
      
      // Add the node to the canvas
      setNodes((nds) => nds.concat(newNode));
      
      // Create an edge connecting metadata node to the visualization
      const newEdge = {
        id: `e5-${newNode.id}`,
        source: '5', // Metadata node
        target: newNode.id,
        sourceHandle: 'metadata-output',
        targetHandle: 'viz-input',
        animated: true,
        style: { stroke: '#818cf8', strokeWidth: 2 }
      };
      
      // Add the edge
      setEdges((eds) => eds.concat(newEdge));
    },
    [reactFlowInstance, setNodes, setEdges, summaries]
  );

  return {
    isDragging,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop
  };
};

export default useDragAndDrop; 