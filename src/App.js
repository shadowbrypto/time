import { ThemeProvider } from "./components/theme-provider"
import { Layout } from "./components/layout"
import { teammates, getTeammateLocalTime, formatTime, getOnlineStatus } from "./data/teammates"
import { useState, useEffect } from "react"

function TimelineContent() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Team Timeline</h1>
        <div className="text-right">
          <div className="text-base sm:text-lg font-mono">
            {formatTime(currentTime)}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {teammates.map((teammate) => {
          const localTime = getTeammateLocalTime(teammate)
          
          return (
            <div key={teammate.id} className="bg-card p-3 sm:p-4 rounded-xl border border-border hover:border-border/60 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5 touch-manipulation">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 p-0.5 shadow-lg dark:shadow-white/10">
                      <img 
                        src={teammate.avatar} 
                        alt={teammate.name}
                        className="w-full h-full rounded-full object-cover bg-gray-200 shadow-md dark:shadow-white/10"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base sm:text-lg font-bold shadow-md dark:shadow-white/10"
                        style={{display: 'none'}}
                      >
                        {teammate.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <span className={`absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-background shadow-sm ${
                      getOnlineStatus(teammate) === "online" ? "bg-green-500" : "bg-red-500"
                    }`}></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{teammate.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{teammate.role}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-base sm:text-lg font-mono font-semibold">{formatTime(localTime)}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{teammate.timezone}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="timetosync-theme">
      <Layout>
        <TimelineContent />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
