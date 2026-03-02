const express = require('express');
const requireAuth = require('../middleware/auth');
const { callAI, callAIForJSON } = require('../services/openai');
const { getMatchedArea, getConsecutiveHours, countCompletedEvents } = require('../services/personalization');
const {
  getUserContext,
  getTodayEvents,
  getTodayCheckins,
  getMorningCheckin,
  getCached,
  setCached,
  logMoment,
  todayKey,
} = require('../db/queries');
const { getDb } = require('../db/setup');
const {
  buildUserContext,
  buildCheckinSummary,
  morningHeadlinePrompt,
  morningCardsPrompt,
  preMeetingNudgePrompt,
  endOfDayCuriosityHookPrompt,
  endOfDayHeadlinePrompt,
  endOfDayMomentsPrompt,
  endOfDayInsightPrompt,
} = require('../prompts/index');

const router = express.Router();
router.use(requireAuth);

// --- Simple in-memory rate limiter: max 20 AI calls per user per day ---
const aiCallCounts = new Map();

function checkRateLimit(userId) {
  const key = `${userId}_${todayKey()}`;
  const count = aiCallCounts.get(key) || 0;
  if (count >= 20) return false;
  aiCallCounts.set(key, count + 1);
  return true;
}

// Clean up old entries at midnight to prevent memory growth
setInterval(() => {
  const today = todayKey();
  for (const key of aiCallCounts.keys()) {
    if (!key.endsWith(today)) aiCallCounts.delete(key);
  }
}, 60 * 60 * 1000); // Every hour

// -----------------------------------------------------------------------
// GET /api/ai/morning
// Returns: { headline, cards, cached }
// -----------------------------------------------------------------------
router.get('/morning', async (req, res) => {
  try {
    const cacheKey = `morning_${todayKey()}`;
    const cached = getCached(req.userId, cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    if (!checkRateLimit(req.userId)) {
      return res.status(429).json({ error: 'Daily AI limit reached. Check back tomorrow.' });
    }

    const { user, prefs, todayEvents, recentCheckins } = getUserContext(req.userId);
    const morningCheckin = getMorningCheckin(req.userId);

    if (!morningCheckin) {
      return res.status(400).json({
        error: 'Please complete your morning energy check-in first.',
      });
    }

    const userContext = buildUserContext(user, prefs, todayEvents, recentCheckins);
    const energyValue = morningCheckin.value;

    // Two parallel OpenAI calls: headline (text) + cards (JSON)
    const [headline, cards] = await Promise.all([
      callAI(morningHeadlinePrompt(userContext, energyValue), { maxTokens: 60 }),
      callAIForJSON(morningCardsPrompt(userContext, energyValue), { maxTokens: 300 }),
    ]);

    // Validate cards structure
    if (!Array.isArray(cards) || cards.length !== 3) {
      throw new Error('Unexpected card format from AI.');
    }

    const result = { headline, cards };
    setCached(req.userId, cacheKey, result);

    res.json({ ...result, cached: false });
  } catch (err) {
    console.error('[ai/morning]', err);
    res.status(500).json({ error: err.message || 'Could not generate morning content.' });
  }
});

// -----------------------------------------------------------------------
// GET /api/ai/nudge/:eventId
// Returns: { text, meeting_title }
// -----------------------------------------------------------------------
router.get('/nudge/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId, 10);
    if (!eventId) return res.status(400).json({ error: 'Invalid event ID.' });

    // Verify this event belongs to the user
    const event = getDb()
      .prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?')
      .get(eventId, req.userId);

    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (!checkRateLimit(req.userId)) {
      return res.status(429).json({ error: 'Daily AI limit reached. Check back tomorrow.' });
    }

    const { user, prefs, todayEvents, recentCheckins } = getUserContext(req.userId);
    const todayCheckins = getTodayCheckins(req.userId);

    const userContext = buildUserContext(user, prefs, todayEvents, recentCheckins);
    const matchedArea = getMatchedArea(event, prefs);
    const consecutiveHours = getConsecutiveHours(event, todayEvents);
    const countCompleted = countCompletedEvents(todayEvents);
    const countRemaining = todayEvents.length - countCompleted;

    const nudgeText = await callAI(
      preMeetingNudgePrompt(userContext, event, matchedArea, countCompleted, countRemaining, consecutiveHours),
      { maxTokens: 80 }
    );

    // Log this nudge to energy_moments
    logMoment(req.userId, eventId, 'pre_nudge', nudgeText);

    res.json({ text: nudgeText, meeting_title: event.title });
  } catch (err) {
    console.error('[ai/nudge]', err);
    res.status(500).json({ error: err.message || 'Could not generate nudge.' });
  }
});

