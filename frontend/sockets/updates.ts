'use client';

import { useEffect, useCallback, useState } from 'react';
import { wsService } from '@/services/websocket.service';

/**
 * Hook: subscribe to real-time itinerary updates via WebSocket.
 *
 * @param role   - 'agent' | 'traveller'
 * @param userId - current user UUID (undefined while auth is loading)
 * @param onUpdate - optional callback fired on each `itinerary_updated` event
 *
 * Returns:
 *  - lastEvent: the most recent WS event payload (or null)
 *  - connected: whether the WS is currently open
 */
export function useItineraryUpdates(
  role: 'agent' | 'traveller',
  userId: string | undefined,
  onUpdate?: (payload: any) => void,
) {
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  const handleUpdate = useCallback(
    (payload: any) => {
      setLastEvent(payload);
      onUpdate?.(payload);
    },
    [onUpdate],
  );

  useEffect(() => {
    if (!userId) return;

    wsService.connect(role, userId);
    setConnected(true);

    const unsub = wsService.on('itinerary_updated', handleUpdate);

    return () => {
      unsub();
      wsService.disconnect();
      setConnected(false);
    };
  }, [role, userId, handleUpdate]);

  return { lastEvent, connected };
}

/**
 * Hook: subscribe to any WS event type.
 */
export function useWebSocketEvent(
  role: 'agent' | 'traveller',
  userId: string | undefined,
  eventType: string,
  handler: (payload: any) => void,
) {
  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    if (!userId) return;

    wsService.connect(role, userId);
    const unsub = wsService.on(eventType, stableHandler);

    return () => {
      unsub();
    };
  }, [role, userId, eventType, stableHandler]);
}
