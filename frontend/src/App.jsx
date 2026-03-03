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
        {/* Welcome is the public landing page — no auth required */}
        <Route path="/"        element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />

        {/* Onboarding — no auth required, handles login itself on step 0 */}
        <Route path="/onboarding" element={<Onboarding />} />

        <Route path="/morning" element={
          <RequireAuth><MorningCheckin /></RequireAuth>
        } />

        <Route path="/dashboard" element={
          <RequireAuth><Dashboard /></RequireAuth>
        } />

        <Route path="/endofday" element={
          <RequireAuth><EndOfDay /></RequireAuth>
        } />

        {/* Everything else → welcome */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
