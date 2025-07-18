import React, { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import { teammates, getTeammateLocalTime, formatTime, getOnlineStatus } from "../data/teammates"
import "leaflet/dist/leaflet.css"

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Map teammate locations to coordinates
const locationCoordinates = {
  "Asia/Dubai": { coords: [25.2048, 55.2708], country: "United Arab Emirates" },
  "America/New_York": { coords: [40.7128, -74.0059], country: "United States of America" },
  "Europe/Zurich": { coords: [47.3769, 8.5417], country: "Switzerland" },
  "Europe/Paris": { coords: [48.8566, 2.3522], country: "France" },
  "Europe/London": { coords: [51.5074, -0.1276], country: "United Kingdom" },
  "Pacific/Honolulu": { coords: [21.3099, -157.8583], country: "United States of America" },
  "America/Los_Angeles": { coords: [34.0522, -118.2437], country: "United States of America" },
  "America/Argentina/Buenos_Aires": { coords: [-34.6037, -58.3816], country: "Argentina" },
  "Europe/Sofia": { coords: [42.6977, 23.3219], country: "Bulgaria" },
  "Europe/Berlin": { coords: [52.5200, 13.4050], country: "Germany" },
  "America/Chicago": { coords: [41.8781, -87.6298], country: "United States of America" },
  "Europe/Warsaw": { coords: [52.2297, 21.0122], country: "Poland" },
}

// Create custom avatar icon
const createAvatarIcon = (teammate, isOnline, size = 40) => {
  const iconHtml = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      position: relative;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <img 
        src="${teammate.avatar}" 
        alt="${teammate.name}"
        style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        "
        onerror="this.style.display='none'; this.nextSibling.style.display='flex';"
      />
      <div style="
        width: 100%;
        height: 100%;
        background: hsl(var(--primary));
        color: white;
        display: none;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${size * 0.4}px;
        border-radius: 50%;
      ">
        ${teammate.name.charAt(0).toUpperCase()}
      </div>
      <div style="
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: ${size * 0.3}px;
        height: ${size * 0.3}px;
        background: ${isOnline ? '#10B981' : '#EF4444'};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      "></div>
    </div>
  `
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-avatar-icon',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  })
}

// Component to handle zoom level changes
function ZoomHandler({ onZoomChange }) {
  const map = useMap()
  
  useEffect(() => {
    const handleZoom = () => {
      onZoomChange(map.getZoom())
    }
    
    map.on('zoom', handleZoom)
    handleZoom() // Initial call
    
    return () => {
      map.off('zoom', handleZoom)
    }
  }, [map, onZoomChange])
  
  return null
}

function WorldMap() {
  const [showTeammates, setShowTeammates] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(3)

  // Calculate marker size based on zoom level
  const getMarkerSize = (zoom) => {
    return Math.max(20, Math.min(60, 30 + (zoom - 3) * 5))
  }

  const handleZoomChange = (zoom) => {
    setZoomLevel(zoom)
  }

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-card rounded-lg border border-border overflow-hidden relative">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
        worldCopyJump={true}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles"
        />
        
        <ZoomHandler onZoomChange={handleZoomChange} />
        
        {showTeammates && teammates.map((teammate) => {
          const location = locationCoordinates[teammate.timezone]
          if (!location) return null
          
          const localTime = getTeammateLocalTime(teammate)
          const isOnline = getOnlineStatus(teammate) === "online"
          const markerSize = getMarkerSize(zoomLevel)
          
          return (
            <Marker
              key={teammate.id}
              position={location.coords}
              icon={createAvatarIcon(teammate, isOnline, markerSize)}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{teammate.name}</div>
                  <div className="text-muted-foreground">{teammate.role}</div>
                  <div className="text-muted-foreground">{teammate.timezoneDisplay}</div>
                  <div className="font-mono">{formatTime(localTime)}</div>
                  <div className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
      
      {/* Team Toggle - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <button
          onClick={() => setShowTeammates(!showTeammates)}
          className={`w-10 h-10 rounded-full border shadow-lg transition-all duration-200 flex items-center justify-center ${
            showTeammates 
              ? 'bg-primary text-primary-foreground border-primary/20 shadow-primary/20' 
              : 'bg-background/90 text-muted-foreground border-border hover:bg-accent hover:text-foreground'
          }`}
          title={showTeammates ? "Hide Team Members" : "Show Team Members"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
            {!showTeammates && <path d="M1 1l22 22"/>}
          </svg>
        </button>
      </div>
    </div>
  )
}

export default WorldMap