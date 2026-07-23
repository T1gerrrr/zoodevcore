import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for camera access and photo capture
 * Uses front-facing camera by default for selfie check-in
 */
const useCamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);

  const openCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsOpen(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Bạn cần cho phép truy cập camera để chụp ảnh chấm công');
      } else {
        setError('Không thể mở camera. Vui lòng kiểm tra thiết bị.');
      }
    }
  }, []);

  const capturePhoto = useCallback((overlayText = '') => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add overlay text (timestamp, location)
    if (overlayText) {
      const lines = overlayText.split('\n');
      const padding = 12;
      const lineHeight = 20;
      const blockHeight = lines.length * lineHeight + padding * 2;

      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, canvas.height - blockHeight, canvas.width, blockHeight);

      // Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Inter, sans-serif';
      lines.forEach((line, i) => {
        ctx.fillText(line, padding, canvas.height - blockHeight + padding + (i + 1) * lineHeight - 4);
      });
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
    return dataUrl;
  }, []);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsOpen(false);
  }, []);

  const retakePhoto = useCallback(() => {
    setPhoto(null);
  }, []);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    closeCamera();
  }, [closeCamera]);

  return {
    videoRef,
    canvasRef,
    isOpen,
    photo,
    error,
    openCamera,
    capturePhoto,
    closeCamera,
    retakePhoto,
    clearPhoto,
  };
};

export default useCamera;
