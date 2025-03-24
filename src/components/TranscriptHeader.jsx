import React from 'react';

/**
 * TranscriptHeader - Header component for the TranscriptSummary page
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isDevMode - Whether the application is in development mode
 * @param {boolean} props.DEV_MODE - Whether development mode is available
 * @param {Function} props.toggleDevMode - Function to toggle development mode
 * @param {Function} props.saveLayout - Function to save the current layout
 * @param {Function} props.resetLayout - Function to reset the layout
 * @param {Object|null} props.summaries - Summaries data
 * @param {Function} props.handleResetData - Function to reset all data
 * @param {boolean} props.testingMode - Whether testing mode is enabled
 * @returns {React.ReactElement} Header component
 */
const TranscriptHeader = ({
  isDevMode,
  DEV_MODE,
  toggleDevMode,
  saveLayout,
  resetLayout,
  summaries,
  handleResetData,
  testingMode
}) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
        Transcript Flow
      </h1>
      <div className="flex items-center justify-between">
        <p className="text-base leading-relaxed text-gray-600">
          Create a workflow to process and analyze interview transcripts
        </p>
        
        <div className="flex items-center gap-2">
          {DEV_MODE && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDevMode}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center ${
                  isDevMode 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {isDevMode ? 'Dev Mode On' : 'Dev Mode Off'}
              </button>
              
              {isDevMode && (
                <>
                  <button
                    onClick={saveLayout}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Layout
                  </button>
                  <button
                    onClick={resetLayout}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Layout
                  </button>
                </>
              )}
            </div>
          )}
          
          {summaries && (
            <button
              onClick={handleResetData}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Data
            </button>
          )}
          
          {testingMode && (
            <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Testing Mode: Database operations disabled
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptHeader; 