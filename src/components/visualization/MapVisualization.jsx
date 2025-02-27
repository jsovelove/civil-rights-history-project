import { useState, useEffect, lazy, Suspense } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import 'leaflet/dist/leaflet.css'

// Lazy load the map component to avoid SSR issues
const MapComponent = lazy(() => import('./MapComponent'))

export default function MapVisualization() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [markers, setMarkers] = useState([])

  useEffect(() => {
    fetchAndDisplayBirthplaces()
  }, [])

  const getCoordinates = async (location) => {
    try {
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
      )
      const data = await response.json()
      if (data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error)
    }
    return null
  }

  const extractYouTubeID = (url) => {
    if (!url) return null;
    const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const match = url?.match(regExp)
    return (match && match[1]) ? match[1] : null
  }

  const fetchAndDisplayBirthplaces = async () => {
    try {
      setLoading(true)
      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"))
      const markersData = []

      for (const interviewDoc of interviewsSnapshot.docs) {
        const data = interviewDoc.data()
        const { birthplace, name, videoEmbedLink } = data

        if (birthplace) {
          const coordinates = await getCoordinates(birthplace)
          if (coordinates) {
            const videoID = extractYouTubeID(videoEmbedLink)
            const thumbnailURL = videoID 
              ? `https://img.youtube.com/vi/${videoID}/default.jpg` 
              : ''
            markersData.push({
              position: coordinates,
              name,
              birthplace,
              thumbnailURL,
              documentName: interviewDoc.id,
            })
          }
        }
      }
      
      console.log("Markers data:", markersData)
      setMarkers(markersData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching birthplaces:", error)
      setError("Failed to load map data")
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div style={{ height: '600px' }} className="flex justify-center items-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="map-container">
      {!loading && markers.length > 0 && (
        <Suspense fallback={
          <div style={{ height: '600px' }} className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        }>
          <MapComponent markers={markers} />
        </Suspense>
      )}
      {loading && (
        <div style={{ height: '600px' }} className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
}