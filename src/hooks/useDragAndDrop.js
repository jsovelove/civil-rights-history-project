import { useCallback, useState } from 'react';
import { useFlow } from '../contexts/FlowContext';

/**
 * Custom hook for managing drag and drop operations in React Flow
 * 
 * @param {Object} options - Options for drag and drop
 * @param {Object|null} options.summaries - Summaries data to pass to visualization nodes
 * @returns {Object} Drag and drop handlers
 */
const useDragAndDrop = (options = {}) => {
  const { summaries } = options;
  const [isDragging, setIsDragging] = useState(false);
  
  // Get the flow context
  const { addNode } = useFlow();

  // Handle drag start
  const onDragStart = useCallback((event, nodeType) => {
    // Store the node type in the drag event
    if (event.dataTransfer) {
      const data = JSON.stringify({
        type: nodeType || event.target.getAttribute('data-node-type'),
        id: Date.now(),
        label: event.target.getAttribute('data-node-label') || 'Visualization'
      });
      
      event.dataTransfer.setData('application/reactflow', data);
      event.dataTransfer.effectAllowed = 'move';
    }
    
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
      
      // Return if the data is empty
      if (!dragData) {
        return;
      }
      
      try {
        // Parse the drag data
        const nodeData = JSON.parse(dragData);
        
        // Get the drop coordinates from React Flow
        // This is now handled by the ReactFlow instance in the Flow context
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top
        };
        
        // Add a new node using the Flow context
        addNode(
          nodeData.type, 
          position, 
          { 
            label: nodeData.label,
            summaries: summaries ? {
              overallSummary: summaries.overallSummary,
              keyPoints: summaries.keyPoints
            } : null
          }, 
          { 
            width: 400, 
            height: 400 
          }
        );
      } catch (error) {
        console.error('Error handling node drop:', error);
      } finally {
        setIsDragging(false);
      }
    },
    [addNode, summaries]
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