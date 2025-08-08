import React, { useState } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { teammates, getTeammateLocalTime, formatTime, getOnlineStatus, getRoleColor } from "../data/teammates"

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
  "Asia/Seoul": [126.9780, 37.5665],
}

function WorldMap() {
  const [showTeammates, setShowTeammates] = useState(true)
  const [hoveredCountry, setHoveredCountry] = useState(null)
  const [hoveredTeammate, setHoveredTeammate] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Map specific countries based on teammate timezones
  const getCountriesWithTeammates = () => {
    const countries = new Set()
    teammates.forEach(teammate => {
      const coords = locationCoordinates[teammate.timezone]
      if (coords) {
        // Map specific timezones to actual country names with multiple variations
        switch(teammate.timezone) {
          case "Asia/Dubai":
            countries.add("United Arab Emirates")
            countries.add("UAE")
            countries.add("U.A.E.")
            countries.add("ARE")
            break
          case "America/New_York":
          case "Pacific/Honolulu":
          case "America/Los_Angeles":
          case "America/Chicago":
            countries.add("United States of America")
            countries.add("United States")
            countries.add("USA")
            countries.add("U.S.A.")
            countries.add("US")
            countries.add("America")
            break
          case "Europe/Zurich":
            countries.add("Switzerland")
            countries.add("Swiss Confederation")
            countries.add("CHE")
            break
          case "Europe/Paris":
            countries.add("France")
            countries.add("French Republic")
            countries.add("FRA")
            break
          case "Europe/London":
            countries.add("United Kingdom")
            countries.add("UK")
            countries.add("U.K.")
            countries.add("Great Britain")
            countries.add("Britain")
            countries.add("GBR")
            break
          case "America/Argentina/Buenos_Aires":
            countries.add("Argentina")
            countries.add("Argentine Republic")
            countries.add("ARG")
            break
          case "Europe/Sofia":
            countries.add("Bulgaria")
            countries.add("Republic of Bulgaria")
            countries.add("BGR")
            break
          case "Europe/Berlin":
            countries.add("Germany")
            countries.add("Federal Republic of Germany")
            countries.add("Deutschland")
            countries.add("DEU")
            break
          case "Europe/Warsaw":
            countries.add("Poland")
            countries.add("Republic of Poland")
            countries.add("POL")
            break
          case "Asia/Seoul":
            countries.add("South Korea")
            countries.add("Republic of Korea")
            countries.add("Korea, Republic of")
            countries.add("KOR")
            break
          default:
            break
        }
      }
    })
    return countries
  }

  const countriesWithTeammates = getCountriesWithTeammates()

  // Get country flag emoji
  const getCountryFlag = (countryName) => {
    const flagMap = {
      'United States of America': '🇺🇸',
      'United States': '🇺🇸',
      'USA': '🇺🇸',
      'U.S.A.': '🇺🇸',
      'US': '🇺🇸',
      'America': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'UK': '🇬🇧',
      'U.K.': '🇬🇧',
      'Great Britain': '🇬🇧',
      'Britain': '🇬🇧',
      'GBR': '🇬🇧',
      'France': '🇫🇷',
      'French Republic': '🇫🇷',
      'FRA': '🇫🇷',
      'Germany': '🇩🇪',
      'Federal Republic of Germany': '🇩🇪',
      'Deutschland': '🇩🇪',
      'DEU': '🇩🇪',
      'Switzerland': '🇨🇭',
      'Swiss Confederation': '🇨🇭',
      'CHE': '🇨🇭',
      'Poland': '🇵🇱',
      'Republic of Poland': '🇵🇱',
      'POL': '🇵🇱',
      'Bulgaria': '🇧🇬',
      'Republic of Bulgaria': '🇧🇬',
      'BGR': '🇧🇬',
      'Argentina': '🇦🇷',
      'Argentine Republic': '🇦🇷',
      'ARG': '🇦🇷',
      'United Arab Emirates': '🇦🇪',
      'UAE': '🇦🇪',
      'U.A.E.': '🇦🇪',
      'ARE': '🇦🇪',
      'South Korea': '🇰🇷',
      'Republic of Korea': '🇰🇷',
      'Korea, Republic of': '🇰🇷',
      'KOR': '🇰🇷'
    }
    return flagMap[countryName] || '🏳️'
  }

  // Get teammates for a specific country
  const getTeammatesByCountry = (countryName) => {
    if (!countryName) return []
    
    return teammates.filter(teammate => {
      switch(teammate.timezone) {
        case "Asia/Dubai":
          return ["United Arab Emirates", "UAE", "U.A.E.", "ARE"].includes(countryName)
        case "America/New_York":
        case "Pacific/Honolulu":
        case "America/Los_Angeles":
        case "America/Chicago":
          return ["United States of America", "United States", "USA", "U.S.A.", "US", "America"].includes(countryName)
        case "Europe/Zurich":
          return ["Switzerland", "Swiss Confederation", "CHE"].includes(countryName)
        case "Europe/Paris":
          return ["France", "French Republic", "FRA"].includes(countryName)
        case "Europe/London":
          return ["United Kingdom", "UK", "U.K.", "Great Britain", "Britain", "GBR"].includes(countryName)
        case "America/Argentina/Buenos_Aires":
          return ["Argentina", "Argentine Republic", "ARG"].includes(countryName)
        case "Europe/Sofia":
          return ["Bulgaria", "Republic of Bulgaria", "BGR"].includes(countryName)
        case "Europe/Berlin":
          return ["Germany", "Federal Republic of Germany", "Deutschland", "DEU"].includes(countryName)
        case "Europe/Warsaw":
          return ["Poland", "Republic of Poland", "POL"].includes(countryName)
        case "Asia/Seoul":
          return ["South Korea", "Republic of Korea", "Korea, Republic of", "KOR"].includes(countryName)
        default:
          return false
      }
    })
  }

  // Group teammates by coordinates for map display
  const getTeammatesByCoordinates = () => {
    const groupedByCoords = {}
    teammates.forEach(teammate => {
      const coords = locationCoordinates[teammate.timezone]
      if (coords) {
        const coordKey = `${coords[0]},${coords[1]}`
        if (!groupedByCoords[coordKey]) {
          groupedByCoords[coordKey] = {
            coordinates: coords,
            teammates: []
          }
        }
        groupedByCoords[coordKey].teammates.push(teammate)
      }
    })
    return groupedByCoords
  }

  // Handle mouse move for tooltip positioning
  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setMousePosition({ 
      x: event.clientX - rect.left, 
      y: event.clientY - rect.top 
    })
  }

  return (
    <div 
      className="w-full h-64 sm:h-80 lg:h-96 bg-card rounded-lg border border-border overflow-hidden relative"
      onMouseMove={handleMouseMove}
    >
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
              const props = geo.properties
              const countryNames = [
                props.NAME,
                props.NAME_EN,
                props.NAME_LONG,
                props.ADMIN,
                props.name,
                props.NAME_ENGL,
                props.ISO_A3,
                props.ISO_A2
              ].filter(Boolean)
              
              // Check if any of the country names match our team locations
              const isHighlighted = countryNames.some(name => countriesWithTeammates.has(name))
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isHighlighted ? "rgba(34, 197, 94, 0.8)" : "rgba(255, 255, 255, 0.1)"}
                  stroke={isHighlighted ? "#22c55e" : "rgba(255, 255, 255, 0.3)"}
                  strokeWidth={isHighlighted ? 2 : 0.5}
                  onMouseEnter={() => {
                    if (isHighlighted) {
                      const countryName = countryNames.find(name => countriesWithTeammates.has(name))
                      setHoveredCountry(countryName)
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredCountry(null)
                  }}
                  style={{
                    default: {
                      outline: "none",
                      transition: "all 0.3s ease"
                    },
                    hover: {
                      fill: isHighlighted ? "rgba(34, 197, 94, 0.9)" : "rgba(255, 255, 255, 0.2)",
                      outline: "none",
                      cursor: isHighlighted ? "pointer" : "default"
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
        
        {/* Team member markers - grouped by location */}
        {showTeammates && Object.entries(getTeammatesByCoordinates()).map(([coordKey, group]) => {
          const coords = group.coordinates
          const groupTeammates = group.teammates
          const mainTeammate = groupTeammates[0]
          
          return (
            <Marker
              key={coordKey}
              coordinates={coords}
            >
              <g 
                className="cursor-default"
                onMouseEnter={() => setHoveredTeammate(mainTeammate)}
                onMouseLeave={() => setHoveredTeammate(null)}
              >
                <defs>
                  {groupTeammates.map((teammate, index) => (
                    <clipPath key={teammate.id} id={`clip-${teammate.id}`}>
                      <circle r="12" cx="0" cy="0" />
                    </clipPath>
                  ))}
                </defs>
                
                {/* Stacked avatars */}
                {groupTeammates.slice(0, 3).map((teammate, index) => {
                  const isOnline = getOnlineStatus(teammate) === "online"
                  const offsetX = index * 8
                  const offsetY = index * 2
                  
                  return (
                    <g key={teammate.id} transform={`translate(${offsetX}, ${offsetY})`}>
                      {/* Avatar background circle */}
                      <circle
                        r={14}
                        fill="white"
                        stroke={isOnline ? "#22c55e" : "#ef4444"}
                        strokeWidth={2}
                        style={{
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                        }}
                      />
                      
                      {/* Avatar image */}
                      <foreignObject x={-12} y={-12} width={24} height={24} clipPath={`url(#clip-${teammate.id})`}>
                        <div style={{
                          width: '24px',
                          height: '24px',
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
                            onError={(e) => {
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
                            fontSize: '10px',
                            fontFamily: 'system-ui'
                          }}>
                            {teammate.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </foreignObject>
                      
                      {/* Status indicator dot */}
                      <circle
                        cx={10}
                        cy={-10}
                        r={3}
                        fill={isOnline ? "#22c55e" : "#ef4444"}
                        stroke="white"
                        strokeWidth={1}
                        style={{
                          animation: isOnline ? "pulse 2s infinite" : "none",
                          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
                        }}
                      />
                    </g>
                  )
                })}
                
                {/* Count indicator for more than 3 teammates */}
                {groupTeammates.length > 3 && (
                  <g transform={`translate(${24}, ${6})`}>
                    <circle
                      r={8}
                      fill="#6b7280"
                      stroke="white"
                      strokeWidth={2}
                      style={{
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
                      }}
                    />
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      fill="white"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="system-ui"
                    >
                      +{groupTeammates.length - 3}
                    </text>
                  </g>
                )}
              </g>
            </Marker>
          )
        })}
      </ComposableMap>
      
      
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

      {/* Country Hover Tooltip - Only show when teammates are hidden */}
      {hoveredCountry && !showTeammates && (
        <div 
          className="absolute z-30 bg-background border border-border rounded-lg p-3 shadow-xl pointer-events-none max-w-xs"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: mousePosition.x > 400 ? 'translateX(-100%)' : 'none'
          }}
        >
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <span className="text-lg">{getCountryFlag(hoveredCountry)}</span>
            {hoveredCountry}
          </h4>
          <div className="space-y-1">
            {getTeammatesByCountry(hoveredCountry).map((teammate) => {
              const localTime = getTeammateLocalTime(teammate)
              return (
                <div key={teammate.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-0.5 shadow-sm">
                        <img
                          src={teammate.avatar}
                          alt={teammate.name}
                          className="w-full h-full object-cover rounded-full bg-gray-200 shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                        <div 
                          className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm"
                          style={{display: 'none'}}
                        >
                          {teammate.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background shadow-sm ${
                        getOnlineStatus(teammate) === "online" ? "bg-green-500" : "bg-red-500"
                      }`}></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{teammate.name}</div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getRoleColor(teammate.role)}`}>
                        {teammate.role}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono font-semibold">{formatTime(localTime)}</div>
                    <div className="text-xs text-muted-foreground">{teammate.timezoneDisplay}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Avatar Hover Tooltip */}
      {hoveredTeammate && (
        <div 
          className="absolute z-30 bg-background border border-border rounded-lg p-3 shadow-xl pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: mousePosition.x > 300 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-0.5 shadow-sm">
                  <img
                    src={hoveredTeammate.avatar}
                    alt={hoveredTeammate.name}
                    className="w-full h-full object-cover rounded-full bg-gray-200 shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                  <div 
                    className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm"
                    style={{display: 'none'}}
                  >
                    {hoveredTeammate.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-background shadow-sm ${
                  getOnlineStatus(hoveredTeammate) === "online" ? "bg-green-500" : "bg-red-500"
                }`}></span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate">{hoveredTeammate.name}</h3>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getRoleColor(hoveredTeammate.role)}`}>
                  {hoveredTeammate.role}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="text-sm font-mono font-semibold">{formatTime(getTeammateLocalTime(hoveredTeammate))}</div>
              <div className="text-xs text-muted-foreground">{hoveredTeammate.timezoneDisplay}</div>
            </div>
          </div>
        </div>
      )}
      
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