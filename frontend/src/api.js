const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// --- Token helpers ---
export const getToken  = () => localStorage.getItem('levio_token')
export const getUser   = () => { try { return JSON.parse(localStorage.getItem('levio_user')) } catch { return null } }
export const isLoggedIn = () => !!getToken()

function setSession(token, user) {
  localStorage.setItem('levio_token', token)
  localStorage.setItem('levio_user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('levio_token')
  localStorage.removeItem('levio_user')
}

// --- Base request helper ---
async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  // Only set Content-Type for JSON — let FormData set its own boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Something went wrong.')
  return data
}

// --- Auth ---
export async function login(email) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  setSession(data.token, data.user)
  return data
}

// --- User preferences ---
export async function getPreferences() {
  return request('/api/user/preferences')
}

export async function savePreferences(prefs) {
  return request('/api/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  })
}

// --- Calendar ---
export async function uploadCalendar(file) {
  const formData = new FormData()
  formData.append('calendar', file)
  return request('/api/calendar/upload', { method: 'POST', body: formData })
}

export async function getTodayCalendar() {
  return request('/api/calendar/today')
}

// --- Energy check-ins ---
export async function submitCheckin(value, context, eventId = null) {
  return request('/api/energy/checkin', {
    method: 'POST',
    body: JSON.stringify({ value, context, event_id: eventId }),
  })
}

export async function getTodayCheckins() {
  return request('/api/energy/today')
}

// --- AI content ---
export async function getMorningContent()     { return request('/api/ai/morning') }
export async function getNudge(eventId)       { return request(`/api/ai/nudge/${eventId}`) }
export async function getEndOfDayContent()    { return request('/api/ai/endofday') }
export async function getResetSuggestions()   { return request('/api/ai/resets') }

// --- Notifications ---
export async function subscribeToNotifications(subscription) {
  return request('/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription }),
  })
}

export async function getNotificationStatus() {
  return request('/api/notifications/status')
}
