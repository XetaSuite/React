import { httpClient } from '@/shared/api';
import { API_ENDPOINTS } from '@/shared/api';
import type { PersonalAccessToken, CreateTokenFormData, CreateTokenResponse } from '../types';

export const TokenRepository = {
    getAll: async (): Promise<{ data: PersonalAccessToken[] }> => {
        const response = await httpClient.get<{ data: PersonalAccessToken[] }>(API_ENDPOINTS.TOKENS.BASE);
        return response.data;
    },

    create: async (data: CreateTokenFormData): Promise<CreateTokenResponse> => {
        const response = await httpClient.post<CreateTokenResponse>(API_ENDPOINTS.TOKENS.BASE, data);
        return response.data;
    },

    revoke: async (id: number): Promise<void> => {
        await httpClient.delete(API_ENDPOINTS.TOKENS.DETAIL(id));
    },
};
