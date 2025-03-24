import React from 'react';
import { FaChartBar, FaMapMarkedAlt, FaLayerGroup } from 'react-icons/fa';

/**
 * VisualizationToolbar - Provides draggable visualization tools for the flow canvas
 * 
 * @param {Object} props - Component properties
 * @param {Function} props.onDragStart - Function to handle drag start event
 * @returns {React.ReactElement} Visualization toolbar component
 */
const VisualizationToolbar = ({ onDragStart }) => {
  // Node types that can be dragged onto the canvas
  const visualizationNodes = [
    {
      id: 'keyword-bubble',
      type: 'keywordBubble',
      label: 'Keyword Bubble Chart',
      description: 'Visualize keywords as interactive bubbles',
      icon: <FaChartBar className="text-blue-500" />,
    },
    {
      id: 'map-visualization',
      type: 'mapVisualization',
      label: 'Location Map',
      description: 'Map locations mentioned in the text',
      icon: <FaMapMarkedAlt className="text-blue-500" />,
    }
  ];

  /**
   * Handle drag start event for a node type
   * 
   * @param {Event} event - Drag event
   * @param {Object} nodeType - Type of node being dragged
   */
  const handleDragStart = (event, nodeType) => {
    // Create a simplified object that excludes any DOM elements or circular references
    const serializableData = {
      id: nodeType.id,
      type: nodeType.type,
      label: nodeType.label
    };
    
    // Set data for the drag event
    event.dataTransfer.setData('application/reactflow', JSON.stringify(serializableData));
    event.dataTransfer.effectAllowed = 'move';
    
    // Callback to parent component
    if (onDragStart) {
      onDragStart(event);
    }
  };

  return (
    <div className="visualization-toolbar bg-white rounded-xl shadow-md p-4 w-72">
      <div className="flex items-center mb-4">
        <FaLayerGroup className="text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold">Visualization Tools</h3>
      </div>
      
      <div className="mb-2">
        <p className="text-sm text-gray-500">Drag and drop to add visualizations</p>
      </div>
      
      <div className="grid gap-3">
        {visualizationNodes.map((node) => (
          <div
            key={node.id}
            className="border border-gray-200 rounded-lg p-3 cursor-grab hover:bg-blue-50 hover:border-blue-200 transition-colors"
            draggable
            onDragStart={(event) => handleDragStart(event, node)}
          >
            <div className="flex items-center">
              <div className="mr-3 text-xl">{node.icon}</div>
              <div>
                <h4 className="font-medium text-gray-900">{node.label}</h4>
                <p className="text-xs text-gray-500">{node.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Connects automatically to metadata when dropped
        </p>
      </div>
    </div>
  );
};

export default VisualizationToolbar; 