import apiClient from './client';
import type { DiffDTO } from '../types/dto/diff';

export const diffService = {
  // family_id is only honoured for agents; travellers always diff their own family
  getDiff: async (familyId: string | undefined, versionA: number, versionB: number): Promise<DiffDTO> => {
    const response = await apiClient.get<DiffDTO>('/itinerary/diff', {
      params: { version_a: versionA, version_b: versionB, ...(familyId ? { family_id: familyId } : {}) },
    });
    return response.data;
  },
};
