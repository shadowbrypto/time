import { useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
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
  zoneName,
  zoneOffset,
} from "../lib/time"
import { Avatar } from "../components/avatar"
import { ContactHandle, PlatformBadge } from "../components/contact-handle"
import { Swap, useThumb } from "../components/motion"
import { PresenceSummary } from "../components/presence"
import { TeammateTile } from "../components/teammate-tile"
import { SkyBanner } from "../components/sky-glyph"
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
  { id: "time", label: "By time zone" },
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

  // One group per time zone, earliest local time first. People in Paris,
  // Berlin and Warsaw share Central European Time; South Africa and Bulgaria
  // have the same clock today but are different zones, so they stay apart.
  const groups = useMemo(() => {
    const byZone = new Map()
    people.forEach((person) => {
      const name = zoneName(person.teammate.timezone, now)
      if (!byZone.has(name)) byZone.set(name, [])
      byZone.get(name).push(person)
    })
    return [...byZone.entries()]
      .map(([name, members]) => {
        const first = members[0]
        const day = describeDayShift(first.dayShift)
        return {
          key: name,
          name,
          offset: first.offset,
          clock: clockParts(first.local),
          minutes: first.minutes,
          surface: surfaceFor(first.minutes),
          working: members.some((person) => person.working),
          detail: [zoneOffset(first.teammate.timezone, now), day, describeOffset(first.offset)].filter(Boolean).join(", "),
          people: members.sort((x, y) => byName(x.teammate, y.teammate)),
        }
      })
      .sort((x, y) => x.offset - y.offset || x.name.localeCompare(y.name))
  }, [people, now])

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
            // One tile per time zone, in a grid, earliest local time first.
            // Two clearly different parts. The head is that zone's sky right
            // now, with the zone and its time set over the landscape. The body
            // is plain: the people in it, each on two lines (name and place,
            // then handle and role).
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] items-start gap-3">
              {groups.map((group) => (
                <li key={group.key} className="overflow-hidden rounded-2xl border border-tile-line bg-surface">
                  <div className="relative h-[112px] text-white">
                    <SkyBanner minutes={group.minutes} className="absolute inset-0 h-full w-full" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold leading-tight">{group.name}</h3>
                        <p className="time-numerals mt-0.5 truncate text-[13px] leading-tight text-white/75">{group.detail}</p>
                      </div>
                      <p className="flex shrink-0 items-baseline gap-1 leading-none">
                        {!group.working && (
                          <span aria-hidden="true" className="mr-1.5 text-[12px] font-medium text-white/75">
                            off
                          </span>
                        )}
                        <span className="time-numerals text-[30px] font-light tracking-[-0.02em]">{group.clock.digits}</span>
                        {group.clock.period && <span className="text-[13px] font-medium">{group.clock.period}</span>}
                        <span className="sr-only">{group.working ? ", in working hours" : ", off hours"}</span>
                      </p>
                    </div>
                  </div>
                  <ul className="flex min-w-0 flex-col gap-3 px-4 py-3.5">
                    {group.people.map(({ teammate }) => (
                      <li key={teammate.id} className="flex min-w-0 items-center gap-3">
                        <span className="relative flex shrink-0">
                          <Avatar teammate={teammate} size={36} />
                          <PlatformBadge teammate={teammate} size={16} className="absolute -bottom-1 -right-1" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <h4 translate="no" className="truncate text-[15px] font-semibold leading-tight">
                              {teammate.name}
                            </h4>
                            <p className="shrink-0 text-[13px] leading-tight text-muted-foreground">{teammate.timezoneDisplay}</p>
                          </div>
                          <div className="mt-0.5 flex items-baseline justify-between gap-3">
                            <ContactHandle teammate={teammate} className="min-w-0 text-muted-foreground" />
                            <p className="shrink-0 truncate text-[13px] leading-tight text-muted-foreground">{teammate.role}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Swap>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Where everyone is</h2>
        </div>
        <WorldMap now={now} people={people} />
      </section>
    </div>
  )
}

export default Timeline;
