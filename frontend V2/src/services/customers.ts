import apiClient from './client';

export interface CustomerDTO {
  user_id: string;
  email: string;
  full_name?: string | null;
  family_id?: string | null;
  family_code?: string | null;
  members: number;
  children: number;
  trip_count: number;
}

export interface NewCustomer {
  email: string;
  full_name?: string;
  members: number;
  children: number;
  initial_location?: string;
}

export interface CustomerCreated {
  message: string;
  family_code: string;
  user_id: string;
  family_id: string;
  temporary_password?: string | null;
  invite_link?: string | null;
}

export interface TripRequestBody {
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  members: number;
  children: number;
  interests: Record<string, number>;
  pace: string;
  budget_sensitivity: number;
  energy_level: number;
}

export interface TripRequestResult {
  trip_id: string;
  option_id: string;
  published: boolean;
  message: string;
}

export interface AgentTripBody {
  trip_name: string;
  destination: string;
  start_date: string;
  end_date: string;
  family_ids: string[];
  num_travellers?: number;
}

export interface AgentTripResult {
  trip_id: string;
  option_id: string;
  optimizer_ran: boolean;
  message: string;
  summary: { estimated_cost?: number; predicted_satisfaction?: number; trip_duration_days?: number };
}

export const customersService = {
  list: async (): Promise<CustomerDTO[]> => (await apiClient.get<{ customers: CustomerDTO[] }>('/agent/customers')).data.customers,

  create: async (body: NewCustomer): Promise<CustomerCreated> => (await apiClient.post<CustomerCreated>('/agent/customers', body)).data,

  /** A traveller plans their own trip. Builds the plan with the optimizer, so it can take a while. */
  requestTrip: async (body: TripRequestBody): Promise<TripRequestResult> =>
    (await apiClient.post<TripRequestResult>('/trips/request', body, { timeout: 180_000 })).data,

  /** An agent plans a trip for one or more customers' families. */
  createTrip: async (body: AgentTripBody): Promise<AgentTripResult> =>
    (await apiClient.post<AgentTripResult>('/trips/initialize-with-optimization', body, { timeout: 180_000 })).data,
};

export interface CustomerDetail {
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  family_id: string;
  family_code: string;
  preferences: {
    members?: number;
    children?: number;
    interest_vector?: Record<string, number>;
    pace_preference?: string;
    budget_sensitivity?: number;
    energy_level?: number;
    must_visit_locations?: string[];
    never_visit_locations?: string[];
    [key: string]: unknown;
  };
  members: Array<{ id: string; email: string; full_name?: string | null; role: string }>;
  trips: Array<{
    trip_id: string;
    trip_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    current_version?: number | null;
    total_cost?: number | null;
    status?: string | null;
    feedback_count: number;
  }>;
}

export type PreferencesPatch = Partial<
  Pick<CustomerDetail['preferences'], 'members' | 'children' | 'interest_vector' | 'pace_preference' | 'budget_sensitivity' | 'energy_level' | 'must_visit_locations' | 'never_visit_locations'>
>;

export interface TripHistory {
  trip_id: string;
  versions: Array<{
    version: number;
    created_at?: string | null;
    created_reason?: string | null;
    created_by?: string | null;
    total_cost?: number | null;
    total_satisfaction?: number | null;
    duration_days?: number | null;
  }>;
  feedback: Array<{ iteration?: number | null; timestamp?: string | null; message?: string | null; event_type?: string | null; action?: string | null }>;
}

export const customerDetailService = {
  get: async (familyId: string): Promise<CustomerDetail> => (await apiClient.get<CustomerDetail>(`/agent/customers/${familyId}`)).data,
  savePreferences: async (familyId: string, patch: PreferencesPatch): Promise<CustomerDetail> =>
    (await apiClient.put<CustomerDetail>(`/agent/customers/${familyId}/preferences`, patch)).data,
  tripHistory: async (tripId: string): Promise<TripHistory> => (await apiClient.get<TripHistory>(`/trips/${tripId}/history`)).data,
};
