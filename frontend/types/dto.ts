export interface TripSummaryDTO {
  trip_id: string;
  trip_name?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  iteration_count: number;
}

export interface TimelineActivityDTO {
  id: string;
  title: string;
  location: string;
  category: string;
  start_time?: string;
  end_time?: string;
  duration_min: number;
  travel_time_min: number;
  travel_mode?: string;
  reason_added?: string;
  reason_modified?: string;
  notes?: string;
  warnings?: string[];
}

export interface TimelineDayDTO {
  day: number;
  activities: TimelineActivityDTO[];
}

export interface TimelineDTO {
  trip_id: string;
  days: TimelineDayDTO[];
}

export interface JobDTO {
  job_id: string;
  status: string;
  current_stage: string;
  progress_percentage: number;
  description: string;
  created_at: string;
  updated_at: string;
  estimated_remaining_seconds?: number;
  result_available: boolean;
}

export interface ExplanationDTO {
  id: string;
  day?: number;
  activity_changed: string;
  previous_value?: string;
  new_value?: string;
  reason: string;
  affected_constraints: string[];
  confidence: number;
  human_explanation: string;
}

export interface DiffItemDTO {
  before?: Partial<TimelineActivityDTO & {day: number}>;
  after?: Partial<TimelineActivityDTO & {day: number}>;
  reason?: string;
  importance: string;
  affected_constraints: string[];
}

export interface DiffDTO {
  trip_id: string;
  version_a: number;
  version_b: number;
  added_activities: DiffItemDTO[];
  removed_activities: DiffItemDTO[];
  moved_activities: DiffItemDTO[];
  time_changes: DiffItemDTO[];
  hotel_changes: DiffItemDTO[];
  transport_changes: DiffItemDTO[];
}
