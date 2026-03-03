import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser, isLoggedIn } from '../api.js'
import { fonts, btn } from '../styles/theme.js'
import StarField from '../components/StarField.jsx'

export default function Welcome() {
  const navigate = useNavigate()
  const user     = getUser()

  useEffect(() => {
    if (isLoggedIn() && user?.hasCompletedOnboarding) {
      navigate('/morning', { replace: true })
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflowX: 'hidden',
      // Dusk sky: warm golden top → nature greens → deep celestial blue bottom
      background: 'linear-gradient(180deg, #FCC050 0%, #F09030 12%, #D86048 24%, #9A7058 36%, #4A7868 50%, #2E5880 64%, #1E3868 76%, #1B2857 88%, #121838 100%)',
      fontFamily: fonts.serif,
    }}>

      {/* Star field — cream particles appear against the dark lower sky */}
      <StarField />

      {/* Sun — soft radial glow, top-right, solar gold */}
      <div style={{
        position: 'absolute', top: -140, right: -100,
        width: 460, height: 460, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,200,80,0.30) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: -80, right: -50,
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(240,168,48,0.70) 0%, rgba(240,140,32,0.35) 38%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Moon — small crescent, bottom-left */}
      <svg
        width="52" height="52" viewBox="0 0 52 52"
        style={{ position: 'absolute', bottom: 72, left: '7%', pointerEvents: 'none', opacity: 0.72, zIndex: 2 }}
      >
        <circle cx="26" cy="26" r="22" fill="#C8D8E8" />
        <circle cx="37" cy="19" r="19" fill="#1B2857" />
      </svg>

      {/* Levio wordmark — top-left, subtle header */}
      <div style={{
        position: 'absolute', top: 28, left: 'clamp(20px, 5vw, 48px)',
        zIndex: 2,
      }}>
        <span style={{
          fontFamily: fonts.serif,
          fontSize: 17,
          fontWeight: 400,
          color: 'rgba(255,240,200,0.65)',
          letterSpacing: '0.1em',
        }}>
          Levio
        </span>
      </div>

      {/* Main content — vertically centered */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(80px, 10vh, 120px) clamp(28px, 6vw, 80px) clamp(60px, 8vh, 100px)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        maxWidth: 640,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>

        {/* Tagline — hero text */}
        <h2 style={{
          fontFamily: fonts.serif,
          fontSize: 'clamp(26px, 4.5vw, 44px)',
          fontWeight: 400,
          color: '#F2E4C0',
          letterSpacing: '0.03em',
          lineHeight: 1.45,
          margin: 0,
          marginBottom: 32,
          maxWidth: 520,
          animation: 'fadeIn 0.8s ease both',
        }}>
          From AM to PM,<br />Levio goes to work<br />with you.
        </h2>

        {/* Divider with ✦ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          width: '100%', maxWidth: 300, marginBottom: 32,
          animation: 'fadeIn 0.8s 0.18s ease both',
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(242,228,192,0.20)' }} />
          <span style={{
            color: 'rgba(242,228,192,0.50)',
            fontSize: 12,
            animation: 'breathe 4s ease-in-out infinite',
            display: 'inline-block',
          }}>✦</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(242,228,192,0.20)' }} />
        </div>

        {/* Description */}
        <p style={{
          fontFamily: fonts.sans,
          fontSize: 'clamp(13px, 1.5vw, 15px)',
          color: 'rgba(200,174,136,0.88)',
          lineHeight: 1.8,
          maxWidth: 340,
          margin: 0,
          marginBottom: 48,
          fontWeight: 400,
          animation: 'fadeIn 0.8s 0.32s ease both',
        }}>
          Integrated with your calendar, Levio powers you with personalized energy check-ins throughout your workday — before meetings, after meetings, and in the moments between.
        </p>

        {/* CTA */}
        <div style={{ animation: 'fadeIn 0.8s 0.48s ease both' }}>
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
