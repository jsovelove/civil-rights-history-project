import React, { useEffect, useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { FaMapMarkedAlt } from 'react-icons/fa';

/**
 * MapVisualizationNode - Visualizes locations mentioned in the transcript text
 * 
 * @param {Object} data - Component data including summaries from transcript processing
 * @returns {React.ReactElement} Map visualization of locations
 */
const MapVisualizationNode = ({ data }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);

  // Extract location mentions from transcript summary
  const locationMentions = useMemo(() => {
    if (!data.summaries) return [];
    
    const mentions = [];
    const mentionSet = new Set(); // To track unique mentions
    
    // Check the overall summary for location mentions
    if (data.summaries.overallSummary) {
      extractLocations(data.summaries.overallSummary).forEach(location => {
        if (!mentionSet.has(location)) {
          mentions.push({ location, source: 'Summary' });
          mentionSet.add(location);
        }
      });
    }
    
    // Check each key point for location mentions
    if (data.summaries.keyPoints) {
      data.summaries.keyPoints.forEach(point => {
        // Check in the topic
        if (point.topic) {
          extractLocations(point.topic).forEach(location => {
            if (!mentionSet.has(location)) {
              mentions.push({ location, source: point.topic });
              mentionSet.add(location);
            }
          });
        }
        
        // Check in the summary text
        if (point.summary) {
          extractLocations(point.summary).forEach(location => {
            if (!mentionSet.has(location)) {
              mentions.push({ location, source: point.topic });
              mentionSet.add(location);
            }
          });
        }
      });
    }
    
    return mentions;
  }, [data.summaries]);
  
  // Basic location extraction with regex
  // This is a simplified approach; a real implementation would use NLP tools
  function extractLocations(text) {
    if (!text) return [];
    
    // Regex to match city, state patterns: "City, State"
    const cityStatePattern = /([A-Z][a-zA-Z\s]+),\s*([A-Z][a-zA-Z\s]+)/g;
    const matches = Array.from(text.matchAll(cityStatePattern));
    
    return matches.map(match => `${match[1]}, ${match[2]}`);
  }
  
  // Geocode locations to get coordinates
  useEffect(() => {
    let isMounted = true;
    let timeout;
    
    const geocodeLocations = async () => {
      if (!locationMentions.length) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const geocodedMarkers = [];
        
        // Process each location with a delay to respect rate limits
        for (let i = 0; i < locationMentions.length; i++) {
          if (!isMounted) break;
          
          const { location, source } = locationMentions[i];
          
          // Add delay between requests to avoid rate limiting
          if (i > 0) {
            await new Promise(resolve => {
              timeout = setTimeout(resolve, 1000);
            });
          }
          
          // Use Nominatim Geocoding API (OpenStreetMap)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
          );
          
          if (!response.ok) throw new Error(`Geocoding failed for ${location}`);
          
          const data = await response.json();
          
          if (data.length > 0) {
            const { lat, lon, display_name } = data[0];
            geocodedMarkers.push({
              id: `marker-${i}`,
              position: [parseFloat(lat), parseFloat(lon)],
              name: location,
              displayName: display_name,
              source
            });
          }
        }
        
        if (isMounted) {
          setMarkers(geocodedMarkers);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error geocoding locations:', err);
          setError('Failed to geocode locations');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    geocodeLocations();
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [locationMentions]);
  
  // Load Leaflet components dynamically
  useEffect(() => {
    let isMounted = true;
    
    async function loadLeaflet() {
      try {
        // Only load if we have markers
        if (!markers.length) return;
        
        // Dynamic imports for Leaflet components
        const L = await import('leaflet');
        const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');
        
        // Fix default icon issue in Leaflet
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
        
        if (isMounted) {
          // Save the components for rendering
          setMapInstance({ L, MapContainer, TileLayer, Marker, Popup });
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading map components:', err);
          setError('Failed to load map components');
        }
      }
    }
    
    loadLeaflet();
    
    return () => {
      isMounted = false;
    };
  }, [markers]);
  
  // Calculate map center based on markers
  const mapCenter = useMemo(() => {
    if (!markers.length) return [0, 0];
    
    // Calculate the average position
    const sumLat = markers.reduce((sum, marker) => sum + marker.position[0], 0);
    const sumLng = markers.reduce((sum, marker) => sum + marker.position[1], 0);
    
    return [sumLat / markers.length, sumLng / markers.length];
  }, [markers]);
  
  // Dynamically load Leaflet CSS only when we have markers
  useEffect(() => {
    if (markers.length > 0 && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'leaflet-css';
      link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
      link.integrity = 'sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==';
      link.crossOrigin = '';
      
      document.head.appendChild(link);
    }
  }, [markers]);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full min-w-[500px] h-[500px] overflow-hidden border-2 border-transparent hover:border-green-100">
      <Handle 
        type="target" 
        position={Position.Left} 
        id="viz-input"
        style={{ left: -10, background: '#818cf8', top: '50%', transform: 'translateY(-50%)' }}
      />
      
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <FaMapMarkedAlt className="mr-2 text-green-500" />
        Location Map
      </h3>
      
      <div className="w-full h-[430px] bg-gray-50 rounded-lg overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading map data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4">
              <p className="text-red-500 mb-2">{error}</p>
              <p className="text-gray-500 text-sm">Please try again later</p>
            </div>
          </div>
        ) : markers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4">
              <p className="text-gray-500 mb-2">No locations detected</p>
              <p className="text-gray-400 text-sm">The system couldn't identify any geographical locations in the transcript</p>
            </div>
          </div>
        ) : mapInstance ? (
          <mapInstance.MapContainer 
            center={mapCenter} 
            zoom={5} 
            style={{ height: '100%', width: '100%' }}
          >
            <mapInstance.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map(marker => (
              <mapInstance.Marker 
                key={marker.id} 
                position={marker.position}
              >
                <mapInstance.Popup>
                  <div>
                    <div className="font-bold">{marker.name}</div>
                    <div className="text-xs text-gray-500">{marker.displayName}</div>
                    <div className="text-xs mt-1">
                      <span className="text-gray-600">Mentioned in: </span>
                      <span className="font-medium">{marker.source}</span>
                    </div>
                  </div>
                </mapInstance.Popup>
              </mapInstance.Marker>
            ))}
          </mapInstance.MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Preparing map...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapVisualizationNode; 