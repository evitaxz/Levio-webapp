const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/setup');

const router = express.Router();

// POST /api/auth/login
// Body: { email: "user@example.com" }
// Creates the user if they don't exist, then returns a JWT
router.post('/login', (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email format check
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const db = getDb();

    // Look up existing user
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (user) {
      // Existing user — update last_login
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    } else {
      // New user — create them
      const result = db.prepare(
        'INSERT INTO users (email, last_login) VALUES (?, CURRENT_TIMESTAMP)'
      ).run(normalizedEmail);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    // Check if onboarding is complete (they have preferences saved)
    const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(user.id);
    const hasCompletedOnboarding = !!(prefs && prefs.frequency);

    // Issue JWT (expires in 30 days)
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasCompletedOnboarding,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
