import { createContext } from 'react';
import type { AppSettings } from '../types';

export interface SettingsContextValue {
    settings: AppSettings;
    isLoading: boolean;
    error: string | null;
    refreshSettings: () => Promise<void>;
    getCurrency: () => string;
    getCurrencySymbol: () => string;
    formatPrice: (amount: number) => string;
    isLoginEnabled: () => boolean;
}

export const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);
