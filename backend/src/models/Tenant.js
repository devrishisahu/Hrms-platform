const mongoose = require('mongoose');

// Each client company is an isolated tenant (PRD 5: multi-tenant SaaS).
const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Company name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    industry: String,
    address: String,
    logoUrl: String,
    settings: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      workWeek: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun … 6=Sat
      regularizationWindowDays: { type: Number, default: 60 }, // PRD 6.3 edge case
      employeeIdPrefix: { type: String, default: 'EMP' },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tenant', tenantSchema);
