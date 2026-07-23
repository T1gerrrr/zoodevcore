/**
 * Date helper utilities for Vietnam timezone (UTC+7)
 */

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';

/**
 * Get current date/time in Vietnam timezone
 * @returns {Date}
 */
const getVietnamNow = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: VIETNAM_TZ }));
};

/**
 * Format date to YYYY-MM-DD string in Vietnam timezone
 * @param {Date} date
 * @returns {string}
 */
const formatDateString = (date) => {
  const d = new Date(date.toLocaleString('en-US', { timeZone: VIETNAM_TZ }));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date string in Vietnam timezone
 * @returns {string} YYYY-MM-DD
 */
const getTodayString = () => {
  return formatDateString(new Date());
};

/**
 * Get current month string
 * @returns {string} YYYY-MM
 */
const getCurrentMonth = () => {
  const now = getVietnamNow();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Check if check-in time is late compared to shift start
 * @param {string} shiftStart - HH:mm format
 * @returns {boolean}
 */
const isLateCheckIn = (shiftStart) => {
  const now = getVietnamNow();
  const [hours, minutes] = shiftStart.split(':').map(Number);
  const shiftStartTime = new Date(now);
  shiftStartTime.setHours(hours, minutes, 0, 0);
  return now > shiftStartTime;
};

/**
 * Get start and end dates of current week (Monday to Sunday)
 * @returns {{ start: string, end: string }}
 */
const getCurrentWeekRange = () => {
  const now = getVietnamNow();
  const dayOfWeek = now.getDay() || 7; // Sunday = 7
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: formatDateString(monday),
    end: formatDateString(sunday),
  };
};

/**
 * Get start and end dates of current month
 * @returns {{ start: string, end: string }}
 */
const getCurrentMonthRange = () => {
  const now = getVietnamNow();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDateString(firstDay),
    end: formatDateString(lastDay),
  };
};

module.exports = {
  VIETNAM_TZ,
  getVietnamNow,
  formatDateString,
  getTodayString,
  getCurrentMonth,
  isLateCheckIn,
  getCurrentWeekRange,
  getCurrentMonthRange,
};
