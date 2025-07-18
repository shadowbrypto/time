import { ThemeProvider } from "./components/theme-provider"
import { Layout } from "./components/layout"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Timeline from "./pages/Timeline"
import Scheduler from "./pages/Scheduler"

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="timetosync-theme">
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/timeline" replace />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/scheduler" element={<Scheduler />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
