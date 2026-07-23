const { db } = require('../services/firebaseService');
const { uploadImage } = require('../services/cloudinaryService');
const { isWithinRadius } = require('../utils/geolocation');
const { getTodayString, isLateCheckIn, getCurrentWeekRange, getCurrentMonthRange } = require('../utils/dateHelper');
const { checkAttendanceCompletion } = require('../services/notificationService');
const { compareFaces } = require('../utils/faceMatcher');

/**
 * POST /api/attendance/checkin
 * Employee check-in with photo and location
 */
const checkIn = async (req, res) => {
  try {
    const { employeeId, photo, latitude, longitude, address } = req.body;

    if (!employeeId || !photo || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin check-in (ảnh, vị trí)' });
    }

    // Get employee data
    const empDoc = await db.collection('employees').doc(employeeId).get();
    if (!empDoc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    const empData = empDoc.data();

    // Verify Face ID match if profile face photo is set
    if (empData.facePhotoUrl) {
      const faceResult = await compareFaces(photo, empData.facePhotoUrl);
      if (!faceResult.isMatch) {
        return res.status(400).json({
          error: `Khuôn mặt không trùng khớp với hồ sơ Face ID (Độ khớp: ${faceResult.percentage || 0}%). Vui lòng đưa khuôn mặt vào chính giữa khung hình và thử lại.`,
          faceScore: faceResult.similarity,
        });
      }
    }

    // Check if within work location radius
    const { workLocation } = empData.schedule;
    if (workLocation && workLocation.latitude && workLocation.longitude) {
      const locationCheck = isWithinRadius(
        latitude,
        longitude,
        workLocation.latitude,
        workLocation.longitude,
        workLocation.radiusMeters || 200
      );

      if (!locationCheck.isWithin) {
        return res.status(400).json({
          error: `Bạn đang ở ngoài vùng cho phép (${locationCheck.distance}m). Vui lòng đến gần cửa hàng hơn.`,
          distance: locationCheck.distance,
          maxDistance: workLocation.radiusMeters || 200,
        });
      }
    }

    // Check if already checked in today
    const today = getTodayString();
    const existingSnapshot = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('date', '==', today)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      const existingData = existingSnapshot.docs[0].data();
      if (existingData.checkIn) {
        return res.status(400).json({ error: 'Bạn đã check-in hôm nay rồi' });
      }
    }

    // Upload photo to Cloudinary
    const uploadResult = await uploadImage(photo, 'checkin');

    // Check if late
    const late = isLateCheckIn(empData.schedule.shiftStart);

    // Create attendance record
    const attendanceData = {
      employeeId,
      employeeName: empData.name,
      employeeCode: empData.employeeCode,
      date: today,
      checkIn: {
        time: new Date().toISOString(),
        photo: uploadResult.url,
        photoId: uploadResult.publicId,
        location: { lat: latitude, lng: longitude },
        address: address || '',
        isLate: late,
      },
      checkOut: null,
      status: late ? 'late' : 'present',
      workHours: 0,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('attendance').add(attendanceData);

    // Check attendance completion (async, don't wait)
    checkAttendanceCompletion(employeeId, empData).catch(console.error);

    res.status(201).json({
      id: docRef.id,
      ...attendanceData,
      message: late ? 'Check-in thành công (đi trễ)' : 'Check-in thành công',
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Check-in thất bại. Vui lòng thử lại.' });
  }
};

/**
 * POST /api/attendance/checkout
 * Employee check-out
 */
const checkOut = async (req, res) => {
  try {
    const { employeeId, photo, latitude, longitude, address } = req.body;

    if (!employeeId || !photo || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Thiếu thông tin check-out (ảnh, vị trí)' });
    }

    // Get employee data
    const empDoc = await db.collection('employees').doc(employeeId).get();
    if (!empDoc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    const empData = empDoc.data();

    // Verify Face ID match if profile face photo is set
    if (empData.facePhotoUrl) {
      const faceResult = await compareFaces(photo, empData.facePhotoUrl);
      if (!faceResult.isMatch) {
        return res.status(400).json({
          error: `Khuôn mặt không trùng khớp với hồ sơ Face ID (Độ khớp: ${faceResult.percentage || 0}%). Vui lòng đưa khuôn mặt vào chính giữa khung hình.`,
          faceScore: faceResult.similarity,
        });
      }
    }

    // Check location
    const { workLocation } = empData.schedule;
    if (workLocation && workLocation.latitude && workLocation.longitude) {
      const locationCheck = isWithinRadius(
        latitude,
        longitude,
        workLocation.latitude,
        workLocation.longitude,
        workLocation.radiusMeters || 200
      );

      if (!locationCheck.isWithin) {
        return res.status(400).json({
          error: `Bạn đang ở ngoài vùng cho phép (${locationCheck.distance}m).`,
          distance: locationCheck.distance,
        });
      }
    }

    // Find today's check-in record
    const today = getTodayString();
    const snapshot = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('date', '==', today)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({ error: 'Bạn chưa check-in hôm nay' });
    }

    const attendanceDoc = snapshot.docs[0];
    const attendanceData = attendanceDoc.data();

    if (attendanceData.checkOut) {
      return res.status(400).json({ error: 'Bạn đã check-out hôm nay rồi' });
    }

    // Upload check-out photo
    const uploadResult = await uploadImage(photo, 'checkout');

    // Calculate work hours
    const checkInTime = new Date(attendanceData.checkIn.time);
    const checkOutTime = new Date();
    const workHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(1);

    // Update attendance record
    await db.collection('attendance').doc(attendanceDoc.id).update({
      checkOut: {
        time: checkOutTime.toISOString(),
        photo: uploadResult.url,
        photoId: uploadResult.publicId,
        location: { lat: latitude, lng: longitude },
        address: address || '',
      },
      workHours: parseFloat(workHours),
      updatedAt: new Date().toISOString(),
    });

    res.json({
      message: 'Check-out thành công',
      workHours: parseFloat(workHours),
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Check-out thất bại. Vui lòng thử lại.' });
  }
};

/**
 * GET /api/attendance/today/:employeeId
 * Get today's attendance for an employee
 */
const getTodayAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = getTodayString();

    const snapshot = await db
      .collection('attendance')
      .where('employeeId', '==', employeeId)
      .where('date', '==', today)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json(null);
    }

    const doc = snapshot.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Không thể lấy dữ liệu chấm công' });
  }
};

/**
 * GET /api/attendance/history
 * Get attendance history (filtered)
 */
const getHistory = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status } = req.query;

    let query = db.collection('attendance').orderBy('date', 'desc');

    if (employeeId) {
      query = query.where('employeeId', '==', employeeId);
    }
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const snapshot = await query.limit(100).get();

    let records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by status in memory (Firestore doesn't support multiple inequality)
    if (status) {
      records = records.filter((r) => r.status === status);
    }

    res.json(records);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Không thể lấy lịch sử chấm công' });
  }
};

