import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { phase3Service, type NewBooking, type NotificationItem } from '../services/phase3';
import { ENV } from '../config/env';
import { queryKeys } from '../constants/queryKeys';
import { useAuthStore } from '../stores/auth.store';

type QC = ReturnType<typeof useQueryClient>;

/** What each kind of notice means for what is on screen: refresh exactly those queries. */
function refreshFor(qc: QC, type: string) {
  const all = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  all();
  if (type.startsWith('decision.')) {
    qc.invalidateQueries({ queryKey: ['decisions'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
  }
  if (type === 'plan.published' || type === 'decision.accepted' || type === 'feedback.processed') {
    qc.invalidateQueries({ queryKey: [queryKeys.timeline] });
    qc.invalidateQueries({ queryKey: [queryKeys.trips] });
    qc.invalidateQueries({ queryKey: [queryKeys.tripSummary] });
    qc.invalidateQueries({ queryKey: [queryKeys.diff] });
    qc.invalidateQueries({ queryKey: [queryKeys.explainability] });
    qc.invalidateQueries({ queryKey: ['trip-history'] });
  }
  if (type.startsWith('feedback.') || type === 'job.failed') {
    qc.invalidateQueries({ queryKey: ['agents'] });
    qc.invalidateQueries({ queryKey: [queryKeys.agentJobs] });
  }
  if (type.startsWith('booking.')) qc.invalidateQueries({ queryKey: ['bookings'] });
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: phase3Service.notifications, refetchInterval: 60000 });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) => phase3Service.markRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/**
 * Opens the live stream while signed in. New notices refresh the screens they affect and are handed
 * back as toasts. Falls back to the 60 second refresh above if the stream cannot connect.
 */
export function useLiveNotifications() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [live, setLive] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    if (!token) return;
    const url = `${ENV.API_URL}/notifications/stream?token=${encodeURIComponent(token)}${last.current ? `&after=${last.current}` : ''}`;
    const es = new EventSource(url);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.addEventListener('notification', (e) => {
      try {
        const n = JSON.parse((e as MessageEvent).data) as NotificationItem;
        last.current = Math.max(last.current, n.id);
        refreshFor(qc, n.type);
        setToasts((t) => [...t.slice(-3), n]);
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 7000);
      } catch {
        /* a malformed event is ignored; the next refresh catches up */
      }
    });
    return () => {
      es.close();
      setLive(false);
    };
  }, [token, qc]);

  return { toasts, dismiss: (id: number) => setToasts((t) => t.filter((x) => x.id !== id)), live };
}

export function useWebhooks() {
  return useQuery({ queryKey: ['webhooks'], queryFn: phase3Service.webhooks });
}

export function useWebhookDeliveries(id?: string) {
  return useQuery({ queryKey: ['webhook-deliveries', id], queryFn: () => phase3Service.deliveries(id as string), enabled: !!id, refetchInterval: 8000 });
}

export function useWebhookActions() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['webhooks'] });
    qc.invalidateQueries({ queryKey: ['webhook-deliveries'] });
  };
  return {
    create: useMutation({ mutationFn: phase3Service.createWebhook, onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: Parameters<typeof phase3Service.updateWebhook>[1] }) => phase3Service.updateWebhook(id, body), onSuccess: refresh }),
    remove: useMutation({ mutationFn: phase3Service.deleteWebhook, onSuccess: refresh }),
    test: useMutation({ mutationFn: phase3Service.testWebhook, onSuccess: refresh }),
  };
}

export function useAllBookings() {
  return useQuery({ queryKey: ['bookings', 'all'], queryFn: phase3Service.allBookings });
}

export function useTripBookings(tripId: string) {
  return useQuery({ queryKey: ['bookings', tripId], queryFn: () => phase3Service.tripBookings(tripId), enabled: !!tripId });
}

export function useBookingActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['bookings'] });
  return {
    create: useMutation({ mutationFn: (b: NewBooking) => phase3Service.createBooking(b), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: Parameters<typeof phase3Service.updateBooking>[1] }) => phase3Service.updateBooking(id, body), onSuccess: refresh }),
    remove: useMutation({ mutationFn: phase3Service.deleteBooking, onSuccess: refresh }),
  };
}

export function useAgentsOverview() {
  return useQuery({ queryKey: ['agents'], queryFn: phase3Service.agents, refetchInterval: 5000 });
}

export function useTripGroup(tripId: string) {
  return useQuery({ queryKey: ['group', tripId], queryFn: () => phase3Service.group(tripId), enabled: !!tripId });
}

export function useEngine() {
  return useQuery({ queryKey: ['engine'], queryFn: phase3Service.engine, staleTime: 60000 });
}

export function useTripNotes(tripId: string) {
  return useQuery({ queryKey: ['notes', tripId], queryFn: () => phase3Service.notes(tripId), enabled: !!tripId });
}

export function useOpenTasks(enabled = true) {
  return useQuery({ queryKey: ['tasks'], queryFn: phase3Service.tasks, enabled, refetchInterval: 30000 });
}

export function useNoteActions(tripId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['notes', tripId] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };
  return {
    add: useMutation({ mutationFn: (b: { kind: 'note' | 'task'; text: string; due_on?: string | null }) => phase3Service.addNote(tripId, b), onSuccess: refresh }),
    toggle: useMutation({ mutationFn: ({ id, done }: { id: string; done: boolean }) => phase3Service.toggleNote(id, done), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => phase3Service.deleteNote(id), onSuccess: refresh }),
  };
}
