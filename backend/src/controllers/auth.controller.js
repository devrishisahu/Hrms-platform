const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logAudit = require('../utils/audit');
const sendEmail = require('../utils/sendEmail');
const { signAccessToken, signRefreshToken, hashToken, refreshCookieOptions } = require('../utils/tokens');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const issueTokens = async (user, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  return accessToken;
};

/**
 * POST /api/v1/auth/register-tenant
 * Public — creates a new company (tenant) + its first HR/Admin user.
 */
exports.registerTenant = asyncHandler(async (req, res) => {
  const { companyName, name, email, password } = req.body;
  if (!companyName || !name || !email || !password) {
    throw ApiError.badRequest('companyName, name, email and password are required');
  }

  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (await Tenant.findOne({ slug })) throw ApiError.conflict('A company with this name already exists');

  const tenant = await Tenant.create({ name: companyName, slug });

  const [firstName, ...rest] = name.trim().split(' ');
  const employee = await Employee.create({
    tenantId: tenant._id,
    employeeId: `${tenant.settings.employeeIdPrefix}-0001`,
    firstName,
    lastName: rest.join(' '),
    officialEmail: email.toLowerCase(),
    dateOfJoining: new Date(),
    status: 'active',
  });

  const user = await User.create({ tenantId: tenant._id, email, password, role: 'hr', employee: employee._id });

  await logAudit({ tenantId: tenant._id, user, action: 'TENANT_REGISTERED', entity: 'Tenant', entityId: tenant._id, ip: req.ip });
  const accessToken = await issueTokens(user, res);

  res.status(201).json({
    success: true,
    message: 'Company registered successfully',
    data: { accessToken, user: { id: user._id, email: user.email, role: user.role, tenant: tenant.name, employee } },
  });
});

/**
 * POST /api/v1/auth/login
 * Body: { email, password, companySlug? } — slug disambiguates if the email exists in multiple tenants.
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password, companySlug } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required');

  const query = { email: email.toLowerCase() };
  if (companySlug) {
    const tenant = await Tenant.findOne({ slug: companySlug });
    if (!tenant) throw ApiError.unauthorized('Invalid credentials');
    query.tenantId = tenant._id;
  }

  const user = await User.findOne(query).select('+password').populate({
    path: 'employee',
    populate: [
      { path: 'department', select: 'name' },
      { path: 'designation', select: 'title' },
      { path: 'reportingManager', select: 'firstName lastName employeeId' },
      { path: 'shift' },
    ],
  });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');

  // Account lockout (PRD 6.1)
  if (user.isLocked()) {
    const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw ApiError.unauthorized(`Account locked due to repeated failures. Try again in ${mins} minute(s).`);
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    user.failedLoginAttempts += 1;
    const attemptsLeft = MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
    
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      user.failedLoginAttempts = 0;
      await user.save({ validateBeforeSave: false });
      await logAudit({ tenantId: user.tenantId, user, action: 'LOGIN_LOCKOUT', ip: req.ip });
      throw ApiError.unauthorized(`Account locked due to repeated failures. Try again in ${LOCK_MINUTES} minutes.`);
    }
    
    await user.save({ validateBeforeSave: false });
    await logAudit({ tenantId: user.tenantId, user, action: 'LOGIN_FAILED', ip: req.ip });
    throw ApiError.unauthorized(`Invalid credentials. ${attemptsLeft} attempt(s) remaining.`);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  const accessToken = await issueTokens(user, res);
  await logAudit({ tenantId: user.tenantId, user, action: 'LOGIN', ip: req.ip });

  res.json({
    success: true,
    message: 'Logged in',
    data: { accessToken, user: { id: user._id, email: user.email, role: user.role, employee: user.employee } },
  });
});

/**
 * POST /api/v1/auth/refresh — rotates the refresh token (cookie) and returns a new access token.
 */
exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token');

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || !user.isActive || user.refreshTokenHash !== hashToken(token)) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const accessToken = await issueTokens(user, res); // rotation
  res.json({ success: true, data: { accessToken } });
});

/**
 * POST /api/v1/auth/logout
 */
exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.id, { $unset: { refreshTokenHash: 1 } });
    } catch (_) { /* expired token — nothing to revoke */ }
  }
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.json({ success: true, message: 'Logged out' });
});

/**
 * GET /api/v1/auth/me
 */
exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'employee',
    populate: [
      { path: 'department', select: 'name' },
      { path: 'designation', select: 'title' },
      { path: 'reportingManager', select: 'firstName lastName employeeId' },
      { path: 'shift' },
    ],
  });
  res.json({ success: true, data: { user } });
});

/**
 * PATCH /api/v1/auth/change-password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw ApiError.badRequest('currentPassword and newPassword are required');
  if (newPassword.length < 8) throw ApiError.badRequest('New password must be at least 8 characters');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw ApiError.unauthorized('Current password is incorrect');

  user.password = newPassword;
  await user.save();
  await logAudit({ tenantId: req.tenantId, user, action: 'PASSWORD_CHANGED', ip: req.ip });
  sendEmail({ to: user.email, subject: 'HRMS: Password changed', html: '<p>Your HRMS password was changed. If this was not you, contact HR immediately.</p>' });

  res.json({ success: true, message: 'Password updated' });
});
