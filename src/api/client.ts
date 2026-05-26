import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:60111';

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('zyntra_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('zyntra_token');
      localStorage.removeItem('zyntra_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
