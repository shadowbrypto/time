import { useEffect, useState } from "react"
import { cn } from "../lib/utils"

const X_PATH =
  "M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z"

// The X mark is a single glyph that is black or white depending on its
// ground, so it is drawn in the text colour. The others keep their colours.
function XMark({ size }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 1200 1227" className="shrink-0 p-px">
      <path fill="currentColor" d={X_PATH} />
    </svg>
  )
}

function ImageMark({ src, size }) {
  return <img src={src} alt="" width={size} height={size} draggable={false} className="shrink-0" />
}

// Where each handle leads. Slack has no public profile URL without the
// workspace, so its handle is copied instead of opened.
const platforms = {
  telegram: {
    label: "Telegram",
    mark: (size) => <ImageMark src="/assets/brands/telegram.svg" size={size} />,
    href: (handle) => `https://t.me/${handle}`,
  },
  twitter: {
    label: "X",
    mark: (size) => <XMark size={size} />,
    href: (handle) => `https://x.com/${handle}`,
  },
  slack: {
    label: "Slack",
    mark: (size) => <ImageMark src="/assets/brands/slack.svg" size={size} />,
  },
}

const platformOf = (teammate) => (teammate.contact ? platforms[teammate.contact.platform] : null)

// The platform's logo on a small white disc, to sit on the corner of an
// avatar. White whatever the theme, as app icons are, so the logo keeps its
// own colours and the X mark stays black.
export function PlatformBadge({ teammate, size = 18, className }) {
  const platform = platformOf(teammate)
  if (!platform) return null
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-full bg-white text-black shadow-[0_0_0_1.5px_rgb(0_0_0/0.12)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      {platform.mark(Math.round(size * 0.66))}
    </span>
  )
}

// Just the handle: the avatar beside it already wears the platform's logo.
const base =
  "hit-target inline-flex max-w-full items-center rounded-[4px] text-[13px] underline-offset-2 hover:underline"

// Words that take the handle's place for a moment. All of them share one
// cell, so the control is as wide as the longest and nothing beside it moves
// when one replaces another.
const notes = {
  copied: "Copied",
  failed: "Couldn’t copy",
}

function Variants({ handle, status }) {
  return (
    <span className="grid min-w-0 text-left">
      <span
        translate="no"
        className="col-start-1 row-start-1 truncate transition-opacity duration-150"
        style={{ opacity: status === "idle" ? 1 : 0 }}
      >
        {handle}
      </span>
      {Object.entries(notes).map(([id, text]) => (
        <span
          key={id}
          aria-hidden="true"
          className="col-start-1 row-start-1 truncate transition-opacity duration-150"
          style={{ opacity: status === id ? 1 : 0 }}
        >
          {text}
        </span>
      ))}
    </span>
  )
}

// A teammate's preferred way to be reached. Telegram and X open the profile;
// Slack copies the handle, and says so whether it worked or not.
export function ContactHandle({ teammate, className }) {
  const [status, setStatus] = useState("idle")
  const contact = teammate.contact
  const platform = platformOf(teammate)

  useEffect(() => {
    if (status === "idle") return undefined
    const timer = setTimeout(() => setStatus("idle"), status === "failed" ? 2600 : 1600)
    return () => clearTimeout(timer)
  }, [status])

  if (!platform) return null

  const handle = `@${contact.handle}`

  if (platform.href) {
    return (
      <a
        href={platform.href(contact.handle)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Message ${teammate.name} on ${platform.label}, ${handle}`}
        data-tip={`Open in ${platform.label}`}
        className={cn(base, className)}
      >
        <span translate="no" className="truncate">
          {handle}
        </span>
      </a>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(handle)
      setStatus("copied")
    } catch (e) {
      // Blocked: say so; the handle comes back to select by hand.
      setStatus("failed")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${teammate.name}’s ${platform.label} handle, ${handle}`}
        data-tip={status === "idle" ? `Copy ${platform.label} handle` : undefined}
        className={cn(base, className)}
      >
        <Variants handle={handle} status={status} />
      </button>
      <span role="status" className="sr-only">
        {status === "copied" && `Copied ${handle}`}
        {status === "failed" && `Couldn’t copy ${handle}. Select it to copy it by hand.`}
      </span>
    </>
  )
}
