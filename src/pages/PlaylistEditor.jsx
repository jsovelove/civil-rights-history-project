// src/pages/PlaylistEditor.jsx
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

export default function PlaylistEditor() {
  const [searchParams] = useSearchParams()
  const [videoQueue, setVideoQueue] = useState([])
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')
  const playerRef = useRef(null)
  const playbackMonitorRef = useRef(null)

  useEffect(() => {
    const keyword = searchParams.get('keywords')
    if (keyword) {
      searchAndBuildPlaylist(keyword)
    }
  }, [searchParams])

  // Utility functions from PlaylistBuilder (same as before)
  const extractVideoId = (videoEmbedLink) => {
    const match = videoEmbedLink?.match(/embed\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  // ... (other utility functions remain the same as PlaylistBuilder)

  // New functions for editing capabilities
  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(videoQueue)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update playlist order
    const updatedItems = items.map((item, index) => ({
      ...item,
      playlistOrder: index
    }))

    setVideoQueue(updatedItems)
    savePlaylistOrder(updatedItems)
  }

  const savePlaylistOrder = async (items) => {
    try {
      // Save the new order to Firebase
      const keyword = searchParams.get('keywords')
      const keywordDocRef = doc(db, "keywordPlaylists", keyword)
      await updateDoc(keywordDocRef, {
        items: items.map(item => ({
          documentName: item.documentName,
          playlistOrder: item.playlistOrder
        }))
      })
    } catch (error) {
      console.error("Error saving playlist order:", error)
    }
  }

  const handleEditDescription = () => {
    setIsEditingDescription(true)
    setEditedDescription(document.getElementById('overallSummaryContent').innerText)
  }

  const handleSaveDescription = async () => {
    try {
      const keyword = searchParams.get('keywords')
      const keywordDocRef = doc(db, "keywordSummaries", keyword)
      await updateDoc(keywordDocRef, {
        summary: editedDescription
      })
      document.getElementById('overallSummaryContent').innerText = editedDescription
      setIsEditingDescription(false)
    } catch (error) {
      console.error("Error saving description:", error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Overall Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Playlist Info</h2>
              <p id="totalDuration">
                Total Duration: {formatTime(getTotalPlaylistDuration(videoQueue))}
              </p>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold">Playlist Summary</h3>
                <button
                  onClick={handleEditDescription}
                  className="text-blue-500 hover:text-blue-700"
                >
                  ✏️ Edit
                </button>
              </div>

              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full h-40 p-2 border rounded"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDescription}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p id="overallSummaryContent" className="text-gray-700" />
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Video Player and Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {currentVideo && (
              <>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold">{currentVideo.name}</h2>
                  <p className="text-gray-600">{currentVideo.role}</p>
                </div>

                <div id="player" className="w-full aspect-video mb-4" />

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="timeline" direction="horizontal">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="relative h-20 bg-gray-100 rounded mb-4"
                      >
                        <div className="absolute inset-0 flex">
                          {videoQueue.map((video, index) => (
                            <Draggable
                              key={`${video.documentName}-${index}`}
                              draggableId={`${video.documentName}-${index}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`relative h-full cursor-move transition-colors
                                    ${index === currentVideoIndex ? 'bg-blue-500' : 'bg-gray-300'}
                                    ${snapshot.isDragging ? 'ring-2 ring-blue-400' : ''}`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    width: `${(getDuration(video) / getTotalDuration(videoQueue)) * 100}%`
                                  }}
                                >
                                  <img
                                    src={`https://img.youtube.com/vi/${extractVideoId(video.videoEmbedLink)}/default.jpg`}
                                    alt="Thumbnail"
                                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                {/* Playback Controls */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleSkipPrevious}
                    disabled={currentVideoIndex === 0}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                    <span className="material-icons">skip_previous</span>
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <span id="playPauseIcon" className="material-icons">pause</span>
                  </button>
                  <button
                    onClick={handleSkipNext}
                    disabled={currentVideoIndex === videoQueue.length - 1}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                    <span className="material-icons">skip_next</span>
                  </button>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-semibold mb-2">Summary</h3>
                  <p className="text-gray-700">{currentVideo.summary}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility function to get clip duration
function getDuration(video) {
  const start = convertTimestampToSeconds(extractStartTimestamp(video.timestamp))
  const end = convertTimestampToSeconds(extractStartTimestamp(video.timestamp.split(" - ")[1]))
  return end - start
}

// Utility function to get total duration
function getTotalDuration(queue) {
  return queue.reduce((sum, video) => sum + getDuration(video), 0)
}