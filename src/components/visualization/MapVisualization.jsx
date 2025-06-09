/**
 * @fileoverview MapVisualization component for displaying interviewee birthplaces on a map.
 * 
 * This component fetches interviewee data (including pre-geocoded coordinates) from Firestore
 * and displays them as markers on an interactive globe.
 * The globe component is lazy-loaded to improve initial page load performance.
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
// import 'leaflet/dist/leaflet.css' // No longer needed for GlobeComponent

// Lazy load the map component to avoid SSR issues
// const MapComponent = lazy(() => import('./MapComponent'))
// const GlobeComponent = lazy(() => import('./GlobeComponent')) // Old R3F globe
const ReactGlobeGLComponent = lazy(() => import('./ReactGlobeGLComponent')) // New react-globe.gl component

/**
 * MapVisualization - Displays interviewee birthplaces on an interactive map
 * 
 * This component:
 * 1. Fetches interviewee data (with coordinates) from Firestore
 * 2. Extracts thumbnail images from YouTube links
 * 3. Lazy-loads the globe component for performance
 * 4. Displays markers for each interviewee's birthplace
 * 
 * @returns {React.ReactElement} The map visualization interface
 */
export default function MapVisualization() {
  // Component state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [markers, setMarkers] = useState([])

  /**
   * Fetch birthplace data when component mounts
   */
  useEffect(() => {
    fetchAndDisplayBirthplaces()
  }, [])

  /**
   * Extracts YouTube video ID from various YouTube URL formats
   * 
   * @param {string} url - YouTube URL to extract ID from
   * @returns {string|null} YouTube video ID or null if extraction failed
   */
  const extractYouTubeID = (url) => {
    if (!url) return null;
    const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    const match = url?.match(regExp)
    return (match && match[1]) ? match[1] : null
  }

  /**
   * Fetches interviewee data from Firestore and prepares map markers.
   * Assumes coordinates (latitude, longitude) are already present in the Firestore documents.
   * 
   * This function:
   * 1. Retrieves all interview documents from Firestore
   * 2. Extracts birthplace, name, videoEmbedLink, latitude, and longitude for each interviewee
   * 3. Creates marker data with thumbnails and metadata if coordinates exist
   * 4. Updates the component state with the marker data
   */
  const fetchAndDisplayBirthplaces = async () => {
    try {
      setLoading(true)
      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"))
      const markersData = []

      for (const interviewDoc of interviewsSnapshot.docs) {
        const data = interviewDoc.data()
        // Destructure latitude and longitude along with other fields
        const { birthplace, name, videoEmbedLink, latitude, longitude } = data

        // Check if latitude and longitude are present and valid numbers
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          const videoID = extractYouTubeID(videoEmbedLink)
          const thumbnailURL = videoID 
            ? `https://img.youtube.com/vi/${videoID}/default.jpg` 
            : ''
          
          markersData.push({
            position: [latitude, longitude], // Use pre-geocoded coordinates
            name,
            birthplace, // Still useful to display
            thumbnailURL,
            documentName: interviewDoc.id,
          })
        } else if (birthplace) {
          // Optional: Log if a birthplace exists but has no valid coordinates
          console.warn(`Document ${interviewDoc.id} has birthplace "${birthplace}" but missing or invalid coordinates.`);
        }
      }
      
      console.log("Markers data (using pre-geocoded coordinates):", markersData)
      setMarkers(markersData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching birthplaces:", error)
      setError("Failed to load map data")
      setLoading(false)
    }
  }

  // Error state
  if (error) {
    return (
      <div style={{ height: '600px' }} className="flex justify-center items-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="map-container w-full flex justify-center items-center" style={{ height: '600px', backgroundColor: '#f0f8ff' }}>
      {/* Render map when data is ready */}
      {!loading && markers.length > 0 && (
        <Suspense fallback={
          <div style={{ height: '600px' }} className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        }>
          {/* <MapComponent markers={markers} /> */}
          <ReactGlobeGLComponent markers={markers} />
        </Suspense>
      )}
      {/* Loading state */}
      {loading && (
        <div style={{ height: '600px' }} className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
}