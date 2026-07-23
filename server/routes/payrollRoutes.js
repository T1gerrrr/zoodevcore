const express = require('express');
const router = express.Router();
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');
const {
  getWeeklyPayroll,
  adjustWeeklyPayroll,
  getMyPayroll,
  updateSalaryConfig,
} = require('../controllers/payrollController');

// Employee endpoint
router.get('/my-payroll', verifyToken, getMyPayroll);

// Staff endpoints
router.get('/weekly', verifyToken, requireStaff, getWeeklyPayroll);
router.post('/weekly/adjust', verifyToken, requireStaff, adjustWeeklyPayroll);
router.post('/salary-config', verifyToken, requireStaff, updateSalaryConfig);

module.exports = router;
