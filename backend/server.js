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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "*"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return callback(null, true);
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    if (origin.includes('.onrender.com') || origin.includes('render.com')) return callback(null, true);
    callback(null, false); // Fail CORS gracefully
  },
  credentials: true
}));
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

// Serve static assets if frontend dist folder exists
const fs = require('fs');
const path = require('path');
const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.originalUrl.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
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
