import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn } from './api.js'

import Welcome        from './pages/Welcome.jsx'
import Onboarding     from './pages/Onboarding.jsx'
import MorningCheckin from './pages/MorningCheckin.jsx'
import Dashboard      from './pages/Dashboard.jsx'
import EndOfDay       from './pages/EndOfDay.jsx'

// Redirect logged-out users to /onboarding (which handles login on step 0)
function RequireAuth({ children }) {
  if (!isLoggedIn()) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding is the entry point — no auth required, handles login itself */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Welcome screen — shown after login, before onboarding steps */}
        <Route path="/welcome" element={
          <RequireAuth><Welcome /></RequireAuth>
        } />

        <Route path="/morning" element={
          <RequireAuth><MorningCheckin /></RequireAuth>
        } />

        <Route path="/dashboard" element={
          <RequireAuth><Dashboard /></RequireAuth>
        } />

        <Route path="/endofday" element={
          <RequireAuth><EndOfDay /></RequireAuth>
        } />

        {/* Everything else → onboarding */}
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
