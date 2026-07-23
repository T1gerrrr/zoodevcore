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

  // Auto-Scheduling Modal state
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoConfig, setAutoConfig] = useState({
    workDays: 5,
    offDays: 2,
    shiftMode: 'quota', // 'quota', 'rotating', 'full'
  });

  const [shiftQuotas, setShiftQuotas] = useState({
    fullCount: 2,
    morningCount: 2,
    afternoonCount: 1,
    eveningCount: 0,
  });

  const [customHours, setCustomHours] = useState({
    full: { start: '09:00', end: '16:00' },
    morning: { start: '08:00', end: '12:00' },
    afternoon: { start: '13:00', end: '17:00' },
    evening: { start: '17:00', end: '21:00' },
  });

  const weekDays = getDatesOfWeek(currentWeekId);

  useEffect(() => {
    fetchInitialData();
  }, [currentWeekId]);

  const handleAutoGenerate = async () => {
    setAutoGenerating(true);
    try {
      const res = await scheduleAPI.autoGenerateWeekly({
        weekId: currentWeekId,
        workDaysPerWeek: autoConfig.workDays,
        offDaysPerWeek: autoConfig.offDays,
        shiftMode: autoConfig.shiftMode,
        shiftQuotas,
        customHours,
      });

      toast.success(res.data.message || 'Đã tạo lịch tự động thành công!');
      setShowAutoModal(false);
      await fetchInitialData();
    } catch (err) {
      console.error('Auto generate error:', err);
      toast.error(err.response?.data?.error || 'Không thể tạo lịch tự động');
    } finally {
      setAutoGenerating(false);
    }
  };

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

          <div className="flex items-center gap-sm flex-wrap">
            {!isConfirmed && (
              <button
                className="btn btn-secondary flex items-center gap-xs"
                style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                onClick={() => setShowAutoModal(true)}
              >
                🤖 Xếp lịch tự động thông minh
              </button>
            )}
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

      {/* Auto Schedule Settings Modal */}
      {showAutoModal && (
        <div className="modal-backdrop">
          <div className="modal-card card p-md modal-scrollable" style={{ maxWidth: 580, width: '92%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', borderRadius: 16 }}>
            <div className="flex justify-between items-center mb-md border-b pb-sm">
              <h3 className="font-bold text-base text-primary flex items-center gap-xs" style={{ margin: 0 }}>
                🤖 Thiết lập xếp ca tự động thông minh
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAutoModal(false)}>✕</button>
            </div>

            <div className="modal-body flex flex-col gap-md mb-lg">
              {/* Section 1: Shift breakdown quota */}
              <div className="p-sm rounded" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <h4 className="font-bold text-sm mb-xs text-slate-800 flex items-center gap-xs">
                  📊 1. Phân bổ số lượng ca làm / tuần cho 1 nhân viên:
                </h4>
                <div className="grid grid-cols-2 gap-sm mt-xs">
                  <div>
                    <label className="text-xs font-semibold block text-slate-700 mb-1">🟦 Số ca Dài / Cả ngày:</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      className="input-field text-sm w-full"
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                      value={shiftQuotas.fullCount}
                      onChange={(e) => setShiftQuotas((p) => ({ ...p, fullCount: Math.max(0, parseInt(e.target.value || 0, 10)) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block text-slate-700 mb-1">🟩 Số ca Sáng:</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      className="input-field text-sm w-full"
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                      value={shiftQuotas.morningCount}
                      onChange={(e) => setShiftQuotas((p) => ({ ...p, morningCount: Math.max(0, parseInt(e.target.value || 0, 10)) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block text-slate-700 mb-1">🟨 Số ca Chiều:</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      className="input-field text-sm w-full"
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                      value={shiftQuotas.afternoonCount}
                      onChange={(e) => setShiftQuotas((p) => ({ ...p, afternoonCount: Math.max(0, parseInt(e.target.value || 0, 10)) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block text-slate-700 mb-1">🟪 Số ca Tối:</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      className="input-field text-sm w-full"
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                      value={shiftQuotas.eveningCount}
                      onChange={(e) => setShiftQuotas((p) => ({ ...p, eveningCount: Math.max(0, parseInt(e.target.value || 0, 10)) }))}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-sm pt-xs border-t text-xs font-bold">
                  <span className="text-primary">
                    👉 Tổng ca làm: {shiftQuotas.fullCount + shiftQuotas.morningCount + shiftQuotas.afternoonCount + shiftQuotas.eveningCount} ca/tuần
                  </span>
                  <span className="text-amber-700">
                    🗓️ Tự động nghỉ (OFF): {Math.max(0, 7 - (shiftQuotas.fullCount + shiftQuotas.morningCount + shiftQuotas.afternoonCount + shiftQuotas.eveningCount))} ngày/tuần
                  </span>
                </div>
              </div>

              {/* Section 2: Custom Shift Hours */}
              <div className="p-sm rounded" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <h4 className="font-bold text-sm mb-xs text-slate-800 flex items-center gap-xs">
                  ⏰ 2. Cài đặt khung giờ cho từng ca (Ví dụ: 09:00 - 16:00):
                </h4>
                <div className="flex flex-col gap-xs text-xs">
                  {/* Full shift custom hours */}
                  <div className="flex items-center justify-between gap-xs">
                    <span className="font-semibold text-slate-700 w-24">Ca Dài / Full:</span>
                    <div className="flex items-center gap-xs">
                      <input
                        type="time"
                        className="input-field text-xs"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        value={customHours.full.start}
                        onChange={(e) => setCustomHours((p) => ({ ...p, full: { ...p.full, start: e.target.value } }))}
                      />
                      <span>→</span>
                      <input
                        type="time"
                        className="input-field text-xs"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        value={customHours.full.end}
                        onChange={(e) => setCustomHours((p) => ({ ...p, full: { ...p.full, end: e.target.value } }))}
                      />
                    </div>
                  </div>

                  {/* Morning shift custom hours */}
                  <div className="flex items-center justify-between gap-xs">
                    <span className="font-semibold text-slate-700 w-24">Ca Sáng:</span>
                    <div className="flex items-center gap-xs">
                      <input
                        type="time"
                        className="input-field text-xs"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        value={customHours.morning.start}
                        onChange={(e) => setCustomHours((p) => ({ ...p, morning: { ...p.morning, start: e.target.value } }))}
                      />
                      <span>→</span>
                      <input
                        type="time"
                        className="input-field text-xs"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        value={customHours.morning.end}
                        onChange={(e) => setCustomHours((p) => ({ ...p, morning: { ...p.morning, end: e.target.value } }))}
                      />
                    </div>
                  </div>

                  {/* Afternoon shift custom hours */}
                  <div className="flex items-center justify-between gap-xs">
                    <span className="font-semibold text-slate-700 w-24">Ca Chiều:</span>
                    <div className="flex items-center gap-xs">
                      <input
                        type="time"
                        className="input-field text-xs"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        value={customHours.afternoon.start}
                        onChange={(e) => setCustomHours((p) => ({ ...p, afternoon: { ...p.afternoon, start: e.target.value } }))}
                      />
                      <span>→</span>
                      <input
                        type="time"
                        className="input-field text-xs"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        value={customHours.afternoon.end}
                        onChange={(e) => setCustomHours((p) => ({ ...p, afternoon: { ...p.afternoon, end: e.target.value } }))}
                      />
                    </div>
                  </div>

                  {/* Evening shift custom hours */}
                  <div className="flex items-center justify-between gap-xs">
                    <span className="font-semibold text-slate-700 w-24">Ca Tối:</span>
                    <div className="flex items-center gap-xs">
                      <input
                        type="time"
                        className="input-field text-xs"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        value={customHours.evening.start}
                        onChange={(e) => setCustomHours((p) => ({ ...p, evening: { ...p.evening, start: e.target.value } }))}
                      />
                      <span>→</span>
                      <input
                        type="time"
                        className="input-field text-xs"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        value={customHours.evening.end}
                        onChange={(e) => setCustomHours((p) => ({ ...p, evening: { ...p.evening, end: e.target.value } }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-sm text-xs" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 8 }}>
                💡 <strong>Cơ chế tự động:</strong> Thuật toán sẽ dải đều đúng số lượng ca dài/sáng/chiều/tối và ngày nghỉ lệch nhau giữa {employees.length} nhân viên để đảm bảo công bằng 100% và cửa hàng luôn đủ nhân sự.
              </div>
            </div>

            <div className="modal-footer flex justify-end gap-sm border-t pt-md">
              <button className="btn btn-secondary" onClick={() => setShowAutoModal(false)}>
                Hủy
              </button>
              <button
                className="btn btn-primary flex items-center gap-xs"
                onClick={handleAutoGenerate}
                disabled={autoGenerating}
              >
                {autoGenerating ? <span className="spinner spinner-sm" /> : <>✨ Chạy xếp lịch tự động</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySchedulePage;
