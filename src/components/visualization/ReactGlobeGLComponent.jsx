import React, { useState, useEffect, useMemo, useRef } from 'react';
import Globe from 'react-globe.gl';

export default function ReactGlobeGLComponent({ markers }) {
  const [clientReady, setClientReady] = useState(false);
  const globeRef = useRef();
  // Add window dimensions tracking
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Ensure component only renders on the client-side where window is available
  useEffect(() => {
    setClientReady(true);
    
    // Get initial dimensions
    const updateDimensions = () => {
      // Use clientWidth of parent container or fallback to a reasonable size
      const container = document.querySelector('.map-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      } else {
        // Fallback dimensions if container not found
        setDimensions({
          width: Math.min(window.innerWidth * 0.8, 1200),
          height: 600
        });
      }
    };
    
    updateDimensions();
    
    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Set initial camera position after mount
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 40, lng: -95, altitude: 2.5 });
    }
  }, [clientReady]);

  const pointsData = useMemo(() => {
    if (!markers) return [];
    return markers.map(marker => ({
      lat: marker.position[0],
      lng: marker.position[1],
      size: 0.05, // Adjust size as needed
      color: 'orange', // Default color, can be customized
      name: marker.name,
      birthplace: marker.birthplace,
      thumbnailURL: marker.thumbnailURL, // For potential custom click handlers
      documentName: marker.documentName, // For potential custom click handlers
    }));
  }, [markers]);

  if (!clientReady) {
    // Fallback rendering or loading indicator while waiting for client
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Globe
        ref={globeRef}
        width={dimensions.width * 0.95} // 95% of container width
        height={dimensions.height * 0.95} // 95% of container height
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg" // Simpler, darker texture
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="#ffffff" // White background
        
        pointsData={pointsData}
        pointAltitude={0} // Draw points directly on the surface
        pointColor={() => '#FF5733'} // Brighter orange-red for better visibility
        pointRadius={0.3} // Slightly larger for better visibility
        
        // Tooltip label on hover
        pointLabel={point => `
          <div><b>${point.name}</b></div>
          <div>Birthplace: ${point.birthplace}</div>
          ${point.thumbnailURL ? `<img src="${point.thumbnailURL}" alt="${point.name}" style="width: 80px; height: auto; margin-top: 5px;" />` : ''}
        `}
        
        // Globe visual properties
        atmosphereColor="rgba(135, 206, 235, 0.7)" // Lighter blue atmosphere
        atmosphereAltitude={0.15} // Slightly thinner atmosphere
        
        // Interaction
        enableGlobeRotation={true}
        enableZoom={true}
      />
    </div>
  );
} 