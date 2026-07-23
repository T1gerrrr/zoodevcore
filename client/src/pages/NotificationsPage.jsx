import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { useToast } from '../store/ToastContext';
import { HiOutlineCheckCircle, HiOutlineBell } from 'react-icons/hi';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      toast.error('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error('Không thể cập nhật thông báo');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đọc tất cả thông báo');
    } catch (err) {
      toast.error('Không thể cập nhật thông báo');
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'attendance_complete':
        return '🎉';
      case 'weekly_complete':
        return '✅';
      default:
        return '🔔';
    }
  };

  const [showSimulatedPush, setShowSimulatedPush] = useState(null);

  const handleTestPush = async () => {
    try {
      const pushContent = {
        title: '🎉 NV001 - Nguyễn Văn A đã đủ công tháng!',
        body: 'Nhân viên đã hoàn thành đủ 26/26 ngày công chỉ tiêu tháng này. Bấm để xem bảng lương.',
        time: 'Vừa xong',
      };

      // Show in-app simulated Push Banner overlay
      setShowSimulatedPush(pushContent);

      if ('Notification' in window) {
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
          new Notification(pushContent.title, {
            body: pushContent.body,
            icon: '/favicon.ico',
            tag: 'attendance-complete-test',
          });
          toast.success('Đã gửi Push Notification tới thiết bị!');
        } else {
          toast.warning('Quyền thông báo hệ thống bị khóa. Đã mô phỏng Push Notification trực tiếp trên giao diện.');
        }
      }

      // Add a test notification item to list
      const testNotif = {
        id: 'test-' + Date.now(),
        type: 'attendance_complete',
        message: `🎉 [THỬ NGHIỆM PUSH] NV001 - Nguyễn Văn A đã chấm công đủ 26/26 ngày tháng này!`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [testNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    } catch (err) {
      console.error('Test push error:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header flex justify-between items-center gap-sm flex-wrap">
        <div>
          <h1 className="page-title">Thông báo</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}
          </p>
        </div>
        <div className="flex items-center gap-xs">
          <button className="btn btn-primary btn-sm" onClick={handleTestPush}>
            <HiOutlineBell /> Thử nghiệm Push Notification
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkAllAsRead}>
              <HiOutlineCheckCircle /> Đọc tất cả
            </button>
          )}
        </div>
      </div>

      {/* Simulated Push Notification Banner Overlay */}
      {showSimulatedPush && (
        <div className="simulated-push-card mb-md">
          <div className="flex justify-between items-center mb-xs">
            <span className="flex items-center gap-xs font-semibold text-xs text-primary">
              <HiOutlineBell size={16} /> MÔ PHỎNG PUSH NOTIFICATION HỆ THỐNG
            </span>
            <button className="btn btn-ghost btn-xs" onClick={() => setShowSimulatedPush(null)}>✕ Đóng</button>
          </div>
          <div className="simulated-push-body">
            <strong className="block text-sm font-bold text-gray-800">{showSimulatedPush.title}</strong>
            <p className="text-xs text-gray-600 mt-xs">{showSimulatedPush.body}</p>
          </div>
        </div>
      )}

      {/* Permission Blocked Guide Banner */}
      {typeof window !== 'undefined' && window.Notification?.permission === 'denied' && (
        <div className="card p-md mb-md border-warning" style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
          <strong className="text-warning flex items-center gap-xs mb-xs">
            <HiOutlineBell /> Quyền thông báo trình duyệt hiện đang bị Khóa (Denied)
          </strong>
          <p className="text-xs text-gray-700">
            Để nhận thông báo nổ trực tiếp trên màn hình máy tính/điện thoại khi nhân viên đủ công, bạn hãy bật lại quyền theo các bước:
          </p>
          <ol className="text-xs text-gray-700 mt-xs pl-md list-decimal" style={{ margin: '8px 0 0 16px' }}>
            <li>Bấm vào <strong>Biểu tượng 🔒 Ổ khóa</strong> hoặc <strong>⚙️ Cài đặt trang web</strong> ở bên trái thanh địa chỉ URL trình duyệt.</li>
            <li>Tại mục <strong>Thông báo (Notifications)</strong> $\rightarrow$ Đổi từ <strong>Chặn (Block)</strong> sang <strong>Cho phép (Allow)</strong> và bấm F5 tải lại trang.</li>
          </ol>
        </div>
      )}

      {/* iOS PWA Web Push Guide Banner */}
      {typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (
        <div className="card p-md mb-md" style={{ backgroundColor: '#f0f9ff', borderLeft: '4px solid #0284c7' }}>
          <strong className="text-primary flex items-center gap-xs mb-xs">
            📱 Hướng dẫn bật Push Notification trên iPhone / iPad (iOS 16.4+)
          </strong>
          <p className="text-xs text-gray-700">
            Apple (iOS) yêu cầu thêm trang web ra Màn hình chính trước khi bật Push Notification:
          </p>
          <ol className="text-xs text-gray-700 mt-xs pl-md list-decimal" style={{ margin: '8px 0 0 16px' }}>
            <li>Trong Safari, bấm vào nút <strong>Chia sẻ (Share ⎘)</strong> ở thanh dưới cùng màn hình.</li>
            <li>Cuộn xuống bấm <strong>"Thêm vào Màn hình chính" (Add to Home Screen)</strong> $\rightarrow$ Bấm <strong>Thêm</strong>.</li>
            <li>Mở ứng dụng từ biểu tượng ngoài Màn hình chính $\rightarrow$ Cho phép nhận Thông báo.</li>
          </ol>
        </div>
      )}

      {notifications.length > 0 ? (
        <div className="card">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
              onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
            >
              <div className="notification-icon">{getTypeIcon(notif.type)}</div>
              <div className="notification-content">
                <p className="notification-message">{notif.message}</p>
                <span className="notification-time">{formatTime(notif.createdAt)}</span>
              </div>
              {!notif.isRead && <div className="notification-dot" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><HiOutlineBell /></div>
            <p>Chưa có thông báo</p>
          </div>
        </div>
      )}

      <style>{`
        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light);
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .notification-item:hover {
          background: var(--bg-light);
        }
        .notification-item.unread {
          background: var(--primary-lighter);
        }
        .notification-item:last-child {
          border-bottom: none;
        }
        .notification-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .notification-content {
          flex: 1;
        }
        .notification-message {
          font-size: 0.9375rem;
          color: var(--text-primary);
          line-height: 1.5;
        }
        .notification-time {
          font-size: 0.75rem;
          color: var(--text-light);
          margin-top: 4px;
          display: block;
        }
        .notification-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
          flex-shrink: 0;
          margin-top: 8px;
        }
        .simulated-push-card {
          background: #1e293b;
          color: #f8fafc;
          border-radius: 12px;
          padding: 14px 18px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          border: 1px solid #334155;
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationsPage;
