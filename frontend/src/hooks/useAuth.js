import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios';
import { setCredentials, setLoading, logout } from '../features/auth/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  
  // Defensive: if the auth slice isn't ready yet, return safe defaults
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

  return { user, isAuthenticated, isLoading };
}
