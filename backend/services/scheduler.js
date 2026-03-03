const { shouldNudge } = require('./personalization');
const { sendToUser } = require('./pushService');
const { callAI } = require('./openai');
const { getDb } = require('../db/setup');
const {
  getUserContext,
  getTodayCheckins,
  getMorningCheckin,
  logMoment,
  todayKey,
} = require('../db/queries');
const {
  buildUserContext,
  buildCheckinSummary,
  preMeetingNudgePrompt,
  endOfDayCuriosityHookPrompt,
} = require('../prompts/index');
const { getMatchedArea, getConsecutiveHours, countCompletedEvents } = require('./personalization');

// Track active timeout IDs per user so we can cancel on re-upload
// Map<userId, timeoutId[]>
const activeJobs = new Map();

/**
 * Cancel all scheduled jobs for a user (called before rescheduling on re-upload)
 */
function cancelJobsForUser(userId) {
  const ids = activeJobs.get(userId) || [];
  for (const id of ids) clearTimeout(id);
  activeJobs.set(userId, []);
  if (ids.length) console.log(`[scheduler] Cancelled ${ids.length} existing jobs for user ${userId}`);
}

/**
 * Schedule all nudge jobs for a user based on their today's events and preferences.
 * Called immediately after a calendar upload.
 *
 * @param {number} userId
 * @param {Array}  todayEvents - from DB (start_time/end_time as ISO strings)
 * @param {object} userPrefs   - from user_preferences table
 * @returns {Array} List of scheduled job descriptors (for logging/testing)
 */
function scheduleNudgesForUser(userId, todayEvents, userPrefs) {
  cancelJobsForUser(userId);

  const jobs = [];
  const now = new Date();
  const timeoutIds = [];

  for (const event of todayEvents) {
    const eventStart = new Date(event.start_time);
    const eventEnd   = new Date(event.end_time);

    // --- Pre-meeting nudge: 5 minutes before ---
    const preTime = new Date(eventStart.getTime() - 5 * 60 * 1000);
    if (preTime > now && shouldNudge(event, userPrefs, todayEvents, [])) {
      const job = { type: 'pre_nudge', userId, eventId: event.id, triggerAt: preTime };
      jobs.push(job);
      timeoutIds.push(setTimeout(() => executeJob(job), preTime - now));
    }

    // --- Post-meeting energy check: 1 minute after ---
    const postTime = new Date(eventEnd.getTime() + 60 * 1000);
    if (postTime > now && (userPrefs.frequency === 'high' || shouldNudge(event, userPrefs, todayEvents, []))) {
      const job = { type: 'post_checkin', userId, eventId: event.id, triggerAt: postTime };
      jobs.push(job);
      timeoutIds.push(setTimeout(() => executeJob(job), postTime - now));
    }
  }

  // --- End-of-day: 30 min after last meeting, or 5:30 PM — whichever is later ---
  const lastEvent = todayEvents[todayEvents.length - 1];
  if (lastEvent) {
    const lastEnd  = new Date(lastEvent.end_time);
    const eodFloor = new Date();
    eodFloor.setHours(17, 30, 0, 0);

    const eodTime = new Date(Math.max(
      lastEnd.getTime() + 30 * 60 * 1000,
      eodFloor.getTime()
    ));

    if (eodTime > now) {
      const job = { type: 'endofday', userId, triggerAt: eodTime };
      jobs.push(job);
      timeoutIds.push(setTimeout(() => executeJob(job), eodTime - now));
    }
  }

  activeJobs.set(userId, timeoutIds);

  console.log(`[scheduler] Scheduled ${jobs.length} jobs for user ${userId}:`);
  for (const j of jobs) {
    const mins = Math.round((j.triggerAt - now) / 60000);
    console.log(`  → ${j.type} in ${mins} min (${j.triggerAt.toLocaleTimeString()})`);
  }

  return jobs;
}

/**
 * Execute a scheduled job — generate content and send push notification.
 */
