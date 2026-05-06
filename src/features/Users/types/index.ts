/**
 * User types for the Users feature
 */

export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    avatar: string;
    locale: 'fr' | 'en';
    office_phone?: string | null;
    cell_phone?: string | null;
    current_site_id?: number | null;
    incident_count: number;
    maintenance_count: number;
    cleaning_count: number;
    item_count: number;
    item_exit_count: number;
    item_entry_count: number;
    last_login_date?: string | null;
    last_login_ip?: string | null;
    sites?: UserSite[];
    roles?: string[];
    permissions?: string[];
    sites_with_roles?: SiteWithRoles[];
    sites_with_permissions?: SiteWithPermissions[];
    deleted_at?: string | null;
    deleted_by?: {
        id: number;
        full_name: string;
    } | null;
    created_at?: string;
    updated_at?: string;
}

export interface UserSite {
    id: number;
    name: string;
    is_headquarters: boolean;
}

export interface SiteWithRoles {
    site: UserSite;
    roles: string[];
}

export interface SiteWithPermissions {
    site: {
        id: number;
        name: string;
    };
    permissions: string[];
}

export interface UserFormData {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password?: string;
    locale?: 'fr' | 'en';
    office_phone?: string;
    cell_phone?: string;
    sites?: SiteAssignment[];
}

export interface SiteAssignment {
    id: number;
    roles?: string[];
    permissions?: string[];
}

export interface UserFilters {
    page?: number;
    search?: string;
    site_id?: number;
    sort_by?: string;
    sort_direction?: 'asc' | 'desc';
}

export interface AvailableSite {
    id: number;
    name: string;
    is_headquarters: boolean;
}

export interface AvailableRole {
    id: number;
    name: string;
    site_id: number | null;
}

export interface AvailablePermission {
    id: number;
    name: string;
}

// Related entities for user detail page
export interface UserCleaning {
    id: number;
    type: string;
    cleaned_at?: string | null;
    material?: {
        id: number;
        name: string;
    };
    zone?: {
        id: number;
        name: string;
    };
    site?: {
        id: number;
        name: string;
    };
    created_at: string;
}

export interface UserMaintenance {
    id: number;
    description: string;
    type: string;
    status: string;
    material?: {
        id: number;
        name: string;
    };
    site?: {
        id: number;
        name: string;
    };
    created_at: string;
}

export interface UserIncident {
    id: number;
    description: string;
    severity: string;
    status: string;
    material?: {
        id: number;
        name: string;
    };
    site?: {
        id: number;
        name: string;
    };
    created_at: string;
}
