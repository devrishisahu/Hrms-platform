const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: [true, 'Designation title is required'], trim: true },
    grade: String,
    level: { type: Number, default: 1 },
  },
  { timestamps: true }
);

designationSchema.index({ tenantId: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('Designation', designationSchema);
