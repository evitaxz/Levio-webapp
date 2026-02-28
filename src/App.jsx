import { useState, useEffect, useCallback, useRef } from "react";

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const DRAINS = [
  { id: "back_to_back", label: "Back-to-back meetings with no breaks", icon: "🔄" },
  { id: "speaking_up", label: "Speaking up or presenting in group settings", icon: "🎤" },
  { id: "difficult_convos", label: "Difficult or high-stakes conversations", icon: "💬" },
  { id: "context_switching", label: "Context-switching between too many things", icon: "🔀" },
  { id: "self_doubt", label: "Feeling unsure about decisions I've made", icon: "🤔" },
  { id: "managing_emotions", label: "Managing other people's emotions or conflicts", icon: "🫂" },
  { id: "career_uncertainty", label: "Uncertainty about my role or career direction", icon: "🧭" },
  { id: "not_recognized", label: "Not feeling recognized for my effort", icon: "👁️" },
  { id: "sunday_scaries", label: "Sunday scaries / dread before the week", icon: "😰" },
];

const MEETING_TYPES = [
  { id: "manager_1on1", label: "1:1s with my manager" },
  { id: "team_standup", label: "Team standups" },
  { id: "leadership", label: "Leadership or exec meetings" },
  { id: "performance", label: "Performance or feedback conversations" },
  { id: "client_external", label: "Client or external calls" },
];

const FREQUENCY_OPTIONS = [
  { id: "low", label: "Just the big moments", desc: "1–2 check-ins", value: 2 },
  { id: "medium", label: "A few times a day", desc: "3–5 check-ins", value: 5 },
  { id: "high", label: "Be there throughout", desc: "5–10+ check-ins", value: 10 },
  { id: "surprise", label: "I'm not sure — surprise me", desc: "I'll figure it out", value: -1 },
];

const RESET_ACTIVITIES = [
  { id: "breathwork", label: "Breathwork / box breathing", icon: "🌬️" },
  { id: "walk", label: "Step outside or take a short walk", icon: "🚶" },
  { id: "stretch", label: "Stretch or move your body", icon: "🧘" },
  { id: "music", label: "Listen to a favorite song", icon: "🎵" },
  { id: "eyes_closed", label: "Close your eyes for a minute", icon: "😌" },
  { id: "journal", label: "Journal or write thoughts down", icon: "📝" },
  { id: "coffee_tea", label: "Make a coffee or tea", icon: "☕" },
  { id: "nature", label: "Look at something calming", icon: "🌿" },
  { id: "talk", label: "Talk to someone you trust", icon: "💛" },
];

const MOOD_SCALE = [
  { value: 1, label: "Drained", emoji: "😔", color: "#6B8BA4" },
  { value: 2, label: "Low", emoji: "😐", color: "#8BA4B4" },
  { value: 3, label: "Okay", emoji: "🙂", color: "#D9C9B5" },
  { value: 4, label: "Good", emoji: "😊", color: "#D4954A" },
  { value: 5, label: "Energized", emoji: "✨", color: "#E8A838" },
];

const MORNING_SCALE = [
  { value: 1, label: "Rough night", emoji: "😴" },
  { value: 2, label: "Not great", emoji: "🥱" },
  { value: 3, label: "Okay", emoji: "🙂" },
  { value: 4, label: "Well rested", emoji: "😊" },
  { value: 5, label: "Refreshed", emoji: "🌅" },
];

// ============================================
// ICS PARSER
// ============================================

function parseICS(icsText) {
  const events = [];
  const lines = icsText.replace(/\r\n /g, "").replace(/\r/g, "\n").split("\n");
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      if (current.start && current.end) {
        events.push(current);
      }
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const keyPart = line.substring(0, colonIdx);
      const value = line.substring(colonIdx + 1);
      const key = keyPart.split(";")[0];

      if (key === "DTSTART") {
        current.start = parseICSDate(value);
      } else if (key === "DTEND") {
        current.end = parseICSDate(value);
      } else if (key === "SUMMARY") {
        current.title = value;
      } else if (key === "DESCRIPTION") {
        current.description = value.replace(/\\n/g, " ").replace(/\\,/g, ",");
      } else if (key === "LOCATION") {
        current.location = value;
      } else if (key === "ATTENDEE") {
        if (!current.attendees) current.attendees = [];
        const match = value.match(/mailto:(.+)/i);
        if (match) current.attendees.push(match[1]);
      }
    }
  }

  return events
    .filter((e) => e.start && e.end)
    .sort((a, b) => a.start - b.start);
}

function parseICSDate(str) {
  const clean = str.replace(/[TZ]/g, (m) => (m === "T" ? "T" : ""));
  if (clean.length >= 15) {
    const y = clean.slice(0, 4),
      mo = clean.slice(4, 6),
      d = clean.slice(6, 8);
    const h = clean.slice(9, 11),
      mi = clean.slice(11, 13),
      s = clean.slice(13, 15);
    if (str.endsWith("Z")) return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
    return new Date(+y, +mo - 1, +d, +h, +mi, +s);
  }
  if (clean.length === 8) {
    const y = clean.slice(0, 4),
      mo = clean.slice(4, 6),
      d = clean.slice(6, 8);
    return new Date(+y, +mo - 1, +d);
  }
  return new Date(str);
}

function getTodayEvents(events) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  return events.filter((e) => e.start >= todayStart && e.start < todayEnd);
}

function findGaps(events, workStart = 9, workEnd = 18) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStart = new Date(today);
  dayStart.setHours(workStart, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(workEnd, 0, 0);

  const sorted = events
    .filter((e) => e.end > dayStart && e.start < dayEnd)
    .sort((a, b) => a.start - b.start);

  const gaps = [];
  let cursor = dayStart;

  for (const evt of sorted) {
    if (evt.start > cursor) {
      const duration = (evt.start - cursor) / 60000;
      if (duration >= 15) {
        gaps.push({ start: new Date(cursor), end: new Date(evt.start), duration });
      }
    }
    if (evt.end > cursor) cursor = new Date(evt.end);
  }

  if (dayEnd > cursor) {
    const duration = (dayEnd - cursor) / 60000;
    if (duration >= 15) {
      gaps.push({ start: new Date(cursor), end: new Date(dayEnd), duration });
    }
  }
  return gaps;
}

