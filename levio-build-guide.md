# Levio MVP — Build Guide for Claude Code

## WHAT IS THIS
You are building the backend and frontend for Levio, a Progressive Web App that acts as an energy-aware workday companion. It integrates with the user's calendar to deliver brief, personalized, supportive check-ins throughout the workday.

## CRITICAL CONTEXT
- The developer using Claude Code has NO technical background — be thorough, test everything, and explain errors clearly
- There is an existing prototype deployed at a Vercel URL from the GitHub repo `evitaxz/Levio-webapp`. The current prototype is frontend-only (React/Vite). We are adding a real backend and restructuring.
- Do NOT delete the existing repo — we are restructuring it into `frontend/` and `backend/` directories

---

## ARCHITECTURE

```
Frontend:  React (Vite) + PWA — hosted on Vercel
Backend:   Node.js + Express — hosted on Render
Database:  SQLite (via better-sqlite3)
AI:        OpenAI API (gpt-4o-mini) — server-side ONLY
Auth:      Email-only (no password for MVP)
```

### System Flow
```
User opens app → Email login → Onboarding (6 screens) → Calendar upload (.ics)
→ Backend parses calendar → Schedules nudges → AI generates personalized content
→ User sees dashboard with AI insights → Gets nudges before/after meetings
→ End of day: reflective summary
```

---

## PROJECT STRUCTURE

```
Levio-webapp/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app with routing
│   │   ├── main.jsx             # Entry point
│   │   ├── api.js               # API client (all backend calls)
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Onboarding.jsx
│   │   │   ├── MorningCheckin.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── EndOfDay.jsx
│   │   ├── components/
│   │   │   ├── NudgeOverlay.jsx
│   │   │   ├── PostMeetingCheckin.jsx
│   │   │   ├── StarField.jsx
│   │   │   └── CosmicChip.jsx
│   │   └── styles/
│   │       └── theme.js
│   ├── public/
│   │   └── sw.js                # Service worker
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── server.js                # Express entry point
│   ├── routes/
│   │   ├── auth.js              # POST /api/auth/login
│   │   ├── user.js              # GET/PUT /api/user/preferences
│   │   ├── calendar.js          # POST /api/calendar/upload
│   │   ├── energy.js            # POST /api/energy/checkin (mood→energy renamed)
│   │   ├── ai.js                # GET /api/ai/morning, /api/ai/nudge/:eventId, /api/ai/endofday
│   │   └── notifications.js     # POST /api/notifications/subscribe
│   ├── services/
│   │   ├── openai.js            # LLM prompt engine
│   │   ├── calendarParser.js    # .ics parsing + recurring event expansion
│   │   ├── scheduler.js         # Nudge timing calculator + job runner
│   │   ├── pushService.js       # Web push sender
│   │   └── personalization.js   # Targeting logic (which meetings get nudges)
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── db/
│   │   ├── setup.js             # Schema creation
│   │   └── queries.js           # Database helper functions
│   ├── prompts/
│   │   └── index.js             # All 7 LLM prompt templates
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## DATABASE SCHEMA

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

CREATE TABLE user_preferences (
  user_id INTEGER PRIMARY KEY,
  energy_areas TEXT,          -- JSON array of selected meeting types that take energy
  meeting_keywords TEXT,      -- comma-separated keywords
  frequency TEXT,             -- 'low' | 'medium' | 'high' | 'surprise'
  reset_activities TEXT,      -- JSON array of selected activities
  custom_reset TEXT,          -- free text custom activity
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  location TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  attendees TEXT,             -- JSON array of email strings
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE energy_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  value INTEGER NOT NULL,     -- 1-5 scale
  context TEXT,               -- 'morning', 'after: Meeting Title', etc.
  event_id INTEGER,           -- optional link to calendar_events
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE energy_moments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_id INTEGER,
  moment_type TEXT NOT NULL,  -- 'pre_nudge', 'post_checkin', 'morning', 'endofday', 'reset_reminder'
  content TEXT,               -- the AI-generated text that was shown
  delivered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE ai_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  cache_key TEXT NOT NULL,    -- 'morning_2026-03-01', 'endofday_2026-03-01'
  content TEXT NOT NULL,      -- JSON of cached AI response
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, cache_key)
);

CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subscription TEXT NOT NULL, -- JSON of PushSubscription object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## API ENDPOINTS

### Auth
```
POST /api/auth/login
Body: { email: "user@example.com" }
Response: { token: "jwt...", user: { id, email, name, hasCompletedOnboarding } }
Logic: If email exists, return user. If not, create new user.
```

### User
```
GET /api/user/preferences
Response: { name, energy_areas, meeting_keywords, frequency, reset_activities, custom_reset }

