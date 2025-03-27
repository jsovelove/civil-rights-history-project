import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FaUpload, FaYoutube, FaPlus, FaTrash, FaCheck, FaPlay } from 'react-icons/fa';

/**
 * TranscriptInputNode component for uploading and processing transcript files
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onTranscriptUpload - Callback for handling transcript uploads
 * @param {Function} props.onAudioUpload - Callback for handling audio uploads
 * @param {string} props.documentName - Name of the document
 * @param {Function} props.onDocumentNameChange - Callback for document name changes
 * @param {string} props.youtubeUrl - YouTube URL input
 * @param {Function} props.onYoutubeUrlChange - Callback for YouTube URL changes
 * @param {Function} props.onYoutubeUrlSubmit - Callback for submitting YouTube URL
 * @param {Array} props.queuedTranscripts - List of transcripts waiting to be processed
 * @param {Function} props.onQueueUpdate - Callback to update the transcript queue
 * @param {Function} props.onProcessMultiple - Callback to process multiple transcripts
 * @returns {React.ReactElement} React component
 */
function TranscriptInputNode({
  id,
  data,
  isConnectable,
}) {
  // Extract props from data
  const {
    queuedTranscripts = [],
    onQueueUpdate,
    onProcessMultiple
  } = data;

  // Input refs
  const fileInputRef = useRef(null);

  // Local state
  const [currentDocumentName, setCurrentDocumentName] = useState('');
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [localQueue, setLocalQueue] = useState(queuedTranscripts || []);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize state from props if needed
  useEffect(() => {
    if (queuedTranscripts && queuedTranscripts.length > 0) {
      setLocalQueue(queuedTranscripts);
    }
  }, [queuedTranscripts]);

  // Handle file selection for transcript
  const handleTranscriptFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCurrentFile(file);
    }
  };

  // Handle adding a transcript to the queue
  const handleAddToQueue = () => {
    // Validate inputs
    if (!currentDocumentName.trim()) {
      setErrorMessage('Document name is required');
      return;
    }

    if (!currentFile) {
      setErrorMessage('Transcript file is required');
      return;
    }

    // Create new transcript item
    const newTranscript = {
      documentName: currentDocumentName.trim(),
      youtubeUrl: currentYoutubeUrl.trim(),
      file: currentFile,
      id: `transcript-${Date.now()}`
    };

    // Add to queue
    const updatedQueue = [...localQueue, newTranscript];
    setLocalQueue(updatedQueue);
    
    // Call the parent update function if provided
    if (onQueueUpdate) {
      onQueueUpdate(updatedQueue);
    }

    // Clear form
    setCurrentDocumentName('');
    setCurrentYoutubeUrl('');
    setCurrentFile(null);
    setErrorMessage('');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle removing an item from the queue
  const handleRemoveFromQueue = (id) => {
    const updatedQueue = localQueue.filter(item => item.id !== id);
    setLocalQueue(updatedQueue);
    
    // Call the parent update function if provided
    if (onQueueUpdate) {
      onQueueUpdate(updatedQueue);
    }
  };

  // Handle processing all transcripts in the queue
  const handleProcessAllTranscripts = () => {
    if (localQueue.length === 0) {
      setErrorMessage('No transcripts in queue to process');
      return;
    }

    // Call the parent processing function
    if (onProcessMultiple) {
      onProcessMultiple(localQueue);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 w-80">
      <div className="text-lg font-bold mb-2 text-blue-600 border-b pb-2">
        Transcript Input
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 text-sm rounded">
          {errorMessage}
        </div>
      )}

      {/* Add New Transcript Form */}
      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Add New Transcript</h3>
        
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">
            Document Name *
          </label>
          <input
            type="text"
            value={currentDocumentName}
            onChange={(e) => setCurrentDocumentName(e.target.value)}
            className="w-full p-2 border rounded text-sm"
            placeholder="Enter document name"
          />
        </div>

        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">
            YouTube URL (optional)
          </label>
          <input
            type="text"
            value={currentYoutubeUrl}
            onChange={(e) => setCurrentYoutubeUrl(e.target.value)}
            className="w-full p-2 border rounded text-sm"
            placeholder="Enter YouTube URL"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">
            Transcript File *
          </label>
          <div className="flex">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleTranscriptFileChange}
              accept=".txt,.json,.docx,.md"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center p-2 bg-gray-100 border border-gray-300 rounded text-sm hover:bg-gray-200"
            >
              <FaUpload className="mr-2" /> 
              {currentFile ? currentFile.name : 'Choose File'}
            </button>
          </div>
        </div>

        <button
          onClick={handleAddToQueue}
          className="w-full p-2 bg-blue-500 text-white rounded flex items-center justify-center text-sm hover:bg-blue-600"
          disabled={!currentDocumentName || !currentFile}
        >
          <FaPlus className="mr-2" /> Add to Queue
        </button>
      </div>

      {/* Queued Transcripts */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Queued Transcripts ({localQueue.length})
        </h3>
        
        {localQueue.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            No transcripts in queue
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto">
            {localQueue.map((item) => (
              <div 
                key={item.id || `transcript-queue-${Date.now()}-${Math.random()}`} 
                className="flex items-center justify-between p-2 mb-1 bg-gray-50 rounded border border-gray-200"
              >
                <div className="overflow-hidden">
                  <div className="text-sm font-medium truncate">{item.documentName}</div>
                  <div className="text-xs text-gray-500 truncate">{item.file.name}</div>
                </div>
                <button
                  onClick={() => handleRemoveFromQueue(item.id)}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Remove from queue"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Process All Button */}
      <button
        onClick={handleProcessAllTranscripts}
        className="w-full p-2 bg-green-500 text-white rounded flex items-center justify-center mb-4 hover:bg-green-600"
        disabled={localQueue.length === 0}
      >
        <FaPlay className="mr-2" /> Process All Transcripts
      </button>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="transcript-output"
        style={{ background: '#3b82f6', width: 12, height: 12 }}
        isConnectable={isConnectable}
      />
    </div>
  );
}

export default TranscriptInputNode; 