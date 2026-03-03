const { getDb } = require('./setup');

// --- Time helpers ---
// The Render server runs in UTC, but users are typically in PST/PDT (UTC-8/UTC-7).
// We use PST offset (UTC-8) so "today" aligns with the user's calendar day.
// This covers meetings up to 4am UTC = 8pm PST, capturing all normal workday events.
// DST note: PDT (UTC-7) shifts this by 1 hour — acceptable for a prototype.
const PST_OFFSET_MS = 8 * 60 * 60 * 1000; // 8 hours in ms

function todayMidnight() {
  const now = new Date();
  // Shift clock to PST, zero out the time, then shift back to get PST midnight in UTC
  const pstNow = new Date(now.getTime() - PST_OFFSET_MS);
  pstNow.setUTCHours(0, 0, 0, 0);
  return new Date(pstNow.getTime() + PST_OFFSET_MS);
}

function todayEnd() {
  return new Date(todayMidnight().getTime() + 24 * 60 * 60 * 1000);
}

function todayKey() {
  // Return PST date string 'YYYY-MM-DD' for cache keys
  const pstNow = new Date(new Date().getTime() - PST_OFFSET_MS);
  return pstNow.toISOString().slice(0, 10);
}

// SQLite stores CURRENT_TIMESTAMP as "YYYY-MM-DD HH:MM:SS" (no T, no Z).
// This formats a JS Date to match that so string comparisons work correctly.
function toSQLiteDateTime(date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

// --- User queries ---

function getUser(userId) {
  return getDb().prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);
}

function getPrefs(userId) {
  return getDb().prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
}

// --- Calendar queries ---

function getTodayEvents(userId) {
  return getDb().prepare(`
    SELECT id, title, description, location, start_time, end_time, attendees
    FROM calendar_events
    WHERE user_id = ? AND start_time >= ? AND start_time < ?
    ORDER BY start_time ASC
  `).all(userId, todayMidnight().toISOString(), todayEnd().toISOString());
}

// --- Energy queries ---

function getRecentCheckins(userId, limit = 10) {
  return getDb().prepare(`
    SELECT value, context, created_at
    FROM energy_checkins
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit);
}

function getTodayCheckins(userId) {
  return getDb().prepare(`
    SELECT id, value, context, event_id, created_at
    FROM energy_checkins
    WHERE user_id = ? AND created_at >= ?
    ORDER BY created_at ASC
  `).all(userId, toSQLiteDateTime(todayMidnight()));
}

function getMorningCheckin(userId) {
  return getDb().prepare(`
    SELECT value FROM energy_checkins
    WHERE user_id = ? AND context = 'morning' AND created_at >= ?
    ORDER BY created_at ASC
    LIMIT 1
  `).get(userId, toSQLiteDateTime(todayMidnight()));
}

// --- AI cache queries ---

function getCached(userId, key) {
  const row = getDb().prepare(`
    SELECT content FROM ai_cache
    WHERE user_id = ? AND cache_key = ?
  `).get(userId, key);
  if (!row) return null;
  try {
    return JSON.parse(row.content);
  } catch {
    return null;
  }
}

function setCached(userId, key, content) {
  getDb().prepare(`
    INSERT INTO ai_cache (user_id, cache_key, content)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, cache_key) DO UPDATE SET content = excluded.content, created_at = CURRENT_TIMESTAMP
  `).run(userId, key, JSON.stringify(content));
}

// --- Energy moments ---

function logMoment(userId, eventId, momentType, content) {
  getDb().prepare(`
    INSERT INTO energy_moments (user_id, event_id, moment_type, content)
    VALUES (?, ?, ?, ?)
  `).run(userId, eventId || null, momentType, content);
}

// --- Full context bundle (used by AI service) ---

function getUserContext(userId) {
  const user = getUser(userId);
  const prefs = getPrefs(userId);
  const todayEvents = getTodayEvents(userId);
  const recentCheckins = getRecentCheckins(userId);
  return { user, prefs, todayEvents, recentCheckins };
}

module.exports = {
  todayMidnight,
  todayEnd,
  todayKey,
  toSQLiteDateTime,
  getUser,
  getPrefs,
  getTodayEvents,
  getRecentCheckins,
  getTodayCheckins,
  getMorningCheckin,
  getCached,
  setCached,
  logMoment,
  getUserContext,
};
