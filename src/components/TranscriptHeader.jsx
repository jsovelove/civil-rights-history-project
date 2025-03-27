import React from 'react';
import { FaDatabase, FaFileAlt, FaEllipsisH, FaTrash } from 'react-icons/fa';

/**
 * TranscriptHeader - Header component for the transcript processing interface
 * 
 * @param {Object} props - Component props
 * @param {Object} props.summaries - Transcript summaries data
 * @param {Function} props.handleResetData - Function to reset all data
 * @param {boolean} props.testingMode - Flag indicating if app is in testing mode
 * @returns {React.ReactElement} Header component with title and controls
 */
function TranscriptHeader({ 
  summaries,
  handleResetData,
  testingMode
}) {
  return (
    <header className="flex justify-between items-center mb-4 p-4 bg-white rounded-xl shadow-sm">
      <div className="flex items-center gap-2">
        {/* Logo/Title */}
        <div className="font-bold text-xl text-blue-700 flex items-center">
          <FaFileAlt className="mr-2" />
          <span>Transcript Summary</span>
        </div>
        
        {testingMode && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            Test Mode
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Reset Button */}
        {summaries && (
          <button
            onClick={handleResetData}
            className="text-red-500 hover:text-red-700 flex items-center text-sm"
          >
            <FaTrash className="mr-1" size={14} />
            Reset
          </button>
        )}
        
        {/* App Version */}
        <div className="text-xs text-gray-400">
          v0.9.2
        </div>
      </div>
    </header>
  );
}

export default TranscriptHeader; 