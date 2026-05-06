import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
    FaArrowLeft,
    FaPenToSquare,
    FaTrash,
    FaScrewdriverWrench,
    FaCalendar,
    FaCalendarCheck,
    FaUsers,
    FaTriangleExclamation,
    FaCubes,
    FaWrench,
    FaCircleInfo,
    FaClipboardList,
    FaBuildingUser,
    FaBuildingFlag,
} from 'react-icons/fa6';
import { MaintenanceManager } from '../services/MaintenanceManager';
import { MaintenanceModal } from './MaintenanceModal';
import type {
    MaintenanceDetail,
    MaintenanceIncident,
    MaintenanceItemMovement,
} from '../types';
import { PageMeta, PageBreadcrumb, Pagination, DeleteConfirmModal } from '@/shared/components/common';
import { Button, Badge, Table, TableHeader, TableBody, TableRow, TableCell, Alert, LinkedName } from '@/shared/components/ui';
import { useModal } from '@/shared/hooks';
import { useAuth } from '@/features/Auth/hooks';
import { useSettings } from '@/features/Settings';
import { formatDate, formatCurrency } from '@/shared/utils';
import { NotFoundContent } from '@/shared/components/errors';
import type { PaginationMeta } from '@/shared/types/pagination';

// Badge color mapping for status
const statusColors: Record<string, 'warning' | 'brand' | 'success' | 'dark'> = {
    planned: 'warning',
    in_progress: 'brand',
    completed: 'success',
    canceled: 'dark',
};

// Badge color mapping for type
const typeColors: Record<string, 'error' | 'success' | 'brand' | 'warning'> = {
    corrective: 'error',
    preventive: 'success',
    inspection: 'brand',
    improvement: 'warning',
};

// Badge color mapping for realization
const realizationColors: Record<string, 'brand' | 'warning' | 'success'> = {
    internal: 'brand',
    external: 'warning',
    both: 'success',
};

// Badge colors for incident status
const incidentStatusColors: Record<string, 'error' | 'warning' | 'success' | 'dark'> = {
    open: 'error',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'dark',
};

// Badge colors for incident severity
const incidentSeverityColors: Record<string, 'dark' | 'warning' | 'error'> = {
    low: 'dark',
    medium: 'warning',
    high: 'error',
    critical: 'error',
};