function formatTime(date) {
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(mins) {
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ============================================
// LLM INTEGRATION (OpenAI)
// ============================================

const SYSTEM_PROMPT_BASE = `You are the voice of a workday companion app. Your personality:
- You are a steady, emotionally attuned friend who understands work life deeply
- You know the user's schedule like a colleague would, but speak with warmth and grounded presence
- Your tone is calm, perceptive, and supportive — never dramatic, preachy, overly motivational, or clinical
- You gently name what seems to be happening without diagnosing or over-analyzing
- You validate effort rather than performance
- You offer small grounding invitations instead of instructions
- You remain composed even when the workday feels intense
- Your voice is personal but not intimate, warm but not sentimental, professional but not corporate
- You're like someone quietly sitting beside them, noticing what costs them energy, offering steady support
- Keep responses concise and natural — never more than 2-3 sentences unless specifically asked for more
- Never use emojis in your messages
- Address the user by their first name occasionally but not every time`;

async function callLLM(apiKey, systemPrompt, userPrompt) {
  if (!apiKey) return generateFallbackContent(userPrompt);
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });
    const data = await response.json();
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    }
    return generateFallbackContent(userPrompt);
  } catch (e) {
    console.error("LLM call failed:", e);
    return generateFallbackContent(userPrompt);
  }
}

function generateFallbackContent(prompt) {
  if (prompt.includes("pre-meeting")) return "You've got this. Take a breath before you head in.";
  if (prompt.includes("morning-dashboard")) return "Here's your day ahead — let's move through it together.";
  if (prompt.includes("end-of-day")) return "You made it through today. That's worth noticing.";
  if (prompt.includes("curiosity-hook")) return "Something interesting happened in your day today.";
  if (prompt.includes("insight")) return "You showed more steadiness today than you might realize.";
  return "I'm here with you.";
}

function buildUserContext(profile, moodHistory, todayEvents) {
  let ctx = `User's name: ${profile.name}\n`;
  ctx += `What drains them: ${profile.drains.map((d) => DRAINS.find((x) => x.id === d)?.label).join(", ")}\n`;
  ctx += `Important meeting types: ${profile.meetingTypes.map((m) => MEETING_TYPES.find((x) => x.id === m)?.label).join(", ")}\n`;
  if (profile.meetingKeywords) ctx += `Meeting keywords to watch for: ${profile.meetingKeywords}\n`;
  ctx += `Preferred reset activities: ${profile.resetActivities.map((r) => RESET_ACTIVITIES.find((x) => x.id === r)?.label).join(", ")}\n`;

  if (moodHistory.length > 0) {
    const recent = moodHistory.slice(-10);
    ctx += `Recent mood check-ins: ${recent.map((m) => `${m.context}: ${m.value}/5`).join(", ")}\n`;
  }

  if (todayEvents.length > 0) {
    ctx += `Today's meetings:\n`;
    todayEvents.forEach((e) => {
      ctx += `- ${formatTime(e.start)}–${formatTime(e.end)}: ${e.title || "Untitled"}\n`;
    });
  }

  return ctx;
}

// ============================================
// NOTIFICATION SYSTEM (in-app for prototype)
// ============================================

function requestNotificationPermission() {
  // No-op in prototype — using in-app notifications
}

// In-app notification state is managed via component state
// sendNotification is replaced by direct state updates in the component

// ============================================
// STYLES
// ============================================

