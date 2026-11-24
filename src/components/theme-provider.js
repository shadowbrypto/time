import { createContext, useContext, useEffect, useMemo, useState } from "react"

const ThemeProviderContext = createContext({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
})

export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

const systemQuery = "(prefers-color-scheme: dark)"

const readStored = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback
  } catch (e) {
    return fallback
  }
}

// Matches --background in index.css so the browser chrome blends with the page.
const themeColors = { light: "#eeeef2", dark: "#000000" }

const resolve = (theme, systemDark) => (theme === "system" ? (systemDark ? "dark" : "light") : theme)

// Swap the theme class with transitions off for that one style change, so
// every surface (the page, the active nav pill, the segmented thumbs) takes
// its new colour in the same frame. Transitions come back straight after, so
// whatever moves because of the change (a thumb sliding to the new choice)
// still moves.
function applyTheme(resolved) {
  const root = window.document.documentElement
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", themeColors[resolved])
  const other = resolved === "dark" ? "light" : "dark"
  if (root.classList.contains(resolved) && !root.classList.contains(other)) return
  root.classList.add("theme-switching")
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  void root.offsetHeight
  root.classList.remove("theme-switching")
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}) {
  const [theme, setThemeState] = useState(() => readStored(storageKey, defaultTheme))
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(systemQuery).matches)

  // Follow the OS while the choice is "system".
  useEffect(() => {
    const media = window.matchMedia(systemQuery)
    const onChange = (event) => setSystemDark(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  const resolvedTheme = resolve(theme, systemDark)

  // Covers the system theme changing underneath "Match system".
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next) => {
        try {
          localStorage.setItem(storageKey, next)
        } catch (e) {
          // Private mode: the choice still applies for this visit.
        }
        // Repaint now, before React re-renders, so the controls that move
        // in response (the thumb) travel with transitions back on.
        applyTheme(resolve(next, systemDark))
        setThemeState(next)
      },
    }),
    [theme, resolvedTheme, storageKey, systemDark]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
