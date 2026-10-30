import apiClient from './client';

export interface SettingsView {
  email: string;
  full_name?: string | null;
  role: string;
  phone?: string | null;
  email_enabled: boolean;
  sms_enabled: boolean;
  email_types: string[];
  sms_types: string[];
  channels: { email: boolean; sms: boolean };
  event_types: Array<{ name: string; description: string }>;
  agency?: { id: string; name: string; join_code?: string | null } | null;
}

export interface MessageRow {
  id: string;
  channel: 'email' | 'sms';
  to: string;
  subject?: string | null;
  kind: string;
  status: 'queued' | 'sent' | 'logged' | 'failed';
  provider?: string | null;
  error?: string | null;
  created_at: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at?: string | null;
  revoked: boolean;
  key?: string;
}

export interface ExpenseView {
  families: Array<{ family_id: string; name: string; paid: number; share: number; net: number; you: boolean }>;
  expenses: Array<{ id: string; title: string; amount: number; paid_by: string; paid_by_name: string; split_among: string[]; created_at: string }>;
  total: number;
  settlements: Array<{ from: string; from_name: string; to: string; to_name: string; amount: number }>;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  added_by?: string | null;
  created_at: string;
}

export const phase4Service = {
  settings: async (): Promise<SettingsView> => (await apiClient.get('/settings')).data,
  saveSettings: async (body: Partial<Pick<SettingsView, 'full_name' | 'phone' | 'email_enabled' | 'sms_enabled' | 'email_types' | 'sms_types'>>): Promise<SettingsView> =>
    (await apiClient.put('/settings', body)).data,
  testMessage: async (channel: 'email' | 'sms') => (await apiClient.post('/settings/test', { channel })).data,
  messages: async (): Promise<{ messages: MessageRow[]; channels: { email: boolean; sms: boolean } }> => (await apiClient.get('/settings/messages')).data,

  forgot: async (email: string) => (await apiClient.post('/auth/forgot', { email })).data,
  tokenInfo: async (token: string): Promise<{ purpose: 'reset' | 'invite'; email?: string | null; full_name?: string | null }> => (await apiClient.get('/auth/token-info', { params: { token } })).data,
  reset: async (token: string, password: string): Promise<{ message: string; email: string }> => (await apiClient.post('/auth/reset', { token, password })).data,
  resendInvite: async (familyId: string): Promise<{ invite_link: string; email_configured: boolean }> => (await apiClient.post(`/agent/customers/${familyId}/invite`)).data,

  keys: async (): Promise<{ keys: ApiKeyRow[] }> => (await apiClient.get('/agent/api-keys')).data,
  createKey: async (name: string): Promise<ApiKeyRow> => (await apiClient.post('/agent/api-keys', { name })).data,
  revokeKey: async (id: string) => (await apiClient.delete(`/agent/api-keys/${id}`)).data,

  expenses: async (tripId: string): Promise<ExpenseView> => (await apiClient.get(`/trips/${tripId}/expenses`)).data,
  addExpense: async (tripId: string, body: { title: string; amount: number; paid_by?: string }) => (await apiClient.post(`/trips/${tripId}/expenses`, body)).data,
  deleteExpense: async (tripId: string, id: string) => (await apiClient.delete(`/trips/${tripId}/expenses/${id}`)).data,
  checklist: async (tripId: string): Promise<{ items: ChecklistItem[] }> => (await apiClient.get(`/trips/${tripId}/checklist`)).data,
  addItem: async (tripId: string, text: string) => (await apiClient.post(`/trips/${tripId}/checklist`, { text })).data,
  tick: async (tripId: string, id: string, done: boolean) => (await apiClient.patch(`/trips/${tripId}/checklist/${id}`, null, { params: { done } })).data,
  removeItem: async (tripId: string, id: string) => (await apiClient.delete(`/trips/${tripId}/checklist/${id}`)).data,
};
