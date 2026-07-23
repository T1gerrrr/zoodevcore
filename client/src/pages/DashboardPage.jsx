import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI } from '../services/api';
import { useToast } from '../store/ToastContext';
import {
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
} from 'react-icons/hi';
import './DashboardPage.css';

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSummary();
  }, [period]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await attendanceAPI.getSummary({ period });
      setSummary(res.data);
    } catch (err) {
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
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

  if (loading && !summary) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <span className="text-secondary">Đang tải...</span>
      </div>
    );
  }

  const todayStats = summary?.today || {};

  return (
    <div className="page">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Tổng quan chấm công hôm nay</p>
        </div>
        <div className="period-selector">
          {['today', 'week', 'month'].map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Hôm nay' : p === 'week' ? 'Tuần' : 'Tháng'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-stats mb-lg">
        <div className="stat-card stat-primary">
          <div className="stat-card-icon"><HiOutlineUserGroup /></div>
          <div className="stat-value">{todayStats.totalEmployees || 0}</div>
          <div className="stat-label">Tổng nhân viên</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-card-icon"><HiOutlineCheckCircle /></div>
          <div className="stat-value">{todayStats.checkedIn || 0}</div>
          <div className="stat-label">Đã chấm công</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-card-icon"><HiOutlineClock /></div>
          <div className="stat-value">{todayStats.late || 0}</div>
          <div className="stat-label">Đi trễ</div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-card-icon"><HiOutlineXCircle /></div>
          <div className="stat-value">{todayStats.absent || 0}</div>
          <div className="stat-label">Vắng mặt</div>
        </div>
      </div>

      {/* Today's Attendance List */}
      <div className="card mb-lg">
        <div className="card-header">
          <h3>Chấm công hôm nay</h3>
        </div>
        <div className="table-container">
          {summary?.todayRecords?.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Tên</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {summary.todayRecords.map((record, i) => (
                  <tr key={i}>
                    <td><span className="font-medium">{record.employeeCode}</span></td>
                    <td>{record.employeeName}</td>
                    <td>{formatTime(record.checkInTime)}</td>
                    <td>{formatTime(record.checkOutTime)}</td>
                    <td>
                      {record.status === 'late' ? (
                        <span className="badge badge-warning">Trễ</span>
                      ) : (
                        <span className="badge badge-success">Đúng giờ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>Chưa có nhân viên nào chấm công hôm nay</p>
            </div>
          )}
        </div>
      </div>

      {/* Employee Summary */}
      {period !== 'today' && summary?.employeeSummary?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Tổng hợp {period === 'week' ? 'tuần' : 'tháng'}</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Tên</th>
                  <th>Đã làm</th>
                  <th>Mục tiêu</th>
                  <th>Đi trễ</th>
                  <th>Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                {summary.employeeSummary.map((emp) => {
                  const progress = emp.target ? Math.round((emp.daysWorked / emp.target) * 100) : 0;
                  return (
                    <tr key={emp.employeeId}>
                      <td><span className="font-medium">{emp.employeeCode}</span></td>
                      <td>{emp.name}</td>
                      <td>{emp.daysWorked}</td>
                      <td>{emp.target || '-'}</td>
                      <td>{emp.lateDays > 0 ? <span className="text-warning">{emp.lateDays}</span> : 0}</td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-secondary">{progress}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
