import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { usersService } from '../services/users';
import type { UserCreate, LogoutRequest, TokenRefresh } from '../types/dto/auth';
import { useAuthStore, type AuthUser } from '../stores/auth.store';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function hydrateSession(accessToken: string) {
  const setAuth = useAuthStore.getState().setAuth;
  const payload = parseJwt(accessToken);
  const fromJwt: AuthUser = {
    id: payload?.sub || 'temp',
    role: payload?.role || 'traveller',
    family_id: payload?.family_id || null,
  };
  setAuth(fromJwt, accessToken);
  try {
    const profile = await usersService.getMe();
    setAuth(profile, accessToken);
  } catch {
    // JWT claims are enough to route; profile fetch can fail if backend is still starting
  }
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: URLSearchParams) => authService.login(data),
    onSuccess: async (data) => {
      await hydrateSession(data.access_token);
      const payload = parseJwt(data.access_token);
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (data: UserCreate) => authService.signup(data),
    onSuccess: async (data) => {
      await hydrateSession(data.access_token);
    },
  });
}

export function useLogout() {
  const logoutStore = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LogoutRequest = {}) => authService.logout(data),
    onSuccess: () => {
      logoutStore();
      queryClient.clear();
    },
    onError: () => {
      logoutStore();
      queryClient.clear();
    },
  });
}

export function useRefreshToken() {
  return useMutation({
    mutationFn: (data: TokenRefresh) => authService.refresh(data),
  });
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => usersService.getMe(),
    enabled: !!token,
  });
}
