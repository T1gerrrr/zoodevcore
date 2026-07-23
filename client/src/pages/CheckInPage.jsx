import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import useGeolocation from '../hooks/useGeolocation';
import useCamera from '../hooks/useCamera';
import { employeeAPI, attendanceAPI } from '../services/api';
import { compareFacesClient } from '../utils/faceMatcherClient';
import {
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineCamera,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import './CheckInPage.css';

const CheckInPage = () => {
  const { currentUser, refreshUser } = useAuth();
  const toast = useToast();
  const geo = useGeolocation();
  const camera = useCamera();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [empDetails, setEmpDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [checkType, setCheckType] = useState(null); // 'in' or 'out'
  const [faceMatchResult, setFaceMatchResult] = useState(null);
  const [liveMatchResult, setLiveMatchResult] = useState(null);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Refresh user data & fetch today's attendance & employee details
  useEffect(() => {
    if (typeof refreshUser === 'function') {
      refreshUser();
    }
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchTodayAttendance();
      fetchEmployeeDetails();
    }
  }, [currentUser?.uid]);

  // Real-time live video frame face match comparison loop
  useEffect(() => {
    let intervalId = null;
    const faceUrl = empDetails?.facePhotoUrl || currentUser?.facePhotoUrl;

    if (showCamera && !camera.photo && faceUrl) {
      intervalId = setInterval(async () => {
        const video = camera.videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;

        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 320;
          offCanvas.height = 240;
          const ctx = offCanvas.getContext('2d');
          ctx.drawImage(video, 0, 0, 320, 240);
          const liveFrameUrl = offCanvas.toDataURL('image/jpeg', 0.5);

          const match = await compareFacesClient(liveFrameUrl, faceUrl, 45);
          setLiveMatchResult(match);
        } catch (e) {
          // ignore sampling error
        }
      }, 400);
    } else {
      setLiveMatchResult(null);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showCamera, camera.photo, empDetails, currentUser, camera.videoRef]);

  const fetchEmployeeDetails = async () => {
    try {
      const res = await employeeAPI.getById(currentUser.uid);
      setEmpDetails(res.data);
    } catch (err) {
      console.error('Fetch employee details error:', err);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const res = await attendanceAPI.getToday(currentUser.uid);
      setTodayAttendance(res.data);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open camera for check-in/out
  const handleStartCheck = useCallback(async (type) => {
    if (geo.error || !geo.latitude) {
      toast.error(geo.error || 'Đang lấy vị trí... Vui lòng đợi.');
      geo.refresh();
      return;
    }
    setCheckType(type);
    setFaceMatchResult(null);
    setShowCamera(true);
    await camera.openCamera();
  }, [geo, camera, toast]);

  // Capture and compute face match score bar
  const handleCapture = useCallback(async () => {
    const now = new Date();
    const timeStr = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const overlay = `${timeStr}\nLat: ${geo.latitude?.toFixed(6)}, Lng: ${geo.longitude?.toFixed(6)}`;
    const capturedDataUrl = camera.capturePhoto(overlay);

    const faceUrl = empDetails?.facePhotoUrl || currentUser?.facePhotoUrl;

    // Calculate face match score against profile face photo
    if (faceUrl && capturedDataUrl) {
      const match = await compareFacesClient(capturedDataUrl, faceUrl, 45);
      setFaceMatchResult(match);
    }
  }, [camera, geo, currentUser, empDetails]);

  // Submit check-in/out
  const handleSubmit = async () => {
    if (!camera.photo) return;

    setSubmitting(true);
    try {
      const payload = {
        employeeId: currentUser.uid,
        photo: camera.photo,
        latitude: geo.latitude,
        longitude: geo.longitude,
        address: '', // Could use reverse geocoding
      };

      if (checkType === 'in') {
        const res = await attendanceAPI.checkIn(payload);
        toast.success(res.data.message || 'Check-in thành công!');
      } else {
        const res = await attendanceAPI.checkOut(payload);
        toast.success(res.data.message || 'Check-out thành công!');
      }

      // Refresh data
      await fetchTodayAttendance();
      camera.clearPhoto();
      setShowCamera(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Thao tác thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel camera
  const handleCancelCamera = () => {
    camera.clearPhoto();
    setShowCamera(false);
    setCheckType(null);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  const formatRecordTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  const hasCheckedIn = todayAttendance?.checkIn;
  const hasCheckedOut = todayAttendance?.checkOut;

  // Camera overlay view
  if (showCamera) {
    return (
      <div className="camera-view">
        <div className="camera-header">
          <button className="btn btn-ghost" onClick={handleCancelCamera}>✕ Hủy</button>
          <span className="camera-title">
            {checkType === 'in' ? 'Check-in' : 'Check-out'}
          </span>
          <div style={{ width: 60 }} />
        </div>

        <div className="camera-body">
          {!camera.photo ? (
            <>
              <div className="camera-preview">
                <video
                  ref={camera.videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />

                {/* Live Real-Time Face Match Progress Bar */}
                {liveMatchResult && (
                  <div className="face-match-overlay-bar">
                    <div className="face-match-header flex justify-between items-center mb-xs">
                      <span className="flex items-center gap-xs font-semibold text-xs text-white">
                        <HiOutlineShieldCheck size={16} /> Quét Face ID trực tiếp
                      </span>
                      <span className={`font-bold text-sm ${liveMatchResult.isMatch ? 'text-success' : 'text-warning'}`}>
                        {liveMatchResult.score}%
                      </span>
                    </div>

                    <div className="face-match-progress-track">
                      <div
                        className={`face-match-progress-fill ${liveMatchResult.isMatch ? 'match-ok' : 'match-fail'}`}
                        style={{ width: `${liveMatchResult.score}%` }}
                      />
                    </div>

                    <div className="text-xs font-medium text-center mt-xs">
                      {liveMatchResult.isMatch ? (
                        <span style={{ color: '#4ade80' }}>✅ Khuôn mặt trùng khớp (Khớp {liveMatchResult.score}%) - Bấm Chụp ngay!</span>
                      ) : (
                        <span style={{ color: '#fbbf24' }}>⚠️ Đang canh chỉnh ({liveMatchResult.score}%) - Nhìn thẳng vào oval</span>
                      )}
                    </div>
                  </div>
                )}

                <div className={`face-oval-guide ${liveMatchResult?.isMatch ? 'oval-valid' : ''}`}>
                  <div className={`face-oval-ring ${liveMatchResult?.isMatch ? 'ring-valid' : ''}`} />
                  <p className="face-guide-text">
                    {liveMatchResult?.isMatch ? '✅ Khuôn mặt hợp lệ - Nhấn nút Chụp' : 'Canh khuôn mặt Face ID vào khung oval'}
                  </p>
                </div>

                <div className="camera-overlay-info">
                  <span>{formatTime(currentTime)}</span>
                  <span>📍 {geo.latitude?.toFixed(4)}, {geo.longitude?.toFixed(4)}</span>
                </div>
              </div>
              <canvas ref={camera.canvasRef} style={{ display: 'none' }} />
              <button className="camera-capture-btn" onClick={handleCapture}>
                <HiOutlineCamera />
              </button>
            </>
          ) : (
            <>
              <div className="camera-preview">
                <img src={camera.photo} alt="Preview" className="camera-photo-preview" />

                {/* Face Match Live Bar */}
                {faceMatchResult && (
                  <div className="face-match-overlay-bar">
                    <div className="face-match-header flex justify-between items-center mb-xs">
                      <span className="flex items-center gap-xs font-semibold text-xs text-white">
                        <HiOutlineShieldCheck size={16} /> Độ trùng khớp Face ID
                      </span>
                      <span className={`font-bold text-sm ${faceMatchResult.isMatch ? 'text-success' : 'text-danger'}`}>
                        {faceMatchResult.score}%
                      </span>
                    </div>

                    <div className="face-match-progress-track">
                      <div
                        className={`face-match-progress-fill ${faceMatchResult.isMatch ? 'match-ok' : 'match-fail'}`}
                        style={{ width: `${faceMatchResult.score}%` }}
                      />
                    </div>

                    <div className="text-xs font-medium text-center mt-xs">
                      {faceMatchResult.isMatch ? (
                        <span style={{ color: '#4ade80' }}>✅ Khuôn mặt trùng khớp hợp lệ</span>
                      ) : (
                        <span style={{ color: '#f87171' }}>⚠️ Chưa đạt (Cần ≥65%). Bấm "Chụp lại" để điều chỉnh</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="camera-actions">
                <button
                  className="btn btn-secondary btn-lg"
                  onClick={camera.retakePhoto}
                  disabled={submitting}
                >
                  <HiOutlineRefresh /> Chụp lại
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="spinner spinner-sm" />
                  ) : (
                    <><HiOutlineCheck /> Xác nhận</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {camera.error && (
          <div className="camera-error">
            <HiOutlineExclamation /> {camera.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page checkin-page">
      <div className="checkin-container">
        {/* UI Version Switcher */}
        <div className="v2-switcher-bar" style={{ display: 'flex', background: '#e2e8f0', borderRadius: 30, padding: 4, marginBottom: 12 }}>
          <NavLink to="/checkin" className="v2-switcher-item active" style={{ flex: 1, textAlign: 'center', padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 600, borderRadius: 26, background: '#ffffff', color: '#1565c0', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            Giao diện V1
          </NavLink>
          <NavLink to="/checkin-v2" className="v2-switcher-item" style={{ flex: 1, textAlign: 'center', padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 600, borderRadius: 26, color: '#64748b', textDecoration: 'none' }}>
            Giao diện V2 (Mới ✨)
          </NavLink>
        </div>
        {/* Time Display */}
        <div className="checkin-time-block">
          <div className="checkin-date">{formatDate(currentTime)}</div>
          <div className="checkin-time">{formatTime(currentTime)}</div>
        </div>

        {/* Location */}
        <div className="checkin-location">
          <HiOutlineLocationMarker />
          {geo.loading ? (
            <span>Đang xác định vị trí...</span>
          ) : geo.error ? (
            <span className="checkin-location-error">
              {geo.error}
              <button className="btn btn-ghost btn-sm" onClick={geo.refresh}>
                <HiOutlineRefresh /> Thử lại
              </button>
            </span>
          ) : (
            <span>
              {geo.latitude?.toFixed(6)}, {geo.longitude?.toFixed(6)}
              {geo.accuracy && <span className="text-xs text-light"> (±{Math.round(geo.accuracy)}m)</span>}
            </span>
          )}
        </div>

        {/* GPS Permission Warning */}
        {geo.permissionDenied && (
          <div className="checkin-warning">
            <HiOutlineExclamation />
            <div>
              <strong>Cần bật định vị GPS</strong>
              <p>Vào Cài đặt trình duyệt → Cho phép truy cập vị trí để chấm công</p>
            </div>
          </div>
        )}

        {/* Face ID Profile Status */}
        <div className="card p-sm flex items-center justify-between" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <div className="flex items-center gap-xs text-xs font-semibold">
            <HiOutlineShieldCheck size={18} color="#1565c0" />
            <span>Trạng thái Face ID:</span>
          </div>
          {(empDetails?.facePhotoUrl || currentUser?.facePhotoUrl) ? (
            <span className="badge badge-success">✅ Đã có ảnh hồ sơ Face ID</span>
          ) : (
            <span className="badge badge-warning">⚠️ Chưa chụp ảnh Face ID mẫu</span>
          )}
        </div>

        {/* Check-in/out Buttons */}
        <div className="checkin-actions">
          {!hasCheckedIn ? (
            <button
              className="checkin-btn checkin-btn-in"
              onClick={() => handleStartCheck('in')}
              disabled={geo.loading || !!geo.error}
            >
              <div className="checkin-btn-icon">
                <HiOutlineClock />
              </div>
              <div className="checkin-btn-text">CHECK IN</div>
              <div className="checkin-btn-sub">Nhấn để chấm công vào</div>
            </button>
          ) : !hasCheckedOut ? (
            <button
              className="checkin-btn checkin-btn-out"
              onClick={() => handleStartCheck('out')}
              disabled={geo.loading || !!geo.error}
            >
              <div className="checkin-btn-icon">
                <HiOutlineClock />
              </div>
              <div className="checkin-btn-text">CHECK OUT</div>
              <div className="checkin-btn-sub">Nhấn để chấm công ra</div>
            </button>
          ) : (
            <div className="checkin-done">
              <div className="checkin-done-icon">✅</div>
              <div className="checkin-done-text">Đã hoàn tất chấm công hôm nay</div>
            </div>
          )}
        </div>

        {/* Today's Status */}
        {todayAttendance && (
          <div className="checkin-status card">
            <div className="card-header">
              <h4>Trạng thái hôm nay</h4>
              {todayAttendance.status === 'late' && (
                <span className="badge badge-warning">Đi trễ</span>
              )}
              {todayAttendance.status === 'present' && (
                <span className="badge badge-success">Đúng giờ</span>
              )}
            </div>
            <div className="card-body">
              <div className="checkin-status-row">
                <div className="checkin-status-item">
                  <span className="checkin-status-label">Giờ vào</span>
                  <span className="checkin-status-value">
                    {formatRecordTime(todayAttendance.checkIn?.time)}
                  </span>
                </div>
                <div className="checkin-status-item">
                  <span className="checkin-status-label">Giờ ra</span>
                  <span className="checkin-status-value">
                    {formatRecordTime(todayAttendance.checkOut?.time)}
                  </span>
                </div>
                {todayAttendance.workHours > 0 && (
                  <div className="checkin-status-item">
                    <span className="checkin-status-label">Số giờ làm</span>
                    <span className="checkin-status-value">{todayAttendance.workHours}h</span>
                  </div>
                )}
              </div>
              {todayAttendance.checkIn?.photo && (
                <div className="checkin-photos">
                  <div className="checkin-photo-item">
                    <img src={todayAttendance.checkIn.photo} alt="Check-in" />
                    <span className="text-xs text-secondary">Ảnh check-in</span>
                  </div>
                  {todayAttendance.checkOut?.photo && (
                    <div className="checkin-photo-item">
                      <img src={todayAttendance.checkOut.photo} alt="Check-out" />
                      <span className="text-xs text-secondary">Ảnh check-out</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Info */}
        {currentUser?.schedule && (
          <div className="checkin-schedule card">
            <div className="card-body">
              <div className="checkin-status-row">
                <div className="checkin-status-item">
                  <span className="checkin-status-label">Ca làm</span>
                  <span className="checkin-status-value">
                    {currentUser.schedule.shiftStart} - {currentUser.schedule.shiftEnd}
                  </span>
                </div>
                <div className="checkin-status-item">
                  <span className="checkin-status-label">Địa điểm</span>
                  <span className="checkin-status-value text-sm">
                    {currentUser.schedule.workLocation?.name || 'Chưa cài đặt'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckInPage;
