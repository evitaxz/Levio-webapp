export default function Sun() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {/* Outer glow */}
      <div style={{
        position: 'absolute',
        top: -120, left: '50%', transform: 'translateX(-50%)',
        width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle at center, rgba(240,188,40,0.18) 0%, rgba(232,160,32,0.10) 45%, transparent 72%)',
      }} />
      {/* Mid glow */}
      <div style={{
        position: 'absolute',
        top: -90, left: '50%', transform: 'translateX(-50%)',
        width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle at center, rgba(240,188,40,0.28) 0%, rgba(232,160,32,0.15) 50%, transparent 75%)',
      }} />
      {/* Sun disc — half visible at top edge */}
      <div style={{
        position: 'absolute',
        top: -72, left: '50%', transform: 'translateX(-50%)',
        width: 144, height: 144, borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 40%, #F8D060 0%, #E8A020 55%, #C87010 100%)',
        boxShadow: '0 0 40px rgba(232,160,32,0.45), 0 0 80px rgba(240,180,40,0.20)',
      }} />
    </div>
  )
}
