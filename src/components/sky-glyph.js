import { useId } from "react"

/*
  A porthole onto someone's sky, drawn from their local time.

  The sun climbs from the left horizon at 6, stands highest at midday and sets
  on the right; the moon takes the same path through the night. The sky behind
  it runs through night, dawn, day, golden hour and dusk, stars come out as it
  darkens, and the moon shows its real phase for today's date. Flat colour
  throughout: no blur and no glow.

  It is decoration with meaning, so it is hidden from assistive tech; the time
  itself is always in text beside it.
*/

const DAY = 1440
const SUNRISE = 6 * 60
const SUNSET = 18.5 * 60

// Sky colours through the day: [minute, top of sky, bottom of sky].
const skies = [
  [0, "#0a0f2c", "#1a2152"],
  [270, "#0a0f2c", "#1a2152"],
  [330, "#27306f", "#c56a6a"],
  [390, "#4f7fcf", "#ffc37d"],
  [510, "#3f9bee", "#a9d8ff"],
  [960, "#3f9bee", "#a9d8ff"],
  [1065, "#5a78cc", "#ffb56e"],
  [1125, "#3a3a84", "#d2637a"],
  [1200, "#151a48", "#3a2f6b"],
  [1290, "#0a0f2c", "#1a2152"],
  [1440, "#0a0f2c", "#1a2152"],
]

const channels = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
const blend = (a, b, t) => {
  const [x, y] = [channels(a), channels(b)]
  return `rgb(${x.map((value, index) => Math.round(value + (y[index] - value) * t)).join(" ")})`
}

function skyAt(minutes) {
  const next = skies.findIndex(([at]) => at > minutes)
  const [from, to] = [skies[Math.max(0, next - 1)], skies[next === -1 ? skies.length - 1 : next]]
  const t = to[0] === from[0] ? 0 : (minutes - from[0]) / (to[0] - from[0])
  return { top: blend(from[1], to[1], t), bottom: blend(from[2], to[2], t) }
}

// 0 at new moon, 0.5 at full, from the length of the lunar month.
function moonPhase(date) {
  const month = 29.530588853
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000
  return (((days % month) + month) % month) / month
}

// The lit part of the moon: half a disc, bulged or bitten by the terminator.
function moonLight(cx, cy, r, phase) {
  const waxing = phase < 0.5
  const terminator = Math.abs(Math.cos(2 * Math.PI * phase)) * r
  const gibbous = phase > 0.25 && phase < 0.75
  const side = waxing ? 1 : 0
  return `M${cx} ${cy - r}A${r} ${r} 0 0 ${side} ${cx} ${cy + r}A${terminator} ${r} 0 0 ${gibbous ? side : 1 - side} ${cx} ${cy - r}Z`
}

const stars = [
  [8, 9, 0.9],
  [27, 7, 0.7],
  [20, 15, 0.55],
  [6, 20, 0.6],
  [30, 18, 0.8],
]

