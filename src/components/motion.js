import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { cn } from "../lib/utils"

// Shared motion for things that appear, leave and swap. Nothing pops: a thing
// stays mounted until its exit has played, and a newcomer starts from its
// "before" look so it has something to transition from. Durations collapse
// to nothing under prefers-reduced-motion (see index.css and `reducedMotion`).

export const TRAVEL = "cubic-bezier(0.45, 0, 0.1, 1)"
export const ARRIVAL = "cubic-bezier(0.25, 0.8, 0.25, 1)"

export const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  Boolean(window.matchMedia("(prefers-reduced-motion: reduce)").matches)

const exitDelay = (ms) => (reducedMotion() ? 0 : ms)

// Makes the browser take in the "before" look that was just committed, so
// the change that follows transitions from it, in the same frame as the
// input that caused it rather than a frame or two later.
const settleStyles = () => {
  void document.body.offsetHeight
}

// Runs `fn` after the next paint.
function afterPaint(fn) {
  let second
  const first = requestAnimationFrame(() => {
    second = requestAnimationFrame(fn)
  })
  return () => {
    cancelAnimationFrame(first)
    cancelAnimationFrame(second)
  }
}

// One thing that comes and goes. `mounted`: render it at all. `shown`: give it
// its "in" look. Something open on first render is simply there.
export function usePresence(open, exit = 200) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)

  useLayoutEffect(() => {
    if (open) {
      setMounted(true)
      settleStyles()
      setShown(true)
      return undefined
    }
    setShown(false)
    const timer = setTimeout(() => setMounted(false), exitDelay(exit))
    return () => clearTimeout(timer)
  }, [open, exit])

  return [mounted || open, shown && open]
}

// The last value something had while it was open, so it can leave showing
// what it showed rather than going blank on its way out.
export function useLastValue(value, keep) {
  const ref = useRef(value)
  if (keep) ref.current = value
  return ref.current
}

const sameItems = (a, b) => a.length === b.length && a.every((item, index) => item === b[index])

// A list whose items come and go. Returns one entry per item to render, with
// `phase`: "enter" (just added, render it in its before look), "in", or
// "exit" (removed, render it on its way out). Leaving items keep their place.
export function useListPresence(items, keyOf, exit = 220) {
  const [state, setState] = useState(() => ({
    items,
    entries: items.map((item) => ({ key: keyOf(item), item, phase: "in" })),
  }))

  let entries = state.entries
  if (!sameItems(state.items, items)) {
    const now = Date.now()
    const previous = new Map(entries.map((entry) => [entry.key, entry]))
    const merged = items.map((item) => {
      const key = keyOf(item)
      const before = previous.get(key)
      return { key, item, phase: !before ? "enter" : before.phase === "exit" ? "in" : before.phase }
    })
    const kept = new Set(merged.map((entry) => entry.key))
    entries.forEach((entry, index) => {
      if (kept.has(entry.key)) return
      // Back in after the nearest earlier neighbour that is still listed.
      let at = 0
      for (let j = index - 1; j >= 0; j -= 1) {
        const found = merged.findIndex((other) => other.key === entries[j].key)
        if (found >= 0) {
          at = found + 1
          break
        }
      }
      merged.splice(at, 0, entry.phase === "exit" ? entry : { ...entry, phase: "exit", leftAt: now })
      kept.add(entry.key)
    })
    entries = merged
    setState({ items, entries })
  }

  const entering = entries.some((entry) => entry.phase === "enter")
  const leaving = entries.filter((entry) => entry.phase === "exit")

  useLayoutEffect(() => {
    if (!entering) return
    settleStyles()
    setState((current) => ({
      ...current,
      entries: current.entries.map((entry) => (entry.phase === "enter" ? { ...entry, phase: "in" } : entry)),
    }))
  }, [entering])

  const nextExit = leaving.length ? Math.min(...leaving.map((entry) => entry.leftAt)) : null
  useEffect(() => {
    if (nextExit === null) return undefined
    const timer = setTimeout(() => {
      const cutoff = Date.now() - exitDelay(exit) + 20
      setState((current) => ({
        ...current,
        entries: current.entries.filter((entry) => entry.phase !== "exit" || entry.leftAt > cutoff),
      }))
    }, Math.max(0, nextExit + exitDelay(exit) - Date.now()))
    return () => clearTimeout(timer)
  }, [nextExit, exit])

  return entries
}

