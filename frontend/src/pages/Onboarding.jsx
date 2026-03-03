import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, savePreferences, uploadCalendar, getUser, isLoggedIn } from '../api.js'
import { appShell, container, fonts, colors, onboarding, btn } from '../styles/theme.js'
import StarField from '../components/StarField.jsx'

const TOTAL_STEPS = 6

const ENERGY_AREAS = [
  { id: 'performance',    label: 'Performance or feedback' },
  { id: 'product_review', label: 'Product or technical reviews' },
  { id: 'presentations',  label: 'Presentations or demos' },
  { id: 'cross_team',     label: 'Cross-team alignment' },
  { id: 'one_on_ones',    label: '1:1s' },
  { id: 'customer_facing',label: 'Customer or user facing' },
]

const FREQUENCY_OPTIONS = [
  { id: 'low',      label: 'Just the big moments',       desc: '1–2 check-ins per day' },
  { id: 'medium',   label: 'A few times a day',           desc: '3–5 check-ins' },
  { id: 'high',     label: 'Be there throughout',         desc: '5–10+ check-ins' },
  { id: 'surprise', label: "I'm not sure — surprise me",  desc: "I'll figure it out" },
]

const RESET_ACTIVITIES = [
  { id: 'breathwork',      label: 'Breathwork' },
  { id: 'walk_outside',    label: 'Walk outside' },
  { id: 'stretch',         label: 'Stretch' },
  { id: 'music',           label: 'Music' },
  { id: 'eyes_closed',     label: 'Eyes closed' },
  { id: 'journal',         label: 'Journal' },
  { id: 'coffee_tea',      label: 'Coffee or tea' },
  { id: 'nature_visuals',  label: 'Nature visuals' },
  { id: 'talk_to_someone', label: 'Talk to someone' },
]

