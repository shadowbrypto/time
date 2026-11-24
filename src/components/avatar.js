import { useState } from "react"
import { cn } from "../lib/utils"

// Photo with an initial as the fallback. `label` is only for places where the
// name is not printed next to the photo; otherwise the image stays decorative.
// Photos load straight away (they are small and most are on the first
// screen); pass `loading="lazy"` for ones further down, such as the map.
export function Avatar({ teammate, size = 40, label, loading = "eager", className }) {
  const [failed, setFailed] = useState(false)

  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted", className)}
      style={{ width: size, height: size }}
      data-tip={label}
    >
      {failed ? (
        <span
          role={label ? "img" : undefined}
          aria-label={label}
          aria-hidden={label ? undefined : true}
          className="m-auto font-semibold text-muted-foreground"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {teammate.name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={teammate.avatar}
          alt={label || ""}
          width={size}
          height={size}
          loading={loading}
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}

export const OVERLAP = 8
const TRAVEL = "cubic-bezier(0.45, 0, 0.1, 1)"
const ARRIVAL = "cubic-bezier(0.25, 0.8, 0.25, 1)"

// One place in the pile. A closed slot has no width, so opening it pushes its
// neighbours aside continuously while the face fades and grows in with it.
function Slot({ open, first, size, delay, children }) {
  return (
    <span
      aria-hidden={open ? undefined : true}
      className="inline-flex shrink-0 justify-center"
      style={{
        width: open ? size : 0,
        marginLeft: open && !first ? -OVERLAP : 0,
        opacity: open ? 1 : 0,
        transform: open ? "scale(1)" : "scale(0.6)",
        transition: `width 280ms ${TRAVEL} ${delay}ms, margin-left 280ms ${TRAVEL} ${delay}ms, opacity 200ms ${ARRIVAL} ${delay}ms, transform 280ms ${ARRIVAL} ${delay}ms`,
      }}
    >
      {children}
    </span>
  )
}

// Overlapping faces. Each one carries an opaque ring in the colour of the
// surface it sits on, so nothing shows through the overlap.
//
// With `expandable`, the faces past `max` stay mounted and `showAll` opens
// them one after another in reading order (and closes them last-first) while
// the "+N" chip gives up its place. Nothing pops and the pill resizes as one.
export function Facepile({
  people,
  max = 3,
  size = 28,
  showAll = false,
  expandable = false,
  ringClassName = "ring-surface",
}) {
  const extras = Math.max(0, people.length - max)
  const rendered = expandable ? people : showAll ? people : people.slice(0, max)
  const hidden = people.length - (showAll ? people.length : Math.min(max, people.length))
  // Keep the whole stagger under about 160ms however long the list is.
  const step = extras > 0 ? Math.min(40, 160 / extras) : 0

  return (
    <span className="flex items-center">
      {rendered.map((teammate, index) => {
        const extraIndex = index - max
        const open = extraIndex < 0 || showAll
        const delay = extraIndex < 0 ? 0 : (showAll ? extraIndex : extras - 1 - extraIndex) * step
        return (
          <Slot key={teammate.id} open={open} first={index === 0} size={size} delay={delay}>
            <Avatar teammate={teammate} size={size} label={teammate.name} className={cn("ring-2", ringClassName)} />
          </Slot>
        )
      })}
      {(expandable ? extras > 0 : hidden > 0) && (
        <Slot open={!showAll} first={false} size={size} delay={showAll ? 0 : extras * step}>
          <span
            className={cn(
              "time-numerals relative inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-2",
              ringClassName
            )}
            style={{ width: size, height: size }}
          >
            +{extras}
          </span>
        </Slot>
      )}
    </span>
  )
}
