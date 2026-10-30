import { client } from './client';

export const demoService = {
  loadPersona: (personaId: string) => client.post<{ access_token: string }>(`/demo/personas/${encodeURIComponent(personaId)}/load`),
  getAvailablePersonas: () => client.get<any[]> /* eslint-disable-line @typescript-eslint/no-explicit-any */('/demo/personas'),
};
