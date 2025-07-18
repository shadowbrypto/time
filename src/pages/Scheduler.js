import { useState, useEffect } from "react"
import { teammates, getTeammateLocalTime, formatTime } from "../data/teammates"
import { cn } from "../lib/utils"

function Scheduler() {
  const [selectedTeammates, setSelectedTeammates] = useState([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState({ start: null, end: null })
  const [isDragging, setIsDragging] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  // Generate 24-hour time slots (48 slots for 30-min intervals)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2)
    const minutes = i % 2 === 0 ? "00" : "30"
    return `${hours.toString().padStart(2, "0")}:${minutes}`
  })

  const handleTeammateToggle = (teammateId) => {
    setSelectedTeammates(prev => 
      prev.includes(teammateId) 
        ? prev.filter(id => id !== teammateId)
        : [...prev, teammateId]
    )
  }

  const handleTimeSlotClick = (index) => {
    if (!isDragging) {
      if (!selectedTimeSlot.start || selectedTimeSlot.end !== null) {
        // Start new selection - single block represents 30 minutes
        setSelectedTimeSlot({ start: index, end: index })
      } else {
        // Extend selection
        setSelectedTimeSlot({ 
          start: Math.min(selectedTimeSlot.start, index), 
          end: Math.max(selectedTimeSlot.start, index) 
        })
      }
    }
  }

  const handleMouseDown = (index) => {
    setIsDragging(true)
    setSelectedTimeSlot({ start: index, end: index })
  }

  const handleMouseMove = (index) => {
    if (isDragging && selectedTimeSlot.start !== null) {
      setSelectedTimeSlot({
        start: Math.min(selectedTimeSlot.start, index),
        end: Math.max(selectedTimeSlot.start, index)
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const isSlotSelected = (index) => {
    if (selectedTimeSlot.start === null) return false
    if (selectedTimeSlot.end === null) return false
    return index >= selectedTimeSlot.start && index <= selectedTimeSlot.end
  }

  const formatSlotTime = (slot) => {
    const [hours, minutes] = slot.split(":")
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getLocalTimeForSlot = (teammate, slotIndex) => {
    // Calculate what time it would be for the teammate at this slot
    const slotMinutes = slotIndex * 30
    const slotHours = Math.floor(slotMinutes / 60)
    const slotMins = slotMinutes % 60
    
    // Get timezone offset
    const offset = getTimezoneOffset(teammate)
    
    // Calculate teammate's local time for this slot
    let teammateHour = slotHours + offset
    let teammateMinutes = slotMins
    
    // Handle day overflow/underflow
    if (teammateHour >= 24) teammateHour -= 24
    if (teammateHour < 0) teammateHour += 24
    
    // Format as time string
    const timeString = `${Math.floor(teammateHour).toString().padStart(2, "0")}:${teammateMinutes.toString().padStart(2, "0")}`
    return formatSlotTime(timeString)
  }

  // Get teammate's timezone offset relative to user's timezone
  const getTimezoneOffset = (teammate) => {
    const now = new Date()
    const userTime = new Date(now.toLocaleString("en-US"))
    const teammateTime = new Date(now.toLocaleString("en-US", { timeZone: teammate.timezone }))
    
    return (teammateTime.getTime() - userTime.getTime()) / (1000 * 60 * 60) // in hours
  }

  const isWithinWorkingHours = (teammate, slotIndex) => {
    // Calculate what time it would be for the teammate at this slot
    const slotMinutes = slotIndex * 30
    const slotHours = Math.floor(slotMinutes / 60)
    const slotMins = slotMinutes % 60
    
    // Get timezone offset
    const offset = getTimezoneOffset(teammate)
    
    // Calculate teammate's local time for this slot
    let teammateHour = slotHours + offset
    let teammateMinutes = slotMins
    
    // Handle day overflow/underflow
    if (teammateHour >= 24) teammateHour -= 24
    if (teammateHour < 0) teammateHour += 24
    
    const currentTimeInMinutes = teammateHour * 60 + teammateMinutes
    
    const [startHour, startMinute] = teammate.workingHours.start.split(':').map(Number)
    const [endHour, endMinute] = teammate.workingHours.end.split(':').map(Number)
    
    const startTimeInMinutes = startHour * 60 + startMinute
    const endTimeInMinutes = endHour * 60 + endMinute
    
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes
  }

  const selectedTeammateData = teammates.filter(t => selectedTeammates.includes(t.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Meeting Scheduler</h1>
      </div>

      {/* Team Member Selector */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Select team members for the meeting</h3>
        <div className="flex flex-wrap gap-2">
          {teammates.map((teammate) => (
            <button
              key={teammate.id}
              onClick={() => handleTeammateToggle(teammate.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
                selectedTeammates.includes(teammate.id)
                  ? "border-primary/60 bg-gradient-to-r from-primary/15 to-primary/10 text-primary shadow-sm ring-1 ring-primary/20 dark:border-primary/40 dark:from-primary/10 dark:to-primary/5"
                  : "border-border/60 hover:border-border hover:bg-accent/50 dark:border-border/40 dark:hover:border-border/60 dark:hover:bg-accent/30"
              )}
            >
              <img 
                src={teammate.avatar} 
                alt={teammate.name}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div 
                className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
                style={{display: 'none'}}
              >
                {teammate.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{teammate.name}</span>
              <span className="text-xs text-muted-foreground">({teammate.timezoneDisplay})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Your Local Time View - Combined Selection and Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-medium leading-none">Select meeting time</h3>
            <p className="text-sm text-muted-foreground">
              Choose time slots in your local timezone
            </p>
          </div>
          
          {selectedTimeSlot.start !== null && selectedTimeSlot.end !== null && (
            <div className="text-sm text-muted-foreground">
              Selected: {formatSlotTime(timeSlots[selectedTimeSlot.start])} - {formatSlotTime(timeSlots[selectedTimeSlot.end + 1] || timeSlots[selectedTimeSlot.end])}
            </div>
          )}
        </div>
        
        <div 
          className="relative select-none"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
              <div className="overflow-hidden rounded-md border border-border/50">
                <div className="flex bg-gradient-to-b from-muted/30 to-muted/15 dark:from-muted/25 dark:to-muted/10">
                  {timeSlots.map((slot, index) => {
                    // Assume working hours are 8 AM to 10 PM for user
                    const slotHour = Math.floor(index / 2)
                    const isOffline = slotHour < 8 || slotHour >= 22
                    
                    // Check if this slot contains the current time
                    const currentHour = currentTime.getHours()
                    const currentMinutes = currentTime.getMinutes()
                    const currentSlotIndex = currentHour * 2 + (currentMinutes >= 30 ? 1 : 0)
                    const isCurrentTime = index === currentSlotIndex
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex-1 h-12 border-r border-border/30 text-center flex items-center justify-center transition-all duration-200 relative cursor-pointer group",
                          index === timeSlots.length - 1 && "border-r-0",
                          isOffline && "bg-gradient-to-b from-destructive/15 to-destructive/10",
                          isCurrentTime && !isSlotSelected(index) && "bg-gradient-to-b from-yellow-200 to-yellow-100 dark:from-yellow-900/40 dark:to-yellow-800/30 ring-1 ring-yellow-400/50",
                          isSlotSelected(index) && !isOffline && "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-sm ring-1 ring-primary/25",
                          isSlotSelected(index) && isOffline && "bg-gradient-to-b from-destructive/30 to-destructive/20 text-destructive-foreground ring-1 ring-destructive/30",
                          !isSlotSelected(index) && !isOffline && !isCurrentTime && "hover:bg-accent/50"
                        )}
                        onMouseDown={() => handleMouseDown(index)}
                        onMouseMove={() => handleMouseMove(index)}
                        onClick={() => handleTimeSlotClick(index)}
                      >
                        {index % 2 === 0 && (
                          <div className={cn(
                            "text-xs font-medium tabular-nums",
                            isOffline && !isSlotSelected(index) && "text-destructive/70",
                            !isOffline && !isSlotSelected(index) && "text-muted-foreground",
                            isSlotSelected(index) && !isOffline && "text-primary-foreground font-semibold",
                            isSlotSelected(index) && isOffline && "text-destructive-foreground font-semibold"
                          )}>
                            {slotHour.toString().padStart(2, '0')}
                          </div>
                        )}
                        
                        {index % 2 === 1 && (
                          <div className={cn(
                            "text-xs opacity-70",
                            isOffline && !isSlotSelected(index) && "text-destructive/50",
                            !isOffline && !isSlotSelected(index) && "text-muted-foreground/70",
                            isSlotSelected(index) && "text-current opacity-80"
                          )}>
                            30
                          </div>
                        )}
                        
                        {/* Hover tooltip */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-popover/95 backdrop-blur-sm text-popover-foreground border border-border/60 rounded shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-10">
                          {formatSlotTime(slot)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Hour labels */}
              <div className="flex mt-2 px-1">
                {Array.from({ length: 13 }, (_, i) => i * 2).map((hour) => (
                  <div key={hour} className="flex-1 text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      {hour === 0 ? "12AM" : hour < 12 ? `${hour}AM` : hour === 12 ? "12PM" : `${hour-12}PM`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
      </div>

      {/* Selected Team Members Time View */}
      {selectedTeammateData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-medium leading-none">Team members' local times</h3>
              <p className="text-sm text-muted-foreground">
                View how the selected time translates to each member's timezone
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-gradient-to-br from-destructive/20 to-destructive/15 border border-destructive/30 rounded-sm"></div>
                <span>Offline hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-gradient-to-br from-muted to-muted/80 border border-border/60 rounded-sm"></div>
                <span>Working hours</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {selectedTeammateData.map((teammate) => {
              const localTime = getTeammateLocalTime(teammate)
              return (
                <div key={teammate.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative flex-shrink-0">
                        <div className="h-12 w-12 rounded-full overflow-hidden ring-1 ring-border/20">
                          <img 
                            src={teammate.avatar} 
                            alt={teammate.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div 
                            className="h-full w-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground"
                            style={{display: 'none'}}
                          >
                            {teammate.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                          isWithinWorkingHours(teammate, Math.floor(new Date().getHours() * 2)) ? "bg-green-500" : "bg-destructive"
                        )}></div>
                      </div>
                      
                      <div className="flex min-w-0 flex-1 items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-foreground">{teammate.name}</div>
                            <div className="inline-flex items-center rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                              {teammate.role}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs">
                            <div className="font-medium text-foreground">
                              {teammate.timezoneDisplay} ({getTimezoneOffset(teammate) >= 0 ? '+' : ''}{getTimezoneOffset(teammate)}h)
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Current:</span>
                            <span className="font-mono font-medium text-foreground tabular-nums">{formatTime(localTime)}</span>
                          </div>
                          
                          {selectedTimeSlot.start !== null && selectedTimeSlot.end !== null && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Meeting:</span>
                              <span className="font-mono font-semibold text-foreground tabular-nums">
{getLocalTimeForSlot(teammate, selectedTimeSlot.start)} - {getLocalTimeForSlot(teammate, selectedTimeSlot.end + 1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative select-none pt-4">
                      <div className="overflow-hidden rounded-md border border-border/50">
                        <div className="flex bg-gradient-to-b from-muted/30 to-muted/15 dark:from-muted/25 dark:to-muted/10">
                          {timeSlots.map((slot, index) => {
                            const isOffline = !isWithinWorkingHours(teammate, index)
                            const offset = getTimezoneOffset(teammate)
                            
                            // Calculate teammate's local hour for this slot
                            let teammateHour = Math.floor(index / 2) + offset
                            if (teammateHour >= 24) teammateHour -= 24
                            if (teammateHour < 0) teammateHour += 24
                            
                            // Check if this slot contains the teammate's current time
                            const teammateLocalTime = getTeammateLocalTime(teammate)
                            const teammateCurrentHour = teammateLocalTime.getHours()
                            const teammateCurrentMinutes = teammateLocalTime.getMinutes()
                            
                            // The slot shows teammateHour (already calculated above)
                            // Check if this matches their actual current time
                            const isTeammateCurrentTime = Math.floor(teammateHour) === teammateCurrentHour && 
                                                        (index % 2 === 0 ? teammateCurrentMinutes < 30 : teammateCurrentMinutes >= 30)
                            
                            return (
                              <div
                                key={index}
                                className={cn(
                                  "flex-1 h-12 border-r border-border/30 text-center flex items-center justify-center transition-all duration-200 relative",
                                  index === timeSlots.length - 1 && "border-r-0",
                                  isOffline && "bg-gradient-to-b from-destructive/15 to-destructive/10",
                                  isTeammateCurrentTime && !isSlotSelected(index) && "bg-gradient-to-b from-yellow-200 to-yellow-100 dark:from-yellow-900/40 dark:to-yellow-800/30 ring-1 ring-yellow-400/50",
                                  isSlotSelected(index) && !isOffline && "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-sm ring-1 ring-primary/25",
                                  isSlotSelected(index) && isOffline && "bg-gradient-to-b from-destructive/30 to-destructive/20 text-destructive-foreground ring-1 ring-destructive/30"
                                )}
                              >
                                {index % 2 === 0 && (
                                  <div className={cn(
                                    "text-xs font-medium tabular-nums",
                                    isOffline && !isSlotSelected(index) && "text-destructive/70",
                                    !isOffline && !isSlotSelected(index) && "text-muted-foreground",
                                    isSlotSelected(index) && !isOffline && "text-primary-foreground font-semibold",
                                    isSlotSelected(index) && isOffline && "text-destructive-foreground font-semibold"
                                  )}>
                                    {Math.floor(teammateHour).toString().padStart(2, '0')}
                                  </div>
                                )}
                                
                                {index % 2 === 1 && (
                                  <div className={cn(
                                    "text-xs opacity-70",
                                    isOffline && !isSlotSelected(index) && "text-destructive/50",
                                    !isOffline && !isSlotSelected(index) && "text-muted-foreground/70",
                                    isSlotSelected(index) && "text-current opacity-80"
                                  )}>
                                    30
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schedule Button */}
      {selectedTeammateData.length > 0 && selectedTimeSlot.start !== null && selectedTimeSlot.end !== null && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {selectedTeammateData.map((teammate, index) => (
                <div key={teammate.id} className="relative">
                  <img 
                    src={teammate.avatar} 
                    alt={teammate.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-background"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold border-2 border-background"
                    style={{display: 'none'}}
                  >
                    {teammate.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedTeammateData.length} member{selectedTeammateData.length > 1 ? 's' : ''} selected • 
              {formatSlotTime(timeSlots[selectedTimeSlot.start])} - {formatSlotTime(timeSlots[selectedTimeSlot.end + 1] || timeSlots[selectedTimeSlot.end])}
            </div>
          </div>
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Schedule Meeting
          </button>
        </div>
      )}
    </div>
  )
}

export default Scheduler;