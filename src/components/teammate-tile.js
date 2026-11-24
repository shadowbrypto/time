import { memo } from "react"
import { Moon } from "lucide-react"
import { cn } from "../lib/utils"
import { clockParts, describeDayShift, describeOffset, surfaceFor } from "../lib/time"
import { Avatar } from "./avatar"
import { ContactHandle, PlatformBadge } from "./contact-handle"
import { DayMeter } from "./day-meter"

// One teammate. The time is the hero: large light numerals, as World Clock
// sets a city's time. The platform they prefer to be reached on sits as a
// badge on their photo, with the handle as the line under their name; role
// and place are the quiet line below, and under that a bar shows where they are
// in their own day (day-meter.js). The surface is the time of day where they
// are (night, dawn or dusk, day); a moon marks anyone outside working hours.
function TeammateTileBase({ teammate, minutes, offset, dayShift, working, local }) {
  const { digits, period } = clockParts(local)
  const day = describeDayShift(dayShift)
  const where = [teammate.timezoneDisplay, day, describeOffset(offset)].filter(Boolean).join(", ")
  const surface = surfaceFor(minutes)
  const muted = surface.dark ? "text-night-muted" : "text-day-muted"

  return (
    <li
      style={surface.style}
      className={cn(
        "rounded-2xl border border-tile-line px-4 py-3.5",
        surface.dark ? "text-night-foreground" : "text-day-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="relative flex shrink-0">
          <Avatar teammate={teammate} size={40} />
          <PlatformBadge teammate={teammate} size={18} className="absolute -bottom-1 -right-1" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 translate="no" className="truncate text-[15px] font-semibold leading-tight">
            {teammate.name}
          </h3>
          <ContactHandle teammate={teammate} className={cn("mt-0.5", muted)} />
        </div>
        <p className="flex shrink-0 items-baseline gap-1 leading-none">
          {!working && (
            <Moon aria-hidden="true" size={14} className={cn("mr-1 self-center", muted)} fill="currentColor" />
          )}
          <span className="time-numerals text-[34px] font-light tracking-[-0.025em]">{digits}</span>
          {period && <span className="text-[13px] font-medium">{period}</span>}
          <span className="sr-only">{working ? ", in working hours" : ", off hours"}</span>
        </p>
      </div>

      <div className={cn("mt-2.5 flex items-baseline justify-between gap-3 text-[13px]", muted)}>
        <p className="min-w-0 truncate">{teammate.role}</p>
        <p className="shrink-0 text-right">{where}</p>
      </div>

      <DayMeter teammate={teammate} minutes={minutes} ground={surface.style.backgroundColor} muted={muted} />
    </li>
  )
}

export const TeammateTile = memo(TeammateTileBase)
