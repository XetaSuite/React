// Maintenance types for multi-tenancy
export type MaintenanceStatus = 'planned' | 'in_progress' | 'completed' | 'canceled';
export type MaintenanceType = 'corrective' | 'preventive' | 'inspection' | 'improvement';
export type MaintenanceRealization = 'internal' | 'external' | 'both';

export interface Maintenance {
    id: number;
    description: string;
    // Status and type
    status: MaintenanceStatus;
    status_label: string;
    type: MaintenanceType;
    type_label: string;
    realization: MaintenanceRealization;
    realization_label: string;
    // Material info (optional)
    material_id: number | null;
    material_name: string | null;
    material?: MaintenanceMaterial;
    // Site info (optional)
    site_id: number | null;
    site?: MaintenanceSite;
    // Dates
    started_at: string | null;
    resolved_at: string | null;
    // Counts
    incident_count: number;
    operator_count: number;
    company_count: number;
    item_movement_count: number;
    // Timestamps
    created_at: string;
    updated_at?: string;
}

export interface MaintenanceDetail extends Maintenance {
    // Related entities
    incidents?: MaintenanceIncident[];
    operators?: MaintenanceOperator[];
    companies?: MaintenanceCompany[];
    itemMovements?: MaintenanceItemMovement[];
    // Creator
    created_by_id: number | null;
    created_by_name: string | null;
    creator?: MaintenanceCreator;
    // Editor
    edited_by_id: number | null;
    editor?: MaintenanceEditor;
}

export interface MaintenanceMaterial {
    id: number;
    name: string;
    zone?: {
        id: number;
        name: string;
    };
}

export interface MaintenanceIncident {
    id: number;
    description: string;
    status: string;
    status_label?: string;
    severity: string;
    severity_label?: string;
    started_at: string | null;
    resolved_at: string | null;
}

export interface MaintenanceOperator {
    id: number;
    full_name: string;
    email?: string;
}

export interface MaintenanceCompany {
    id: number;
    name: string;
}

export interface MaintenanceItemMovement {
    id: number;
    item_id: number;
    item_name: string | null;
    item_reference: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_by_name: string | null;
    created_at: string;
}

export interface MaintenanceCreator {
    id: number;
    full_name: string;
}

export interface MaintenanceEditor {
    id: number;
    full_name: string;
}

export interface MaintenanceSite {
    id: number;
    name: string;
}

export interface MaintenanceFormData {
    material_id?: number | null;
    description: string;
    type: MaintenanceType;
    realization: MaintenanceRealization;
    status?: MaintenanceStatus;
    started_at?: string | null;
    resolved_at?: string | null;
    incident_ids?: number[];
    operator_ids?: number[];
    company_ids?: number[];
    item_movements?: ItemMovement[];
}

export interface ItemMovement {
    item_id: number;
    quantity: number;
}

export interface MaintenanceFilters {
    page?: number;
    search?: string;
    material_id?: number;
    status?: MaintenanceStatus;
    type?: MaintenanceType;
    realization?: MaintenanceRealization;
    sort_by?: 'created_at' | 'started_at' | 'resolved_at' | 'status' | 'type';
    sort_direction?: 'asc' | 'desc';
}

// Available options for dropdowns
export interface AvailableMaterial {
    id: number;
    name: string;
}

export interface AvailableIncident {
    id: number;
    description: string;
    severity: string;
    severity_label?: string;
    material_id: number | null;
    material_name: string | null;
}

export interface AvailableOperator {
    id: number;
    full_name: string;
    email?: string;
}

export interface AvailableCompany {
    id: number;
    name: string;
}

export interface AvailableItem {
    id: number;
    name: string;
    reference: string | null;
    current_stock: number;
    current_price: number;
}

export interface StatusOption {
    value: MaintenanceStatus;
    label: string;
}

export interface TypeOption {
    value: MaintenanceType;
    label: string;
}

export interface RealizationOption {
    value: MaintenanceRealization;
    label: string;
}

// For paginated item movements
export interface ItemMovementsPaginatedResponse {
    data: MaintenanceItemMovement[];
    meta: {
        current_page: number;
        from: number | null;
        to: number | null;
        last_page: number;
        per_page: number;
        total: number;
        total_cost: number;
    };
}

// For paginated incidents on maintenance detail
export interface IncidentsPaginatedResponse {
    data: MaintenanceIncident[];
    meta: {
        current_page: number;
        from: number | null;
        to: number | null;
        last_page: number;
        per_page: number;
        total: number;
    };
}
