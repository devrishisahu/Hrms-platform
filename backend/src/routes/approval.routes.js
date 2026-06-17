const router = require('express').Router();
const ctrl = require('../controllers/approval.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/pending', authorize('manager', 'hr'), ctrl.pendingApprovals);

module.exports = router;
