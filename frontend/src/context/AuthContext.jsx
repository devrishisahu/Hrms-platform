import { useSelector, useDispatch } from 'react-redux';
import { logout, setCredentials } from '../features/auth/authSlice';
import api from '../api/axios';

// Bridge hook that redirects old useAuth() calls to Redux state and actions
export function useAuth() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  const loading = useSelector((state) => state.auth?.isLoading);

  const signOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request failed:', err);
    }
    localStorage.removeItem('accessToken');
    dispatch(logout());
  };

  const signUp = async (body) => {
    const { data } = await api.post('/auth/register-tenant', body);
    localStorage.setItem('accessToken', data.data.accessToken);
    dispatch(setCredentials({ user: data.data.user }));
  };

  const signIn = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('accessToken', data.data.accessToken);
    dispatch(setCredentials({ user: data.data.user }));
  };

  const reload = async () => {
    try {
      const { data } = await api.get('/auth/me');
      dispatch(setCredentials({ user: data.data.user }));
    } catch {
      dispatch(logout());
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    reload,
  };
}

export function AuthProvider({ children }) {
  // Safe dummy wrapper in case any old components still use <AuthProvider>
  return <>{children}</>;
}
