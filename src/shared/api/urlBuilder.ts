/**
 * URL Builder utility for constructing API endpoints with query parameters
 */

export interface QueryParams {
    [key: string]: string | number | boolean | undefined | null;
}

/**
 * Build URL with query parameters
 */
export const buildUrl = (baseUrl: string, params?: QueryParams): string => {
    if (!params) return baseUrl;

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
        }
    });

    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * API endpoints constants
 */
export const API_ENDPOINTS = {
    // App Config (public, no auth required)
    APP: {
        CONFIG: '/api/v1/app/config',
    },
    // Auth
    AUTH: {
        CSRF: '/sanctum/csrf-cookie',
        USER: '/api/v1/auth/user',
        LOGIN: '/api/v1/auth/login',
        LOGOUT: '/api/v1/auth/logout',
        FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
        RESET_PASSWORD: '/api/v1/auth/reset-password',
        SETUP_PASSWORD: (id: number, hash: string) => `/api/v1/auth/setup-password/${id}/${hash}`,
        RESEND_SETUP_PASSWORD: '/api/v1/auth/setup-password-resend',
    },
    // User
    USER: {
        LOCALE: '/api/v1/user/locale',
        SITE: '/api/v1/user/site',
        PASSWORD: '/api/v1/user/password',
    },
    // Sites
    SITES: {
        BASE: '/api/v1/sites',
        DETAIL: (id: number) => `/api/v1/sites/${id}`,
        USERS: (id: number) => `/api/v1/sites/${id}/users`,
        MEMBERS: (id: number) => `/api/v1/sites/${id}/members`,
    },
    // Zones
    ZONES: {
        BASE: '/api/v1/zones',
        DETAIL: (id: number) => `/api/v1/zones/${id}`,
        CHILDREN: (id: number) => `/api/v1/zones/${id}/children`,
        MATERIALS: (id: number) => `/api/v1/zones/${id}/materials`,
        AVAILABLE_PARENTS: '/api/v1/zones/available-parents',
        TREE: '/api/v1/zones/tree',
    },
    // Materials
    MATERIALS: {
        BASE: '/api/v1/materials',
        DETAIL: (id: number) => `/api/v1/materials/${id}`,
        STATS: (id: number) => `/api/v1/materials/${id}/stats`,
        QR_CODE: (id: number) => `/api/v1/materials/${id}/qr-code`,
        INCIDENTS: (id: number) => `/api/v1/materials/${id}/incidents`,
        MAINTENANCES: (id: number) => `/api/v1/materials/${id}/maintenances`,
        CLEANINGS: (id: number) => `/api/v1/materials/${id}/cleanings`,
        ITEMS: (id: number) => `/api/v1/materials/${id}/items`,
        AVAILABLE_ZONES: '/api/v1/materials/available-zones',
        AVAILABLE_RECIPIENTS: '/api/v1/materials/available-recipients',
    },
    // Items
    ITEMS: {
        BASE: '/api/v1/items',
        DETAIL: (id: number) => `/api/v1/items/${id}`,
        STATS: (id: number) => `/api/v1/items/${id}/stats`,
        MATERIALS: (id: number) => `/api/v1/items/${id}/materials`,
        PRICE_HISTORY: (id: number) => `/api/v1/items/${id}/price-history`,
        QR_CODE: (id: number) => `/api/v1/items/${id}/qr-code`,
        AVAILABLE_COMPANIES: '/api/v1/items/available-companies',
        AVAILABLE_MATERIALS: '/api/v1/items/available-materials',
        AVAILABLE_RECIPIENTS: '/api/v1/items/available-recipients',
    },
    // Item Movements
    ITEM_MOVEMENTS: {
        ALL: '/api/v1/item-movements',
        BASE: (itemId: number) => `/api/v1/items/${itemId}/movements`,
        DETAIL: (itemId: number, movementId: number) => `/api/v1/items/${itemId}/movements/${movementId}`,
    },
    // QR Code Scan
    QR_SCAN: {
        MATERIAL: (id: number) => `/api/v1/qr-scan/material/${id}`,
        ITEM: (id: number) => `/api/v1/qr-scan/item/${id}`,
    },
    // Incidents
    INCIDENTS: {
        BASE: '/api/v1/incidents',
        DETAIL: (id: number) => `/api/v1/incidents/${id}`,
        AVAILABLE_MATERIALS: '/api/v1/incidents/available-materials',
        AVAILABLE_MAINTENANCES: '/api/v1/incidents/available-maintenances',
        SEVERITY_OPTIONS: '/api/v1/incidents/severity-options',
        STATUS_OPTIONS: '/api/v1/incidents/status-options',
    },
    // Maintenances
    MAINTENANCES: {
        BASE: '/api/v1/maintenances',
        DETAIL: (id: number) => `/api/v1/maintenances/${id}`,
        INCIDENTS: (id: number) => `/api/v1/maintenances/${id}/incidents`,
        ITEM_MOVEMENTS: (id: number) => `/api/v1/maintenances/${id}/item-movements`,
        AVAILABLE_MATERIALS: '/api/v1/maintenances/available-materials',
        AVAILABLE_INCIDENTS: '/api/v1/maintenances/available-incidents',
        AVAILABLE_OPERATORS: '/api/v1/maintenances/available-operators',
        AVAILABLE_COMPANIES: '/api/v1/maintenances/available-companies',
        AVAILABLE_ITEMS: '/api/v1/maintenances/available-items',
        TYPE_OPTIONS: '/api/v1/maintenances/type-options',
        STATUS_OPTIONS: '/api/v1/maintenances/status-options',
        REALIZATION_OPTIONS: '/api/v1/maintenances/realization-options',
    },
    // Cleanings
    CLEANINGS: {
        BASE: '/api/v1/cleanings',
        DETAIL: (id: number) => `/api/v1/cleanings/${id}`,
        AVAILABLE_MATERIALS: '/api/v1/cleanings/available-materials',
        TYPE_OPTIONS: '/api/v1/cleanings/type-options',
    },
    // Companies
    COMPANIES: {
        BASE: '/api/v1/companies',
        DETAIL: (id: number) => `/api/v1/companies/${id}`,
        ITEMS: (id: number) => `/api/v1/companies/${id}/items`,
        MAINTENANCES: (id: number) => `/api/v1/companies/${id}/maintenances`,
        STATS: (id: number) => `/api/v1/companies/${id}/stats`,
    },
    // Personal Access Tokens
    TOKENS: {
        BASE: '/api/v1/tokens',
        DETAIL: (id: number) => `/api/v1/tokens/${id}`,
    },
    // Users
    USERS: {
        BASE: '/api/v1/users',
        DETAIL: (id: number) => `/api/v1/users/${id}`,
        RESTORE: (id: number) => `/api/v1/users/${id}/restore`,
        AVAILABLE_SITES: '/api/v1/users/available-sites',
        AVAILABLE_ROLES: '/api/v1/users/available-roles',
        AVAILABLE_PERMISSIONS: '/api/v1/users/available-permissions',
        ROLES_PER_SITE: (id: number) => `/api/v1/users/${id}/roles-per-site`,
        CLEANINGS: (id: number) => `/api/v1/users/${id}/cleanings`,
        MAINTENANCES: (id: number) => `/api/v1/users/${id}/maintenances`,
        INCIDENTS: (id: number) => `/api/v1/users/${id}/incidents`,
    },
    // Roles
    ROLES: {
        BASE: '/api/v1/roles',
        DETAIL: (id: number) => `/api/v1/roles/${id}`,
        AVAILABLE_PERMISSIONS: '/api/v1/roles/available-permissions',
        USERS: (id: number) => `/api/v1/roles/${id}/users`,
    },
    // Permissions
    PERMISSIONS: {
        BASE: '/api/v1/permissions',
        DETAIL: (id: number) => `/api/v1/permissions/${id}`,
        AVAILABLE_ROLES: '/api/v1/permissions/available-roles',
        ROLES: (id: number) => `/api/v1/permissions/${id}/roles`,
    },
    // Settings
    SETTINGS: {
        BASE: '/api/v1/settings',
        MANAGE: '/api/v1/settings/manage',
        DETAIL: (id: number) => `/api/v1/settings/${id}`,
    },
    // Notifications
    NOTIFICATIONS: {
        BASE: '/api/v1/notifications',
        UNREAD: '/api/v1/notifications/unread',
        UNREAD_COUNT: '/api/v1/notifications/unread-count',
        MARK_AS_READ: (id: string) => `/api/v1/notifications/${id}/read`,
        MARK_ALL_AS_READ: '/api/v1/notifications/read-all',
        DELETE: (id: string) => `/api/v1/notifications/${id}`,
        DELETE_ALL: '/api/v1/notifications',
    },
    // Global Search
    SEARCH: {
        BASE: '/api/v1/search',
        TYPES: '/api/v1/search/types',
    },
    // Calendar
    CALENDAR: {
        BASE: '/api/v1/calendar',
        TODAY: '/api/v1/calendar/today',
    },
    // Event Categories
    EVENT_CATEGORIES: {
        BASE: '/api/v1/event-categories',
        DETAIL: (id: number) => `/api/v1/event-categories/${id}`,
    },
    // Calendar Events
    CALENDAR_EVENTS: {
        BASE: '/api/v1/calendar-events',
        DETAIL: (id: number) => `/api/v1/calendar-events/${id}`,
        UPDATE_DATES: (id: number) => `/api/v1/calendar-events/${id}/dates`,
        AVAILABLE_EVENT_CATEGORIES: '/api/v1/calendar-events/available-event-categories',
    },
} as const;