/**
 * GET /api/attendance/summary
 * Get attendance summary for dashboard
 */
const getSummary = async (req, res) => {
  try {
    const { period } = req.query; // 'today', 'week', 'month'
    const today = getTodayString();

    let dateFilter;
    if (period === 'week') {
      dateFilter = getCurrentWeekRange();
    } else if (period === 'month') {
      dateFilter = getCurrentMonthRange();
    } else {
      dateFilter = { start: today, end: today };
    }

    // Get all employees
    const employeesSnapshot = await db
      .collection('employees')
      .where('isActive', '==', true)
      .get();

    const totalEmployees = employeesSnapshot.size;

    // Get attendance records
    const attendanceSnapshot = await db
      .collection('attendance')
      .where('date', '>=', dateFilter.start)
      .where('date', '<=', dateFilter.end)
      .get();

    const records = attendanceSnapshot.docs.map((doc) => doc.data());

    // Today's stats
    const todayRecords = records.filter((r) => r.date === today);
    const checkedIn = todayRecords.length;
    const lateCount = todayRecords.filter((r) => r.status === 'late').length;
    const onTimeCount = todayRecords.filter((r) => r.status === 'present').length;
    const absentCount = totalEmployees - checkedIn;

    // Per-employee summary for the period
    const employeeSummary = {};
    employeesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      employeeSummary[doc.id] = {
        employeeId: doc.id,
        name: data.name,
        employeeCode: data.employeeCode,
        target: period === 'week' ? data.schedule?.workDaysPerWeek : data.schedule?.workDaysPerMonth,
        daysWorked: 0,
        lateDays: 0,
      };
    });

    records.forEach((record) => {
      if (employeeSummary[record.employeeId]) {
        employeeSummary[record.employeeId].daysWorked++;
        if (record.status === 'late') {
          employeeSummary[record.employeeId].lateDays++;
        }
      }
    });

    res.json({
      today: {
        totalEmployees,
        checkedIn,
        onTime: onTimeCount,
        late: lateCount,
        absent: absentCount,
      },
      todayRecords: todayRecords.map((r) => ({
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        employeeCode: r.employeeCode,
        checkInTime: r.checkIn?.time,
        checkOutTime: r.checkOut?.time,
        status: r.status,
        isLate: r.checkIn?.isLate,
      })),
      employeeSummary: Object.values(employeeSummary),
      period: dateFilter,
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Không thể lấy thống kê' });
  }
};

module.exports = { checkIn, checkOut, getTodayAttendance, getHistory, getSummary };
