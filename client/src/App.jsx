import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ToastProvider } from './store/ToastContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import CheckInPage from './pages/CheckInPage';
import CheckInPageV2 from './pages/CheckInPageV2';
import DashboardPage from './pages/DashboardPage';
import EmployeeListPage from './pages/EmployeeListPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import AttendanceHistoryPage from './pages/AttendanceHistoryPage';
import NotificationsPage from './pages/NotificationsPage';
import WeeklySchedulePage from './pages/WeeklySchedulePage';
import MySchedulePage from './pages/MySchedulePage';
import WeeklyPayrollPage from './pages/WeeklyPayrollPage';

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={currentUser.role === 'staff' ? '/dashboard' : '/checkin'} replace />;
  }

  return children;
};

// Redirect from login if already authenticated
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to={currentUser.role === 'staff' ? '/dashboard' : '/checkin'} replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />

      {/* Protected Routes */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        {/* Employee Routes */}
        <Route path="/checkin" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <CheckInPage />
          </ProtectedRoute>
        } />
        <Route path="/checkin-v2" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <CheckInPageV2 />
          </ProtectedRoute>
        } />
        <Route path="/my-schedule" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <MySchedulePage />
          </ProtectedRoute>
        } />
        <Route path="/my-history" element={
          <ProtectedRoute allowedRoles={['employee']}>
            <AttendanceHistoryPage />
          </ProtectedRoute>
        } />

        {/* Staff Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/schedules" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <WeeklySchedulePage />
          </ProtectedRoute>
        } />
        <Route path="/payroll" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <WeeklyPayrollPage />
          </ProtectedRoute>
        } />
        <Route path="/employees" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <EmployeeListPage />
          </ProtectedRoute>
        } />
        <Route path="/employees/new" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <EmployeeFormPage />
          </ProtectedRoute>
        } />
        <Route path="/employees/:id/edit" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <EmployeeFormPage />
          </ProtectedRoute>
        } />
        <Route path="/attendance-history" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <AttendanceHistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <NotificationsPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
