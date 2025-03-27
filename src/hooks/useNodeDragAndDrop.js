import { useCallback, useState } from 'react';

/**
 * Custom hook for managing drag and drop operations for nodes in ReactFlow
 * 
 * @param {Object} options - Hook options
 * @param {Function} options.onNodesChange - Function to update nodes state
 * @param {Function} options.createNodeFromType - Function to create a node from a type
 * @returns {Object} Drag and drop handlers and state
 */
const useNodeDragAndDrop = (options = {}) => {
  const [isDragging, setIsDragging] = useState(false);
  const { onNodesChange, createNodeFromType } = options;

  // Handle drag start
  const onDragStart = useCallback((event) => {
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
      setIsDragging(false);

      try {
        // Get position where the element is dropped
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top
        };

        // Get the dragged node data
        const nodeData = JSON.parse(
          event.dataTransfer.getData('application/reactflow')
        );

        if (!nodeData || !nodeData.type) {
          return;
        }

        // Create the new node
        const newNode = createNodeFromType(nodeData.type, position, nodeData.label);
        
        // Update nodes state
        onNodesChange((nds) => [...nds, newNode]);
      } catch (error) {
        console.error('Error handling node drop:', error);
      }
    },
    [createNodeFromType, onNodesChange]
  );

  return {
    isDragging,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop
  };
};

export default useNodeDragAndDrop; 