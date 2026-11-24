import { useEffect, useState } from "react"
import { cn } from "../lib/utils"
import { Facepile } from "./avatar"

const phoneQuery = "(max-width: 639px)"

// True on phone-width screens, so the faces can be drawn smaller there.
function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(phoneQuery).matches)
  useEffect(() => {
    const media = window.matchMedia(phoneQuery)
    const onChange = (event) => setPhone(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])
  return phone
}

// A count with everyone's face, always shown in full: nothing to hover or
// open. Each face names its person in a tooltip. On a phone the faces are
// smaller so a full team still fits on one line.
function PresenceGroup({ label, people, working }) {
  const phone = useIsPhone()

  if (people.length === 0) return null

  return (
    <div
      role="group"
      aria-label={`${people.length} ${label.toLowerCase()}: ${people.map((p) => p.name).join(", ")}`}
      className="flex min-h-[44px] max-w-full items-center gap-2.5 rounded-full bg-surface py-1.5 pl-3.5 pr-2"
    >
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 shrink-0 rounded-full", working ? "bg-positive" : "bg-muted-foreground/50")}
      />
      <span className="whitespace-nowrap text-[13px] font-medium">
        <span className="time-numerals">{people.length}</span> {label.toLowerCase()}
      </span>
      <Facepile people={people} showAll size={phone ? 22 : 28} />
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
