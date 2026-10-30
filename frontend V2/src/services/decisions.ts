import apiClient from './client';

export interface DecisionOption {
  option_id: string;
  summary: string;
  cost: number;
  satisfaction: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  details: { schedule_changes?: Array<Record<string, unknown>>; type?: string; [key: string]: unknown };
}

export interface Decision {
  event_id: string;
  trip_id: string;
  trip_name?: string | null;
  kind: 'first_plan' | 'change_request';
  status: 'pending' | 'accepted' | 'declined';
  request?: string | null;
  created_at?: string | null;
  decided_at?: string | null;
  current_cost?: number | null;
  current_fit?: number | null;
  options: DecisionOption[];
}

export interface Analytics {
  generated_at: string;
  totals: {
    trips: number;
    published_trips: number;
    families: number;
    travellers: number;
    children: number;
    plan_value: number | null;
    avg_cost: number | null;
    avg_cost_per_day: number | null;
    avg_cost_per_traveller: number | null;
    avg_fit: number | null;
    avg_versions: number | null;
    feedback_rounds: number;
    replanned_trips: number;
    saved_by_replanning: number | null;
    added_by_replanning: number | null;
  };
  approvals: {
    pending: number;
    accepted: number;
    declined: number;
    first_plans: number;
    change_requests: number;
    acceptance_rate: number | null;
    median_hours_to_decide: number | null;
    oldest_pending_hours: number | null;
    approved_value: number | null;
  };
  jobs: {
    total: number;
    success_rate: number | null;
    by_type: Array<{ job_type: string; total: number; completed: number; failed: number; retried: number; avg_seconds: number | null }>;
  };
  trips: Array<{
    trip_id: string;
    trip_name?: string | null;
    start_date?: string | null;
    days?: number | null;
    members: number;
    children: number;
    versions: number;
    feedback: number;
    cost?: number | null;
    first_cost?: number | null;
    fit?: number | null;
    first_fit?: number | null;
    per_day?: number | null;
    per_traveller?: number | null;
    published: boolean;
  }>;
  by_month: Array<{ month: string; trips: number; value: number | null }>;
  version_lines: Array<{ trip_name?: string | null; points: Array<{ version: number; cost?: number | null; fit?: number | null }> }>;
  stops: {
    most_scheduled: Array<{ location_id: string; name: string; count: number }>;
    most_added: Array<{ location_id: string; name: string; count: number }>;
    most_dropped: Array<{ location_id: string; name: string; count: number }>;
    by_category: Array<{ category: string; stops: number; cost: number | null }>;
  };
  customers: {
    party_sizes: Array<{ size: number; families: number }>;
    pace: Array<{ pace: string; families: number }>;
    interests: Array<{ interest: string; average: number | null }>;
    children_share: number | null;
  };
  activity: Array<{ day: string; feedback: number; replans: number }>;
}

export const decisionsService = {
  list: async (status?: string): Promise<Decision[]> =>
    (await apiClient.get<{ decisions: Decision[] }>('/agent/decisions', { params: status ? { status } : {} })).data.decisions,
  decline: async (eventId: string, reason?: string) =>
    (await apiClient.post('/agent/itinerary/reject', { event_id: eventId, reason })).data,
  analytics: async (): Promise<Analytics> => (await apiClient.get<Analytics>('/agent/analytics')).data,
  requestPlace: async (poiName: string, note?: string) =>
    (await apiClient.post<{ message: string; request_id: string }>('/itinerary/poi-request', { poi_name: poiName, note, urgency: 'medium' }, { timeout: 120_000 })).data,
};
