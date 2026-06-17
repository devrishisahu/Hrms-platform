/**
 * Seed script — creates a demo tenant with users for every role,
 * org structure, shifts, leave types, and holidays.
 *
 * Run: npm run seed
 *
 * Demo logins (password for all: Password@123):
 *   hr@demo.com         → HR / Admin
 *   manager@demo.com    → Reporting Manager
 *   employee@demo.com   → Employee
 *   leader@demo.com     → Leadership
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');
const Employee = require('./src/models/Employee');
const Department = require('./src/models/Department');
const Designation = require('./src/models/Designation');
const Shift = require('./src/models/Shift');
const LeaveType = require('./src/models/LeaveType');
const LeaveBalance = require('./src/models/LeaveBalance');
const Holiday = require('./src/models/Holiday');

const PASSWORD = 'Password@123';

const run = async () => {
  await connectDB();

  if (await Tenant.findOne({ slug: 'demo-corp' })) {
    console.log('Demo tenant already exists — delete it first to re-seed.');
    process.exit(0);
  }

  const tenant = await Tenant.create({ name: 'Demo Corp', slug: 'demo-corp' });
  const t = tenant._id;
  console.log('✅ Tenant: Demo Corp (slug: demo-corp)');

  const [eng, hrDept] = await Department.create([
    { tenantId: t, name: 'Engineering', code: 'ENG' },
    { tenantId: t, name: 'Human Resources', code: 'HR' },
  ]);

  const [dev, mgrDesig, hrDesig, cxo] = await Designation.create([
    { tenantId: t, title: 'Software Engineer', level: 2 },
    { tenantId: t, title: 'Engineering Manager', level: 4 },
    { tenantId: t, title: 'HR Manager', level: 4 },
    { tenantId: t, title: 'Chief People Officer', level: 6 },
  ]);

  const general = await Shift.create({
    tenantId: t, name: 'General', startTime: '09:30', endTime: '18:30',
    graceMinutes: 15, halfDayAfterMinutes: 120, weeklyOffs: [0, 6],
  });

  const leaveTypes = await LeaveType.create([
    { tenantId: t, name: 'Casual Leave', code: 'CL', annualQuota: 12, maxConsecutiveDays: 3 },
    { tenantId: t, name: 'Sick Leave', code: 'SL', annualQuota: 10 },
    { tenantId: t, name: 'Earned Leave', code: 'EL', annualQuota: 15, carryForwardLimit: 30, noticeDays: 7 },
    { tenantId: t, name: 'Loss of Pay', code: 'LOP', annualQuota: 0, isPaid: false, isLOP: true },
  ]);

  await Holiday.create([
    { tenantId: t, name: 'Republic Day', date: new Date(`${new Date().getFullYear()}-01-26`) },
    { tenantId: t, name: 'Independence Day', date: new Date(`${new Date().getFullYear()}-08-15`) },
    { tenantId: t, name: 'Diwali', date: new Date(`${new Date().getFullYear()}-11-08`) },
  ]);

  const mk = async (n, { firstName, lastName, email, role, department, designation, reportingManager = null }) => {
    const employee = await Employee.create({
      tenantId: t, employeeId: `EMP-${String(n).padStart(4, '0')}`,
      firstName, lastName, officialEmail: email, dateOfJoining: new Date('2024-01-15'),
      department, designation, reportingManager, shift: general._id, status: 'active',
    });
    await User.create({ tenantId: t, email, password: PASSWORD, role, employee: employee._id });
    const year = new Date().getFullYear();
    for (const lt of leaveTypes) {
      await LeaveBalance.create({ tenantId: t, employee: employee._id, leaveType: lt._id, year, allocated: lt.annualQuota });
    }
    return employee;
  };

  const leader = await mk(1, { firstName: 'Lena', lastName: 'Verma', email: 'leader@demo.com', role: 'leadership', department: hrDept._id, designation: cxo._id });
  const hr = await mk(2, { firstName: 'Harish', lastName: 'Rao', email: 'hr@demo.com', role: 'hr', department: hrDept._id, designation: hrDesig._id, reportingManager: leader._id });
  const manager = await mk(3, { firstName: 'Meera', lastName: 'Iyer', email: 'manager@demo.com', role: 'manager', department: eng._id, designation: mgrDesig._id, reportingManager: leader._id });
  await mk(4, { firstName: 'Eshan', lastName: 'Kumar', email: 'employee@demo.com', role: 'employee', department: eng._id, designation: dev._id, reportingManager: manager._id });

  console.log('✅ Seeded 4 users (password for all: ' + PASSWORD + ')');
  console.log('   hr@demo.com | manager@demo.com | employee@demo.com | leader@demo.com');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
