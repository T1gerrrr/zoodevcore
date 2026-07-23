import { useState, useEffect } from 'react';
import { employeeAPI, scheduleAPI } from '../services/api';
import { useToast } from '../store/ToastContext';
import {
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineSave,
  HiOutlineSparkles,
} from 'react-icons/hi';
import './WeeklySchedulePage.css';

const SHIFT_PRESETS = [
  { id: 'full', label: 'Cả ngày (08:00-17:00)', start: '08:00', end: '17:00', color: '#3b82f6' },
  { id: 'morning', label: 'Ca Sáng (08:00-12:00)', start: '08:00', end: '12:00', color: '#10b981' },
  { id: 'afternoon', label: 'Ca Chiều (13:00-17:00)', start: '13:00', end: '17:00', color: '#f59e0b' },
  { id: 'evening', label: 'Ca Tối (17:00-21:00)', start: '17:00', end: '21:00', color: '#8b5cf6' },
  { id: 'off', label: 'Nghỉ (OFF)', start: '', end: '', color: '#94a3b8' },
];

const DAYS_OF_WEEK = [
  { key: 0, label: 'Thứ 2' },
  { key: 1, label: 'Thứ 3' },
  { key: 2, label: 'Thứ 4' },
  { key: 3, label: 'Thứ 5' },
  { key: 4, label: 'Thứ 6' },
  { key: 5, label: 'Thứ 7' },
  { key: 6, label: 'Chủ nhật' },
];

// Helper to format ISO week string "YYYY-Www"
const getISOWeekString = (date = new Date()) => {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

// Helper to calculate dates of the week from ISO week string
const getDatesOfWeek = (weekStr) => {
  const [yearStr, weekStrNum] = weekStr.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStrNum, 10);

  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  const monday = new Date(firstMonday);
  monday.setDate(firstMonday.getDate() + (week - 1) * 7);

  return DAYS_OF_WEEK.map((day, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateStr = d.toISOString().split('T')[0];
    const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
    return { ...day, dateStr, displayDate };
  });
};

