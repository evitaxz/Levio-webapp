import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api.js'
import { appShell, container, fonts, colors, btn } from '../styles/theme.js'
import StarField from '../components/StarField.jsx'

export default function Login() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const { user } = await login(email.trim().toLowerCase())
      if (!user.hasCompletedOnboarding) navigate('/onboarding')
      else navigate('/morning')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={appShell}>
      <StarField />
      <div style={{ ...container, justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ animation: 'fadeIn 0.6s ease' }}>

          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
            <h1 style={{ fontFamily: fonts.serif, fontSize: 32, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 10 }}>
              Levio
            </h1>
            <p style={{ fontFamily: fonts.sans, fontSize: 16, color: colors.textSub, lineHeight: 1.6, fontWeight: 400 }}>
              Your workday energy companion.<br />Enter your email to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
              style={{
                fontFamily: fonts.sans, fontSize: 16,
                border: `1.5px solid ${colors.border}`, borderRadius: 12,
                background: 'rgba(255,255,255,0.6)', padding: '16px 18px',
                outline: 'none', color: colors.text, width: '100%',
              }}
            />

            {error && (
              <p style={{ fontFamily: fonts.sans, fontSize: 14, color: '#B87878' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{ ...btn.primary(!email.trim() || loading), width: '100%', textAlign: 'center' }}
            >
              {loading ? 'One moment…' : 'Continue'}
            </button>
          </form>

          <p style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, marginTop: 24, lineHeight: 1.6 }}>
            No password needed. Just your email.
          </p>
        </div>
      </div>
    </div>
  )
}
