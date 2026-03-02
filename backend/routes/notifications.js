const express = require('express');
const { getDb } = require('../db/setup');
const requireAuth = require('../middleware/auth');
const { sendToUser } = require('../services/pushService');

const router = express.Router();
router.use(requireAuth);

// POST /api/notifications/subscribe
// Body: { subscription: PushSubscription }
// Saves the browser's push subscription so we can send to this device
router.post('/subscribe', (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription?.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription object.' });
    }

    const db = getDb();

    // Check if this endpoint is already stored for this user
    const existing = db
      .prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND subscription LIKE ?')
      .get(req.userId, `%${subscription.endpoint}%`);

    if (existing) {
      // Update in case keys rotated
      db.prepare('UPDATE push_subscriptions SET subscription = ? WHERE id = ?')
        .run(JSON.stringify(subscription), existing.id);
    } else {
      db.prepare('INSERT INTO push_subscriptions (user_id, subscription) VALUES (?, ?)')
        .run(req.userId, JSON.stringify(subscription));
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications/subscribe]', err);
    res.status(500).json({ error: 'Could not save subscription.' });
  }
});

// DELETE /api/notifications/unsubscribe
// Body: { endpoint: string }
// Removes a subscription (called when user turns off notifications)
router.delete('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint required.' });

    getDb()
      .prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription LIKE ?')
      .run(req.userId, `%${endpoint}%`);

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications/unsubscribe]', err);
    res.status(500).json({ error: 'Could not remove subscription.' });
  }
});

// POST /api/notifications/test
// Sends a test push notification to all of this user's devices immediately
router.post('/test', async (req, res) => {
  try {
    const count = getDb()
      .prepare('SELECT COUNT(*) as n FROM push_subscriptions WHERE user_id = ?')
      .get(req.userId)?.n || 0;

    if (count === 0) {
      return res.status(400).json({
        error: 'No push subscriptions found. Enable notifications in the app first.',
      });
    }

    await sendToUser(req.userId, {
      title: 'Levio',
      body: "You're all set — I'll show up when your energy needs it most.",
      data: { type: 'test' },
    });

    res.json({ success: true, subscriptions_notified: count });
  } catch (err) {
    console.error('[notifications/test]', err);
    res.status(500).json({ error: 'Could not send test notification.' });
  }
});

// GET /api/notifications/status
// Returns whether this user has push subscriptions registered
router.get('/status', (req, res) => {
  try {
    const count = getDb()
      .prepare('SELECT COUNT(*) as n FROM push_subscriptions WHERE user_id = ?')
      .get(req.userId)?.n || 0;

    res.json({
      subscribed: count > 0,
      subscription_count: count,
      vapid_public_key: process.env.VAPID_PUBLIC_KEY || null,
    });
  } catch (err) {
    console.error('[notifications/status]', err);
    res.status(500).json({ error: 'Could not check status.' });
  }
});

module.exports = router;
