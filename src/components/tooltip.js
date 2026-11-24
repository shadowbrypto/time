import { useEffect, useLayoutEffect, useRef, useState } from "react"

// One tooltip for the whole app, in place of the browser's own `title` popup.
//
// Any element with `data-tip="…"` gets it (and `data-tip-side="right"` or
// "bottom" to change where it opens; the default is above). It is drawn in a
// fixed layer, so a clipped parent such as the collapsed sidebar cannot cut it
// off. It waits a moment before the first one appears, then follows instantly
// from one control to the next, the way a toolbar's tips do.
//
// Pressing a control puts its tip away until the pointer has left it, so a
// tip never pops up over whatever the press just changed (the sidebar toggle
// would otherwise show "Expand sidebar" over the fading app name).
//
// It is decoration for sighted pointer and keyboard users: the controls keep
// their own aria-labels, so the layer itself is hidden from assistive tech.

const SHOW_DELAY = 420
const WARM_FOR = 400
const GAP = 8
const EDGE = 8

const placements = {
  top: (rect) => ({ x: rect.left + rect.width / 2, y: rect.top - GAP }),
  bottom: (rect) => ({ x: rect.left + rect.width / 2, y: rect.bottom + GAP }),
  right: (rect) => ({ x: rect.right + GAP, y: rect.top + rect.height / 2 }),
}

const anchors = {
  top: { translate: "-50%, -100%", from: "0, 4px", origin: "center bottom" },
  bottom: { translate: "-50%, 0", from: "0, -4px", origin: "center top" },
  right: { translate: "0, -50%", from: "-4px, 0", origin: "left center" },
}

export function TooltipLayer() {
  const [tip, setTip] = useState(null)
  const [shift, setShift] = useState(0)
  const [shown, setShown] = useState(false)
  const boxRef = useRef(null)
  const timerRef = useRef(null)
  const lastHiddenRef = useRef(0)
  const targetRef = useRef(null)
  const pressedRef = useRef(null)

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover)")

    const hide = () => {
      clearTimeout(timerRef.current)
      if (targetRef.current) lastHiddenRef.current = Date.now()
      targetRef.current = null
      setShown(false)
      setTip(null)
    }

    const show = (target) => {
      if (target === targetRef.current) return
      clearTimeout(timerRef.current)
      targetRef.current = target
      const open = () => {
        if (!target.isConnected) return
        const text = target.getAttribute("data-tip")
        if (!text) return
        const side = placements[target.getAttribute("data-tip-side")] ? target.getAttribute("data-tip-side") : "top"
        setShift(0)
        setShown(false)
        setTip({ text, side, ...placements[side](target.getBoundingClientRect()) })
      }
      const warm = Date.now() - lastHiddenRef.current < WARM_FOR
      if (warm) open()
      else timerRef.current = setTimeout(open, SHOW_DELAY)
    }

    const onOver = (event) => {
      if (!canHover.matches) return
      const target = event.target.closest ? event.target.closest("[data-tip]") : null
      if (pressedRef.current) {
        if (target === pressedRef.current) return
        pressedRef.current = null
      }
      if (target) show(target)
      else if (targetRef.current) hide()
    }
    const onPress = (event) => {
      pressedRef.current = event.target.closest ? event.target.closest("[data-tip]") : null
      hide()
    }
    const onFocus = (event) => {
      const target = event.target.closest ? event.target.closest("[data-tip]") : null
      if (target && event.target.matches(":focus-visible")) show(target)
    }
    const onKey = (event) => {
      if (event.key === "Escape") hide()
    }

    document.addEventListener("mouseover", onOver)
    document.addEventListener("focusin", onFocus)
    document.addEventListener("focusout", hide)
    document.addEventListener("pointerdown", onPress)
    document.addEventListener("keydown", onKey)
    window.addEventListener("scroll", hide, true)
    window.addEventListener("resize", hide)
    return () => {
      clearTimeout(timerRef.current)
      document.removeEventListener("mouseover", onOver)
      document.removeEventListener("focusin", onFocus)
      document.removeEventListener("focusout", hide)
      document.removeEventListener("pointerdown", onPress)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", hide, true)
      window.removeEventListener("resize", hide)
    }
  }, [])

  // Keep it on screen: measure once it exists, nudge sideways if it overhangs,
  // and only then let it fade in, so it never corrects itself in view.
  useLayoutEffect(() => {
    if (!tip || !boxRef.current) return
    const rect = boxRef.current.getBoundingClientRect()
    let nudge = 0
    if (rect.left < EDGE) nudge = EDGE - rect.left
    else if (rect.right > window.innerWidth - EDGE) nudge = window.innerWidth - EDGE - rect.right
    setShift(nudge)
    setShown(true)
  }, [tip])

  if (!tip) return null
  const anchor = anchors[tip.side]

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60]"
      style={{ transform: `translate(${Math.round(tip.x + shift)}px, ${Math.round(tip.y)}px)` }}
    >
      <div
        ref={boxRef}
        className="whitespace-nowrap rounded-[8px] bg-foreground px-2.5 py-1.5 text-[12px] font-medium leading-tight text-background shadow-[0_6px_20px_rgb(0_0_0/0.22)]"
        style={{
          transformOrigin: anchor.origin,
          opacity: shown ? 1 : 0,
          transform: `translate(${anchor.translate}) translate(${shown ? "0, 0" : anchor.from}) scale(${shown ? 1 : 0.96})`,
          transition: shown
            ? "opacity 140ms cubic-bezier(0.25, 0.8, 0.25, 1), transform 180ms cubic-bezier(0.25, 0.8, 0.25, 1)"
            : "none",
        }}
      >
        {tip.text}
      </div>
    </div>
  )
}
