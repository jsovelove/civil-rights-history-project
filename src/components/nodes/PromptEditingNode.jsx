import React from 'react';
import { Handle, Position } from 'reactflow';
import { Edit } from 'lucide-react';

/**
 * PromptEditingNode - Node for editing system prompts
 */
const PromptEditingNode = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full">
      <Handle 
        type="target" 
        position={Position.Left} 
        id="prompt-left-input"
        style={{ left: -10, background: '#3b82f6' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="prompt-output"
        style={{ right: -10, background: '#3b82f6' }}
      />
      
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <Edit className="mr-2 text-blue-600" size={18} />
        System Prompt Editor
      </h3>
      
      <div className="flex flex-col gap-4">
        <textarea
          className="w-full h-48 p-3 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          value={data.systemMessage}
          onChange={(e) => data.onSystemMessageChange(e.target.value)}
          placeholder="Edit system message here..."
        />
        
        <button
          onClick={data.onProcess}
          disabled={!data.canProcess}
          className={`w-full py-2 px-4 rounded-lg font-medium ${
            data.canProcess
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Process Transcript
        </button>
      </div>
    </div>
  );
};

export default PromptEditingNode; 