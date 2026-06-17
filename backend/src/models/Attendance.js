const mongoose = require('mongoose');

// PRD 6.3 — one document per employee per calendar day.
const attendanceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD" — avoids timezone drift
    punchIn: Date,
    punchOut: Date,
    punches: [{
      type: { type: String, enum: ['in', 'out'] },
      time: Date,
      mode: { type: String, enum: ['web', 'mobile', 'biometric', 'regularized'], default: 'web' },
      location: { lat: Number, lng: Number },
      ip: String,
    }],
    workedMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['present', 'late', 'half-day', 'absent', 'on-leave', 'holiday', 'weekly-off'],
      default: 'absent',
    },
    isLate: { type: Boolean, default: false },
    overtimeMinutes: { type: Number, default: 0 },
    isRegularized: { type: Boolean, default: false },
    remarks: String,
  },
  { timestamps: true }
);

// One record per employee per day → duplicate punches stay idempotent (PRD 6.3 edge case)
attendanceSchema.index({ tenantId: 1, employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
