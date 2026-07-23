const { db } = require('../services/firebaseService');
const { getCurrentWeekRange, getCurrentMonthRange, formatDateString, getVietnamNow } = require('../utils/dateHelper');

/**
 * Helper to get week dates range for a given weekId (e.g. "2026-W30") or default to current week
 */
const getWeekRangeFromWeekId = (weekId) => {
  if (!weekId || !weekId.match(/^\d{4}-W\d{1,2}$/)) {
    return getCurrentWeekRange();
  }
  const [yearStr, weekStr] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Find Jan 4th of that year (ISO 8601 rule)
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (week - 1) * 7);

  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  return {
    start: formatDateString(targetMonday),
    end: formatDateString(targetSunday),
  };
};

/**
 * Helper to generate weekId from date
 */
const getWeekId = (d = getVietnamNow()) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

/**
 * GET /api/payroll/weekly
 * Get weekly payroll report for staff
 */
const getWeeklyPayroll = async (req, res) => {
  try {
    const { weekId } = req.query;
    const currentWeekId = weekId || getWeekId();
    const dateRange = getWeekRangeFromWeekId(currentWeekId);
    const monthRange = getCurrentMonthRange();

    // 1. Get active employees
    const employeesSnapshot = await db
      .collection('employees')
      .where('isActive', '==', true)
      .get();

    const employees = employeesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 2. Get attendance records for the week
    const weekAttendanceSnapshot = await db
      .collection('attendance')
      .where('date', '>=', dateRange.start)
      .where('date', '<=', dateRange.end)
      .get();

    const weekRecords = weekAttendanceSnapshot.docs.map((doc) => doc.data());

    // 3. Get attendance records for the month
    const monthAttendanceSnapshot = await db
      .collection('attendance')
      .where('date', '>=', monthRange.start)
      .where('date', '<=', monthRange.end)
      .get();

    const monthRecords = monthAttendanceSnapshot.docs.map((doc) => doc.data());

    // 4. Get saved payroll adjustments for week
    const payrollDoc = await db.collection('weekly_payrolls').doc(currentWeekId).get();
    const payrollData = payrollDoc.exists ? payrollDoc.data() : { adjustments: {}, status: 'draft' };
    const storedAdjustments = payrollData.adjustments || {};

    // 5. Calculate for each employee
    const report = employees.map((emp) => {
      const empWeekRecords = weekRecords.filter((r) => r.employeeId === emp.id);
      const empMonthRecords = monthRecords.filter((r) => r.employeeId === emp.id);

      const daysWorkedWeek = new Set(empWeekRecords.map((r) => r.date)).size;
      const totalHoursWeek = empWeekRecords.reduce((sum, r) => sum + (r.workHours || 0), 0);

      const daysWorkedMonth = new Set(empMonthRecords.map((r) => r.date)).size;

      const targetWeekDays = emp.schedule?.workDaysPerWeek || 6;
      const targetMonthDays = emp.schedule?.workDaysPerMonth || 26;

      const daysOffWeek = Math.max(0, targetWeekDays - daysWorkedWeek);
      const daysOffMonth = Math.max(0, targetMonthDays - daysWorkedMonth);

      const salaryType = emp.salaryType || 'hourly';
      const hourlyRate = emp.hourlyRate || 30000;
      const dailyRate = emp.dailyRate || 250000;

      let baseSalary = 0;
      if (salaryType === 'daily') {
        baseSalary = Math.round(daysWorkedWeek * dailyRate);
      } else {
        baseSalary = Math.round(totalHoursWeek * hourlyRate);
      }

      const adj = storedAdjustments[emp.id] || { bonus: 0, deduction: 0, note: '' };
      const bonus = Number(adj.bonus) || 0;
      const deduction = Number(adj.deduction) || 0;
      const note = adj.note || '';

      const netSalary = Math.max(0, baseSalary + bonus - deduction);

      return {
        employeeId: emp.id,
        name: emp.name,
        employeeCode: emp.employeeCode,
        position: emp.position,
        salaryType,
        hourlyRate,
        dailyRate,
        daysWorkedWeek,
        totalHoursWeek: parseFloat(totalHoursWeek.toFixed(1)),
        daysOffWeek,
        daysWorkedMonth,
        daysOffMonth,
        baseSalary,
        bonus,
        deduction,
        note,
        netSalary,
      };
    });

    res.json({
      weekId: currentWeekId,
      dateRange,
      status: payrollData.status || 'draft',
      updatedAt: payrollData.updatedAt || null,
      summary: report,
    });
  } catch (error) {
    console.error('Get weekly payroll error:', error);
    res.status(500).json({ error: 'Không thể lấy dữ liệu tổng kết lương' });
  }
};

/**
 * POST /api/payroll/weekly/adjust
 * Save bonus/deduction/note or finalize weekly payroll (staff only)
 */
