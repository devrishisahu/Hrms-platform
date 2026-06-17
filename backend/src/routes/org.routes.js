const router = require('express').Router();
const { departments, designations, shifts, holidays } = require('../controllers/org.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const mount = (path, ctrl) => {
  router.get(`/${path}`, ctrl.list); // read for all roles
  router.post(`/${path}`, authorize('hr'), ctrl.create);
  router.patch(`/${path}/:id`, authorize('hr'), ctrl.update);
  router.delete(`/${path}/:id`, authorize('hr'), ctrl.remove);
};

mount('departments', departments);
mount('designations', designations);
mount('shifts', shifts);
mount('holidays', holidays);

module.exports = router;
