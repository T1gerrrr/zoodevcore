import { useState, useEffect } from 'react';
import { scheduleAPI } from '../services/api';
import {
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import './MySchedulePage.css';

const DAYS_MAP = [
  { key: 0, label: 'Thứ Hai' },
  { key: 1, label: 'Thứ Ba' },
  { key: 2, label: 'Thứ Tư' },
  { key: 3, label: 'Thứ Năm' },
  { key: 4, label: 'Thứ Sáu' },
  { key: 5, label: 'Thứ Bảy' },
  { key: 6, label: 'Chủ Nhật' },
];

const getISOWeekString = (date = new Date()) => {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

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

  return DAYS_MAP.map((day, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateStr = d.toISOString().split('T')[0];
    const displayDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    return { ...day, dateStr, displayDate };
  });
};

const MySchedulePage = () => {
  const [currentWeekId, setCurrentWeekId] = useState(getISOWeekString());
  const [scheduleData, setScheduleData] = useState({ confirmed: false, shifts: {} });
  const [loading, setLoading] = useState(true);

  const weekDays = getDatesOfWeek(currentWeekId);

  useEffect(() => {
    fetchMySchedule();
  }, [currentWeekId]);

  const fetchMySchedule = async () => {
    setLoading(true);
    try {
      const res = await scheduleAPI.getWeekly({ weekId: currentWeekId });
      setScheduleData(res.data);
    } catch (err) {
      console.error('Fetch my schedule error:', err);
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

  return (
    <div className="page my-schedule-page">
      {/* Header */}
      <div className="page-header flex justify-between items-center flex-wrap gap-md mb-lg">
        <div>
          <h1 className="page-title flex items-center gap-xs">
            <HiOutlineCalendar /> Lịch ca làm việc của tôi
          </h1>
          <p className="page-subtitle">Xem chi tiết ca làm việc tuần được Quản lý xếp</p>
        </div>

        <div className="week-selector-card flex items-center gap-sm">
          <button className="btn btn-ghost btn-sm" onClick={() => handleWeekChange(-1)}>
            <HiOutlineChevronLeft /> Tuần trước
          </button>
          <div className="week-badge">
            Tuần <strong>{currentWeekId}</strong>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => handleWeekChange(1)}>
            Tuần sau <HiOutlineChevronRight />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-page">
          <div className="spinner" />
        </div>
      ) : !scheduleData.confirmed ? (
        /* Unconfirmed Notice Card */
        <div className="card unconfirmed-card text-center p-xl">
          <div className="unconfirmed-icon">
            <HiOutlineExclamationCircle />
          </div>
          <h2>Lịch làm chưa được xác nhận</h2>
          <p className="text-secondary max-w-md mx-auto" style={{ margin: '0.5rem auto 1.5rem' }}>
            Quản lý chưa xác nhận và xuất bản lịch làm việc cho tuần <strong>{currentWeekId}</strong>. Vui lòng quay lại kiểm tra sau.
          </p>
        </div>
      ) : (
        /* Confirmed Weekly Shifts Grid */
        <div className="shifts-grid-container">
          <div className="confirmed-badge-bar mb-md flex items-center gap-xs">
            <HiOutlineCheckCircle color="#22c55e" size={20} />
            <span className="text-sm font-semibold text-success">Lịch làm việc đã được Quản lý xác nhận</span>
          </div>

          <div className="shifts-cards-grid">
            {weekDays.map((day) => {
              const shift = scheduleData.shifts?.[day.dateStr];
              const isOff = !shift || shift.shiftType === 'off';

              return (
                <div
                  key={day.key}
                  className={`shift-day-card card ${isOff ? 'is-off' : 'is-working'}`}
                >
                  <div className="shift-day-header">
                    <span className="shift-day-title">{day.label}</span>
                    <span className="shift-day-date">{day.displayDate}</span>
                  </div>

                  <div className="shift-day-body">
                    {!isOff ? (
                      <>
                        <div className="shift-name" style={{ color: shift.color || '#3b82f6' }}>
                          {shift.label}
                        </div>
                        <div className="shift-time flex items-center gap-xs">
                          <HiOutlineClock />
                          <span>{shift.start} - {shift.end}</span>
                        </div>
                      </>
                    ) : (
                      <div className="shift-off-badge">
                        <span>☕ Ngày nghỉ (OFF)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MySchedulePage;
