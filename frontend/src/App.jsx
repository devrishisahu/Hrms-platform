import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import AuthLayout from './components/layout/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardIndex from './pages/dashboard/index.jsx';

// Core HRMS Pages
import Directory from './pages/Directory';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Approvals from './pages/Approvals';
import Reports from './pages/Reports';
import OrgSettings from './pages/OrgSettings';
import EmployeeDetail from './pages/EmployeeDetail';
import EmployeeNew from './pages/EmployeeNew';
import Notifications from './pages/Notifications';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          
          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={
              <ErrorBoundary>
                <DashboardLayout />
              </ErrorBoundary>
            }>
              <Route index element={<DashboardIndex />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="leave" element={<Leave />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />

              {/* HR, Manager, and Leadership routes */}
              <Route element={<ProtectedRoute allowedRoles={['hr', 'manager', 'leadership']} />}>
                <Route path="directory" element={<Directory />} />
                <Route path="approvals" element={<Approvals />} />
              </Route>

              {/* HR and Leadership Only routes */}
              <Route element={<ProtectedRoute allowedRoles={['hr', 'leadership']} />}>
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<OrgSettings />} />
              </Route>

              {/* HR Only routes */}
              <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
                <Route path="employees/new" element={<EmployeeNew />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
