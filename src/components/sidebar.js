import { useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import { ChevronLeft, Monitor, Moon, Sun } from "lucide-react"
import { cn } from "../lib/utils"
import { clockParts, useNow, viewerPlace } from "../lib/time"
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
const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" })

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
const row = "flex h-11 w-full items-center rounded-[10px] text-[15px] font-medium transition-colors"
const iconCell = "flex h-11 w-11 shrink-0 items-center justify-center"

// Desktop: a floating panel that narrows to icons.
export function Sidebar({ className }) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { theme, setTheme } = useTheme()
  const now = useNow()
  const { digits, period } = clockParts(now)
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
            className={cn(iconCell, "rounded-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground")}
          >
            {/* One chevron that turns with the panel. */}
            <ChevronLeft
              aria-hidden="true"
              {...utilityIcon}
              size={18}
              style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: `transform 260ms ${TRAVEL}` }}
            />
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
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
          {/* Your own clock, on every page. Collapsed, it keeps just the time. */}
          <div className="relative h-[92px]">
            <div
              aria-hidden={collapsed ? true : undefined}
              className={cn(label(collapsed), "absolute inset-x-0 bottom-3 pl-[14px] pr-2.5")}
            >
              <p className="text-[12px] text-muted-foreground">Your time in {viewerPlace()}</p>
              <p className="mt-1 flex items-baseline gap-1 leading-none">
                <span className="time-numerals text-[32px] font-light tracking-[-0.02em]">{digits}</span>
                {period && <span className="text-[13px] font-medium">{period}</span>}
              </p>
              <p className="mt-1.5 text-[12px] text-muted-foreground">{dateFormat.format(now)}</p>
            </div>
            <div
              aria-hidden={collapsed ? undefined : true}
              className={cn(
                "absolute bottom-3 left-0 w-11 text-center transition-opacity",
                collapsed ? "opacity-100 delay-150 duration-200" : "pointer-events-none opacity-0 duration-100"
              )}
            >
              <p className="time-numerals text-[13px] font-semibold leading-none">{digits}</p>
              {period && <p className="mt-1 text-[10px] font-medium leading-none text-muted-foreground">{period}</p>}
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
                "absolute left-0 top-0 rounded-[10px] text-muted-foreground transition-[opacity,background-color,color] hover:bg-accent hover:text-foreground",
                collapsed ? "opacity-100 delay-150 duration-200" : "pointer-events-none opacity-0 duration-100"
              )}
            >
              <AppearanceGlyph theme={activeTheme.id} />
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
        className="hit-target -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <AppearanceGlyph theme={active.id} size={18} />
      </button>
    </div>
  )
}
