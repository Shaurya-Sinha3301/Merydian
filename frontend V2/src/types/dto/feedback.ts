export interface EventResponse {
  event_id: string;
  status: 'queued' | 'processed' | 'failed';
}

export interface FeedbackRequest {
  rating: number;
  comment: string;
  node_id: string;
}

export interface FeedbackResponse {
  message: string;
  event_created: EventResponse;
}
