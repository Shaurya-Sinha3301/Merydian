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
