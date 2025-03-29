import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { FaUpload, FaFileAudio, FaFileVideo, FaPlus, FaTrash, FaPlay, FaLanguage, FaStop, FaPause, FaWaveSquare } from 'react-icons/fa';
import { MdKeyboardVoice } from 'react-icons/md';
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
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);

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
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscriptArea, setShowTranscriptArea] = useState(false);
  const [audioVisualizerActive, setAudioVisualizerActive] = useState(false);

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

  // Clean up object URLs and audio context when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (currentMediaUrl) {
        URL.revokeObjectURL(currentMediaUrl);
      }
      
      // Clean up audio context and analyzer
      if (audioContextRef.current) {
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
        }
        audioContextRef.current.close();
      }
      
      // Cancel animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentMediaUrl]);

  // Setup audio visualizer
  const setupAudioVisualizer = () => {
    if (!audioRef.current || !canvasRef.current || currentMediaType !== 'audio') return;
    
    // Clean up previous audio context if it exists
    if (audioContextRef.current) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      audioContextRef.current.close();
    }

    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      // Create analyzer
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      // Connect the audio element to the analyser
      const source = audioContext.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      setAudioVisualizerActive(true);

      // Start visualization
      visualize();
    } catch (error) {
      console.error("Error setting up audio visualizer:", error);
      setAudioVisualizerActive(false);
    }
  };

  // Draw visualizer
  const visualize = () => {
    if (!canvasRef.current || !analyserRef.current || !audioVisualizerActive) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Clear the canvas
    canvasCtx.clearRect(0, 0, width, height);
    
    const draw = () => {
      // Set up the next animation frame
      animationRef.current = requestAnimationFrame(draw);
      
      // Get the frequency data
      analyser.getByteFrequencyData(dataArray);
      
      // Clear the canvas
      canvasCtx.fillStyle = 'rgb(30, 30, 30)';
      canvasCtx.fillRect(0, 0, width, height);
      
      // Calculate bar width
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      // Draw each bar
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // Use gradient colors based on frequency
        const hue = i / bufferLength * 360;
        canvasCtx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        
        // Draw the bar
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  };

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current && !videoRef.current) return;
    
    const mediaElement = currentMediaType === 'audio' ? audioRef.current : videoRef.current;
    
    if (isPlaying) {
      mediaElement.pause();
    } else {
      // Initialize audio context for audio files if not already done
      if (currentMediaType === 'audio' && !audioVisualizerActive) {
        setupAudioVisualizer();
      }
      mediaElement.play();
    }
    
    setIsPlaying(!isPlaying);
  };

  // Handle media playback events
  useEffect(() => {
    const handlePlayEvent = () => setIsPlaying(true);
    const handlePauseEvent = () => setIsPlaying(false);
    const handleEndedEvent = () => setIsPlaying(false);
    
    const audioElement = audioRef.current;
    const videoElement = videoRef.current;
    
    if (audioElement) {
      audioElement.addEventListener('play', handlePlayEvent);
      audioElement.addEventListener('pause', handlePauseEvent);
      audioElement.addEventListener('ended', handleEndedEvent);
    }
    
    if (videoElement) {
      videoElement.addEventListener('play', handlePlayEvent);
      videoElement.addEventListener('pause', handlePauseEvent);
      videoElement.addEventListener('ended', handleEndedEvent);
    }
    
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('play', handlePlayEvent);
        audioElement.removeEventListener('pause', handlePauseEvent);
        audioElement.removeEventListener('ended', handleEndedEvent);
      }
      
      if (videoElement) {
        videoElement.removeEventListener('play', handlePlayEvent);
        videoElement.removeEventListener('pause', handlePauseEvent);
        videoElement.removeEventListener('ended', handleEndedEvent);
      }
    };
  }, [audioRef.current, videoRef.current]);

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
    
    // Reset states
    setErrorMessage('');
    setTranscriptionResult('');
    setLiveTranscript('');
    setIsPlaying(false);
    setAudioVisualizerActive(false);
    setShowTranscriptArea(false);
    
    // Cancel animation frame if it exists
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
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
    setLiveTranscript('');
    setIsPlaying(false);
    setAudioVisualizerActive(false);
    setShowTranscriptArea(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Cancel animation frame if it exists
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
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

  // Add reference for transcript container to implement auto-scrolling
  const transcriptContainerRef = useRef(null);

  // Enhance the typing effect with auto-scrolling
  useEffect(() => {
    if (transcriptContainerRef.current && liveTranscript) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [liveTranscript]);

  // Enhanced streaming transcript simulation with test text
  const simulateTranscriptStreaming = async (file, lang) => {
    // Show transcript area immediately
    setShowTranscriptArea(true);
    setLiveTranscript("Starting simulated transcription...");
    
    try {
      // Simulate initial processing time
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setLiveTranscript("Preparing demo text...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Demo text based on file type
      let demoText = "";
      if (currentMediaType === 'audio') {
        demoText = "This is a simulated audio transcription. We're using demonstration text instead of the actual Whisper API to avoid costs during development. The Civil Rights Movement was a struggle for social justice that took place mainly during the 1950s and 1960s for Black Americans to gain equal rights under the law in the United States. The Civil War had officially abolished slavery, but it didn't end discrimination against Black people—they continued to endure the devastating effects of racism, especially in the South. By the mid-20th century, Black Americans had had more than enough of prejudice and violence against them. They, along with many White Americans, mobilized and began an unprecedented fight for equality that spanned two decades.";
      } else {
        demoText = "This is a simulated video transcription. We're using demonstration text instead of the actual Whisper API to avoid costs during development. The Civil Rights Act of 1964, which ended segregation in public places and banned employment discrimination on the basis of race, color, religion, sex or national origin, is considered one of the crowning legislative achievements of the civil rights movement. First proposed by President John F. Kennedy, it survived strong opposition from southern members of Congress and was then signed into law by Kennedy's successor, Lyndon B. Johnson. In subsequent years, Congress expanded the act and passed additional civil rights legislation such as the Voting Rights Act of 1965.";
      }
      
      // Add some language specific flair if a language was selected
      if (lang) {
        const langPrefix = {
          'es': "Traducción simulada en español: ",
          'fr': "Traduction simulée en français: ",
          'de': "Simulierte Übersetzung auf Deutsch: ",
          'it': "Traduzione simulata in italiano: ",
          'ja': "日本語でのシミュレーション翻訳: ",
          'zh': "模拟中文翻译: ",
          'ru': "Симуляция перевода на русский: "
        }[lang] || "";
        
        if (langPrefix) {
          demoText = langPrefix + demoText.substring(0, 100);
        }
      }
      
      // Inform user this is a simulation
      setLiveTranscript("DEMO MODE: ");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Split into sentences for more natural-looking transcription
      const sentences = demoText.match(/[^.!?]+[.!?]+/g) || [demoText];
      
      let currentText = 'DEMO MODE: ';
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const words = sentence.trim().split(/\s+/);
        
        // Add words with variable typing speed
        for (let j = 0; j < words.length; j++) {
          // Simulate thinking pause at sentence beginnings
          if (j === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
          }
          
          currentText += (j > 0 ? ' ' : '') + words[j];
          setLiveTranscript(currentText);
          
          // Calculate progress based on total text length
          const progress = Math.floor((currentText.length / (demoText.length + 11)) * 100);
          setTranscriptionProgress(progress);
          
          // Variable typing speed - faster to see more immediate results
          await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 100));
        }
        
        // Add pause between sentences
        if (i < sentences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150));
        }
      }
      
      return demoText;
    } catch (error) {
      console.error("Simulation error:", error);
      setLiveTranscript(`Error during simulation: ${error.message || "Unknown error"}`);
      throw error;
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
      setTranscriptionProgress(0);
      setErrorMessage('');
      setLiveTranscript('');
      setTranscriptionResult('');
      setShowTranscriptArea(true); // Show transcript area immediately

      // Start playing the media
      const mediaElement = currentMediaType === 'audio' ? audioRef.current : videoRef.current;
      if (mediaElement) {
        // Initialize audio visualizer for audio files
        if (currentMediaType === 'audio' && !audioVisualizerActive) {
          setupAudioVisualizer();
        }
        mediaElement.currentTime = 0;
        mediaElement.play();
        setIsPlaying(true);
      }

      // Use the simulated transcript instead of the API
      const lang = selectedLanguage || null;
      const transcribedText = await simulateTranscriptStreaming(currentFile, lang);
      
      setTranscriptionProgress(100);
      setTranscriptionResult(transcribedText);
      
      // Send the transcribed text to the main application if handler exists
      if (onSetTranscript) {
        onSetTranscript(transcribedText, currentDocumentName);
      }
      
    } catch (error) {
      console.error("Transcription error:", error);
      setErrorMessage(`Transcription failed: ${error.message}`);
      setLiveTranscript('');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Stop transcription and media playback
  const handleStopTranscription = () => {
    const mediaElement = currentMediaType === 'audio' ? audioRef.current : videoRef.current;
    if (mediaElement) {
      mediaElement.pause();
      setIsPlaying(false);
    }
    
    setIsTranscribing(false);
    setLiveTranscript('');
    setShowTranscriptArea(false);
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
      setLiveTranscript('');
      setShowTranscriptArea(true);
      
      // Process each item in the queue
      const processedResults = [];
      
      for (let i = 0; i < localQueue.length; i++) {
        const item = localQueue[i];
        
        try {
          setLiveTranscript(`Processing (${i+1}/${localQueue.length}): ${item.documentName}`);
          
          // Pause for visual feedback
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Transcribe using enhanced streaming
          const transcribedText = await simulateTranscriptStreaming(
            item.file,
            item.language || null
          );
          
          // Add to results
          processedResults.push({
            documentName: item.documentName,
            transcript: transcribedText,
            file: item.file
          });
          
          // Pause before next item
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error processing "${item.documentName}":`, error);
          setLiveTranscript(prev => prev + `\nError processing ${item.documentName}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      setTranscriptionProgress(100);
      setLiveTranscript('Processing complete!');
      
      // Call the parent processing function with the transcribed results
      if (onProcessMultiple && processedResults.length > 0) {
        onProcessMultiple(processedResults);
      }
      
      // Clear the queue
      setLocalQueue([]);
      if (onQueueUpdate) {
        onQueueUpdate([]);
      }
      
      // Show completion message
      setTimeout(() => {
        setLiveTranscript('');
        setShowTranscriptArea(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error in batch processing:", error);
      setErrorMessage("Failed to process files batch");
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-4 rounded-lg shadow-lg border border-indigo-500 flex w-[700px]">
      {/* Main content area */}
      <div className="flex-1 min-w-[350px]">
        <div className="text-lg font-bold mb-3 text-white border-b border-indigo-400 pb-2 flex items-center">
          <MdKeyboardVoice className="mr-2 text-indigo-300" size={24} />
          <span>Whisper Transcription</span>
          <span className="ml-2 text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full">Demo Mode</span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-3 p-2 bg-red-400 bg-opacity-25 text-red-100 text-sm rounded border border-red-500 flex items-center">
            <span className="text-red-300 mr-2">⚠</span> {errorMessage}
          </div>
        )}

        {/* Media Preview */}
        {currentMediaUrl && (
          <div className="mb-4 bg-black bg-opacity-40 rounded-lg border border-indigo-500 overflow-hidden">
            {/* Media Player */}
            <div className="relative">
              {currentMediaType === 'audio' ? (
                <div>
                  {/* Hidden audio element */}
                  <audio 
                    ref={audioRef}
                    src={currentMediaUrl} 
                    className="hidden"
                  />
                  
                  {/* Audio visualizer */}
                  <canvas 
                    ref={canvasRef} 
                    className="w-full h-32 bg-gray-900"
                    width="400" 
                    height="120"
                  />
                  
                  {/* Audio info bar */}
                  <div className="bg-indigo-900 bg-opacity-80 p-2 flex items-center justify-between">
                    <div className="text-xs text-indigo-200 truncate flex items-center">
                      <FaWaveSquare className="mr-1" /> 
                      {currentFile?.name || "Audio File"}
                    </div>
                    
                    <button
                      onClick={togglePlayPause}
                      className="p-1 rounded-full bg-indigo-700 hover:bg-indigo-600 text-white"
                      disabled={isTranscribing}
                    >
                      {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <video 
                    ref={videoRef}
                    src={currentMediaUrl} 
                    className="w-full object-contain bg-black"
                    style={{ maxHeight: "180px" }}
                  />
                  
                  {/* Video controls bar */}
                  <div className="bg-indigo-900 bg-opacity-80 p-2 flex items-center justify-between">
                    <div className="text-xs text-indigo-200 truncate flex items-center">
                      <FaFileVideo className="mr-1" /> 
                      {currentFile?.name || "Video File"}
                    </div>
                    
                    <button
                      onClick={togglePlayPause}
                      className="p-1 rounded-full bg-indigo-700 hover:bg-indigo-600 text-white"
                      disabled={isTranscribing}
                    >
                      {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Transcription Progress Bar (moved outside the transcript area) */}
            {isTranscribing && (
              <div className="mt-2 p-2 flex items-center bg-indigo-800 bg-opacity-50 border-t border-indigo-600">
                <div className="flex-1 h-1 bg-indigo-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-400"
                    style={{ width: `${transcriptionProgress}%`, transition: 'width 0.3s ease' }}
                  ></div>
                </div>
                
                <button
                  onClick={handleStopTranscription}
                  className="ml-2 p-1 rounded bg-red-500 hover:bg-red-600 text-white"
                  title="Stop transcription"
                >
                  <FaStop size={10} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add New Media Form */}
        <div className="mb-4 p-3 bg-indigo-800 bg-opacity-40 rounded-lg border border-indigo-600">
          {/* File Upload Area */}
          <div className="mb-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="audio/*,video/*"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed 
                ${currentFile ? 'border-indigo-400 bg-indigo-800 bg-opacity-30' : 'border-indigo-600 hover:border-indigo-400 bg-indigo-800 bg-opacity-10 hover:bg-opacity-20'} 
                transition-all duration-200`}
              disabled={isTranscribing}
            >
              <FaUpload className="text-indigo-300 mb-2" size={20} />
              <span className="text-sm text-indigo-200">
                {currentFile ? currentFile.name : 'Select Audio or Video File'}
              </span>
              {currentFile && (
                <span className="text-xs text-indigo-300 mt-1">
                  {currentMediaType === 'audio' ? 'Audio' : 'Video'} file • {Math.round(currentFile.size / 1024)} KB
                </span>
              )}
            </button>
          </div>
          
          {/* Document Name */}
          <div className="mb-2">
            <input
              type="text"
              value={currentDocumentName}
              onChange={(e) => setCurrentDocumentName(e.target.value)}
              className="w-full p-2 bg-indigo-700 bg-opacity-50 border border-indigo-500 rounded text-sm text-white placeholder-indigo-300"
              placeholder="Document Name (required)"
              disabled={isTranscribing}
            />
          </div>

          {/* Language Selector */}
          <div className="mb-3">
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 pr-8 bg-indigo-700 bg-opacity-50 border border-indigo-500 rounded text-sm text-white appearance-none"
                disabled={isTranscribing}
              >
                {languageOptions.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <FaLanguage className="absolute right-2 top-1/2 transform -translate-y-1/2 text-indigo-300" size={16} />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddToQueue}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!currentDocumentName || !currentFile || isTranscribing}
            >
              <FaPlus className="mr-1" size={12} /> Add to Queue
            </button>
            
            <button
              onClick={handleTranscribeFile}
              className="p-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white rounded-lg flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              disabled={!currentFile || isTranscribing}
            >
              <FaPlay className="mr-1" size={12} /> Transcribe Now
            </button>
          </div>
        </div>

        {/* Queued Files Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-indigo-200 mb-2 flex items-center">
            <span className="mr-1">Queue</span>
            <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 rounded-full text-xs">
              {localQueue.length}
            </span>
          </h3>
          
          {localQueue.length === 0 ? (
            <div className="text-sm text-indigo-300 italic text-center p-2 bg-indigo-800 bg-opacity-20 rounded border border-indigo-700">
              No files in queue
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto bg-indigo-800 bg-opacity-20 rounded border border-indigo-700 divide-y divide-indigo-700/40">
              {localQueue.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-2 hover:bg-indigo-700/30"
                >
                  <div className="overflow-hidden">
                    <div className="text-sm font-medium text-indigo-200 truncate flex items-center">
                      {item.mediaType === 'audio' ? (
                        <FaFileAudio className="mr-1 text-indigo-400" size={12} />
                      ) : (
                        <FaFileVideo className="mr-1 text-indigo-400" size={12} />
                      )}
                      {item.documentName}
                    </div>
                    <div className="text-xs text-indigo-400 truncate">{item.file.name}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveFromQueue(item.id)}
                    className="p-1 text-indigo-400 hover:text-red-400 transition-colors"
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
          className="w-full p-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-lg flex items-center justify-center mb-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow"
          disabled={localQueue.length === 0 || isTranscribing}
        >
          <FaPlay className="mr-2" /> Process All Files ({localQueue.length})
        </button>

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="whisper-output"
          style={{ background: '#a78bfa', width: 12, height: 12, border: '2px solid #4f46e5' }}
          isConnectable={isConnectable}
        />
      </div>
      
      {/* Live Transcription Side Panel */}
      {showTranscriptArea && (
        <div className="ml-4 w-[300px] flex flex-col">
          <div className="text-md font-bold text-white border-b border-indigo-400 pb-2 mb-3 flex items-center">
            <FaWaveSquare className="mr-2 text-indigo-300" size={18} />
            <span>Live Transcription</span>
          </div>
          
          <div 
            ref={transcriptContainerRef}
            className="flex-1 bg-gradient-to-b from-gray-800 to-gray-900 border border-indigo-500 rounded-lg shadow-inner p-3 overflow-y-auto max-h-[400px]"
            style={{ minHeight: '300px' }}
          >
            {liveTranscript ? (
              <div>
                <div className="text-gray-200 font-mono text-sm whitespace-pre-wrap">
                  {liveTranscript.split(' ').map((word, index, array) => {
                    // Make the last word the one that appears to be typing
                    if (index === array.length - 1) {
                      return (
                        <span key={index} className="text-teal-300">
                          {index > 0 ? ' ' : ''}{word}
                          <span className="inline-block w-2 h-4 bg-teal-400 ml-1 animate-pulse"></span>
                        </span>
                      );
                    }
                    
                    // Add different colors for some words to create visual interest
                    let className = "text-gray-200";
                    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
                      className = "text-indigo-200";
                    } else if (word.length > 6) {
                      className = "text-blue-200";
                    }
                    
                    return (
                      <span key={index} className={className}>
                        {index > 0 ? ' ' : ''}{word}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-indigo-300 italic">Waiting for transcription...</p>
              </div>
            )}
          </div>

          {/* Transcription Result Button */}
          {transcriptionResult && (
            <button
              onClick={() => setShowTranscriptArea(false)}
              className="mt-3 p-2 bg-teal-700 hover:bg-teal-600 text-white rounded text-sm flex items-center justify-center"
            >
              <span className="mr-1">✓</span> Transcription Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default WhisperTranscriptionNode; 