const { db } = require('../services/firebaseService');

/**
 * GET /api/notifications
 * Get notifications for staff
 */
const getNotifications = async (req, res) => {
  try {
    const staffId = req.user.uid;

    const snapshot = await db
      .collection('notifications')
      .where('staffId', '==', staffId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Count unread
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Không thể lấy thông báo' });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('notifications').doc(id).update({ isRead: true });
    res.json({ message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Không thể cập nhật thông báo' });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const staffId = req.user.uid;
    const snapshot = await db
      .collection('notifications')
      .where('staffId', '==', staffId)
      .where('isRead', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();

    res.json({ message: 'Đã đọc tất cả thông báo' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Không thể cập nhật thông báo' });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
