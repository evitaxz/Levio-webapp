const express = require('express');
const { getDb } = require('../db/setup');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(requireAuth);

// GET /api/user/preferences
// Returns the current user's name + all onboarding preferences
router.get('/preferences', (req, res) => {
  try {
    const db = getDb();

    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.userId);

    res.json({
      name: user.name,
      energy_areas: prefs ? JSON.parse(prefs.energy_areas || '[]') : [],
      meeting_keywords: prefs ? prefs.meeting_keywords || '' : '',
      frequency: prefs ? prefs.frequency || null : null,
      reset_activities: prefs ? JSON.parse(prefs.reset_activities || '[]') : [],
      custom_reset: prefs ? prefs.custom_reset || '' : '',
    });
  } catch (err) {
    console.error('[user/preferences GET]', err);
    res.status(500).json({ error: 'Could not load preferences.' });
  }
});

// PUT /api/user/preferences
// Saves (upserts) the user's name and onboarding preferences
router.put('/preferences', (req, res) => {
  try {
    const { name, energy_areas, meeting_keywords, frequency, reset_activities, custom_reset } = req.body;
    const db = getDb();

    // Update name on the users table if provided
    if (name !== undefined) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.userId);
    }

    // Upsert preferences (INSERT or replace if user_id already exists)
    db.prepare(`
      INSERT INTO user_preferences (user_id, energy_areas, meeting_keywords, frequency, reset_activities, custom_reset)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        energy_areas = COALESCE(excluded.energy_areas, energy_areas),
        meeting_keywords = COALESCE(excluded.meeting_keywords, meeting_keywords),
        frequency = COALESCE(excluded.frequency, frequency),
        reset_activities = COALESCE(excluded.reset_activities, reset_activities),
        custom_reset = COALESCE(excluded.custom_reset, custom_reset)
    `).run(
      req.userId,
      energy_areas !== undefined ? JSON.stringify(energy_areas) : null,
      meeting_keywords !== undefined ? meeting_keywords : null,
      frequency !== undefined ? frequency : null,
      reset_activities !== undefined ? JSON.stringify(reset_activities) : null,
      custom_reset !== undefined ? custom_reset : null,
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[user/preferences PUT]', err);
    res.status(500).json({ error: 'Could not save preferences.' });
  }
});

module.exports = router;
