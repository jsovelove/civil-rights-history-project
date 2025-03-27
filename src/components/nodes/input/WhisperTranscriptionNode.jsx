import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FaUpload, FaFileAudio, FaFileVideo, FaPlus, FaTrash, FaPlay, FaLanguage } from 'react-icons/fa';
import { transcribeAudioWithWhisper } from '../../../utils/transcriptUtils';

/**
 * WhisperTranscriptionNode component for transcribing audio and video files using OpenAI's Whisper API
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Node ID
 * @param {Object} props.data - Node data
 * @param {boolean} props.isConnectable - Whether the node can be connected
 * @returns {React.ReactElement} React component
 */
function WhisperTranscriptionNode({
  id,
  data,
  isConnectable,
}) {
  // Extract props from data
  const {
    queuedTranscripts = [],
    onQueueUpdate,
    onProcessMultiple,
    onSetTranscript
  } = data;

  // Input refs
  const fileInputRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const videoPreviewRef = useRef(null);

  // Local state
  const [currentDocumentName, setCurrentDocumentName] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [currentMediaType, setCurrentMediaType] = useState(null); // 'audio' or 'video'
  const [currentMediaUrl, setCurrentMediaUrl] = useState('');
  const [localQueue, setLocalQueue] = useState(queuedTranscripts || []);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [transcriptionResult, setTranscriptionResult] = useState('');

  // Language options for Whisper API
  const languageOptions = [
    { code: '', name: 'Auto-detect' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' }
  ];

  // Initialize state from props if needed
  useEffect(() => {
    if (queuedTranscripts && queuedTranscripts.length > 0) {
      setLocalQueue(queuedTranscripts);
    }
  }, [queuedTranscripts]);

  // Clean up object URLs when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (currentMediaUrl) {
        URL.revokeObjectURL(currentMediaUrl);
      }
    };
  }, [currentMediaUrl]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clean up previous URL if it exists
    if (currentMediaUrl) {
      URL.revokeObjectURL(currentMediaUrl);
    }

    setCurrentFile(file);
    
    // Create a URL for the file
    const fileUrl = URL.createObjectURL(file);
    setCurrentMediaUrl(fileUrl);
    
    // Determine if it's an audio or video file
    const fileType = file.type.split('/')[0];
    setCurrentMediaType(fileType === 'video' ? 'video' : 'audio');
    
    // Set default document name from file name
    if (!currentDocumentName) {
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      setCurrentDocumentName(fileName);
    }
    
    setErrorMessage('');
    setTranscriptionResult('');
  };

  // Handle adding a media file to the queue
  const handleAddToQueue = () => {
    // Validate inputs
    if (!currentDocumentName.trim()) {
      setErrorMessage('Document name is required');
      return;
    }

    if (!currentFile) {
      setErrorMessage('Audio or video file is required');
      return;
    }

    // Create new item
    const newMediaItem = {
      documentName: currentDocumentName.trim(),
      file: currentFile,
      mediaType: currentMediaType,
      mediaUrl: currentMediaUrl,
      language: selectedLanguage,
      id: `media-${Date.now()}`
    };

    // Add to queue
    const updatedQueue = [...localQueue, newMediaItem];
    setLocalQueue(updatedQueue);
    
    // Call the parent update function if provided
    if (onQueueUpdate) {
      onQueueUpdate(updatedQueue);
    }

    // Clear form
    setCurrentDocumentName('');
    setCurrentFile(null);
    setCurrentMediaType(null);
    setCurrentMediaUrl('');
    setErrorMessage('');
    setTranscriptionResult('');
    
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

  // Handle transcribing the current file
  const handleTranscribeFile = async () => {
    // Validate inputs
    if (!currentFile) {
      setErrorMessage('Please select an audio or video file to transcribe');
      return;
    }

    try {
      setIsTranscribing(true);
      setTranscriptionProgress(10);
      setErrorMessage('');

      // Call Whisper API for transcription
      const lang = selectedLanguage || null; // Use null for auto-detection if empty
      setTranscriptionProgress(30);
      
      const transcribedText = await transcribeAudioWithWhisper(currentFile, lang);
      setTranscriptionProgress(100);
      setTranscriptionResult(transcribedText);
      
      // Send the transcribed text to the main application if handler exists
      if (onSetTranscript) {
        onSetTranscript(transcribedText, currentDocumentName);
      }
      
    } catch (error) {
      console.error("Transcription error:", error);
      setErrorMessage(`Transcription failed: ${error.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle transcribing all files in the queue
  const handleProcessAllItems = async () => {
    if (localQueue.length === 0) {
      setErrorMessage('No files in queue to process');
      return;
    }

    try {
      setIsTranscribing(true);
      setErrorMessage('');
      
      // Process each item in the queue
      const processedResults = [];
      
      for (let i = 0; i < localQueue.length; i++) {
        const item = localQueue[i];
        setTranscriptionProgress(Math.floor((i / localQueue.length) * 100));
        
        try {
          // Transcribe the file
          const transcribedText = await transcribeAudioWithWhisper(
            item.file,
            item.language || null
          );
          
          // Add to results
          processedResults.push({
            documentName: item.documentName,
            transcript: transcribedText,
            file: item.file
          });
        } catch (error) {
          console.error(`Error processing "${item.documentName}":`, error);
        }
      }
      
      setTranscriptionProgress(100);
      
      // Call the parent processing function with the transcribed results
      if (onProcessMultiple && processedResults.length > 0) {
        onProcessMultiple(processedResults);
      }
      
      // Clear the queue
      setLocalQueue([]);
      if (onQueueUpdate) {
        onQueueUpdate([]);
      }
      
    } catch (error) {
      console.error("Error in batch processing:", error);
      setErrorMessage("Failed to process files batch");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 w-80">
      <div className="text-lg font-bold mb-2 text-indigo-600 border-b pb-2 flex items-center">
        <FaFileAudio className="mr-2" />
        Whisper Transcription
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 text-sm rounded">
          {errorMessage}
        </div>
      )}

      {/* Add New Media Form */}
      <div className="mb-4 p-3 bg-indigo-50 rounded border border-indigo-100">
        <h3 className="text-sm font-medium text-indigo-800 mb-2">Add Audio/Video</h3>
        
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
            Language (Optional)
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          >
            {languageOptions.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">
            Audio/Video File *
          </label>
          <div className="flex">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="audio/*,video/*"
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

        {/* Media Preview */}
        {currentMediaUrl && (
          <div className="mb-3 border rounded p-2 bg-white">
            <p className="text-xs text-gray-500 mb-1">Preview:</p>
            {currentMediaType === 'audio' ? (
              <audio 
                ref={audioPreviewRef}
                src={currentMediaUrl} 
                controls 
                className="w-full h-10"
              />
            ) : (
              <video 
                ref={videoPreviewRef}
                src={currentMediaUrl} 
                controls 
                className="w-full h-32 object-contain"
              />
            )}
          </div>
        )}
        
        <div className="flex space-x-2">
          <button
            onClick={handleAddToQueue}
            className="flex-1 p-2 bg-indigo-500 text-white rounded flex items-center justify-center text-sm hover:bg-indigo-600"
            disabled={!currentDocumentName || !currentFile || isTranscribing}
          >
            <FaPlus className="mr-1" /> Add to Queue
          </button>
          
          <button
            onClick={handleTranscribeFile}
            className="flex-1 p-2 bg-green-500 text-white rounded flex items-center justify-center text-sm hover:bg-green-600"
            disabled={!currentFile || isTranscribing}
          >
            <FaPlay className="mr-1" /> Transcribe Now
          </button>
        </div>
      </div>

      {/* Transcription Results */}
      {transcriptionResult && (
        <div className="mb-4 p-3 bg-green-50 rounded border border-green-100">
          <h3 className="text-sm font-medium text-green-800 mb-2">Transcription Result</h3>
          <div className="max-h-40 overflow-y-auto p-2 bg-white border rounded text-sm">
            {transcriptionResult}
          </div>
        </div>
      )}

      {/* Progress Bar (shown when transcribing) */}
      {isTranscribing && (
        <div className="mb-4 p-2 bg-blue-50 rounded border border-blue-100">
          <div className="text-xs text-blue-700 mb-1">Transcribing... {transcriptionProgress}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${transcriptionProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Queued Files */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Queued Files ({localQueue.length})
        </h3>
        
        {localQueue.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            No files in queue
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto">
            {localQueue.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2 mb-1 bg-gray-50 rounded border border-gray-200"
              >
                <div className="overflow-hidden">
                  <div className="text-sm font-medium truncate flex items-center">
                    {item.mediaType === 'audio' ? (
                      <FaFileAudio className="mr-1 text-indigo-500" size={12} />
                    ) : (
                      <FaFileVideo className="mr-1 text-indigo-500" size={12} />
                    )}
                    {item.documentName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{item.file.name}</div>
                </div>
                <button
                  onClick={() => handleRemoveFromQueue(item.id)}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Remove from queue"
                  disabled={isTranscribing}
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
        onClick={handleProcessAllItems}
        className="w-full p-2 bg-indigo-500 text-white rounded flex items-center justify-center mb-4 hover:bg-indigo-600"
        disabled={localQueue.length === 0 || isTranscribing}
      >
        <FaPlay className="mr-2" /> Process All Files
      </button>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="whisper-output"
        style={{ background: '#6366f1', width: 12, height: 12 }}
        isConnectable={isConnectable}
      />
    </div>
  );
}

export default WhisperTranscriptionNode; 