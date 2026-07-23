const express = require('express');
const router = express.Router();
const { verifyToken, requireStaff } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');

// All routes require staff auth
router.use(verifyToken, requireStaff);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

module.exports = router;
