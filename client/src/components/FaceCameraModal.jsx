import { useRef, useState, useEffect, useCallback } from 'react';
import { HiOutlineCamera, HiOutlineRefresh, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import './FaceCameraModal.css';

const FaceCameraModal = ({ isOpen, onClose, onCapture, title = 'Chụp ảnh Face ID' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);

  const startCamera = useCallback(async () => {
    setError(null);
    setPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Không thể mở camera. Vui lòng cho phép quyền truy cập camera.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    // Flip horizontally for mirror effect if front camera
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhoto(dataUrl);
  };

  const handleRetake = () => {
    setPhoto(null);
  };

  const handleConfirm = () => {
    if (photo) {
      onCapture(photo);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="face-camera-modal-overlay">
      <div className="face-camera-modal">
        <div className="face-camera-header">
          <h3>{title}</h3>
          <button className="face-camera-close-btn" onClick={onClose}>
            <HiOutlineX />
          </button>
        </div>

        <div className="face-camera-content">
          {!photo ? (
            <div className="face-camera-preview-container">
              <video ref={videoRef} autoPlay playsInline muted className="face-camera-video" />
              {/* Oval Face Alignment Frame Overlay */}
              <div className="face-oval-guide">
                <div className="face-oval-ring" />
                <p className="face-guide-text">Đặt khuôn mặt vào trong khung hình oval</p>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          ) : (
            <div className="face-camera-preview-container">
              <img src={photo} alt="Face preview" className="face-camera-photo" />
              <div className="face-camera-success-badge">✅ Đã chụp thành công</div>
            </div>
          )}

          {error && <div className="face-camera-error">{error}</div>}

          <div className="face-camera-actions">
            {!photo ? (
              <button className="btn btn-primary btn-lg w-full" onClick={handleCapture} disabled={!!error}>
                <HiOutlineCamera /> Chụp ảnh Face ID
              </button>
            ) : (
              <div className="flex gap-md w-full">
                <button className="btn btn-secondary flex-1" onClick={handleRetake}>
                  <HiOutlineRefresh /> Chụp lại
                </button>
                <button className="btn btn-primary flex-1" onClick={handleConfirm}>
                  <HiOutlineCheck /> Sử dụng ảnh này
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceCameraModal;
