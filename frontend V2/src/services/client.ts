import axios from 'axios';
import { ENV } from '../config/env';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url || '').includes('/auth/login')) {
      // Handle unauthorized (e.g., redirect to login)
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
