const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Shift = require('../models/Shift');
const Holiday = require('../models/Holiday');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Generic CRUD factory — all four org entities behave identically (tenant-scoped).
const crud = (Model, label) => ({
  create: asyncHandler(async (req, res) => {
    const doc = await Model.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json({ success: true, message: `${label} created`, data: doc });
  }),
  list: asyncHandler(async (req, res) => {
    const docs = await Model.find({ tenantId: req.tenantId }).sort({ createdAt: 1 });
    res.json({ success: true, data: docs });
  }),
  update: asyncHandler(async (req, res) => {
    delete req.body.tenantId;
    const doc = await Model.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!doc) throw ApiError.notFound(`${label} not found`);
    res.json({ success: true, message: `${label} updated`, data: doc });
  }),
  remove: asyncHandler(async (req, res) => {
    const doc = await Model.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!doc) throw ApiError.notFound(`${label} not found`);
    res.json({ success: true, message: `${label} deleted` });
  }),
});

exports.departments = crud(Department, 'Department');
exports.designations = crud(Designation, 'Designation');
exports.shifts = crud(Shift, 'Shift');
exports.holidays = crud(Holiday, 'Holiday');