const WeeklySchedulePage = () => {
  const toast = useToast();
  const [currentWeekId, setCurrentWeekId] = useState(getISOWeekString());
  const [employees, setEmployees] = useState([]);
  const [scheduleData, setScheduleData] = useState({ shifts: {}, status: 'draft' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const weekDays = getDatesOfWeek(currentWeekId);

  useEffect(() => {
    fetchInitialData();
  }, [currentWeekId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [empRes, schedRes] = await Promise.all([
        employeeAPI.getAll(),
        scheduleAPI.getWeekly({ weekId: currentWeekId }),
      ]);

      setEmployees(empRes.data.filter((e) => e.isActive !== false));

      const sched = schedRes.data;
      setScheduleData({
        shifts: sched.shifts || {},
        status: sched.status || 'draft',
        confirmed: sched.confirmed || false,
        confirmedAt: sched.confirmedAt || null,
      });
    } catch (err) {
      console.error('Fetch schedule error:', err);
      toast.error('Không thể tải lịch làm việc');
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

  const setCellShift = (employeeId, dateStr, preset) => {
    setScheduleData((prev) => {
      const currentShifts = { ...prev.shifts };
      if (!currentShifts[employeeId]) {
        currentShifts[employeeId] = {};
      }

      currentShifts[employeeId][dateStr] = {
        shiftType: preset.id,
        label: preset.label,
        start: preset.start,
        end: preset.end,
        color: preset.color,
      };

      return { ...prev, shifts: currentShifts };
    });
  };

  const handleApplyFullWeek = (employeeId, preset) => {
    weekDays.forEach((day) => {
      setCellShift(employeeId, day.dateStr, preset);
    });
    toast.success(`Đã áp dụng ca cho cả tuần`);
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await scheduleAPI.saveWeekly({
        weekId: currentWeekId,
        shifts: scheduleData.shifts,
      });
      toast.success('Đã lưu nháp lịch làm việc!');
      await fetchInitialData();
    } catch (err) {
      toast.error('Không thể lưu lịch làm việc');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSchedule = async () => {
    setConfirming(true);
    try {
      // Save shifts first
      await scheduleAPI.saveWeekly({
        weekId: currentWeekId,
        shifts: scheduleData.shifts,
      });

      // Confirm
      await scheduleAPI.confirmWeekly({ weekId: currentWeekId });
      toast.success('🎉 Đã xác nhận & xuất bản lịch ca làm cho Nhân viên!');
      await fetchInitialData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Không thể xác nhận lịch làm việc');
    } finally {
      setConfirming(false);
    }
  };

  const handleUnconfirmSchedule = async () => {
    try {
      await scheduleAPI.unconfirmWeekly({ weekId: currentWeekId });
      toast.success('Đã chuyển lịch làm việc về dạng Nháp');
      await fetchInitialData();
    } catch (err) {
      toast.error('Không thể hủy xác nhận');
    }
  };

  const isConfirmed = scheduleData.status === 'confirmed';

  return (
    <div className="page schedule-page">
      {/* Header & Week Selector */}
      <div className="page-header flex justify-between items-center flex-wrap gap-md mb-lg">
        <div>
          <h1 className="page-title flex items-center gap-xs">
            <HiOutlineCalendar /> Xếp lịch làm việc theo tuần
          </h1>
          <p className="page-subtitle">Phân ca làm việc và xác nhận công bố cho nhân viên</p>
        </div>

        <div className="week-selector-card flex items-center gap-sm">
          <button className="btn btn-ghost btn-sm" onClick={() => handleWeekChange(-1)}>
            <HiOutlineChevronLeft /> Tuần trước
          </button>
          <div className="week-badge">
            Tuần <strong>{currentWeekId}</strong> ({weekDays[0].displayDate} - {weekDays[6].displayDate})
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => handleWeekChange(1)}>
            Tuần sau <HiOutlineChevronRight />
          </button>
        </div>
      </div>

      {/* Confirmation Status Banner */}
      <div className={`status-banner card mb-lg ${isConfirmed ? 'confirmed' : 'draft'}`}>
        <div className="card-body flex items-center justify-between flex-wrap gap-md">
          <div className="flex items-center gap-md">
            <div className="status-banner-icon">
              {isConfirmed ? <HiOutlineCheckCircle /> : <HiOutlineExclamationCircle />}
            </div>
            <div>
              <h3 className="status-banner-title">
                {isConfirmed ? 'Lịch làm việc ĐÃ ĐƯỢC XÁC NHẬN & XUẤT BẢN' : 'Lịch làm việc đang ở trạng thái NHÁP'}
              </h3>
              <p className="status-banner-desc">
                {isConfirmed
                  ? `Lịch đã được hiển thị trên giao diện của Nhân viên (Xác nhận lúc: ${new Date(scheduleData.confirmedAt).toLocaleString('vi-VN')})`
                  : 'Nhân viên chưa thể xem lịch làm việc này. Bấm nút "Xác nhận & Công bố" bên dưới để hoàn tất.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-sm">
            {!isConfirmed ? (
              <button
                className="btn btn-primary btn-lg flex items-center gap-xs"
                onClick={handleConfirmSchedule}
                disabled={confirming || saving}
              >
                {confirming ? <span className="spinner spinner-sm" /> : <><HiOutlineSparkles /> Xác nhận & Công bố lịch làm</>}
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={handleUnconfirmSchedule}>
                Chỉnh sửa / Hủy xác nhận
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleSaveSchedule} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : <><HiOutlineSave /> Lưu nháp</>}
            </button>
          </div>
        </div>
      </div>

      {/* Shift Presets Quick Bar */}
      <div className="presets-bar card mb-lg">
        <div className="card-body flex items-center gap-md flex-wrap">
          <span className="text-sm font-semibold text-secondary">Chọn ca mẫu nhanh:</span>
          {SHIFT_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="preset-chip"
              style={{ borderLeftColor: preset.color }}
            >
              <span className="preset-color-dot" style={{ backgroundColor: preset.color }} />
              <span>{preset.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Matrix Table */}
      {loading ? (
        <div className="loading-page">
          <div className="spinner" />
        </div>
      ) : (
        <div className="schedule-matrix-card card overflow-x-auto">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="sticky-col">Nhân viên</th>
                {weekDays.map((day) => (
                  <th key={day.key} className="text-center">
                    <div>{day.label}</div>
                    <div className="text-xs text-secondary font-normal">{day.displayDate}</div>
                  </th>
                ))}
                <th className="text-center">Thao tác nhanh</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="sticky-col emp-cell">
                    <div className="emp-name">{emp.name}</div>
                    <div className="emp-code">{emp.employeeCode} • {emp.position || 'NV'}</div>
                  </td>

                  {weekDays.map((day) => {
                    const shift = scheduleData.shifts[emp.id]?.[day.dateStr];
                    return (
                      <td key={day.key} className="shift-cell">
                        <select
                          className="shift-select"
                          style={{
                            borderColor: shift?.color || '#cbd5e1',
                            backgroundColor: shift?.shiftType === 'off' ? 'rgba(148, 163, 184, 0.1)' : 'transparent',
                          }}
                          value={shift?.shiftType || 'off'}
                          onChange={(e) => {
                            const found = SHIFT_PRESETS.find((p) => p.id === e.target.value);
                            if (found) setCellShift(emp.id, day.dateStr, found);
                          }}
                        >
                          {SHIFT_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}

                  <td className="text-center action-cell">
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Gán Cả Ngày cho cả tuần"
                      onClick={() => handleApplyFullWeek(emp.id, SHIFT_PRESETS[0])}
                    >
                      Cả tuần
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-secondary"
                      title="Nghỉ cả tuần"
                      onClick={() => handleApplyFullWeek(emp.id, SHIFT_PRESETS[4])}
                    >
                      Nghỉ hết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WeeklySchedulePage;
