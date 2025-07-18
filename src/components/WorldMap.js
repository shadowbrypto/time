import React, { useState } from "react"
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import { teammates, getTeammateLocalTime, formatTime, getOnlineStatus } from "../data/teammates"

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Map teammate locations to coordinates and country names
const locationCoordinates = {
  "Asia/Dubai": { coords: [55.2708, 25.2048], country: "United Arab Emirates" },
  "America/New_York": { coords: [-74.0059, 40.7128], country: "United States of America" },
  "Europe/Zurich": { coords: [8.5417, 47.3769], country: "Switzerland" },
  "Europe/Paris": { coords: [2.3522, 48.8566], country: "France" },
  "Europe/London": { coords: [-0.1276, 51.5074], country: "United Kingdom" },
  "Pacific/Honolulu": { coords: [-157.8583, 21.3099], country: "United States of America" },
  "America/Los_Angeles": { coords: [-118.2437, 34.0522], country: "United States of America" },
  "America/Argentina/Buenos_Aires": { coords: [-58.3816, -34.6037], country: "Argentina" },
  "Europe/Sofia": { coords: [23.3219, 42.6977], country: "Bulgaria" },
  "Europe/Berlin": { coords: [13.4050, 52.5200], country: "Germany" },
  "America/Chicago": { coords: [-87.6298, 41.8781], country: "United States of America" },
  "Europe/Warsaw": { coords: [21.0122, 52.2297], country: "Poland" },
}

