import axios from 'axios';

/**
 * Centralized API client.
 * - Attaches the access token to every request
 * - On 401, silently refreshes via the httpOnly cookie and retries once
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // refresh token cookie
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/');

    if (status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise || api.post('/auth/refresh');
        const { data } = await refreshPromise;
        refreshPromise = null;
        localStorage.setItem('accessToken', data.data.accessToken);
        return api(original);
      } catch (e) {
        refreshPromise = null;
        localStorage.removeItem('accessToken');
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** Pulls a human-friendly message out of any axios error. */
export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';

export default api;
