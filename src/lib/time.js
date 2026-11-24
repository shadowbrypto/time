import { useEffect, useState } from "react"

const MINUTE = 60000
const DAY_MINUTES = 1440

// Clock that ticks on the minute. Nothing on screen shows seconds, so a
// one-second interval would re-render every tile and the map for no change.
export function useNow() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date())
        schedule()
      }, MINUTE - (Date.now() % MINUTE) + 50)
    }
    const refresh = () => {
      if (document.visibilityState === "visible") setNow(new Date())
    }
    schedule()
    document.addEventListener("visibilitychange", refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [])

  return now
}

const clockFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
// Whole hours as the locale writes them: "3 PM", "15", "15 Uhr", "15時".
const hourFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric" })
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

const wallClock = (date, timeZone) =>
  new Date(date.toLocaleString("en-US", timeZone ? { timeZone } : undefined))

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export const mod = (n, m) => ((n % m) + m) % m

// Minutes a time zone is ahead of the viewer right now (DST-aware).
export function offsetFromViewer(timeZone, now) {
  return Math.round((wallClock(now, timeZone) - wallClock(now)) / MINUTE)
}

export function isWorkingAt(teammate, minuteOfDay) {
  const start = toMinutes(teammate.workingHours.start)
  const end = toMinutes(teammate.workingHours.end)
  return minuteOfDay >= start && minuteOfDay < end
}

// Minutes from a local clock time until someone's working day starts or ends.
export function minutesUntil(teammate, minuteOfDay, edge) {
  return mod(toMinutes(teammate.workingHours[edge]) - minuteOfDay, DAY_MINUTES)
}

// How light a local clock time is, in four steps: night, the dark and light
// halves of dawn and dusk, and day. Steps rather than a smooth curve so text
// always sits on a surface it can be read against.
export function daylight(minuteOfDay) {
  const hour = mod(minuteOfDay, DAY_MINUTES) / 60
  if (hour >= 8 && hour < 18) return 1
  if ((hour >= 7 && hour < 8) || (hour >= 18 && hour < 20)) return 0.8
  if ((hour >= 5 && hour < 7) || (hour >= 20 && hour < 22)) return 0.22
  return 0
}

// The surface for a local time: a mix of the theme's day and night colours.
// `dark` says which text colours to put on it.
export function surfaceFor(minuteOfDay) {
  const level = daylight(minuteOfDay)
  return {
    level,
    dark: level < 0.5,
    style: { backgroundColor: `color-mix(in oklab, hsl(var(--day)) ${level * 100}%, hsl(var(--night)))` },
  }
}

// Everything a tile needs to know about one teammate at this moment.
export function describeTeammate(teammate, now) {
  const local = wallClock(now, teammate.timezone)
  const viewer = wallClock(now)
  const minutes = local.getHours() * 60 + local.getMinutes()
  return {
    local,
    minutes,
    offset: Math.round((local - viewer) / MINUTE),
    dayShift: Math.round((startOfDay(local) - startOfDay(viewer)) / (DAY_MINUTES * MINUTE)),
    working: isWorkingAt(teammate, minutes),
  }
}

const dateAtMinute = (minuteOfDay) => new Date(2000, 0, 1, 0, mod(minuteOfDay, DAY_MINUTES))

export const formatClock = (date) => clockFormat.format(date)

export const formatMinute = (minuteOfDay) => clockFormat.format(dateAtMinute(minuteOfDay))

// A time on the hour without its ":00" ("3 PM", "15 Uhr"); other times in full.
export const formatHour = (minuteOfDay) =>
  mod(minuteOfDay, 60) === 0 ? hourFormat.format(dateAtMinute(minuteOfDay)) : formatMinute(minuteOfDay)

// "8 AM – 10 PM", "08–22 Uhr": a stretch of the day in whole hours where it can be.
export function formatHourRange(start, end) {
  const from = dateAtMinute(start)
  const to = dateAtMinute(end)
  const wholeHours = mod(start, 60) === 0 && mod(end, 60) === 0
  if (wholeHours && to > from && typeof hourFormat.formatRange === "function") {
    try {
      return hourFormat.formatRange(from, to)
    } catch (e) {
      // fall through
    }
  }
  return wholeHours ? `${formatHour(start)}${rangeSeparator}${formatHour(end)}` : formatMinuteRange(start, end)
}

// Wording for a range that covers the whole day, wherever it starts.
export const ALL_DAY = "All day"
export const isWholeDay = (start, end) => end - start >= DAY_MINUTES

