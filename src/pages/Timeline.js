import { teammates, getTeammateLocalTime, formatTime, getOnlineStatus, getCurrentUtcOffset, getRoleColor } from "../data/teammates"
import { useState, useEffect } from "react"
import WorldMap from "../components/WorldMap"

function Timeline() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [viewMode, setViewMode] = useState('unorganized') // 'organized' or 'unorganized'
  const [expandedGroups, setExpandedGroups] = useState(new Set(['Pacific', 'Americas', 'Atlantic', 'Europe/Africa', 'Asia/Middle East', 'Asia/Pacific', 'Other']))
  const [hoveredBubble, setHoveredBubble] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Hierarchy order for unorganized view
  const hierarchyOrder = {
    'Founder': 1,
    'COO': 2,
    'Operations & PM': 3,
    'Art Director': 4,
    'UI/UX Designer': 5,
    'Dashboard Guy': 6,
    'BD': 7,
    'PR': 8,
    'Support': 9
  }

  // Group teammates by timezone regions
  const getTimezoneGroups = () => {
    const groups = {}
    
    teammates.forEach(teammate => {
      const offset = getCurrentUtcOffset(teammate.timezone)
      let groupKey = ''
      let utcRange = ''
      
      // Group by similar UTC offsets
      if (offset >= -12 && offset <= -9) {
        groupKey = 'Pacific'
        utcRange = 'UTC-12 to UTC-9'
      } else if (offset >= -8 && offset <= -5) {
        groupKey = 'Americas'
        utcRange = 'UTC-8 to UTC-5'
      } else if (offset >= -4 && offset <= -1) {
        groupKey = 'Atlantic'
        utcRange = 'UTC-4 to UTC-1'
      } else if (offset >= 0 && offset <= 3) {
        groupKey = 'Europe/Africa'
        utcRange = 'UTC+0 to UTC+3'
      } else if (offset >= 4 && offset <= 7) {
        groupKey = 'Asia/Middle East'
        utcRange = 'UTC+4 to UTC+7'
      } else if (offset >= 8 && offset <= 12) {
        groupKey = 'Asia/Pacific'
        utcRange = 'UTC+8 to UTC+12'
      } else {
        groupKey = 'Other'
        utcRange = 'Various'
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          teammates: [],
          utcRange: utcRange
        }
      }
      groups[groupKey].teammates.push(teammate)
    })
    
    // Sort teammates within each group by name
    Object.keys(groups).forEach(key => {
      groups[key].teammates.sort((a, b) => a.name.localeCompare(b.name))
    })
    
    return groups
  }

  // Toggle group expansion
  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  // Sort teammates by hierarchy
  const getHierarchySorted = () => {
    return [...teammates].sort((a, b) => {
      const aOrder = hierarchyOrder[a.role] || 999
      const bOrder = hierarchyOrder[b.role] || 999
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.name.localeCompare(b.name)
    })
  }

  const timezoneGroups = getTimezoneGroups()
  const hierarchySorted = getHierarchySorted()

  // Get online and offline teammates
  const onlineTeammates = teammates.filter(teammate => getOnlineStatus(teammate) === "online")
  const offlineTeammates = teammates.filter(teammate => getOnlineStatus(teammate) === "offline")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Team Timeline</h1>
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('unorganized')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'unorganized' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Default
              </button>
              <button
                onClick={() => setViewMode('organized')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'organized' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Timezone
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Status Bubbles */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Online Bubble */}
              <div 
                className={`flex items-center gap-1 sm:gap-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full px-1.5 sm:px-2 py-1 transition-all duration-300 ease-in-out ${
                  hoveredBubble === 'online' ? 'px-2 sm:px-3' : ''
                }`}
                onMouseEnter={() => setHoveredBubble('online')}
                onMouseLeave={() => setHoveredBubble(null)}
              >
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  {onlineTeammates.length}
                </span>
                <div className="flex -space-x-1">
                  {(hoveredBubble === 'online' ? onlineTeammates : onlineTeammates.slice(0, 2)).map((teammate) => (
                    <div key={teammate.id} className="w-7 sm:w-9 h-7 sm:h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-0.5 shadow-sm border border-white dark:border-gray-900">
                      <img 
                        src={teammate.avatar} 
                        alt={teammate.name}
                        className="w-full h-full rounded-full object-cover bg-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
                        style={{display: 'none'}}
                      >
                        {teammate.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  ))}
                  {onlineTeammates.length > 2 && hoveredBubble !== 'online' && (
                    <div className="w-7 sm:w-9 h-7 sm:h-9 rounded-full bg-green-100 dark:bg-green-800 border border-white dark:border-gray-900 flex items-center justify-center">
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">+{onlineTeammates.length - 2}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Offline Bubble */}
              <div 
                className={`flex items-center gap-1 sm:gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full px-1.5 sm:px-2 py-1 transition-all duration-300 ease-in-out ${
                  hoveredBubble === 'offline' ? 'px-2 sm:px-3' : ''
                }`}
                onMouseEnter={() => setHoveredBubble('offline')}
                onMouseLeave={() => setHoveredBubble(null)}
              >
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 bg-red-500 rounded-full"></div>
                <span className="text-xs font-medium text-red-700 dark:text-red-300">
                  {offlineTeammates.length}
                </span>
                <div className="flex -space-x-1">
                  {(hoveredBubble === 'offline' ? offlineTeammates : offlineTeammates.slice(0, 2)).map((teammate) => (
                    <div key={teammate.id} className="w-7 sm:w-9 h-7 sm:h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-0.5 shadow-sm border border-white dark:border-gray-900">
                      <img 
                        src={teammate.avatar} 
                        alt={teammate.name}
                        className="w-full h-full rounded-full object-cover bg-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
                        style={{display: 'none'}}
                      >
                        {teammate.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  ))}
                  {offlineTeammates.length > 2 && hoveredBubble !== 'offline' && (
                    <div className="w-7 sm:w-9 h-7 sm:h-9 rounded-full bg-red-100 dark:bg-red-800 border border-white dark:border-gray-900 flex items-center justify-center">
                      <span className="text-xs font-medium text-red-700 dark:text-red-300">+{offlineTeammates.length - 2}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm sm:text-base md:text-lg font-mono">
                {formatTime(currentTime)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Organized View - By Timezone */}
      {viewMode === 'organized' && (
        <div className="space-y-3 sm:space-y-4">
          {Object.entries(timezoneGroups).map(([groupName, groupData]) => {
            const isExpanded = expandedGroups.has(groupName)
            const groupTeammates = groupData.teammates
            
            return (
              <div key={groupName} className="bg-card rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={`transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                      <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">{groupName}</h2>
                    </div>
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-muted text-muted-foreground text-xs rounded-full font-medium flex-shrink-0 hidden sm:inline-flex">
                      {groupData.utcRange}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {groupTeammates.length} member{groupTeammates.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      {groupTeammates.length}
                    </span>
                    <div className="flex -space-x-1">
                      {groupTeammates.slice(0, 2).map((teammate) => (
                        <div key={teammate.id} className="w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-0.5 shadow-sm border-2 border-background">
                          <img 
                            src={teammate.avatar} 
                            alt={teammate.name}
                            className="w-full h-full rounded-full object-cover bg-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div 
                            className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
                            style={{display: 'none'}}
                          >
                            {teammate.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      ))}
                      {groupTeammates.length > 2 && (
                        <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-xs font-medium text-muted-foreground">+{groupTeammates.length - 2}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {groupTeammates.map((teammate) => {
                        const localTime = getTeammateLocalTime(teammate)
                        
                        return (
                          <div key={teammate.id} className="bg-background p-3 rounded-lg border border-border hover:border-border/60 transition-all duration-200 hover:shadow-md touch-manipulation">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className="relative flex-shrink-0">
                                  <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-0.5 shadow-sm">
                                    <img 
                                      src={teammate.avatar} 
                                      alt={teammate.name}
                                      className="w-full h-full rounded-full object-cover bg-gray-200 shadow-sm"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div 
                                      className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm"
                                      style={{display: 'none'}}
                                    >
                                      {teammate.name.charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                  <span className={`absolute -top-0.5 -right-0.5 w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full border border-background shadow-sm ${
                                    getOnlineStatus(teammate) === "online" ? "bg-green-500" : "bg-red-500"
                                  }`}></span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-sm truncate">{teammate.name}</h3>
                                  <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getRoleColor(teammate.role)}`}>
                                    {teammate.role}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <div className="text-sm font-mono font-semibold">{formatTime(localTime)}</div>
                                <div className="text-xs text-muted-foreground">{teammate.timezoneDisplay}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unorganized View - By Hierarchy */}
      {viewMode === 'unorganized' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {hierarchySorted.map((teammate) => {
            const localTime = getTeammateLocalTime(teammate)
            
            return (
              <div key={teammate.id} className="bg-card p-3 rounded-lg border border-border hover:border-border/60 transition-all duration-200 hover:shadow-md touch-manipulation">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-0.5 shadow-sm">
                        <img 
                          src={teammate.avatar} 
                          alt={teammate.name}
                          className="w-full h-full rounded-full object-cover bg-gray-200 shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm"
                          style={{display: 'none'}}
                        >
                          {teammate.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className={`absolute -top-0.5 -right-0.5 w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full border border-background shadow-sm ${
                        getOnlineStatus(teammate) === "online" ? "bg-green-500" : "bg-red-500"
                      }`}></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm truncate">{teammate.name}</h3>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getRoleColor(teammate.role)}`}>
                        {teammate.role}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-sm font-mono font-semibold">{formatTime(localTime)}</div>
                    <div className="text-xs text-muted-foreground">{teammate.timezoneDisplay}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* World Map */}
      <div className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold">Team Locations</h2>
        <WorldMap />
      </div>
      
    </div>
  )
}

export default Timeline;