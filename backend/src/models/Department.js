const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: [true, 'Department name is required'], trim: true },
    code: { type: String, trim: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  },
  { timestamps: true }
);

departmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
