import { useState, useEffect } from 'react'
import { getNudge } from '../api.js'
import { nudge, btn, fonts, colors, loadingDots } from '../styles/theme.js'

export default function NudgeOverlay({ eventId, onDismiss }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setData(await getNudge(eventId))
      } catch {
        // show fallback message on error
        setData({ text: 'Take a breath before you step in.', event_title: '' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId])

  return (
    <div style={nudge.overlay} onClick={onDismiss}>
      <div style={nudge.card} onClick={e => e.stopPropagation()}>

        {data?.event_title && (
          <p style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            Before · {data.event_title}
          </p>
        )}

        {loading ? (
          <p style={{ ...loadingDots, marginBottom: 28 }}>One moment…</p>
        ) : (
          <p style={nudge.text}>{data?.text}</p>
        )}

        <button onClick={onDismiss} style={btn.primary(false)}>
          Got it
        </button>

      </div>
    </div>
  )
}
