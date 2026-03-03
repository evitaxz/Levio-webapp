require('dotenv').config();
const express = require('express');
const cors = require('cors');

const setupDatabase = require('./db/setup');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const calendarRoutes = require('./routes/calendar');
const energyRoutes = require('./routes/energy');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS ---
// Allow requests from the frontend (Vercel URL in production, localhost in dev)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// --- Body parsing ---
app.use(express.json());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// --- Start ---
setupDatabase();

// Re-schedule any pending nudges from the DB (survives server restarts)
const { rescheduleAllUsers } = require('./services/scheduler');
rescheduleAllUsers();

app.listen(PORT, () => {
  console.log(`Levio backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
