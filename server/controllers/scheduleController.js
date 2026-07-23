const { db } = require('../services/firebaseService');
const { getWeekId, getWeekRangeFromWeekId } = require('./payrollController');

/**
 * GET /api/schedules/weekly
 * Get weekly schedule
 * - Staff receives complete schedule including draft status.
 * - Employee receives ONLY if status === 'confirmed'.
 */
const getWeeklySchedule = async (req, res) => {
  try {
    const { weekId } = req.query;
    const currentWeekId = weekId || getWeekId();
    const dateRange = getWeekRangeFromWeekId(currentWeekId);

    const doc = await db.collection('weekly_schedules').doc(currentWeekId).get();

    if (!doc.exists) {
      const isStaff = req.user.role === 'staff';
      if (!isStaff) {
        return res.json({
          weekId: currentWeekId,
          dateRange,
          confirmed: false,
          shifts: {},
          message: 'Lịch ca làm tuần này chưa được xác nhận bởi Quản lý',
        });
      }
      return res.json({
        weekId: currentWeekId,
        dateRange,
        status: 'draft',
        confirmed: false,
        shifts: {},
      });
    }

    const data = doc.data();
    const isStaff = req.user.role === 'staff';

    if (!isStaff) {
      if (data.status !== 'confirmed') {
        return res.json({
          weekId: currentWeekId,
          dateRange,
          confirmed: false,
          shifts: {},
          message: 'Lịch ca làm tuần này chưa được xác nhận bởi Quản lý',
        });
      }

      // Return employee's own shifts
      const myShifts = (data.shifts && data.shifts[req.user.uid]) || {};
      return res.json({
        weekId: currentWeekId,
        dateRange,
        confirmed: true,
        shifts: myShifts,
      });
    }

    // Staff response
    res.json({
      weekId: currentWeekId,
      dateRange,
      status: data.status || 'draft',
      confirmed: data.status === 'confirmed',
      confirmedAt: data.confirmedAt || null,
      shifts: data.shifts || {},
      updatedAt: data.updatedAt || null,
    });
  } catch (error) {
    console.error('Get weekly schedule error:', error);
    res.status(500).json({ error: 'Không thể lấy lịch làm việc' });
  }
};

/**
 * POST /api/schedules/weekly
 * Save/update weekly schedule (Staff only)
 */
const saveWeeklySchedule = async (req, res) => {
  try {
    const { weekId, shifts } = req.body;

    if (!weekId || !shifts) {
      return res.status(400).json({ error: 'Thiếu dữ liệu weekId hoặc shifts' });
    }

    const dateRange = getWeekRangeFromWeekId(weekId);
    const docRef = db.collection('weekly_schedules').doc(weekId);
    const doc = await docRef.get();

    const existingData = doc.exists ? doc.data() : { status: 'draft' };

    const updateData = {
      weekId,
      startDate: dateRange.start,
      endDate: dateRange.end,
      shifts,
      status: existingData.status || 'draft',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid,
    };

    await docRef.set(updateData, { merge: true });

    res.json({ message: 'Đã lưu lịch làm việc', data: updateData });
  } catch (error) {
    console.error('Save weekly schedule error:', error);
    res.status(500).json({ error: 'Không thể lưu lịch làm việc' });
  }
};

/**
 * POST /api/schedules/weekly/confirm
 * Staff confirms and publishes the weekly schedule
 */
const confirmWeeklySchedule = async (req, res) => {
  try {
    const { weekId } = req.body;

    if (!weekId) {
      return res.status(400).json({ error: 'Thiếu tham số weekId' });
    }

    const docRef = db.collection('weekly_schedules').doc(weekId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Chưa có lịch làm để xác nhận. Vui lòng tạo lịch trước.' });
    }

    const confirmData = {
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      confirmedBy: req.user.uid,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(confirmData);

    res.json({ message: 'Đã xác nhận và công bố lịch làm việc cho nhân viên!', data: confirmData });
  } catch (error) {
    console.error('Confirm schedule error:', error);
    res.status(500).json({ error: 'Không thể xác nhận lịch làm việc' });
  }
};

/**
 * POST /api/schedules/weekly/unconfirm
 * Staff reverts weekly schedule to draft
 */
const unconfirmWeeklySchedule = async (req, res) => {
  try {
    const { weekId } = req.body;

    if (!weekId) {
      return res.status(400).json({ error: 'Thiếu tham số weekId' });
    }

    const docRef = db.collection('weekly_schedules').doc(weekId);
    await docRef.update({
      status: 'draft',
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Đã chuyển lịch làm việc về trạng thái Nháp' });
  } catch (error) {
    console.error('Unconfirm schedule error:', error);
    res.status(500).json({ error: 'Không thể thay đổi trạng thái lịch' });
  }
};

module.exports = {
  getWeeklySchedule,
  saveWeeklySchedule,
  confirmWeeklySchedule,
  unconfirmWeeklySchedule,
};
