import { useContext } from 'react';
import { AuthContext } from '../store/authContextInstance';
import type { AuthContextType } from '../store/types';

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
