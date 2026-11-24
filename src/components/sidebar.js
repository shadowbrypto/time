import { useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import { ChevronLeft, Monitor, Moon, Sun } from "lucide-react"
import { cn } from "../lib/utils"
import { clockParts, shortPlace, useNow, viewerCity, viewerPlace } from "../lib/time"
import { useCityPhoto } from "../lib/city-photo"
import { Glyph, utilityIcon } from "./icons"
import { useThumb } from "./motion"
import { useTheme } from "./theme-provider"

const menuItems = [
  { title: "Timeline", glyph: "clock", href: "/timeline" },
  { title: "Scheduler", glyph: "calendar", href: "/scheduler" },
]

const themes = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Match system", icon: Monitor },
]

const collapsedKey = "timetosync-sidebar-collapsed"
// Short enough to sit beside the photo on one line in any language.
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" })

// Width moves on the travel curve; labels fade out before the edge reaches
// them and fade back once it has passed, so the moving edge never cuts text.
const TRAVEL = "cubic-bezier(0.45, 0, 0.1, 1)"
const label = (collapsed) =>
  cn(
    "whitespace-nowrap transition-opacity",
    collapsed ? "pointer-events-none opacity-0 duration-100" : "opacity-100 delay-150 duration-200"
  )

const readCollapsed = () => {
  try {
    return localStorage.getItem(collapsedKey) === "1"
  } catch (e) {
    return false
  }
}

// The glyph for the current appearance. All three share one cell and cross
// over, so a press turns one into the next instead of swapping it.
function AppearanceGlyph({ theme, size = 16 }) {
  return (
    <span aria-hidden="true" className="grid" style={{ width: size, height: size }}>
      {themes.map((item) => (
        <item.icon
          key={item.id}
          {...utilityIcon}
          size={size}
          fill="currentColor"
          className="col-start-1 row-start-1 transition-[opacity,transform] duration-200"
          style={{
            opacity: item.id === theme ? 1 : 0,
            transform: item.id === theme ? "none" : "scale(0.6) rotate(-45deg)",
          }}
        />
      ))}
    </span>
  )
}

const nextOf = (theme) => themes[(themes.findIndex((item) => item.id === theme) + 1) % themes.length]

// Every row is a 44px icon cell followed by its label. Collapsing only
// narrows the panel to that cell, so icons never move: the collapsed panel's
// inside is exactly one cell wide, and expanded, every label (the app name
// too) starts at the same x, right after the cell. The clock's text lines up
// with the icons above it.
// Tabular digits sit in equal-width cells, so a large "1" starts further in
// than an "8". This is how far to pull 30px numerals left so their ink starts
// where the small text above and below starts.
const digitInset = (digits) => (digits.startsWith("1") ? -3 : -1)

// Trim a line of text to its capital height and baseline, where supported.
const trimmed = "[text-box:trim-both_cap_alphabetic]"
// A trimmed line that also truncates would clip its own descenders (the tail
// of a "y", a comma), because they now hang below its box. Give the clip area
// 4px of room underneath and take it back with a margin so nothing moves.
const trimmedClip = `${trimmed} supports-[text-box:trim-both_cap_alphabetic]:-mb-1 supports-[text-box:trim-both_cap_alphabetic]:pb-1`

const row = "flex h-11 w-full items-center rounded-[10px] text-[15px] font-medium transition-colors duration-150"

// Hover is a whisper, selection is a statement. A hovered row only warms its
// text to full strength over a tint a third as strong as the selected row's
// fill, so hovering never looks like a second selection. Icon buttons get the
// same tint as a small disc behind the glyph instead of a grey square.
const rowHover = "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground active:bg-foreground/[0.07] dark:hover:bg-white/[0.035] dark:active:bg-white/[0.07]"
const iconButton = "group text-muted-foreground transition-colors duration-150 hover:text-foreground"
const iconDisc =
  "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 group-hover:bg-foreground/[0.06] group-active:bg-foreground/[0.1] dark:group-hover:bg-white/[0.08] dark:group-active:bg-white/[0.13]"
const iconCell = "flex h-11 w-11 shrink-0 items-center justify-center"

