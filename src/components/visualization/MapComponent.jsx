import { useEffect, useState } from 'react'
import L from 'leaflet'

export default function MapComponent({ markers }) {
  const [mapComponents, setMapComponents] = useState(null);

  // Only import react-leaflet components on client-side
  useEffect(() => {
    const importMapComponents = async () => {
      try {
        // Fix Leaflet default icon issue
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });

        // Import the components dynamically
        const reactLeaflet = await import('react-leaflet');
        setMapComponents(reactLeaflet);
      } catch (error) {
        console.error("Failed to load map components:", error);
      }
    };

    importMapComponents();
  }, []);

  // If components aren't loaded yet, show loading
  if (!mapComponents) {
    return (
      <div style={{ height: '600px' }} className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Destructure the components once they're loaded
  const { MapContainer, TileLayer, Marker, Popup } = mapComponents;
  
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
  )
}