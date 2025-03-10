import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { Clock, Tag } from 'lucide-react'

export default function ClipPlayer() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const documentName = searchParams.get('documentName')
  const clipId = searchParams.get('clipId')

  const [mainSummary, setMainSummary] = useState(null)
  const [clipData, setClipData] = useState(null)
  const [error, setError] = useState(null)
  const [playerReady, setPlayerReady] = useState(false)
  const playerRef = useRef(null)

  const extractVideoId = (link) => {
    const match = link?.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match?.[1] || null
  }

  const convertTimestampToSeconds = (timestamp) => {
    if (!timestamp) return 0
    const timeStr = timestamp.split(' - ')[0].replace(/[\[\]]/g, '').trim()
    const parts = timeStr.split(':').map(Number)
    return parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1]
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const mainDoc = await getDoc(doc(db, 'interviewSummaries', documentName))
        const clipDoc = await getDoc(doc(db, 'interviewSummaries', documentName, 'subSummaries', clipId))

        if (!mainDoc.exists() || !clipDoc.exists()) {
          setError('Clip or interview not found')
          return
        }

        setMainSummary(mainDoc.data())
        setClipData(clipDoc.data())
      } catch (e) {
        console.error(e)
        setError('Failed to load data')
      }
    }

    loadData()
  }, [documentName, clipId])

  // Load YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => initPlayer()
  }, [])

  const initPlayer = () => {
    if (!mainSummary?.videoEmbedLink || !playerRef.current) return
    const videoId = extractVideoId(mainSummary.videoEmbedLink)
    const startTime = convertTimestampToSeconds(clipData?.timestamp)

    new window.YT.Player(playerRef.current, {
      videoId,
      width: '100%',
      height: '360',
      playerVars: {
        autoplay: 1,
        start: startTime,
        controls: 1,
        modestbranding: 1,
      },
      events: {
        onReady: () => setPlayerReady(true),
      }
    })
  }

  useEffect(() => {
    if (mainSummary && clipData && window.YT?.Player) initPlayer()
  }, [mainSummary, clipData])

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!mainSummary || !clipData) return <div className="p-6">Loading...</div>

  const keywords = Array.isArray(clipData.keywords)
    ? clipData.keywords
    : clipData.keywords?.split(',') || []

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Interviewee Name as Link */}
      <div>
        <h1
          className="text-3xl font-bold text-blue-700 hover:underline cursor-pointer"
          onClick={() => navigate(`/interview-player?documentName=${encodeURIComponent(documentName)}`)}
        >
          {mainSummary.name}
        </h1>
      </div>

      {/* Clip Info */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-blue-800">
          {clipData.topic}
        </h2>
        <div className="flex items-center text-sm text-gray-500">
          <Clock size={16} className="mr-2" />
          <span>{clipData.timestamp}</span>
        </div>

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {keywords.map((k, idx) => (
              <span
                key={idx}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1 cursor-pointer hover:bg-blue-200"
                onClick={() => navigate(`/playlist-builder?keywords=${encodeURIComponent(k)}`)}
              >
                <Tag size={12} /> {k}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* YouTube Player */}
      <div className="rounded-lg overflow-hidden bg-black mt-6">
        <div ref={playerRef} />
      </div>

      {/* Clip Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
        <p className="text-gray-800 leading-relaxed">{clipData.summary}</p>
      </div>

      {/* Interviewee Role */}
      {mainSummary.role && (
        <div className="text-gray-600 text-lg mt-6 italic">
          {mainSummary.role}
        </div>
      )}
    </div>
  )
}
