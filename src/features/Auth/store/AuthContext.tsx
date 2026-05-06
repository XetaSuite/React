import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '@/shared/types';
import type { LoginCredentials, ForgotPasswordData, ResetPasswordData } from '../types';
import type { AuthContextType } from './types';
import { AuthManager } from '../services';
import { AuthContext } from './authContextInstance';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { i18n } = useTranslation();
    const hasCheckedAuth = useRef(false);

    const isAuthenticated = user !== null;

    // Sync i18next with user's locale preference (only on login/initial load)
    const syncLocale = useCallback((userLocale: string | undefined) => {
        if (userLocale && ['fr', 'en'].includes(userLocale) && i18n.language !== userLocale) {
            i18n.changeLanguage(userLocale);
        }
    }, [i18n]);

    // Force fetch user from API (used after login)
    const fetchUser = useCallback(async () => {
        try {
            const userData = await AuthManager.getUser();
            setUser(userData);
            syncLocale(userData.locale);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, [syncLocale]);

    const checkAuth = useCallback(async () => {
        // Always try to fetch user from API
        // The browser will automatically send session cookies via the proxy
        // We can't check cookies from JS due to cross-domain restrictions (localhost vs xetasuite.test)
        await fetchUser();
    }, [fetchUser]);

    // Initial auth check on mount - only runs once
    useEffect(() => {
        if (hasCheckedAuth.current) return;
        hasCheckedAuth.current = true;
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (credentials: LoginCredentials) => {
        await AuthManager.login(credentials);
        await fetchUser();
    }, [fetchUser]);

    const logout = useCallback(async () => {
        try {
            await AuthManager.logout();
        } finally {
            setUser(null);
        }
    }, []);

    const forgotPassword = useCallback(async (data: ForgotPasswordData) => {
        await AuthManager.forgotPassword(data);
    }, []);

    const resetPassword = useCallback(async (data: ResetPasswordData) => {
        await AuthManager.resetPassword(data);
    }, []);

    const switchSite = useCallback(async (siteId: number) => {
        const updatedUser = await AuthManager.updateSite(siteId);
        setUser(updatedUser);
    }, []);

    // Permission and role helpers using AuthManager
    const hasRole = useCallback((role: string): boolean => {
        return AuthManager.hasRole(user, role);
    }, [user]);

    const hasPermission = useCallback((permission: string): boolean => {
        return AuthManager.hasPermission(user, permission);
    }, [user]);

    const hasAnyRole = useCallback((roles: string[]): boolean => {
        return AuthManager.hasAnyRole(user, roles);
    }, [user]);

    const hasAnyPermission = useCallback((permissions: string[]): boolean => {
        return AuthManager.hasAnyPermission(user, permissions);
    }, [user]);

    const isOnHeadquarters = AuthManager.isOnHeadquarters(user);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        forgotPassword,
        resetPassword,
        checkAuth,
        switchSite,
        hasRole,
        hasPermission,
        hasAnyRole,
        hasAnyPermission,
        isOnHeadquarters,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
