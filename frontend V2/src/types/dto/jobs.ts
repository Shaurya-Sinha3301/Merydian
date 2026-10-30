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
