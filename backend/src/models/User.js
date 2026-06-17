const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Auth identity. The HR master record lives in Employee; User handles login/RBAC.
const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: [true, 'Email is required'], lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: [8, 'Password must be at least 8 characters'], select: false },
    role: { type: String, enum: ['employee', 'manager', 'hr', 'leadership'], default: 'employee' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    isActive: { type: Boolean, default: true },

    // Account lockout (PRD 6.1: lock after 5 consecutive failures for 15 min)
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

// Email unique *per tenant*
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

module.exports = mongoose.model('User', userSchema);