PUT /api/user/preferences
Body: { name, energy_areas, meeting_keywords, frequency, reset_activities, custom_reset }
Response: { success: true }
```

### Calendar
```
POST /api/calendar/upload
Body: multipart form with .ics file
Logic:
  1. Parse .ics file using node-ical
  2. Handle recurring events (expand RRULE for next 7 days)
  3. Delete old events for this user
  4. Store all parsed events in calendar_events table
  5. Trigger scheduler to calculate nudge times
Response: { events_count, today_count, events: [...today's events] }
```

### Energy Check-ins
```
POST /api/energy/checkin
Body: { value: 1-5, context: "morning" | "after: Meeting Title", event_id?: number }
Response: { success: true }

GET /api/energy/today
Response: { checkins: [...today's checkins] }
```

### AI Content
```
GET /api/ai/morning
Response: { headline, cards: [{icon, text}], cached: boolean }
Logic: Check ai_cache first. If miss, generate with OpenAI, cache, return.

GET /api/ai/nudge/:eventId
Response: { text, meeting_title }
Logic: Generate personalized pre-meeting nudge. Log to energy_moments.

GET /api/ai/endofday
Response: { hook, headline, moments: [{icon, text}], insight, cached: boolean }
Logic: Check ai_cache first. If miss, generate all end-of-day content.

GET /api/ai/resets
Response: { suggestions: [{ start, end, duration, activity }] }
Logic: Find gaps >= 15 min in today's calendar, pair with user's reset activities.
```

### Notifications
```
POST /api/notifications/subscribe
Body: { subscription: PushSubscription }
Response: { success: true }
```

---

## AI PROMPT SYSTEM

### System Prompt Base (used in ALL AI calls)
```
You are the voice of Levio, a workday energy companion app. Your personality:
- You are a steady, emotionally attuned friend who understands work life deeply
- You know the user's schedule like a colleague would, but speak with warmth and grounded presence
- Your tone is calm, perceptive, and supportive — never dramatic, preachy, overly motivational, or clinical
- You gently name what seems to be happening without diagnosing or over-analyzing
- You validate effort rather than performance
- You offer small grounding invitations instead of instructions
- You remain composed even when the workday feels intense
- Your voice is personal but not intimate, warm but not sentimental, professional but not corporate
- You're like someone quietly sitting beside them, noticing what's happening, offering steady support
- Keep responses concise and natural — never more than 2-3 sentences unless asked
- Never use emojis in your messages
- Address the user by their first name occasionally but not every time
- NEVER use the words: stress, stressed, stressful, anxious, anxiety, overwhelm, overwhelmed, drain, drained, draining, burnout, burned out. Instead use energy-aware language like: "that takes something from you", "that asks a lot", "your energy", "what costs you"
```

### User Context Block (injected into every AI call)
```
Build this dynamically from the database:

User's name: {name}
What takes their energy: {energy_areas mapped to labels}
Meeting keywords to watch for: {meeting_keywords}
Preferred reset activities: {reset_activities mapped to labels}
Recent energy check-ins: {last 10 checkins with context and value}
Today's meetings:
- {time range}: {title} (for each meeting today)
```

### The 7 Prompt Templates

#### 1. Morning Dashboard Headline
```
[morning-dashboard]
{user_context}
Morning energy check-in: {value}/5 ({label})

Generate a warm, perceptive one-liner that reads their day ahead. Not a greeting — a genuine observation about what their day looks like. Under 25 words.
Example tone: "A packed morning followed by some breathing room this afternoon — let's move through it together."
```

#### 2. Morning Dashboard Cards
```
[morning-cards]
{user_context}
Morning energy: {value}/5

Generate exactly 3 positively framed insight cards about today's schedule. Each should notice something supportive — never add pressure. Frame everything as opportunity or acknowledgment. Return ONLY a JSON array of objects with "icon" (single emoji) and "text" (under 20 words each). No markdown, no backticks.
```

#### 3. Pre-Meeting Nudge (MOST IMPORTANT — personalization logic below)
```
[pre-meeting]
{user_context}

The user has a meeting in 5 minutes: "{title}" at {time}.
Meeting details: {description}
Attendees: {attendees}
This meeting type matches their energy area: {matched_area or "no specific match"}
Meetings today so far: {count_completed} completed, {count_remaining} remaining
Back-to-back status: {hours_of_consecutive_meetings or "fresh start"}

Generate a brief, warm pre-meeting nudge. Under 30 words. No greeting — just a grounding, supportive observation.
```

**PERSONALIZATION LOGIC for pre-meeting nudges:**
The nudge language should be shaped by the user's selected energy areas AND the meeting context:
- Performance or feedback → Center on belief and capability: "You know more than you think here."
- Product or technical reviews → Acknowledge preparation: "You've done the thinking. Trust it."
- Presentations or demos → Confidence and grounding: "You've got this. Take a breath before you begin."
- Cross-team alignment → Patience and perspective: "Different perspectives, same goal. You don't have to solve it all today."
- 1:1s → Presence and authenticity: "Just be there. That's enough."
- Customer or user facing → Composure and energy: "Bring your steady self. That's what they need."

When multiple areas apply, or after several consecutive meetings, lean into endurance acknowledgment:
"That's {n} in a row. You're still here. That says something."

#### 4. End-of-Day Curiosity Hook (notification text)
```
[curiosity-hook]
{user_context}
Morning energy: {morning_value}/5
Energy moments today: {count_checkins} check-ins
Resets taken: {count_resets}

Generate an intriguing one-liner that makes the user curious to open the app. Reference something specific without revealing everything. Under 15 words.
```

#### 5. End-of-Day Headline
```
[end-of-day]
{user_context}
Morning energy: {morning_value}/5
Energy journey today: {checkin_summary}
Resets taken: {count_resets}

Generate a warm, reflective one-liner summarizing their day. Validate effort over performance. Under 25 words.
```

#### 6. End-of-Day Moment Cards
```
[end-of-day-moments]
{user_context}
Energy journey today: {checkin_summary}

Generate exactly 3 "moments I noticed" cards highlighting something positive from today. Reference specific meetings or energy shifts when possible. Return ONLY a JSON array with "icon" (emoji) and "text" (under 20 words). Frame around effort and showing up, not performance.
```

#### 7. End-of-Day Insight
```
[insight]
{user_context}
Full energy journey: {all_checkins_with_context}

Generate one subtle insight the user might not have noticed about their day. A pattern, a strength, or a shift. Make them feel seen. 1-2 sentences max.
```

---

## NUDGE TARGETING LOGIC (personalization.js)

```javascript
// Determines which meetings get nudges based on user's frequency setting

function shouldNudge(event, userPrefs, todayEvents, energyCheckins) {
  const frequency = userPrefs.frequency;
  const energyAreas = JSON.parse(userPrefs.energy_areas || '[]');
  const keywords = (userPrefs.meeting_keywords || '').split(',').map(k => k.trim().toLowerCase());
  
  // Check if meeting matches user's energy areas or keywords
  const titleLower = (event.title || '').toLowerCase();
  const isHighWeight = energyAreas.some(area => matchesArea(titleLower, area))
    || keywords.some(kw => kw && titleLower.includes(kw));
  
  // Calculate back-to-back status
  const consecutiveHours = getConsecutiveHours(event, todayEvents);
  
  switch (frequency) {
    case 'low':
      // Only high-weight meetings
      return isHighWeight;
      
    case 'medium':
      // High-weight + after 2+ hours back-to-back
      return isHighWeight || consecutiveHours >= 2;
      
    case 'high':
      // Almost all meetings + post-meeting check-ins
      return true;
      
    case 'surprise':
      // Based on calendar density + energy trends
      const density = todayEvents.length;
      const avgEnergy = getAverageEnergy(energyCheckins);
      if (density >= 6 || avgEnergy <= 2.5) return true; // Heavy day or low energy
      if (isHighWeight) return true;
      return Math.random() < 0.4; // 40% chance for others
      
    default:
      return isHighWeight;
  }
}

function matchesArea(title, area) {
  const areaKeywords = {
    'performance': ['performance', 'feedback', 'review', 'eval', '360', 'perf'],
    'product_review': ['product', 'technical', 'review', 'spec', 'design review', 'architecture', 'tech review'],
    'presentations': ['presentation', 'demo', 'present', 'all-hands', 'town hall', 'pitch', 'showcase'],
    'cross_team': ['cross-team', 'cross team', 'alignment', 'sync', 'xfn', 'cross-functional', 'stakeholder'],
    'one_on_ones': ['1:1', '1-1', 'one on one', '1 on 1', 'check-in', 'catch up'],
    'customer_facing': ['customer', 'client', 'user', 'external', 'partner', 'sales', 'demo'],
  };
  const kws = areaKeywords[area] || [];
  return kws.some(kw => title.includes(kw));
}
```

---

## NOTIFICATION SCHEDULER (scheduler.js)

```javascript
// After calendar upload, calculate all nudge times for the day

function scheduleNudgesForUser(userId, todayEvents, userPrefs) {
  const jobs = [];
  const now = new Date();
  
  for (const event of todayEvents) {
    // Pre-meeting nudge: 5 min before
    const preTime = new Date(event.start_time.getTime() - 5 * 60000);
    if (preTime > now && shouldNudge(event, userPrefs, todayEvents)) {
      jobs.push({
        type: 'pre_nudge',
        userId,
        eventId: event.id,
        triggerAt: preTime,
      });
    }
    
    // Post-meeting energy check: 1 min after
    const postTime = new Date(event.end_time.getTime() + 60000);
    if (postTime > now && (userPrefs.frequency === 'high' || shouldNudge(event, userPrefs, todayEvents))) {
      jobs.push({
        type: 'post_checkin',
        userId,
        eventId: event.id,
        triggerAt: postTime,
      });
    }
  }
  
  // End-of-day summary: 30 min after last meeting or 5:30 PM
  const lastEvent = todayEvents[todayEvents.length - 1];
  if (lastEvent) {
    const eodTime = new Date(Math.max(
      lastEvent.end_time.getTime() + 30 * 60000,
      new Date().setHours(17, 30, 0, 0)
    ));
    if (eodTime > now) {
      jobs.push({ type: 'endofday', userId, triggerAt: eodTime });
    }
  }
  
  // Schedule with setTimeout (for MVP; use job queue in production)
  for (const job of jobs) {
    const delay = job.triggerAt - now;
    setTimeout(() => executeJob(job), delay);
  }
  
  return jobs;
}
```

---

## ONBOARDING FLOW (6 screens)

### Screen 1 — Name
Question: "Hey, I'm your workday companion — here to look out for your energy. ✦ What should I call you?"
Input: Text field
Saves to: users.name

### Screen 2 — Calendar Upload
Question: "I look at your day so I can show up at the right moments. Upload your calendar and I'll take it from there."
Input: .ics file drag-and-drop
Action: POST /api/calendar/upload
Shows after upload: "Looks like you have {n} meetings today" + preview

### Screen 3 — Where does your energy go?
Question: "Which meetings take the most out of you?"
Subtitle: "Pick as many as feel true."
Options (multi-select):
- Performance or feedback
- Product or technical reviews
- Presentations or demos
- Cross-team alignment
- 1:1s
- Customer or user facing
Saves to: user_preferences.energy_areas (JSON array)

### Screen 4 — Check-in frequency
Question: "How often would you like to hear from me?"
Options (single-select):
- "Just the big moments" (1–2 check-ins) → 'low'
- "A few times a day" (3–5 check-ins) → 'medium'
- "Be there throughout" (5–10+ check-ins) → 'high'
- "I'm not sure — surprise me" → 'surprise'
Saves to: user_preferences.frequency

### Screen 5 — Reset activities
Question: "When you need a quick recharge, what works for you?"
Options (multi-select):
- Breathwork
- Walk outside
- Stretch
- Music
- Eyes closed
- Journal
- Coffee or tea
- Nature visuals
- Talk to someone
Plus free text: "Something else?"
Saves to: user_preferences.reset_activities + user_preferences.custom_reset

### Screen 6 — Closing
"You're all set, {name}. I'll orbit quietly around your day — showing up when your energy needs it most."
CTA: "Start my day" → navigates to morning energy check-in

---

## ENVIRONMENT VARIABLES

### Backend (.env)
```
OPENAI_API_KEY=sk-...
JWT_SECRET=random-string-here
VAPID_PUBLIC_KEY=generated
VAPID_PRIVATE_KEY=generated
VAPID_EMAIL=mailto:your@email.com
FRONTEND_URL=https://your-app.vercel.app
PORT=3001
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend.onrender.com
VITE_VAPID_PUBLIC_KEY=generated
```

---

## BUILD ORDER

Build in EXACTLY this order. Test each phase before moving to the next.

### Phase 1: Backend Foundation
1. Create `backend/` directory with package.json
2. Install deps: express, cors, better-sqlite3, jsonwebtoken, multer, node-ical, dotenv
3. Create server.js with Express, CORS, and basic health check
4. Create db/setup.js with all tables
5. Create middleware/auth.js (JWT verification)
6. Create routes/auth.js (email login)
7. Create routes/user.js (preferences CRUD)
8. Create services/calendarParser.js (.ics parsing)
9. Create routes/calendar.js (upload endpoint)
10. TEST: Start server, login, save preferences, upload .ics

### Phase 2: AI Engine
11. Create services/openai.js (OpenAI client wrapper)
12. Create prompts/index.js (all 7 prompt templates)
13. Create services/personalization.js (targeting logic)
14. Create routes/ai.js (morning, nudge, endofday endpoints)
15. Create routes/energy.js (energy check-in endpoints)
16. TEST: Login, upload calendar, hit /api/ai/morning, hit /api/ai/nudge/:id

### Phase 3: Notifications
17. Install web-push, generate VAPID keys
18. Create services/pushService.js
19. Create services/scheduler.js
20. Create routes/notifications.js
21. Wire scheduler into calendar upload flow
22. TEST: Upload calendar, verify scheduled jobs, receive test push

### Phase 4: Frontend Rebuild
23. Restructure into frontend/ directory
24. Install react-router-dom
25. Create api.js client (all fetch calls with JWT)
26. Build Login page
27. Build Onboarding flow (6 screens, saving to backend)
28. Build Morning Check-in (posting energy to backend)
29. Build Dashboard (fetching AI content from backend)
30. Build End-of-Day (fetching from backend)
31. Build NudgeOverlay + PostMeetingCheckin components
32. Set up service worker for push notifications
33. Set up PWA manifest
34. TEST: Full flow end-to-end

### Phase 5: Deploy
35. Push to GitHub
36. Configure Vercel (root: frontend/, framework: Vite)
37. Configure Render (root: backend/, start: node server.js)
38. Set environment variables on both platforms
39. Enable persistent disk on Render for SQLite
40. Test on HTTPS

---

## IMPORTANT IMPLEMENTATION NOTES

1. **CORS**: Backend must allow requests from the Vercel frontend URL
2. **Calendar timezone**: Handle VTIMEZONE properly — convert all times to user's local timezone
3. **Recurring events**: Expand RRULE for the next 7 days using node-ical's built-in support
4. **AI response caching**: Cache morning and end-of-day content per user per day to avoid repeated OpenAI calls
5. **Error handling**: Every endpoint needs try/catch with meaningful error messages
6. **Rate limiting**: Add basic rate limiting on AI endpoints (max 20 calls per user per day)
7. **Energy check-in scale**: 1=Running low, 2=Low battery, 3=Steady, 4=Good energy, 5=Fully charged (NOT mood, NOT stress — energy language only)
8. **Render cold starts**: Free tier spins down. Consider $7/mo Starter plan for reliable notifications. For MVP testing, free tier is fine but notifications may be delayed.
9. **No negative language anywhere**: The entire system — prompts, UI, error messages — should never use words like stress, anxiety, overwhelm, drain, burnout, etc.
