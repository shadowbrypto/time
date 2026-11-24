import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../lib/utils"
import { ARRIVAL, usePresence } from "./motion"

// A pop-up menu in place of the native <select>, so the closed control and
// the open list both match the rest of the page. Keyboard: arrows, Home, End,
// Enter or Space to choose, Escape or Tab to close (back on the button),
// digits to jump to a time.
// The menu is 12px round with 4px of padding, so its rows are 8px round.
// `startAt` is the row to open on while nothing is chosen yet.
//
// The list shows a whole number of rows (32px, or 44px for a finger) and
// snaps to them, so no row is ever cut in half; an edge with more rows
// beyond it fades out instead of ending on a hard line.
const PAD = 4
const GAP = 6
const EDGE = 8

export function TimeSelect({ label, value, options, placeholder, disabled = false, onChange, align = "left", startAt = 0 }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [edges, setEdges] = useState({ top: false, bottom: false })
  // Which side of the button it opens on, and how many whole rows fit there.
  const [fit, setFit] = useState({ up: false, rows: null })
  const [mounted, shown] = usePresence(open, 140)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const typedRef = useRef({ text: "", at: 0 })

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  const openMenu = () => {
    if (disabled) return
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.min(startAt, options.length - 1))
    setOpen(true)
  }

  const close = (returnFocus) => {
    setOpen(false)
    if (returnFocus && buttonRef.current) buttonRef.current.focus()
  }

  const choose = (index) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    close(true)
  }

  const readEdges = () => {
    const list = listRef.current
    if (!list) return
    const top = list.scrollTop > 1
    const bottom = list.scrollTop + list.clientHeight < list.scrollHeight - 1
    setEdges((current) => (current.top === top && current.bottom === bottom ? current : { top, bottom }))
  }

  // Before the first frame: pick the side with room (the phone's tab bar
  // covers the bottom of the screen), size the list to the whole rows that
  // fit there, focus it and scroll the current time to the middle on a row
  // boundary, so it opens already in place.
  useLayoutEffect(() => {
    if (!open || !listRef.current || !buttonRef.current) return
    const list = listRef.current
    const row = list.firstElementChild ? list.firstElementChild.offsetHeight : 32
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches
    const wanted = Math.min(options.length, coarse ? 7 : 9)
    const button = buttonRef.current.getBoundingClientRect()
    const bar = document.querySelector("nav.fixed")
    const floor = bar && bar.getBoundingClientRect().height > 0 ? bar.getBoundingClientRect().top : window.innerHeight
    const below = floor - button.bottom - GAP - EDGE
    const above = button.top - GAP - EDGE
    const needed = wanted * row + 2 * PAD + 2
    const up = below < needed && above > below
    const rows = Math.max(3, Math.min(wanted, Math.floor(((up ? above : below) - 2 * PAD - 2) / row)))
    setFit((current) => (current.up === up && current.rows === rows ? current : { up, rows }))
  }, [open, options.length])

  useLayoutEffect(() => {
    if (!open || !listRef.current) return
    const list = listRef.current
    list.focus({ preventScroll: true })
    const current = list.querySelector('[data-active="true"]')
    if (current) {
      const row = current.offsetHeight
      const rowsAbove = Math.floor((list.clientHeight - 2 * PAD) / row / 2)
      list.scrollTop = Math.max(0, current.offsetTop - PAD - rowsAbove * row)
    }
    readEdges()
  }, [open, fit])

  // Keep the active row in view by scrolling the list alone; scrollIntoView
  // would scroll the page under it too.
  useEffect(() => {
    if (!open || !listRef.current) return
    const list = listRef.current
    const current = list.querySelector('[data-active="true"]')
    if (!current) return
    const top = current.offsetTop - PAD
    const bottom = current.offsetTop + current.offsetHeight + PAD - list.clientHeight
    if (list.scrollTop > top) list.scrollTop = top
    else if (list.scrollTop < bottom) list.scrollTop = bottom
  }, [activeIndex, open])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const onButtonKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      openMenu()
    }
  }

  const onListKeyDown = (event) => {
    const last = options.length - 1
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => Math.min(last, index + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === "Home") {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === "End") {
      event.preventDefault()
      setActiveIndex(last)
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      choose(activeIndex)
    } else if (event.key === "Escape" || event.key === "Tab") {
      // The list is about to go: keep the keyboard on its button rather than
      // letting focus fall back to the top of the page.
      event.preventDefault()
      close(true)
    } else if (event.key.length === 1) {
      const now = Date.now()
      const typed = now - typedRef.current.at < 700 ? typedRef.current.text + event.key : event.key
      typedRef.current = { text: typed, at: now }
      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(typed.toLowerCase()))
      if (match >= 0) setActiveIndex(match)
    }
  }

  // Fade only the edges that have more rows beyond them.
  const fade = 20
  const mask = `linear-gradient(to bottom, ${edges.top ? "transparent" : "#000"} 0, #000 ${edges.top ? fade : 0}px, #000 calc(100% - ${edges.bottom ? fade : 0}px), ${edges.bottom ? "transparent" : "#000"} 100%)`

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        id={`${id}-button`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${label}: ${selected ? selected.label : "not set"}`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className={cn(
          "time-numerals flex h-10 min-w-[6.5rem] items-center justify-between gap-2 rounded-[10px] bg-surface pl-3 pr-2 text-[15px] font-medium transition-colors",
          "border border-tile-line hover:bg-accent disabled:pointer-events-none disabled:text-muted-foreground/60",
          open && "bg-accent"
        )}
      >
        <span className={cn(!selected && "font-normal text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown aria-hidden="true" size={14} className="shrink-0 text-muted-foreground" />
      </button>

      {mounted && (
        // The surface opens from the button's edge with a short fade and a
        // small drop, and closes the same way.
        <div
          className={cn(
            "absolute z-40 w-40 rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-[0_10px_38px_rgb(0_0_0/0.22)]",
            fit.up ? "bottom-full mb-1.5" : "top-full mt-1.5",
            align === "right" ? "right-0" : "left-0",
            fit.up ? (align === "right" ? "origin-bottom-right" : "origin-bottom-left") : align === "right" ? "origin-top-right" : "origin-top-left"
          )}
          style={{
            opacity: shown ? 1 : 0,
            transform: shown ? "none" : `translateY(${fit.up ? 4 : -4}px) scale(0.98)`,
            transition: shown
              ? `opacity 160ms ${ARRIVAL}, transform 200ms ${ARRIVAL}`
              : "opacity 120ms linear, transform 140ms linear",
            pointerEvents: open ? undefined : "none",
          }}
        >
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
            onKeyDown={open ? onListKeyDown : undefined}
            onScroll={readEdges}
            className="max-h-[calc(var(--menu-row)*9_+_8px)] snap-y snap-mandatory scroll-py-1 overflow-y-auto overscroll-contain rounded-[inherit] p-1 outline-none [--menu-row:32px] [@media(pointer:coarse)]:max-h-[calc(var(--menu-row)*7_+_8px)] [@media(pointer:coarse)]:[--menu-row:44px]"
            style={{
              WebkitMaskImage: mask,
              maskImage: mask,
              maxHeight: fit.rows ? `calc(var(--menu-row) * ${fit.rows} + ${2 * PAD}px)` : undefined,
            }}
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex
              const isActive = index === activeIndex
              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => open && choose(index)}
                  className={cn(
                    "time-numerals flex h-[var(--menu-row)] cursor-default touch-manipulation select-none snap-start items-center gap-2 rounded-[8px] pl-2 pr-3 text-[15px]",
                    isActive && "bg-accent",
                    isSelected && "font-semibold"
                  )}
                >
                  <span className="flex w-4 shrink-0 justify-center">
                    {isSelected && <Check aria-hidden="true" size={14} strokeWidth={3} />}
                  </span>
                  {option.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
