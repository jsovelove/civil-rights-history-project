import React from 'react';
import { Handle, Position } from 'reactflow';
import { FaUpload, FaPlay, FaYoutube } from 'react-icons/fa';

/**
 * TranscriptInputNode - Node for uploading and managing transcript files
 */
const TranscriptInputNode = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full">
      <Handle 
        type="source" 
        position={Position.Right} 
        id="transcript-output"
        style={{ right: -10, background: '#3b82f6' }}
      />
      
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <FaUpload className="mr-2 text-blue-600" />
        Transcript Input
      </h3>
      
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Name
          </label>
          <input
            type="text"
            value={data.documentName}
            onChange={(e) => data.onDocumentNameChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter document name..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            YouTube URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={data.youtubeUrl}
              onChange={(e) => data.onYoutubeUrlChange(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter YouTube URL..."
            />
            <button
              onClick={() => data.onYoutubeUrlSubmit(data.youtubeUrl)}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <FaYoutube />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Transcript
          </label>
          <input
            type="file"
            accept=".txt,.doc,.docx,.pdf"
            onChange={(e) => data.onTranscriptUpload(e.target.files[0])}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default TranscriptInputNode; 