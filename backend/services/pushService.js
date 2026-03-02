const webpush = require('web-push');
const { getDb } = require('../db/setup');

let initialized = false;

function initWebPush() {
  if (initialized) return true;

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID keys not set — push notifications disabled');
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:noreply@levio.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  initialized = true;
  return true;
}

/**
 * Send a push notification to every registered subscription for a user.
 * Automatically removes expired/invalid subscriptions (410/404 responses).
 *
 * @param {number} userId
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function sendToUser(userId, payload) {
  if (!initWebPush()) return;

  const subscriptions = getDb()
    .prepare('SELECT id, subscription FROM push_subscriptions WHERE user_id = ?')
    .all(userId);

  if (!subscriptions.length) {
    console.log(`[push] No subscriptions for user ${userId}`);
    return;
  }

  for (const row of subscriptions) {
    try {
      const subscription = JSON.parse(row.subscription);
      await webpush.sendNotification(subscription, JSON.stringify({
        title: payload.title || 'Levio',
        body: payload.body,
        data: payload.data || {},
      }));
      console.log(`[push] Sent "${payload.body?.slice(0, 40)}..." → user ${userId}`);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Browser unsubscribed — remove stale record
        getDb().prepare('DELETE FROM push_subscriptions WHERE id = ?').run(row.id);
        console.log(`[push] Removed expired subscription id=${row.id}`);
      } else {
        console.error(`[push] Failed to send to user ${userId}:`, err.message);
      }
    }
  }
}

module.exports = { sendToUser, initWebPush };
