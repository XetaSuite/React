import { Navigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth';
import { safeRedirectPath } from '@/shared/utils';
import type { ReactNode } from 'react';

interface RequireAuthProps {
    children: ReactNode;
    roles?: string[];
    permissions?: string[];
}

/**
 * Loading screen component displayed while checking auth state
 */
export function LoadingScreen() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen flex items-center justify-center bg-body-bg">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-200 border-t-brand-600"></div>
                <p className="text-slate-600">{t('common.loading')}</p>
            </div>
        </div>
    );
}

/**
 * Component to protect routes that require authentication
 */
export function RequireAuth({ children, roles, permissions }: RequireAuthProps) {
    const { isAuthenticated, isLoading, hasAnyRole, hasAnyPermission } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (roles && roles.length > 0 && !hasAnyRole(roles)) {
        return <Navigate to="/" replace />;
    }

    if (permissions && permissions.length > 0 && !hasAnyPermission(permissions)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

/**
 * Component to redirect authenticated users away from auth pages
 */
export function RequireGuest({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isAuthenticated) {
        const from = location.state as { from?: { pathname: string; search?: string } } | null;
        const candidate = from?.from ? `${from.from.pathname}${from.from.search || ''}` : '/';
        const redirectTo = safeRedirectPath(candidate, '/');
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}
