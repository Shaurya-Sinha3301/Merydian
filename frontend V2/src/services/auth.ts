import apiClient from './client';
import type { Token, TokenRefresh, UserCreate, LogoutRequest } from '../types/dto/auth';

export const authService = {
  login: async (data: URLSearchParams): Promise<Token> => {
    const response = await apiClient.post<Token>('/auth/login', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  signup: async (data: UserCreate): Promise<Token> => {
    const response = await apiClient.post<Token>('/auth/signup', data);
    return response.data;
  },

  refresh: async (data: TokenRefresh): Promise<Token> => {
    const response = await apiClient.post<Token>('/auth/refresh', data);
    return response.data;
  },

  logout: async (data: LogoutRequest = {}): Promise<void> => {
    await apiClient.post('/auth/logout', data);
  },
};
