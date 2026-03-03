const express = require('express');
const multer = require('multer');
const { getDb } = require('../db/setup');
const requireAuth = require('../middleware/auth');
const { parseCalendar } = require('../services/calendarParser');
const { scheduleNudgesForUser } = require('../services/scheduler');

const router = express.Router();

// Store uploaded file in memory (no disk writes needed — we parse and discard)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/calendar' || file.originalname.endsWith('.ics')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload a .ics calendar file.'));
    }
  },
});

// All calendar routes require authentication
router.use(requireAuth);

// POST /api/calendar/upload
// Body: multipart/form-data with a "calendar" file field
router.post('/upload', upload.single('calendar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a .ics file.' });
    }

    // Parse the .ics file
    let parsedEvents;
    try {
      parsedEvents = parseCalendar(req.file.buffer);
    } catch (parseErr) {
      console.error('[calendar/upload] Parse error:', parseErr);
      return res.status(400).json({
        error: 'Could not read this calendar file. Please make sure it is a valid .ics export.',
      });
    }

    const db = getDb();

    // Delete all existing events for this user (fresh upload replaces everything)
    db.prepare('DELETE FROM calendar_events WHERE user_id = ?').run(req.userId);

    // Insert all parsed events
    const insertEvent = db.prepare(`
      INSERT INTO calendar_events (user_id, title, description, location, start_time, end_time, attendees)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((events) => {
      for (const event of events) {
        insertEvent.run(
          req.userId,
          event.title,
          event.description,
          event.location,
          event.start_time,
          event.end_time,
          event.attendees,
        );
      }
    });

    insertMany(parsedEvents);

    // Return today's events for the onboarding preview
    const todayStart = todayMidnight();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const todayEvents = db.prepare(`
      SELECT id, title, start_time, end_time
      FROM calendar_events
      WHERE user_id = ? AND start_time >= ? AND start_time < ?
      ORDER BY start_time ASC
    `).all(req.userId, todayStart.toISOString(), todayEnd);

    // Schedule nudges for today's events (fire-and-forget — don't await)
    if (todayEvents.length > 0) {
      const userPrefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.userId);
      if (userPrefs) {
        scheduleNudgesForUser(req.userId, todayEvents, userPrefs);
      }
    }

    res.json({
      events_count: parsedEvents.length,
      today_count: todayEvents.length,
      events: todayEvents.map(e => ({
        id: e.id,
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
      })),
    });
  } catch (err) {
    console.error('[calendar/upload]', err);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

// GET /api/calendar/today
// Returns today's events for the dashboard
router.get('/today', (req, res) => {
  try {
    const db = getDb();
    const todayStart = todayMidnight();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const events = db.prepare(`
      SELECT id, title, description, location, start_time, end_time, attendees
      FROM calendar_events
      WHERE user_id = ? AND start_time >= ? AND start_time < ?
      ORDER BY start_time ASC
    `).all(req.userId, todayStart.toISOString(), todayEnd);

    res.json({
      events: events.map(e => ({
        ...e,
        attendees: JSON.parse(e.attendees || '[]'),
      })),
    });
  } catch (err) {
    console.error('[calendar/today]', err);
    res.status(500).json({ error: 'Could not load calendar.' });
  }
});

function todayMidnight() {
  const PST_OFFSET_MS = 8 * 60 * 60 * 1000;
  const pstNow = new Date(new Date().getTime() - PST_OFFSET_MS);
  pstNow.setUTCHours(0, 0, 0, 0);
  return new Date(pstNow.getTime() + PST_OFFSET_MS);
}

module.exports = router;