const adjustWeeklyPayroll = async (req, res) => {
  try {
    const { weekId, employeeId, bonus, deduction, note, status } = req.body;

    if (!weekId) {
      return res.status(400).json({ error: 'Thiếu thông số weekId' });
    }

    const docRef = db.collection('weekly_payrolls').doc(weekId);
    const doc = await docRef.get();

    let currentData = doc.exists ? doc.data() : { adjustments: {}, status: 'draft' };

    if (!currentData.adjustments) currentData.adjustments = {};

    if (employeeId) {
      currentData.adjustments[employeeId] = {
        bonus: Number(bonus) || 0,
        deduction: Number(deduction) || 0,
        note: note || '',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.uid,
      };
    }

    if (status) {
      currentData.status = status;
    }

    currentData.updatedAt = new Date().toISOString();

    await docRef.set(currentData, { merge: true });

    res.json({ message: 'Cập nhật bảng lương thành công', data: currentData });
  } catch (error) {
    console.error('Adjust weekly payroll error:', error);
    res.status(500).json({ error: 'Không thể cập nhật bảng lương' });
  }
};

/**
 * GET /api/payroll/my-payroll
 * Get employee's own payroll for specified week or current week
 */
const getMyPayroll = async (req, res) => {
  try {
    const employeeId = req.user.uid;
    const { weekId } = req.query;
    const currentWeekId = weekId || getWeekId();
    const dateRange = getWeekRangeFromWeekId(currentWeekId);
    const monthRange = getCurrentMonthRange();

    const empDoc = await db.collection('employees').doc(employeeId).get();
    if (!empDoc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin nhân viên' });
    }
    const emp = empDoc.data();

    // Attendance records for week
    const weekRecordsSnap = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('date', '>=', dateRange.start)
      .where('date', '<=', dateRange.end)
      .get();
    const weekRecords = weekRecordsSnap.docs.map((doc) => doc.data());

    // Attendance records for month
    const monthRecordsSnap = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('date', '>=', monthRange.start)
      .where('date', '<=', monthRange.end)
      .get();
    const monthRecords = monthRecordsSnap.docs.map((doc) => doc.data());

    const daysWorkedWeek = new Set(weekRecords.map((r) => r.date)).size;
    const totalHoursWeek = weekRecords.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const daysWorkedMonth = new Set(monthRecords.map((r) => r.date)).size;

    const targetWeekDays = emp.schedule?.workDaysPerWeek || 6;
    const targetMonthDays = emp.schedule?.workDaysPerMonth || 26;

    const daysOffWeek = Math.max(0, targetWeekDays - daysWorkedWeek);
    const daysOffMonth = Math.max(0, targetMonthDays - daysWorkedMonth);

    const salaryType = emp.salaryType || 'hourly';
    const hourlyRate = emp.hourlyRate || 30000;
    const dailyRate = emp.dailyRate || 250000;

    let baseSalary = 0;
    if (salaryType === 'daily') {
      baseSalary = Math.round(daysWorkedWeek * dailyRate);
    } else {
      baseSalary = Math.round(totalHoursWeek * hourlyRate);
    }

    const payrollDoc = await db.collection('weekly_payrolls').doc(currentWeekId).get();
    const storedAdjustments = (payrollDoc.exists && payrollDoc.data().adjustments) || {};
    const adj = storedAdjustments[employeeId] || { bonus: 0, deduction: 0, note: '' };

    const bonus = Number(adj.bonus) || 0;
    const deduction = Number(adj.deduction) || 0;
    const note = adj.note || '';
    const netSalary = Math.max(0, baseSalary + bonus - deduction);

    res.json({
      weekId: currentWeekId,
      dateRange,
      status: (payrollDoc.exists && payrollDoc.data().status) || 'draft',
      details: {
        salaryType,
        hourlyRate,
        dailyRate,
        daysWorkedWeek,
        totalHoursWeek: parseFloat(totalHoursWeek.toFixed(1)),
        daysOffWeek,
        daysWorkedMonth,
        daysOffMonth,
        baseSalary,
        bonus,
        deduction,
        note,
        netSalary,
      },
    });
  } catch (error) {
    console.error('Get my payroll error:', error);
    res.status(500).json({ error: 'Không thể lấy thông tin lương' });
  }
};

/**
 * POST /api/payroll/salary-config
 * Staff updates employee salary configuration (salaryType, hourlyRate, dailyRate)
 */
const updateSalaryConfig = async (req, res) => {
  try {
    const { employeeId, salaryType, hourlyRate, dailyRate } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Thiếu mã nhân viên employeeId' });
    }

    const empRef = db.collection('employees').doc(employeeId);
    const empDoc = await empRef.get();

    if (!empDoc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    const updateData = {
      salaryType: salaryType || 'hourly',
      hourlyRate: Number(hourlyRate) || 0,
      dailyRate: Number(dailyRate) || 0,
      updatedAt: new Date().toISOString(),
    };

    await empRef.update(updateData);

    res.json({ message: 'Đã cập nhật mức lương nhân viên thành công!', data: updateData });
  } catch (error) {
    console.error('Update salary config error:', error);
    res.status(500).json({ error: 'Không thể cập nhật cấu hình lương' });
  }
};

module.exports = {
  getWeeklyPayroll,
  adjustWeeklyPayroll,
  getMyPayroll,
  updateSalaryConfig,
  getWeekId,
  getWeekRangeFromWeekId,
};
