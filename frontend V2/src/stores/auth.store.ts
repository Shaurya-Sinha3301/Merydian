import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
  role: string;
  family_id?: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setAuth: (user: AuthUser | Record<string, unknown>, token: string) => void;
  logout: () => void;
}

function normalizeUser(user: AuthUser | Record<string, unknown> | null): AuthUser | null {
  if (!user) return null;
  const role = String(user.role ?? 'traveller');
  return {
    id: String(user.id ?? ''),
    email: user.email ? String(user.email) : undefined,
    full_name: user.full_name ? String(user.full_name) : undefined,
    role,
    family_id: user.family_id ? String(user.family_id) : null,
  };
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return normalizeUser(JSON.parse(raw));
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: readStoredUser(),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },
  setUser: (user) => {
    const normalized = normalizeUser(user);
    if (normalized) {
      localStorage.setItem('user', JSON.stringify(normalized));
    } else {
      localStorage.removeItem('user');
    }
    set({ user: normalized });
  },
  setAuth: (user, token) => {
    const normalized = normalizeUser(user);
    localStorage.setItem('token', token);
    if (normalized) {
      localStorage.setItem('user', JSON.stringify(normalized));
    }
    set({ token, user: normalized });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
}));
