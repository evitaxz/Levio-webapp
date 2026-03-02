// --- Label maps ---

const ENERGY_AREA_LABELS = {
  performance:      'Performance or feedback',
  product_review:   'Product or technical reviews',
  presentations:    'Presentations or demos',
  cross_team:       'Cross-team alignment',
  one_on_ones:      '1:1s',
  customer_facing:  'Customer or user facing',
};

const RESET_ACTIVITY_LABELS = {
  breathwork:      'Breathwork',
  walk_outside:    'Walk outside',
  stretch:         'Stretch',
  music:           'Music',
  eyes_closed:     'Eyes closed',
  journal:         'Journal',
  coffee_tea:      'Coffee or tea',
  nature_visuals:  'Nature visuals',
  talk_to_someone: 'Talk to someone',
};

const ENERGY_LABELS = {
  1: 'Running low',
  2: 'Low battery',
  3: 'Steady',
  4: 'Good energy',
  5: 'Fully charged',
};

// --- System prompt (used in ALL AI calls) ---

const SYSTEM_PROMPT = `You are the voice of Levio, a workday energy companion app. Your personality:
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
- NEVER use the words: stress, stressed, stressful, anxious, anxiety, overwhelm, overwhelmed, drain, drained, draining, burnout, burned out. Instead use energy-aware language like: "that takes something from you", "that asks a lot", "your energy", "what costs you"`;

// --- User context block builder ---

function buildUserContext(user, prefs, todayEvents, recentCheckins) {
  const name = user.name || user.email.split('@')[0];

  const energyAreas = JSON.parse(prefs?.energy_areas || '[]')
    .map(a => ENERGY_AREA_LABELS[a] || a)
    .join(', ') || 'not specified';

  const keywords = prefs?.meeting_keywords?.trim() || 'none';

  const resetActivities = JSON.parse(prefs?.reset_activities || '[]')
    .map(a => RESET_ACTIVITY_LABELS[a] || a)
    .join(', ') || 'not specified';

  const checkinsText = recentCheckins.length > 0
    ? recentCheckins
        .map(c => `  ${ENERGY_LABELS[c.value] || c.value} (${c.value}/5) — ${c.context}`)
        .join('\n')
    : '  No check-ins yet';

  const meetingsText = todayEvents.length > 0
    ? todayEvents
        .map(e => `  - ${formatTimeRange(e.start_time, e.end_time)}: ${e.title}`)
        .join('\n')
    : '  No meetings today';

  return `User's name: ${name}
What takes their energy: ${energyAreas}
Meeting keywords to watch for: ${keywords}
Preferred reset activities: ${resetActivities}
Recent energy check-ins:
${checkinsText}
Today's meetings:
${meetingsText}`;
}

// --- Time formatter (UTC ISO → readable local time) ---

function formatTimeRange(startIso, endIso) {
  const fmt = (iso) => new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

// --- The 7 prompt builders ---

// 1. Morning Dashboard Headline
function morningHeadlinePrompt(userContext, energyValue) {
  const label = ENERGY_LABELS[energyValue] || `${energyValue}/5`;
  return `[morning-dashboard]
${userContext}
Morning energy check-in: ${energyValue}/5 (${label})

Generate a warm, perceptive one-liner that reads their day ahead. Not a greeting — a genuine observation about what their day looks like. Under 25 words.
Example tone: "A packed morning followed by some breathing room this afternoon — let's move through it together."`;
}

// 2. Morning Dashboard Cards
function morningCardsPrompt(userContext, energyValue) {
  return `[morning-cards]
${userContext}
Morning energy: ${energyValue}/5

Generate exactly 3 positively framed insight cards about today's schedule. Each should notice something supportive — never add pressure. Frame everything as opportunity or acknowledgment. Return ONLY a JSON array of objects with "icon" (single emoji) and "text" (under 20 words each). No markdown, no backticks.`;
}

// 3. Pre-Meeting Nudge
function preMeetingNudgePrompt(userContext, event, matchedArea, countCompleted, countRemaining, consecutiveHours) {
  const attendees = JSON.parse(event.attendees || '[]');
  const attendeeText = attendees.length > 0 ? attendees.join(', ') : 'not listed';
  const backToBack = consecutiveHours >= 1
    ? `${consecutiveHours.toFixed(1)} hours of consecutive meetings leading into this one`
    : 'fresh start';
  const matchText = matchedArea ? ENERGY_AREA_LABELS[matchedArea] || matchedArea : 'no specific match';

  return `[pre-meeting]
${userContext}

The user has a meeting in 5 minutes: "${event.title}" at ${formatTimeRange(event.start_time, event.end_time)}.
Meeting details: ${event.description || 'none provided'}
Attendees: ${attendeeText}
This meeting type matches their energy area: ${matchText}
Meetings today so far: ${countCompleted} completed, ${countRemaining} remaining
Back-to-back status: ${backToBack}

Generate a brief, warm pre-meeting nudge. Under 30 words. No greeting — just a grounding, supportive observation.`;
}

// 4. End-of-Day Curiosity Hook (notification text)
function endOfDayCuriosityHookPrompt(userContext, morningValue, countCheckins, countResets) {
  return `[curiosity-hook]
${userContext}
Morning energy: ${morningValue}/5
Energy moments today: ${countCheckins} check-ins
Resets taken: ${countResets}

Generate an intriguing one-liner that makes the user curious to open the app. Reference something specific without revealing everything. Under 15 words.`;
}

// 5. End-of-Day Headline
function endOfDayHeadlinePrompt(userContext, morningValue, checkinSummary, countResets) {
  return `[end-of-day]
${userContext}
Morning energy: ${morningValue}/5
Energy journey today: ${checkinSummary}
Resets taken: ${countResets}

Generate a warm, reflective one-liner summarizing their day. Validate effort over performance. Under 25 words.`;
}

// 6. End-of-Day Moment Cards
function endOfDayMomentsPrompt(userContext, checkinSummary) {
  return `[end-of-day-moments]
${userContext}
Energy journey today: ${checkinSummary}

Generate exactly 3 "moments I noticed" cards highlighting something positive from today. Reference specific meetings or energy shifts when possible. Return ONLY a JSON array with "icon" (emoji) and "text" (under 20 words). Frame around effort and showing up, not performance.`;
}

// 7. End-of-Day Insight
function endOfDayInsightPrompt(userContext, allCheckins) {
  const journey = allCheckins.length > 0
    ? allCheckins.map(c => `${ENERGY_LABELS[c.value]} (${c.value}/5) — ${c.context}`).join(' → ')
    : 'No check-ins recorded';

  return `[insight]
${userContext}
Full energy journey: ${journey}

Generate one subtle insight the user might not have noticed about their day. A pattern, a strength, or a shift. Make them feel seen. 1-2 sentences max.`;
}

// --- Checkin summary formatter (used in end-of-day prompts) ---

function buildCheckinSummary(checkins) {
  if (!checkins.length) return 'no check-ins recorded today';
  return checkins
    .map(c => `${ENERGY_LABELS[c.value]} (${c.value}/5) after ${c.context}`)
    .join(', ');
}

module.exports = {
  SYSTEM_PROMPT,
  ENERGY_AREA_LABELS,
  RESET_ACTIVITY_LABELS,
  ENERGY_LABELS,
  buildUserContext,
  buildCheckinSummary,
  morningHeadlinePrompt,
  morningCardsPrompt,
  preMeetingNudgePrompt,
  endOfDayCuriosityHookPrompt,
  endOfDayHeadlinePrompt,
  endOfDayMomentsPrompt,
  endOfDayInsightPrompt,
};
