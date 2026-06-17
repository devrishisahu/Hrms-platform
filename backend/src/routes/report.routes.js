const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('hr', 'leadership'));

router.get('/headcount', ctrl.headcount);
router.get('/attendance-summary', ctrl.attendanceSummary);
router.get('/leave-usage', ctrl.leaveUsage);
router.get('/lop', ctrl.lopReport);
router.get('/audit-logs', authorize('hr'), ctrl.auditLogs);

module.exports = router;
