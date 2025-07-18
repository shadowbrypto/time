import React from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { teammates, getTeammateLocalTime, formatTime, getOnlineStatus } from "../data/teammates"

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json"

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
  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-card rounded-lg border border-border p-2 sm:p-4 overflow-hidden">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: [0, 20],
          scale: 120,
        }}
        width={800}
        height={400}
        className="w-full h-full"
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
                  r={12}
                  fill={isOnline ? "#10B981" : "hsl(var(--destructive))"}
                  fillOpacity={0.3}
                  stroke={isOnline ? "#10B981" : "hsl(var(--destructive))"}
                  strokeWidth={2}
                />
                
                {/* Inner circle for avatar */}
                <circle
                  r={8}
                  fill="hsl(var(--background))"
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
                
                {/* Name initial */}
                <text
                  textAnchor="middle"
                  y={3}
                  style={{
                    fontFamily: "system-ui",
                    fontSize: "8px",
                    fontWeight: "bold",
                    fill: "hsl(var(--foreground))",
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
      </ComposableMap>
    </div>
  )
}

export default WorldMap