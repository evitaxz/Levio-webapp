import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getMorningContent, getTodayCalendar, getResetSuggestions,
  getUser, getNotificationStatus, subscribeToNotifications, clearSession,
} from '../api.js'
import {
  appShell, container, fonts, colors, card, btn, timeline, nav, loadingDots,
} from '../styles/theme.js'
import NudgeOverlay       from '../components/NudgeOverlay.jsx'
import PostMeetingCheckin from '../components/PostMeetingCheckin.jsx'
import Sun               from '../components/Sun.jsx'

export default function Dashboard() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const user            = getUser()
  const firstName       = user?.name?.split(' ')[0] || ''

  // Content
  const [morning,  setMorning]  = useState(null)
  const [events,   setEvents]   = useState([])
  const [resets,   setResets]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [activeTab, setActiveTab] = useState('today')

  // Overlays triggered by push notification params
  const nudgeEventId   = params.get('nudge')   ? parseInt(params.get('nudge'))   : null
  const checkinEventId = params.get('checkin') ? parseInt(params.get('checkin')) : null

  // Push notification setup
  const [pushPrompt, setPushPrompt] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [morningData, calData, resetData] = await Promise.all([
          getMorningContent(),
          getTodayCalendar(),
          getResetSuggestions(),
        ])
        setMorning(morningData)
        setEvents(calData.events || [])
        setResets(resetData.suggestions || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Ask about push notifications once after loading
  useEffect(() => {
    if (loading) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'default') setPushPrompt(true)
  }, [loading])

  async function enablePush() {
    setPushPrompt(false)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const status = await getNotificationStatus()
      if (!status.vapid_public_key) return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(status.vapid_public_key),
      })
      await subscribeToNotifications(sub.toJSON())
    } catch (err) {
      console.warn('[push] Could not subscribe:', err.message)
    }
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  function isEventPast(iso) { return new Date(iso) < new Date() }
  function isEventNext(iso) {
    const now = new Date()
    const start = new Date(iso)
    return start > now && start - now < 60 * 60 * 1000 // next within 1hr
  }

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ ...appShell, position: 'relative', background: 'linear-gradient(165deg, #FBF5EC 0%, #F8EDDA 35%, #F5E8D0 70%, #FAF2E0 100%)', color: '#1C2040' }}>
      <Sun />
      {/* Nudge overlay — triggered when user opens from push */}
      {nudgeEventId && <NudgeOverlay eventId={nudgeEventId} onDismiss={() => navigate('/dashboard', { replace: true })} />}
      {checkinEventId && <PostMeetingCheckin eventId={checkinEventId} onDone={() => navigate('/dashboard', { replace: true })} />}

      <div style={{ ...container, paddingBottom: 100 }}>

        {/* Header */}
        <div style={{ paddingTop: 48, paddingBottom: 24 }}>
          <p style={{ fontFamily: fonts.sans, fontSize: 12, color: '#8B7A6A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            {dateStr}
          </p>
          <h1 style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            {firstName ? `${firstName}'s day` : 'Your day'}
          </h1>
        </div>

        {/* Push prompt banner */}
        {pushPrompt && (
          <div style={{ ...card.base, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, animation: 'slideUp 0.4s ease' }}>
            <p style={{ fontFamily: fonts.sans, fontSize: 14, color: '#4A4540', lineHeight: 1.5, flex: 1 }}>
              Enable nudges so I can reach you before meetings.
            </p>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setPushPrompt(false)} style={btn.pillOutline}>Not now</button>
              <button onClick={enablePush} style={btn.pill}>Enable</button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ ...loadingDots, marginTop: 32, textAlign: 'center' }}>Thinking about your day…</p>
        ) : error ? (
          <div style={{ ...card.base, marginTop: 16 }}>
            <p style={{ fontFamily: fonts.sans, fontSize: 14, color: '#B87878' }}>{error}</p>
          </div>
        ) : (
          <>
            {/* AI Headline */}
            {morning?.headline && (
              <div style={{ marginBottom: 20, animation: 'slideUp 0.5s ease' }}>
                <p style={{ fontFamily: fonts.serif, fontSize: 20, lineHeight: 1.5, color: '#1C2040', fontWeight: 400 }}>
                  {morning.headline}
                </p>
              </div>
            )}

            {/* AI Insight cards */}
            {morning?.cards?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {morning.cards.map((c, i) => (
                  <div key={i} style={{ ...card.base, display: 'flex', gap: 14, alignItems: 'flex-start', animation: `slideUp ${0.5 + i * 0.1}s ease` }}>
                    <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{c.icon}</span>
                    <p style={card.text}>{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, marginTop: 8, borderBottom: `1px solid ${colors.borderSoft}` }}>
              {['today', 'resets'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  fontFamily: fonts.sans, fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? colors.brown : colors.textMuted,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 16px 12px', borderBottom: activeTab === tab ? `2px solid ${colors.brown}` : '2px solid transparent',
                  marginBottom: -1, letterSpacing: '0.02em',
                }}>
                  {tab === 'today' ? 'Schedule' : 'Resets'}
                </button>
              ))}
            </div>

            {/* Schedule tab */}
            {activeTab === 'today' && (
              <div>
                {events.length === 0 ? (
                  <p style={{ fontFamily: fonts.sans, fontSize: 15, color: '#6B5C4A' }}>No meetings today.</p>
                ) : (
                  events.map(e => (
                    <div key={e.id} style={timeline.item(isEventPast(e.end_time))}>
                      <div style={timeline.dot(isEventNext(e.start_time))} />
                      <div>
                        <p style={timeline.time}>{formatTime(e.start_time)} – {formatTime(e.end_time)}</p>
                        <p style={timeline.name}>{e.title}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Resets tab */}
            {activeTab === 'resets' && (
              <div>
                {resets.length === 0 ? (
                  <p style={{ fontFamily: fonts.sans, fontSize: 15, color: '#6B5C4A' }}>No gaps left today — you're in back-to-back mode.</p>
                ) : (
                  resets.map((r, i) => (
                    <div key={i} style={{ ...card.base, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>
                          {formatTime(r.start)} · {r.duration_mins} min
                        </p>
                        <p style={{ fontFamily: fonts.sans, fontSize: 15, color: '#4A4540', fontWeight: 500 }}>{r.activity}</p>
                      </div>
                      <span style={{ fontSize: 24 }}>🌿</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={nav.bar}>
        <button style={nav.item(true)} onClick={() => navigate('/dashboard')}>
          <span style={{ fontSize: 18 }}>🌿</span>Today
        </button>
        <button style={nav.item(false)} onClick={() => navigate('/endofday')}>
          <span style={{ fontSize: 18 }}>✦</span>Reflect
        </button>
        <button style={nav.item(false)} onClick={() => { clearSession(); navigate('/login') }}>
          <span style={{ fontSize: 18 }}>◦</span>Sign out
        </button>
      </nav>
    </div>
  )
}

// Convert VAPID public key from base64url to Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
