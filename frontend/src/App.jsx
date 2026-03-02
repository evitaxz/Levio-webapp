import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { isLoggedIn, getUser } from './api.js'

import Login          from './pages/Login.jsx'
import Onboarding     from './pages/Onboarding.jsx'
import MorningCheckin from './pages/MorningCheckin.jsx'
import Dashboard      from './pages/Dashboard.jsx'
import EndOfDay       from './pages/EndOfDay.jsx'

// Redirect logged-out users to /login
function RequireAuth({ children }) {
  const location = useLocation()
  if (!isLoggedIn()) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// Redirect logged-in users away from /login
function RedirectIfAuthed({ children }) {
  const user = getUser()
  if (isLoggedIn()) {
    return <Navigate to={user?.hasCompletedOnboarding ? '/morning' : '/onboarding'} replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <RedirectIfAuthed><Login /></RedirectIfAuthed>
        } />

        <Route path="/onboarding" element={
          <RequireAuth><Onboarding /></RequireAuth>
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

        {/* Default: go to login (auth guard redirects if logged in) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
