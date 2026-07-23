import { useState, useEffect } from 'react';
import { payrollAPI } from '../services/api';
import { useToast } from '../store/ToastContext';
import {
  HiOutlineCurrencyDollar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineSave,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import './WeeklyPayrollPage.css';

const getISOWeekString = (date = new Date()) => {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const WeeklyPayrollPage = () => {
  const toast = useToast();
  const [currentWeekId, setCurrentWeekId] = useState(getISOWeekString());
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [finalizing, setFinalizing] = useState(false);

  // Form states for inline editing
  const [adjustments, setAdjustments] = useState({});

  useEffect(() => {
    fetchPayroll();
  }, [currentWeekId]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.getWeekly({ weekId: currentWeekId });
      const data = res.data;
      setPayrollData(data);

      // Pre-fill local adjustment inputs
      const adjMap = {};
      (data.summary || []).forEach((emp) => {
        adjMap[emp.employeeId] = {
          bonus: emp.bonus || 0,
          deduction: emp.deduction || 0,
          note: emp.note || '',
        };
      });
      setAdjustments(adjMap);
    } catch (err) {
      console.error('Fetch weekly payroll error:', err);
      toast.error('Không thể tải dữ liệu bảng lương tuần');
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (offset) => {
    const [yearStr, weekStrNum] = currentWeekId.split('-W');
    let year = parseInt(yearStr, 10);
    let week = parseInt(weekStrNum, 10) + offset;

    if (week < 1) {
      year -= 1;
      week = 52;
    } else if (week > 52) {
      year += 1;
      week = 1;
    }
    setCurrentWeekId(`${year}-W${String(week).padStart(2, '0')}`);
  };

  const handleInputChange = (employeeId, field, value) => {
    setAdjustments((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
      },
    }));
  };

  const handleSaveEmpAdjustment = async (emp) => {
    setSavingId(emp.employeeId);
    try {
      const adj = adjustments[emp.employeeId] || {};
      await payrollAPI.adjustWeekly({
        weekId: currentWeekId,
        employeeId: emp.employeeId,
        bonus: Number(adj.bonus) || 0,
        deduction: Number(adj.deduction) || 0,
        note: adj.note || '',
      });
      toast.success(`Đã cập nhật lương cho ${emp.name}`);
      await fetchPayroll();
    } catch (err) {
      toast.error('Không thể cập nhật lương');
    } finally {
      setSavingId(null);
    }
  };

  const handleFinalizePayroll = async (statusTarget = 'finalized') => {
    setFinalizing(true);
    try {
      await payrollAPI.adjustWeekly({
        weekId: currentWeekId,
        status: statusTarget,
      });
      toast.success(statusTarget === 'finalized' ? '🎉 Đã chốt bảng lương tuần!' : 'Đã mở lại bảng lương nháp');
      await fetchPayroll();
    } catch (err) {
      toast.error('Không thể thay đổi trạng thái bảng lương');
    } finally {
      setFinalizing(false);
    }
  };

  const isFinalized = payrollData?.status === 'finalized';

  return (
    <div className="page payroll-page">
      {/* Header & Week Selector */}
      <div className="page-header flex justify-between items-center flex-wrap gap-md mb-lg">
        <div>
          <h1 className="page-title flex items-center gap-xs">
            <HiOutlineCurrencyDollar /> Tổng kết & Quản lý lương tuần
          </h1>
          <p className="page-subtitle">Tính toán lương tự động, thưởng thêm, phạt trừ và chốt lương</p>
        </div>

        <div className="week-selector-card flex items-center gap-sm">
          <button className="btn btn-ghost btn-sm" onClick={() => handleWeekChange(-1)}>
            <HiOutlineChevronLeft /> Tuần trước
          </button>
          <div className="week-badge">
            Tuần <strong>{currentWeekId}</strong> ({payrollData?.dateRange?.start || ''} - {payrollData?.dateRange?.end || ''})
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => handleWeekChange(1)}>
            Tuần sau <HiOutlineChevronRight />
          </button>
        </div>
      </div>

      {/* Payroll Status Card */}
      <div className={`card mb-lg status-banner ${isFinalized ? 'confirmed' : 'draft'}`}>
        <div className="card-body flex items-center justify-between flex-wrap gap-md">
          <div className="flex items-center gap-md">
            <div className="status-banner-icon">
              {isFinalized ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
            </div>
            <div>
              <h3 className="status-banner-title">
                {isFinalized ? 'BẢNG LƯƠNG ĐÃ ĐƯỢC CHỐT' : 'BẢNG LƯƠNG DỰ THẢO (NHÁP)'}
              </h3>
              <p className="status-banner-desc">
                {isFinalized
                  ? 'Bảng lương tuần này đã hoàn tất chốt số liệu.'
                  : 'Bạn có thể chỉnh sửa Thưởng (+) hoặc Trừ bớt (-) cho từng nhân viên trước khi chốt.'}
              </p>
            </div>
          </div>

          <div>
            {!isFinalized ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={() => handleFinalizePayroll('finalized')}
                disabled={finalizing}
              >
                {finalizing ? <span className="spinner spinner-sm" /> : '🔒 Chốt bảng lương tuần'}
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => handleFinalizePayroll('draft')}
                disabled={finalizing}
              >
                Mở lại sửa đổi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payroll Summary Table */}
      {loading ? (
        <div className="loading-page">
          <div className="spinner" />
        </div>
      ) : (
        <div className="payroll-table-card card overflow-x-auto">
          <table className="payroll-table">
            <thead>
              <tr>
                <th className="sticky-col">Nhân viên</th>
                <th>Hình thức & Đơn giá</th>
                <th className="text-center">Số giờ / Ngày làm</th>
                <th className="text-center">Nghỉ tuần</th>
                <th className="text-center">Nghỉ tháng</th>
                <th>Lương cơ bản</th>
                <th>Thưởng thêm (+đ)</th>
                <th>Trừ bớt / Phạt (-đ)</th>
                <th>Ghi chú</th>
                <th>Thực nhận</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(payrollData?.summary || []).map((emp) => {
                const adj = adjustments[emp.employeeId] || { bonus: 0, deduction: 0, note: '' };
                const netSalaryLive = Math.max(
                  0,
                  emp.baseSalary + (Number(adj.bonus) || 0) - (Number(adj.deduction) || 0)
                );

                return (
                  <tr key={emp.employeeId}>
                    <td className="sticky-col emp-cell">
                      <div className="emp-name">{emp.name}</div>
                      <div className="emp-code">{emp.employeeCode} • {emp.position}</div>
                    </td>

                    <td>
                      <span className="badge badge-info mb-xs">
                        {emp.salaryType === 'daily' ? 'Theo ngày' : 'Theo giờ'}
                      </span>
                      <div className="text-xs text-secondary">
                        {emp.salaryType === 'daily'
                          ? formatVND(emp.dailyRate) + '/ngày'
                          : formatVND(emp.hourlyRate) + '/giờ'}
                      </div>
                    </td>

                    <td className="text-center">
                      {emp.salaryType === 'daily' ? (
                        <strong>{emp.daysWorkedWeek} ngày</strong>
                      ) : (
                        <strong>{emp.totalHoursWeek}h ({emp.daysWorkedWeek} ngày)</strong>
                      )}
                    </td>

                    {/* Days Off Week */}
                    <td className="text-center">
                      <span className={`badge ${emp.daysOffWeek > 0 ? 'badge-warning' : 'badge-success'}`}>
                        {emp.daysOffWeek} ngày
                      </span>
                    </td>

                    {/* Days Off Month */}
                    <td className="text-center">
                      <span className={`badge ${emp.daysOffMonth > 0 ? 'badge-secondary' : 'badge-success'}`}>
                        {emp.daysOffMonth} ngày
                      </span>
                    </td>

                    <td className="font-semibold">{formatVND(emp.baseSalary)}</td>

                    {/* Bonus input */}
                    <td>
                      <input
                        type="number"
                        className="form-input form-input-sm bonus-input"
                        value={adj.bonus}
                        onChange={(e) => handleInputChange(emp.employeeId, 'bonus', e.target.value)}
                        disabled={isFinalized}
                        placeholder="0"
                        step={10000}
                      />
                    </td>

                    {/* Deduction input */}
                    <td>
                      <input
                        type="number"
                        className="form-input form-input-sm deduction-input"
                        value={adj.deduction}
                        onChange={(e) => handleInputChange(emp.employeeId, 'deduction', e.target.value)}
                        disabled={isFinalized}
                        placeholder="0"
                        step={10000}
                      />
                    </td>

                    {/* Note input */}
                    <td>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        value={adj.note}
                        onChange={(e) => handleInputChange(emp.employeeId, 'note', e.target.value)}
                        disabled={isFinalized}
                        placeholder="Ghi chú..."
                      />
                    </td>

                    {/* Net Salary */}
                    <td className="net-salary-cell">{formatVND(netSalaryLive)}</td>

                    {/* Save action */}
                    <td className="text-center">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleSaveEmpAdjustment(emp)}
                        disabled={isFinalized || savingId === emp.employeeId}
                        title="Lưu thưởng/trừ bớt"
                      >
                        {savingId === emp.employeeId ? (
                          <span className="spinner spinner-sm" />
                        ) : (
                          <HiOutlineSave size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WeeklyPayrollPage;