function WorldMap() {
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 })
  const [showTeammates, setShowTeammates] = useState(true)
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

  const handleMoveEnd = (position) => {
    setPosition({
      coordinates: position.coordinates,
      zoom: position.zoom
    })
  }

  const handleZoomIn = () => {
    if (position.zoom >= 8) return
    setPosition((prev) => ({ ...prev, zoom: prev.zoom * 1.5 }))
  }

  const handleZoomOut = () => {
    if (position.zoom <= 0.5) return
    setPosition((prev) => ({ ...prev, zoom: prev.zoom / 1.5 }))
  }

  const handleReset = () => {
    setPosition({ coordinates: [0, 0], zoom: 1 })
  }

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-card rounded-lg border border-border p-2 sm:p-4 overflow-hidden relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Zoom Controls */}
        <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-md p-1">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded text-sm font-bold"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded text-sm font-bold"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={handleReset}
            className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded text-xs font-bold"
            title="Reset View"
          >
            ⌂
          </button>
        </div>
        
        {/* Team Toggle */}
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-md p-2">
          <button
            onClick={() => setShowTeammates(!showTeammates)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
              showTeammates 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            }`}
            title={showTeammates ? "Hide Team Members" : "Show Team Members"}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              {showTeammates ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                  <path d="M1 1l22 22"/>
                </svg>
              )}
            </div>
            <span className="whitespace-nowrap">
              {showTeammates ? 'Hide Members' : 'Show Members'}
            </span>
          </button>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="text-xs font-medium text-foreground mb-2">Legend</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm bg-primary/30 border border-primary/50"></div>
            <span className="text-muted-foreground">Countries with team members</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Online</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground">Offline</span>
          </div>
        </div>
      </div>
      
      {/* Country Hover Tooltip */}
      {hoveredCountry && teammatesByCountry[hoveredCountry] && (
        <div className="absolute bottom-4 left-4 z-20 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 max-w-xs shadow-lg">
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
      
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [0, 20],
          scale: 120,
        }}
        width={800}
        height={400}
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <ZoomableGroup 
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          onMoveStart={() => {}} // Ensure all zoom events are captured
          onMove={(position) => {
            // Update position during move for smooth scaling
            setPosition({
              coordinates: position.coordinates,
              zoom: position.zoom
            })
          }}
          maxZoom={8}
          minZoom={0.5}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryName = geo.properties.name
                const hasTeammates = countriesWithTeammates.has(countryName)
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={hasTeammates ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                    stroke="hsl(var(--border))"
                    strokeWidth={hasTeammates ? 0.8 : 0.5}
                    onMouseEnter={() => {
                      if (hasTeammates) {
                        setHoveredCountry(countryName)
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCountry(null)
                    }}
                    style={{
                      default: {
                        fill: hasTeammates ? "hsl(var(--primary))" : "hsl(var(--muted))",
                        fillOpacity: hasTeammates ? 0.3 : 1,
                        outline: "none",
                        cursor: hasTeammates ? "pointer" : "default",
                      },
                      hover: {
                        fill: hasTeammates ? "hsl(var(--primary))" : "hsl(var(--accent))",
                        fillOpacity: hasTeammates ? 0.5 : 1,
                        outline: "none",
                        cursor: hasTeammates ? "pointer" : "default",
                      },
                      pressed: {
                        fill: hasTeammates ? "hsl(var(--primary))" : "hsl(var(--accent))",
                        fillOpacity: hasTeammates ? 0.6 : 1,
                        outline: "none",
                        cursor: hasTeammates ? "pointer" : "default",
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>
          
          {showTeammates && teammates.map((teammate) => {
            const location = locationCoordinates[teammate.timezone]
            if (!location) return null
            
            const localTime = getTeammateLocalTime(teammate)
            const isOnline = getOnlineStatus(teammate) === "online"
            
            // Calculate scaled sizes based on current zoom level
            const baseSize = 15
            const statusSize = 5
            const currentZoom = position.zoom
            const scaledSize = Math.max(baseSize / Math.sqrt(currentZoom), 6) // Minimum size of 6, sqrt for smoother scaling
            const scaledStatusSize = Math.max(statusSize / Math.sqrt(currentZoom), 2) // Minimum size of 2
            const scaledStrokeWidth = Math.max(1.5 / Math.sqrt(currentZoom), 0.3) // Minimum stroke width
            
            return (
              <Marker key={teammate.id} coordinates={location.coords}>
                <g>
                  {/* Avatar container */}
                  <circle
                    r={scaledSize}
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--border))"
                    strokeWidth={scaledStrokeWidth}
                  />
                  
                  {/* Define clip path for circular avatar */}
                  <defs>
                    <clipPath id={`avatar-clip-${teammate.id}`}>
                      <circle r={scaledSize} />
                    </clipPath>
                  </defs>
                  
                  {/* Avatar image */}
                  <image
                    href={teammate.avatar}
                    x={-scaledSize}
                    y={-scaledSize}
                    width={scaledSize * 2}
                    height={scaledSize * 2}
                    clipPath={`url(#avatar-clip-${teammate.id})`}
                    style={{
                      objectFit: "cover",
                    }}
                  />
                  
                  {/* Online/offline status dot */}
                  <circle
                    cx={scaledSize * 0.7}
                    cy={-scaledSize * 0.7}
                    r={scaledStatusSize}
                    fill={isOnline ? "#10B981" : "#EF4444"}
                    stroke="hsl(var(--background))"
                    strokeWidth={scaledStrokeWidth}
                  />
                  
                  {/* Fallback initial if image fails */}
                  <text
                    textAnchor="middle"
                    y={scaledSize * 0.3}
                    style={{
                      fontFamily: "system-ui",
                      fontSize: `${Math.max(scaledSize * 0.8, 8)}px`,
                      fontWeight: "bold",
                      fill: "hsl(var(--foreground))",
                      display: "none",
                    }}
                  >
                    {teammate.name.charAt(0).toUpperCase()}
                  </text>
                  
                  {/* Tooltip on hover */}
                  <title>
                    {teammate.name} ({teammate.role})
                    {"\n"}
                    {teammate.timezoneDisplay}
                    {"\n"}
                    {formatTime(localTime)}
                    {"\n"}
                    Status: {isOnline ? "Online" : "Offline"}
                  </title>
                </g>
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  )
}

export default WorldMap