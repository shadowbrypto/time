import React, { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from "react-leaflet"
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
  const [countriesData, setCountriesData] = useState(null)
  const [hoveredCountry, setHoveredCountry] = useState(null)

  // Get countries that have team members
  const countriesWithTeammates = new Set()
  const teammatesByCountry = {}
  teammates.forEach(teammate => {
    const location = locationCoordinates[teammate.timezone]
    if (location) {
      countriesWithTeammates.add(location.country)
      if (!teammatesByCountry[location.country]) {
        teammatesByCountry[location.country] = []
      }
      teammatesByCountry[location.country].push(teammate)
    }
  })

  // Load country boundaries
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(response => response.json())
      .then(data => {
        setCountriesData(data)
      })
      .catch(error => {
        console.error('Error loading country data:', error)
      })
  }, [])

  // Calculate marker size based on zoom level
  const getMarkerSize = (zoom) => {
    return Math.max(20, Math.min(60, 30 + (zoom - 3) * 5))
  }

  const handleZoomChange = (zoom) => {
    setZoomLevel(zoom)
  }

  // Style function for countries
  const getCountryStyle = (feature) => {
    const countryName = feature.properties.name
    const hasTeammates = countriesWithTeammates.has(countryName)
    
    return {
      fillColor: hasTeammates ? '#3b82f6' : '#e5e7eb',
      weight: hasTeammates ? 2 : 1,
      opacity: 0.8,
      color: hasTeammates ? '#1d4ed8' : '#9ca3af',
      fillOpacity: hasTeammates ? 0.3 : 0.1
    }
  }

  // Handle country events
  const onCountryHover = (e) => {
    const layer = e.target
    const countryName = layer.feature.properties.name
    
    if (countriesWithTeammates.has(countryName)) {
      setHoveredCountry(countryName)
      layer.setStyle({
        weight: 3,
        fillOpacity: 0.5
      })
    }
  }

  const onCountryMouseOut = (e) => {
    const layer = e.target
    setHoveredCountry(null)
    layer.setStyle(getCountryStyle(layer.feature))
  }

  const onEachCountry = (feature, layer) => {
    const countryName = feature.properties.name
    const hasTeammates = countriesWithTeammates.has(countryName)
    
    if (hasTeammates) {
      layer.on({
        mouseover: onCountryHover,
        mouseout: onCountryMouseOut
      })
    }
  }

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-card rounded-lg border border-border overflow-hidden relative">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
        worldCopyJump={false}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        minZoom={2}
        maxZoom={18}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles"
        />
        
        <ZoomHandler onZoomChange={handleZoomChange} />
        
        {/* Country boundaries */}
        {countriesData && (
          <GeoJSON
            data={countriesData}
            style={getCountryStyle}
            onEachFeature={onEachCountry}
          />
        )}
        
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
      
      {/* Country Hover Tooltip */}
      {hoveredCountry && teammatesByCountry[hoveredCountry] && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 max-w-xs shadow-lg">
          <div className="text-sm font-semibold mb-2">{hoveredCountry}</div>
          <div className="space-y-2">
            {teammatesByCountry[hoveredCountry].map((teammate) => {
              const localTime = getTeammateLocalTime(teammate)
              const isOnline = getOnlineStatus(teammate) === "online"
              
              return (
                <div key={teammate.id} className="flex items-center gap-2">
                  <div className="relative">
                    <img 
                      src={teammate.avatar} 
                      alt={teammate.name}
                      className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                    <div 
                      className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
                      style={{display: 'none'}}
                    >
                      {teammate.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${
                      isOnline ? "bg-green-500" : "bg-red-500"
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{teammate.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{teammate.role}</div>
                  </div>
                  <div className="text-xs font-mono text-right">
                    <div>{formatTime(localTime)}</div>
                    <div className="text-muted-foreground">{teammate.timezoneDisplay}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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