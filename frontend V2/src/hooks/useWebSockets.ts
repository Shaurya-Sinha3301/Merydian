import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../constants/queryKeys';

export function useWebSockets() {
  const { user, token } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !token) return;

    // Use window.location.host for WS if API is on the same host, or derive from VITE_API_URL
    const origin = (import.meta.env.VITE_API_ORIGIN as string | undefined)
      || (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/api\/v1\/?$/, '')
      || window.location.origin;
    const wsBaseUrl = origin.replace(/^http/, 'ws');
    const userId = typeof user === 'object' && user && 'id' in user ? String(user.id) : '';
    const role = typeof user === 'object' && user && 'role' in user ? String(user.role) : 'traveller';
    const rolePath = role === 'agent' ? `agent/${userId}` : `traveller/${userId}`;
    const ws = new WebSocket(`${wsBaseUrl}/ws/${rolePath}`);

    ws.onopen = () => {
      console.log(`Connected to websocket as ${user.role}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket event:', data);
        
        if (data.type === 'JOB_COMPLETED' || data.type === 'JOB_STARTED') {
          // Invalidate trips and jobs to refresh dashboard
          queryClient.invalidateQueries({ queryKey: [queryKeys.trips] });
          queryClient.invalidateQueries({ queryKey: ['agent-jobs'] });
        }
      } catch (err) {
        console.error('Failed to parse websocket message', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [user, token, queryClient]);
}
