import { createContext } from 'react';
import type { AppConfig } from '@/shared/types';

export interface AppConfigContextType {
    config: AppConfig | null;
    isLoading: boolean;
    isDemoMode: boolean;
}

export const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);