async function executeJob(job) {
  console.log(`[scheduler] Executing job: ${job.type} for user ${job.userId}`);

  try {
    if (job.type === 'pre_nudge') {
      await handlePreNudge(job);
    } else if (job.type === 'post_checkin') {
      await handlePostCheckin(job);
    } else if (job.type === 'endofday') {
      await handleEndOfDay(job);
    }
  } catch (err) {
    console.error(`[scheduler] Job failed (${job.type}):`, err.message);
  }
}

// --- Job handlers ---

async function handlePreNudge(job) {
  const event = getDb()
    .prepare('SELECT * FROM calendar_events WHERE id = ?')
    .get(job.eventId);
  if (!event) return;

  const { user, prefs, todayEvents, recentCheckins } = getUserContext(job.userId);
  const userContext    = buildUserContext(user, prefs, todayEvents, recentCheckins);
  const matchedArea    = getMatchedArea(event, prefs);
  const consecutiveHrs = getConsecutiveHours(event, todayEvents);
  const countCompleted = countCompletedEvents(todayEvents);
  const countRemaining = todayEvents.length - countCompleted;

  const nudgeText = await callAI(
    preMeetingNudgePrompt(userContext, event, matchedArea, countCompleted, countRemaining, consecutiveHrs),
    { maxTokens: 80 }
  );

  await sendToUser(job.userId, {
    title: 'Levio',
    body: nudgeText,
    data: { type: 'pre_nudge', eventId: job.eventId },
  });

  logMoment(job.userId, job.eventId, 'pre_nudge', nudgeText);
}

async function handlePostCheckin(job) {
  const event = getDb()
    .prepare('SELECT title FROM calendar_events WHERE id = ?')
    .get(job.eventId);

  const title = event?.title || 'that meeting';

  await sendToUser(job.userId, {
    title: 'Levio',
    body: `How did "${title}" go? Tap to log your energy.`,
    data: { type: 'post_checkin', eventId: job.eventId },
  });

  logMoment(job.userId, job.eventId, 'post_checkin', null);
}

async function handleEndOfDay(job) {
  const { user, prefs, todayEvents, recentCheckins } = getUserContext(job.userId);
  const todayCheckins  = getTodayCheckins(job.userId);
  const morningCheckin = getMorningCheckin(job.userId);
  const morningValue   = morningCheckin?.value || 3;
  const countResets    = getDb()
    .prepare(`SELECT COUNT(*) as n FROM energy_moments WHERE user_id = ? AND moment_type = 'reset_reminder' AND delivered_at >= ?`)
    .get(job.userId, todayKey())?.n || 0;

  const userContext = buildUserContext(user, prefs, todayEvents, recentCheckins);

  const hookText = await callAI(
    endOfDayCuriosityHookPrompt(userContext, morningValue, todayCheckins.length, countResets),
    { maxTokens: 50 }
  );

  await sendToUser(job.userId, {
    title: 'Levio',
    body: hookText,
    data: { type: 'endofday' },
  });

  logMoment(job.userId, null, 'endofday', hookText);
}

/**
 * On server startup, re-schedule today's nudges for every user who has
 * a calendar uploaded. This ensures jobs survive server restarts.
 */
function rescheduleAllUsers() {
  const db = getDb();
  const users = db.prepare('SELECT DISTINCT user_id FROM calendar_events').all();
  if (!users.length) return;

  console.log(`[scheduler] Rescheduling nudges for ${users.length} user(s) on startup…`);

  for (const { user_id } of users) {
    try {
      const { prefs, todayEvents } = getUserContext(user_id);
      if (todayEvents.length) {
        scheduleNudgesForUser(user_id, todayEvents, prefs);
      }
    } catch (err) {
      console.error(`[scheduler] Could not reschedule user ${user_id}:`, err.message);
    }
  }
}

module.exports = { scheduleNudgesForUser, cancelJobsForUser, rescheduleAllUsers };
