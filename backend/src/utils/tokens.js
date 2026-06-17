const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, tenantId: user.tenantId, role: user.role, employeeId: user.employee || null },
    process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_hrms_platform_123',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id, tenantId: user.tenantId }, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_hrms_platform_123', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

module.exports = { signAccessToken, signRefreshToken, hashToken, refreshCookieOptions };