// What the locale puts between two times it can't merge: " – " in English,
// "～" in Japanese. Read from a range across midnight, where that separator is
// the only part the two ends share.
const rangeSeparator = (() => {
  try {
    const parts = clockFormat.formatRangeToParts(new Date(2000, 0, 1, 22), new Date(2000, 0, 2, 0))
    const last = parts.map((part) => part.source).lastIndexOf("startRange")
    const first = parts.findIndex((part) => part.source === "endRange")
    if (last >= 0 && first > last + 1) return parts.slice(last + 1, first).map((part) => part.value).join("")
  } catch (e) {
    // formatRangeToParts is missing
  }
  return " – "
})()

// "3:00 – 4:00 PM", or "10:00 PM – 12:00 AM" across midnight. Times only:
// callers add "tomorrow" or "yesterday" themselves.
export function formatMinuteRange(start, end) {
  if (isWholeDay(start, end)) return ALL_DAY
  const from = dateAtMinute(start)
  const to = dateAtMinute(end)
  // formatRange can share the AM/PM only within one day. A range that crosses
  // or ends at midnight, or lasts the whole day, ends on the next date, and
  // formatRange would then print both dates, so it gets two plain times.
  if (to > from && typeof clockFormat.formatRange === "function") {
    try {
      return clockFormat.formatRange(from, to)
    } catch (e) {
      // fall through
    }
  }
  return `${clockFormat.format(from)}${rangeSeparator}${clockFormat.format(to)}`
}

// Splits "3:42 PM" so the digits can be set large and the period small.
export function clockParts(date) {
  const parts = clockFormat.formatToParts(date)
  const period = parts.find((part) => part.type === "dayPeriod")
  const digits = parts
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim()
  return { digits, period: period ? period.value : "" }
}

export function describeOffset(offsetMinutes) {
  if (offsetMinutes === 0) return "same time as you"
  const direction = offsetMinutes > 0 ? "ahead" : "behind"
  const abs = Math.abs(offsetMinutes)
  if (abs < 60) return `${numberFormat.format(abs)} min ${direction}`
  const hours = abs / 60
  return `${numberFormat.format(hours)} ${hours === 1 ? "hr" : "hrs"} ${direction}`
}

export const describeDayShift = (dayShift) =>
  dayShift > 0 ? "tomorrow" : dayShift < 0 ? "yesterday" : ""

// Browsers still report a few legacy zone names.
const cityAliases = { Calcutta: "Kolkata", Saigon: "Ho Chi Minh City", Kiev: "Kyiv", Katmandu: "Kathmandu" }

// A time zone's own name, the same all year: "Central European Time",
// "Eastern Time". Paris, Berlin and Warsaw share one; Johannesburg and Sofia
// do not, although their clocks match in winter. English, like the interface.
const zonePart = (timeZone, style, date) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: style }).formatToParts(date)
    const part = parts.find((item) => item.type === "timeZoneName")
    return part ? part.value : ""
  } catch (e) {
    return ""
  }
}

// "Standard" is dropped ("Gulf Time", "Hawaii-Aleutian Time") so every zone
// reads the same way and long names fit on one line.
export const zoneName = (timeZone, date) =>
  (zonePart(timeZone, "longGeneric", date) || timeZone.split("/").pop().replace(/_/g, " ")).replace(" Standard Time", " Time")

// Its offset from UTC right now: "UTC+1", "UTC−10", "UTC+5:30".
export function zoneOffset(timeZone, date) {
  const raw = zonePart(timeZone, "shortOffset", date).replace("GMT", "UTC").replace("-", "−")
  return raw === "UTC" ? "UTC+0" : raw
}

// A city in a few capitals, for where there is no room for its name:
// "Berlin" is "BER", "New York" is "NY", "Ho Chi Minh City" is "HCMC".
export function shortPlace(place) {
  const words = place.split(/[\s-]+/).filter(Boolean)
  if (words.length === 0) return ""
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words.map((word) => word[0]).join("").slice(0, 4).toUpperCase()
}

// The viewer's city, or "" when their zone is not a place (UTC, Etc/GMT+5).
export function viewerCity() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  return zone.includes("/") && !zone.startsWith("Etc/") ? viewerPlace() : ""
}

export function viewerPlace() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  const city = zone.split("/").pop().replace(/_/g, " ")
  return cityAliases[city] || city || "your time zone"
}

// Lists are part of the English sentences around them, so they follow the
// interface's language rather than the visitor's: "Idris, Thabo and Priya".
const listFormat =
  typeof Intl.ListFormat === "function" ? new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" }) : null

const joinList = (items) => {
  if (listFormat) return listFormat.format(items)
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

// Names, folding a long list into "and N others".
export function listNames(names, max = 3) {
  if (names.length <= max) return joinList(names)
  const rest = names.length - (max - 1)
  return joinList([...names.slice(0, max - 1), `${numberFormat.format(rest)} others`])
}
