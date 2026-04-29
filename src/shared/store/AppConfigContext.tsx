import { useEffect, useState, type ReactNode } from 'react';
import httpClient from '@/shared/api/httpClient';
import { API_ENDPOINTS } from '@/shared/api/urlBuilder';
import type { AppConfig } from '@/shared/types';
import { AppConfigContext, type AppConfigContextType } from './appConfigContextInstance';

interface AppConfigProviderProps {
    children: ReactNode;
}

export function AppConfigProvider({ children }: AppConfigProviderProps) {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await httpClient.get<AppConfig>(API_ENDPOINTS.APP.CONFIG);
                setConfig(response.data);
            } catch {
                // Set default values on error
                setConfig({
                    demo_mode: false,
                    app_name: 'XetaSuite',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const value: AppConfigContextType = {
        config,
        isLoading,
        isDemoMode: config?.demo_mode ?? false,
    };

    return (
        <AppConfigContext.Provider value={value}>
            {children}
        </AppConfigContext.Provider>
    );
}
