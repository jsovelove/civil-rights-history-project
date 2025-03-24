import React from 'react';
import { Panel } from 'reactflow';

/**
 * LoadingIndicator - Component for displaying a loading spinner
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.loading - Whether the component is loading
 * @param {string} props.message - Message to display while loading
 * @returns {React.ReactElement|null} Loading indicator component or null if not loading
 */
const LoadingIndicator = ({ loading, message = 'Processing transcript...' }) => {
  if (!loading) return null;
  
  return (
    <Panel position="top-center">
      <div className="flex items-center bg-white p-3 rounded-lg shadow-md">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mr-3"></div>
        <span className="text-gray-500">{message}</span>
      </div>
    </Panel>
  );
};

export default LoadingIndicator; 