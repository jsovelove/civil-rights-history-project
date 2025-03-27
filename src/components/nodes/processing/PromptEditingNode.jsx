import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { FaEdit, FaRobot } from 'react-icons/fa';

/**
 * PromptEditingNode component for customizing system prompts for AI processing
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Node ID
 * @param {Object} props.data - Node data containing callbacks and state
 * @param {boolean} props.isConnectable - Whether the node can be connected
 * @returns {React.ReactElement} React component
 */
function PromptEditingNode({ id, data, isConnectable }) {
  // Extract props from data
  const {
    systemMessage = 'You are an expert historian specializing in civil rights. Your job is to analyze interview transcripts and extract key information. Provide a 1-paragraph summary, followed by 5-7 key points from the interview. Format your response as JSON with "summary" and "keyPoints" fields.',
    onSystemMessageChange,
    onModelChange,
    canProcess = false
  } = data;

  // Local states
  const [isEditing, setIsEditing] = useState(false);
  const [localSystemMessage, setLocalSystemMessage] = useState(systemMessage);
  
  // Fixed model - GPT-4o-mini
  const MODEL = 'gpt-4o-mini';

  // Handle saving edits
  const handleSaveEdits = () => {
    if (onSystemMessageChange) {
      onSystemMessageChange(localSystemMessage);
    }
    // Always use the fixed model
    if (onModelChange) {
      onModelChange(MODEL);
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 w-80">
      <div className="text-lg font-bold mb-2 text-emerald-600 border-b pb-2">
        AI Prompt Configuration
      </div>

      <div className="mb-3">
        {isEditing ? (
          <div className="space-y-3">
            <div className="bg-blue-50 p-2 rounded border border-blue-100 mb-2">
              <div className="text-sm font-medium text-blue-800 flex items-center">
                <FaRobot className="mr-2" /> Using GPT-4o-mini for processing
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Fastest and most cost-effective model for transcript analysis
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                System Message
              </label>
              <textarea
                value={localSystemMessage}
                onChange={(e) => setLocalSystemMessage(e.target.value)}
                className="w-full p-2 border rounded text-sm h-40 resize-none"
                placeholder="Enter instructions for the AI model..."
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleSaveEdits}
                className="flex-1 p-2 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setLocalSystemMessage(systemMessage);
                  setIsEditing(false);
                }}
                className="p-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium text-gray-600">System Prompt</div>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
                title="Edit system prompt"
              >
                <FaEdit size={16} />
              </button>
            </div>
            
            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700 mb-3 max-h-32 overflow-y-auto">
              {systemMessage}
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-600">AI Model</div>
              <div className="text-sm bg-blue-50 text-blue-700 py-1 px-2 rounded flex items-center">
                <FaRobot className="mr-1" size={12} /> GPT-4o-mini
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mb-3">
              <p>This system prompt will be used for all transcript processing. The prompt tells the AI how to analyze each transcript and what format to return the results in.</p>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 mb-4">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>
          <span>Input comes from transcript nodes</span>
        </div>
        <div className="flex items-center mt-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></div>
          <span>Output goes to results display nodes</span>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        style={{ background: '#3b82f6', width: 12, height: 12 }}
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="prompt-output"
        style={{ background: '#10b981', width: 12, height: 12 }}
        isConnectable={isConnectable}
      />
    </div>
  );
}

export default PromptEditingNode; 