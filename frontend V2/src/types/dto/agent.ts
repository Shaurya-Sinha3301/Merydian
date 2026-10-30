export interface AgentJobDTO {
  job_id: string;
  status: string;
  job_type?: string | null;
  trip_id?: string | null;
  itinerary_id?: string | null;
  attempt_count?: number | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface AgentJobListDTO {
  jobs: AgentJobDTO[];
}

export interface ItineraryOptionDTO {
  option_id: string;
  summary: string;
  cost: number;
  satisfaction: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  details: {
    affected_pois?: string[];
    schedule_changes?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

export interface ItineraryOptionsDTO {
  options: ItineraryOptionDTO[];
}

export interface ApproveResponseDTO {
  message: string;
  option_id: string;
  status: string;
  tools_job_id?: string | null;
  communication_job_id?: string | null;
}

export interface DemoPersonaDTO {
  id: string;
  role: 'agent' | 'traveller';
  title: string;
  description: string;
}
