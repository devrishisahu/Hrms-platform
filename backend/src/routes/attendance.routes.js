const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/punch', ctrl.punch);
router.get('/my', ctrl.myAttendance);
router.get('/team', authorize('manager', 'hr', 'leadership'), ctrl.teamAttendance);
router.get('/all', authorize('hr', 'leadership'), ctrl.allAttendance);

router.post('/regularize', ctrl.requestRegularization);
router.get('/regularizations', ctrl.listRegularizations);
router.patch('/regularizations/:id', authorize('manager', 'hr'), ctrl.actOnRegularization);

module.exports = router;
