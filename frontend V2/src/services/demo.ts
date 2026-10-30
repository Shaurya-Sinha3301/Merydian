import apiClient from './client';
import type { DemoPersonaDTO } from '../types/dto/agent';
import type { AuthUser } from '../stores/auth.store';

export interface DemoSession {
  status: string;
  access_token: string;
  user: AuthUser;
}

export const demoService = {
  listPersonas: async (): Promise<DemoPersonaDTO[]> => {
    const response = await apiClient.get<{ personas: DemoPersonaDTO[] }>('/demo/personas');
    return response.data.personas;
  },

  enter: async (personaId: string): Promise<DemoSession> => {
    const response = await apiClient.post<DemoSession>(`/demo/load/${personaId}`);
    return response.data;
  },
};
