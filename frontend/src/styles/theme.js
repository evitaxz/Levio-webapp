// Levio design system — extracted from the original prototype
// All pages import from here to stay visually consistent

export const colors = {
  bg:         '#1A2545',   // deep night sky navy
  bgGradient: 'linear-gradient(180deg, #1C2848 0%, #1E2D58 45%, #16203F 80%, #1A2545 100%)',
  text:       '#F2E4C0',   // warm cream — readable on navy
  textSub:    '#C8AE88',   // muted golden cream
  textMuted:  '#A09888',   // warm muted (readable on both navy + cards)
  brown:      '#E8A020',   // golden amber — the sun, sunflowers
  brownMid:   '#D49218',   // mid gold
  brownLight: '#F0BC40',   // bright gold
  border:     'rgba(232,160,32,0.30)',   // golden border
  borderSoft: 'rgba(232,160,32,0.12)',
  cardBg:     'rgba(255,248,218,0.94)',  // warm golden cream — opaque for readability
  white50:    'rgba(255,248,218,0.50)',
  navy:       '#1A2545',
  navyLight:  '#243060',   // slightly lighter navy for layering
  teal:       '#4A7080',   // ocean teal
  cream:      '#F2E4C0',   // warm path cream
}

export const fonts = {
  serif: "'Playfair Display', Georgia, serif",
  sans:  "'Nunito', sans-serif",
}

export const appShell = {
  minHeight: '100vh',
  background: colors.bgGradient,
  fontFamily: fonts.serif,
  color: colors.text,
  position: 'relative',
  overflowX: 'hidden',
}

export const container = {
  maxWidth: 'min(700px, 100%)',
  margin: '0 auto',
  padding: '0 clamp(20px, 5vw, 64px)',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
}

// --- Onboarding ---
export const onboarding = {
  wrap: { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', padding: '40px 0' },
  progressBar: { display: 'flex', gap: 4, marginBottom: 48 },
  progressDot: (active, done) => ({
    flex: 1, height: 3, borderRadius: 2,
    background: done ? colors.brown : active ? colors.brownMid : colors.border,
    transition: 'background 0.5s ease',
  }),
  title: { fontSize: 'clamp(24px, 3.5vw, 32px)', lineHeight: 1.3, fontWeight: 400, marginBottom: 8, letterSpacing: '-0.01em' },
  subtext: { fontFamily: fonts.sans, fontSize: 'clamp(14px, 1.8vw, 16px)', color: colors.textSub, lineHeight: 1.6, marginBottom: 36, fontWeight: 400 },
  nameInput: {
    fontFamily: fonts.serif, fontSize: 'clamp(20px, 2.5vw, 26px)', border: 'none',
    borderBottom: `2px solid ${colors.border}`, background: 'transparent',
    padding: '12px 0', width: '100%', outline: 'none', color: colors.text, letterSpacing: '-0.01em',
  },
  chipGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 },
  chip: (sel) => ({
    fontFamily: fonts.sans, fontSize: 14, padding: '14px 18px', borderRadius: 12,
    border: sel ? `1.5px solid ${colors.brownMid}` : `1.5px solid ${colors.border}`,
    background: sel ? 'rgba(139,115,85,0.08)' : colors.white50,
    cursor: 'pointer', transition: 'all 0.25s ease',
    color: sel ? colors.brown : '#6B6058', fontWeight: sel ? 500 : 400,
    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1.4,
  }),
  freqCard: (sel) => ({
    fontFamily: fonts.sans, padding: '18px 20px', borderRadius: 14,
    border: sel ? `1.5px solid ${colors.brownMid}` : `1.5px solid ${colors.border}`,
    background: sel ? 'rgba(139,115,85,0.08)' : colors.white50,
    cursor: 'pointer', transition: 'all 0.25s ease', textAlign: 'left', marginBottom: 10,
  }),
  freqLabel: (sel) => ({ fontSize: 15, fontWeight: sel ? 600 : 500, color: sel ? colors.brown : '#4A4540', marginBottom: 2 }),
  freqDesc: { fontSize: 13, color: colors.textMuted, fontWeight: 400 },
  dropZone: (drag) => ({
    border: `2px dashed ${drag ? colors.brownMid : colors.border}`, borderRadius: 16,
    padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease',
    background: drag ? 'rgba(139,115,85,0.06)' : 'rgba(255,255,255,0.3)',
  }),
  customInput: {
    fontFamily: fonts.sans, fontSize: 14, border: `1.5px solid ${colors.border}`,
    borderRadius: 10, background: colors.white50, padding: '12px 16px',
    width: '100%', outline: 'none', color: '#4A4540', marginTop: 12, boxSizing: 'border-box',
  },
}

