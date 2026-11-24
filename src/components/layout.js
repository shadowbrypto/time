import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { MobileBar, Sidebar, TabBar } from "./sidebar"
import { TooltipLayer } from "./tooltip"

// After moving to another page, start the reader (and the keyboard) at its
// headline, as a full page load would. Not on first load, and not when only
// the query string changes (the Scheduler keeps its plan there).
function useFocusHeadingOnNavigate() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)

  useEffect(() => {
    const from = previous.current
    previous.current = pathname
    if (from === pathname || from === "/") return
    const main = document.getElementById("main")
    if (main) main.scrollTop = 0
    const heading = document.querySelector("#main h1")
    if (heading) heading.focus({ preventScroll: true })
  }, [pathname])
}

export function Layout({ children }) {
  useFocusHeadingOnNavigate()

  return (
    <div className="flex h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto outline-none">
        <div className="mx-auto max-w-[1200px] px-4 pb-28 pt-3 sm:px-6 md:pb-12 md:pt-10 lg:px-10">
          <MobileBar />
          {children}
        </div>
      </main>
      <TabBar />
      <TooltipLayer />
    </div>
  )
}
