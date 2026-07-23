import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for browser Geolocation API
 * Returns current GPS position, loading state, and error
 */
const useGeolocation = (options = {}) => {
  const [position, setPosition] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị GPS');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoading(false);
        setPermissionDenied(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Bạn cần cho phép truy cập vị trí để chấm công');
            setPermissionDenied(true);
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Không thể xác định vị trí. Vui lòng bật GPS.');
            break;
          case err.TIMEOUT:
            setError('Hết thời gian chờ vị trí. Vui lòng thử lại.');
            break;
          default:
            setError('Không thể lấy vị trí. Vui lòng thử lại.');
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
        ...options,
      }
    );
  }, [options]);

  useEffect(() => {
    getPosition();
  }, []);

  return {
    ...position,
    error,
    loading,
    permissionDenied,
    refresh: getPosition,
  };
};

export default useGeolocation;
