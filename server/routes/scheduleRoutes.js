const express = require('express');
const router = express.Router();
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');
const {
  getWeeklySchedule,
  saveWeeklySchedule,
  confirmWeeklySchedule,
  unconfirmWeeklySchedule,
  autoGenerateSchedule,
} = require('../controllers/scheduleController');

// Shared / Employee endpoint (returns filtered data based on user role and confirmed status)
router.get('/weekly', verifyToken, getWeeklySchedule);

// Staff endpoints
router.post('/weekly', verifyToken, requireStaff, saveWeeklySchedule);
router.post('/weekly/confirm', verifyToken, requireStaff, confirmWeeklySchedule);
router.post('/weekly/unconfirm', verifyToken, requireStaff, unconfirmWeeklySchedule);
router.post('/weekly/auto-generate', verifyToken, requireStaff, autoGenerateSchedule);

module.exports = router;
