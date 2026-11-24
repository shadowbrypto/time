import { cn } from "../lib/utils"
import { formatHourRange, isWorkingAt, mod, toMinutes } from "../lib/time"

/*
  Where someone is in their own day, as a bar under their card.

  The bar is their whole 24 hours. The green stretch is their working day, the
  orange dot is now, and the line underneath says what that means in words.
  Green and orange keep their usual meanings; the track is a tint of the card's
  own text colour, so it sits on light, dusk and night cards alike.
*/

const DAY = 1440
const ink = (percent) => `color-mix(in srgb, currentColor ${percent}%, transparent)`
const pct = (minutes) => `${(mod(minutes, DAY) / DAY) * 100}%`

const duration = (minutes) => {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`
  const hours = Math.round(minutes / 30) / 2
  return `${hours} ${hours === 1 ? "hr" : "hrs"}`
}

// The facts the bar draws from, and the sentence that goes with it.
export function readDay(teammate, minutes) {
  const start = toMinutes(teammate.workingHours.start)
  const end = toMinutes(teammate.workingHours.end)
  const working = isWorkingAt(teammate, minutes)
  const length = mod(end - start, DAY) || DAY
  const into = mod(minutes - start, DAY)
  const left = mod(end - minutes, DAY)
  const until = mod(start - minutes, DAY)
  const since = mod(minutes - end, DAY)

  let status
  if (working && left <= 60) status = `Wrapping up, ${duration(left)} left`
  else if (working && into < 60) status = `Just started, ${duration(left)} left`
  else if (working) status = `${duration(left)} left in their day`
  else if (since < 120) status = `Done for the day, back in ${duration(until)}`
  else status = `Off, starts in ${duration(until)}`

  return { start, length, working, status, hours: formatHourRange(start, end) }
}

// `ground` is the card's own background, used to cut the dot out of the bar.
export function DayMeter({ teammate, minutes, ground, muted }) {
  const day = readDay(teammate, minutes)
  return (
    <div className="mt-3" role="img" aria-label={`${day.status}. Working hours ${day.hours}.`}>
      <div className="relative h-1.5 rounded-full" style={{ background: ink(14) }}>
        <span
          className="absolute inset-y-0 rounded-full bg-positive"
          style={{ left: pct(day.start), width: `${(day.length / DAY) * 100}%` }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-now"
          style={{ left: pct(minutes), boxShadow: `0 0 0 2px ${ground}` }}
        />
      </div>
      <div className={cn("mt-2 flex justify-between gap-3 text-[13px]", muted)}>
        <span className="min-w-0 truncate">{day.status}</span>
        <span className="time-numerals shrink-0">{day.hours}</span>
      </div>
    </div>
  )
}