// --- Buttons ---
export const btn = {
  primary: (disabled) => ({
    fontFamily: fonts.sans, fontSize: 15, fontWeight: 700,
    padding: '16px 32px', borderRadius: 50, border: 'none',
    background: disabled ? 'rgba(232,160,32,0.25)' : colors.brown,
    color: disabled ? 'rgba(242,228,192,0.35)' : colors.navy,
    cursor: disabled ? 'default' : 'pointer', transition: 'all 0.3s ease',
    letterSpacing: '0.04em',
  }),
  ghost: {
    fontFamily: fonts.sans, fontSize: 13, color: colors.textSub,
    background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.02em',
  },
  pill: {
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
    padding: '8px 20px', borderRadius: 50, border: 'none',
    background: colors.brown, color: colors.bg, cursor: 'pointer',
  },
  pillOutline: {
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
    padding: '8px 20px', borderRadius: 50,
    border: `1.5px solid ${colors.border}`, background: 'transparent',
    color: colors.textSub, cursor: 'pointer',
  },
}

// --- Cards ---
export const card = {
  base: {
    background: colors.cardBg, backdropFilter: 'blur(20px)',
    borderRadius: 16, padding: '22px 22px', marginBottom: 14,
    border: `1px solid ${colors.borderSoft}`,
    boxShadow: '0 2px 12px rgba(92,74,50,0.04)',
  },
  insight: {
    background: 'linear-gradient(135deg, rgba(255,248,218,0.97) 0%, rgba(255,242,195,0.97) 100%)',
    borderRadius: 16, padding: '22px 22px', marginBottom: 14,
    border: '2px solid rgba(232,160,32,0.50)',
    boxShadow: '0 0 20px rgba(232,160,32,0.12)',
  },
  label: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 600,
    color: colors.brownLight, letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: 12,
  },
  text: { fontFamily: fonts.sans, fontSize: 'clamp(14px, 1.6vw, 16px)', lineHeight: 1.6, color: '#4A4540', fontWeight: 400 },
}

// --- Energy scale ---
export const ENERGY_SCALE = [
  { value: 1, label: 'Could use more energy',  emoji: '😴', color: '#8B9DC3' },
  { value: 2, label: 'Need to recharge soon',  emoji: '🌿', color: '#A8B5C8' },
  { value: 3, label: 'Steady',                 emoji: '🙂', color: '#B8C9A3' },
  { value: 4, label: 'Good energy',            emoji: '😊', color: '#A3C9A8' },
  { value: 5, label: 'Fully charged',          emoji: '✨', color: '#8BC9A3' },
]

export const energyBtn = (sel) => ({
  width: 58, height: 58, borderRadius: 14,
  border: sel ? `2px solid ${colors.brownMid}` : `1.5px solid ${colors.border}`,
  background: sel ? 'rgba(139,115,85,0.1)' : colors.white50,
  cursor: 'pointer', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s ease', fontSize: 22,
})

// --- Timeline ---
export const timeline = {
  item: (past) => ({ display: 'flex', gap: 14, padding: '14px 0', opacity: past ? 0.45 : 1, transition: 'opacity 0.3s' }),
  dot: (next) => ({
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 5,
    background: next ? colors.brownMid : colors.border,
    boxShadow: next ? '0 0 0 4px rgba(139,115,85,0.15)' : 'none',
  }),
  time: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, fontWeight: 500 },
  name: { fontFamily: fonts.sans, fontSize: 14, color: '#4A4540', fontWeight: 500, marginTop: 2 },
}

// --- Bottom nav ---
export const nav = {
  bar: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'rgba(26,37,69,0.97)', backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(232,160,32,0.15)',
    display: 'flex', justifyContent: 'center', gap: 48,
    padding: '14px 0 28px', zIndex: 50,
  },
  item: (active) => ({
    fontFamily: fonts.sans, fontSize: 11, fontWeight: active ? 600 : 400,
    color: active ? colors.brown : 'rgba(242,228,192,0.45)',
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, letterSpacing: '0.03em',
  }),
}

// --- Nudge overlay ---
export const nudge = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(44,40,37,0.45)',
    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 100, animation: 'fadeIn 0.3s ease',
  },
  card: {
    background: 'rgba(255,248,218,0.97)', borderRadius: 20, padding: '36px 28px',
    maxWidth: 380, width: '90%', textAlign: 'center',
    boxShadow: '0 20px 60px rgba(26,37,69,0.5)',
  },
  text: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 1.5, color: colors.navy, marginBottom: 28, fontWeight: 400 },
}

// --- Loading ---
export const loadingDots = { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted, fontStyle: 'italic' }
