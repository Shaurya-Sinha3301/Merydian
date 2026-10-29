import apiClient from './client';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  family_id?: string | null;
  is_active?: boolean;
}

export const usersService = {
  getMe: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/me');
    return response.data;
  },
};
