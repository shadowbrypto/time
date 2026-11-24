import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "../lib/utils"
import { Facepile, OVERLAP } from "./avatar"

const SIZE = 28
const MAX = 3

// A count with faces. Hover previews everyone; click or Enter keeps it open,
// which is the only way to see the full group on touch and keyboard.
//
// Opening adds faces to the right. The pill's box already has room for them,
// so its left edge (the dot and the count, where the pointer is) stays put
// even where the pill sits against the right edge of the page.
function PresenceGroup({ label, people, working }) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [restWidth, setRestWidth] = useState(null)
  const pillRef = useRef(null)
  const expanded = hovered || pinned

  // Faces past MAX open in place of the "+N" chip, each adding one step.
  const extras = Math.max(0, people.length - MAX)
  const growth = extras > 0 ? (extras - 1) * (SIZE - OVERLAP) : 0

  // The pill's width with the pile closed: everything but the pile, which is
  // the same open or closed, plus the closed pile. Read at any moment, even
  // while the pile is opening.
  const shownSlots = Math.min(people.length, MAX) + (extras > 0 ? 1 : 0)
  const restPile = shownSlots > 0 ? SIZE + (shownSlots - 1) * (SIZE - OVERLAP) : 0
  useLayoutEffect(() => {
    const pill = pillRef.current
    if (!pill || !pill.lastElementChild) return
    const others = pill.getBoundingClientRect().width - pill.lastElementChild.getBoundingClientRect().width
    const width = Math.ceil(others + restPile)
    setRestWidth((current) => (current === width ? current : width))
  }, [restPile, people.length, label])

  if (people.length === 0) return null

  return (
    <div className="flex" style={{ minWidth: restWidth === null ? undefined : restWidth + growth }}>
      <button
        ref={pillRef}
        type="button"
        aria-expanded={expanded}
        aria-label={`${people.length} ${label.toLowerCase()}: ${people.map((p) => p.name).join(", ")}`}
        onClick={() => setPinned((value) => !value)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex min-h-[44px] items-center gap-2.5 rounded-full bg-surface py-1.5 pl-3.5 pr-2 text-left"
      >
        <span
          aria-hidden="true"
          className={cn("h-2 w-2 shrink-0 rounded-full", working ? "bg-positive" : "bg-muted-foreground/50")}
        />
        <span className="whitespace-nowrap text-[13px] font-medium">
          <span className="time-numerals">{people.length}</span> {label.toLowerCase()}
        </span>
        <Facepile people={people} max={MAX} showAll={expanded} expandable size={SIZE} />
      </button>
    </div>
  )
}

export function PresenceSummary({ working, off }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PresenceGroup label="Working" people={working} working />
      <PresenceGroup label="Off" people={off} />
    </div>
  )
}
