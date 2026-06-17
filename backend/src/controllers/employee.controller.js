const Employee = require('../models/Employee');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const LeaveType = require('../models/LeaveType');
const LeaveBalance = require('../models/LeaveBalance');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logAudit = require('../utils/audit');
const sendEmail = require('../utils/sendEmail');
const { uploadBuffer, deleteFile } = require('../config/cloudinary');

// ---------- helpers ----------

const nextEmployeeId = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId);
  const prefix = tenant?.settings?.employeeIdPrefix || 'EMP';
  const last = await Employee.findOne({ tenantId }).sort({ createdAt: -1 }).select('employeeId');
  const lastNum = last ? parseInt(String(last.employeeId).split('-').pop(), 10) || 0 : 0;
  return `${prefix}-${String(lastNum + 1).padStart(4, '0')}`;
};

/**
 * PRD 6.2 — reporting structures must prevent circular hierarchies.
 * Walks up from the proposed manager; if we reach the employee, it's a cycle.
 */
const wouldCreateCycle = async (tenantId, employeeId, managerId) => {
  let current = managerId ? String(managerId) : null;
  const seen = new Set();
  while (current) {
    if (current === String(employeeId)) return true;
    if (seen.has(current)) return true; // pre-existing cycle guard
    seen.add(current);
    const mgr = await Employee.findOne({ _id: current, tenantId }).select('reportingManager');
    current = mgr?.reportingManager ? String(mgr.reportingManager) : null;
  }
  return false;
};

const initLeaveBalances = async (tenantId, employeeId) => {
  const year = new Date().getFullYear();
  const types = await LeaveType.find({ tenantId });
  for (const t of types) {
    await LeaveBalance.updateOne(
      { tenantId, employee: employeeId, leaveType: t._id, year },
      { $setOnInsert: { allocated: t.annualQuota } },
      { upsert: true }
    );
  }
};

// ---------- endpoints ----------

/**
 * POST /api/v1/employees  (HR only)
 * Creates the master record + login user, e-mails an invite.
 */
exports.createEmployee = asyncHandler(async (req, res) => {
  const { firstName, lastName, officialEmail, dateOfJoining, role = 'employee',
    department, designation, reportingManager, shift, tempPassword, ...rest } = req.body;

  if (!firstName || !officialEmail || !dateOfJoining) {
    throw ApiError.badRequest('firstName, officialEmail and dateOfJoining are required');
  }

  if (await Employee.findOne({ tenantId: req.tenantId, officialEmail: officialEmail.toLowerCase() })) {
    throw ApiError.conflict('An employee with this official email already exists');
  }

  if (rest.phone) {
    const existingPhone = await Employee.findOne({ tenantId: req.tenantId, phone: rest.phone });
    if (existingPhone) throw ApiError.conflict('An employee with this phone number already exists');
  }

  if (rest.personalEmail) {
    const existingPersonal = await Employee.findOne({ tenantId: req.tenantId, personalEmail: rest.personalEmail.toLowerCase() });
    if (existingPersonal) throw ApiError.conflict('An employee with this personal email already exists');
  }

  const employee = await Employee.create({
    ...rest,
    tenantId: req.tenantId,
    employeeId: await nextEmployeeId(req.tenantId),
    firstName, lastName, dateOfJoining,
    officialEmail: officialEmail.toLowerCase(),
    department: department || null,
    designation: designation || null,
    reportingManager: reportingManager || null,
    shift: shift || null,
  });

  if (reportingManager && (await wouldCreateCycle(req.tenantId, employee._id, reportingManager))) {
    await Employee.deleteOne({ _id: employee._id });
    throw ApiError.badRequest('Circular reporting hierarchy detected — choose a different manager');
  }

  const password = tempPassword || `Welcome@${Math.floor(1000 + Math.random() * 9000)}`;
  const user = await User.create({ tenantId: req.tenantId, email: officialEmail, password, role, employee: employee._id });

  await initLeaveBalances(req.tenantId, employee._id);
  await logAudit({ tenantId: req.tenantId, user: req.user, action: 'EMPLOYEE_CREATED', entity: 'Employee', entityId: employee._id, ip: req.ip });

  sendEmail({
    to: officialEmail,
    subject: 'Welcome to HRMS — your account is ready',
    html: `<div style="font-family:sans-serif">
      <h3>Welcome aboard, ${firstName}!</h3>
      <p>Your HRMS account has been created.</p>
      <p><b>Login email:</b> ${officialEmail}<br/><b>Temporary password:</b> ${password}</p>
      <p>Please log in and change your password immediately.</p></div>`,
  });

  if (employee.phone) {
    const sendWhatsApp = require('../utils/sendWhatsApp');
    sendWhatsApp({
      to: employee.phone,
      body: `Welcome to HRMS, ${firstName}! Your account is ready.\n\nLogin Email: ${officialEmail}\nTemporary Password: ${password}\n\nPlease log in and change your password immediately.`,
    });
  }

  res.status(201).json({ success: true, message: 'Employee created and invite sent', data: { employee, userId: user._id, tempPassword: password } });
});

