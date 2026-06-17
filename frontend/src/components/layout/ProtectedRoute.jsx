import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, setLoading, logout } from '../../features/auth/authSlice';
import api from '../../api/axios';

export default function ProtectedRoute({ allowedRoles }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const authState = useSelector((state) => state.auth);
  const user = authState?.user ?? null;
  const isAuthenticated = authState?.isAuthenticated ?? false;
  const isLoading = authState?.isLoading ?? true;
  const hasFetched = useRef(false);

  useEffect(() => {
    if (user) {
      if (isLoading) dispatch(setLoading(false));
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        dispatch(setLoading(false));
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        dispatch(setCredentials({ user: data.data.user }));
      } catch (error) {
        console.error('Auth check failed:', error?.response?.status);
        localStorage.removeItem('accessToken');
        dispatch(logout());
      }
    };

    fetchUser();
  }, [dispatch, user, isLoading]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#02060E',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(197, 3, 55, 0.3)',
            borderTopColor: '#C50337',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading your workspace...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('ProtectedRoute check:', { allowedRoles, userRole: user?.role, location: location.pathname });
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    console.log('ProtectedRoute blocking access to:', location.pathname);
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
