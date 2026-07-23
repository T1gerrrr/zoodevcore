import { useState, useEffect } from 'react';
import { attendanceAPI, employeeAPI, payrollAPI } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { HiOutlineFilter, HiOutlineCalendar, HiOutlineCurrencyDollar, HiOutlineClock } from 'react-icons/hi';

const AttendanceHistoryPage = () => {
  const { currentUser, isStaff } = useAuth();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [myPayroll, setMyPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (isStaff) {
      fetchEmployees();
    } else {
      fetchMyPayroll();
    }
    fetchHistory();
  }, []);

  const fetchMyPayroll = async () => {
    try {
      const res = await payrollAPI.getMyPayroll();
      setMyPayroll(res.data);
    } catch (err) {
      console.error('Fetch my payroll error:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data.filter((e) => e.isActive !== false));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async (customFilters) => {
    try {
      setLoading(true);
      const params = customFilters || filters;

      // Employee can only see their own history
      if (!isStaff) {
        params.employeeId = currentUser.uid;
      }

      const res = await attendanceAPI.getHistory(params);
      setRecords(res.data);
    } catch (err) {
      toast.error('Không thể tải lịch sử chấm công');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchHistory(filters);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  const [expandedRecord, setExpandedRecord] = useState(null);

  return (
    <div className="page history-page" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + max(32px, env(safe-area-inset-bottom, 32px)))' }}>
      <div className="page-header">
        <h1 className="page-title">Lịch sử chấm công</h1>
        <p className="page-subtitle">Xem lịch sử check-in / check-out và tổng hợp ngày nghỉ</p>
      </div>

      {/* Employee Payroll & Days Off Summary */}
      {!isStaff && myPayroll && (
        <div className="card mb-lg" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.02))', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div className="card-header flex justify-between items-center">
            <h3 className="flex items-center gap-xs text-primary" style={{ margin: 0 }}>
              <HiOutlineCurrencyDollar /> Thống kê Lương & Ngày nghỉ tuần này ({myPayroll.weekId})
            </h3>
            <span className={`badge ${myPayroll.status === 'finalized' ? 'badge-success' : 'badge-warning'}`}>
              {myPayroll.status === 'finalized' ? '🔒 Đã chốt lương' : '⏳ Bảng lương dự thảo'}
            </span>
          </div>
          <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-md">
            <div className="p-sm bg-surface rounded">
              <div className="text-xs text-secondary mb-xs">Số giờ làm tuần</div>
              <div className="text-xl font-bold">{myPayroll.details.totalHoursWeek}h ({myPayroll.details.daysWorkedWeek} ngày)</div>
            </div>
            <div className="p-sm bg-surface rounded">
              <div className="text-xs text-secondary mb-xs">Số ngày nghỉ tuần</div>
              <div className="text-xl font-bold text-warning">{myPayroll.details.daysOffWeek} ngày</div>
            </div>
            <div className="p-sm bg-surface rounded">
              <div className="text-xs text-secondary mb-xs">Số ngày nghỉ tháng</div>
              <div className="text-xl font-bold text-info">{myPayroll.details.daysOffMonth} ngày</div>
            </div>
            <div className="p-sm bg-surface rounded">
              <div className="text-xs text-secondary mb-xs">Thực nhận ước tính</div>
              <div className="text-xl font-bold text-success">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(myPayroll.details.netSalary)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <form className="card mb-lg" onSubmit={handleFilter}>
        <div className="card-body">
          <div className="flex gap-md flex-wrap items-center">
            {isStaff && (
              <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
                <select
                  className="form-input"
                  value={filters.employeeId}
                  onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                >
                  <option value="">Tất cả nhân viên</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} - {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="date"
                className="form-input"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <span className="text-secondary">đến</span>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="date"
                className="form-input"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <HiOutlineFilter /> Lọc
            </button>
          </div>
        </div>
      </form>

      {/* Records */}
      {loading ? (
        <div className="loading-page" style={{ minHeight: '30vh' }}>
          <div className="spinner" />
        </div>
      ) : records.length > 0 ? (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  {isStaff && <th>Nhân viên</th>}
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Số giờ</th>
                  <th>Trạng thái</th>
                  <th className="hide-mobile">Ảnh</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="font-medium">{formatDate(record.date)}</div>
                    </td>
                    {isStaff && (
                      <td>
                        <div className="font-medium">{record.employeeName}</div>
                        <div className="text-xs text-secondary">{record.employeeCode}</div>
                      </td>
                    )}
                    <td>{formatTime(record.checkIn?.time)}</td>
                    <td>{formatTime(record.checkOut?.time)}</td>
                    <td>{record.workHours > 0 ? `${record.workHours}h` : '-'}</td>
                    <td>
                      {record.status === 'late' ? (
                        <span className="badge badge-warning">Trễ</span>
                      ) : record.status === 'present' ? (
                        <span className="badge badge-success">Đúng giờ</span>
                      ) : (
                        <span className="badge badge-danger">Vắng</span>
                      )}
                    </td>
                    <td className="hide-mobile">
                      {record.checkIn?.photo && (
                        <div className="flex gap-sm">
                          <img
                            src={record.checkIn.photo}
                            alt="In"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover',
                            }}
                          />
                          {record.checkOut?.photo && (
                            <img
                              src={record.checkOut.photo}
                              alt="Out"
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 'var(--radius-sm)',
                                objectFit: 'cover',
                              }}
                            />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><HiOutlineCalendar /></div>
            <p>Không có dữ liệu chấm công</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistoryPage;
