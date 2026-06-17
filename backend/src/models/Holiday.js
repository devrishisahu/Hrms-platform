const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, default: 'all' }, // per-location calendars (PRD 6.3)
    optional: { type: Boolean, default: false },
  },
  { timestamps: true }
);

holidaySchema.index({ tenantId: 1, date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
