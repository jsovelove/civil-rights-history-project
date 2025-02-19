// src/contexts/PlaylistContext.jsx
import { createContext, useContext, useState } from 'react'

const PlaylistContext = createContext()

export function PlaylistProvider({ children }) {
  const [currentVideo, setCurrentVideo] = useState(null)
  const [playlist, setPlaylist] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const addToPlaylist = (video) => {
    setPlaylist(prev => [...prev, video])
  }

  const removeFromPlaylist = (videoId) => {
    setPlaylist(prev => prev.filter(v => v.id !== videoId))
  }

  const clearPlaylist = () => {
    setPlaylist([])
    setCurrentVideo(null)
  }

  const playVideo = (video) => {
    setCurrentVideo(video)
    setIsPlaying(true)
  }

  const pauseVideo = () => {
    setIsPlaying(false)
  }

  const nextVideo = () => {
    const currentIndex = playlist.findIndex(v => v.id === currentVideo?.id)
    if (currentIndex < playlist.length - 1) {
      setCurrentVideo(playlist[currentIndex + 1])
    }
  }

  const previousVideo = () => {
    const currentIndex = playlist.findIndex(v => v.id === currentVideo?.id)
    if (currentIndex > 0) {
      setCurrentVideo(playlist[currentIndex - 1])
    }
  }

  const updatePlaylistOrder = (newOrder) => {
    setPlaylist(newOrder)
  }

  const value = {
    currentVideo,
    setCurrentVideo,
    playlist,
    setPlaylist,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    playVideo,
    pauseVideo,
    nextVideo,
    previousVideo,
    updatePlaylistOrder
  }

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  )
}

export function usePlaylist() {
  const context = useContext(PlaylistContext)
  if (!context) {
    throw new Error('usePlaylist must be used within a PlaylistProvider')
  }
  return context
}