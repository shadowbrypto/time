import React, { useState } from "react"
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import { teammates, getTeammateLocalTime, formatTime, getOnlineStatus } from "../data/teammates"

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// Map teammate locations to coordinates
const locationCoordinates = {
  "Asia/Dubai": [55.2708, 25.2048], // Dubai, UAE
  "America/New_York": [-74.0059, 40.7128], // New York, USA
  "Europe/Zurich": [8.5417, 47.3769], // Zurich, Switzerland
  "Europe/Paris": [2.3522, 48.8566], // Paris, France
  "Europe/London": [-0.1276, 51.5074], // London, UK
  "Pacific/Honolulu": [-157.8583, 21.3099], // Honolulu, Hawaii
  "America/Los_Angeles": [-118.2437, 34.0522], // Los Angeles, USA
  "America/Argentina/Buenos_Aires": [-58.3816, -34.6037], // Buenos Aires, Argentina
  "Europe/Sofia": [23.3219, 42.6977], // Sofia, Bulgaria
  "Europe/Berlin": [13.4050, 52.5200], // Berlin, Germany (Munich is in same timezone)
  "America/Chicago": [-87.6298, 41.8781], // Chicago, USA
  "Europe/Warsaw": [21.0122, 52.2297], // Warsaw, Poland
}

function WorldMap() {
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 })

  const handleMoveEnd = (position) => {
    setPosition(position)
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
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-md p-1">
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
          maxZoom={8}
          minZoom={0.5}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="hsl(var(--muted))"
                  stroke="hsl(var(--border))"
                  strokeWidth={0.5}
                  style={{
                    default: {
                      fill: "hsl(var(--muted))",
                      outline: "none",
                    },
                    hover: {
                      fill: "hsl(var(--accent))",
                      outline: "none",
                    },
                    pressed: {
                      fill: "hsl(var(--accent))",
                      outline: "none",
                    },
                  }}
                />
              ))
            }
          </Geographies>
          
          {teammates.map((teammate) => {
            const coordinates = locationCoordinates[teammate.timezone]
            if (!coordinates) return null
            
            const localTime = getTeammateLocalTime(teammate)
            const isOnline = getOnlineStatus(teammate) === "online"
            
            return (
              <Marker key={teammate.id} coordinates={coordinates}>
                <g>
                  {/* Outer ring for online/offline status */}
                  <circle
                    r={18}
                    fill={isOnline ? "#10B981" : "hsl(var(--destructive))"}
                    fillOpacity={0.2}
                    stroke={isOnline ? "#10B981" : "hsl(var(--destructive))"}
                    strokeWidth={2}
                  />
                  
                  {/* Avatar container */}
                  <circle
                    r={12}
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                    clipPath="url(#avatar-clip)"
                  />
                  
                  {/* Define clip path for circular avatar */}
                  <defs>
                    <clipPath id={`avatar-clip-${teammate.id}`}>
                      <circle r={12} />
                    </clipPath>
                  </defs>
                  
                  {/* Avatar image */}
                  <image
                    href={teammate.avatar}
                    x={-12}
                    y={-12}
                    width={24}
                    height={24}
                    clipPath={`url(#avatar-clip-${teammate.id})`}
                    style={{
                      objectFit: "cover",
                    }}
                  />
                  
                  {/* Fallback initial if image fails */}
                  <text
                    textAnchor="middle"
                    y={3}
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "10px",
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