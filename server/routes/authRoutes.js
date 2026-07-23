const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { staffLogin, employeeLogin, phoneLogin, getMe, setupStaff } = require('../controllers/authController');

// Staff login (requires Firebase token)
router.post('/login', verifyToken, staffLogin);

// Employee login (code + PIN, no Firebase token needed)
router.post('/employee-login', employeeLogin);

// Phone Auth login (requires Firebase token with phone_number)
router.post('/phone-login', verifyToken, phoneLogin);

// Get current user info
router.get('/me', verifyToken, getMe);

// One-time setup for first staff account
router.post('/setup-staff', setupStaff);

module.exports = router;

