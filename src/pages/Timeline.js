import { useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Moon } from "lucide-react"
import { teammates } from "../data/teammates"
import { cn } from "../lib/utils"
import {
  clockParts,
  describeDayShift,
  describeOffset,
  describeTeammate,
  formatClock,
  listNames,
  minutesUntil,
  surfaceFor,
  useNow,
  viewerPlace,
} from "../lib/time"
import { Avatar } from "../components/avatar"
import { ContactHandle, PlatformBadge } from "../components/contact-handle"
import { Swap, useThumb } from "../components/motion"
import { PresenceSummary } from "../components/presence"
import { TeammateTile } from "../components/teammate-tile"
import WorldMap from "../components/WorldMap"

// Order for the "By role" view.
const hierarchyOrder = {
  "Founder": 1,
  "COO": 2,
  "Operations & PM": 3,
  "Art Director": 4,
  "UI/UX Designer": 5,
  "Dashboard Guy": 6,
  "BD": 7,
  "PR": 8,
  "Support": 9,
}

const byName = (a, b) => a.name.localeCompare(b.name)

const byHierarchy = (a, b) => {
  const order = (hierarchyOrder[a.role] || 999) - (hierarchyOrder[b.role] || 999)
  return order !== 0 ? order : byName(a, b)
}

const views = [
  { id: "role", label: "By role" },
  { id: "time", label: "By local time" },
]

