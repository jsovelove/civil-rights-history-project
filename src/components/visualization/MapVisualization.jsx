/**
 * @fileoverview MapVisualization component for displaying interviewee birthplaces on a map.
 * 
 * This component fetches interviewee data from Firestore, geocodes birthplace locations
 * using OpenStreetMap's Nominatim API, and displays them as markers on an interactive map.
 * The map is lazy-loaded to improve initial page load performance and avoid SSR issues.
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import 'leaflet/dist/leaflet.css'

// Lazy load the map component to avoid SSR issues
const MapComponent = lazy(() => import('./MapComponent'))

/**
 * MapVisualization - Displays interviewee birthplaces on an interactive map
 * 
 * This component:
 * 1. Fetches interviewee data from Firestore
 * 2. Geocodes birthplace locations to coordinates
 * 3. Extracts thumbnail images from YouTube links
 * 4. Lazy-loads the map component for performance
 * 5. Displays markers for each interviewee's birthplace
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
   * Geocodes a location string to coordinates using OpenStreetMap's Nominatim API
   * Includes rate limiting to avoid API restrictions
   * 
   * @param {string} location - Location string to geocode (e.g., "Atlanta, Georgia")
   * @returns {Array|null} Array of [latitude, longitude] or null if geocoding failed
   */
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
   * Fetches interviewee data from Firestore, geocodes birthplaces, and prepares map markers
   * 
   * This function:
   * 1. Retrieves all interview documents from Firestore
   * 2. Extracts birthplace information for each interviewee
   * 3. Geocodes birthplaces to coordinates
   * 4. Creates marker data with thumbnails and metadata
   * 5. Updates the component state with the marker data
   */
  const fetchAndDisplayBirthplaces = async () => {
    try {
      setLoading(true)
      const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"))
      const markersData = []

      for (const interviewDoc of interviewsSnapshot.docs) {
        const data = interviewDoc.data()
        const { birthplace, name, videoEmbedLink } = data

        if (birthplace) {
          // Geocode the birthplace to coordinates
          const coordinates = await getCoordinates(birthplace)
          if (coordinates) {
            // Extract YouTube ID for thumbnail
            const videoID = extractYouTubeID(videoEmbedLink)
            const thumbnailURL = videoID 
              ? `https://img.youtube.com/vi/${videoID}/default.jpg` 
              : ''
            
            // Add marker data with all necessary information
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

  // Error state
  if (error) {
    return (
      <div style={{ height: '600px' }} className="flex justify-center items-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="map-container">
      {/* Render map when data is ready */}
      {!loading && markers.length > 0 && (
        <Suspense fallback={
          <div style={{ height: '600px' }} className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        }>
          <MapComponent markers={markers} />
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