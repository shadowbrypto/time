import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Copy, Moon } from "lucide-react"
import { teammates } from "../data/teammates"
import { cn } from "../lib/utils"
import {
  describeDayShift,
  describeOffset,
  formatHour,
  formatHourRange,
  formatMinute,
  formatMinuteRange,
  isWholeDay,
  isWorkingAt,
  listNames,
  mod,
  offsetFromViewer,
  surfaceFor,
  toMinutes,
  useNow,
  viewerPlace,
} from "../lib/time"
import { isRangeKey, joinRuns, sameRange, stepRange } from "../lib/ranges"
import { Avatar, Facepile } from "../components/avatar"
import { ARRIVAL, Swap, TRAVEL, useLastValue, useListPresence, usePresence } from "../components/motion"
import { TimeSelect } from "../components/time-select"

const SLOTS = 48
const SLOT_MINUTES = 30
const DAY_MINUTES = 1440
const ROW = 56
const slotIndexes = Array.from({ length: SLOTS }, (_, index) => index)
const axisHours = [0, 3, 6, 9, 12, 15, 18, 21]
const startOptions = slotIndexes.map((slot) => ({ value: slot, label: formatMinute(slot * SLOT_MINUTES) }))

// The viewer has no profile, so their day is assumed to be 8 AM to 10 PM.
const viewerHours = { workingHours: { start: "08:00", end: "22:00" } }

const clampSlot = (value) => Math.min(SLOTS - 1, Math.max(0, value))

function readSelection(params) {
  const from = Number(params.get("from"))
  const to = Number(params.get("to"))
  if (!params.has("from") || !params.has("to")) return null
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to >= SLOTS || from > to) return null
  return { start: from, end: to }
}

function readPeople(params) {
  const known = new Set(teammates.map((teammate) => teammate.id))
  return (params.get("people") || "")
    .split(",")
    .map(Number)
    .filter((id) => known.has(id))
}

// The stretches of the day that leave out the fewest people. Each window is a
// run of slots missing the same people, so "2 to 7 PM misses Kai" and
// "7 to 10 PM misses Idris" come back as two separate choices.
function bestWindows(participants) {
  const missing = slotIndexes.map((slot) => participants.filter((participant) => !participant.workingAt(slot)))
  const fewest = Math.min(...missing.map((list) => list.length))
  if (fewest === participants.length) return []
  const runs = []
  let run = null
  slotIndexes.forEach((slot) => {
    const key = missing[slot].length === fewest ? missing[slot].map((p) => p.id).join(",") : null
    if (run && run.key === key) {
      run.end = slot
      return
    }
    if (run) runs.push(run)
    run = key === null ? null : { key, start: slot, end: slot, missing: missing[slot] }
  })
  if (run) runs.push(run)
  return runs
    .sort((a, b) => b.end - b.start - (a.end - a.start))
    .slice(0, 2)
    .sort((a, b) => a.start - b.start)
}

const whoIsMissing = (list) =>
  listNames([...list.filter((p) => p.id !== "you").map((p) => p.name), ...list.filter((p) => p.id === "you").map(() => "you")])

const percent = (slots) => `${(slots / SLOTS) * 100}%`

