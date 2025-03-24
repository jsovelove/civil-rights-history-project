import React from 'react';

/**
 * ErrorDisplay - Component for displaying error messages
 * 
 * @param {Object} props - Component props
 * @param {string|null} props.error - Error message to display
 * @returns {React.ReactElement|null} Error display component or null if no error
 */
const ErrorDisplay = ({ error }) => {
  if (!error) return null;
  
  return (
    <div className="mb-6 bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-lg">
      <div className="flex">
        <svg className="w-6 h-6 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
        </svg>
        <div>
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay; 