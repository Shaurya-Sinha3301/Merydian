import { client } from './client';

export const authService = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }
    
    const data = await response.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token);
    }
    return data;
  },
  
  logout: async () => {
    await client.post('/auth/logout');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  },
  
  logoutAll: async () => {
    await client.post('/auth/logout-all');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  },
  
  getUserProfile: () => client.get<{id: string; email: string; full_name: string; role: 'traveller' | 'agent'; family_id?: string}>('/users/me'),
  
  signup: async (data: { email: string; password: string; full_name: string; role: string }) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Signup failed' }));
      throw new Error(error.detail || 'Signup failed');
    }

    const resData = await response.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', resData.access_token);
    }
    return resData;
  },

  refreshToken: async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = new Error('Token refresh failed');
      (err as {status?: number}).status = response.status;
      throw err;
    }

    const resData = await response.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', resData.access_token);
    }
    return resData;
  }
};
