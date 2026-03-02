import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitCheckin, getUser } from '../api.js'
import { appShell, container, fonts, colors, btn, ENERGY_SCALE, energyBtn } from '../styles/theme.js'
import StarField from '../components/StarField.jsx'

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

  const greeting = new Date().getHours() < 12 ? 'Good morning' : 'Hey'

  return (
    <div style={appShell}>
      <StarField />
      <div style={{ ...container, justifyContent: 'center', minHeight: '100vh', animation: 'fadeIn 0.5s ease' }}>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: fonts.serif, fontSize: 30, fontWeight: 400, lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 8 }}>
            {greeting}{name ? `, ${name}` : ''}.
          </h1>
          <p style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.textSub, lineHeight: 1.6, fontWeight: 400 }}>
            How are you arriving today?
          </p>
        </div>

        {/* Energy scale */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          {ENERGY_SCALE.map(e => (
            <button key={e.value} onClick={() => setSelected(e.value)} style={energyBtn(selected === e.value)}>
              <span>{e.emoji}</span>
              <span style={{ fontFamily: fonts.sans, fontSize: 9, color: colors.textMuted, marginTop: 3, textAlign: 'center', lineHeight: 1.2 }}>
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