const styles = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(165deg, #F5E6D3 0%, #F0DCC8 40%, #EBD5BF 70%, #F2E4D6 100%)",
    fontFamily: "'Instrument Serif', 'Georgia', serif",
    color: "#2C3A4A",
    position: "relative",
    overflow: "hidden",
  },
  container: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 24px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  // Onboarding
  onboardingWrap: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "40px 0",
  },
  progressBar: {
    display: "flex",
    gap: 4,
    marginBottom: 48,
  },
  progressDot: (active, done) => ({
    flex: 1,
    height: 3,
    borderRadius: 2,
    background: done ? "#D4954A" : active ? "#E8A838" : "#D9C9B5",
    transition: "background 0.5s ease",
  }),
  onboardTitle: {
    fontSize: 28,
    lineHeight: 1.3,
    fontWeight: 400,
    marginBottom: 8,
    letterSpacing: "-0.01em",
    color: "#1E2A4A",
  },
  onboardSubtext: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: "#5A6B7A",
    lineHeight: 1.6,
    marginBottom: 36,
    fontWeight: 400,
  },
  nameInput: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 24,
    border: "none",
    borderBottom: "2px solid #D4954A",
    background: "transparent",
    padding: "12px 0",
    width: "100%",
    outline: "none",
    color: "#1E2A4A",
    letterSpacing: "-0.01em",
  },
  // Multi-select chips
  chipGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  chip: (selected) => ({
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    padding: "14px 18px",
    borderRadius: 12,
    border: selected ? "1.5px solid #D4954A" : "1.5px solid #D9C9B5",
    background: selected ? "rgba(212, 149, 74, 0.12)" : "rgba(255,255,255,0.6)",
    cursor: "pointer",
    transition: "all 0.25s ease",
    color: selected ? "#1E2A4A" : "#5A6B7A",
    fontWeight: selected ? 500 : 400,
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: 10,
    lineHeight: 1.4,
  }),
  // Frequency cards
  freqCard: (selected) => ({
    fontFamily: "'DM Sans', sans-serif",
    padding: "18px 20px",
    borderRadius: 14,
    border: selected ? "1.5px solid #D4954A" : "1.5px solid #D9C9B5",
    background: selected ? "rgba(212, 149, 74, 0.12)" : "rgba(255,255,255,0.6)",
    cursor: "pointer",
    transition: "all 0.25s ease",
    textAlign: "left",
  }),
  freqLabel: (selected) => ({
    fontSize: 15,
    fontWeight: selected ? 600 : 500,
    color: selected ? "#1E2A4A" : "#3A4A5A",
    marginBottom: 2,
  }),
  freqDesc: {
    fontSize: 13,
    color: "#6B8BA4",
    fontWeight: 400,
  },
  // Buttons
  nextBtn: (disabled) => ({
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    fontWeight: 500,
    padding: "16px 32px",
    borderRadius: 50,
    border: "none",
    background: disabled ? "#D9C9B5" : "#1E2A4A",
    color: disabled ? "#A0A8B0" : "#F5E6D3",
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.3s ease",
    marginTop: 32,
    alignSelf: "flex-start",
    letterSpacing: "0.02em",
  }),
  skipBtn: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: "#6B8BA4",
    background: "none",
    border: "none",
    cursor: "pointer",
    marginTop: 16,
    padding: 0,
    alignSelf: "flex-start",
  },
  // File upload
  dropZone: (dragging) => ({
    border: `2px dashed ${dragging ? "#D4954A" : "#D9C9B5"}`,
    borderRadius: 16,
    padding: "48px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    background: dragging ? "rgba(212,149,74,0.08)" : "rgba(255,255,255,0.4)",
  }),
  // Dashboard
  dashHeader: {
    paddingTop: 40,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
    marginBottom: 4,
    color: "#1E2A4A",
  },
  dateText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: "#6B8BA4",
    fontWeight: 400,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  card: {
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(20px)",
    borderRadius: 16,
    padding: "22px 22px",
    marginBottom: 14,
    border: "1px solid rgba(212, 149, 74, 0.2)",
    boxShadow: "0 4px 16px rgba(30,42,74,0.04)",
  },
  cardTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    color: "#D4954A",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  cardText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14.5,
    lineHeight: 1.6,
    color: "#3A4A5A",
    fontWeight: 400,
  },
  // Mood check-in
  moodRow: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
  },
  moodBtn: (selected) => ({
    width: 56,
    height: 56,
    borderRadius: 14,
    border: selected ? "2px solid #D4954A" : "1.5px solid #D9C9B5",
    background: selected ? "rgba(212,149,74,0.15)" : "rgba(255,255,255,0.6)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    fontSize: 22,
  }),
  moodLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 9,
    color: "#6B8BA4",
    marginTop: 2,
  },
  // Reset suggestion
  resetSuggestion: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 0",
    borderBottom: "1px solid rgba(212,149,74,0.15)",
  },
  resetBtnGroup: {
    display: "flex",
    gap: 8,
  },
  resetYes: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    padding: "8px 20px",
    borderRadius: 50,
    border: "none",
    background: "#1E2A4A",
    color: "#F5E6D3",
    cursor: "pointer",
  },
  resetNo: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    padding: "8px 20px",
    borderRadius: 50,
    border: "1.5px solid #D9C9B5",
    background: "transparent",
    color: "#5A6B7A",
    cursor: "pointer",
  },
  // Nudge overlay
  nudgeOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(30,42,74,0.5)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    animation: "fadeIn 0.3s ease",
  },
  nudgeCard: {
    background: "#F5E6D3",
    borderRadius: 20,
    padding: "36px 28px",
    maxWidth: 380,
    width: "90%",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(30,42,74,0.2)",
  },
  nudgeText: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 20,
    lineHeight: 1.5,
    color: "#1E2A4A",
    marginBottom: 28,
    fontWeight: 400,
  },
  nudgeDismiss: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    padding: "12px 32px",
    borderRadius: 50,
    border: "none",
    background: "#D4954A",
    color: "#1E2A4A",
    cursor: "pointer",
  },
  // Timeline
  timelineItem: (isPast) => ({
    display: "flex",
    gap: 14,
    padding: "14px 0",
    opacity: isPast ? 0.5 : 1,
    transition: "opacity 0.3s ease",
  }),
  timelineDot: (isNext) => ({
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: isNext ? "#D4954A" : "#D9C9B5",
    marginTop: 5,
    flexShrink: 0,
    boxShadow: isNext ? "0 0 0 4px rgba(212,149,74,0.2)" : "none",
  }),
  timelineTime: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: "#6B8BA4",
    fontWeight: 500,
  },
  timelineName: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "#3A4A5A",
    fontWeight: 500,
    marginTop: 2,
  },
  // Nav
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "rgba(245,230,211,0.95)",
    backdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(212,149,74,0.2)",
    display: "flex",
    justifyContent: "center",
    gap: 48,
    padding: "14px 0 28px",
    zIndex: 50,
  },
  navItem: (active) => ({
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    color: active ? "#1E2A4A" : "#6B8BA4",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    letterSpacing: "0.03em",
  }),
  // API key input
  apiInput: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    border: "1.5px solid #D9C9B5",
    borderRadius: 10,
    background: "rgba(255,255,255,0.6)",
    padding: "12px 16px",
    width: "100%",
    outline: "none",
    color: "#3A4A5A",
    marginTop: 8,
    boxSizing: "border-box",
  },
  // Keyword input
  keywordInput: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    border: "1.5px solid #D9C9B5",
    borderRadius: 10,
    background: "rgba(255,255,255,0.6)",
    padding: "12px 16px",
    width: "100%",
    outline: "none",
    color: "#3A4A5A",
    marginTop: 12,
    boxSizing: "border-box",
  },
  customInput: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    border: "1.5px solid #D9C9B5",
    borderRadius: 10,
    background: "rgba(255,255,255,0.6)",
    padding: "12px 16px",
    width: "100%",
    outline: "none",
    color: "#3A4A5A",
    marginTop: 12,
    boxSizing: "border-box",
  },
  // Insight card
  insightCard: {
    background: "linear-gradient(135deg, rgba(30,42,74,0.06) 0%, rgba(107,139,164,0.08) 100%)",
    borderRadius: 16,
    padding: "22px 22px",
    marginBottom: 14,
    border: "1px solid rgba(30,42,74,0.1)",
  },
  loadingDots: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "#6B8BA4",
    fontStyle: "italic",
  },
};

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function GroundedApp() {
  // App state
  const [view, setView] = useState("onboarding"); // onboarding, morning, dashboard, endofday
  const [onboardStep, setOnboardStep] = useState(0);
  const TOTAL_ONBOARD_STEPS = 8;

  // Profile
  const [profile, setProfile] = useState({
    name: "",
    apiKey: "",
    drains: [],
    meetingTypes: [],
    meetingKeywords: "",
    frequency: "",
    resetActivities: [],
    customReset: "",
  });

  // Calendar
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [todayEvents, setTodayEventsState] = useState([]);
  const [calendarUploaded, setCalendarUploaded] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Mood & data
  const [morningMood, setMorningMood] = useState(null);
  const [moodHistory, setMoodHistory] = useState([]);
  const [postMeetingPending, setPostMeetingPending] = useState(null);

  // Nudges
  const [activeNudge, setActiveNudge] = useState(null);
  const [scheduledTimers, setScheduledTimers] = useState([]);
  const [triggeredNudges, setTriggeredNudges] = useState(new Set());

  // Dashboard content
  const [dashboardHeadline, setDashboardHeadline] = useState("");
  const [dashboardCards, setDashboardCards] = useState([]);
  const [resetSuggestions, setResetSuggestions] = useState([]);
  const [acceptedResets, setAcceptedResets] = useState(new Set());
  const [dismissedResets, setDismissedResets] = useState(new Set());

  // End of day
  const [eodHeadline, setEodHeadline] = useState("");
  const [eodMoments, setEodMoments] = useState([]);
  const [eodInsight, setEodInsight] = useState("");
  const [eodBannerText, setEodBannerText] = useState("");
  const [showEodBanner, setShowEodBanner] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);

  // In-app toast notifications
  const [toast, setToast] = useState(null); // { title, body }
  const toastTimerRef = useRef(null);

  const showToast = useCallback((title, body) => {
    setToast({ title, body });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 6000);
  }, []);

  // Active tab for dashboard
  const [activeTab, setActiveTab] = useState("today");

  const fileInputRef = useRef(null);

  // ==========================================
  // CALENDAR UPLOAD HANDLER
  // ==========================================

  const handleFileUpload = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const events = parseICS(e.target.result);
      setCalendarEvents(events);
      const today = getTodayEvents(events);
      setTodayEventsState(today);
      setCalendarUploaded(true);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".ics") || file.type === "text/calendar")) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  // ==========================================
  // GENERATE DASHBOARD CONTENT
  // ==========================================

  const generateMorningDashboard = useCallback(async () => {
    setLoading(true);
    const ctx = buildUserContext(profile, moodHistory, todayEvents);
    const morningMoodText = morningMood
      ? `Their morning check-in was: ${morningMood}/5 (${MORNING_SCALE.find((m) => m.value === morningMood)?.label})`
      : "No morning check-in yet";

    // Generate headline
    const headline = await callLLM(
      profile.apiKey,
      SYSTEM_PROMPT_BASE,
      `${ctx}\n${morningMoodText}\n\n[morning-dashboard] Generate a warm, perceptive one-liner that reads their day ahead. Not a greeting — a genuine observation about what their day looks like. Under 25 words. Example tone: "A packed morning followed by some breathing room this afternoon — let's pace through it together."`
    );
    setDashboardHeadline(headline);

    // Generate positive cards
    const cardsRaw = await callLLM(
      profile.apiKey,
      SYSTEM_PROMPT_BASE + "\nRespond ONLY in valid JSON array format. No markdown, no backticks.",
      `${ctx}\n${morningMoodText}\n\n[morning-cards] Generate exactly 3 positively framed insight cards about today's schedule. Each card should notice something supportive — never add stress. Frame everything as opportunity or acknowledgment. Return as JSON array of objects with "icon" (single emoji) and "text" (under 20 words each) fields. Example: [{"icon":"🌬️","text":"There's a 30-minute window at 1pm — a chance to reset"},{"icon":"💪","text":"Your afternoon is lighter — something to look forward to"},{"icon":"🤝","text":"I'll check in during your morning stretch to keep you company"}]`
    );

    try {
      const cleaned = cardsRaw.replace(/```json|```/g, "").trim();
      const cards = JSON.parse(cleaned);
      setDashboardCards(cards);
    } catch {
      setDashboardCards([
        { icon: "🌿", text: "I'll be here with you throughout the day" },
        { icon: "🌬️", text: "We'll find moments to breathe between meetings" },
        { icon: "💛", text: "You're already doing the work just by showing up" },
      ]);
    }

    // Generate reset suggestions from gaps
    const gaps = findGaps(todayEvents);
    const userResets = profile.resetActivities.map(
      (r) => RESET_ACTIVITIES.find((x) => x.id === r)?.label
    );
    const allResets = [...userResets];
    if (profile.customReset) allResets.push(profile.customReset);

    const suggestions = gaps.slice(0, 3).map((gap, i) => ({
      id: i,
      start: gap.start,
      end: gap.end,
      duration: gap.duration,
      activity: allResets[i % allResets.length] || "Take a short break",
    }));
    setResetSuggestions(suggestions);

    setLoading(false);
  }, [profile, moodHistory, todayEvents, morningMood]);

  // Scheduled nudge info for debug panel
  const [scheduledInfo, setScheduledInfo] = useState([]);

  // ==========================================
  // SCHEDULE NUDGES
  // ==========================================

  const scheduleNudges = useCallback(() => {
    // Clear existing timers
    scheduledTimers.forEach((t) => clearTimeout(t));
    const newTimers = [];
    const now = new Date();
    const info = [];

    todayEvents.forEach((event, idx) => {
      const nudgeTime = new Date(event.start.getTime() - 5 * 60000); // 5 min before
      const postTime = new Date(event.end.getTime() + 60000); // 1 min after

      // Pre-meeting nudge
      if (nudgeTime > now) {
        const delay = nudgeTime - now;
        info.push({
          type: "pre",
          meeting: event.title || "Untitled",
          triggerAt: nudgeTime,
          delay,
          idx,
        });
        const timer = setTimeout(async () => {
          if (triggeredNudges.has(`pre-${idx}`)) return;

          const ctx = buildUserContext(profile, moodHistory, todayEvents);
          const nudgeText = await callLLM(
            profile.apiKey,
            SYSTEM_PROMPT_BASE,
            `${ctx}\n\n[pre-meeting] The user has a meeting coming up in 5 minutes: "${event.title || "Untitled meeting"}" at ${formatTime(event.start)}. ${event.description ? `Meeting description: ${event.description}` : ""} ${event.attendees ? `Attendees: ${event.attendees.join(", ")}` : ""}\n\nGenerate a brief, warm pre-meeting nudge. Acknowledge what they might be feeling based on their known stressors. Under 30 words. No greeting needed — just a grounding, supportive observation.`
          );

          setActiveNudge({ type: "pre", text: nudgeText, meeting: event.title });
          setTriggeredNudges((prev) => new Set([...prev, `pre-${idx}`]));
          showToast("Meeting coming up", nudgeText);
        }, delay);
        newTimers.push(timer);
      } else if (nudgeTime <= now && event.start > now) {
        // Meeting is within 5 min — nudge immediately
        info.push({
          type: "pre",
          meeting: event.title || "Untitled",
          triggerAt: now,
          delay: 0,
          idx,
          imminent: true,
        });
      }

      // Post-meeting check-in
      if (postTime > now) {
        info.push({
          type: "post",
          meeting: event.title || "Untitled",
          triggerAt: postTime,
          delay: postTime - now,
          idx,
        });
        const timer = setTimeout(() => {
          if (triggeredNudges.has(`post-${idx}`)) return;
          setPostMeetingPending(event);
          setTriggeredNudges((prev) => new Set([...prev, `post-${idx}`]));
          showToast("How was that?", `Quick check-in after: ${event.title || "your meeting"}`);
        }, postTime - now);
        newTimers.push(timer);
      }
    });

    setScheduledInfo(info);
    setScheduledTimers(newTimers);
  }, [todayEvents, profile, moodHistory, triggeredNudges, scheduledTimers]);

  // ==========================================
  // END OF DAY
  // ==========================================

  const generateEndOfDay = useCallback(async () => {
    setLoading(true);
    const ctx = buildUserContext(profile, moodHistory, todayEvents);
    const morningText = morningMood
      ? `Morning check-in: ${morningMood}/5`
      : "No morning check-in";
    const resetsText = acceptedResets.size > 0
      ? `Resets taken: ${acceptedResets.size}`
      : "No resets taken";

    // Curiosity hook
    const hook = await callLLM(
      profile.apiKey,
      SYSTEM_PROMPT_BASE,
      `${ctx}\n${morningText}\n${resetsText}\n\n[curiosity-hook] Generate an intriguing one-liner for a notification that makes the user curious to open the app and see their day summary. Reference something specific from their day without revealing everything. Under 15 words. Examples: "Something shifted after your 2pm meeting today." or "You had a turning point this afternoon."`
    );
    setEodBannerText(hook);

    // Headline
    const headline = await callLLM(
      profile.apiKey,
      SYSTEM_PROMPT_BASE,
      `${ctx}\n${morningText}\n${resetsText}\n\n[end-of-day] Generate a warm, reflective one-liner summarizing what their day was like. Validate effort over performance. Under 25 words.`
    );
    setEodHeadline(headline);

    // Moment cards
    const momentsRaw = await callLLM(
      profile.apiKey,
      SYSTEM_PROMPT_BASE + "\nRespond ONLY in valid JSON array format. No markdown, no backticks.",
      `${ctx}\n${morningText}\n${resetsText}\n\n[end-of-day-moments] Generate exactly 3 "moments I noticed" cards. Each should highlight something positive the user did or experienced today. Reference specific meetings or mood shifts when possible. Return as JSON array of objects with "icon" (single emoji) and "text" (under 20 words each). Frame everything around effort and resilience, not performance.`
    );

    try {
      const cleaned = momentsRaw.replace(/```json|```/g, "").trim();
      setEodMoments(JSON.parse(cleaned));
    } catch {
      setEodMoments([
        { icon: "💪", text: "You showed up for every meeting today — that takes real effort" },
        { icon: "🌿", text: "You checked in with yourself multiple times today" },
        { icon: "✨", text: "You made it through a full day — that's worth noticing" },
      ]);
    }

    // Insight
    const insight = await callLLM(
      profile.apiKey,
      SYSTEM_PROMPT_BASE,
      `${ctx}\n${morningText}\n${resetsText}\n\n[insight] Generate one subtle insight the user might not have noticed about their day. Something about a pattern, a strength, or a shift. This should make them feel seen and understood. Be specific and perceptive. 1-2 sentences max.`
    );
    setEodInsight(insight);

    setLoading(false);
  }, [profile, moodHistory, todayEvents, morningMood, acceptedResets]);

  // ==========================================
  // INSTANT NUDGE TRIGGER (for testing)
  // ==========================================

  const triggerTestNudge = useCallback(async (event, type) => {
    if (type === "pre") {
      const ctx = buildUserContext(profile, moodHistory, todayEvents);
      setLoading(true);
      const nudgeText = await callLLM(
        profile.apiKey,
        SYSTEM_PROMPT_BASE,
        `${ctx}\n\n[pre-meeting] The user has a meeting coming up in 5 minutes: "${event.title || "Untitled meeting"}" at ${formatTime(event.start)}. ${event.description ? `Meeting description: ${event.description}` : ""} ${event.attendees ? `Attendees: ${event.attendees.join(", ")}` : ""}\n\nGenerate a brief, warm pre-meeting nudge. Acknowledge what they might be feeling based on their known stressors. Under 30 words. No greeting needed — just a grounding, supportive observation.`
      );
      setLoading(false);
      setActiveNudge({ type: "pre", text: nudgeText, meeting: event.title });
      showToast("Meeting coming up", nudgeText);
    } else {
      setPostMeetingPending(event);
      showToast("How was that?", `Quick check-in after: ${event.title || "your meeting"}`);
    }
  }, [profile, moodHistory, todayEvents, showToast]);

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    if (view === "dashboard" && todayEvents.length > 0 && !dashboardHeadline) {
      generateMorningDashboard();
      requestNotificationPermission();
    }
  }, [view, todayEvents, dashboardHeadline, generateMorningDashboard]);

  useEffect(() => {
    if (view === "dashboard" && todayEvents.length > 0 && scheduledTimers.length === 0) {
      scheduleNudges();
    }
  }, [view, todayEvents, scheduleNudges, scheduledTimers.length]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleMorningCheckin = (value) => {
    setMorningMood(value);
    setMoodHistory((prev) => [
      ...prev,
      { value, context: "morning", time: new Date() },
    ]);
    setTimeout(() => setView("dashboard"), 600);
  };

  const handlePostMeetingMood = (value) => {
    setMoodHistory((prev) => [
      ...prev,
      {
        value,
        context: `after: ${postMeetingPending?.title || "meeting"}`,
        time: new Date(),
      },
    ]);
    setPostMeetingPending(null);
  };

  const handleResetAccept = (id) => {
    setAcceptedResets((prev) => new Set([...prev, id]));
  };

  const handleResetDismiss = (id) => {
    setDismissedResets((prev) => new Set([...prev, id]));
  };

  const toggleDrain = (id) => {
    setProfile((p) => ({
      ...p,
      drains: p.drains.includes(id)
        ? p.drains.filter((d) => d !== id)
        : [...p.drains, id],
    }));
  };

  const toggleMeetingType = (id) => {
    setProfile((p) => ({
      ...p,
      meetingTypes: p.meetingTypes.includes(id)
        ? p.meetingTypes.filter((m) => m !== id)
        : [...p.meetingTypes, id],
    }));
  };

  const toggleResetActivity = (id) => {
    setProfile((p) => ({
      ...p,
      resetActivities: p.resetActivities.includes(id)
        ? p.resetActivities.filter((r) => r !== id)
        : [...p.resetActivities, id],
    }));
  };

  const canProceed = () => {
    switch (onboardStep) {
      case 0: return profile.name.trim().length > 0;
      case 1: return profile.apiKey.trim().length > 0;
      case 2: return calendarUploaded;
      case 3: return profile.drains.length > 0;
      case 4: return profile.meetingTypes.length > 0;
      case 5: return profile.frequency !== "";
      case 6: return profile.resetActivities.length > 0;
      case 7: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (onboardStep < TOTAL_ONBOARD_STEPS - 1) {
      setOnboardStep((s) => s + 1);
    } else {
      setView("morning");
    }
  };

  // ==========================================
  // RENDER: ONBOARDING
  // ==========================================

  const renderOnboarding = () => {
    const steps = [
      // Step 0: Name
      () => (
        <div>
          <h1 style={styles.onboardTitle}>
            Hey, I'm here to have your back throughout your workday.
          </h1>
          <p style={styles.onboardSubtext}>What should I call you?</p>
          <input
            type="text"
            placeholder="Your first name"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            style={styles.nameInput}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && canProceed() && nextStep()}
          />
        </div>
      ),

      // Step 1: API Key
      () => (
        <div>
          <h1 style={styles.onboardTitle}>
            One quick setup, {profile.name}.
          </h1>
          <p style={styles.onboardSubtext}>
            I use AI to personalize everything I say to you — nudges, insights, reflections.
            To do that, I need your OpenAI API key. It stays in your browser and is never stored anywhere else.
          </p>
          <input
            type="password"
            placeholder="sk-..."
            value={profile.apiKey}
            onChange={(e) => setProfile((p) => ({ ...p, apiKey: e.target.value }))}
            style={styles.apiInput}
            autoFocus
          />
          <p style={{ ...styles.onboardSubtext, fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            Don't have one?{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#D4954A", textDecoration: "underline" }}
            >
              Get your API key here
            </a>
          </p>
        </div>
      ),

      // Step 2: Calendar upload
      () => (
        <div>
          <h1 style={styles.onboardTitle}>
            Nice to meet you, {profile.name}.
          </h1>
          <p style={styles.onboardSubtext}>
            Here's how I work — I look at your day so I can check in at the right
            moments. Before a tough meeting, after a long stretch, or when there's a
            window to breathe. I just need your calendar to know when to show up for you.
          </p>

          {!calendarUploaded ? (
            <div>
              <div
                style={styles.dropZone(dragging)}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#5A6B7A", margin: 0 }}>
                  Drop your calendar file here
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#A89F95", marginTop: 6 }}>
                  .ics file from Google, Apple, or Outlook
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
              </div>

              <details style={{ marginTop: 20 }}>
                <summary style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#D4954A",
                  cursor: "pointer",
                }}>
                  How do I export my calendar?
                </summary>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#5A6B7A", lineHeight: 1.8, marginTop: 10 }}>
                  <strong>Google Calendar:</strong> Settings → Import & Export → Export → Download .ics<br />
                  <strong>Apple Calendar:</strong> File → Export → Export as .ics<br />
                  <strong>Outlook:</strong> File → Save Calendar → Save as .ics
                </div>
              </details>
            </div>
          ) : (
            <div style={styles.card}>
              <div style={{ fontSize: 20, marginBottom: 12 }}>✨</div>
              <p style={{ ...styles.cardText, fontWeight: 500, color: "#1E2A4A" }}>
                Looks like you have {todayEvents.length} meeting{todayEvents.length !== 1 ? "s" : ""} today
              </p>
              {todayEvents.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {todayEvents.slice(0, 4).map((e, i) => (
                    <div key={i} style={{ ...styles.cardText, fontSize: 13, padding: "4px 0" }}>
                      {formatTime(e.start)} — {e.title || "Untitled"}
                    </div>
                  ))}
                  {todayEvents.length > 4 && (
                    <div style={{ ...styles.cardText, fontSize: 13, color: "#A89F95", paddingTop: 4 }}>
                      + {todayEvents.length - 4} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ),

      // Step 3: What drains you
      () => (
        <div>
          <h1 style={styles.onboardTitle}>
            Help me understand what tends to wear you down.
          </h1>
          <p style={styles.onboardSubtext}>Pick as many as feel true. No wrong answers.</p>
          <div style={styles.chipGrid}>
            {DRAINS.map((d) => (
              <button
                key={d.id}
                style={styles.chip(profile.drains.includes(d.id))}
                onClick={() => toggleDrain(d.id)}
              >
                <span>{d.icon}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      ),

      // Step 4: Meetings that matter
      () => (
        <div>
          <h1 style={styles.onboardTitle}>
            Are there certain meetings that carry more weight for you?
          </h1>
          <p style={styles.onboardSubtext}>This helps me know when to really show up.</p>
          <div style={styles.chipGrid}>
            {MEETING_TYPES.map((m) => (
              <button
                key={m.id}
                style={styles.chip(profile.meetingTypes.includes(m.id))}
                onClick={() => toggleMeetingType(m.id)}
              >
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Any keywords to watch for? (e.g., project names, people)"
            value={profile.meetingKeywords}
            onChange={(e) => setProfile((p) => ({ ...p, meetingKeywords: e.target.value }))}
            style={styles.keywordInput}
          />
        </div>
      ),

      // Step 5: Check-in frequency
      () => (
        <div>
          <h1 style={styles.onboardTitle}>
            How often would you like to hear from me?
          </h1>
          <p style={styles.onboardSubtext}>You can always change this later.</p>
          <div style={{ ...styles.chipGrid, gap: 10 }}>
            {FREQUENCY_OPTIONS.map((f) => (
              <button
                key={f.id}
                style={styles.freqCard(profile.frequency === f.id)}
                onClick={() => setProfile((p) => ({ ...p, frequency: f.id }))}
              >
                <div style={styles.freqLabel(profile.frequency === f.id)}>
                  {f.label}
                </div>
                <div style={styles.freqDesc}>{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ),

      // Step 6: Reset activities
      () => (
        <div>
          <h1 style={styles.onboardTitle}>
            When you need a quick reset, what actually helps?
          </h1>
          <p style={styles.onboardSubtext}>Pick your go-tos. I'll suggest these during open windows.</p>
          <div style={styles.chipGrid}>
            {RESET_ACTIVITIES.map((r) => (
              <button
                key={r.id}
                style={styles.chip(profile.resetActivities.includes(r.id))}
                onClick={() => toggleResetActivity(r.id)}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Something else that works for you?"
            value={profile.customReset}
            onChange={(e) => setProfile((p) => ({ ...p, customReset: e.target.value }))}
            style={styles.customInput}
          />
        </div>
      ),

      // Step 7: Closing
      () => (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>🌿</div>
          <h1 style={{ ...styles.onboardTitle, fontSize: 26 }}>
            That's everything, {profile.name}.
          </h1>
          <p style={{ ...styles.onboardSubtext, maxWidth: 320, margin: "0 auto" }}>
            I'll be here throughout your day — not to add to your list, but to help
            you move through it.
          </p>
        </div>
      ),
    ];

    return (
      <div style={styles.container}>
        <div style={styles.onboardingWrap}>
          {/* Progress bar */}
          <div style={styles.progressBar}>
            {Array.from({ length: TOTAL_ONBOARD_STEPS }).map((_, i) => (
              <div
                key={i}
                style={styles.progressDot(i === onboardStep, i < onboardStep)}
              />
            ))}
          </div>

          {/* Step content */}
          <div style={{ flex: 1 }}>{steps[onboardStep]()}</div>

          {/* Navigation */}
          <div>
            <button
              style={styles.nextBtn(!canProceed())}
              onClick={nextStep}
              disabled={!canProceed()}
            >
              {onboardStep === TOTAL_ONBOARD_STEPS - 1 ? "Start my day" : "Continue"}
            </button>
            {onboardStep > 0 && onboardStep < TOTAL_ONBOARD_STEPS - 1 && (
              <button
                style={styles.skipBtn}
                onClick={nextStep}
              >
                Skip for now
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: MORNING CHECK-IN
  // ==========================================

  const renderMorningCheckin = () => (
    <div style={styles.container}>
      <div style={{
        ...styles.onboardingWrap,
        textAlign: "center",
        justifyContent: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 20 }}>🌅</div>
        <h1 style={{ ...styles.onboardTitle, fontSize: 24 }}>
          Good morning, {profile.name}.
        </h1>
        <p style={styles.onboardSubtext}>
          How are you feeling waking up today?
        </p>
        <div style={styles.moodRow}>
          {MORNING_SCALE.map((m) => (
            <button
              key={m.value}
              style={styles.moodBtn(morningMood === m.value)}
              onClick={() => handleMorningCheckin(m.value)}
            >
              <span>{m.emoji}</span>
              <span style={styles.moodLabel}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // RENDER: MAIN DASHBOARD
  // ==========================================

  const renderDashboard = () => {
    const now = new Date();
    const nextMeeting = todayEvents.find((e) => e.start > now);

    return (
      <div style={styles.container}>
        <div style={{ paddingBottom: 100 }}>
          {/* Header */}
          <div style={styles.dashHeader}>
            <div style={styles.dateText}>
              {now.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <h1 style={styles.greeting}>
              {dashboardHeadline || `Hey, ${profile.name}.`}
            </h1>
          </div>

          {/* Morning mood indicator */}
          {morningMood && (
            <div style={{ ...styles.card, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>
                {MORNING_SCALE.find((m) => m.value === morningMood)?.emoji}
              </span>
              <div>
                <div style={{ ...styles.cardTitle, marginBottom: 2 }}>This morning</div>
                <div style={{ ...styles.cardText, fontSize: 13 }}>
                  {MORNING_SCALE.find((m) => m.value === morningMood)?.label}
                </div>
              </div>
            </div>
          )}

          {/* Insight cards */}
          {loading ? (
            <div style={styles.card}>
              <p style={styles.loadingDots}>Reading your day...</p>
            </div>
          ) : (
            dashboardCards.map((card, i) => (
              <div key={i} style={styles.card}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20 }}>{card.icon}</span>
                  <p style={{ ...styles.cardText, margin: 0 }}>{card.text}</p>
                </div>
              </div>
            ))
          )}

          {/* Today's timeline */}
          {todayEvents.length > 0 && (
            <div style={{ ...styles.card, marginTop: 8 }}>
              <div style={styles.cardTitle}>Your day</div>
              {todayEvents.map((event, i) => {
                const isPast = event.end < now;
                const isNext =
                  nextMeeting && event.start.getTime() === nextMeeting.start.getTime();
                return (
                  <div key={i} style={styles.timelineItem(isPast)}>
                    <div style={styles.timelineDot(isNext)} />
                    <div>
                      <div style={styles.timelineTime}>
                        {formatTime(event.start)} — {formatTime(event.end)}
                      </div>
                      <div style={styles.timelineName}>
                        {event.title || "Untitled"}
                      </div>
                      {/* Show mood if we have post-meeting data */}
                      {moodHistory.find(
                        (m) => m.context === `after: ${event.title}`
                      ) && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 14 }}>
                            {
                              MOOD_SCALE.find(
                                (s) =>
                                  s.value ===
                                  moodHistory.find(
                                    (m) => m.context === `after: ${event.title}`
                                  )?.value
                              )?.emoji
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reset suggestions */}
          {resetSuggestions.length > 0 && (
            <div style={{ ...styles.card, marginTop: 8 }}>
              <div style={styles.cardTitle}>Breathing room I found</div>
              {resetSuggestions.map((r) => {
                const accepted = acceptedResets.has(r.id);
                const dismissed = dismissedResets.has(r.id);
                if (dismissed) return null;
                return (
                  <div key={r.id} style={styles.resetSuggestion}>
                    <div>
                      <div style={{ ...styles.cardText, fontSize: 14, fontWeight: 500 }}>
                        {formatTime(r.start)} — {formatDuration(r.duration)}
                      </div>
                      <div style={{ ...styles.cardText, fontSize: 13, color: "#8A7F74" }}>
                        {r.activity}
                      </div>
                    </div>
                    {accepted ? (
                      <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: "#D4954A",
                        fontWeight: 500,
                      }}>
                        ✓ Scheduled
                      </span>
                    ) : (
                      <div style={styles.resetBtnGroup}>
                        <button
                          style={styles.resetYes}
                          onClick={() => handleResetAccept(r.id)}
                        >
                          Yes
                        </button>
                        <button
                          style={styles.resetNo}
                          onClick={() => handleResetDismiss(r.id)}
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ====== TEST PANEL ====== */}
          <div style={{
            ...styles.card,
            marginTop: 20,
            background: "rgba(139,115,85,0.06)",
            border: "1.5px dashed #6B8BA4",
          }}>
            <div style={{ ...styles.cardTitle, color: "#D4954A", marginBottom: 16 }}>
              🧪 Test Panel (for development)
            </div>

            {/* Notification status */}
            <div style={{ ...styles.cardText, fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "rgba(139,115,85,0.08)", borderRadius: 8 }}>
              ✅ Running in prototype mode — nudges appear as in-app pop-ups
            </div>

            {/* Calendar stats */}
            <div style={{ ...styles.cardText, fontSize: 13, marginBottom: 12 }}>
              <strong>Today's events:</strong> {todayEvents.length} meetings parsed
            </div>

            {/* Scheduled nudges */}
            <div style={{ ...styles.cardText, fontSize: 13, marginBottom: 8 }}>
              <strong>Scheduled nudges:</strong> {scheduledInfo.length} pending
            </div>

            {scheduledInfo.length === 0 && todayEvents.length > 0 && (
              <div style={{ ...styles.cardText, fontSize: 12, color: "#6B8BA4", fontStyle: "italic", marginBottom: 12 }}>
                All meetings may have already passed, or nudges were already triggered. Use the instant trigger buttons below to test.
              </div>
            )}

            {scheduledInfo.map((s, i) => {
              const minsUntil = Math.round(s.delay / 60000);
              return (
                <div key={i} style={{
                  ...styles.cardText,
                  fontSize: 12,
                  padding: "6px 0",
                  borderBottom: "1px solid rgba(168,144,112,0.15)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>
                    {s.type === "pre" ? "📣 Pre" : "💭 Post"}: {s.meeting}{" "}
                    <span style={{ color: "#6B8BA4" }}>
                      ({s.imminent ? "imminent" : `in ${minsUntil} min`} — {formatTime(s.triggerAt)})
                    </span>
                  </span>
                </div>
              );
            })}

            {/* Instant trigger buttons */}
            <div style={{ marginTop: 16 }}>
              <div style={{ ...styles.cardText, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                Trigger instantly:
              </div>
              {todayEvents.map((event, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(168,144,112,0.1)",
                }}>
                  <span style={{ ...styles.cardText, fontSize: 12, flex: 1 }}>
                    {formatTime(event.start)} {event.title || "Untitled"}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      style={{ ...styles.resetYes, fontSize: 11, padding: "4px 10px" }}
                      onClick={() => triggerTestNudge(event, "pre")}
                    >
                      Pre-nudge
                    </button>
                    <button
                      style={{ ...styles.resetNo, fontSize: 11, padding: "4px 10px" }}
                      onClick={() => triggerTestNudge(event, "post")}
                    >
                      Post check-in
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              style={{ ...styles.resetYes, marginTop: 16, width: "100%" }}
              onClick={() => showToast("Levio test", "If you see this pop up at the top, in-app notifications are working!")}
            >
              Send test notification
            </button>
          </div>

          {/* End of day trigger (for testing) */}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button
              style={{
                ...styles.skipBtn,
                fontSize: 12,
                color: "#B8AFA5",
              }}
              onClick={async () => {
                await generateEndOfDay();
                setShowEodBanner(true);
              }}
            >
              Preview end-of-day summary →
            </button>
          </div>
        </div>

        {/* Post-meeting mood check-in overlay */}
        {postMeetingPending && (
          <div style={styles.nudgeOverlay}>
            <div style={styles.nudgeCard}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6B8BA4", marginBottom: 8 }}>
                Just finished
              </p>
              <p style={{ ...styles.nudgeText, fontSize: 17, marginBottom: 20 }}>
                {postMeetingPending.title || "Your meeting"}
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#3A4A5A", marginBottom: 16 }}>
                How was that?
              </p>
              <div style={styles.moodRow}>
                {MOOD_SCALE.map((m) => (
                  <button
                    key={m.value}
                    style={styles.moodBtn(false)}
                    onClick={() => handlePostMeetingMood(m.value)}
                  >
                    <span>{m.emoji}</span>
                    <span style={styles.moodLabel}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pre-meeting nudge overlay */}
        {activeNudge && (
          <div style={styles.nudgeOverlay}>
            <div style={styles.nudgeCard}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6B8BA4", marginBottom: 12, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Coming up
              </p>
              <p style={styles.nudgeText}>{activeNudge.text}</p>
              <button
                style={styles.nudgeDismiss}
                onClick={() => setActiveNudge(null)}
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* End of day banner */}
        {showEodBanner && !view.startsWith("endofday") && (
          <div
            style={{
              position: "fixed",
              top: 20,
              left: 20,
              right: 20,
              background: "rgba(92,74,50,0.95)",
              backdropFilter: "blur(12px)",
              borderRadius: 16,
              padding: "18px 22px",
              cursor: "pointer",
              zIndex: 200,
              boxShadow: "0 8px 32px rgba(44,40,37,0.25)",
              animation: "slideDown 0.4s ease",
            }}
            onClick={() => {
              setShowEodBanner(false);
              setView("endofday");
            }}
          >
            <p style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 16,
              color: "#F5E6D3",
              margin: 0,
              marginBottom: 4,
            }}>
              {eodBannerText || "Your day, reflected."}
            </p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: "rgba(245,240,235,0.6)",
              margin: 0,
            }}>
              Tap to see how it went
            </p>
          </div>
        )}

        {/* Bottom nav */}
        <div style={styles.nav}>
          <button style={styles.navItem(activeTab === "today")} onClick={() => setActiveTab("today")}>
            <span style={{ fontSize: 20 }}>☀️</span>
            Today
          </button>
          <button
            style={styles.navItem(activeTab === "reflect")}
            onClick={async () => {
              setActiveTab("reflect");
              if (!eodHeadline) await generateEndOfDay();
              setView("endofday");
            }}
          >
            <span style={{ fontSize: 20 }}>🌙</span>
            Reflect
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: END OF DAY
  // ==========================================

  const renderEndOfDay = () => (
    <div style={styles.container}>
      <div style={{ paddingBottom: 100 }}>
        <div style={styles.dashHeader}>
          <div style={styles.dateText}>End of day</div>
          <h1 style={styles.greeting}>
            {loading ? "Reflecting on your day..." : eodHeadline || `Here's your day, ${profile.name}.`}
          </h1>
        </div>

        {/* Moment cards */}
        {!loading && (
          <>
            <div style={{ ...styles.cardTitle, marginBottom: 14, paddingLeft: 4 }}>
              Moments I noticed
            </div>
            {eodMoments.map((m, i) => (
              <div key={i} style={styles.card}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <p style={{ ...styles.cardText, margin: 0 }}>{m.text}</p>
                </div>
              </div>
            ))}

            {/* Insight */}
            {eodInsight && (
              <div style={styles.insightCard}>
                <div style={{ ...styles.cardTitle, color: "#D4954A" }}>
                  Something you might not have noticed
                </div>
                <p style={{ ...styles.cardText, color: "#1E2A4A", fontStyle: "italic" }}>
                  {eodInsight}
                </p>
              </div>
            )}

            {/* Mood journey */}
            {moodHistory.length > 0 && (
              <div style={{ ...styles.card, marginTop: 8 }}>
                <div style={styles.cardTitle}>Your mood through the day</div>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80, paddingTop: 12 }}>
                  {moodHistory.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 40,
                          height: `${(m.value / 5) * 60}px`,
                          background: `linear-gradient(to top, ${MOOD_SCALE.find((s) => s.value === m.value)?.color || "#D9C9B5"}, rgba(245,230,211,0.3))`,
                          borderRadius: 6,
                          transition: "height 0.5s ease",
                        }}
                      />
                      <span style={{ fontSize: 12 }}>
                        {MOOD_SCALE.find((s) => s.value === m.value)?.emoji}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {loading && (
          <div style={styles.card}>
            <p style={styles.loadingDots}>Taking a look at your day...</p>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={styles.nav}>
        <button
          style={styles.navItem(activeTab === "today")}
          onClick={() => {
            setActiveTab("today");
            setView("dashboard");
          }}
        >
          <span style={{ fontSize: 20 }}>☀️</span>
          Today
        </button>
        <button style={styles.navItem(activeTab === "reflect")} onClick={() => setActiveTab("reflect")}>
          <span style={{ fontSize: 20 }}>🌙</span>
          Reflect
        </button>
      </div>
    </div>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        input::placeholder { color: #B8AFA5; }
        
        button:hover { opacity: 0.9; }
        
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {view === "onboarding" && renderOnboarding()}
      {view === "morning" && renderMorningCheckin()}
      {view === "dashboard" && renderDashboard()}
      {view === "endofday" && renderEndOfDay()}

      {/* In-app toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: 16,
            right: 16,
            background: "#1E2A4A",
            borderRadius: 14,
            padding: "16px 20px",
            zIndex: 300,
            boxShadow: "0 8px 32px rgba(44,40,37,0.3)",
            animation: "slideDown 0.4s ease",
            cursor: "pointer",
          }}
          onClick={() => setToast(null)}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 16 }}>🌿</span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#F5E6D3",
              letterSpacing: "0.02em",
            }}>
              {toast.title}
            </span>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "rgba(245,240,235,0.8)",
            margin: 0,
            paddingLeft: 26,
            lineHeight: 1.5,
          }}>
            {toast.body}
          </p>
        </div>
      )}
    </div>
  );
}
