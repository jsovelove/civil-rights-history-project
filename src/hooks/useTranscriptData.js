import { useState, useEffect } from 'react';
import useLocalStorage from './useLocalStorage';
import { parseTimestamp } from '../utils/transcriptUtils';

/**
 * Custom hook for managing transcript data with local storage persistence
 * 
 * @returns {Object} Transcript data and functions to update it
 */
const useTranscriptData = () => {
  // Load initial data from local storage
  const [transcriptData, setTranscriptData] = useLocalStorage('transcript_data', {
    transcript: null,
    audioUrl: null,
    summaries: null,
    documentName: '',
    systemMessage: `
    You are an assistant that processes interview transcripts into structured summaries with timestamps and keywords.
    
    Always output the content in the following strict format:
    Overall Summary:
    [Provide a concise overall summary here.]
    
    Key Points:
    1. Title: [First key topic]
       Timestamp: [Start time - End time]
       Keywords: [Comma-separated list of keywords]
       Summary: [Provide a short summary of the first key topic.]
    `,
    savedToDatabase: false,
    youtubeUrl: '',
    youtubeEmbedUrl: null
  });

  // Destructure the data from localStorage
  const [transcript, setTranscript] = useState(transcriptData.transcript);
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(transcriptData.audioUrl);
  const [summaries, setSummaries] = useState(transcriptData.summaries);
  const [documentName, setDocumentName] = useState(transcriptData.documentName);
  const [systemMessage, setSystemMessage] = useState(transcriptData.systemMessage);
  const [savedToDatabase, setSavedToDatabase] = useState(transcriptData.savedToDatabase);
  const [youtubeUrl, setYoutubeUrl] = useState(transcriptData.youtubeUrl);
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState(transcriptData.youtubeEmbedUrl);
  const [currentTimestamp, setCurrentTimestamp] = useState('');
  const [savingToDatabase, setSavingToDatabase] = useState(false);

  // Update local storage when state changes
  useEffect(() => {
    if (transcript || summaries || documentName || audioUrl || youtubeUrl) {
      setTranscriptData({
        transcript,
        audioUrl,
        summaries,
        documentName,
        systemMessage,
        savedToDatabase,
        youtubeUrl,
        youtubeEmbedUrl
      });
    }
  }, [
    transcript, 
    audioUrl, 
    summaries, 
    documentName, 
    systemMessage, 
    savedToDatabase, 
    youtubeUrl, 
    youtubeEmbedUrl, 
    setTranscriptData
  ]);

  /**
   * Handle summary change
   * 
   * @param {string} newSummary - New summary text
   */
  const handleSummaryChange = (newSummary) => {
    if (!summaries) return;
    
    setSummaries({
      ...summaries,
      overallSummary: newSummary
    });
  };

  /**
   * Handle editing of summary
   * 
   * @param {Object} summary - Summary to edit
   */
  const handleEditSummary = (summary) => {
    // This function is just a placeholder for now
    // Could be used to implement a modal editor or other UI enhancement
    console.log("Editing summary:", summary);
  };

  /**
   * Handle key point changes
   * 
   * @param {number} index - Index of key point to change
   * @param {string} field - Field to change
   * @param {string} value - New value
   */
  const handleKeyPointChange = (index, field, value) => {
    if (!summaries) return;
    
    const updatedKeyPoints = [...summaries.keyPoints];
    updatedKeyPoints[index] = {
      ...updatedKeyPoints[index],
      [field]: value
    };
    
    setSummaries({
      ...summaries,
      keyPoints: updatedKeyPoints
    });
  };

  /**
   * Add a new key point
   */
  const handleAddKeyPoint = () => {
    if (!summaries) return;
    
    const newKeyPoint = {
      topic: "New Key Point",
      timestamp: "00:00 - 00:00",
      keywords: "keyword1, keyword2",
      summary: "Add your summary here"
    };
    
    setSummaries({
      ...summaries,
      keyPoints: [...summaries.keyPoints, newKeyPoint]
    });
  };

  /**
   * Remove a key point
   * 
   * @param {number} index - Index of key point to remove
   */
  const handleRemoveKeyPoint = (index) => {
    if (!summaries) return;
    
    const updatedKeyPoints = summaries.keyPoints.filter((_, i) => i !== index);
    
    setSummaries({
      ...summaries,
      keyPoints: updatedKeyPoints
    });
  };

  /**
   * Handle YouTube URL submission
   * 
   * @param {string} url - YouTube URL
   */
  const handleYoutubeUrlSubmit = (url) => {
    try {
      // Convert YouTube URL to embed URL
      let videoId = '';
      
      if (url.includes('youtube.com/watch')) {
        const urlParams = new URL(url).searchParams;
        videoId = urlParams.get('v');
      } else if (url.includes('youtu.be/')) {
        const parts = url.split('/');
        videoId = parts[parts.length - 1];
      } else if (url.includes('youtube.com/embed/')) {
        // Handle embed URLs
        const embedPath = url.split('youtube.com/embed/')[1];
        videoId = embedPath.split('?')[0]; // Remove any query parameters
      }
      
      if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
        setYoutubeEmbedUrl(embedUrl);
      } else {
        throw new Error("Invalid YouTube URL. Please provide a valid YouTube video URL (standard, shortened, or embed format).");
      }
    } catch (error) {
      console.error("Error processing YouTube URL:", error);
      throw new Error("Failed to process YouTube URL");
    }
  };

  /**
   * Jump to a timestamp in audio or video
   * 
   * @param {string} timestamp - Timestamp string
   * @param {Object} audioRef - Reference to audio element
   * @param {Object} videoRef - Reference to video element
   */
  const jumpToTimestamp = (timestamp, audioRef, videoRef) => {
    try {
      // Parse the timestamp into seconds
      const totalSeconds = parseTimestamp(timestamp);
      
      // Update current timestamp for display
      setCurrentTimestamp(timestamp.split(" - ")[0]);
      
      // Jump in audio if available
      if (audioRef.current && isFinite(totalSeconds)) {
        audioRef.current.currentTime = totalSeconds;
        audioRef.current.play();
      }
      
      // Jump in YouTube video if available
      if (videoRef.current && youtubeEmbedUrl && isFinite(totalSeconds)) {
        try {
          // Access the iframe's contentWindow and postMessage to control YouTube player
          videoRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'seekTo',
              args: [totalSeconds, true]
            }), 
            '*'
          );
        } catch (error) {
          console.error("Error seeking YouTube video:", error);
        }
      }
    } catch (error) {
      console.error(`Error processing timestamp "${timestamp}":`, error);
      throw new Error(`Invalid timestamp format: ${timestamp}. Use MM:SS or HH:MM:SS format.`);
    }
  };

  /**
   * Reset all data
   */
  const handleResetData = () => {
    if (window.confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      // Clear all state
      setTranscript(null);
      setTranscriptFile(null);
      setAudioUrl(null);
      setSummaries(null);
      setDocumentName('');
      setYoutubeUrl('');
      setYoutubeEmbedUrl(null);
      setSavedToDatabase(false);
      
      // Reset to default system message
      setSystemMessage(`
    You are an assistant that processes interview transcripts into structured summaries with timestamps and keywords.
    
    Always output the content in the following strict format:
    Overall Summary:
    [Provide a concise overall summary here.]
    
    Key Points:
    1. Title: [First key topic]
       Timestamp: [Start time - End time]
       Keywords: [Comma-separated list of keywords]
       Summary: [Provide a short summary of the first key topic.]
  `);
      
      // Clear local storage
      localStorage.removeItem('transcript_data');
    }
  };

  return {
    transcript,
    setTranscript,
    transcriptFile,
    setTranscriptFile,
    audioUrl,
    setAudioUrl,
    summaries,
    setSummaries,
    documentName,
    setDocumentName,
    systemMessage,
    setSystemMessage,
    savedToDatabase,
    setSavedToDatabase,
    youtubeUrl,
    setYoutubeUrl,
    youtubeEmbedUrl,
    setYoutubeEmbedUrl,
    currentTimestamp,
    setCurrentTimestamp,
    savingToDatabase,
    setSavingToDatabase,
    handleSummaryChange,
    handleEditSummary,
    handleKeyPointChange,
    handleAddKeyPoint,
    handleRemoveKeyPoint,
    handleYoutubeUrlSubmit,
    jumpToTimestamp,
    handleResetData
  };
};

export default useTranscriptData; 