// One person's day. Each cell is shaded by the time of day it is for them
// (the same night-to-day surfaces as the Timeline), and a green line runs
// under their working hours. Hours are only printed where the working day
// starts and ends; the picked time is named by its own tag and by each row's
// label, so the cells under it stay clean. Hour lines are drawn inside the
// cells so every cell is exactly one slot wide, and each stretch of working
// hours is one line laid over them, so the hour lines never break it.
const TrackRow = memo(function TrackRow({ participant }) {
  const working = joinRuns(slotIndexes.filter((slot) => participant.workingAt(slot)).map((slot) => ({ start: slot, end: slot })))
  return (
    <div className="flex h-14 items-center">
      {/* The edge is drawn inside the clipped shape, so it follows the corners
          exactly; an outside ring leaves a sliver of page between ring and fill. */}
      <div className="relative flex h-10 w-full overflow-hidden rounded-[10px] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] dark:after:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
        {slotIndexes.map((slot) => {
          const localMinute = mod(slot * SLOT_MINUTES + participant.offset, DAY_MINUTES)
          const surface = surfaceFor(localMinute)
          const onTheHour = localMinute % 60 === 0
          const labelled = localMinute === participant.dayStart || localMinute === participant.dayEnd
          return (
            <div
              key={slot}
              style={surface.style}
              className={cn(
                "relative h-full min-w-0 flex-1",
                surface.dark ? "text-night-foreground" : "text-day-foreground",
                onTheHour &&
                  slot > 0 &&
                  "shadow-[inset_1px_0_0_rgb(0_0_0/0.06)] dark:shadow-[inset_1px_0_0_rgb(255_255_255/0.06)]"
              )}
            >
              {labelled && (
                <span className="time-numerals pointer-events-none absolute left-1 top-[calc(50%-1.5px)] z-[1] -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold leading-none">
                  {formatHour(localMinute)}
                </span>
              )}
            </div>
          )
        })}
        {working.map((run) => (
          <span
            key={run.start}
            aria-hidden="true"
            className="absolute bottom-0 h-[3px] bg-positive"
            style={{ left: percent(run.start), width: percent(run.end - run.start + 1) }}
          />
        ))}
      </div>
    </div>
  )
})

// A row of the grid opening or closing: the height travels while the content
// fades, so the rows below make room (or close up) continuously.
function RowShell({ phase, children }) {
  const open = phase === "in"
  return (
    <div
      aria-hidden={phase === "exit" || undefined}
      className="overflow-hidden"
      style={{
        height: open ? ROW : 0,
        opacity: open ? 1 : 0,
        transition: open
          ? `height 220ms ${TRAVEL}, opacity 180ms ${ARRIVAL} 60ms`
          : `opacity 100ms linear, height 220ms ${TRAVEL} 40ms`,
      }}
    >
      {children}
    </div>
  )
}