export function SkyGlyph({ minutes, size = 36, className }) {
  const id = useId()
  const minute = ((minutes % DAY) + DAY) % DAY
  const isDay = minute >= SUNRISE && minute < SUNSET
  const sky = skyAt(minute)

  // Progress along the arc, 0 at rising and 1 at setting, for whichever body is up.
  const progress = isDay
    ? (minute - SUNRISE) / (SUNSET - SUNRISE)
    : ((minute - SUNSET + DAY) % DAY) / (DAY - (SUNSET - SUNRISE))
  const x = 5 + 26 * progress
  const y = 27 - 17 * Math.sin(Math.PI * progress)

  // How dark it is, for the stars: full at night, none by day.
  const darkness = isDay ? 0 : Math.min(1, Math.min(progress, 1 - progress) * 5)
  // The sun warms toward the horizon.
  const low = 1 - Math.sin(Math.PI * progress)
  const phase = moonPhase(new Date())

  return (
    <svg aria-hidden="true" viewBox="0 0 36 36" width={size} height={size} className={className}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
        <clipPath id={`${id}-port`}>
          <circle cx="18" cy="18" r="18" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-port)`}>
        <rect width="36" height="36" fill={`url(#${id}-sky)`} />
        {stars.map(([sx, sy, strength]) => (
          <circle key={`${sx}-${sy}`} cx={sx} cy={sy} r="0.7" fill="#fff" opacity={darkness * strength} />
        ))}
        {isDay ? (
          <>
            <circle cx={x} cy={y} r="8" fill="#fff" opacity="0.16" />
            <circle cx={x} cy={y} r="5.5" fill={blend("#ffd84d", "#ff8a3d", low)} />
          </>
        ) : (
          <>
            <circle cx={x} cy={y} r="5.5" fill="#ffffff" opacity="0.14" />
            <path d={moonLight(x, y, 5.5, phase)} fill="#f6f1df" />
          </>
        )}
        {/* Hills along the bottom: the sun and moon rise from behind them. */}
        <path d="M0 29C7 24 12 27 18 28S30 24 36 27V36H0Z" fill="#000" opacity="0.28" />
        <path d="M0 32C9 28 16 31 22 31S31 29 36 31V36H0Z" fill="#000" opacity="0.32" />
      </g>
      <circle cx="18" cy="18" r="17.5" fill="none" stroke="currentColor" strokeOpacity="0.14" />
    </svg>
  )
}

/*
  The same sky as a wide banner, for the head of a time-zone tile.

  The upper part is open sky, where the sun or moon travels; the lower part is
  a dark landscape in the colours of that hour. Text set over the landscape is
  white at every time of day, so nothing has to change colour as the sky does.
*/
export function SkyBanner({ minutes, className }) {
  const id = useId()
  const minute = ((minutes % DAY) + DAY) % DAY
  const isDay = minute >= SUNRISE && minute < SUNSET
  const sky = skyAt(minute)
  const progress = isDay
    ? (minute - SUNRISE) / (SUNSET - SUNRISE)
    : ((minute - SUNSET + DAY) % DAY) / (DAY - (SUNSET - SUNRISE))
  const x = 40 + 320 * progress
  const y = 60 - 40 * Math.sin(Math.PI * progress)
  const darkness = isDay ? 0 : Math.min(1, Math.min(progress, 1 - progress) * 5)
  const low = 1 - Math.sin(Math.PI * progress)
  const phase = moonPhase(new Date())
  // The land takes the hour's colour, deepened toward navy rather than black,
  // dark enough for white text at midday and at midnight alike.
  const far = blend(sky.bottom, "#0b1c3a", 0.5)
  const near = blend(sky.bottom, "#081428", 0.82)

  return (
    <svg aria-hidden="true" viewBox="0 0 400 112" preserveAspectRatio="xMidYMid slice" className={className}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="0.62" stopColor={sky.bottom} />
        </linearGradient>
      </defs>
      <rect width="400" height="112" fill={`url(#${id}-sky)`} />
      {bannerStars.map(([sx, sy, strength]) => (
        <circle key={`${sx}-${sy}`} cx={sx} cy={sy} r="1" fill="#fff" opacity={darkness * strength} />
      ))}
      {isDay ? (
        <>
          <circle cx={x} cy={y} r="17" fill="#fff" opacity="0.16" />
          <circle cx={x} cy={y} r="11" fill={blend("#ffd84d", "#ff8a3d", low)} />
        </>
      ) : (
        <>
          <circle cx={x} cy={y} r="11" fill="#ffffff" opacity="0.14" />
          <path d={moonLight(x, y, 11, phase)} fill="#f6f1df" />
        </>
      )}
      <path d="M0 62C40 50 70 58 110 60S170 46 215 54 290 62 330 52 380 54 400 50V112H0Z" fill={far} />
      <path d="M0 70C50 62 90 70 140 68S230 60 270 66 350 70 400 62V112H0Z" fill={near} />
    </svg>
  )
}

const bannerStars = [
  [22, 12, 0.9], [64, 30, 0.6], [108, 9, 0.75], [150, 26, 0.5], [196, 12, 0.85],
  [238, 32, 0.55], [276, 10, 0.7], [318, 24, 0.9], [356, 8, 0.6], [384, 30, 0.75],
]
