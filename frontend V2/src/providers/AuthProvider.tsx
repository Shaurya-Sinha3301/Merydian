import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { apiClient } from '../services/client';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { token, logout } = useAuthStore();

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]);

  return <>{children}</>;
};
