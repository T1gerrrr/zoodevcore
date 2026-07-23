const { db, auth } = require('../services/firebaseService');
const bcrypt = require('bcryptjs');

/**
 * POST /api/auth/login
 * Staff login - verify Firebase token and check staff role
 */
const staffLogin = async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Chưa cấu hình Firebase Admin SDK trên Server (.env)' });
    }
    const { uid, email } = req.user;
    let staffDoc = await db.collection('staff').doc(uid).get();

    if (!staffDoc.exists) {
      // If Firestore has NO staff records at all, make this first user the Admin
      const staffSnapshot = await db.collection('staff').limit(1).get();
      if (staffSnapshot.empty) {
        const adminData = {
          email: email || req.user.email || '',
          name: 'Admin',
          role: 'staff',
          createdAt: new Date().toISOString(),
        };
        await db.collection('staff').doc(uid).set(adminData);
        staffDoc = await db.collection('staff').doc(uid).get();
      } else {
        return res.status(403).json({ error: 'Tài khoản Email này chưa được phân quyền Quản lý' });
      }
    }

    res.json({
      user: {
        uid,
        role: 'staff',
        ...staffDoc.data(),
      },
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ error: 'Lỗi đăng nhập: ' + error.message });
  }
};

/**
 * POST /api/auth/employee-login
 * Employee login via employeeCode + PIN
 */
const employeeLogin = async (req, res) => {
  try {
    const { employeeCode, pin } = req.body;

    if (!employeeCode || !pin) {
      return res.status(400).json({ error: 'Vui lòng nhập mã nhân viên và PIN' });
    }

    // Find employee by code
    const snapshot = await db
      .collection('employees')
      .where('employeeCode', '==', employeeCode.toUpperCase())
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Mã nhân viên không tồn tại' });
    }

    const empDoc = snapshot.docs[0];
    const empData = empDoc.data();

    // Verify PIN
    const isValid = await bcrypt.compare(pin, empData.pin);
    if (!isValid) {
      return res.status(401).json({ error: 'PIN không chính xác' });
    }

    // Create a custom Firebase token for the employee
    const customToken = await auth.createCustomToken(empDoc.id, {
      role: 'employee',
      employeeCode: empData.employeeCode,
    });

    res.json({
      customToken,
      user: {
        uid: empDoc.id,
        role: 'employee',
        name: empData.name,
        employeeCode: empData.employeeCode,
        position: empData.position,
        schedule: empData.schedule,
        facePhotoUrl: empData.facePhotoUrl || '',
      },
    });
  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({ error: 'Đăng nhập thất bại' });
  }
};

/**
 * GET /api/auth/me
 * Get current user info
 */
const getMe = async (req, res) => {
  try {
    const { uid, role } = req.user;

    if (role === 'staff') {
      const staffDoc = await db.collection('staff').doc(uid).get();
      return res.json({
        uid,
        role: 'staff',
        ...staffDoc.data(),
      });
    }

    // Employee
    const empDoc = await db.collection('employees').doc(uid).get();
    if (!empDoc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin người dùng' });
    }

    const empData = empDoc.data();
    res.json({
      uid,
      role: 'employee',
      name: empData.name,
      employeeCode: empData.employeeCode,
      position: empData.position,
      schedule: empData.schedule,
      facePhotoUrl: empData.facePhotoUrl || '',
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Không thể lấy thông tin người dùng' });
  }
};

/**
 * POST /api/auth/setup-staff
 * One-time setup: create first staff account
 */
const setupStaff = async (req, res) => {
  try {
    const { uid, email, name } = req.body;

    // Check if any staff exists
    const staffSnapshot = await db.collection('staff').limit(1).get();
    if (!staffSnapshot.empty) {
      return res.status(400).json({ error: 'Đã có tài khoản quản lý' });
    }

    await db.collection('staff').doc(uid).set({
      email,
      name: name || 'Admin',
      role: 'staff',
      createdAt: new Date().toISOString(),
    });

    res.json({ message: 'Tạo tài khoản quản lý thành công' });
  } catch (error) {
    console.error('Setup staff error:', error);
    res.status(500).json({ error: 'Không thể tạo tài khoản quản lý' });
  }
};

/**
 * POST /api/auth/phone-login
 * Phone OTP Login - verify Firebase ID token containing phone_number
 */
const phoneLogin = async (req, res) => {
  try {
    const { uid, phone_number } = req.user;
    if (!phone_number) {
      return res.status(400).json({ error: 'Token không chứa số điện thoại xác thực' });
    }

    const localPhone = phone_number.startsWith('+84') ? '0' + phone_number.slice(3) : phone_number;

    // Check staff
    const staffDoc = await db.collection('staff').doc(uid).get();
    if (staffDoc.exists) {
      return res.json({
        user: {
          uid,
          role: 'staff',
          ...staffDoc.data(),
        },
      });
    }

    // Check employee by phone number
    const empSnapshot = await db
      .collection('employees')
      .where('phone', 'in', [phone_number, localPhone])
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!empSnapshot.empty) {
      const empDoc = empSnapshot.docs[0];
      const empData = empDoc.data();
      return res.json({
        user: {
          uid: empDoc.id,
          role: 'employee',
          name: empData.name,
          employeeCode: empData.employeeCode,
          position: empData.position,
          schedule: empData.schedule,
          facePhotoUrl: empData.facePhotoUrl || '',
        },
      });
    }

    return res.status(404).json({
      error: `Số điện thoại ${localPhone} chưa được đăng ký trong hệ thống. Vui lòng liên hệ quản lý để thêm số điện thoại.`,
    });
  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({ error: 'Đăng nhập bằng số điện thoại thất bại' });
  }
};

module.exports = { staffLogin, employeeLogin, phoneLogin, getMe, setupStaff };

