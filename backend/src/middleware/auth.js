const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * protect — validates the JWT, loads the user, and scopes the request to a tenant.
 * Every protected request carries req.user and req.tenantId (PRD: all data access
 * is scoped by tenantId — no exceptions).
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw ApiError.unauthorized('No token provided');

  const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_ACCESS_SECRET);
  const user = await User.findById(decoded.id).select('-password -refreshTokenHash');
  if (!user || !user.isActive) throw ApiError.unauthorized('User not found or deactivated');

  req.user = user;
  req.tenantId = user.tenantId; // single source of tenant scoping
  next();
});

/**
 * authorize — role-based access control.
 * Usage: authorize('hr', 'manager')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

module.exports = { protect, authorize };
