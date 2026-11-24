// Ranges of slots on the Scheduler's half-hour grid: { start, end }, both ends
// included, so { start: 36, end: 37 } is one hour from 6 PM.

export const sameRange = (a, b) => a === b || (a !== null && b !== null && a.start === b.start && a.end === b.end)

// Neighbouring or overlapping stretches joined into one, so each run is drawn
// as a single piece (two best windows that meet make one bar, not two
// rounded ends with a notch between them).
export function joinRuns(runs) {
  const joined = []
  runs.forEach((run) => {
    const last = joined[joined.length - 1]
    if (last && last.end + 1 >= run.start) last.end = Math.max(last.end, run.end)
    else joined.push({ start: run.start, end: run.end })
  })
  return joined
}

const steps = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 4, PageDown: -4 }
export const isRangeKey = (key) => key in steps || key === "Home" || key === "End"

// The keyboard on the grid. Arrows move the range by one slot, Page Up and
// Page Down by four, Home and End to the start or end of the day. With Shift,
// the end away from the anchor moves instead, so the range grows or shrinks
// (and can pass the anchor, like a text selection). With nothing picked, any
// of these keys picks an hour starting at `fromSlot`.
// Returns the new range and its anchor.
export function stepRange(range, anchor, key, shift, slots, fromSlot) {
  const clamp = (value) => Math.min(slots - 1, Math.max(0, value))
  if (!range) {
    const start = clamp(fromSlot)
    return { range: { start, end: clamp(start + 1) }, anchor: start }
  }
  if (shift) {
    const fixed = anchor === range.start || anchor === range.end ? anchor : range.start
    const free = fixed === range.start ? range.end : range.start
    const target = key === "Home" ? 0 : key === "End" ? slots - 1 : clamp(free + steps[key])
    return { range: { start: Math.min(fixed, target), end: Math.max(fixed, target) }, anchor: fixed }
  }
  const length = range.end - range.start
  const wanted = key === "Home" ? 0 : key === "End" ? slots - 1 - length : range.start + steps[key]
  const start = Math.min(slots - 1 - length, Math.max(0, wanted))
  return { range: { start, end: start + length }, anchor: start }
}
