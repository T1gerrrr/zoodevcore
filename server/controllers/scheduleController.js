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

/**
 * POST /api/schedules/weekly/auto-generate
 * Smart Auto-Scheduling with even distribution of shifts and OFF days
 */
const autoGenerateSchedule = async (req, res) => {
  try {
    const {
      weekId,
      workDaysPerWeek = 5,
      offDaysPerWeek = 2,
      shiftMode = 'rotating', // 'full', 'rotating', 'morning', 'afternoon', 'evening'
    } = req.body;

    if (!weekId) {
      return res.status(400).json({ error: 'Thiếu tham số weekId' });
    }

    // 1. Get all active employees
    const empSnapshot = await db.collection('employees').get();
    const employees = empSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => e.isActive !== false);

    if (employees.length === 0) {
      return res.status(400).json({ error: 'Chưa có nhân viên active để xếp lịch' });
    }

    const dateRange = getWeekRangeFromWeekId(weekId);

    // Generate date strings for Mon -> Sun (7 days)
    const weekDates = [];
    const startDate = new Date(dateRange.start);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }

    const SHIFT_PRESETS = {
      full: { id: 'full', label: 'Cả ngày (08:00-17:00)', start: '08:00', end: '17:00', color: '#3b82f6' },
      morning: { id: 'morning', label: 'Ca Sáng (08:00-12:00)', start: '08:00', end: '12:00', color: '#10b981' },
      afternoon: { id: 'afternoon', label: 'Ca Chiều (13:00-17:00)', start: '13:00', end: '17:00', color: '#f59e0b' },
      evening: { id: 'evening', label: 'Ca Tối (17:00-21:00)', start: '17:00', end: '21:00', color: '#8b5cf6' },
      off: { id: 'off', label: 'Nghỉ (OFF)', start: '', end: '', color: '#94a3b8' },
    };

    const rotatingTypes = ['full', 'morning', 'afternoon', 'evening'];
    const generatedShifts = {};

    const requiredOff = Math.max(0, Math.min(6, parseInt(offDaysPerWeek, 10)));

    employees.forEach((emp, empIdx) => {
      generatedShifts[emp.id] = {};

      // Determine OFF day indices for this employee (staggered for store coverage)
      const offIndices = new Set();
      for (let o = 0; o < requiredOff; o++) {
        const offDayIndex = (empIdx * 2 + o + Math.floor(empIdx / 2)) % 7;
        offIndices.add(offDayIndex);
      }

      weekDates.forEach((dateStr, dayIdx) => {
        if (offIndices.has(dayIdx)) {
          generatedShifts[emp.id][dateStr] = SHIFT_PRESETS.off;
        } else {
          let chosenPreset = SHIFT_PRESETS.full;
          if (shiftMode === 'rotating') {
            const shiftTypeIndex = (empIdx + dayIdx) % rotatingTypes.length;
            const shiftKey = rotatingTypes[shiftTypeIndex];
            chosenPreset = SHIFT_PRESETS[shiftKey] || SHIFT_PRESETS.full;
          } else if (SHIFT_PRESETS[shiftMode]) {
            chosenPreset = SHIFT_PRESETS[shiftMode];
          }

          generatedShifts[emp.id][dateStr] = chosenPreset;
        }
      });
    });

    // Save generated draft schedule to Firestore
    const docRef = db.collection('weekly_schedules').doc(weekId);
    const updateData = {
      weekId,
      startDate: dateRange.start,
      endDate: dateRange.end,
      shifts: generatedShifts,
      status: 'draft',
      autoGenerated: true,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid,
    };

    await docRef.set(updateData, { merge: true });

    res.json({
      message: `Đã tự động tạo và phân bổ lịch thông minh cho ${employees.length} nhân viên!`,
      shifts: generatedShifts,
      status: 'draft',
    });
  } catch (error) {
    console.error('Auto generate schedule error:', error);
    res.status(500).json({ error: 'Không thể xếp lịch tự động' });
  }
};

module.exports = {
  getWeeklySchedule,
  saveWeeklySchedule,
  confirmWeeklySchedule,
  unconfirmWeeklySchedule,
  autoGenerateSchedule,
};
