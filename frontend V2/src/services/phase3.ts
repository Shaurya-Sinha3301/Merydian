import apiClient from './client';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  created_at: string;
  read: boolean;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  format: 'json' | 'slack' | 'discord';
  events: string[];
  active: boolean;
  last_status?: string | null;
  last_delivery_at?: string | null;
  created_at: string;
  secret_hint: string;
  secret?: string;
}

export interface WebhookList {
  endpoints: WebhookEndpoint[];
  events: Array<{ name: string; description: string }>;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  ok: boolean;
  status_code?: number | null;
  error?: string | null;
  attempts: number;
  duration_ms?: number | null;
  created_at: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  trip_name?: string | null;
  kind: 'hotel' | 'flight' | 'transport' | 'activity' | 'other';
  title: string;
  supplier?: string | null;
  reference?: string | null;
  amount: number;
  currency: string;
  status: 'requested' | 'confirmed' | 'cancelled';
  starts_on?: string | null;
  ends_on?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type NewBooking = {
  trip_id: string;
  kind: Booking['kind'];
  title: string;
  supplier?: string;
  reference?: string;
  amount: number;
  status: Booking['status'];
  starts_on?: string | null;
  notes?: string;
};

export interface AgentRoster {
  id: string;
  name: string;
  does: string;
  uses: string;
  total: number;
  completed: number;
  failed: number;
  running: number;
  retried: number;
  avg_seconds?: number | null;
  last_run?: string | null;
  last_status?: string | null;
  state: 'working' | 'failing' | 'idle' | 'unused';
}

export interface AgentJobRow {
  job_id: string;
  agent: string;
  status: string;
  trip_id?: string | null;
  trip_name?: string | null;
  attempts?: number | null;
  created_at: string;
  duration_s?: number | null;
  error?: string | null;
  message?: string | null;
  decision?: string | null;
  reason?: string | null;
  understood: string[];
  optimizer?: string | null;
}

export interface GroupStop {
  location_id: string;
  name: string;
  start?: string | null;
  end?: string | null;
  meal: boolean;
  families: string[];
  shared: boolean;
}

export interface GroupView {
  trip_id: string;
  families: Array<{ family_id: string; code: string; name: string; members: number; children: number; pace?: string | null; version?: number | null; cost?: number | null; fit?: number | null; you: boolean }>;
  days: Array<{ day: number; stops: GroupStop[] }>;
  summary: { families: number; shared_stops: number; branch_stops: number };
}

export interface TripNote {
  id: string;
  trip_id: string;
  trip_name?: string | null;
  kind: 'note' | 'task';
  text: string;
  author?: string | null;
  due_on?: string | null;
  done: boolean;
  created_at: string;
}

export interface EngineStats {
  benchmark: {
    benchmark_scale: number;
    median_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    success_rate: number;
    average_satisfaction: number;
    memory_mb: number;
  } | null;
  live: { feedback_jobs: number; median_seconds: number | null; p95_seconds: number | null };
}

export const phase3Service = {
  notifications: async (): Promise<{ notifications: NotificationItem[]; unread: number }> => (await apiClient.get('/notifications')).data,
  markRead: async (ids?: number[]) => (await apiClient.post('/notifications/read', ids ?? null)).data,

  webhooks: async (): Promise<WebhookList> => (await apiClient.get('/agent/webhooks')).data,
  createWebhook: async (body: { name: string; url: string; format: string; events: string[] }): Promise<WebhookEndpoint> => (await apiClient.post('/agent/webhooks', body)).data,
  updateWebhook: async (id: string, body: Partial<{ name: string; url: string; format: string; events: string[]; active: boolean }>): Promise<WebhookEndpoint> =>
    (await apiClient.patch(`/agent/webhooks/${id}`, body)).data,
  deleteWebhook: async (id: string) => (await apiClient.delete(`/agent/webhooks/${id}`)).data,
  testWebhook: async (id: string): Promise<{ ok: boolean; status_code?: number; error?: string; attempts: number; duration_ms?: number }> =>
    (await apiClient.post(`/agent/webhooks/${id}/test`, null, { timeout: 60_000 })).data,
  deliveries: async (id: string): Promise<{ deliveries: WebhookDelivery[] }> => (await apiClient.get(`/agent/webhooks/${id}/deliveries`)).data,

  allBookings: async (): Promise<{ bookings: Booking[]; totals: { confirmed: number; requested: number; count: number } }> => (await apiClient.get('/agent/bookings')).data,
  tripBookings: async (tripId: string): Promise<{ bookings: Booking[] }> => (await apiClient.get(`/trips/${tripId}/bookings`)).data,
  createBooking: async (body: NewBooking): Promise<Booking> => (await apiClient.post('/agent/bookings', body)).data,
  updateBooking: async (id: string, body: Partial<Pick<Booking, 'status' | 'reference' | 'amount' | 'title' | 'supplier' | 'notes'>>): Promise<Booking> =>
    (await apiClient.patch(`/agent/bookings/${id}`, body)).data,
  deleteBooking: async (id: string) => (await apiClient.delete(`/agent/bookings/${id}`)).data,

  agents: async (): Promise<{ agents: AgentRoster[]; recent: AgentJobRow[] }> => (await apiClient.get('/agent/agents')).data,

  group: async (tripId: string): Promise<GroupView> => (await apiClient.get(`/trips/${tripId}/group`)).data,
  notes: async (tripId: string): Promise<{ notes: TripNote[] }> => (await apiClient.get(`/agent/trips/${tripId}/notes`)).data,
  addNote: async (tripId: string, body: { kind: 'note' | 'task'; text: string; due_on?: string | null }): Promise<TripNote> => (await apiClient.post(`/agent/trips/${tripId}/notes`, body)).data,
  toggleNote: async (id: string, done: boolean): Promise<TripNote> => (await apiClient.patch(`/agent/notes/${id}`, null, { params: { done } })).data,
  deleteNote: async (id: string) => (await apiClient.delete(`/agent/notes/${id}`)).data,
  tasks: async (): Promise<{ tasks: TripNote[] }> => (await apiClient.get('/agent/tasks')).data,
  engine: async (): Promise<EngineStats> => (await apiClient.get('/agent/engine')).data,
};
