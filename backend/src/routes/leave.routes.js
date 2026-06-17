const router = require('express').Router();
const ctrl = require('../controllers/leave.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Types & policies (HR configures — PRD 6.4)
router.get('/types', ctrl.listLeaveTypes);
router.post('/types', authorize('hr'), ctrl.createLeaveType);
router.patch('/types/:id', authorize('hr'), ctrl.updateLeaveType);

// Balances
router.get('/balances/my', ctrl.myBalances);
router.patch('/balances', authorize('hr'), ctrl.adjustBalance);

// Requests
router.post('/apply', ctrl.applyLeave);
router.get('/my', ctrl.myLeaves);
router.get('/requests', authorize('manager', 'hr'), ctrl.listRequests);
router.patch('/requests/:id', authorize('manager', 'hr'), ctrl.actOnLeave);
router.patch('/requests/:id/cancel', ctrl.cancelLeave);

module.exports = router;
