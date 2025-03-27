import React, { useState } from 'react';
import { 
  FaLayerGroup, 
  FaChartBar, 
  FaMapMarkedAlt, 
  FaFileAlt, 
  FaCogs, 
  FaRegFileAlt,
  FaVideo,
  FaInfoCircle,
  FaRegLightbulb
} from 'react-icons/fa';
import { Edit, FileText, Video, Zap, BarChart, Map, Info } from 'lucide-react';

/**
 * NodesToolbar - Comprehensive toolbar for adding nodes to the flow canvas
 * 
 * @param {Object} props - Component properties
 * @param {Function} props.onDragStart - Function to handle drag start event
 * @returns {React.ReactElement} Nodes toolbar component
 */
const NodesToolbar = ({ onDragStart }) => {
  const [activeTab, setActiveTab] = useState('all');

  // All node types organized by category
  const nodeCategories = {
    input: [
      {
        id: 'transcript-input',
        type: 'transcriptInput',
        label: 'Transcript Input',
        description: 'Upload and process transcript files',
        icon: <FileText className="text-blue-600" size={20} />,
      }
    ],
    processing: [
      {
        id: 'prompt-editing',
        type: 'promptEditing',
        label: 'System Prompt Editor',
        description: 'Edit AI processing prompts',
        icon: <Edit className="text-blue-600" size={20} />,
      }
    ],
    output: [
      {
        id: 'results-display',
        type: 'resultsDisplay',
        label: 'Results Display',
        description: 'Display processing results',
        icon: <Zap className="text-amber-500" size={20} />,
      }
    ],
    visualization: [
      {
        id: 'keyword-bubble',
        type: 'keywordBubble',
        label: 'Keyword Bubble Chart',
        description: 'Visualize keywords as interactive bubbles',
        icon: <BarChart className="text-green-600" size={20} />,
      },
      {
        id: 'map-visualization',
        type: 'mapVisualization',
        label: 'Location Map',
        description: 'Map locations mentioned in the text',
        icon: <Map className="text-green-600" size={20} />,
      }
    ],
    media: [
      {
        id: 'video-player',
        type: 'videoPlayer',
        label: 'Video Player',
        description: 'Embed and control video content',
        icon: <Video className="text-red-600" size={20} />,
      }
    ],
    other: [
      {
        id: 'metadata',
        type: 'metadata',
        label: 'Metadata',
        description: 'Display and manage metadata',
        icon: <Info className="text-gray-600" size={20} />,
      }
    ]
  };

  // Define tabs
  const tabs = [
    { id: 'all', label: 'All', icon: <FaLayerGroup /> },
    { id: 'input', label: 'Input', icon: <FaRegFileAlt /> },
    { id: 'processing', label: 'Processing', icon: <FaCogs /> },
    { id: 'output', label: 'Output', icon: <FaFileAlt /> },
    { id: 'visualization', label: 'Visualizations', icon: <FaChartBar /> },
    { id: 'media', label: 'Media', icon: <FaVideo /> },
    { id: 'other', label: 'Other', icon: <FaInfoCircle /> }
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

  // Get nodes to display based on active tab
  const getDisplayNodes = () => {
    if (activeTab === 'all') {
      return Object.values(nodeCategories).flat();
    }
    return nodeCategories[activeTab] || [];
  };

  // Get category label
  const getCategoryLabel = (categoryId) => {
    const tab = tabs.find(tab => tab.id === categoryId);
    return tab ? tab.label : 'Nodes';
  };

  return (
    <div className="nodes-toolbar bg-white rounded-xl shadow-md p-4 w-80">
      {/* Header */}
      <div className="flex items-center mb-4">
        <FaRegLightbulb className="text-blue-500 mr-2" />
        <h3 className="text-lg font-semibold">Node Toolkit</h3>
      </div>
      
      {/* Tabs */}
      <div className="flex flex-wrap mb-4 gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center px-3 py-2 text-sm rounded-t-lg transition-colors
              ${activeTab === tab.id 
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500 font-medium' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
            `}
          >
            <span className="mr-1.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      <div className="mb-2">
        <p className="text-sm text-gray-500">Drag and drop to add nodes to the canvas</p>
      </div>
      
      {/* Nodes grid */}
      <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
        {activeTab !== 'all' && (
          <h4 className="text-sm font-medium text-gray-700 mt-1 mb-2">
            {getCategoryLabel(activeTab)}
          </h4>
        )}
        
        {getDisplayNodes().map((node) => (
          <div
            key={node.id}
            className="border border-gray-200 rounded-lg p-3 cursor-grab hover:bg-blue-50 hover:border-blue-200 transition-colors"
            draggable
            onDragStart={(event) => handleDragStart(event, node)}
            title={`Drag to add ${node.label}`}
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
          ℹ️ Nodes can be connected by dragging from the handles
        </p>
      </div>
    </div>
  );
};

export default NodesToolbar; 