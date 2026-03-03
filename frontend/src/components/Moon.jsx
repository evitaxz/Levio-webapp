export default function Moon() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {/* Soft halo */}
      <div style={{
        position: 'absolute',
        top: -60, right: '18%',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle at center, rgba(242,228,192,0.12) 0%, transparent 70%)',
      }} />
      {/* Crescent moon — SVG */}
      <svg
        width="90" height="90"
        viewBox="0 0 90 90"
        style={{ position: 'absolute', top: 20, right: 'calc(18% + 10px)' }}
      >
        {/* Full circle */}
        <circle cx="45" cy="45" r="36" fill="#F2E4C0" opacity="0.92" />
        {/* Cutout circle to create crescent */}
        <circle cx="60" cy="34" r="30" fill="#1A2545" />
        {/* Subtle texture lines */}
        <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(242,228,192,0.15)" strokeWidth="1" />
      </svg>
      {/* A few extra stars near the moon */}
      {[
        { x: '14%', y: 28, r: 1.5, o: 0.7 },
        { x: '22%', y: 52, r: 1,   o: 0.5 },
        { x: '8%',  y: 64, r: 2,   o: 0.6 },
        { x: '30%', y: 20, r: 1,   o: 0.4 },
        { x: '5%',  y: 38, r: 1.5, o: 0.5 },
      ].map((s, i) => (
        <div key={i} style={{
          position: 'absolute', top: s.y, left: s.x,
          width: s.r * 2, height: s.r * 2, borderRadius: '50%',
          background: `rgba(242,228,192,${s.o})`,
          boxShadow: `0 0 ${s.r * 3}px rgba(242,228,192,${s.o * 0.5})`,
        }} />
      ))}
    </div>
  )
}