// One thumb slides between the options; only its position moves, so a theme
// change recolours it together with the page.
function ViewSwitch({ value, onChange }) {
  const [groupRef, thumb] = useThumb(value)
  return (
    <div
      ref={groupRef}
      role="group"
      aria-label="Arrange teammates"
      className="relative inline-flex rounded-[10px] bg-muted p-[3px]"
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 rounded-[7px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.12)] dark:bg-accent dark:shadow-none"
        style={thumb}
      />
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          aria-pressed={value === view.id}
          data-active={value === view.id}
          onClick={() => onChange(view.id)}
          className={cn(
            "hit-target relative h-8 rounded-[7px] px-3.5 text-[13px] font-medium transition-colors duration-200",
            value === view.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}

// The answer first, in people's names: who you can reach now, and who is next.
function verdictFor(people, now) {
  const ordered = [...people].sort((a, b) => byHierarchy(a.teammate, b.teammate))
  const working = ordered.filter((person) => person.working)
  const off = ordered.filter((person) => !person.working)
  const at = (minutes) => formatClock(new Date(now.getTime() + minutes * 60000))
  const names = (list) => listNames(list.map((person) => person.teammate.name))

  // Everyone who reaches the start (or end) of their day soonest, together.
  const soonest = (list, edge) => {
    const waits = list.map((person) => ({ person, wait: minutesUntil(person.teammate, person.minutes, edge) }))
    const wait = Math.min(...waits.map((item) => item.wait))
    return { wait, who: waits.filter((item) => item.wait === wait).map((item) => item.person) }
  }
  const verb = (who, one, many) => (who.length === 1 ? one : many)

  if (working.length === 0) {
    const next = soonest(off, "start")
    return {
      headline: "Everyone is off right now",
      detail: `${names(next.who)} ${verb(next.who, "starts", "start")} first, at ${at(next.wait)} your time.`,
    }
  }
  if (off.length === 0) {
    const next = soonest(working, "end")
    return {
      headline: "Everyone is at work",
      detail: `${names(next.who)} ${verb(next.who, "finishes", "finish")} first, at ${at(next.wait)} your time.`,
    }
  }
  const next = soonest(off, "start")
  return {
    headline: `${names(working)} ${verb(working, "is", "are")} at work`,
    detail: `${names(next.who)} ${verb(next.who, "starts", "start")} next, at ${at(next.wait)} your time.`,
  }
}

function Timeline() {
  const now = useNow()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get("view") === "time" ? "time" : "role"

  // Other state in the URL (the map's filter) stays as it is.
  const setView = (next) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next === "time") params.set("view", "time")
        else params.delete("view")
        return params
      },
      { replace: true }
    )
  }

  useEffect(() => {
    document.title = "Timeline – Teamline"
  }, [])

  const people = useMemo(
    () => teammates.map((teammate) => ({ teammate, ...describeTeammate(teammate, now) })),
    [now]
  )

  const sorted = useMemo(() => [...people].sort((a, b) => byHierarchy(a.teammate, b.teammate)), [people])

  // One group per shared clock, earliest local time first. People in
  // different places with the same offset (Paris, Munich, Warsaw) sit together.
  const groups = useMemo(() => {
    const byOffset = new Map()
    people.forEach((person) => {
      if (!byOffset.has(person.offset)) byOffset.set(person.offset, [])
      byOffset.get(person.offset).push(person)
    })
    return [...byOffset.entries()]
      .sort(([a], [b]) => a - b)
      .map(([offset, members]) => {
        const places = [...new Set(members.map((person) => person.teammate.timezoneDisplay))]
        const day = describeDayShift(members[0].dayShift)
        return {
          key: String(offset),
          clock: clockParts(members[0].local),
          surface: surfaceFor(members[0].minutes),
          working: members.some((person) => person.working),
          places: places.join(", "),
          relative: [day, describeOffset(offset)].filter(Boolean).join(", "),
          people: members.sort((a, b) => byName(a.teammate, b.teammate)),
        }
      })
  }, [people])

  const working = sorted.filter((person) => person.working).map((person) => person.teammate)
  const { headline, detail } = useMemo(() => verdictFor(people, now), [people, now])

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {/* The headline changes as people start and finish, so it is announced. */}
          <h1
            tabIndex={-1}
            aria-live="polite"
            aria-atomic="true"
            className="text-[28px] font-bold leading-[1.15] tracking-[-0.022em] sm:text-[34px]"
          >
            {headline}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {detail}
            <span className="md:hidden">
              {" "}
              It’s <span className="time-numerals font-medium text-foreground">{formatClock(now)}</span> in{" "}
              {viewerPlace()}.
            </span>
          </p>
        </div>
        <PresenceSummary working={working} off={[]} />
      </header>

      <section aria-labelledby="teammates-heading" className="space-y-4">
        <h2 id="teammates-heading" className="sr-only">
          Teammates
        </h2>
        <ViewSwitch value={view} onChange={setView} />

        <Swap id={view} easeHeight>
          {view === "role" ? (
            // As many columns as fit at 300px or more: one beside an open
            // sidebar on a small laptop, three on a wide screen.
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-2.5">
              {sorted.map(({ teammate, ...time }) => (
                <TeammateTile key={teammate.id} teammate={teammate} {...time} />
              ))}
            </ul>
          ) : (
            // One row per clock, the way World Clock lists cities.
            // Wide: the time on the left, everyone who shares it on the right.
            // Phone: the time and place share the first line, and each person is
            // a single line under it, so a clock with one person is two lines
            // tall instead of five.
            <ul className="space-y-2 sm:space-y-2.5">
              {groups.map((group) => {
                const muted = group.surface.dark ? "text-night-muted" : "text-day-muted"
                return (
                  <li
                    key={group.key}
                    style={group.surface.style}
                    className={cn(
                      "flex flex-col gap-x-8 gap-y-2.5 rounded-2xl border border-tile-line px-3.5 py-3 sm:flex-row sm:items-center sm:gap-y-3 sm:px-4 sm:py-3.5",
                      group.surface.dark ? "text-night-foreground" : "text-day-foreground"
                    )}
                  >
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:w-[264px]">
                      <h3 className="flex shrink-0 items-baseline gap-1 leading-none">
                        <span className="time-numerals text-[28px] font-light tracking-[-0.025em] sm:text-[34px]">
                          {group.clock.digits}
                        </span>
                        {group.clock.period && <span className="text-[13px] font-medium">{group.clock.period}</span>}
                        {!group.working && (
                          <Moon aria-hidden="true" size={14} fill="currentColor" className={cn("ml-1 self-center", muted)} />
                        )}
                        <span className="sr-only">{group.working ? ", in working hours" : ", off hours"}</span>
                      </h3>
                      <p className={cn("min-w-0 text-right text-[12px] leading-snug sm:mt-1.5 sm:text-left sm:text-[13px]", muted)}>
                        <span className="block truncate sm:inline">{group.places}</span>
                        <span className="hidden sm:inline">, </span>
                        <span className="block truncate sm:inline">{group.relative}</span>
                      </p>
                    </div>
                    <ul className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
                      {group.people.map(({ teammate }) => (
                        <li key={teammate.id} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                          <span className="relative flex shrink-0">
                            <Avatar teammate={teammate} size={40} className="max-sm:!h-8 max-sm:!w-8" />
                            <PlatformBadge
                              teammate={teammate}
                              size={18}
                              className="absolute -bottom-1 -right-1 max-sm:!h-[15px] max-sm:!w-[15px]"
                            />
                          </span>
                          <div className="flex min-w-0 flex-1 items-baseline gap-2 sm:block sm:flex-none">
                            <h4 translate="no" className="shrink-0 truncate text-[15px] font-semibold leading-tight">
                              {teammate.name}
                            </h4>
                            <ContactHandle teammate={teammate} className={cn("min-w-0 sm:mt-0.5", muted)} />
                            <p className={cn("ml-auto shrink-0 truncate text-[12px] sm:ml-0 sm:text-[13px]", muted)}>
                              {teammate.role}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
        </Swap>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Where everyone is</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">The shaded side is in night right now.</p>
        </div>
        <WorldMap now={now} people={people} />
      </section>
    </div>
  )
}

export default Timeline;
