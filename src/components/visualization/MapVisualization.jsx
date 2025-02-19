import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import 'leaflet/dist/leaflet.css'

export default function MapVisualization() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [markers, setMarkers] = useState([])
  const [mapReady, setMapReady] = useState(false)

  // Initialize map after component mounts
  useEffect(() => {
    let isMounted = true;
    let map = null;
    let L = null;
    let reactLeaflet = null;

    // Load Leaflet dependencies only on client side
    const initializeMap = async () => {
      try {
        // Dynamic imports
        L = await import('leaflet');
        reactLeaflet = await import('react-leaflet');
        
        if (!isMounted) return;
        
        // Fix icon issue
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
        
        // Set flag that map can be rendered
        setMapReady(true);
      } catch (err) {
        console.error("Failed to initialize map:", err);
        if (isMounted) {
          setError("Failed to load map library");
          setLoading(false);
        }
      }
    };

    if (typeof window !== 'undefined') {
      initializeMap();
    }

    return () => {
      isMounted = false;
      if (map) {
        map.remove();
      }
    };
  }, []);

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
              documentName: interviewDoc.id, // Use doc.id instead of name
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

  // Render the map only when ready
  const renderMap = () => {
    if (!mapReady) return null;
    
    // We need to re-import these components here to avoid SSR issues
    const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet');
    
    return (
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg shadow-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {markers.map((marker, index) => (
          <Marker key={index} position={marker.position}>
            <Popup>
              <div className="text-center">
                <h3 className="font-bold mb-2">{marker.name}</h3>
                <p className="text-gray-600 mb-2">{marker.birthplace}</p>
                {marker.thumbnailURL && (
                  <img 
                    src={marker.thumbnailURL} 
                    alt="Video thumbnail" 
                    className="w-30 h-auto mb-2 mx-auto"
                  />
                )}
                <a
                  href={`/accordion?documentName=${encodeURIComponent(marker.documentName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                >
                  View Interview Summary
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    );
  };

  if (loading) {
    return (
      <div style={{ height: '600px' }} className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
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
      {renderMap()}
    </div>
  );
}