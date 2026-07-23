const express = require('express');
const router = express.Router();
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');
const {
  getWeeklyPayroll,
  adjustWeeklyPayroll,
  getMyPayroll,
} = require('../controllers/payrollController');

// Employee endpoint
router.get('/my-payroll', verifyToken, getMyPayroll);

// Staff endpoints
router.get('/weekly', verifyToken, requireStaff, getWeeklyPayroll);
router.post('/weekly/adjust', verifyToken, requireStaff, adjustWeeklyPayroll);

module.exports = router;
