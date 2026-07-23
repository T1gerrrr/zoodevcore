const { auth } = require('../services/firebaseService');
const { db } = require('../services/firebaseService');

/**
 * Verify Firebase ID token from Authorization header
 */
const verifyToken = async (req, res, next) => {
  try {
    if (!auth) {
      return res.status(500).json({ error: 'Server chưa được cấu hình Firebase Admin SDK (.env)' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Không có token xác thực' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;

    // Check if user is staff
    if (db) {
      const staffDoc = await db.collection('staff').doc(decoded.uid).get();
      if (staffDoc.exists) {
        req.user.role = 'staff';
        req.user.staffData = staffDoc.data();
      } else {
        req.user.role = 'employee';
      }
    } else {
      req.user.role = 'employee';
    }

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn: ' + error.message });
  }
};

/**
 * Verify employee login via employeeCode + PIN
 */
const verifyEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(401).json({ error: 'Thiếu thông tin nhân viên' });
    }

    const empDoc = await db.collection('employees').doc(employeeId).get();
    if (!empDoc.exists) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    req.employee = { id: empDoc.id, ...empDoc.data() };
    next();
  } catch (error) {
    console.error('Employee auth error:', error.message);
    return res.status(401).json({ error: 'Xác thực nhân viên thất bại' });
  }
};

/**
 * Require staff role
 */
const requireStaff = (req, res, next) => {
  if (req.user?.role !== 'staff') {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
  }
  next();
};

module.exports = { verifyToken, verifyEmployee, requireStaff };
