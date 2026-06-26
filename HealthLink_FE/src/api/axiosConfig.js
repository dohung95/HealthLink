import axios from 'axios';

const DEFAULT_API_HOST = 'http://localhost:8096';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SPRING_API_BASE_URL || DEFAULT_API_HOST,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('[Axios Interceptor] Response error:', error.response?.status, 'Path:', window.location.pathname);
    if (error.response?.status === 401 || error.response?.status === 403) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('[Axios Interceptor] Token in storage:', !!token);
      // Chỉ redirect nếu có token trong storage (chưa bị xóa) và hiện tại không ở trang login
      if (token && window.location.pathname !== '/login') {
        console.log('[Axios Interceptor] Redirecting to /login...');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
