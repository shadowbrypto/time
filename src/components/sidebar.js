import { useState, useEffect } from "react"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import { useTheme } from "./theme-provider"
import { useNavigate, useLocation } from "react-router-dom"

const menuItems = [
  {
    title: "Timeline",
    icon: "⏰",
    href: "/timeline"
  },
  {
    title: "Scheduler",
    icon: "📅",
    href: "/scheduler"
  }
]

export function Sidebar({ className }) {
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Auto-collapse on mobile screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true)
      }
    }

    // Check on initial load
    handleResize()
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className={cn(
      "flex flex-col h-screen bg-card border-r border-border",
      collapsed ? "w-16" : "w-64",
      "transition-all duration-300",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <h1 className="text-xl font-bold text-foreground">Time2Sync</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? "→" : "←"}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.href}
            variant={location.pathname === item.href ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              collapsed ? "px-2" : "px-4"
            )}
            onClick={() => navigate(item.href)}
          >
            <span className="text-lg">{item.icon}</span>
            {!collapsed && (
              <span className="ml-3 text-sm">{item.title}</span>
            )}
          </Button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start",
            collapsed ? "px-2" : "px-4"
          )}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {collapsed ? (
            <div className="w-6 h-6 flex items-center justify-center mx-auto">
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </div>
          ) : (
            <>
              <span className="text-sm mr-3">Theme</span>
              <div className={cn(
                "w-12 h-6 rounded-full border-2 border-border transition-colors cursor-pointer ml-auto",
                theme === "dark" ? "bg-primary" : "bg-muted"
              )}>
                <div className={cn(
                  "w-4 h-4 rounded-full bg-background shadow-sm transition-transform duration-200 mt-0.5",
                  theme === "dark" ? "translate-x-6 ml-0.5" : "translate-x-0 ml-0.5"
                )}></div>
              </div>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}