// -----------------------------------------------------------------------
// GET /api/ai/endofday
// Returns: { hook, headline, moments, insight, cached }
// -----------------------------------------------------------------------
router.get('/endofday', async (req, res) => {
  try {
    const cacheKey = `endofday_${todayKey()}`;
    const cached = getCached(req.userId, cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    if (!checkRateLimit(req.userId)) {
      return res.status(429).json({ error: 'Daily AI limit reached. Check back tomorrow.' });
    }

    const { user, prefs, todayEvents, recentCheckins } = getUserContext(req.userId);
    const todayCheckins = getTodayCheckins(req.userId);

    const morningCheckin = getMorningCheckin(req.userId);
    const morningValue = morningCheckin?.value || 3;
    const checkinSummary = buildCheckinSummary(todayCheckins);
    const countResets = await getDb()
      .prepare(`SELECT COUNT(*) as n FROM energy_moments WHERE user_id = ? AND moment_type = 'reset_reminder' AND delivered_at >= ?`)
      .get(req.userId, new Date().toISOString().slice(0, 10))?.n || 0;

    const userContext = buildUserContext(user, prefs, todayEvents, recentCheckins);

    // Four parallel AI calls for the end-of-day screen
    const [hook, headline, moments, insight] = await Promise.all([
      callAI(
        endOfDayCuriosityHookPrompt(userContext, morningValue, todayCheckins.length, countResets),
        { maxTokens: 50 }
      ),
      callAI(
        endOfDayHeadlinePrompt(userContext, morningValue, checkinSummary, countResets),
        { maxTokens: 60 }
      ),
      callAIForJSON(
        endOfDayMomentsPrompt(userContext, checkinSummary),
        { maxTokens: 300 }
      ),
      callAI(
        endOfDayInsightPrompt(userContext, todayCheckins),
        { maxTokens: 100 }
      ),
    ]);

    if (!Array.isArray(moments) || moments.length !== 3) {
      throw new Error('Unexpected moments format from AI.');
    }

    const result = { hook, headline, moments, insight };
    setCached(req.userId, cacheKey, result);

    res.json({ ...result, cached: false });
  } catch (err) {
    console.error('[ai/endofday]', err);
    res.status(500).json({ error: err.message || 'Could not generate end-of-day summary.' });
  }
});

// -----------------------------------------------------------------------
// GET /api/ai/resets
// Returns: { suggestions: [{ start, end, duration_mins, activity }] }
// Finds gaps >= 15 min in today's calendar and pairs with reset activities
// -----------------------------------------------------------------------
router.get('/resets', (req, res) => {
  try {
    const todayEvents = getTodayEvents(req.userId);
    const prefs = getDb()
      .prepare('SELECT reset_activities, custom_reset FROM user_preferences WHERE user_id = ?')
      .get(req.userId);

    const activities = [
      ...JSON.parse(prefs?.reset_activities || '[]'),
      ...(prefs?.custom_reset ? [prefs.custom_reset] : []),
    ];

    const { RESET_ACTIVITY_LABELS } = require('../prompts/index');
    const activityLabels = activities.map(a => RESET_ACTIVITY_LABELS[a] || a);

    if (!activityLabels.length) {
      return res.json({ suggestions: [] });
    }

    // Find gaps >= 15 minutes between today's events
    const MIN_GAP_MS = 15 * 60 * 1000;
    const now = new Date();
    const suggestions = [];
    let activityIndex = 0;

    for (let i = 0; i < todayEvents.length - 1; i++) {
      const gapStart = new Date(todayEvents[i].end_time);
      const gapEnd = new Date(todayEvents[i + 1].start_time);
      const gapMs = gapEnd - gapStart;

      // Only suggest gaps that are still in the future and >= 15 min
      if (gapMs >= MIN_GAP_MS && gapEnd > now) {
        suggestions.push({
          start: gapStart.toISOString(),
          end: gapEnd.toISOString(),
          duration_mins: Math.floor(gapMs / 60000),
          activity: activityLabels[activityIndex % activityLabels.length],
        });
        activityIndex++;
      }
    }

    res.json({ suggestions });
  } catch (err) {
    console.error('[ai/resets]', err);
    res.status(500).json({ error: 'Could not calculate reset suggestions.' });
  }
});

module.exports = router;