export default function Onboarding() {
  const navigate  = useNavigate()
  const user      = getUser()
  const fileRef   = useRef(null)

  // If already logged in and onboarding is done, skip straight to morning
  useEffect(() => {
    if (isLoggedIn() && user?.hasCompletedOnboarding) {
      navigate('/morning', { replace: true })
    }
  }, [])

  const [step, setStep]               = useState(0)
  const [email, setEmail]             = useState('')
  const [name, setName]               = useState(user?.name || '')
  const [energyAreas, setEnergyAreas] = useState([])
  const [frequency, setFrequency]     = useState('')
  const [resets, setResets]           = useState([])
  const [customReset, setCustomReset] = useState('')
  const [calendarData, setCalendarData] = useState(null)   // { events_count, today_count, events }
  const [uploading, setUploading]     = useState(false)
  const [dragging, setDragging]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  // --- Helpers ---
  function toggle(arr, setArr, id) {
    setArr(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const data = await uploadCalendar(file)
      setCalendarData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }, [])

  // --- Navigation ---
  async function next() {
    setSaving(true)
    setError('')
    try {
      if (step === 0) {
        await login(email.trim().toLowerCase())
        await savePreferences({ name: name.trim() })
      }
      if (step === 2) await savePreferences({ energy_areas: energyAreas })
      if (step === 3) await savePreferences({ frequency })
      if (step === 4) await savePreferences({ reset_activities: resets, custom_reset: customReset })
      setStep(s => s + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function canAdvance() {
    if (step === 0) return email.trim().length > 0 && name.trim().length > 0
    if (step === 1) return !!calendarData
    if (step === 2) return energyAreas.length > 0
    if (step === 3) return !!frequency
    if (step === 4) return resets.length > 0 || customReset.trim().length > 0
    return true
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const firstName = name.trim().split(' ')[0] || 'you'

  // ----------------------------------------------------------------
  return (
    <div style={appShell}>
      <StarField />
      <div style={{ ...container, ...onboarding.wrap }}>

        {/* Progress bar */}
        <div style={onboarding.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={onboarding.progressDot(i === step, i < step)} />
          ))}
        </div>

        {/* ---- Screen 0: Email + Name ---- */}
        {step === 0 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h2 style={onboarding.title}>
              Hey, I'm your workday companion — here to look out for your energy. ✦
            </h2>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={onboarding.nameInput}
            />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canAdvance() && next()}
              placeholder="What should I call you?"
              style={{ ...onboarding.nameInput, marginTop: 12 }}
            />
          </div>
        )}

        {/* ---- Screen 1: Calendar upload ---- */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h2 style={onboarding.title}>
              I look at your day so I can show up at the right moments.
            </h2>
            <p style={onboarding.subtext}>Upload your calendar and I'll take it from there.</p>

            {!calendarData ? (
              <div
                style={onboarding.dropZone(dragging)}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef} type="file" accept=".ics,text/calendar"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
                <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
                <p style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.textSub, lineHeight: 1.6 }}>
                  {uploading ? 'Reading your calendar…' : 'Drop your .ics file here, or tap to browse'}
                </p>
                <p style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, marginTop: 8 }}>
                  Export from Google Calendar, Outlook, or Apple Calendar
                </p>
              </div>
            ) : (
              <div style={{ background: 'rgba(139,115,85,0.06)', borderRadius: 16, padding: '20px 22px', border: `1px solid rgba(139,115,85,0.15)` }}>
                <p style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.brown, fontWeight: 500, marginBottom: 12 }}>
                  Looks like you have {calendarData.today_count} meeting{calendarData.today_count !== 1 ? 's' : ''} today
                </p>
                {calendarData.events.slice(0, 4).map(e => (
                  <div key={e.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${colors.borderSoft}` }}>
                    <span style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, minWidth: 80 }}>
                      {formatTime(e.start_time)}
                    </span>
                    <span style={{ fontFamily: fonts.sans, fontSize: 14, color: '#4A4540' }}>{e.title}</span>
                  </div>
                ))}
                {calendarData.events.length > 4 && (
                  <p style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, marginTop: 8 }}>
                    + {calendarData.events.length - 4} more
                  </p>
                )}
                <button onClick={() => setCalendarData(null)} style={{ ...btn.ghost, marginTop: 16, fontSize: 13 }}>
                  Upload a different file
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- Screen 2: Energy areas ---- */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h2 style={onboarding.title}>Which meetings take the most out of you?</h2>
            <p style={onboarding.subtext}>Pick as many as feel true.</p>
            <div style={onboarding.chipGrid}>
              {ENERGY_AREAS.map(a => (
                <button key={a.id} style={onboarding.chip(energyAreas.includes(a.id))}
                  onClick={() => toggle(energyAreas, setEnergyAreas, a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Screen 3: Frequency ---- */}
        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h2 style={onboarding.title}>How often would you like to hear from me?</h2>
            <div style={{ marginTop: 8 }}>
              {FREQUENCY_OPTIONS.map(f => (
                <div key={f.id} style={onboarding.freqCard(frequency === f.id)}
                  onClick={() => setFrequency(f.id)}>
                  <div style={onboarding.freqLabel(frequency === f.id)}>{f.label}</div>
                  <div style={onboarding.freqDesc}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Screen 4: Reset activities ---- */}
        {step === 4 && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <h2 style={onboarding.title}>When you need a quick recharge, what works for you?</h2>
            <p style={onboarding.subtext}>Pick as many as feel true.</p>
            <div style={{ ...onboarding.chipGrid, maxHeight: '45vh', overflowY: 'auto', paddingRight: 4 }}>
              {RESET_ACTIVITIES.map(r => (
                <button key={r.id} style={onboarding.chip(resets.includes(r.id))}
                  onClick={() => toggle(resets, setResets, r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
            <input
              type="text" value={customReset} onChange={e => setCustomReset(e.target.value)}
              placeholder="Something else?"
              style={onboarding.customInput}
            />
          </div>
        )}

        {/* ---- Screen 5: Closing ---- */}
        {step === 5 && (
          <div style={{ animation: 'fadeIn 0.6s ease', textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 24 }}>🌿</div>
            <h2 style={{ ...onboarding.title, textAlign: 'center', fontSize: 26 }}>
              You're all set, {firstName}.
            </h2>
            <p style={{ ...onboarding.subtext, textAlign: 'center' }}>
              I'll orbit quietly around your day — showing up when your energy needs it most.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontFamily: fonts.sans, fontSize: 14, color: '#B87878', marginTop: 12 }}>{error}</p>
        )}

        {/* CTA */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {step < 5 ? (
            <button
              disabled={!canAdvance() || saving}
              onClick={next}
              style={btn.primary(!canAdvance() || saving)}
            >
              {saving ? 'Saving…' : step === 1 && !calendarData ? 'Skip for now' : 'Continue'}
            </button>
          ) : (
            <button onClick={() => navigate('/morning')} style={btn.primary(false)}>
              Start my day
            </button>
          )}
          {step === 1 && !calendarData && (
            <button onClick={next} style={btn.ghost}>Skip for now</button>
          )}
        </div>

      </div>
    </div>
  )
}
