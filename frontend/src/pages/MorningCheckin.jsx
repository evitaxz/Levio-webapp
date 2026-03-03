import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitCheckin, getUser } from '../api.js'
import { appShell, container, fonts, colors, btn, ENERGY_SCALE, energyBtn } from '../styles/theme.js'
import StarField from '../components/StarField.jsx'
import Sun      from '../components/Sun.jsx'
import Moon     from '../components/Moon.jsx'

export default function MorningCheckin() {
  const navigate = useNavigate()
  const user     = getUser()
  const name     = user?.name?.split(' ')[0] || ''

  const [selected, setSelected] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit() {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      await submitCheckin(selected, 'morning')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  // Time-based appearance
  const hour = new Date().getHours()
  let greeting, bg, textColor, textSubColor, labelColor, isLight

  if (hour >= 6 && hour < 12) {
    greeting     = 'Good morning'
    bg           = 'linear-gradient(165deg, #FBF5EC 0%, #F8EDDA 35%, #F5E8D0 70%, #FAF2E0 100%)'
    textColor    = '#1C2040'
    textSubColor = '#6B5C4A'
    labelColor   = '#7A6A58'
    isLight      = true
  } else if (hour >= 12 && hour < 18) {
    greeting     = 'Good afternoon'
    bg           = 'linear-gradient(165deg, #FFF8E8 0%, #FFF0CC 35%, #FFE9A8 70%, #FFF4D8 100%)'
    textColor    = '#1C2040'
    textSubColor = '#6B5C4A'
    labelColor   = '#7A6A58'
    isLight      = true
  } else {
    greeting     = 'Good evening'
    bg           = colors.bgGradient
    textColor    = colors.text
    textSubColor = colors.textSub
    labelColor   = colors.textMuted
    isLight      = false
  }

  return (
    <div style={{ ...appShell, position: 'relative', background: bg, color: textColor }}>
      {isLight ? <Sun /> : <><StarField /><Moon /></>}

      <div style={{ ...container, justifyContent: 'center', minHeight: '100vh', animation: 'fadeIn 0.5s ease' }}>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: fonts.serif, fontSize: 30, fontWeight: 400, lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 8, color: textColor }}>
            {greeting}{name ? `, ${name}` : ''}.
          </h1>
          <p style={{ fontFamily: fonts.sans, fontSize: 16, color: textSubColor, lineHeight: 1.6, fontWeight: 400 }}>
            How are you arriving today?
          </p>
        </div>

        {/* Energy scale — flex: 1 so each button fills equal share of available width; height auto-sizes to content */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {ENERGY_SCALE.map(e => (
            <button key={e.value} onClick={() => setSelected(e.value)}
              style={{ ...energyBtn(selected === e.value), flex: 1, minWidth: 0, width: 'auto', height: 'auto', padding: '14px 6px' }}>
              <span>{e.emoji}</span>
              <span style={{ fontFamily: fonts.sans, fontSize: 11, color: labelColor, marginTop: 5, textAlign: 'center', lineHeight: 1.35 }}>
                {e.label.split(' ').map((w, i) => <span key={i} style={{ display: 'block' }}>{w}</span>)}
              </span>
            </button>
          ))}
        </div>

        {/* Selected label */}
        {selected && (
          <p style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.brown, textAlign: 'center', marginBottom: 32, fontWeight: 500, animation: 'fadeIn 0.3s ease' }}>
            {ENERGY_SCALE.find(e => e.value === selected)?.label}
          </p>
        )}

        {error && (
          <p style={{ fontFamily: fonts.sans, fontSize: 14, color: '#B87878', marginBottom: 16, textAlign: 'center' }}>{error}</p>
        )}

        <button
          disabled={!selected || saving}
          onClick={handleSubmit}
          style={{ ...btn.primary(!selected || saving), alignSelf: 'center', minWidth: 160 }}
        >
          {saving ? 'One moment…' : 'See my day'}
        </button>

      </div>
    </div>
  )
}
