import axios from 'axios';
import type { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { showError } from '@/shared/utils/toast';
import { API_ENDPOINTS } from './urlBuilder';

/**
 * HTTP Client - Base API configuration for the application
 * This is the lowest level of the Data Layer, providing HTTP communication
 */

const httpClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true,
    withXSRFToken: true,
});

/**
 * Flag to control whether to show toast on server errors
 * Can be set per-request using config.meta.showErrorToast = false
 * Set config.meta.redirectOnForbidden = true to keep legacy behavior
 * (full-page redirect on 403). By default we only emit a toast so that a
 * single failing background request doesn't kick the user out of the app.
 */
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    meta?: {
        showErrorToast?: boolean;
        redirectOnForbidden?: boolean;
    };
}

/**
 * Check if the request URL is an auth endpoint
 * (to avoid redirect loops during login/logout)
 */
const isAuthEndpoint = (url: string | undefined): boolean => {
    if (!url) return false;
    return Object.values(API_ENDPOINTS.AUTH).some(endpoint =>
        typeof endpoint === 'string' && url.includes(endpoint)
    );
};

/**
 * Check if we're already on an auth page (to avoid redirect loops)
 */
const isOnAuthPage = (): boolean => {
    return window.location.pathname.startsWith('/auth');
};

/**
 * Response interceptor to handle global error notifications and auth redirects
 */
httpClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const config = error.config as CustomAxiosRequestConfig | undefined;
        const shouldShowToast = config?.meta?.showErrorToast !== false;

        // Handle 401 Unauthorized - redirect to login page
        // Skip redirect if already on auth page or calling auth endpoints
        if (error.response?.status === 401 && !isAuthEndpoint(config?.url) && !isOnAuthPage()) {
            // Clear any stale state and redirect to login
            window.location.href = '/auth/login';
            return Promise.reject(error);
        }

        // Handle 403 Forbidden:
        // - Do NOT auto-redirect on background XHR (UX hostile + makes a single
        //   failed poll log the user out). Just emit a toast.
        // - Opt-in redirect via `meta.redirectOnForbidden = true` for explicit
        //   navigation calls.
        if (error.response?.status === 403) {
            if (config?.meta?.redirectOnForbidden) {
                window.location.href = '/';
            } else if (shouldShowToast) {
                showError('You are not allowed to perform this action.');
            }
            return Promise.reject(error);
        }

        // Only show toast for server errors (5xx) automatically
        if (shouldShowToast && error.response?.status && error.response.status >= 500) {
            showError('Server error. Please try again later.');
        }

        return Promise.reject(error);
    }
);

/**
 * Get CSRF cookie from Laravel Sanctum
 */
export const getCsrfCookie = async (): Promise<void> => {
    await httpClient.get('/sanctum/csrf-cookie');
};

/**
 * Generic request function with type safety
 */
export const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
    const response = await httpClient.request<T>(config);
    return response.data;
};

/**
 * Extract validation errors from API response as a field -> message map
 * Returns null if error is not a validation error (422)
 */
export const extractValidationErrors = (error: unknown): Record<string, string> | null => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ errors?: Record<string, string[]> }>;

        if (axiosError.response?.status === 422 && axiosError.response?.data?.errors) {
            const errors = axiosError.response.data.errors;
            const result: Record<string, string> = {};

            for (const [field, messages] of Object.entries(errors)) {
                result[field] = messages[0] || '';
            }

            return result;
        }
    }

    return null;
};

/**
 * Error handler helper - extracts meaningful error messages from API responses
 */
export const handleApiError = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;

        if (axiosError.response?.data?.message) {
            return axiosError.response.data.message;
        }

        if (axiosError.response?.data?.errors) {
            const errors = axiosError.response.data.errors;
            return Object.values(errors).flat().join(', ');
        }

        switch (axiosError.response?.status) {
            case 401:
                return 'Invalid credentials';
            case 403:
                return 'Access forbidden';
            case 404:
                return 'Resource not found';
            case 422:
                return 'Validation error';
            case 429:
                return 'Too many attempts. Please try again later.';
            case 500:
                return 'Server error. Please try again later.';
        }
    }

    return 'An unexpected error occurred';
};

/**
 * Check if error is an Axios error
 */
export const isApiError = (error: unknown): error is AxiosError => {
    return axios.isAxiosError(error);
};

export default httpClient;
