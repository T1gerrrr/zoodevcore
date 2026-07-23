import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { requestNotificationPermission, onForegroundMessage } from '../lib/firebase';
import { useToast } from '../store/ToastContext';
import {
  HiOutlineViewGrid,
  HiOutlineUserGroup,
  HiOutlineClipboardList,
  HiOutlineBell,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineCurrencyDollar,
} from 'react-icons/hi';
import './MainLayout.css';

const MainLayout = () => {
  const { currentUser, logout, isStaff } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // Request FCM Push Notification Permission for Staff
  useEffect(() => {
    if (isStaff && currentUser) {
      requestNotificationPermission().then((token) => {
        if (token) {
          console.log('FCM Token registered for Staff:', token);
          // Could send token to backend to store in DB
        }
      });

      const unsubscribe = onForegroundMessage((payload) => {
        if (payload?.notification) {
          toast.info(`${payload.notification.title}: ${payload.notification.body}`);
        }
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [isStaff, currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Staff navigation items
  const staffNav = [
    { to: '/dashboard', icon: <HiOutlineViewGrid />, label: 'Dashboard' },
    { to: '/schedules', icon: <HiOutlineCalendar />, label: 'Xếp lịch làm' },
    { to: '/payroll', icon: <HiOutlineCurrencyDollar />, label: 'Quản lý lương' },
    { to: '/employees', icon: <HiOutlineUserGroup />, label: 'Nhân viên' },
    { to: '/attendance-history', icon: <HiOutlineClipboardList />, label: 'Lịch sử' },
    { to: '/notifications', icon: <HiOutlineBell />, label: 'Thông báo' },
  ];

  // Employee navigation items
  const employeeNav = [
    { to: '/checkin', icon: <HiOutlineHome />, label: 'Chấm công' },
    { to: '/my-schedule', icon: <HiOutlineCalendar />, label: 'Lịch ca làm' },
    { to: '/my-history', icon: <HiOutlineClock />, label: 'Lịch sử & Lương' },
  ];

  const navItems = isStaff ? staffNav : employeeNav;

  return (
    <div className="layout">
      {/* Sidebar - Staff (PC) */}
      {isStaff && (
        <>
          <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} />
          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <div className="sidebar-logo">
                <span className="logo-icon">📋</span>
                <span className="logo-text">ZOO Workshop</span>
              </div>
              <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
                <HiOutlineX />
              </button>
            </div>

            <nav className="sidebar-nav">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="sidebar-footer">
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                  {(currentUser?.name || currentUser?.email || 'A')[0].toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{currentUser?.name || 'Admin'}</div>
                  <div className="sidebar-user-role">Quản lý</div>
                </div>
              </div>
              <button className="sidebar-link" onClick={handleLogout}>
                <span className="sidebar-link-icon"><HiOutlineLogout /></span>
                <span>Đăng xuất</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className={`main-content ${isStaff ? 'with-sidebar' : ''}`}>
        {/* Top Navbar */}
        <header className="navbar">
          {isStaff && (
            <button className="navbar-toggle" onClick={() => setSidebarOpen(true)}>
              <HiOutlineMenu />
            </button>
          )}
          {!isStaff && (
            <div className="navbar-brand">
              <span className="logo-icon">📋</span>
              <span className="logo-text">ZOO Workshop</span>
            </div>
          )}
          <div className="navbar-spacer" />
          <div className="navbar-user">
            {!isStaff && (
              <>
                <span className="navbar-user-name">
                  {currentUser?.name || currentUser?.employeeCode}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  <HiOutlineLogout />
                  <span className="hide-mobile">Đăng xuất</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>

        {/* Bottom Navigation - Employee (Mobile) */}
        {!isStaff && (
          <nav className="bottom-nav">
            {employeeNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                <span className="bottom-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};

export default MainLayout;

