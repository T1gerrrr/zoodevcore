const express = require('express');
const router = express.Router();
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');

// GET employee by ID (Staff can view any employee; Employee can view their own profile)
router.get('/:id', verifyToken, (req, res, next) => {
  if (req.user.role === 'staff' || req.user.uid === req.params.id) {
    return next();
  }
  return res.status(403).json({ error: 'Quyền truy cập bị từ chối' });
}, getEmployee);

// All other routes require staff auth
router.use(verifyToken, requireStaff);

router.get('/', getEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