// Swaps one block for another, keyed by `id`. The old one fades out where it
// was, then the new one fades in with a small rise as it clears (two dense
// layouts never sit on top of each other); with `easeHeight`, the block's
// height travels between the two so what sits below moves smoothly.
export function Swap({ id, children, easeHeight = false, exit = 110, className }) {
  const [layers, setLayers] = useState([{ id }])
  const latest = useRef({})
  latest.current[id] = children
  const boxRef = useRef(null)
  const heightRef = useRef(null)

  let shown = layers
  if (layers[layers.length - 1].id !== id) {
    shown = [
      ...layers.filter((layer) => layer.id !== id).map((layer) => ({ ...layer, leaving: true })),
      { id, entering: true },
    ]
    setLayers(shown)
  }

  const entering = shown.some((layer) => layer.entering)
  const leaving = shown.some((layer) => layer.leaving)

  useEffect(() => {
    if (!leaving) return undefined
    const timer = setTimeout(
      () => setLayers((current) => current.filter((layer) => !layer.leaving)),
      exitDelay(exit + 40)
    )
    return () => clearTimeout(timer)
  }, [leaving, exit])

  // Height: hold the old height for the first frame, then travel to the new.
  // The release timer lives in a ref: later commits during the travel must
  // not cancel it, or the block would keep a fixed height.
  const releaseRef = useRef(null)
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const from = heightRef.current
    const to = box.lastElementChild ? box.lastElementChild.offsetHeight : box.offsetHeight
    heightRef.current = to
    if (!easeHeight || from === null || from === to || reducedMotion() || !entering) return
    clearTimeout(releaseRef.current)
    box.style.transition = "none"
    box.style.height = `${from}px`
    box.style.overflow = "clip"
    void box.offsetHeight
    box.style.transition = `height 260ms ${TRAVEL}`
    box.style.height = `${to}px`
    releaseRef.current = setTimeout(() => {
      box.style.height = ""
      box.style.overflow = ""
      box.style.transition = ""
    }, 280)
  })
  useEffect(() => () => clearTimeout(releaseRef.current), [])

  // After the height effect above, so it still sees the swap as entering.
  useLayoutEffect(() => {
    if (!entering) return
    settleStyles()
    setLayers((current) => current.map((layer) => ({ ...layer, entering: false })))
  }, [entering])

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      {shown.map((layer) => {
        const out = layer.leaving
        const before = layer.entering
        return (
          <div
            key={layer.id}
            aria-hidden={out || undefined}
            inert={out || undefined}
            className={cn(out && "pointer-events-none absolute inset-x-0 top-0")}
            style={{
              opacity: out || before ? 0 : 1,
              transform: before ? "translateY(8px)" : "none",
              transition: out
                ? `opacity ${exit}ms linear`
                : before
                  ? "none"
                  : `opacity 200ms ${ARRIVAL} ${exit - 10}ms, transform 260ms ${ARRIVAL} ${exit - 10}ms`,
            }}
          >
            {latest.current[layer.id]}
          </div>
        )
      })}
    </div>
  )
}

// The moving highlight of a segmented control: one thumb that slides and
// resizes to the option marked `data-active="true"` inside `ref`'s element.
// It sits still on first paint and only travels for later changes.
export function useThumb(activeKey) {
  // A callback ref, so a group that mounts later (the map's filter waits for
  // the map) is measured as soon as it appears.
  const [group, ref] = useState(null)
  const [box, setBox] = useState(null)
  const [travel, setTravel] = useState(false)

  useLayoutEffect(() => {
    if (!group) return undefined
    const measure = () => {
      const active = group.querySelector('[data-active="true"]')
      const next = active
        ? {
            x: active.offsetLeft,
            y: active.offsetTop,
            w: active.offsetWidth,
            h: active.offsetHeight,
            groupW: group.clientWidth,
            groupH: group.clientHeight,
          }
        : null
      setBox((current) =>
        current && next && Object.keys(next).every((key) => current[key] === next[key]) ? current : next
      )
    }
    measure()
    if (typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(group)
    Array.from(group.children).forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [group, activeKey])

  // Travel only once the thumb has been drawn in its first place.
  const placed = box !== null
  useEffect(() => (placed ? afterPaint(() => setTravel(true)) : undefined), [placed])

  const style = box
    ? {
        width: box.w,
        height: box.h,
        transform: `translate(${box.x}px, ${box.y}px)`,
        transition: travel ? `transform 280ms ${TRAVEL}, width 280ms ${TRAVEL}` : "none",
      }
    : { opacity: 0 }
  return [ref, style, box, travel]
}
