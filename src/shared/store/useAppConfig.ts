import { useContext } from 'react';
import { AppConfigContext, type AppConfigContextType } from './appConfigContextInstance';

export function useAppConfig(): AppConfigContextType {
    const context = useContext(AppConfigContext);

    if (context === undefined) {
        throw new Error('useAppConfig must be used within an AppConfigProvider');
    }

    return context;
}
