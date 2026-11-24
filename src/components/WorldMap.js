import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { geoCircle, geoEquirectangular, geoPath } from "d3-geo"
import { feature, mesh } from "topojson-client"
import { Moon, RotateCw } from "lucide-react"
import { cn } from "../lib/utils"
import { clockParts, formatClock } from "../lib/time"
import { Avatar } from "./avatar"
import { useListPresence, useThumb } from "./motion"

/*
  The world, lit as it is this minute.

  Countries are solid shapes. The half of the planet facing away from the sun
  is a flat shade with a crisp outline along the line between day and night.
  Countries with teammates are a tone stronger.

  People sit on the map at their own cities. Where cities crowd (Europe), the
  faces nudge apart just far enough not to overlap, and a short line ties each
  one back to its exact spot. The filter (everyone, working, off) fades out
  whoever it leaves out and lets the rest settle back toward their cities.
*/

// Served from this site (see public/assets/geo/SOURCES.md), so the map needs no
// third-party request and the Content-Security-Policy can stay at 'self'.
const GEOGRAPHY_URL = `${import.meta.env.BASE_URL}assets/geo/countries-110m.json`

// 78°N to 57°S: the inhabited world, no Antarctica. One unit is 3 degrees.
const STEP = 3
const COLS = 360 / STEP
const LAT_TOP = 78
const LAT_BOTTOM = -57
const ROWS = (LAT_TOP - LAT_BOTTOM) / STEP
const ASPECT = ROWS / COLS

const TRAVEL = "cubic-bezier(0.45, 0, 0.1, 1)"
const ARRIVAL = "cubic-bezier(0.25, 0.8, 0.25, 1)"

const places = {
  "Asia/Dubai": { coordinates: [55.2708, 25.2048], country: "United Arab Emirates" },
  "America/New_York": { coordinates: [-74.0059, 40.7128], country: "United States of America" },
  "Pacific/Honolulu": { coordinates: [-157.8583, 21.3099], country: "United States of America" },
  "America/Chicago": { coordinates: [-87.6298, 41.8781], country: "United States of America" },
  "Africa/Johannesburg": { coordinates: [28.0473, -26.2041], country: "South Africa" },
  "Europe/Paris": { coordinates: [2.3522, 48.8566], country: "France" },
  "Europe/London": { coordinates: [-0.1276, 51.5074], country: "United Kingdom" },
  "America/Argentina/Buenos_Aires": { coordinates: [-58.3816, -34.6037], country: "Argentina" },
  "Europe/Sofia": { coordinates: [23.3219, 42.6977], country: "Bulgaria" },
  "Europe/Berlin": { coordinates: [13.405, 52.52], country: "Germany" },
  "America/Vancouver": { coordinates: [-123.1207, 49.2827], country: "Canada" },
  "Europe/Warsaw": { coordinates: [21.0122, 52.2297], country: "Poland" },
}
const teamCountries = new Set(Object.values(places).map((place) => place.country))

const xOf = (lon) => (lon + 180) / 360
const yOf = (lat) => (LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)

// Where the sun is directly overhead right now: [longitude, latitude].
function subsolarPoint(now) {
  const yearStart = Date.UTC(now.getUTCFullYear(), 0, 0)
  const dayOfYear = (now.getTime() - yearStart) / 86400000
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10))
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60
  const longitude = ((((12 - utcHours) * 15 + 180) % 360) + 360) % 360 - 180
  return [longitude, declination]
}

// A plain latitude/longitude projection, so a city's place on the map is a
// simple fraction of its width and height (see xOf and yOf).
const projection = geoEquirectangular()
  .scale(COLS / (2 * Math.PI))
  .translate([COLS / 2, LAT_TOP / STEP])
const path = geoPath(projection)

