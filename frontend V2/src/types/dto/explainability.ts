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
  change_type?: string | null;
  cost_delta?: { extra_cost?: number; saved_cost?: number; currency?: string } | null;
  satisfaction_delta?: { gain?: number } | null;
  trigger_message?: string | null;
  itinerary_id?: string | null;
}
