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
