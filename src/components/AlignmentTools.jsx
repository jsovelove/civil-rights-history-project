import React from 'react';
import { Panel } from 'reactflow';

/**
 * AlignmentTools - Component for node alignment controls
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isDevMode - Whether development mode is enabled
 * @param {Array} props.selectedNodes - Array of currently selected nodes
 * @param {Function} props.alignHorizontally - Function to align nodes horizontally
 * @param {Function} props.alignVertically - Function to align nodes vertically
 * @param {Function} props.distributeHorizontally - Function to distribute nodes horizontally
 * @param {Function} props.distributeVertically - Function to distribute nodes vertically
 * @param {Function} props.straightenConnections - Function to straighten connections
 * @param {Function} props.makeEdgesOrthogonal - Function to make edges orthogonal
 * @param {boolean} props.snapToGrid - Whether grid snapping is enabled
 * @param {Function} props.toggleGrid - Function to toggle grid snapping
 * @returns {React.ReactElement|null} Alignment tools component or null if not in dev mode
 */
const AlignmentTools = ({
  isDevMode,
  selectedNodes,
  alignHorizontally,
  alignVertically,
  distributeHorizontally,
  distributeVertically,
  straightenConnections,
  makeEdgesOrthogonal,
  snapToGrid,
  toggleGrid
}) => {
  if (!isDevMode) return null;
  
  return (
    <Panel position="top-left" className="bg-white p-2 rounded-lg shadow-md">
      <div className="flex flex-col space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 mb-1">Node Alignment</h4>
        <div className="flex space-x-2">
          <button
            onClick={alignHorizontally}
            disabled={selectedNodes.length < 2}
            className={`p-2 rounded-lg ${
              selectedNodes.length < 2
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title="Align Horizontally"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16M4 12h16" />
            </svg>
          </button>
          
          <button
            onClick={alignVertically}
            disabled={selectedNodes.length < 2}
            className={`p-2 rounded-lg ${
              selectedNodes.length < 2
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title="Align Vertically"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M12 4v16" />
            </svg>
          </button>
          
          <button
            onClick={distributeHorizontally}
            disabled={selectedNodes.length < 3}
            className={`p-2 rounded-lg ${
              selectedNodes.length < 3
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title="Distribute Horizontally"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4M17 8v12M3 12h18" />
            </svg>
          </button>
          
          <button
            onClick={distributeVertically}
            disabled={selectedNodes.length < 3}
            className={`p-2 rounded-lg ${
              selectedNodes.length < 3
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title="Distribute Vertically"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H4m12 10V4M4 17h16" />
            </svg>
          </button>
        </div>
            
        <div className="flex space-x-2">
          <button
            onClick={straightenConnections}
            className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 w-full flex items-center justify-center"
            title="Straighten Connections"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 12h16M4 19h16" />
            </svg>
            <span className="text-xs font-medium">Straighten Edges</span>
          </button>
        </div>
            
        <div className="flex space-x-2">
          <button
            onClick={makeEdgesOrthogonal}
            className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 w-full flex items-center justify-center"
            title="Make Edges Orthogonal"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5v14M20 5v14M4 12h16" />
            </svg>
            <span className="text-xs font-medium">Orthogonal Edges</span>
          </button>
        </div>
    
        <div className="flex space-x-2">
          <button
            onClick={toggleGrid}
            className={`p-2 rounded-lg w-full flex items-center justify-center ${
              snapToGrid
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Toggle Grid Snapping"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16V4H4zm4 4h4m0 4h4m-8 4h4" />
            </svg>
            <span className="text-xs font-medium">
              {snapToGrid ? 'Grid: On' : 'Grid: Off'}
            </span>
          </button>
        </div>
      </div>
    </Panel>
  );
};

export default AlignmentTools; 