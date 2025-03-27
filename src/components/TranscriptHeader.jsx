import React from 'react';
import { FaDatabase, FaFileAlt, FaEllipsisH, FaTrash } from 'react-icons/fa';

/**
 * TranscriptHeader - Combined header component with application views toggle
 * 
 * @param {Object} props - Component props
 * @param {Object} props.summaries - Transcript summaries data
 * @param {Function} props.handleResetData - Function to reset all data
 * @param {boolean} props.testingMode - Flag indicating if app is in testing mode
 * @param {string} props.flowView - Current view mode ('none' or 'basic')
 * @param {Function} props.setFlowView - Function to set the current view mode
 * @returns {React.ReactElement} Header component with title and controls
 */
function TranscriptHeader({ 
  summaries,
  handleResetData,
  testingMode,
  flowView,
  setFlowView
}) {
  return (
    <div className="mb-4 rounded-xl shadow-sm overflow-hidden">
      <header className="flex justify-between items-center p-4 bg-white">
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
      
      {/* Application Views Toggle Panel */}
      <div className="p-3 bg-blue-50 border-t border-blue-100">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-blue-600">Application Views</h3>
          <div className="text-sm text-gray-600">
            {flowView !== 'none' && (
              <>Currently viewing the complete workflow demonstration</>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => setFlowView('none')} 
            className={`px-3 py-1 rounded font-medium text-sm ${
              flowView === 'none' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Build Your Own Analysis
          </button>
          
          <button 
            onClick={() => setFlowView('basic')} 
            className={`px-3 py-1 rounded font-medium text-sm ${
              flowView === 'basic' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            See Complete Workflow Demo
          </button>
        </div>
      </div>
    </div>
  );
}

export default TranscriptHeader; 