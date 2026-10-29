export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  skip?: number;
  offset?: number;
}

export interface FeedbackHistoryEntry {
  iteration?: number;
  timestamp?: string;
  family_id?: string;
  message?: string;
  event_type?: string;
  action?: string;
}

export interface TripDetailResponse {
  trip_id: string;
  trip_name?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  iteration_count?: number;
  family_id?: string | null;
  families?: string[];
  feedback_count?: number;
  last_updated?: string | null;
  current_version?: number | null;
  total_cost?: number | null;
  total_satisfaction?: number | null;
  duration_days?: number | null;
  feedback_history?: FeedbackHistoryEntry[];
}
