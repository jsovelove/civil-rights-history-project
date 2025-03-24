import React from 'react';
import { Handle, Position } from 'reactflow';
import { FaSave, FaPlusCircle, FaMinusCircle, FaEdit, FaChartLine } from 'react-icons/fa';

/**
 * ResultsDisplayNode - Node for displaying and editing AI-generated summaries
 */
const ResultsDisplayNode = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full min-w-[520px] max-h-[700px] overflow-y-auto resize-both overflow-auto border-2 border-transparent hover:border-blue-100">
      <Handle 
        type="target" 
        position={Position.Top} 
        id="results-input"
        style={{ top: -10, background: '#3b82f6' }}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="results-left-input"
        style={{ left: -10, background: '#3b82f6' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="results-output"
        style={{ right: -10, background: '#3b82f6' }}
      />
      
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <FaSave className="mr-2 text-blue-600" />
        Results Display
        {data.summaries && (
          <div className="ml-auto text-xs text-gray-500 flex items-center">
            <FaChartLine className="mr-1 text-blue-500" />
            <span>Drag visualizations from toolbar</span>
          </div>
        )}
      </h3>
      
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Overall Summary
          </label>
          <textarea
            className="w-full h-64 p-3 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            value={data.summaries?.overallSummary || ''}
            onChange={(e) => data.onSummaryChange(e.target.value)}
            placeholder="Overall summary will appear here..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Key Points
            </label>
            <button
              onClick={data.onAddKeyPoint}
              className="p-1 text-blue-600 hover:text-blue-700"
            >
              <FaPlusCircle />
            </button>
          </div>
          
          <div className="space-y-4">
            {data.summaries?.keyPoints?.map((point, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <input
                    type="text"
                    value={point.topic}
                    onChange={(e) => data.onKeyPointChange(index, 'topic', e.target.value)}
                    className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                    placeholder="Key point title..."
                  />
                  <button
                    onClick={() => data.onRemoveKeyPoint(index)}
                    className="p-1 text-red-500 hover:text-red-600"
                  >
                    <FaMinusCircle />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={point.timestamp}
                    onChange={(e) => data.onKeyPointChange(index, 'timestamp', e.target.value)}
                    className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                    placeholder="Timestamp..."
                  />
                  <input
                    type="text"
                    value={point.keywords}
                    onChange={(e) => data.onKeyPointChange(index, 'keywords', e.target.value)}
                    className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                    placeholder="Keywords..."
                  />
                </div>
                
                <textarea
                  value={point.summary}
                  onChange={(e) => data.onKeyPointChange(index, 'summary', e.target.value)}
                  className="w-full h-24 p-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Summary..."
                />
                
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => data.onEditSummary(point)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    <FaEdit className="mr-1" />
                    Edit Summary
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={data.onSaveToDatabase}
            disabled={data.savingToDatabase || data.savedToDatabase}
            className={`px-4 py-2 rounded-lg font-medium flex items-center ${
              data.savingToDatabase
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : data.savedToDatabase
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {data.savingToDatabase ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : data.savedToDatabase ? (
              <>
                <FaSave className="mr-2" />
                Saved
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Save to Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplayNode; 