/**
 * GET /api/v1/employees — searchable, filterable, paginated directory (PRD 6.2).
 * Query: search, department, status, location, page, limit
 */
exports.listEmployees = asyncHandler(async (req, res) => {
  const { search, department, status, location, page = 1, limit = 20 } = req.query;
  const filter = { tenantId: req.tenantId };

  if (department) filter.department = department;
  if (status) filter.status = status;
  if (location) filter.location = location;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { officialEmail: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Employee.find(filter)
      .populate('department', 'name')
      .populate('designation', 'title')
      .populate('reportingManager', 'firstName lastName employeeId')
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Employee.countDocuments(filter),
  ]);

  res.json({ success: true, data: { items, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

/**
 * GET /api/v1/employees/:id
 * Employees can open anyone's directory card; full sensitive detail is HR/self only.
 */
exports.getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.tenantId })
    .populate('department', 'name')
    .populate('designation', 'title grade')
    .populate('reportingManager', 'firstName lastName employeeId')
    .populate('shift', 'name startTime endTime');
  if (!employee) throw ApiError.notFound('Employee not found');

  const isSelf = String(req.user.employee) === String(employee._id);
  const isPrivileged = ['hr', 'leadership'].includes(req.user.role);
  const doc = employee.toJSON();
  if (!isSelf && !isPrivileged) {
    delete doc.bank; delete doc.statutory; delete doc.documents;
    delete doc.currentAddress; delete doc.permanentAddress; delete doc.emergencyContact;
  }
  res.json({ success: true, data: { employee: doc } });
});

/**
 * PATCH /api/v1/employees/:id
 * HR edits anything; employees edit only non-sensitive own fields (PRD 6.2/6.5).
 */
exports.updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!employee) throw ApiError.notFound('Employee not found');

  const isSelf = String(req.user.employee) === String(employee._id);
  const isHR = req.user.role === 'hr';
  if (!isSelf && !isHR) throw ApiError.forbidden();

  const SELF_EDITABLE = ['personalEmail', 'phone', 'currentAddress', 'permanentAddress',
    'emergencyContact', 'maritalStatus', 'education', 'experience', 'skills', 'certifications'];
  const SENSITIVE = ['bank', 'statutory', 'employeeId', 'officialEmail', 'status'];

  const updates = { ...req.body };
  delete updates.tenantId; // never editable

  if (!isHR) {
    Object.keys(updates).forEach((k) => { if (!SELF_EDITABLE.includes(k)) delete updates[k]; });
  }

  if (updates.phone) {
    const existing = await Employee.findOne({ tenantId: req.tenantId, phone: updates.phone, _id: { $ne: employee._id } });
    if (existing) throw ApiError.conflict('An employee with this phone number already exists');
  }

  if (updates.personalEmail) {
    const existing = await Employee.findOne({ tenantId: req.tenantId, personalEmail: updates.personalEmail.toLowerCase(), _id: { $ne: employee._id } });
    if (existing) throw ApiError.conflict('An employee with this personal email already exists');
  }

  if (updates.officialEmail) {
    const existing = await Employee.findOne({ tenantId: req.tenantId, officialEmail: updates.officialEmail.toLowerCase(), _id: { $ne: employee._id } });
    if (existing) throw ApiError.conflict('An employee with this official email already exists');
  }

  // Circular hierarchy guard on manager change
  if (isHR && updates.reportingManager) {
    if (await wouldCreateCycle(req.tenantId, employee._id, updates.reportingManager)) {
      throw ApiError.badRequest('Circular reporting hierarchy detected — choose a different manager');
    }
  }

  const touchedSensitive = Object.keys(updates).filter((k) => SENSITIVE.includes(k));
  Object.assign(employee, updates);
  await employee.save();

  if (touchedSensitive.length) {
    await logAudit({
      tenantId: req.tenantId, user: req.user, action: 'EMPLOYEE_SENSITIVE_UPDATED',
      entity: 'Employee', entityId: employee._id, details: { fields: touchedSensitive }, ip: req.ip,
    });
  }

  res.json({ success: true, message: 'Employee updated', data: { employee } });
});

