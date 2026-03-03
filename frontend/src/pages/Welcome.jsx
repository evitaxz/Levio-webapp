import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, isLoggedIn } from '../api.js'
import { appShell, container, fonts, colors, btn } from '../styles/theme.js'
import StarField from '../components/StarField.jsx'

export default function Welcome() {
  const navigate = useNavigate()
  const user     = getUser()

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/onboarding', { replace: true }); return }
    if (user?.hasCompletedOnboarding) { navigate('/morning', { replace: true }) }
  }, [])

  return (
    <div style={{ ...appShell, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <StarField />

      <div style={{
        ...container,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        gap: 0,
      }}>

        {/* ✦ + App name */}
        <div style={{ marginBottom: 36, animation: 'fadeIn 0.7s ease both' }}>
          <div style={{
            fontSize: 36,
            color: colors.brown,
            marginBottom: 16,
            display: 'inline-block',
            animation: 'breathe 3.6s ease-in-out infinite',
          }}>
            ✦
          </div>
          <h1 style={{
            fontFamily: fonts.serif,
            fontSize: 'clamp(44px, 8vw, 64px)',
            fontWeight: 400,
            color: colors.text,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            margin: 0,
          }}>
            Levio
          </h1>
        </div>

        {/* Tagline */}
        <p style={{
          fontFamily: fonts.serif,
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: colors.textSub,
          lineHeight: 1.5,
          marginBottom: 24,
          fontStyle: 'italic',
          fontWeight: 400,
          animation: 'fadeIn 0.7s 0.2s ease both',
          opacity: 0,
        }}>
          From AM to PM, Levio goes to work with you.
        </p>

        {/* Description */}
        <p style={{
          fontFamily: fonts.sans,
          fontSize: 'clamp(14px, 1.6vw, 15px)',
          color: colors.textMuted,
          lineHeight: 1.75,
          maxWidth: 400,
          margin: '0 auto 52px',
          fontWeight: 400,
          animation: 'fadeIn 0.7s 0.35s ease both',
          opacity: 0,
        }}>
          Integrated with your calendar, Levio powers you with personalized energy check-ins throughout your workday — before meetings, after meetings, and in the moments between.
        </p>

        {/* CTA */}
        <div style={{ animation: 'fadeIn 0.7s 0.5s ease both', opacity: 0 }}>
          <button
            onClick={() => navigate('/onboarding')}
            style={btn.primary(false)}
          >
            Start your journey with Levio
          </button>
        </div>

      </div>
    </div>
  )
}
