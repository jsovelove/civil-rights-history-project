import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'
import { ChevronDown, ChevronUp, Clock, Tag } from 'lucide-react'

export default function InterviewPlayer() {
  const [searchParams] = useSearchParams()
  const documentName = searchParams.get('documentName')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mainSummary, setMainSummary] = useState(null)
  const [subSummaries, setSubSummaries] = useState([])
  const [openAccordion, setOpenAccordion] = useState(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [youtubeApiLoaded, setYoutubeApiLoaded] = useState(false)
  // Store the YouTube container element via a callback ref in state.
  const [containerEl, setContainerEl] = useState(null)
  const playerRef = useRef(null)

  // --- Helper Functions ---
  const extractVideoId = (videoEmbedLink) => {
    if (!videoEmbedLink) return null
    const match = videoEmbedLink.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  // Updated conversion uses the text before " - " and removes brackets.
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

  const formatKeywords = (keywords) => {
    if (Array.isArray(keywords)) return keywords
    if (typeof keywords === 'string') return keywords.split(',').map((k) => k.trim())
    return []
  }

  // --- Data Fetching ---
  useEffect(() => {
    if (!documentName) {
      setError('Document name is missing')
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        setLoading(true)
        const docRef = doc(db, 'interviewSummaries', documentName)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) {
          setError('Interview not found')
          setLoading(false)
          return
        }
        const mainData = docSnap.data()
        setMainSummary(mainData)

        const subRef = collection(db, 'interviewSummaries', documentName, 'subSummaries')
        const subSnap = await getDocs(subRef)
        const subs = []
        subSnap.forEach((doc) => {
          subs.push({ id: doc.id, ...doc.data() })
        })

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

  // --- Load YouTube API ---
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

  // --- Initialize YouTube Player ---
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

    playerRef.current = new window.YT.Player(containerEl, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          setPlayerReady(true)
          console.log('Player is ready')
        },
        onError: (e) => {
          console.error('YouTube player error:', e.data)
        },
      },
    })

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [youtubeApiLoaded, mainSummary, containerEl])

  // --- Event Handlers ---
  const handleTimestampClick = (seconds) => {
    console.log('Seeking to', seconds, 'seconds')
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seconds, true)
      playerRef.current.playVideo()
    }
  }

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index)
  }

  // --- Accordion Item Component ---
  const AccordionItem = ({ summary, index, isOpen }) => {
    const contentRef = useRef(null)
    const [contentHeight, setContentHeight] = useState(0)

    useEffect(() => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight)
      }
    }, [isOpen, summary])

    const timestampSeconds = convertTimestampToSeconds(summary.timestamp)
    const keywordsList = formatKeywords(summary.keywords)

    return (
      <div className="accordion-item border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleAccordion(index)}
          className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
            isOpen
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/30'
          }`}
        >
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold mr-3">
              {index + 1}
            </span>
            <span className="font-bold">{summary.topic}</span>
          </div>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <div
          style={{
            height: isOpen ? contentHeight : 0,
            overflow: 'hidden',
            transition: 'height 0.3s ease',
          }}
        >
          <div ref={contentRef} className="p-4 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleTimestampClick(timestampSeconds)
              }}
              className={`flex items-center mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors ${
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
              <div className="mb-4 text-sm">
                <span className="font-bold">
                  {keywordsList.map((keyword, idx) => (
                    <span key={idx}>
                      {keyword}
                      {idx < keywordsList.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {summary.summary}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- Rendering ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl">
        <p>
          <strong>Error:</strong> {error}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Video Container at Top with Fixed Height */}
      <div className="w-full relative bg-black" style={{ height: '360px' }}>
        <div className="absolute inset-0" ref={setContainerEl}></div>
        {!playerReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-10 h-10 border-4 border-white/50 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Overview Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-t border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
            Overview
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {mainSummary?.mainSummary || 'No summary available'}
          </p>
        </div>
      </div>

      {/* Interview Segments Accordion */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Interview Segments
          </h2>
        </div>
        {subSummaries.map((summary, index) => (
          <AccordionItem
            key={summary.id || index}
            summary={summary}
            index={index}
            isOpen={openAccordion === index}
          />
        ))}
        {subSummaries.length === 0 && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No segments available for this interview
          </div>
        )}
      </div>
    </div>
  )
}
