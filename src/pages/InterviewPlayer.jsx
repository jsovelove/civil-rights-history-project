/**
 * @fileoverview InterviewPlayer page for displaying and controlling interview videos.
 * 
 * This component handles displaying a full interview video with customized playback controls,
 * segmented content navigation, and related metadata. It integrates with YouTube's iframe API
 * to provide a seamless media playback experience with custom controls.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getInterviewData, getInterviewSegments } from '../services/firebase'
import { calculateRelatedTerms } from '../services/relatedTermsService'
import { RelatedTopicsCompact } from '../components/RelatedTopics'
import Footer from '../components/common/Footer'

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
  const [playerReady, setPlayerReady] = useState(false)
  const [youtubeApiLoaded, setYoutubeApiLoaded] = useState(false)
  
  // Player control states
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [seekToTime, setSeekToTime] = useState(null)
  
  // Related terms state
  const [relatedTermsCache, setRelatedTermsCache] = useState({})
  const [availableTopics, setAvailableTopics] = useState([])
  
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
   * @param {string} timestamp - Timestamp in format "[MM:SS] - Text", "[HH:MM:SS] - Text", or "HH:MM:SS,000 - HH:MM:SS,000"
   * @returns {number} Time in seconds
   */
  const convertTimestampToSeconds = (timestamp) => {
    if (!timestamp) return 0
    
    // Handle metadataV2 format: "01:26:43,000 - 02:38:35,000"
    // Extract the start time (before the " - ")
    const timeStr = timestamp.split(' - ')[0].replace(/[\[\]]/g, '').replace(',000', '').trim()
    const parts = timeStr.split(':').map(Number)
    
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    return 0
  }

  // Helper function to extract start timestamp from various formats
  const extractStartTimestamp = (timestamp) => {
    if (!timestamp) return '00:00'
    // Handle both formats: "[HH:MM:SS - HH:MM:SS]" and "HH:MM:SS,000 - HH:MM:SS,000"
    const cleanTimestamp = timestamp.replace(/[\[\]]/g, '').replace(',000', '')
    const parts = cleanTimestamp.split(' - ')
    return parts.length >= 1 ? parts[0].trim() : '00:00'
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
   * Initialize related terms cache
   */
  useEffect(() => {
    const initializeRelatedTerms = async () => {
      try {
        console.log('Initializing related terms for interview player...');
        const relatedTerms = await calculateRelatedTerms();
        setRelatedTermsCache(relatedTerms);
        
        // Get available topics from the related terms cache
        const topics = Object.keys(relatedTerms).map(topic => ({ keyword: topic }));
        setAvailableTopics(topics);
      } catch (error) {
        console.error('Error initializing related terms:', error);
      }
    };

    initializeRelatedTerms();
  }, []);

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
        
        // Use the new enhanced service functions
        const mainData = await getInterviewData(documentName)
        if (!mainData) {
          setError('Interview not found')
          setLoading(false)
          return
        }
        setMainSummary(mainData)

        // Fetch segments using new service
        const subs = await getInterviewSegments(documentName)
        
        // Sort segments by timestamp (handling both legacy and new formats)
        subs.sort((a, b) => {
          // Use startTime if available (metadataV2), otherwise extract from timestamp
          const timeA = a.startTime || extractStartTimestamp(a.timestamp)
          const timeB = b.startTime || extractStartTimestamp(b.timestamp)
          return convertTimestampToSeconds(timeA) - convertTimestampToSeconds(timeB)
        })
        
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
        controls: 1, // Show default YouTube controls
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
  }, [youtubeApiLoaded, mainSummary, containerEl])

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
    setSeekToTime(seconds)
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seconds, true)
      playerRef.current.playVideo()
      setIsPlaying(true)
    }
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

  const hasSegments = subSummaries.length > 0;

  return (
    <div className="w-full relative bg-gray-200 overflow-hidden">
      {/* Header Navigation */}
      <div className="w-full h-12 px-12 pt-4 pb-3">
        <div className="w-full h-11 relative">
          <div className="w-[507px] left-0 top-0 absolute inline-flex justify-center items-center gap-2.5">
            <button 
              onClick={() => navigate('/')}
              className="w-[505px] justify-start hover:opacity-70 transition-opacity cursor-pointer"
            >
              <span className="text-stone-900 text-4xl font-normal font-body">Civil</span>
              <span className="text-stone-900 text-4xl font-normal font-body tracking-wide"> Rights </span>
              <span className="text-stone-900 text-4xl font-bold font-body leading-9">History</span>
              <span className="text-stone-900 text-4xl font-bold font-body leading-9"> Project</span>
            </button>
          </div>
          <div className="w-12 h-12 absolute right-0 top-0">
            <div className="w-6 h-6 absolute right-3 top-3 transform rotate-180" />
          </div>
        </div>
      </div>


      {/* Video Container */}
      <div className="w-full px-12 pt-4 pb-6">
        <div className="w-full max-w-[1632px] mx-auto relative">
          <div 
            className="w-full overflow-hidden bg-black relative"
            style={{ aspectRatio: '16/9', maxHeight: '922px' }}
          >
            <div className="absolute inset-0" ref={setContainerEl}></div>
            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <div className="w-16 h-16 border-4 border-white/50 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interview Info Section */}
      <div className="w-full px-12">
        <div className="w-full max-w-[1632px] mx-auto">
          {/* Keywords Row */}
          <div className="w-full mb-11 flex flex-wrap gap-4">
            {mainSummary && formatKeywords(mainSummary.keywords || []).slice(0, 6).map((keyword, idx) => (
              <div 
                key={idx}
                className="px-6 py-3 rounded-[50px] border border-black inline-flex justify-center items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`)}
              >
                <div className="text-center text-black text-base font-mono">{keyword}</div>
              </div>
            ))}
          </div>

          {/* Interview Title and Info */}
          <div className="w-full mb-16">
            <div className="text-stone-900 text-8xl font-medium font-heading mb-4">
              {mainSummary?.name || documentName}
            </div>
            <div className="text-red-500 text-base font-mono">
              {mainSummary?.roleSimplified && `${mainSummary.roleSimplified} | `}
              {totalDuration > 0 && `${Math.round(totalDuration / 60)} minutes`}
            </div>
          </div>

          {/* Overview */}
          <div className="w-full max-w-[1030px] mb-20">
            <div className="text-black text-2xl font-normal font-['Source_Serif_4'] leading-relaxed">
              {mainSummary?.mainSummary || 'No summary available'}
            </div>
          </div>
        </div>
      </div>

      {/* Interview Segments */}
      <div className="w-full px-12 space-y-8">
        <div className="w-full max-w-[1632px] mx-auto">
          {subSummaries.map((summary, index) => (
            <div key={summary.id || index} className="w-full mb-8">
              <div 
                className="text-red-500 text-base font-mono mb-2 cursor-pointer hover:text-red-700 transition-colors"
                onClick={() => {
                  const seconds = convertTimestampToSeconds(summary.timestamp);
                  handleTimestampClick(seconds);
                }}
                disabled={!playerReady}
              >
                Chapter {String(index + 1).padStart(2, '0')} | {summary.timestamp ? summary.timestamp.split(' - ')[0].replace(/[\[\]]/g, '').replace(',000', '').trim() : 'Unknown time'}
              </div>
              
              <div className="flex gap-8 items-start">
                <div className="w-[503px]">
                  <div className="text-stone-900 text-4xl font-bold font-body mb-4">
                    {summary.topic || `Segment ${index + 1}`}
                  </div>
                  
                  {/* Keywords for this segment */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    {formatKeywords(summary.keywords).slice(0, 3).map((keyword, idx) => (
                      <div 
                        key={idx}
                        className="px-6 py-3 rounded-[50px] border border-black inline-flex justify-center items-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => navigate(`/playlist-builder?keywords=${encodeURIComponent(keyword)}`)}
                      >
                        <div className="text-center text-black text-base font-mono">{keyword}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 max-w-[804px]">
                  <div className="text-black text-2xl font-normal font-['Source_Serif_4'] leading-relaxed">
                    {summary.summary}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Related Topics Section */}
      {mainSummary && Object.keys(relatedTermsCache).length > 0 && (
        <div className="w-full px-12 py-8">
          <div className="w-full max-w-[1632px] mx-auto">
            <div className="mb-6">
              <div className="w-full h-px border-t border-gray-300 mb-6"></div>
              <div className="text-stone-900 text-4xl font-medium font-heading mb-6">
                Related Topics
              </div>
            </div>
            
            {/* Show related topics for the main interview topic */}
            <RelatedTopicsCompact
              currentTopic={mainSummary.documentName}
              relatedTermsCache={relatedTermsCache}
              availableTopics={availableTopics}
              maxDisplay={6}
              className="mb-4"
            />
          </div>
        </div>
      )}

      {/* Related Interviews Section */}
      <div className="w-full px-12 py-16">
        <div className="w-full max-w-[1632px] mx-auto">
          <div className="mb-8">
            <div className="w-full h-px border-t border-black mb-6"></div>
            <div className="text-stone-900 text-8xl font-medium font-heading">
              <span className="text-stone-900">Related</span>
              <span className="text-red-500"> </span>
              <span className="text-stone-900">Interviews</span>
            </div>
          </div>
          
          {/* Related interviews grid - placeholder for now */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="w-full">
                <div className="w-full h-72 bg-zinc-300 mb-3 rounded"></div>
                <div className="text-stone-900 text-4xl font-bold font-body mb-2">
                  Related Interview {item}
                </div>
                <div className="text-stone-900 text-base font-mono">
                  Role | Duration
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}