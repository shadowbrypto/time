import React, { useState } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { teammates, getTeammateLocalTime, formatTime, getOnlineStatus } from "../data/teammates"

// Map teammate locations to coordinates
const locationCoordinates = {
  "Asia/Dubai": [55.2708, 25.2048],
  "America/New_York": [-74.0059, 40.7128],
  "Europe/Zurich": [8.5417, 47.3769],
  "Europe/Paris": [2.3522, 48.8566],
  "Europe/London": [-0.1276, 51.5074],
  "Pacific/Honolulu": [-157.8583, 21.3099],
  "America/Los_Angeles": [-118.2437, 34.0522],
  "America/Argentina/Buenos_Aires": [-58.3816, -34.6037],
  "Europe/Sofia": [23.3219, 42.6977],
  "Europe/Berlin": [13.4050, 52.5200],
  "America/Chicago": [-87.6298, 41.8781],
  "Europe/Warsaw": [21.0122, 52.2297],
}

function WorldMap() {
  const [showTeammates, setShowTeammates] = useState(true)
  const [selectedTeammate, setSelectedTeammate] = useState(null)

  // Map specific countries based on teammate timezones
  const getCountriesWithTeammates = () => {
    const countries = new Set()
    teammates.forEach(teammate => {
      const coords = locationCoordinates[teammate.timezone]
      if (coords) {
        // Map specific timezones to actual country names
        switch(teammate.timezone) {
          case "Asia/Dubai":
            countries.add("United Arab Emirates")
            countries.add("UAE")
            break
          case "America/New_York":
          case "Pacific/Honolulu":
          case "America/Los_Angeles":
          case "America/Chicago":
            countries.add("United States of America")
            countries.add("United States")
            countries.add("USA")
            break
          case "Europe/Zurich":
            countries.add("Switzerland")
            break
          case "Europe/Paris":
            countries.add("France")
            break
          case "Europe/London":
            countries.add("United Kingdom")
            countries.add("UK")
            break
          case "America/Argentina/Buenos_Aires":
            countries.add("Argentina")
            break
          case "Europe/Sofia":
            countries.add("Bulgaria")
            break
          case "Europe/Berlin":
            countries.add("Germany")
            break
          case "Europe/Warsaw":
            countries.add("Poland")
            break
          default:
            break
        }
      }
    })
    return countries
  }

  const countriesWithTeammates = getCountriesWithTeammates()

  return (
    <div className="w-full h-64 sm:h-80 lg:h-96 bg-card rounded-lg border border-border overflow-hidden relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 140,
          center: [0, 20]
        }}
        width={800}
        height={400}
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #60a5fa 100%)"
        }}
      >
        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
          {({ geographies }) =>
            geographies.map((geo) => {
              // Check multiple possible property names for country identification
              const countryName = geo.properties.NAME || geo.properties.NAME_EN || geo.properties.NAME_LONG || geo.properties.ADMIN
              const isHighlighted = countryName && countriesWithTeammates.has(countryName)
              
              // Debug logging (remove in production)
              if (countryName && (countryName.includes('United') || countryName.includes('France') || countryName.includes('Germany'))) {
                console.log(`Country: ${countryName}, Highlighted: ${isHighlighted}`)
              }
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isHighlighted ? "rgba(34, 197, 94, 0.8)" : "rgba(255, 255, 255, 0.1)"}
                  stroke={isHighlighted ? "#22c55e" : "rgba(255, 255, 255, 0.3)"}
                  strokeWidth={isHighlighted ? 2 : 0.5}
                  style={{
                    default: {
                      outline: "none",
                      transition: "all 0.3s ease"
                    },
                    hover: {
                      fill: isHighlighted ? "rgba(34, 197, 94, 0.9)" : "rgba(255, 255, 255, 0.2)",
                      outline: "none",
                      cursor: "pointer"
                    },
                    pressed: {
                      fill: isHighlighted ? "rgba(34, 197, 94, 1.0)" : "rgba(255, 255, 255, 0.3)",
                      outline: "none"
                    }
                  }}
                />
              )
            })
          }
        </Geographies>
        
        {/* Team member markers */}
        {showTeammates && teammates.map((teammate) => {
          const coords = locationCoordinates[teammate.timezone]
          if (!coords) return null
          
          const isOnline = getOnlineStatus(teammate) === "online"
          
          // Debug logging
          console.log(`Rendering avatar for ${teammate.name}: ${teammate.avatar}`)
          
          return (
            <Marker
              key={teammate.id}
              coordinates={coords}
              onClick={() => setSelectedTeammate(teammate)}
            >
              <g className="cursor-pointer">
                <defs>
                  <clipPath id={`clip-${teammate.id}`}>
                    <circle r="14" cx="0" cy="0" />
                  </clipPath>
                </defs>
                
                {/* Avatar background circle */}
                <circle
                  r={16}
                  fill="white"
                  stroke={isOnline ? "#22c55e" : "#ef4444"}
                  strokeWidth={3}
                  style={{
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                  }}
                />
                
                {/* Avatar image using foreignObject for better control */}
                <foreignObject x={-14} y={-14} width={28} height={28} clipPath={`url(#clip-${teammate.id})`}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6'
                  }}>
                    <img
                      src={teammate.avatar}
                      alt={teammate.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onLoad={() => {
                        console.log(`✅ Avatar loaded for ${teammate.name}: ${teammate.avatar}`)
                      }}
                      onError={(e) => {
                        console.log(`❌ Avatar failed to load for ${teammate.name}: ${teammate.avatar}`)
                        // Replace with initials
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                    <div style={{
                      display: 'none',
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#6366f1',
                      color: 'white',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      fontFamily: 'system-ui'
                    }}>
                      {teammate.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </foreignObject>
                
                {/* Status indicator dot */}
                <circle
                  cx={12}
                  cy={-12}
                  r={4}
                  fill={isOnline ? "#22c55e" : "#ef4444"}
                  stroke="white"
                  strokeWidth={2}
                  style={{
                    animation: isOnline ? "pulse 2s infinite" : "none",
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
                  }}
                />
              </g>
            </Marker>
          )
        })}
      </ComposableMap>
      
      {/* Selected teammate popup */}
      {selectedTeammate && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-background border border-border rounded-lg p-4 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img
                  src={selectedTeammate.avatar}
                  alt={selectedTeammate.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div 
                  className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center font-bold"
                  style={{display: 'none'}}
                >
                  {selectedTeammate.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{selectedTeammate.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedTeammate.role}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{selectedTeammate.timezoneDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-mono font-medium">{formatTime(getTeammateLocalTime(selectedTeammate))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${getOnlineStatus(selectedTeammate) === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                  {getOnlineStatus(selectedTeammate) === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedTeammate(null)}
              className="mt-4 w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Team Toggle - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={() => setShowTeammates(!showTeammates)}
          className={`w-10 h-10 rounded-full border shadow-lg transition-all duration-200 flex items-center justify-center backdrop-blur-sm ${
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
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

export default WorldMap