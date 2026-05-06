import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { SettingsManager } from '../services';
import { useAuth } from '@/features/Auth/hooks';
import { SettingsContext, type SettingsContextValue } from './settingsContextInstance';

interface SettingsProviderProps {
    children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSettings = useCallback(async () => {
        // Don't fetch settings if user is not authenticated
        if (!isAuthenticated) {
            setSettings(DEFAULT_SETTINGS);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await SettingsManager.getPublic();
            setSettings(data);
        } catch {
            setError('Failed to load settings');
            setSettings(DEFAULT_SETTINGS);
        }

        setIsLoading(false);
    }, [isAuthenticated]);

    useEffect(() => {
        // Wait for auth check to complete before loading settings
        if (isAuthLoading) {
            return;
        }

        loadSettings();
    }, [loadSettings, isAuthLoading]);

    const getCurrency = useCallback(() => {
        return settings.currency || DEFAULT_SETTINGS.currency;
    }, [settings.currency]);

    const getCurrencySymbol = useCallback(() => {
        return settings.currency_symbol || DEFAULT_SETTINGS.currency_symbol;
    }, [settings.currency_symbol]);

    const formatPrice = useCallback((amount: number) => {
        const symbol = getCurrencySymbol();
        const formattedAmount = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);

        return `${formattedAmount} ${symbol}`;
    }, [getCurrencySymbol]);

    const isLoginEnabled = useCallback(() => {
        return settings.login_enabled ?? DEFAULT_SETTINGS.login_enabled;
    }, [settings.login_enabled]);

    const value: SettingsContextValue = {
        settings,
        isLoading,
        error,
        refreshSettings: loadSettings,
        getCurrency,
        getCurrencySymbol,
        formatPrice,
        isLoginEnabled,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}
