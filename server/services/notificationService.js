const { admin, db } = require('./firebaseService');
const { getCurrentMonthRange, getCurrentWeekRange } = require('../utils/dateHelper');

/**
 * Send Push Notification to all Staff members via FCM
 */
const sendPushToStaff = async (title, body) => {
  try {
    if (!admin || !admin.messaging) return;

    const staffSnapshot = await db.collection('staff').get();
    const tokens = [];

    staffSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
      if (Array.isArray(data.fcmTokens)) {
        tokens.push(...data.fcmTokens);
      }
    });

    // Remove duplicates
    const uniqueTokens = [...new Set(tokens)].filter(Boolean);

    if (uniqueTokens.length === 0) return;

    const message = {
      notification: {
        title,
        body,
      },
      tokens: uniqueTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM PUSH] Sent ${response.successCount} push notifications successfully.`);
  } catch (error) {
    console.error('FCM Push Notification error:', error.message);
  }
};

/**
 * Check if an employee has completed their attendance target
 * and create a notification for staff
 */
const checkAttendanceCompletion = async (employeeId, empData) => {
  try {
    if (!db) return;
    const monthRange = getCurrentMonthRange();

    // Count attendance days this month
    const snapshot = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('date', '>=', monthRange.start)
      .where('date', '<=', monthRange.end)
      .get();

    const daysWorked = snapshot.size;
    const target = empData.schedule?.workDaysPerMonth || 26;

    // Check if just reached target
    if (daysWorked === target) {
      const staffSnapshot = await db.collection('staff').get();

      const notifMessage = `${empData.employeeCode} - ${empData.name} đã chấm công đủ ${daysWorked}/${target} ngày tháng này! 🎉`;
      const notificationData = {
        type: 'attendance_complete',
        employeeId,
        employeeName: empData.name,
        employeeCode: empData.employeeCode,
        message: notifMessage,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      // Create notification for each staff member
      const batch = db.batch();
      staffSnapshot.docs.forEach((staffDoc) => {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          ...notificationData,
          staffId: staffDoc.id,
        });
      });

      await batch.commit();

      // Send Push Notification via FCM to Admin/Staff devices
      await sendPushToStaff('Đã đủ công tháng 🎉', notifMessage);

      // EmailJS integration placeholder
      console.log(`[NOTIFICATION] ${notifMessage}`);
    }

    // Also check weekly target
    const weekRange = getCurrentWeekRange();
    const weekSnapshot = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('date', '>=', weekRange.start)
      .where('date', '<=', weekRange.end)
      .get();

    const weekDaysWorked = weekSnapshot.size;
    const weekTarget = empData.schedule?.workDaysPerWeek || 6;

    if (weekDaysWorked === weekTarget) {
      const staffSnapshot = await db.collection('staff').get();

      const weekNotifMessage = `${empData.employeeCode} - ${empData.name} đã chấm công đủ ${weekDaysWorked}/${weekTarget} ngày tuần này! ✅`;
      const weekNotifData = {
        type: 'weekly_complete',
        employeeId,
        employeeName: empData.name,
        employeeCode: empData.employeeCode,
        message: weekNotifMessage,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      const batch = db.batch();
      staffSnapshot.docs.forEach((staffDoc) => {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          ...weekNotifData,
          staffId: staffDoc.id,
        });
      });

      await batch.commit();

      // Send Push Notification via FCM to Admin/Staff devices
      await sendPushToStaff('Đã đủ công tuần ✅', weekNotifMessage);

      console.log(`[NOTIFICATION] ${weekNotifMessage}`);
    }
  } catch (error) {
    console.error('Check attendance completion error:', error);
  }
};

/**
 * Placeholder for EmailJS integration
 */
const sendEmailNotification = async (toEmail, subject, message) => {
  console.log(`[EMAIL PLACEHOLDER] To: ${toEmail}, Subject: ${subject}, Message: ${message}`);
};

module.exports = { checkAttendanceCompletion, sendEmailNotification, sendPushToStaff };

