/**
 * @fileoverview InterviewPlayer page for displaying and controlling interview videos.
 * 
 * This component handles displaying a full interview video with customized playback controls,
 * segmented content navigation, and related metadata. It integrates with YouTube's iframe API
 * to provide a seamless media playback experience with custom controls.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import { ChevronDown, ChevronUp, Clock, Tag } from 'lucide-react'
import PlayerControls from "../components/PlayerControls"
import IntegratedTimeline from "../components/IntegratedTimeline"

/**
 * InterviewPlayer - Main component for viewing and navigating interview videos
 * 
 * This component:
 * 1. Retrieves and displays interview metadata and segmented content
 * 2. Initializes and controls the YouTube player integration
 * 3. Provides custom playback controls and timeline navigation
 * 4. Manages segment-based navigation with timestamps and topics
 * 5. Offers related content discovery through keywords
 * 
 * URL Parameters:
 * - documentName: ID of the interview document to display
 * 
 * @returns {React.ReactElement} The interview player interface
 */
export default function InterviewPlayer() {
  // Routing and navigation
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const documentName = searchParams.get('documentName')

  // Component state variables
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mainSummary, setMainSummary] = useState(null)
  const [subSummaries, setSubSummaries] = useState([])
  const [openAccordion, setOpenAccordion] = useState(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [youtubeApiLoaded, setYoutubeApiLoaded] = useState(false)
  
  // Player control states
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [seekToTime, setSeekToTime] = useState(null)
  
  // References
  const [containerEl, setContainerEl] = useState(null) // YouTube container element via callback ref
  const playerRef = useRef(null) // Reference to the YouTube player instance
  const playerUpdateIntervalRef = useRef(null) // Reference to the time update interval

  /**
   * --- Helper Functions ---
   */

  /**
   * Extracts YouTube video ID from various URL formats
   * 
   * @param {string} videoEmbedLink - YouTube URL in different possible formats
   * @returns {string|null} YouTube video ID or null if not extractable
   */
  const extractVideoId = (videoEmbedLink) => {
    if (!videoEmbedLink) return null
    const match = videoEmbedLink.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  /**
   * Converts a timestamp string to seconds
   * 
   * @param {string} timestamp - Timestamp in format "[MM:SS] - Text" or "[HH:MM:SS] - Text"
   * @returns {number} Time in seconds
   */
  const convertTimestampToSeconds = (timestamp) => {
    if (!timestamp) return 0
    const timeStr = timestamp.split(' - ')[0].replace(/[\[\]]/g, '').trim()
    const parts = timeStr.split(':').map(Number)
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    return 0
  }

  /**
   * Formats keywords into a consistent array format
   * 
   * @param {string|string[]} keywords - Keywords as string or array
   * @returns {string[]} Formatted array of keywords
   */
  const formatKeywords = (keywords) => {
    if (Array.isArray(keywords)) return keywords
    if (typeof keywords === 'string') return keywords.split(',').map((k) => k.trim())
    return []
  }

  /**
   * Determines which segment is active based on current playback time
   * 
   * @param {number} time - Current playback time in seconds
   * @returns {number} Index of the current segment
   */
  const getCurrentSegmentIndex = (time) => {
    if (!subSummaries || subSummaries.length === 0) return 0
    
    // Find the last segment that starts before the current time
    for (let i = subSummaries.length - 1; i >= 0; i--) {
      const startTime = convertTimestampToSeconds(subSummaries[i].timestamp)
      if (startTime <= time) {
        return i
      }
    }
    
    return 0 // Default to first segment if none found
  }

  /**
   * --- Data Fetching ---
   * Fetches interview data and segment information from Firestore
   */
  useEffect(() => {
    if (!documentName) {
      setError('Document name is missing')
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        setLoading(true)
        // Fetch main interview document
        const docRef = doc(db, 'interviewSummaries', documentName)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) {
          setError('Interview not found')
          setLoading(false)
          return
        }
        const mainData = docSnap.data()
        setMainSummary(mainData)

        // Fetch all sub-segments from the subcollection
        const subRef = collection(db, 'interviewSummaries', documentName, 'subSummaries')
        const subSnap = await getDocs(subRef)
        const subs = []
        subSnap.forEach((doc) => {
          subs.push({ id: doc.id, ...doc.data() })
        })

        // Sort segments by timestamp
        subs.sort(
          (a, b) =>
            convertTimestampToSeconds(a.timestamp) - convertTimestampToSeconds(b.timestamp)
        )
        setSubSummaries(subs)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching interview data:', err)
        setError('Failed to load interview data')
        setLoading(false)
      }
    }

    fetchData()
  }, [documentName])

  /**
   * --- Load YouTube API ---
   * Dynamically loads the YouTube iframe API if not already loaded
   */
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYoutubeApiLoaded(true)
      return
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.onload = () => {
      if (window.YT && window.YT.Player) {
        setYoutubeApiLoaded(true)
      }
    }
    document.body.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => {
      setYoutubeApiLoaded(true)
    }
  }, [])

  /**
   * --- Initialize YouTube Player ---
   * Creates and configures the YouTube player instance when dependencies are ready
   */
  useEffect(() => {
    if (!youtubeApiLoaded || !mainSummary?.videoEmbedLink || !containerEl) return

    const videoId = extractVideoId(mainSummary.videoEmbedLink)
    if (!videoId) {
      console.error('Invalid YouTube video link')
      return
    }

    // Destroy any existing player instance.
    if (playerRef.current && typeof playerRef.current.destroy === 'function') {
      playerRef.current.destroy()
      setPlayerReady(false)
    }

    // Initialize new player instance
    playerRef.current = new window.YT.Player(containerEl, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0, // Hide default controls since we'll use our custom ones
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (event) => {
          setPlayerReady(true)
          setTotalDuration(event.target.getDuration())
          console.log('Player is ready with duration:', event.target.getDuration())
        },
        onStateChange: (event) => {
          // Update isPlaying state based on player state
          setIsPlaying(event.data === window.YT.PlayerState.PLAYING)
          
          // If video ended
          if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false)
          }
        },
        onError: (e) => {
          console.error('YouTube player error:', e.data)
        },
      },
    })

    // Set up interval to update current time and segment information
    playerUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime()
        setCurrentTime(currentTime)
        
        // Update current segment based on time
        const newSegmentIndex = getCurrentSegmentIndex(currentTime)
        if (newSegmentIndex !== currentSegmentIndex) {
          setCurrentSegmentIndex(newSegmentIndex)
          // Removed auto-opening accordion
        }
      }
    }, 500)

    // Cleanup function to clear interval and destroy player on unmount
    return () => {
      if (playerUpdateIntervalRef.current) {
        clearInterval(playerUpdateIntervalRef.current)
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [youtubeApiLoaded, mainSummary, containerEl, currentSegmentIndex])

  /**
   * Handle seek requests when seekToTime changes
   */
  useEffect(() => {
    if (seekToTime !== null && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seekToTime, true)
      setSeekToTime(null) // Reset after seeking
    }
  }, [seekToTime])

  /**
   * --- Event Handlers ---
   */

  /**
   * Handles clicks on timestamp links to seek to specific points
   * 
   * @param {number} seconds - Target time in seconds to seek to
   */
  const handleTimestampClick = (seconds) => {
    console.log('Seeking to', seconds, 'seconds')
    setSeekToTime(seconds)
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seconds, true)
      playerRef.current.playVideo()
      setIsPlaying(true)
    }
  }

  /**
   * Toggles the open/closed state of an accordion item
   * 
   * @param {number} index - Index of the accordion item to toggle
   */
  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index)
  }

  /**
   * Player control handlers for custom playback controls
   */
  const handlePlayVideo = () => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      playerRef.current.playVideo()
      setIsPlaying(true)
    }
  }

  const handlePauseVideo = () => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo()
      setIsPlaying(false)
    }
  }

  /**
   * Navigates to the next segment in the interview
   */
  const handleNext = () => {
    if (currentSegmentIndex < subSummaries.length - 1) {
      const nextSegment = subSummaries[currentSegmentIndex + 1]
      const nextTime = convertTimestampToSeconds(nextSegment.timestamp)
      handleTimestampClick(nextTime)
      setCurrentSegmentIndex(currentSegmentIndex + 1)
    }
  }

  /**
   * Navigates to the previous segment in the interview
   */
  const handlePrevious = () => {
    if (currentSegmentIndex > 0) {
      const prevSegment = subSummaries[currentSegmentIndex - 1]
      const prevTime = convertTimestampToSeconds(prevSegment.timestamp)
      handleTimestampClick(prevTime)
      setCurrentSegmentIndex(currentSegmentIndex - 1)
    }
  }

  /**
   * Sets the seekToTime state to initiate seeking
   * 
   * @param {number} timeToSeek - Target time in seconds
   */
  const handleSeek = (timeToSeek) => {
    setSeekToTime(timeToSeek)
  }

  /**
   * AccordionItem - Component for displaying individual interview segments in accordion format
   * 
   * @param {Object} props - Component props
   * @param {Object} props.summary - Segment summary data
   * @param {number} props.index - Index of this segment
   * @param {boolean} props.isOpen - Whether this accordion item is open
   * @param {boolean} props.isActive - Whether this segment is currently playing
   * @returns {React.ReactElement} Accordion item for a segment
   */
  const AccordionItem = ({ summary, index, isOpen, isActive }) => {
    const contentRef = useRef(null)
    const [contentHeight, setContentHeight] = useState(0)
  
    // Measure content height when accordion is opened
    useEffect(() => {
      if (isOpen && contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight)
      }
    }, [isOpen])
  
    const timestampSeconds = convertTimestampToSeconds(summary.timestamp)
    const keywordsList = formatKeywords(summary.keywords)
    const isCurrentSegment = index === currentSegmentIndex
  
    return (
      <div className={`accordion-item border-b border-gray-200 ${isCurrentSegment ? 'border-l-4 border-l-blue-500' : ''}`}>
        <button
          onClick={() => toggleAccordion(index)}
          className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
            isOpen
              ? 'bg-blue-50 text-blue-700'
              : isCurrentSegment
                ? 'bg-blue-50/50 text-blue-600'
                : 'text-gray-800 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold mr-3 ${
              isCurrentSegment ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              {index + 1}
            </span>
            <span className="font-bold">{summary.topic}</span>
          </div>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
  
        <div
          style={{
            height: isOpen ? (contentHeight || 'auto') : 0,
            overflow: 'hidden',
            transition: isOpen ? 'height 0.3s ease' : 'height 0.3s ease',
            maxHeight: isOpen ? '1000px' : '0',
          }}
        >
          <div ref={contentRef} className="p-4 bg-gray-50">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleTimestampClick(timestampSeconds)
              }}
              className={`flex items-center mb-4 text-blue-600 hover:text-blue-800 transition-colors ${
                !playerReady ? 'opacity-50 cursor-wait' : 'cursor-pointer'
              }`}
              disabled={!playerReady}
            >
              <Clock size={16} className="mr-2" />
              <span className="font-bold">
                {summary.timestamp
                  ? summary.timestamp.split(' - ')[0].replace(/[\[\]]/g, '').trim()
                  : 'Unknown time'}
              </span>
            </button>
  
            {keywordsList.length > 0 && (
              <div className="mb-4 text-sm flex flex-wrap">
                {keywordsList.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="mr-2 mb-2 px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`)
                    }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
  
            <p className="text-gray-700 leading-relaxed">
              {summary.summary}
            </p>
  
            {/* View Clip Button */}
            <div className="mt-4">
              <button
                className="text-sm text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/clip-player?documentName=${encodeURIComponent(documentName)}&clipId=${encodeURIComponent(summary.id)}`)
                }}
              >
                ▶ View this clip as a standalone page
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  /**
   * Formats seconds into a human-readable time string
   * 
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string (MM:SS or HH:MM:SS)
   */
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Formats segment data for use in timeline visualization
   * 
   * @returns {Array} Array of segment objects with normalized properties for timeline display
   */
  const formatSegmentsForTimeline = () => {
    return subSummaries.map((segment, index) => ({
      id: segment.id || index,
      label: segment.topic || `Segment ${index + 1}`,
      timestamp: segment.timestamp,
      startSeconds: convertTimestampToSeconds(segment.timestamp),
      // For the end time, use the next segment's start time or video duration
      endSeconds: index < subSummaries.length - 1 
        ? convertTimestampToSeconds(subSummaries[index + 1].timestamp) 
        : totalDuration,
      summary: segment.summary
    }));
  }

  /**
   * --- Rendering ---
   */
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
        <p>
          <strong>Error:</strong> {error}
        </p>
      </div>
    )
  }

  // Prepare data for timeline
  const timelineSegments = formatSegmentsForTimeline();
  const hasSegments = subSummaries.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header with interview title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {mainSummary?.name || documentName}
        </h1>
        <p className="text-gray-600">
          {mainSummary?.role && (
            <span className="italic">{mainSummary.role}</span>
          )}
          {subSummaries.length > 0 && (
            <span className="mx-2 text-gray-400">•</span>
          )}
          {subSummaries.length > 0 && (
            <span>{subSummaries.length} segments</span>
          )}
        </p>
      </div>

      {/* Video Container with Styling similar to PlaylistBuilder */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        {/* Video player */}
        <div className="w-full max-w-2xl mx-auto relative rounded-lg overflow-hidden" style={{ height: '360px' }}>
          <div className="absolute inset-0 bg-black" ref={setContainerEl}></div>
          {!playerReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="w-10 h-10 border-4 border-white/50 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Timeline - only the progress bar with scrubbing */}
        {hasSegments && playerReady && (
          <div className="mt-6 mb-4 w-full max-w-2xl mx-auto">
            <div 
              className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                // Calculate click position as percentage of width
                const rect = e.currentTarget.getBoundingClientRect();
                const position = (e.clientX - rect.left) / rect.width;
                // Convert to time and seek
                const seekTime = position * totalDuration;
                handleTimestampClick(seekTime);
              }}
              onMouseMove={(e) => {
                // Only handle if mouse button is pressed (for dragging)
                if (e.buttons === 1) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const position = (e.clientX - rect.left) / rect.width;
                  const seekTime = position * totalDuration;
                  handleTimestampClick(seekTime);
                }
              }}
            >
              {/* Progress bar */}
              <div 
                className="absolute top-0 left-0 h-full bg-blue-500"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              ></div>
              
              {/* Segment markers */}
              {timelineSegments.map((segment, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 w-0.5 h-full bg-gray-400 cursor-pointer"
                  style={{ left: `${(segment.startSeconds / totalDuration) * 100}%` }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent's onClick
                    handleTimestampClick(segment.startSeconds);
                  }}
                  title={segment.label}
                ></div>
              ))}
            </div>
            {/* Time indicator */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>
        )}

        {/* Integrated player controls */}
        <div className="w-full max-w-2xl mx-auto flex justify-center items-center py-3 mt-5">
          <PlayerControls
            onPrevious={handlePrevious}
            onPlay={handlePlayVideo}
            onPause={handlePauseVideo}
            onNext={handleNext}
            isPlaying={isPlaying}
            hasPrevious={currentSegmentIndex > 0}
            hasNext={currentSegmentIndex < subSummaries.length - 1}
          />
        </div>

        {/* Currently Playing Section Info */}
        {hasSegments && subSummaries[currentSegmentIndex] && (
          <div className="w-full max-w-2xl mx-auto mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {subSummaries[currentSegmentIndex].topic || `Segment ${currentSegmentIndex + 1}`}
            </h3>
            
            {/* Keywords for current segment */}
            {formatKeywords(subSummaries[currentSegmentIndex].keywords).length > 0 && (
              <div className="mb-3 flex flex-wrap">
                {formatKeywords(subSummaries[currentSegmentIndex].keywords).map((keyword, idx) => (
                  <span 
                    key={idx} 
                    className="mr-2 mb-2 px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={() => navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`)}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="m-0 text-base leading-relaxed text-gray-700">
                {subSummaries[currentSegmentIndex].summary}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Overview Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            Overview
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {mainSummary?.mainSummary || 'No summary available'}
          </p>
        </div>
      </div>

      {/* Interview Segments Accordion */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            Interview Segments
          </h2>
        </div>
        {subSummaries.map((summary, index) => (
          <AccordionItem
            key={summary.id || index}
            summary={summary}
            index={index}
            isOpen={openAccordion === index}
            isActive={currentSegmentIndex === index}
          />
        ))}
        {subSummaries.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No segments available for this interview
          </div>
        )}
      </div>
    </div>
  )
}