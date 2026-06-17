require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// ---------- Global middleware ----------
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting (OWASP / NFR: rate limiting)
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts, try again later.' } }));

// ---------- Routes ----------
app.get('/api/health', (req, res) => res.json({ success: true, message: 'HRMS API is running', time: new Date().toISOString() }));

app.use('/api/v1/auth', require('./src/routes/auth.routes'));
app.use('/api/v1/org', require('./src/routes/org.routes'));
app.use('/api/v1/employees', require('./src/routes/employee.routes'));
app.use('/api/v1/attendance', require('./src/routes/attendance.routes'));
app.use('/api/v1/leave', require('./src/routes/leave.routes'));
app.use('/api/v1/approvals', require('./src/routes/approval.routes'));
app.use('/api/v1/notifications', require('./src/routes/notification.routes'));
app.use('/api/v1/reports', require('./src/routes/report.routes'));
app.use('/api/v1/dashboard', require('./src/routes/dashboard.routes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    if (!req.originalUrl.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    } else {
      res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
    }
  });
} else {
  app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` }));
}
app.use(errorHandler);

// ---------- Start ----------
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`✅ HRMS API listening on port ${PORT}`));
}).catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  process.exit(1);
});

module.exports = app;
