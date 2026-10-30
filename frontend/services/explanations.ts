import { client } from './client';
import { ExplanationDTO } from '../types/dto';

export const explanationsService = {
  getExplanation: (explanationId: string) => 
    client.get<ExplanationDTO>(`/explanations/${encodeURIComponent(explanationId)}`),
    
  getTripExplanations: (tripId: string) => 
    client.get<ExplanationDTO[]>(`/trips/${encodeURIComponent(tripId)}/explanations`),
};