/**
 * POST /api/v1/employees/:id/photo — multer single('photo') → Cloudinary
 */
exports.uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name: photo)');
  const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!employee) throw ApiError.notFound('Employee not found');

  const isSelf = String(req.user.employee) === String(employee._id);
  if (!isSelf && req.user.role !== 'hr') throw ApiError.forbidden();

  if (employee.photo?.publicId) await deleteFile(employee.photo.publicId).catch(() => {});
  const result = await uploadBuffer(req.file.buffer, `hrms/${req.tenantId}/photos`, 'image');
  employee.photo = { url: result.secure_url, publicId: result.public_id };
  await employee.save();

  res.json({ success: true, message: 'Photo updated', data: { photo: employee.photo } });
});

/**
 * POST /api/v1/employees/:id/documents — multer single('document') → Cloudinary
 */
exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded (field name: document)');
  const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!employee) throw ApiError.notFound('Employee not found');

  const isSelf = String(req.user.employee) === String(employee._id);
  if (!isSelf && req.user.role !== 'hr') throw ApiError.forbidden();

  const result = await uploadBuffer(req.file.buffer, `hrms/${req.tenantId}/documents`, 'auto');
  employee.documents.push({
    name: req.body.name || req.file.originalname,
    type: req.body.type || 'other',
    url: result.secure_url,
    publicId: result.public_id,
  });
  await employee.save();
  await logAudit({ tenantId: req.tenantId, user: req.user, action: 'DOCUMENT_UPLOADED', entity: 'Employee', entityId: employee._id, ip: req.ip });

  res.status(201).json({ success: true, message: 'Document uploaded', data: { documents: employee.documents } });
});

/**
 * POST /api/v1/employees/:id/exit — offboarding (PRD: exit records are archived, never deleted)
 */
exports.exitEmployee = asyncHandler(async (req, res) => {
  const { exitDate, exitReason } = req.body;
  const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!employee) throw ApiError.notFound('Employee not found');
  if (employee.status === 'exited') throw ApiError.badRequest('Employee has already exited');

  employee.status = 'exited';
  employee.exitDate = exitDate || new Date();
  employee.exitReason = exitReason || '';
  await employee.save();

  await User.updateOne({ tenantId: req.tenantId, employee: employee._id }, { isActive: false, $unset: { refreshTokenHash: 1 } });
  await logAudit({ tenantId: req.tenantId, user: req.user, action: 'EMPLOYEE_EXITED', entity: 'Employee', entityId: employee._id, details: { exitReason }, ip: req.ip });

  res.json({ success: true, message: 'Employee offboarded (record archived)', data: { employee } });
});

/**
 * GET /api/v1/employees/org-chart — tree built from reportingManager links
 */
exports.orgChart = asyncHandler(async (req, res) => {
  const employees = await Employee.find({ tenantId: req.tenantId, status: { $ne: 'exited' } })
    .select('firstName lastName employeeId designation department reportingManager photo')
    .populate('designation', 'title').populate('department', 'name');

  const map = new Map();
  employees.forEach((e) => map.set(String(e._id), { ...e.toJSON(), children: [] }));
  const roots = [];
  map.forEach((node) => {
    const mgr = node.reportingManager ? map.get(String(node.reportingManager)) : null;
    if (mgr) mgr.children.push(node);
    else roots.push(node);
  });

  res.json({ success: true, data: { tree: roots, count: employees.length } });
});

/**
 * GET /api/v1/employees/my-team — direct reports of the logged-in manager
 */
exports.myTeam = asyncHandler(async (req, res) => {
  const team = await Employee.find({ tenantId: req.tenantId, reportingManager: req.user.employee, status: { $ne: 'exited' } })
    .populate('designation', 'title').populate('department', 'name');
  res.json({ success: true, data: { team } });
});
