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
            
            // Calculate scaled sizes based on zoom level
            const baseSize = 12
            const statusSize = 4
            const scaledSize = Math.max(baseSize / position.zoom, 8) // Minimum size of 8
            const scaledStatusSize = Math.max(statusSize / position.zoom, 2) // Minimum size of 2
            const scaledStrokeWidth = Math.max(1 / position.zoom, 0.5) // Minimum stroke width
            
            return (
              <Marker key={teammate.id} coordinates={coordinates}>
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