function Scheduler() {
  const now = useNow()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedIds, setSelectedIds] = useState(() => readPeople(searchParams))
  const [selection, setSelection] = useState(() => readSelection(searchParams))
  const [dragging, setDragging] = useState(false)
  const [copyState, setCopyState] = useState("idle")
  // The people "Clear people" removed, kept so it can be undone.
  const [cleared, setCleared] = useState(null)
  const anchorRef = useRef(null)
  const pointerTypeRef = useRef("mouse")
  const tracksRef = useRef(null)
  const scrollerRef = useRef(null)

  useEffect(() => {
    document.title = "Scheduler – Teamline"
  }, [])

  // A new range only when it differs, so a drag that stays inside one slot
  // does not re-render the grid on every pointer move.
  const select = useCallback((next) => setSelection((current) => (sameRange(current, next) ? current : next)), [])

  // Keep the plan in the URL so it can be shared or reloaded.
  useEffect(() => {
    if (dragging) return
    const next = {}
    if (selectedIds.length > 0) next.people = selectedIds.join(",")
    if (selection) {
      next.from = String(selection.start)
      next.to = String(selection.end)
    }
    setSearchParams(next, { replace: true })
  }, [selectedIds, selection, dragging, setSearchParams])

  const nowMinute = now.getHours() * 60 + now.getMinutes()

  // On a narrow screen the day is wider than the view: start at the picked
  // time if there is one, otherwise near "now".
  useEffect(() => {
    const scroller = scrollerRef.current
    const tracks = tracksRef.current
    if (!scroller || !tracks || scroller.scrollWidth <= scroller.clientWidth) return
    const picked = readSelection(new URLSearchParams(window.location.search))
    const minute = picked
      ? picked.start * SLOT_MINUTES
      : new Date().getHours() * 60 + new Date().getMinutes()
    scroller.scrollLeft = (minute / DAY_MINUTES) * tracks.offsetWidth - scroller.clientWidth / 3
  }, [])

  const place = useMemo(() => viewerPlace(), [])

  const participants = useMemo(() => {
    const you = {
      id: "you",
      name: "You",
      place,
      offset: 0,
      dayStart: toMinutes(viewerHours.workingHours.start),
      dayEnd: toMinutes(viewerHours.workingHours.end),
      workingAt: (slot) => isWorkingAt(viewerHours, slot * SLOT_MINUTES),
    }
    const others = teammates
      .filter((teammate) => selectedIds.includes(teammate.id))
      .map((teammate) => {
        const offset = offsetFromViewer(teammate.timezone, now)
        return {
          id: teammate.id,
          name: teammate.name,
          place: teammate.timezoneDisplay,
          teammate,
          offset,
          dayStart: toMinutes(teammate.workingHours.start),
          dayEnd: toMinutes(teammate.workingHours.end),
          workingAt: (slot) => isWorkingAt(teammate, mod(slot * SLOT_MINUTES + offset, DAY_MINUTES)),
        }
      })
    return [you, ...others]
  }, [selectedIds, now, place])

  // Rows stay on screen while they open or close.
  const rows = useListPresence(participants, (participant) => participant.id, 280)

  const invited = participants.slice(1)
  const startMinute = selection ? selection.start * SLOT_MINUTES : null
  const endMinute = selection ? (selection.end + 1) * SLOT_MINUTES : null
  const wholeDay = selection ? isWholeDay(startMinute, endMinute) : false
  const rangeLabel = selection ? formatMinuteRange(startMinute, endMinute) : ""

  const localRange = (participant) => {
    const range = formatMinuteRange(startMinute + participant.offset, endMinute + participant.offset)
    if (wholeDay) return range
    const day = describeDayShift(Math.floor((startMinute + participant.offset) / DAY_MINUTES))
    return day ? `${range}, ${day}` : range
  }

  const isOff = (participant) => {
    for (let slot = selection.start; slot <= selection.end; slot += 1) {
      if (!participant.workingAt(slot)) return true
    }
    return false
  }

  const windows = useMemo(
    () => (invited.length > 0 ? bestWindows(participants) : []),
    [participants, invited.length]
  )
  const bars = useMemo(() => joinRuns(windows), [windows])
  const shownBars = useListPresence(bars, (bar) => `${bar.start}-${bar.end}`, 200)
  const windowRange = (item) => formatMinuteRange(item.start * SLOT_MINUTES, (item.end + 1) * SLOT_MINUTES)
  const firstHour = (item) => ({ start: item.start, end: Math.min(item.start + 1, item.end) })

  // The answer, in words, before any of the detail.
  let headline = "Who’s in the meeting?"
  let detail = "Pick people below, then drag across the day to choose a time."
  let picks = []
  if (selection && invited.length === 0) {
    headline = wholeDay ? `${rangeLabel}, your time` : `${rangeLabel} your time`
    detail = "Add people to see what time that is for them."
  } else if (selection) {
    const offPeople = participants.filter(isOff)
    if (offPeople.length === 0) {
      headline = `${rangeLabel} works for everyone`
      detail = `All ${participants.length} of you are in working hours. Times are shown in ${place} time.`
    } else {
      headline = `${rangeLabel} is off hours for ${whoIsMissing(offPeople)}`
      const worst = offPeople.find((p) => p.id !== "you")
      detail = worst
        ? `${worst.name} would join at ${localRange(worst)}.`
        : `It falls outside your own ${formatHourRange(toMinutes(viewerHours.workingHours.start), toMinutes(viewerHours.workingHours.end))} day.`
    }
  } else if (windows.length > 0) {
    picks = windows.map(firstHour)
    if (windows[0].missing.length === 0) {
      const whole = isWholeDay(windows[0].start * SLOT_MINUTES, (windows[0].end + 1) * SLOT_MINUTES)
      headline = whole ? "Everyone overlaps all day" : `Everyone overlaps from ${windowRange(windows[0])}`
      detail = `That’s in ${place} time, marked in orange above the grid. Drag inside it to choose a slot.`
      picks = picks.slice(0, 1)
    } else {
      // Name the trade: each option, and who it costs.
      headline = windows.map((item) => `${windowRange(item)} misses ${whoIsMissing(item.missing)}`).join(". ")
      detail =
        windows.length === 1
          ? `No time suits all ${participants.length} of you. This is the closest, marked in orange above the grid.`
          : `No time suits all ${participants.length} of you. Both options are marked in orange above the grid.`
    }
  } else if (invited.length > 0) {
    headline = "Nobody’s working hours line up"
    detail = "There is no half hour when anyone here is in working hours together."
  }
  const picksKey = picks.map((pick) => `${pick.start}-${pick.end}`).join(",") || "none"

  const toggleTeammate = (id) => {
    setCopyState("idle")
    setCleared(null)
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  const clearPeople = () => {
    setCopyState("idle")
    setCleared(selectedIds)
    setSelectedIds([])
  }

  const undoClear = () => {
    setSelectedIds(cleared)
    setCleared(null)
  }

  const slotFromEvent = (event) => {
    const rect = tracksRef.current.getBoundingClientRect()
    return clampSlot(Math.floor(((event.clientX - rect.left) / rect.width) * SLOTS))
  }

  const rangeFromAnchor = (slot) => ({
    start: Math.min(anchorRef.current, slot),
    end: Math.max(anchorRef.current, slot),
  })

  const handlePointerDown = (event) => {
    pointerTypeRef.current = event.pointerType
    if (event.pointerType !== "mouse" || event.button !== 0) return
    event.preventDefault()
    tracksRef.current.focus({ preventScroll: true })
    const slot = slotFromEvent(event)
    setCopyState("idle")
    if (event.shiftKey && selection && anchorRef.current !== null) {
      select(rangeFromAnchor(slot))
      return
    }
    anchorRef.current = slot
    select({ start: slot, end: slot })
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (dragging) select(rangeFromAnchor(slotFromEvent(event)))
  }

  const endDrag = () => setDragging(false)

  const startResize = (event, edge) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    pointerTypeRef.current = "mouse"
    anchorRef.current = edge === "start" ? selection.end : selection.start
    setCopyState("idle")
    setDragging(true)
    tracksRef.current.setPointerCapture(event.pointerId)
  }

  // Touch and pen: tap a start, then tap an end. Dragging is left for scrolling.
  const handleClick = (event) => {
    if (pointerTypeRef.current === "mouse" || event.detail === 0) return
    const slot = slotFromEvent(event)
    setCopyState("idle")
    if (selection && selection.start === selection.end && slot !== selection.start && anchorRef.current !== null) {
      select(rangeFromAnchor(slot))
    } else {
      anchorRef.current = slot
      select({ start: slot, end: slot })
    }
  }

  // Keyboard, on the grid itself: arrows move the time by half an hour, Shift
  // with an arrow moves its far end (so it grows or shrinks), Home and End go
  // to the start and end of the day, Page Up and Page Down move two hours.
  const handleTrackKeyDown = (event) => {
    if (!isRangeKey(event.key)) return
    event.preventDefault()
    setCopyState("idle")
    const next = stepRange(selection, anchorRef.current, event.key, event.shiftKey, SLOTS, Math.floor(nowMinute / SLOT_MINUTES))
    anchorRef.current = next.anchor
    select(next.range)
  }

  const setStart = (value) => {
    setCopyState("idle")
    const start = Number(value)
    anchorRef.current = start
    setSelection((current) => ({
      start,
      end: current && current.end >= start ? current.end : clampSlot(start + 1),
    }))
  }

  const setEnd = (value) => {
    setCopyState("idle")
    setSelection((current) => (current ? { start: current.start, end: Number(value) } : current))
  }

  const clearTime = () => {
    setCopyState("idle")
    setSelection(null)
    // The button is about to fade away; keep the keyboard on the grid.
    tracksRef.current.focus({ preventScroll: true })
  }

  const pick = (range) => {
    anchorRef.current = range.start
    setCopyState("idle")
    select(range)
    // The buttons fade once a time is picked; the grid is where it can be adjusted.
    tracksRef.current.focus({ preventScroll: true })
  }

  const copyTimes = async () => {
    const lines = [
      `Meeting: ${rangeLabel} (${place})`,
      ...invited.map(
        (participant) =>
          `${participant.name}: ${localRange(participant)} (${participant.place})${isOff(participant) ? ", off hours" : ""}`
      ),
    ]
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopyState("copied")
    } catch (e) {
      setCopyState("failed")
    }
  }

  // An end can't come before the start.
  const endOptions = selection
    ? slotIndexes
        .filter((slot) => slot >= selection.start)
        .map((slot) => ({ value: slot, label: formatMinute((slot + 1) * SLOT_MINUTES) }))
    : []

  // The footer and its message leave showing what they showed.
  const showFooter = Boolean(selection) && invited.length > 0
  const [footerMounted, footerShown] = usePresence(showFooter, 220)
  const footer = useLastValue({ rangeLabel, invited }, showFooter)
  const [messageMounted, messageShown] = usePresence(copyState !== "idle", 180)
  const message = useLastValue(copyState, copyState !== "idle")
  const peopleAction = cleared ? "undo" : selectedIds.length > 0 ? "clear" : null

  return (
    <div className="space-y-8">
      <header aria-live="polite">
        <h1 tabIndex={-1} className="text-[28px] font-bold leading-[1.15] tracking-[-0.022em] sm:text-[34px]">
          {headline}
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-muted-foreground">{detail}</p>
        {/* The row is always there, so the page below never jumps when the
            buttons come and go; they fade in and out inside it. */}
        <Swap id={picksKey} className="mt-4 min-h-10">
          {picks.length > 0 && (
            <div className={cn("gap-2 sm:flex sm:flex-wrap", picks.length > 1 ? "grid grid-cols-2" : "flex")}>
              {picks.map((item) => (
                <button
                  key={item.start}
                  type="button"
                  onClick={() => pick(item)}
                  className="time-numerals inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-primary px-3 text-[14px] font-semibold text-primary-foreground transition-[filter] hover:brightness-95 active:brightness-90 sm:px-4 sm:text-[15px]"
                >
                  Pick {formatMinuteRange(item.start * SLOT_MINUTES, (item.end + 1) * SLOT_MINUTES)}
                </button>
              ))}
            </div>
          )}
        </Swap>
      </header>

      <section aria-labelledby="people-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="people-heading" className="text-[20px] font-semibold tracking-[-0.01em]">
            People
          </h2>
          {/* One button that becomes "Undo" after clearing, in the same place,
              so the keyboard stays on it and nothing beside it moves. */}
          <button
            type="button"
            onClick={peopleAction === "undo" ? undoClear : clearPeople}
            inert={!peopleAction || undefined}
            aria-hidden={!peopleAction || undefined}
            className={cn(
              "hit-target grid rounded-md text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 transition-opacity duration-200 hover:decoration-foreground",
              !peopleAction && "opacity-0"
            )}
          >
            <span
              className={cn("col-start-1 row-start-1 justify-self-end transition-opacity duration-200", peopleAction === "undo" && "opacity-0")}
              aria-hidden={peopleAction === "undo" || undefined}
            >
              Clear people
            </span>
            <span
              className={cn("col-start-1 row-start-1 justify-self-end transition-opacity duration-200", peopleAction !== "undo" && "opacity-0")}
              aria-hidden={peopleAction !== "undo" || undefined}
            >
              Undo<span className="sr-only"> clearing {cleared ? cleared.length : 0} people</span>
            </span>
          </button>
          <span role="status" className="sr-only">
            {cleared ? `Cleared ${cleared.length} ${cleared.length === 1 ? "person" : "people"}.` : ""}
          </span>
        </div>
        {/* Everyone is always on screen. Phone: a five-across grid of faces
            with names under them, like a favourites grid, so all fourteen fit
            in three rows without scrolling. Wide: pills with name and place. */}
        <div className="grid grid-cols-5 gap-x-1 gap-y-2.5 sm:flex sm:flex-wrap sm:gap-2">
          {teammates.map((teammate) => {
            const selected = selectedIds.includes(teammate.id)
            return (
              <button
                key={teammate.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTeammate(teammate.id)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-1 text-[12px] font-medium transition-[background-color,box-shadow]",
                  "sm:h-11 sm:shrink-0 sm:flex-row sm:gap-2 sm:rounded-full sm:bg-surface sm:py-0 sm:pl-1.5 sm:pr-3.5 sm:text-[15px]",
                  selected ? "sm:shadow-[inset_0_0_0_2px_hsl(var(--now))]" : "sm:hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "relative flex rounded-full",
                    // Phone: the orange ring goes round the face itself.
                    selected && "max-sm:shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_4px_hsl(var(--now))]"
                  )}
                >
                  <Avatar teammate={teammate} size={32} className="max-sm:!h-11 max-sm:!w-11" />
                  {/* Picked: an orange tick at the corner, the face left in view. */}
                  {selected && (
                    <span className="absolute -bottom-0.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-now text-black ring-2 ring-background sm:ring-surface">
                      <Check aria-hidden="true" size={10} strokeWidth={3.5} />
                    </span>
                  )}
                </span>
                <span translate="no" className={cn("max-w-full truncate", !selected && "max-sm:text-muted-foreground")}>
                  {teammate.name}
                </span>
                <span className="hidden text-[13px] font-normal text-muted-foreground sm:inline">
                  {teammate.timezoneDisplay}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="time-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id="time-heading" className="text-[20px] font-semibold tracking-[-0.01em]">
              Time
            </h2>
            {/* Swatches are drawn like the thing they explain, not like checkboxes. */}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground sm:gap-x-4">
              <span className="flex items-center gap-1.5">
                {/* Its edge is drawn inside, like the grid's rows, and stronger in
                    the dark, where night and day are both close to the page. */}
                <span
                  aria-hidden="true"
                  className="h-2 w-7 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.32)]"
                  style={{ background: "linear-gradient(90deg, hsl(var(--night)) 0 30%, hsl(var(--day)) 70% 100%)" }}
                />
                <span>
                  Night to day<span className="hidden sm:inline">, their time</span>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-positive" />
                <span>
                  Working<span className="hidden sm:inline"> hours</span>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-now" />
                Now
              </span>
              {/* Last, so it comes and goes without moving the others. */}
              <span
                aria-hidden={windows.length === 0 || undefined}
                className={cn("flex items-center gap-1.5 transition-opacity duration-200", windows.length === 0 && "opacity-0")}
              >
                <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-now" />
                <span>
                  Best<span className="hidden sm:inline"> overlap</span>
                </span>
              </span>
            </p>
          </div>
          <div className="flex w-full items-center gap-2 text-[15px] sm:w-auto">
            <span aria-hidden="true" className="hidden text-muted-foreground sm:inline">
              From
            </span>
            <TimeSelect
              label="Meeting start"
              placeholder="Start"
              value={selection ? selection.start : null}
              options={startOptions}
              startAt={Math.floor(nowMinute / SLOT_MINUTES)}
              onChange={setStart}
            />
            <span aria-hidden="true" className="text-muted-foreground">
              to
            </span>
            <TimeSelect
              label="Meeting end"
              placeholder="End"
              align="right"
              disabled={!selection}
              value={selection ? selection.end : null}
              options={endOptions}
              onChange={setEnd}
            />
            {/* Always in place, so the menus beside it never shift when it appears. */}
            <button
              type="button"
              onClick={clearTime}
              inert={!selection || undefined}
              aria-hidden={!selection || undefined}
              className={cn(
                "hit-target ml-auto shrink-0 rounded-md px-1 text-[13px] font-medium text-foreground underline decoration-border underline-offset-4 transition-opacity duration-200 hover:decoration-foreground sm:ml-1",
                !selection && "opacity-0"
              )}
            >
              Clear<span className="hidden sm:inline"> time</span>
            </button>
          </div>
        </div>

        <div ref={scrollerRef} className="-mx-4 overflow-x-auto overscroll-x-contain sm:mx-0">
          <div className="flex min-w-[860px]">
            <div className="sticky left-0 z-20 w-[112px] shrink-0 bg-background pl-4 pr-2.5 sm:w-[212px] sm:pl-0 sm:pr-3">
              <div className="h-7" />
              {rows.map(({ key, item: participant, phase }) => {
                const off = selection ? isOff(participant) : false
                return (
                  <RowShell key={key} phase={phase}>
                    <div className="flex h-14 items-center gap-2.5">
                      {participant.teammate && (
                        <Avatar teammate={participant.teammate} size={32} className="hidden sm:inline-flex" />
                      )}
                      {!participant.teammate && (
                        <span
                          aria-hidden="true"
                          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background sm:flex"
                        >
                          You
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          translate={participant.teammate ? "no" : undefined}
                          className="truncate text-[15px] font-semibold leading-tight"
                        >
                          {participant.name}
                        </p>
                        <p
                          className={cn(
                            "time-numerals mt-0.5 flex items-center gap-1 text-[11px] leading-tight sm:text-[12px]",
                            selection ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {off && <Moon aria-hidden="true" size={11} fill="currentColor" className="shrink-0" />}
                          <span className="min-w-0 sm:truncate">
                            {selection
                              ? localRange(participant)
                              : participant.id === "you"
                                ? participant.place
                                : (
                                  <>
                                    {participant.place}
                                    <span className="hidden sm:inline">, {describeOffset(participant.offset)}</span>
                                  </>
                                )}
                          </span>
                          {off && <span className="sr-only">, off hours</span>}
                        </p>
                      </div>
                    </div>
                  </RowShell>
                )
              })}
            </div>

            <div className="min-w-0 flex-1 pr-4 sm:pr-0">
              <div aria-hidden="true" className="relative h-7">
                {axisHours.map((hour) => (
                  <span
                    key={hour}
                    className="time-numerals absolute top-1 whitespace-nowrap text-[11px] font-medium text-muted-foreground"
                    style={{ left: `${(hour / 24) * 100}%` }}
                  >
                    {formatHour(hour * 60)}
                  </span>
                ))}
                {/* The best windows, drawn on the axis the grid shares. */}
                {shownBars.map(({ key, item, phase }) => (
                  <span
                    key={key}
                    className="absolute bottom-0 h-[3px] rounded-full bg-now"
                    style={{
                      left: percent(item.start),
                      width: percent(item.end - item.start + 1),
                      opacity: phase === "in" ? 1 : 0,
                      transition: `opacity 200ms ${ARRIVAL}`,
                    }}
                  />
                ))}
              </div>
              <div
                ref={tracksRef}
                role="slider"
                tabIndex={0}
                aria-label="Meeting time"
                aria-valuemin={0}
                aria-valuemax={SLOTS - 1}
                aria-valuenow={selection ? selection.start : Math.floor(nowMinute / SLOT_MINUTES)}
                aria-valuetext={selection ? rangeLabel : "No time picked"}
                aria-describedby="track-keys"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={handleClick}
                onKeyDown={handleTrackKeyDown}
                className={cn(
                  "relative cursor-crosshair touch-manipulation select-none rounded-[14px] transition-[margin] duration-200",
                  selection && "mb-9"
                )}
              >
                <span id="track-keys" className="sr-only">
                  Drag across the day, or use the arrow keys to move the time by half an hour and Shift with an arrow
                  to change its length.
                </span>
                {rows.map(({ key, item: participant, phase }) => (
                  <RowShell key={key} phase={phase}>
                    <TrackRow participant={participant} />
                  </RowShell>
                ))}

                {/*
                  The picked time. A solid orange frame around the rows, no wash
                  over them: the cells keep their own colours and the frame says
                  "this part". The rows are 10px round and the frame stands 4px
                  off them, so it is 14px round. A grip on each side resizes it,
                  and a tag underneath names the time.
                */}
                {selection && (
                  <div
                    className="pointer-events-none absolute z-10 rounded-[14px] border-2 border-now"
                    style={{
                      top: 4,
                      bottom: 4,
                      left: percent(selection.start),
                      width: percent(selection.end - selection.start + 1),
                      transition: dragging ? "none" : `left 220ms ${TRAVEL}, width 220ms ${TRAVEL}`,
                    }}
                  >
                    {["start", "end"].map((edge) => (
                      <span
                        key={edge}
                        aria-hidden="true"
                        onPointerDown={(event) => startResize(event, edge)}
                        className={cn(
                          "pointer-events-auto absolute top-1/2 hidden h-10 w-4 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center sm:flex",
                          edge === "start" ? "-left-[9px]" : "-right-[9px]"
                        )}
                      >
                        <span className="h-6 w-1.5 rounded-full bg-now shadow-[0_0_0_2px_hsl(var(--background))]" />
                      </span>
                    ))}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "time-numerals absolute top-[calc(100%+8px)] flex h-6 items-center whitespace-nowrap rounded-[7px] bg-now px-2 text-[12px] font-semibold text-black",
                        selection.start > SLOTS * 0.7 ? "right-0" : "left-0"
                      )}
                    >
                      {rangeLabel}
                    </span>
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 rounded-full bg-now"
                  style={{ left: `${(nowMinute / DAY_MINUTES) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {footerMounted && (
        // Phone: one compact bar pinned above the tab bar, so the action is
        // always under the thumb. Wide: a card at the end of the page.
        <footer
          data-pinned-bar
          aria-hidden={!showFooter || undefined}
          inert={!showFooter || undefined}
          className="sticky bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-border/60 bg-surface p-2.5 pl-4 shadow-[0_8px_30px_rgb(0_0_0/0.16)] sm:static sm:border-tile-line sm:p-4 sm:shadow-none"
          style={{
            opacity: footerShown ? 1 : 0,
            transform: footerShown ? "none" : "translateY(8px)",
            transition: footerShown
              ? `opacity 200ms ${ARRIVAL}, transform 240ms ${ARRIVAL}`
              : `opacity 160ms linear, transform 200ms ${TRAVEL}`,
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden sm:flex">
              <Facepile people={footer.invited.map((participant) => participant.teammate)} max={5} size={32} />
            </span>
            <p className="min-w-0 text-[12px] text-muted-foreground sm:text-[13px]">
              <span className="time-numerals block truncate text-[15px] font-semibold text-foreground">
                {footer.rangeLabel}
              </span>
              You and {footer.invited.length} {footer.invited.length === 1 ? "teammate" : "teammates"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p
              role="status"
              aria-live="polite"
              className={cn("text-[13px] text-muted-foreground", message === "copied" && "max-sm:sr-only")}
              style={{
                opacity: messageShown ? 1 : 0,
                transform: messageShown ? "none" : "translateY(3px)",
                transition: `opacity 180ms ${ARRIVAL}, transform 220ms ${ARRIVAL}`,
              }}
            >
              {messageMounted && message === "copied" && "Copied. Paste it into your invite."}
              {messageMounted && message === "failed" && "Copying was blocked. Allow clipboard access and try again."}
            </p>
            <button
              type="button"
              onClick={copyTimes}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-95 active:brightness-90"
            >
              {copyState === "copied" ? (
                <Check aria-hidden="true" size={16} strokeWidth={2.5} />
              ) : (
                <Copy aria-hidden="true" size={16} />
              )}
              {/* Phone: both labels share one cell, so the button keeps its width. */}
              <span className="grid sm:hidden">
                <span className={cn("col-start-1 row-start-1", copyState === "copied" && "invisible")}>Copy times</span>
                <span className={cn("col-start-1 row-start-1", copyState !== "copied" && "invisible")}>Copied</span>
              </span>
              <span className="hidden sm:inline">Copy meeting times</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}

export default Scheduler;
