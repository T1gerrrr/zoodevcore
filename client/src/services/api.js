import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  staffLogin: () => api.post('/auth/login'),
  employeeLogin: (data) => api.post('/auth/employee-login', data),
  phoneLogin: () => api.post('/auth/phone-login'),
  getMe: () => api.get('/auth/me'),
  setupStaff: (data) => api.post('/auth/setup-staff', data),
};

// Employee API
export const employeeAPI = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

// Attendance API
export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (data) => api.post('/attendance/checkout', data),
  getToday: (employeeId) => api.get(`/attendance/today/${employeeId}`),
  getHistory: (params) => api.get('/attendance/history', { params }),
  getSummary: (params) => api.get('/attendance/summary', { params }),
};

// Notification API
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Payroll API
export const payrollAPI = {
  getWeekly: (params) => api.get('/payroll/weekly', { params }),
  adjustWeekly: (data) => api.post('/payroll/weekly/adjust', data),
  getMyPayroll: (params) => api.get('/payroll/my-payroll', { params }),
};

// Schedule API
export const scheduleAPI = {
  getWeekly: (params) => api.get('/schedules/weekly', { params }),
  saveWeekly: (data) => api.post('/schedules/weekly', data),
  confirmWeekly: (data) => api.post('/schedules/weekly/confirm', data),
  unconfirmWeekly: (data) => api.post('/schedules/weekly/unconfirm', data),
  autoGenerateWeekly: (data) => api.post('/schedules/weekly/auto-generate', data),
};

export default api;
