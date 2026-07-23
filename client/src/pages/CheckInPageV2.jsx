import { useState, useEffect } from 'react';
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
  HiOutlineSparkles,
} from 'react-icons/hi';
import './CheckInPageV2.css';

const CheckInPageV2 = () => {
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

  // Real-time live camera frame face match loop
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
      console.error('Fetch today attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCheck = async (type) => {
    setCheckType(type);
    setShowCamera(true);
    setFaceMatchResult(null);
    await camera.startCamera();
  };

  const handleCloseCamera = () => {
    camera.stopCamera();
    setShowCamera(false);
    setCheckType(null);
    setFaceMatchResult(null);
  };

  const handleCapture = async () => {
    const photoDataUrl = camera.takePhoto();
    if (!photoDataUrl) return;

    const faceUrl = empDetails?.facePhotoUrl || currentUser?.facePhotoUrl;

    if (faceUrl) {
      const result = await compareFacesClient(photoDataUrl, faceUrl, 45);
      setFaceMatchResult(result);
    }
  };

  const handleRetake = () => {
    camera.clearPhoto();
    setFaceMatchResult(null);
  };

  const handleSubmitCheckIn = async () => {
    if (!camera.photo) {
      toast.error('Vui lòng chụp ảnh xác thực khuôn mặt');
      return;
    }

    if (geo.error) {
      toast.error(geo.error);
      return;
    }

    const faceUrl = empDetails?.facePhotoUrl || currentUser?.facePhotoUrl;
    if (faceUrl && faceMatchResult && !faceMatchResult.isMatch) {
      toast.error(
        `Khuôn mặt chưa khớp với profile Face ID (${faceMatchResult.percentage}%). Vui lòng chụp lại rõ nét hơn.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        employeeId: currentUser.uid,
        photo: camera.photo,
        latitude: geo.latitude,
        longitude: geo.longitude,
        address: geo.address,
      };

      if (checkType === 'in') {
        const res = await attendanceAPI.checkIn(payload);
        toast.success(res.data.message || 'Check-in thành công!');
      } else {
        const res = await attendanceAPI.checkOut(payload);
        toast.success(res.data.message || 'Check-out thành công!');
      }

      handleCloseCamera();
      fetchTodayAttendance();
    } catch (err) {
      const msg = err.response?.data?.error || 'Thao tác thất bại';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const hasCheckedIn = !!todayAttendance?.checkIn?.time;
  const hasCheckedOut = !!todayAttendance?.checkOut?.time;

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatClock = (date) => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatRecordTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="checkin-v2-page">
      {/* UI Version Switcher */}
      <div className="v2-switcher-bar">
        <NavLink to="/checkin" className="v2-switcher-item">
          Giao diện V1
        </NavLink>
        <NavLink to="/checkin-v2" className="v2-switcher-item active">
          Giao diện V2 (Mới ✨)
        </NavLink>
      </div>

      {/* Hero Clock Card V2 */}
      <div className="hero-v2-card text-center">
        <div className="hero-v2-date">{formatDate(currentTime)}</div>
        <div className="hero-v2-time">{formatClock(currentTime)}</div>
        <div className="hero-v2-location">
          <span className="gps-dot-live" />
          <HiOutlineLocationMarker />
          <span>
            {geo.loading
              ? 'Đang lấy vị trí GPS...'
              : geo.error
                ? 'Lỗi GPS'
                : `${geo.latitude?.toFixed(6)}, ${geo.longitude?.toFixed(6)} (±15m)`}
          </span>
        </div>
      </div>

      {/* Big Action Dial V2 */}
      <div className="action-dial-v2">
        {!hasCheckedIn ? (
          <div>
            <button
              className="big-dial-button in"
              onClick={() => handleStartCheck('in')}
              disabled={geo.loading || !!geo.error}
            >
              <HiOutlineClock className="big-dial-icon" />
              <span className="big-dial-text">CHECK IN</span>
            </button>
            <p className="text-xs text-secondary font-medium">Bấm nút trên để điểm danh VÀO ca</p>
          </div>
        ) : !hasCheckedOut ? (
          <div>
            <button
              className="big-dial-button out"
              onClick={() => handleStartCheck('out')}
              disabled={geo.loading || !!geo.error}
            >
              <HiOutlineClock className="big-dial-icon" />
              <span className="big-dial-text">CHECK OUT</span>
            </button>
            <p className="text-xs text-secondary font-medium">Bấm nút trên để điểm danh RA ca</p>
          </div>
        ) : (
          <div className="p-md">
            <div className="text-4xl mb-xs">🎉</div>
            <div className="font-bold text-base text-success mb-xs">Đã hoàn thành chấm công hôm nay</div>
            <p className="text-xs text-secondary">Cảm ơn bạn đã làm việc chăm chỉ ngày hôm nay!</p>
          </div>
        )}
      </div>

      {/* Today Status Card V2 */}
      {todayAttendance && (
        <div className="today-card-v2">
          <div className="today-header-v2">
            <span className="today-title-v2">Trạng thái ngày hôm nay</span>
            {todayAttendance.status === 'late' ? (
              <span className="badge badge-warning">Đi trễ</span>
            ) : (
              <span className="badge badge-success">Đúng giờ</span>
            )}
          </div>
          <div className="timeline-v2-grid">
            <div className="timeline-v2-item">
              <span className="timeline-v2-label">Giờ vào</span>
              <span className="timeline-v2-val">{formatRecordTime(todayAttendance.checkIn?.time)}</span>
            </div>
            <div className="timeline-v2-item">
              <span className="timeline-v2-label">Giờ ra</span>
              <span className="timeline-v2-val">{formatRecordTime(todayAttendance.checkOut?.time)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="modal-backdrop">
          <div className="modal-card card p-md" style={{ maxWidth: 440, width: '92%', background: '#ffffff', borderRadius: 16 }}>
            <div className="flex justify-between items-center mb-sm">
              <h3 className="font-bold text-base text-primary" style={{ margin: 0 }}>
                {checkType === 'in' ? '📸 Chấm công VÀO ca' : '📸 Chấm công RA ca'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseCamera}>✕</button>
            </div>

            <div className="camera-viewport mb-md" style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              {!camera.photo ? (
                <>
                  <video
                    ref={camera.videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                  />
                  <div className="face-guide-overlay">
                    <div className="face-guide-ellipse" />
                  </div>
                </>
              ) : (
                <img src={camera.photo} alt="Snapshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>

            <div className="modal-footer flex justify-between items-center border-t pt-md">
              <button className="btn btn-secondary" onClick={handleCloseCamera}>Hủy</button>
              {!camera.photo ? (
                <button className="btn btn-primary" onClick={handleCapture}>Chụp ảnh</button>
              ) : (
                <div className="flex gap-xs">
                  <button className="btn btn-secondary" onClick={handleRetake}>Chụp lại</button>
                  <button className="btn btn-primary" onClick={handleSubmitCheckIn} disabled={submitting}>
                    {submitting ? <span className="spinner spinner-sm" /> : 'Xác nhận điểm danh'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInPageV2;
