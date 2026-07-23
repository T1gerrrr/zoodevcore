const { db } = require('../services/firebaseService');
const bcrypt = require('bcryptjs');

/**
 * GET /api/employees
 * List all employees (staff only)
 */
const getEmployees = async (req, res) => {
  try {
    const snapshot = await db
      .collection('employees')
      .orderBy('createdAt', 'desc')
      .get();

    const employees = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      pin: undefined, // Never send PIN
    }));

    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách nhân viên' });
  }
};

/**
 * GET /api/employees/:id
 * Get employee by ID
 */
const getEmployee = async (req, res) => {
  try {
    const doc = await db.collection('employees').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    const data = doc.data();
    res.json({ id: doc.id, ...data, pin: undefined });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Không thể lấy thông tin nhân viên' });
  }
};

/**
 * POST /api/employees
 * Create new employee (staff only)
 */
const createEmployee = async (req, res) => {
  try {
    const {
      name,
      employeeCode,
      pin,
      phone,
      position,
      schedule,
      salaryType,
      hourlyRate,
      dailyRate,
      facePhotoUrl,
    } = req.body;

    // Validate required fields
    if (!name || !employeeCode || !pin) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    // Check duplicate employee code
    const existing = await db
      .collection('employees')
      .where('employeeCode', '==', employeeCode.toUpperCase())
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: 'Mã nhân viên đã tồn tại' });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    const employeeData = {
      name,
      employeeCode: employeeCode.toUpperCase(),
      pin: hashedPin,
      phone: phone || '',
      position: position || 'Nhân viên',
      salaryType: salaryType || 'hourly',
      hourlyRate: Number(hourlyRate) || 30000,
      dailyRate: Number(dailyRate) || 250000,
      facePhotoUrl: facePhotoUrl || '',
      schedule: {
        workDaysPerWeek: schedule?.workDaysPerWeek || 6,
        workDaysPerMonth: schedule?.workDaysPerMonth || 26,
        shiftStart: schedule?.shiftStart || '08:00',
        shiftEnd: schedule?.shiftEnd || '17:00',
        workLocation: {
          name: schedule?.workLocation?.name || '',
          latitude: schedule?.workLocation?.latitude || 0,
          longitude: schedule?.workLocation?.longitude || 0,
          radiusMeters: schedule?.workLocation?.radiusMeters || 200,
        },
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
    };

    const docRef = await db.collection('employees').add(employeeData);

    res.status(201).json({
      id: docRef.id,
      ...employeeData,
      pin: undefined,
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Không thể tạo nhân viên' });
  }
};

/**
 * PUT /api/employees/:id
 * Update employee info (staff only)
 */
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('employees').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    const updates = {};
    const { name, phone, position, schedule, pin, isActive, salaryType, hourlyRate, dailyRate, facePhotoUrl } = req.body;

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (position !== undefined) updates.position = position;
    if (isActive !== undefined) updates.isActive = isActive;
    if (salaryType !== undefined) updates.salaryType = salaryType;
    if (hourlyRate !== undefined) updates.hourlyRate = Number(hourlyRate);
    if (dailyRate !== undefined) updates.dailyRate = Number(dailyRate);
    if (facePhotoUrl !== undefined) updates.facePhotoUrl = facePhotoUrl;

    if (schedule) {
      updates.schedule = {
        workDaysPerWeek: schedule.workDaysPerWeek ?? doc.data().schedule?.workDaysPerWeek ?? 6,
        workDaysPerMonth: schedule.workDaysPerMonth ?? doc.data().schedule?.workDaysPerMonth ?? 26,
        shiftStart: schedule.shiftStart ?? doc.data().schedule?.shiftStart ?? '08:00',
        shiftEnd: schedule.shiftEnd ?? doc.data().schedule?.shiftEnd ?? '17:00',
        workLocation: {
          name: schedule.workLocation?.name ?? doc.data().schedule?.workLocation?.name ?? '',
          latitude: schedule.workLocation?.latitude ?? doc.data().schedule?.workLocation?.latitude ?? 0,
          longitude: schedule.workLocation?.longitude ?? doc.data().schedule?.workLocation?.longitude ?? 0,
          radiusMeters: schedule.workLocation?.radiusMeters ?? doc.data().schedule?.workLocation?.radiusMeters ?? 200,
        },
      };
    }

    if (pin) {
      updates.pin = await bcrypt.hash(pin, 10);
    }

    updates.updatedAt = new Date().toISOString();

    await db.collection('employees').doc(id).update(updates);

    const updated = await db.collection('employees').doc(id).get();
    res.json({ id, ...updated.data(), pin: undefined });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Không thể cập nhật nhân viên' });
  }
};

/**
 * DELETE /api/employees/:id
 * Soft delete employee (staff only)
 */
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('employees').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    // Soft delete - just deactivate
    await db.collection('employees').doc(id).update({
      isActive: false,
      deletedAt: new Date().toISOString(),
    });

    res.json({ message: 'Đã xóa nhân viên' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Không thể xóa nhân viên' });
  }
};

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };
