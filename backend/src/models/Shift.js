const mongoose = require('mongoose');

// PRD 6.3 — shifts & work patterns + attendance rules engine inputs.
const shiftSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['fixed', 'flexible', 'rotational'], default: 'fixed' },
    startTime: { type: String, required: true, default: '09:30' }, // "HH:mm"
    endTime: { type: String, required: true, default: '18:30' },
    graceMinutes: { type: Number, default: 15 },        // late-mark after grace
    halfDayAfterMinutes: { type: Number, default: 120 }, // late beyond this → half-day
    minFullDayHours: { type: Number, default: 8 },
    minHalfDayHours: { type: Number, default: 4 },
    weeklyOffs: { type: [Number], default: [0, 6] },     // 0=Sun, 6=Sat
  },
  { timestamps: true }
);

shiftSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Shift', shiftSchema);
