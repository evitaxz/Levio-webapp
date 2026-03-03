import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEndOfDayContent, submitCheckin } from '../api.js'
import { appShell, container, fonts, colors, card, btn, nav, ENERGY_SCALE, energyBtn, loadingDots } from '../styles/theme.js'
import Moon      from '../components/Moon.jsx'
import StarField from '../components/StarField.jsx'

export default function EndOfDay() {
  const navigate = useNavigate()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // End-of-day check-in
  const [eodEnergy,  setEodEnergy]  = useState(null)
  const [checkinDone, setCheckinDone] = useState(false)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setData(await getEndOfDayContent())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function submitEodCheckin() {
    if (!eodEnergy) return
    setSaving(true)
    try {
      await submitCheckin(eodEnergy, 'end of day')
      setCheckinDone(true)
    } catch {}
    setSaving(false)
  }

  return (
    <div style={{ ...appShell, position: 'relative' }}>
      <StarField />
      <Moon />
      <div style={{ ...container, paddingBottom: 100, paddingTop: 48 }}>

        <p style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
          End of day
        </p>

        {loading ? (
          <p style={{ ...loadingDots, marginTop: 40 }}>Reflecting on your day…</p>
        ) : error ? (
          <div style={card.base}>
            <p style={{ fontFamily: fonts.sans, fontSize: 14, color: '#B87878' }}>{error}</p>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>

            {/* Headline */}
            {data?.headline && (
              <h2 style={{ fontFamily: fonts.serif, fontSize: 24, fontWeight: 400, lineHeight: 1.4, letterSpacing: '-0.01em', marginBottom: 28 }}>
                {data.headline}
              </h2>
            )}

            {/* Moment cards */}
            {data?.moments?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <p style={card.label}>Moments I noticed</p>
                {data.moments.map((m, i) => (
                  <div key={i} style={{ ...card.base, display: 'flex', gap: 14, alignItems: 'flex-start', animation: `slideUp ${0.4 + i * 0.12}s ease` }}>
                    <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{m.icon}</span>
                    <p style={card.text}>{m.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Insight */}
            {data?.insight && (
              <div style={{ ...card.insight, marginBottom: 24, animation: 'slideUp 0.7s ease' }}>
                <p style={card.label}>One thing I noticed</p>
                <p style={{ ...card.text, fontStyle: 'italic', fontSize: 15 }}>{data.insight}</p>
              </div>
            )}

            {/* End-of-day energy check-in */}
            {!checkinDone ? (
              <div style={{ ...card.base, marginBottom: 24 }}>
                <p style={card.label}>How are you leaving today?</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '16px 0' }}>
                  {ENERGY_SCALE.map(e => (
                    <button key={e.value} onClick={() => setEodEnergy(e.value)} style={energyBtn(eodEnergy === e.value)}>
                      <span>{e.emoji}</span>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button
                    disabled={!eodEnergy || saving}
                    onClick={submitEodCheckin}
                    style={{ ...btn.primary(!eodEnergy || saving), marginTop: 8 }}
                  >
                    {saving ? 'Saving…' : 'Log it'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ ...card.base, textAlign: 'center', padding: '24px', animation: 'fadeIn 0.4s ease' }}>
                <p style={{ fontFamily: fonts.serif, fontSize: 18, color: colors.text, lineHeight: 1.5 }}>
                  Noted. Rest well.
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={nav.bar}>
        <button style={nav.item(false)} onClick={() => navigate('/dashboard')}>
          <span style={{ fontSize: 18 }}>🌿</span>Today
        </button>
        <button style={nav.item(true)} onClick={() => navigate('/endofday')}>
          <span style={{ fontSize: 18 }}>✦</span>Reflect
        </button>
      </nav>
    </div>
  )
}
