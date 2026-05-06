// Company type enum values
export type CompanyType = 'item_provider' | 'maintenance_provider';

// Company types
export interface Company {
    id: number;
    name: string;
    description: string | null;

    // Types
    types: CompanyType[];
    is_item_provider: boolean;
    is_maintenance_provider: boolean;

    // Contact info
    email: string | null;
    phone: string | null;
    address: string | null;

    // Creator
    created_by_id: number;
    created_by_name?: string;
    creator?: {
        id: number;
        full_name: string;
    };

    // Counts
    item_count: number;
    maintenance_count: number;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface CompanyFormData {
    name: string;
    description: string;
    types: CompanyType[];
    email?: string;
    phone?: string;
    address?: string;
}

export interface CompanyFilters {
    page?: number;
    search?: string;
    type?: CompanyType;
    sort_by?: 'name' | 'maintenances_count' | 'created_at';
    sort_direction?: 'asc' | 'desc';
}

// Item for company detail
export interface CompanyItem {
    id: number;
    name: string;
    reference: string | null;
    description: string | null;
    current_price: number;
    item_entry_total: number;
    item_exit_total: number;
    site_id: number;
    site?: {
        id: number;
        name: string;
    };
    created_at: string;
}

export interface ItemFilters {
    page?: number;
    search?: string;
    sort_by?: 'name' | 'reference' | 'current_price' | 'created_at';
    sort_direction?: 'asc' | 'desc';
}

// Maintenance for company detail
export interface CompanyMaintenance {
    id: number;
    description: string | null;
    type: string;
    type_label: string;
    realization: string;
    realization_label: string;
    status: string;
    status_label: string;
    material_id: number | null;
    material_name: string | null;
    material?: {
        id: number;
        name: string;
    };
    site_id: number | null;
    site?: {
        id: number;
        name: string;
    };
    created_by_id: number | null;
    created_by_name: string | null;
    creator?: {
        id: number;
        full_name: string;
    };
    incident_count: number;
    started_at: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface MaintenanceFilters {
    page?: number;
    search?: string;
    sort_by?: 'type' | 'status' | 'started_at' | 'resolved_at' | 'created_at';
    sort_direction?: 'asc' | 'desc';
}

// Stats types
export interface SiteMaintenanceCount {
    site_id: number;
    site_name: string;
    count: number;
}

export interface TypeMaintenanceCount {
    type: string;
    type_label: string;
    count: number;
}

export interface StatusMaintenanceCount {
    status: string;
    status_label: string;
    count: number;
}

export interface RealizationMaintenanceCount {
    realization: string;
    realization_label: string;
    count: number;
}

export interface MonthMaintenanceCount {
    month: string;
    count: number;
}

export interface CompanyStats {
    total_maintenances: number;
    maintenances_by_site: SiteMaintenanceCount[];
    maintenances_by_type: TypeMaintenanceCount[];
    maintenances_by_status: StatusMaintenanceCount[];
    maintenances_by_realization: RealizationMaintenanceCount[];
    maintenances_by_month: MonthMaintenanceCount[];
}
