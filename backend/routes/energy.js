const express = require('express');
const { getDb } = require('../db/setup');
const requireAuth = require('../middleware/auth');
const { todayMidnight, toSQLiteDateTime } = require('../db/queries');
const { ENERGY_LABELS } = require('../prompts/index');

const router = express.Router();
router.use(requireAuth);

// POST /api/energy/checkin
// Body: { value: 1-5, context: "morning" | "after: Meeting Title", event_id?: number }
router.post('/checkin', (req, res) => {
  try {
    const { value, context, event_id } = req.body;

    if (!value || value < 1 || value > 5 || !Number.isInteger(value)) {
      return res.status(400).json({ error: 'Energy value must be a whole number between 1 and 5.' });
    }

    if (!context || typeof context !== 'string') {
      return res.status(400).json({ error: 'Context is required (e.g. "morning" or "after: Meeting Name").' });
    }

    getDb().prepare(`
      INSERT INTO energy_checkins (user_id, value, context, event_id)
      VALUES (?, ?, ?, ?)
    `).run(req.userId, value, context.trim(), event_id || null);

    const label = ENERGY_LABELS[value] || `${value}/5`;
    res.json({ success: true, label });
  } catch (err) {
    console.error('[energy/checkin]', err);
    res.status(500).json({ error: 'Could not save check-in. Please try again.' });
  }
});

// GET /api/energy/today
// Returns all energy check-ins for today
router.get('/today', (req, res) => {
  try {
    const checkins = getDb().prepare(`
      SELECT id, value, context, event_id, created_at
      FROM energy_checkins
      WHERE user_id = ? AND created_at >= ?
      ORDER BY created_at ASC
    `).all(req.userId, toSQLiteDateTime(todayMidnight()));

    res.json({
      checkins: checkins.map(c => ({
        ...c,
        label: ENERGY_LABELS[c.value] || `${c.value}/5`,
      })),
    });
  } catch (err) {
    console.error('[energy/today]', err);
    res.status(500).json({ error: 'Could not load check-ins.' });
  }
});

module.exports = router;
