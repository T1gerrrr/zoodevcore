const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getHistory,
  getSummary,
} = require('../controllers/attendanceController');

// Check-in/out (authenticated)
router.post('/checkin', verifyToken, checkIn);
router.post('/checkout', verifyToken, checkOut);

// Get today's attendance for employee
router.get('/today/:employeeId', verifyToken, getTodayAttendance);

// History & Summary (staff mostly)
router.get('/history', verifyToken, getHistory);
router.get('/summary', verifyToken, getSummary);

module.exports = router;
