import { useEffect, useRef } from 'react'

export default function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 60 }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      r:       Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.5 + 0.1,
      speed:   Math.random() * 0.3 + 0.05,
      drift:   (Math.random() - 0.5) * 0.1,
    }))

    let raf
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const s of stars) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(242,228,192,${s.opacity})`
        ctx.fill()

        s.y -= s.speed
        s.x += s.drift
        s.opacity += (Math.random() - 0.5) * 0.02

        if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width }
        if (s.x < -2) s.x = canvas.width + 2
        if (s.x > canvas.width + 2) s.x = -2
        s.opacity = Math.max(0.05, Math.min(0.6, s.opacity))
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  )
}
