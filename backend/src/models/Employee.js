const mongoose = require('mongoose');

// PRD 6.2 — the employee master record (single source of truth).
const employeeSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    employeeId: { type: String, required: true }, // auto-generated, unique per tenant

    // Personal
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, trim: true, default: '' },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other', null], default: null },
    maritalStatus: { type: String, enum: ['single', 'married', 'other', null], default: null },
    nationality: String,
    photo: { url: String, publicId: String },

    // Contact
    personalEmail: String,
    officialEmail: { type: String, required: true, lowercase: true },
    phone: String,
    currentAddress: String,
    permanentAddress: String,
    emergencyContact: { name: String, relation: String, phone: String },

    // Employment
    dateOfJoining: { type: Date, required: true },
    employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', 'intern'], default: 'full-time' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
    grade: String,
    location: String,
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },

    // Bank & statutory (sensitive — edits are audit-logged)
    bank: { accountNumber: String, ifsc: String, bankName: String },
    statutory: { pan: String, aadhaar: String, pf: String, esi: String, uan: String },

    // Professional
    education: [{ degree: String, institution: String, year: Number }],
    experience: [{ company: String, designation: String, from: Date, to: Date }],
    skills: [String],
    certifications: [String],

    // Documents (Cloudinary)
    documents: [{
      name: String,
      type: { type: String, enum: ['id-proof', 'offer-letter', 'contract', 'certificate', 'other'], default: 'other' },
      url: String,
      publicId: String,
      uploadedAt: { type: Date, default: Date.now },
    }],

    // Lifecycle (PRD 6.2: onboarding → confirmation → … → exit)
    status: { type: String, enum: ['onboarding', 'probation', 'active', 'notice-period', 'exited'], default: 'onboarding' },
    exitDate: Date,
    exitReason: String,
  },
  { timestamps: true }
);

employeeSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ tenantId: 1, officialEmail: 1 }, { unique: true });
employeeSchema.index({ tenantId: 1, department: 1 });
employeeSchema.index({ tenantId: 1, status: 1 });

employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});
employeeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
