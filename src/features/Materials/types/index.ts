// Material types for multi-tenancy
export interface Material {
    id: number;
    name: string;
    description?: string | null;
    site_id: number;
    site?: MaterialSite;
    // Site
    zone_id: number;
    zone?: MaterialZone;
    // Creator
    created_by_id: number | null;
    created_by_name: string | null;
    creator?: MaterialCreator;
    // Counts
    qrcode_flash_count: number;
    incident_count: number;
    item_count: number;
    maintenance_count: number;
    cleaning_count: number;
    // Cleaning alert
    cleaning_alert: boolean;
    cleaning_alert_email: boolean;
    cleaning_alert_frequency_repeatedly: number;
    cleaning_alert_frequency_type: CleaningFrequency;
    last_cleaning_at?: string | null;
    last_cleaning_alert_send_at?: string | null;
    // Timestamps
    created_at: string;
    updated_at?: string;
}

export interface MaterialDetail extends Material {
    recipients?: MaterialRecipient[];
}

export interface MaterialZone {
    id: number;
    name: string;
}

export interface MaterialSite {
    id: number;
    name: string;
}

export interface MaterialCreator {
    id: number;
    full_name: string;
}

export interface MaterialRecipient {
    id: number;
    full_name: string;
    email: string;
}

export type CleaningFrequency = 'daily' | 'weekly' | 'monthly';

export interface MaterialFormData {
    zone_id: number;
    name: string;
    description?: string | null;
    cleaning_alert?: boolean;
    cleaning_alert_email?: boolean;
    cleaning_alert_frequency_repeatedly?: number;
    cleaning_alert_frequency_type?: CleaningFrequency;
    recipients?: number[];
}

export interface MaterialFilters {
    page?: number;
    search?: string;
    zone_id?: number;
    sort_by?: 'name' | 'created_at' | 'last_cleaning_at';
    sort_direction?: 'asc' | 'desc';
}

export interface AvailableZone {
    id: number;
    name: string;
}

export interface AvailableRecipient {
    id: number;
    full_name: string;
    email: string;
}

export interface MaterialMonthlyStats {
    months: string[];
    incidents: number[];
    maintenances: number[];
    cleanings: number[];
    item_movements: number[];
}

// Related entities for material detail tabs
export interface MaterialIncident {
    id: number;
    description: string;
    status: string;
    status_label: string;
    severity: string;
    severity_label: string;
    material_id: number;
    reporter?: {
        id: number;
        full_name: string;
    } | null;
    maintenance?: {
        id: number;
        description: string;
    } | null;
    started_at?: string | null;
    resolved_at?: string | null;
    created_at: string;
}

export interface MaterialMaintenance {
    id: number;
    description: string;
    type: string;
    type_label: string;
    status: string;
    status_label: string;
    realization: string;
    realization_label: string;
    material_id: number;
    creator?: {
        id: number;
        full_name: string;
    } | null;
    created_at: string;
}

export interface MaterialCleaning {
    id: number;
    description?: string | null;
    type: string;
    type_label: string;
    material_id: number;
    creator?: {
        id: number;
        full_name: string;
    } | null;
    created_at: string;
}

export interface MaterialItem {
    id: number;
    name: string;
    reference?: string | null;
    description?: string | null;
    current_price: number;
    current_stock: number;
    stock_status: string;
    stock_status_color: string;
    company_id?: number | null;
    company_name?: string | null;
    company?: {
        id: number;
        name: string;
    } | null;
    created_at: string;
}
