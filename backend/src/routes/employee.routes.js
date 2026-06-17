const router = require('express').Router();
const ctrl = require('../controllers/employee.controller');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/org-chart', ctrl.orgChart);
router.get('/my-team', authorize('manager', 'hr', 'leadership'), ctrl.myTeam);

router.post('/', authorize('hr'), ctrl.createEmployee);
router.get('/', ctrl.listEmployees); // directory is visible to all (PRD 6.2)
router.get('/:id', ctrl.getEmployee);
router.patch('/:id', ctrl.updateEmployee); // self vs HR enforced in controller
router.post('/:id/photo', upload.single('photo'), ctrl.uploadPhoto);
router.post('/:id/documents', upload.single('document'), ctrl.uploadDocument);
router.post('/:id/exit', authorize('hr'), ctrl.exitEmployee);

module.exports = router;
