import axios from 'axios';
import { ENV } from '../config/env';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // One key per action: a retry of this same request reuses it, so the server does the work only once
  const method = (config.method || 'get').toLowerCase();
  const url = String(config.url || '');
  if (config.headers && ['post', 'put', 'patch'].includes(method) && !/^\/?(auth|demo|dev)\//.test(url)
      && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = newKey();
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
