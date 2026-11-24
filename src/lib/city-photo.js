import { useEffect, useState } from "react"

/*
  A photo of a city, from Wikipedia.

  Wikipedia's API needs no key, allows browser requests from any site, and
  every image it returns is freely licensed. Credit is given by linking the
  photo to the article it came from.

  Lookup: ask for the article with the city's name. Time-zone city names are
  not always article titles ("New York" is a list of things called New York),
  so if that is missing, a disambiguation page, or has no picture, fall back to
  a search for "<name> city" and take the first result.

  Results are remembered in localStorage, so a returning visitor makes no
  request at all. These are the app's only requests to another site, and
  netlify.toml's Content-Security-Policy names the hosts involved.
*/

const API = "https://en.wikipedia.org/w/api.php"
// Bump the version to throw away everything remembered so far.
const CACHE_KEY = "teamline-city-photo-v2"
const FOUND_FOR = 30 * 24 * 60 * 60 * 1000
const MISSING_FOR = 24 * 60 * 60 * 1000
const SIZE = 500
// Thumbnails come from thumb.wikimedia.org; originals from upload.wikimedia.org.
const IMAGE_HOSTS = ["thumb.wikimedia.org", "upload.wikimedia.org"]

// Time-zone names whose article sits under a different title.
const titles = {
  "New York": "New York City",
  "St Johns": "St. John's, Newfoundland and Labrador",
}

const shared = "format=json&formatversion=2&origin=*&prop=pageimages%7Cinfo&piprop=thumbnail&inprop=url"

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}
  } catch (e) {
    return {}
  }
}

const cached = (city) => {
  const entry = readCache()[city]
  if (!entry) return null
  const age = Date.now() - entry.at
  return age < (entry.src ? FOUND_FOR : MISSING_FOR) ? entry : null
}

const remember = (city, entry) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [city]: { ...entry, at: Date.now() } }))
  } catch (e) {
    // Storage unavailable: it will simply be looked up again next visit.
  }
}

async function ask(query, signal) {
  const response = await fetch(`${API}?action=query&${shared}&pithumbsize=${SIZE}&${query}`, {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  })
  if (!response.ok) throw new Error(`Wikipedia answered ${response.status}`)
  const data = await response.json()
  const page = data.query && data.query.pages && data.query.pages[0]
  if (!page || page.missing || !page.thumbnail) return null
  if (page.pageprops && "disambiguation" in page.pageprops) return null
  // Only ever accept an image from Wikimedia's own image hosts.
  const src = new URL(page.thumbnail.source)
  if (src.protocol !== "https:" || !IMAGE_HOSTS.includes(src.hostname)) return null
  return { src: src.href, title: page.title, page: page.fullurl }
}

async function lookUp(city, signal) {
  const title = encodeURIComponent(titles[city] || city)
  const direct = await ask(`redirects=1&ppprop=disambiguation&prop=pageimages%7Cinfo%7Cpageprops&titles=${title}`, signal)
  if (direct) return direct
  return ask(`generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(`${city} city`)}`, signal)
}

// { status: "loading" | "ready" | "none", src, title, page }
export function useCityPhoto(city) {
  const [photo, setPhoto] = useState(() => {
    const entry = city ? cached(city) : null
    if (!entry) return { status: city ? "loading" : "none" }
    return entry.src ? { status: "ready", ...entry } : { status: "none" }
  })

  useEffect(() => {
    if (!city || cached(city)) return undefined
    const controller = new AbortController()
    lookUp(city, controller.signal)
      .then((found) => {
        remember(city, found || {})
        setPhoto(found ? { status: "ready", ...found } : { status: "none" })
      })
      .catch((error) => {
        // Offline or blocked: show no photo now and try again next visit.
        if (error.name !== "AbortError") setPhoto({ status: "none" })
      })
    return () => controller.abort()
  }, [city])

  return photo
}