export function MaintenanceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { hasPermission, isOnHeadquarters } = useAuth();
    const { getCurrency } = useSettings();

    // Maintenance state
    const [maintenance, setMaintenance] = useState<MaintenanceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

    // Incidents state (paginated)
    const [incidents, setIncidents] = useState<MaintenanceIncident[]>([]);
    const [incidentsLoading, setIncidentsLoading] = useState(false);
    const [incidentsMeta, setIncidentsMeta] = useState<PaginationMeta | null>(null);
    const [incidentsPage, setIncidentsPage] = useState(1);

    // Item movements state (paginated)
    const [itemMovements, setItemMovements] = useState<MaintenanceItemMovement[]>([]);
    const [itemMovementsLoading, setItemMovementsLoading] = useState(false);
    const [itemMovementsMeta, setItemMovementsMeta] = useState<PaginationMeta | null>(null);
    const [itemMovementsPage, setItemMovementsPage] = useState(1);
    const [totalCost, setTotalCost] = useState<number>(0);

    // Delete state
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Modals
    const editModal = useModal();
    const deleteModal = useModal();

    // Permissions
    const canUpdate = !isOnHeadquarters && hasPermission('maintenance.update');
    const canDelete = !isOnHeadquarters && hasPermission('maintenance.delete');
    const canViewSite = isOnHeadquarters && hasPermission('site.view');
    const canViewCreatorAndOperator = isOnHeadquarters && hasPermission('user.view');
    const canViewCompany = hasPermission('company.view');
    const canViewIncident = hasPermission('incident.view');
    const canViewItem = hasPermission('item.view');

    // Load maintenance details
    const loadMaintenance = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        setMaintenanceError(null);

        const result = await MaintenanceManager.getById(parseInt(id));

        if (result.success && result.data) {
            setMaintenance(result.data.data);
        } else {
            setMaintenanceError(result.error || t('maintenances.errors.loadFailed'));
        }

        setIsLoading(false);
    }, [id, t]);

    // Load incidents (paginated)
    const loadIncidents = useCallback(async (page: number = 1) => {
        if (!id) return;

        setIncidentsLoading(true);
        const result = await MaintenanceManager.getIncidents(parseInt(id), page);

        if (result.success && result.data) {
            setIncidents(result.data.data);
            setIncidentsMeta(result.data.meta);
        }

        setIncidentsLoading(false);
    }, [id]);

    // Load item movements (paginated)
    const loadItemMovements = useCallback(async (page: number = 1) => {
        if (!id) return;

        setItemMovementsLoading(true);
        const result = await MaintenanceManager.getItemMovements(parseInt(id), page);

        if (result.success && result.data) {
            setItemMovements(result.data.data);
            setItemMovementsMeta(result.data.meta);
            setTotalCost(result.data.meta.total_cost || 0);
        }

        setItemMovementsLoading(false);
    }, [id]);

    // Initial load
    useEffect(() => {
        loadMaintenance();
    }, [loadMaintenance]);

    // Load incidents when page changes
    useEffect(() => {
        if (maintenance && maintenance.incident_count > 0) {
            loadIncidents(incidentsPage);
        }
    }, [maintenance, incidentsPage, loadIncidents]);

    // Load item movements when page changes
    useEffect(() => {
        if (maintenance && maintenance.item_movement_count > 0) {
            loadItemMovements(itemMovementsPage);
        }
    }, [maintenance, itemMovementsPage, loadItemMovements]);

    // Handle maintenance update
    const handleMaintenanceUpdated = async () => {
        editModal.closeModal();
        await loadMaintenance();
    };

    // Handle delete
    const handleDelete = async () => {
        if (!maintenance) return;

        setIsDeleting(true);
        setDeleteError(null);

        const result = await MaintenanceManager.delete(maintenance.id);

        if (result.success) {
            navigate('/maintenances', { replace: true });
        } else {
            setDeleteError(result.error || t('maintenances.errors.deleteFailed'));
        }

        setIsDeleting(false);
        deleteModal.closeModal();
    };

    // Show resolved_at only for completed/canceled
    const showResolvedAt = maintenance?.status === 'completed' || maintenance?.status === 'canceled';

    if (isLoading) {
        return (
            <div className="flex min-h-96 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-500"></div>
            </div>
        );
    }

    if (maintenanceError || !maintenance) {
        return (
            <>
                <PageMeta title={`${t('errors.notFound')} | XetaSuite`} description={t('errors.pageNotFound')} />
                <NotFoundContent
                    title={t('maintenances.notFound')}
                    message={t('maintenances.notFoundMessage')}
                    backTo="/maintenances"
                    backLabel={t('maintenances.detail.backToList')}
                />
            </>
        );
    }

    return (
        <>
            <PageMeta
                title={`${t('maintenances.maintenance')} #${maintenance.id} | XetaSuite`}
                description={t('maintenances.description')}
            />
            <PageBreadcrumb
                pageTitle={`${t('maintenances.maintenance')} #${maintenance.id}`}
                breadcrumbs={[
                    { label: t('maintenances.title'), path: '/maintenances' },
                    { label: `#${maintenance.id}` },
                ]}
            />

            {/* Header Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/5 dark:bg-white/3 lg:p-6">
                {/* Header Row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/maintenances"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-white/5 dark:text-gray-400 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-gray-200"
                            title={t('common.back')}
                        >
                            <FaArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <FaScrewdriverWrench className="h-5 w-5 text-gray-400" />
                                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {t('maintenances.maintenance')} #{maintenance.id}
                                </h1>
                                <Badge color={statusColors[maintenance.status] || 'dark'}>
                                    {maintenance.status_label}
                                </Badge>
                            </div>
                            {maintenance.material && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <FaWrench className="h-3 w-3" />
                                    {t('maintenances.forMaterial')}:{' '}
                                    <Link
                                        to={`/materials/${maintenance.material.id}`}
                                        className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                                    >
                                        {maintenance.material.name}
                                    </Link>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canUpdate && (
                            <Button
                                variant="outline"
                                size="sm"
                                startIcon={<FaPenToSquare className="h-4 w-4" />}
                                onClick={() => editModal.openModal()}
                            >
                                {t('common.edit')}
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="danger"
                                size="sm"
                                startIcon={<FaTrash className="h-4 w-4" />}
                                onClick={() => deleteModal.openModal()}
                            >
                                {t('common.delete')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-100 dark:bg-error-500/20">
                            <FaTriangleExclamation className="h-5 w-5 text-error-600 dark:text-error-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {maintenance.incident_count}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('maintenances.stats.incidents')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20">
                            <FaUsers className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {maintenance.operator_count}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('maintenances.stats.operators')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-500/20">
                            <FaBuildingUser className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {maintenance.company_count}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('maintenances.stats.companies')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-500/20">
                            <FaCubes className="h-5 w-5 text-success-600 dark:text-success-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {maintenance.item_movement_count}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('maintenances.stats.spareParts')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Maintenance Information */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                        {t('maintenances.detail.info')}
                    </h3>
                    <div className="space-y-4">
                        {/* Site info */}
                        {maintenance.site && isOnHeadquarters && (
                            <div className="flex items-start gap-3">
                                <FaBuildingFlag className="mt-0.5 h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('maintenances.fields.site')}
                                    </p>
                                    <LinkedName
                                        canView={canViewSite}
                                        id={maintenance.site?.id}
                                        name={maintenance.site?.name}
                                        basePath="sites" />
                                </div>
                            </div>
                        )}
                        {/* Type */}
                        <div className="flex items-start gap-3">
                            <FaClipboardList className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('maintenances.fields.type')}
                                </p>
                                <Badge color={typeColors[maintenance.type] || 'dark'}>
                                    {maintenance.type_label}
                                </Badge>
                            </div>
                        </div>

                        {/* Realization */}
                        <div className="flex items-start gap-3">
                            <FaUsers className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('maintenances.fields.realization')}
                                </p>
                                <Badge color={realizationColors[maintenance.realization] || 'dark'}>
                                    {maintenance.realization_label}
                                </Badge>
                            </div>
                        </div>

                        {/* Started at */}
                        <div className="flex items-start gap-3">
                            <FaCalendar className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('maintenances.fields.started_at')}
                                </p>
                                <p className="text-gray-900 dark:text-white">
                                    {maintenance.started_at ? formatDate(maintenance.started_at) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Resolved at (only for completed/canceled) */}
                        {showResolvedAt && (
                            <div className="flex items-start gap-3">
                                <FaCalendarCheck className="mt-0.5 h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('maintenances.fields.resolved_at')}
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {maintenance.resolved_at ? formatDate(maintenance.resolved_at) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Created by */}
                        <div className="flex items-start gap-3">
                            <FaUsers className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('common.createdBy')}
                                </p>
                                <p className="text-gray-900 dark:text-white">
                                    <LinkedName
                                        canView={canViewCreatorAndOperator}
                                        id={maintenance.creator?.id}
                                        name={maintenance.creator?.full_name}
                                        basePath="users" />
                                </p>
                            </div>
                        </div>

                        {/* Created at */}
                        <div className="flex items-start gap-3">
                            <FaCalendar className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('common.createdAt')}
                                </p>
                                <p className="text-gray-900 dark:text-white">{formatDate(maintenance.created_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-white">
                        <FaCircleInfo className="h-4 w-4" />
                        {t('maintenances.detail.description')}
                    </h3>

                    <div className="space-y-4">
                        {/* Description */}
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                {t('maintenances.fields.description')}
                            </p>
                            <div className="rounded-lg bg-gray-50 p-4 dark:bg-neutral-800/50">
                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                    {maintenance.description || <span className="text-gray-400">—</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operators & Companies */}
            {(maintenance.operators && maintenance.operators.length > 0) ||
                (maintenance.companies && maintenance.companies.length > 0) ? (
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Operators */}
                    {maintenance.operators && maintenance.operators.length > 0 && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-white">
                                <FaUsers className="h-4 w-4" />
                                {t('maintenances.detail.operators')} ({maintenance.operators.length})
                            </h3>
                            <div className="space-y-2">
                                {maintenance.operators.map((operator) => (
                                    <div
                                        key={operator.id}
                                        className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-neutral-800/50"
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                                            {operator.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <LinkedName
                                                canView={canViewCreatorAndOperator}
                                                id={operator.id}
                                                name={operator.full_name}
                                                basePath="users" />
                                            {operator.email && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {operator.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Companies */}
                    {maintenance.companies && maintenance.companies.length > 0 && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-white">
                                <FaBuildingUser className="h-4 w-4" />
                                {t('maintenances.detail.companies')} ({maintenance.companies.length})
                            </h3>
                            <div className="space-y-2">
                                {maintenance.companies.map((company) => (
                                    <div
                                        key={company.id}
                                        className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-neutral-800/50"
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-500/20">
                                            <FaBuildingUser className="h-4 w-4 text-warning-600 dark:text-warning-400" />
                                        </div>
                                        <LinkedName
                                            canView={canViewCompany}
                                            id={company.id}
                                            name={company.name}
                                            basePath="companies" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Incidents Section (Paginated) */}
            {maintenance.incident_count > 0 && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
                    <div className="border-b border-gray-200 p-6 dark:border-white/5">
                        <h3 className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-white">
                            <FaTriangleExclamation className="h-4 w-4 text-error-500" />
                            {t('maintenances.detail.linkedIncidents')} ({maintenance.incident_count})
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        {incidentsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-brand-500"></div>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-gray-200 dark:border-white/5">
                                        <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.incidentDescription')}
                                        </TableCell>
                                        <TableCell isHeader className="px-6 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.incidentStatus')}
                                        </TableCell>
                                        <TableCell isHeader className="px-6 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.incidentSeverity')}
                                        </TableCell>
                                        <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.incidentStartedAt')}
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incidents.map((incident) => (
                                        <TableRow
                                            key={incident.id}
                                            className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50"
                                        >
                                            <TableCell className="px-6 py-4">
                                                <LinkedName
                                                    canView={canViewIncident}
                                                    id={incident.id}
                                                    name={incident.description}
                                                    basePath="incidents" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <Badge color={incidentStatusColors[incident.status] || 'dark'} size="md">
                                                    {incident.status_label || incident.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <Badge color={incidentSeverityColors[incident.severity] || 'dark'} size="md">
                                                    {incident.severity_label || incident.severity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {incident.started_at ? formatDate(incident.started_at) : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Incidents Pagination */}
                    {incidentsMeta && incidentsMeta.last_page > 1 && (
                        <div className="border-t border-gray-200 p-4 dark:border-white/5">
                            <Pagination
                                meta={incidentsMeta}
                                onPageChange={setIncidentsPage}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Item Movements Section (Paginated) with Total Cost */}
            {maintenance.item_movement_count > 0 && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
                    <div className="border-b border-gray-200 p-6 dark:border-white/5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-white">
                                <FaCubes className="h-4 w-4 text-success-500" />
                                {t('maintenances.detail.spareParts')} ({maintenance.item_movement_count})
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('maintenances.detail.totalCost')}:
                                </span>
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(totalCost)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {itemMovementsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-brand-500"></div>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-gray-200 dark:border-white/5">
                                        <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.itemName')}
                                        </TableCell>
                                        <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.itemReference')}
                                        </TableCell>
                                        <TableCell isHeader className="px-6 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.quantity')}
                                        </TableCell>
                                        <TableCell isHeader className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.unitPrice')}
                                        </TableCell>
                                        <TableCell isHeader className="px-6 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('maintenances.detail.totalPrice')}
                                        </TableCell>
                                        <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {t('common.createdAt')}
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {itemMovements.map((movement) => (
                                        <TableRow
                                            key={movement.id}
                                            className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50"
                                        >
                                            <TableCell className="px-6 py-4">
                                                <LinkedName
                                                    canView={canViewItem}
                                                    id={movement.item_id}
                                                    name={movement.item_name}
                                                    basePath="items" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {movement.item_reference || '—'}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">
                                                {movement.quantity}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                                                {formatCurrency(movement.unit_price, getCurrency())}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                                                {formatCurrency(movement.total_price, getCurrency())}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {formatDate(movement.created_at)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Item Movements Pagination */}
                    {itemMovementsMeta && itemMovementsMeta.last_page > 1 && (
                        <div className="border-t border-gray-200 p-4 dark:border-white/5">
                            <Pagination
                                meta={itemMovementsMeta}
                                onPageChange={setItemMovementsPage}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            <MaintenanceModal
                isOpen={editModal.isOpen}
                onClose={editModal.closeModal}
                maintenance={maintenance}
                onSuccess={handleMaintenanceUpdated}
            />

            {/* Delete Error Alert */}
            {deleteError && (
                <Alert
                    variant="error"
                    title={t('common.error')}
                    message={deleteError}
                    className="fixed bottom-4 right-4 z-50 max-w-md"
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={deleteModal.closeModal}
                onConfirm={handleDelete}
                title={t('maintenances.deleteTitle')}
                message={t('common.confirmDelete', { name: `${t('maintenances.maintenance')} #${maintenance.id}` })}
                isLoading={isDeleting}
            />
        </>
    );
}

export default MaintenanceDetailPage;
