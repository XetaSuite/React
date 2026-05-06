import { handleApiError } from '@/shared/api';
import type { ManagerResult } from '@/shared/types';
import type { PersonalAccessToken, CreateTokenFormData, CreateTokenResponse } from '../types';
import { TokenRepository } from './TokenRepository';

export const TokenManager = {
    getAll: async (): Promise<ManagerResult<PersonalAccessToken[]>> => {
        try {
            const response = await TokenRepository.getAll();
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: handleApiError(error) };
        }
    },

    create: async (data: CreateTokenFormData): Promise<ManagerResult<CreateTokenResponse>> => {
        try {
            const response = await TokenRepository.create(data);
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: handleApiError(error) };
        }
    },

    revoke: async (id: number): Promise<ManagerResult<void>> => {
        try {
            await TokenRepository.revoke(id);
            return { success: true, data: undefined };
        } catch (error) {
            return { success: false, error: handleApiError(error) };
        }
    },
};
