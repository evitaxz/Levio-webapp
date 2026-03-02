import { useState } from 'react'
import { submitCheckin } from '../api.js'
import { nudge, btn, fonts, colors, ENERGY_SCALE, energyBtn } from '../styles/theme.js'

export default function PostMeetingCheckin({ eventId, onDone }) {
  const [selected, setSelected] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [done,     setDone]     = useState(false)

  async function handleSubmit() {
    if (!selected) return
    setSaving(true)
    try {
      await submitCheckin(selected, `after meeting`, eventId)
      setDone(true)
      setTimeout(onDone, 1200)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div style={nudge.overlay} onClick={onDone}>
      <div style={nudge.card} onClick={e => e.stopPropagation()}>

        {!done ? (
          <>
            <p style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
              How did that land?
            </p>

            <p style={{ fontFamily: fonts.sans, fontSize: 15, color: colors.textSub, marginBottom: 24, lineHeight: 1.5 }}>
              How's your energy right now?
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
              {ENERGY_SCALE.map(e => (
                <button key={e.value} onClick={() => setSelected(e.value)} style={energyBtn(selected === e.value)}>
                  <span>{e.emoji}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={onDone} style={btn.ghost}>Skip</button>
              <button
                disabled={!selected || saving}
                onClick={handleSubmit}
                style={btn.primary(!selected || saving)}
              >
                {saving ? 'Saving…' : 'Log it'}
              </button>
            </div>
          </>
        ) : (
          <p style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.brown, fontWeight: 500 }}>
            Noted. ✦
          </p>
        )}

      </div>
    </div>
  )
}