// The hemisphere facing away from the sun. The fill and the day/night line
// are separate paths: stroking the filled shape would also draw a line along
// every map edge it is clipped by.
function nightShape(sun) {
  const hemisphere = geoCircle().center([sun[0] + 180, -sun[1]]).radius(90).precision(2)()
  return {
    fill: path(hemisphere),
    line: path({ type: "LineString", coordinates: hemisphere.coordinates[0] }),
  }
}

const emptyShapes = { countries: [], borders: "" }
let cachedShapes = null

function useShapes() {
  const [state, setState] = useState(() =>
    cachedShapes ? { status: "ready", shapes: cachedShapes } : { status: "loading", shapes: emptyShapes }
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (cachedShapes) return undefined
    let cancelled = false
    setState({ status: "loading", shapes: emptyShapes })
    fetch(GEOGRAPHY_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Map request failed: ${response.status}`)
        return response.json()
      })
      .then((world) => {
        const countries = feature(world, world.objects.countries)
          .features.map((country) => ({
            id: country.id || country.properties.name,
            team: teamCountries.has(country.properties.name),
            d: path(country),
          }))
          .filter((shape) => shape.d)
        // Only the borders two countries share. Stroking each country instead
        // would outline coasts and draw a line down the map's left and right
        // edges, where countries are cut at the date line.
        const borders = path(mesh(world, world.objects.countries, (a, b) => a !== b)) || ""
        const shapes = { countries, borders }
        cachedShapes = shapes
        if (!cancelled) setState({ status: "ready", shapes })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", shapes: emptyShapes })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { ...state, retry }
}

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

// Let crowded pins push each other apart while a gentle pull keeps each one
// near its own city. Runs a fixed number of rounds, so the same people always
// land in the same places.
function settle(pins, width, height, gap) {
  for (let round = 0; round < 80; round += 1) {
    for (let i = 0; i < pins.length; i += 1) {
      for (let j = i + 1; j < pins.length; j += 1) {
        const a = pins[i]
        const b = pins[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        let distance = Math.hypot(dx, dy)
        const need = a.r + b.r + gap
        if (distance >= need) continue
        if (distance < 0.01) {
          // Same spot: part them along a fixed diagonal.
          dx = 0.6
          dy = (i + j) % 2 === 0 ? 0.8 : -0.8
          distance = 1
        }
        const push = (need - distance) / 2
        a.x -= (dx / distance) * push
        a.y -= (dy / distance) * push
        b.x += (dx / distance) * push
        b.y += (dy / distance) * push
      }
    }
    pins.forEach((pin) => {
      pin.x += (pin.dotX - pin.x) * 0.06
      pin.y += (pin.dotY - pin.y) * 0.06
      pin.x = Math.max(pin.r + 4, Math.min(width - pin.r - 4, pin.x))
      pin.y = Math.max(pin.half + 4, Math.min(height - pin.half - 4, pin.y))
    })
  }
  return pins
}

const filters = [
  { id: "all", label: "Everyone", test: () => true },
  { id: "working", label: "Working", test: (person) => person.working },
  { id: "off", label: "Off", test: (person) => !person.working },
]

function PersonRow({ person }) {
  const { digits, period } = clockParts(person.local)
  return (
    <li className="flex items-center gap-2.5">
      <Avatar teammate={person.teammate} size={28} loading="lazy" />
      <span className="min-w-0 flex-1">
        <span translate="no" className="block truncate text-[13px] font-semibold leading-tight">
          {person.teammate.name}
        </span>
        <span className="block truncate text-[12px] text-muted-foreground">{person.teammate.role}</span>
      </span>
      <span className="time-numerals flex shrink-0 items-baseline text-[15px]">
        {!person.working && (
          <Moon aria-hidden="true" size={11} fill="currentColor" className="mr-1 self-center text-muted-foreground" />
        )}
        {digits}
        {period && <span className="ml-0.5 text-[11px] font-medium">{period}</span>}
        <span className="sr-only">{person.working ? ", in working hours" : ", off hours"}</span>
      </span>
    </li>
  )
}

// One option of the filter: its dot, its name and how many it shows.
function FilterLabel({ item, count }) {
  return (
    <>
      {item.id !== "all" && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: item.id === "working" ? "hsl(var(--positive))" : "hsl(var(--map-off))" }}
        />
      )}
      {item.label}
      <span className="time-numerals font-normal">{count}</span>
    </>
  )
}

const filterOption = "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium"

function WorldMap({ now, people }) {
  // The filter lives in the URL with the rest of the page's state.
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = filters.some((item) => item.id === searchParams.get("map")) ? searchParams.get("map") : "all"
  const setFilter = (next) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next === "all") params.delete("map")
        else params.set("map", next)
        return params
      },
      { replace: true }
    )
  const [filterRef, thumb, thumbBox, thumbTravels] = useThumb(filter)
  const [active, setActive] = useState(null)
  const [wrapRef, width] = useWidth()
  const { status, shapes, retry } = useShapes()

  // Faces shrink on a phone so a whole continent still fits.
  const avatar = width >= 640 ? 28 : 20
  const overlap = avatar >= 28 ? 10 : 7
  const mapHeight = Math.round(width * ASPECT)

  // One pin per city; people who share a city share a pin.
  const cities = useMemo(() => {
    const byZone = new Map()
    people.forEach((person) => {
      const place = places[person.teammate.timezone]
      if (!place) return
      if (!byZone.has(person.teammate.timezone)) {
        const [lon, lat] = place.coordinates
        byZone.set(person.teammate.timezone, {
          key: person.teammate.timezone,
          label: person.teammate.timezoneDisplay,
          fx: xOf(lon),
          fy: yOf(lat),
          people: [],
        })
      }
      byZone.get(person.teammate.timezone).people.push(person)
    })
    return [...byZone.values()]
  }, [people])

  const counts = useMemo(
    () => Object.fromEntries(filters.map((item) => [item.id, people.filter(item.test).length])),
    [people]
  )

  const pins = useMemo(() => {
    if (width === 0) return []
    const test = filters.find((item) => item.id === filter).test
    const laid = cities.map((city) => {
      const shown = city.people.filter(test)
      const faces = Math.max(1, shown.length || city.people.length)
      const pinWidth = avatar + (faces - 1) * (avatar - overlap)
      const dotX = city.fx * width
      const dotY = city.fy * mapHeight
      return {
        ...city,
        shown,
        visible: shown.length > 0,
        width: pinWidth,
        r: pinWidth / 2,
        half: avatar / 2,
        dotX,
        dotY,
        x: dotX,
        y: dotY,
      }
    })
    // Only the pins on show take up room; a hidden one waits on its city.
    settle(laid.filter((pin) => pin.visible), width, mapHeight, width >= 640 ? 5 : 3)
    return laid
  }, [cities, filter, width, mapHeight, avatar, overlap])

  const sun = useMemo(() => subsolarPoint(now), [now])
  const night = useMemo(() => nightShape(sun), [sun])

  const open = pins.find((pin) => pin.key === active && pin.visible)
  const openList = useMemo(() => (open ? [open] : []), [open])
  // The popover fades in and out, and leaves from where it was.
  const popovers = useListPresence(openList, (pin) => pin.key, 160)
  const ready = status === "ready" && width > 0
  return (
    <div>
      <div ref={wrapRef} className="relative">
        <div
          className="relative overflow-hidden rounded-2xl border border-tile-line bg-surface"
          style={{ aspectRatio: `${COLS} / ${ROWS}` }}
        >
          {status === "ready" && (
            <svg
              viewBox={`0 0 ${COLS} ${ROWS}`}
              preserveAspectRatio="none"
              className="h-full w-full"
              role="img"
              aria-label="World map with the night side shaded"
            >
              {shapes.countries.map((shape) => (
                <path
                  key={shape.id}
                  d={shape.d}
                  fill={shape.team ? "hsl(var(--map-team))" : "hsl(var(--map-land))"}
                />
              ))}
              <path
                d={shapes.borders}
                fill="none"
                stroke="hsl(var(--map-border))"
                strokeWidth={0.75}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path d={night.fill} fill="hsl(var(--map-night))" />
              <path
                d={night.line}
                fill="none"
                stroke="hsl(var(--map-night-line))"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {status === "loading" && (
            <p role="status" className="absolute inset-0 flex items-center justify-center text-[13px] text-muted-foreground">
              Loading the map…
            </p>
          )}

          {status === "error" && (
            <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[13px] text-muted-foreground">
                The map didn’t load. Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-muted px-3.5 text-[13px] font-medium transition-colors hover:bg-accent"
              >
                <RotateCw aria-hidden="true" size={14} />
                Reload map
              </button>
            </div>
          )}

          {ready && counts[filter] === 0 && (
            <p className="absolute left-4 top-3 text-[13px] text-muted-foreground">
              {filter === "working" ? "Nobody is in working hours right now." : "Nobody is off right now."}
            </p>
          )}
        </div>

        {ready && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {pins.map((pin) => {
              const lit = pin.key === active
              return (
                <g key={pin.key} style={{ opacity: pin.visible ? 1 : 0, transition: `opacity 220ms ${ARRIVAL}` }}>
                  {Math.hypot(pin.x - pin.dotX, pin.y - pin.dotY) > pin.half && (
                    <line
                      x1={pin.x}
                      y1={pin.y}
                      x2={pin.dotX}
                      y2={pin.dotY}
                      stroke={lit ? "hsl(var(--foreground))" : "hsl(var(--map-line))"}
                      strokeWidth={lit ? 1.5 : 1}
                    />
                  )}
                  <circle
                    cx={pin.dotX}
                    cy={pin.dotY}
                    r={lit ? 4.5 : 3}
                    fill="hsl(var(--foreground))"
                    stroke="hsl(var(--surface))"
                    strokeWidth={1.5}
                  />
                </g>
              )
            })}
          </svg>
        )}

        {ready &&
          pins.map((pin, pinIndex) => {
            const faces = pin.visible ? pin.shown : pin.people
            return (
              <button
                key={pin.key}
                type="button"
                tabIndex={pin.visible ? 0 : -1}
                aria-hidden={pin.visible ? undefined : true}
                aria-label={`${pin.label}, ${formatClock(pin.people[0].local)}: ${faces.map((person) => person.teammate.name).join(", ")}`}
                aria-describedby={pin.visible ? `map-pin-${pinIndex}` : undefined}
                onMouseEnter={() => setActive(pin.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(pin.key)}
                onBlur={() => setActive(null)}
                className={cn(
                  "absolute left-0 top-0 flex rounded-full",
                  // Small faces on a phone keep a finger-sized target around them.
                  avatar < 28 && "before:absolute before:-inset-3 before:rounded-full before:content-['']",
                  !pin.visible && "pointer-events-none"
                )}
                style={{
                  width: pin.width,
                  height: avatar,
                  zIndex: pin.key === active ? 20 : 10,
                  opacity: pin.visible ? 1 : 0,
                  transform: `translate(${pin.x - pin.width / 2}px, ${pin.y - avatar / 2}px) scale(${pin.visible ? 1 : 0.5})`,
                  transition: `transform 360ms ${TRAVEL}, opacity 200ms ${ARRIVAL}`,
                }}
              >
                {faces.map((person, index) => (
                  <Avatar
                    key={person.teammate.id}
                    teammate={person.teammate}
                    size={avatar}
                    loading="lazy"
                    className={cn(
                      "shadow-[0_1px_4px_rgb(0_0_0/0.35)] ring-2 ring-white",
                      index > 0 && (avatar >= 28 ? "-ml-2.5" : "-ml-[7px]")
                    )}
                  />
                ))}
                {/* The photo wears a plain white edge, like a map pin. Status is
                    one small dot on the pin's corner, the same green or grey dot
                    the filter uses, instead of a coloured ring fighting the art. */}
                <span
                  aria-hidden="true"
                  className="absolute rounded-full shadow-[0_0_0_1.5px_white]"
                  style={{
                    width: avatar >= 28 ? 6 : 5,
                    height: avatar >= 28 ? 6 : 5,
                    right: 1,
                    bottom: 1,
                    background: faces.some((person) => person.working) ? "hsl(var(--positive))" : "hsl(var(--map-off))",
                  }}
                />
              </button>
            )
          })}

        {/* What each pin's popover says, for screen readers, without
            announcing it on every hover. */}
        {ready &&
          pins.map((pin, pinIndex) => (
            <span key={pin.key} id={`map-pin-${pinIndex}`} className="sr-only">
              {pin.shown
                .map((person) => `${person.teammate.name}, ${person.teammate.role}, ${person.working ? "in working hours" : "off hours"}`)
                .join("; ")}
            </span>
          ))}

        {/* The filter lives on the map, in the empty ocean of its lower-left corner.
            A phone's map is too small to spare the room, so there it sits just below.
            One dark thumb slides between the options; a copy of the labels in
            the thumb's colours is cut to the thumb's shape, so the text under
            it turns light exactly as it passes. */}
        {ready && (
          <div
            ref={filterRef}
            role="group"
            aria-label="Show on the map"
            className="relative z-20 mt-2 inline-flex rounded-full border border-border/60 bg-surface p-[3px] sm:absolute sm:bottom-2.5 sm:left-2.5 sm:mt-0 sm:shadow-[0_2px_10px_rgb(0_0_0/0.12)]"
          >
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                data-active={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(filterOption, "hit-target text-muted-foreground transition-colors hover:text-foreground")}
              >
                <FilterLabel item={item} count={counts[item.id]} />
              </button>
            ))}
            <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 rounded-full bg-foreground" style={thumb} />
            {thumbBox && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex p-[3px] text-background"
                style={{
                  clipPath: `inset(${thumbBox.y}px ${thumbBox.groupW - thumbBox.x - thumbBox.w}px ${thumbBox.groupH - thumbBox.y - thumbBox.h}px ${thumbBox.x}px round 999px)`,
                  transition: thumbTravels ? `clip-path 280ms ${TRAVEL}` : "none",
                }}
              >
                {filters.map((item) => (
                  <span key={item.id} className={filterOption}>
                    <FilterLabel item={item} count={counts[item.id]} />
                  </span>
                ))}
              </span>
            )}
          </div>
        )}

        {ready &&
          popovers.map(({ key, item: pin, phase }) => {
            const below = pin.y <= mapHeight / 2
            return (
              <div
                key={key}
                aria-hidden="true"
                className="pointer-events-none absolute z-30 w-64 rounded-xl border border-border/60 bg-popover p-3 text-popover-foreground shadow-[0_8px_30px_rgb(0_0_0/0.18)]"
                style={{
                  left: Math.max(0, Math.min(width - 256, pin.x - 128)),
                  ...(below ? { top: pin.y + avatar / 2 + 8 } : { bottom: mapHeight - pin.y + avatar / 2 + 8 }),
                  opacity: phase === "in" ? 1 : 0,
                  transform: phase === "in" ? "none" : `translateY(${below ? -4 : 4}px)`,
                  transition:
                    phase === "in"
                      ? `opacity 160ms ${ARRIVAL}, transform 200ms ${ARRIVAL}`
                      : "opacity 120ms linear, transform 160ms linear",
                }}
              >
                <p className="mb-2 text-[13px] font-semibold">{pin.label}</p>
                <ul className="space-y-2">
                  {pin.shown.map((person) => (
                    <PersonRow key={person.teammate.id} person={person} />
                  ))}
                </ul>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default memo(WorldMap)