// A square photo of the viewer's own city. It links to the Wikipedia article
// it came from, which is the credit. No photo found (or offline): nothing.
function CityPhoto({ photo, className, focusable = true }) {
  const [loaded, setLoaded] = useState(false)

  if (photo.status === "none") return null

  return (
    <a
      href={photo.page}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={photo.title ? `${photo.title} on Wikipedia, where this photo is from` : undefined}
      data-tip={photo.title ? `${photo.title}, photo from Wikipedia` : undefined}
      data-tip-side="right"
      tabIndex={focusable && photo.status === "ready" ? 0 : -1}
      className={cn("block shrink-0 overflow-hidden rounded-[8px] bg-muted", className)}
    >
      {photo.status === "ready" && (
        <img
          src={photo.src}
          alt=""
          width={80}
          height={80}
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setLoaded(true)}
          className="h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </a>
  )
}

// Desktop: a floating panel that narrows to icons.
export function Sidebar({ className }) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { theme, setTheme } = useTheme()
  const now = useNow()
  const { digits, period } = clockParts(now)
  const city = viewerCity()
  const photo = useCityPhoto(city)
  const hasPhoto = photo.status !== "none"
  const activeTheme = themes.find((item) => item.id === theme) || themes[2]
  const nextTheme = nextOf(activeTheme.id)
  const [groupRef, thumb] = useThumb(activeTheme.id)
  const radioRefs = useRef([])

  // A radio group is one stop for Tab; arrows move the choice (and apply it).
  const onRadioKeyDown = (event) => {
    const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    const current = themes.indexOf(activeTheme)
    let index
    if (event.key in steps) index = (current + steps[event.key] + themes.length) % themes.length
    else if (event.key === "Home") index = 0
    else if (event.key === "End") index = themes.length - 1
    else return
    event.preventDefault()
    setTheme(themes[index].id)
    if (radioRefs.current[index]) radioRefs.current[index].focus()
  }

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(collapsedKey, value ? "0" : "1")
      } catch (e) {
        // Not remembered; still collapses for this visit.
      }
      return !value
    })
  }

  return (
    <aside
      className={cn("hidden h-full shrink-0 py-3 pl-3 md:block", className)}
      style={{ width: collapsed ? 82 : 252, transition: `width 260ms ${TRAVEL}` }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-tile-line bg-surface p-3">
        <div className="flex h-11 items-center">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            data-tip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            data-tip-side={collapsed ? "right" : "bottom"}
            className={cn(iconCell, iconButton, "rounded-full")}
          >
            <span className={iconDisc}>
              {/* One chevron that turns with the panel. */}
              <ChevronLeft
                aria-hidden="true"
                {...utilityIcon}
                size={18}
                style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: `transform 260ms ${TRAVEL}` }}
              />
            </span>
          </button>
          <span translate="no" className={cn(label(collapsed), "text-[17px] font-semibold tracking-[-0.01em]")}>
            Teamline
          </span>
        </div>

        <nav aria-label="Main" className="mt-3 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              aria-label={item.title}
              data-tip={collapsed ? item.title : undefined}
              data-tip-side="right"
              className={({ isActive }) =>
                cn(
                  row,
                  isActive ? "bg-muted text-foreground" : rowHover
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={iconCell}>
                    <Glyph name={item.glyph} size={16} />
                  </span>
                  <span aria-hidden="true" className={label(collapsed)}>
                    {item.title}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          {/* Your own clock, on every page. */}
          <div className="relative h-[112px]">
            {/*
              Expanded: the photo is a square exactly as tall as the three
              lines beside it. The place sits level with its top edge, the date
              with its bottom edge, and the time, the one large thing, between.
              Without a photo the text keeps the labels' left edge.
            */}
            <div
              aria-hidden={collapsed ? true : undefined}
              className={cn(label(collapsed), "absolute inset-x-0 bottom-3 flex items-stretch gap-3", !hasPhoto && "pl-[14px]")}
            >
              <CityPhoto photo={photo} className="h-[72px] w-[72px]" focusable={!collapsed} />
              {/*
                Aligned on the ink, not the line boxes. Each line's box is
                trimmed to its capital height and baseline (`trimmed`), so the
                place's capitals sit level with the photo's top edge, the date's
                baseline with its bottom edge, and the two gaps around the time
                are equal. The large numerals are pulled left by their first
                digit's side bearing so all three lines share one left edge. Browsers without
                text-box trimming fall back to 3px of padding.
              */}
              <div className="flex h-[72px] min-w-0 flex-1 flex-col justify-between py-[3px] supports-[text-box:trim-both_cap_alphabetic]:py-0">
                <p className={cn("truncate text-[12px] leading-none text-muted-foreground", trimmedClip)} data-tip={`Your time in ${viewerPlace()}`}>
                  Your time in {viewerPlace()}
                </p>
                <p className={cn("flex items-baseline gap-1 leading-none", trimmed)} style={{ marginLeft: digitInset(digits) }}>
                  <span className="time-numerals text-[30px] font-light tracking-[-0.02em]">{digits}</span>
                  {period && <span className="text-[12px] font-medium">{period}</span>}
                </p>
                <p className={cn("truncate text-[12px] leading-none text-muted-foreground", trimmedClip)}>{dateFormat.format(now)}</p>
              </div>
            </div>
            <div
              aria-hidden={collapsed ? undefined : true}
              className={cn(
                "absolute bottom-3 left-0 w-11 text-center transition-opacity",
                collapsed ? "opacity-100 delay-150 duration-200" : "pointer-events-none opacity-0 duration-100"
              )}
            >
              {/* Collapsed: photo, the city in short, then the time. */}
              <CityPhoto photo={photo} className="mx-auto mb-1.5 h-8 w-8" focusable={collapsed} />
              {city && (
                <p translate="no" className="mb-1.5 text-[11px] font-semibold leading-none tracking-[0.04em] text-muted-foreground">
                  {shortPlace(city)}
                </p>
              )}
              <p className="time-numerals text-[13px] font-semibold leading-none">{digits}</p>
              {period && <p className="mt-1 text-[11px] font-medium leading-none text-muted-foreground">{period}</p>}
            </div>
          </div>

          <div className="relative h-11">
            {/* Expanded: all three choices. Outer 10px, 3px inset, so 7px inside. */}
            <div
              ref={groupRef}
              role="radiogroup"
              aria-label="Appearance"
              inert={collapsed}
              onKeyDown={onRadioKeyDown}
              className={cn(label(collapsed), "absolute inset-0 flex items-stretch gap-0.5 rounded-[10px] bg-muted p-[3px]")}
            >
              {/* One thumb slides to the choice. */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 rounded-[7px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.12)] dark:bg-accent dark:shadow-none"
                style={thumb}
              />
              {themes.map((item, index) => {
                const selected = item.id === activeTheme.id
                return (
                  <button
                    key={item.id}
                    ref={(node) => {
                      radioRefs.current[index] = node
                    }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={item.label}
                    tabIndex={selected ? 0 : -1}
                    data-active={selected}
                    data-tip={item.label}
                    onClick={() => setTheme(item.id)}
                    className={cn(
                      "relative flex flex-1 items-center justify-center rounded-[7px] transition-colors duration-200",
                      selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon aria-hidden="true" {...utilityIcon} fill="currentColor" />
                  </button>
                )
              })}
            </div>
            {/* Collapsed: one button that steps through them. */}
            <button
              type="button"
              inert={!collapsed}
              aria-label={`Appearance: ${activeTheme.label}. Switch to ${nextTheme.label}`}
              data-tip={collapsed ? `Appearance: ${activeTheme.label}` : undefined}
              data-tip-side="right"
              onClick={() => setTheme(nextTheme.id)}
              className={cn(
                iconCell,
                "group absolute left-0 top-0 rounded-full text-muted-foreground transition-[opacity,color] hover:text-foreground",
                collapsed ? "opacity-100 delay-150 duration-200" : "pointer-events-none opacity-0 duration-100"
              )}
            >
              <span className={iconDisc}>
                <AppearanceGlyph theme={activeTheme.id} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

// Phone: the same destinations as a bottom tab bar, the way Clock does it.
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-surface md:hidden"
    >
      <div className="flex h-[52px] items-stretch">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium -outline-offset-2",
                isActive ? "text-foreground" : "text-muted-foreground"
              )
            }
          >
            <Glyph name={item.glyph} size={22} />
            {item.title}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// Phone: the app's name and the appearance switch, above the page. Tabs are
// for destinations, so the switch does not live in the tab bar. Like the
// collapsed sidebar's button, it steps through all three choices, so "Match
// system" can be chosen again.
export function MobileBar() {
  const { theme, setTheme } = useTheme()
  const active = themes.find((item) => item.id === theme) || themes[2]
  const next = nextOf(active.id)

  return (
    <div className="mb-4 flex h-10 items-center justify-between md:hidden">
      <span translate="no" className="text-[17px] font-semibold tracking-[-0.01em]">
        Teamline
      </span>
      <button
        type="button"
        aria-label={`Appearance: ${active.label}. Switch to ${next.label}`}
        onClick={() => setTheme(next.id)}
        className="hit-target -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
      >
        <AppearanceGlyph theme={active.id} size={18} />
      </button>
    </div>
  )
}
