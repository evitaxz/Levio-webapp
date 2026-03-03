const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Verify the user still exists in the DB (catches stale tokens after DB resets)
    const { getDb } = require('../db/setup');
    const user = getDb().prepare('SELECT id FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'Session expired. Please log in again.' });
    req.userId = payload.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in.' });
  }
}

module.exports = requireAuth;
