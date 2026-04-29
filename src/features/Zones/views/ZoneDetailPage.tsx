import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaPenToSquare, FaMagnifyingGlass, FaLayerGroup, FaCalendar, FaWrench } from 'react-icons/fa6';
import { ZoneManager } from '../services/ZoneManager';
import { ZoneModal } from './ZoneModal';
import type { Zone, ZoneChild, ZoneMaterial } from '../types';
import PageBreadcrumb from '@/shared/components/common/PageBreadcrumb';
import PageMeta from '@/shared/components/common/PageMeta';
import { Button, Badge, LinkedName } from '@/shared/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/shared/components/ui/table';
import { useEntityPermissions, useModal } from '@/shared/hooks';
import { useAuth } from '@/features/Auth/hooks';
import { formatDate } from "@/shared/utils";
import { NotFoundContent } from '@/shared/components/errors';
import { Input } from '@/shared/components/form';

export function ZoneDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { hasPermission, isOnHeadquarters } = useAuth();

    // Zone state
    const [zone, setZone] = useState<Zone | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoneError, setZoneError] = useState<string | null>(null);

    // Children state (for parent zones)
    const [children, setChildren] = useState<ZoneChild[]>([]);
    const [childrenSearch, setChildrenSearch] = useState('');
    const [isLoadingChildren, setIsLoadingChildren] = useState(false);

    // Materials state (for leaf zones with allow_material)
    const [materials, setMaterials] = useState<ZoneMaterial[]>([]);
    const [materialsSearch, setMaterialsSearch] = useState('');
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

    // Modal
    const editModal = useModal();

    // Permissions
    const permissions = useEntityPermissions("zone", { hasPermission, isOnHeadquarters });
    const canViewSite = isOnHeadquarters && hasPermission('site.view');
    const canViewMaterial = hasPermission('material.view');

    // Filtered data (client-side filtering)
    const filteredChildren = useMemo(() => {
        if (!childrenSearch.trim()) return children;
        const search = childrenSearch.toLowerCase();
        return children.filter(child => child.name.toLowerCase().includes(search));
    }, [children, childrenSearch]);

    const filteredMaterials = useMemo(() => {
        if (!materialsSearch.trim()) return materials;
        const search = materialsSearch.toLowerCase();
        return materials.filter(material =>
            material.name.toLowerCase().includes(search) ||
            material.description?.toLowerCase().includes(search)
        );
    }, [materials, materialsSearch]);

    // Load zone details
    const loadZone = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        setZoneError(null);

        const result = await ZoneManager.getById(parseInt(id));

        if (result.success && result.data) {
            setZone(result.data.data);
        } else {
            setZoneError(result.error || t('zones.errors.loadFailed'));
        }

        setIsLoading(false);
    }, [id, t]);

    // Load children zones
    const loadChildren = useCallback(async () => {
        if (!id) return;

        setIsLoadingChildren(true);
        const result = await ZoneManager.getChildren(parseInt(id));

        if (result.success && result.data) {
            setChildren(result.data);
        }

        setIsLoadingChildren(false);
    }, [id]);

    // Load materials
    const loadMaterials = useCallback(async () => {
        if (!id) return;

        setIsLoadingMaterials(true);
        const result = await ZoneManager.getMaterials(parseInt(id));

        if (result.success && result.data) {
            setMaterials(result.data);
        }

        setIsLoadingMaterials(false);
    }, [id]);

    // Initial load
    useEffect(() => {
        loadZone();
    }, [loadZone]);

    // Load children or materials based on zone type
    useEffect(() => {
        if (!zone) return;

        if (zone.children_count > 0) {
            loadChildren();
        } else if (zone.allow_material) {
            loadMaterials();
        }
    }, [zone, loadChildren, loadMaterials]);

    // Handle zone update
    const handleZoneUpdated = async () => {
        editModal.closeModal();
        await loadZone();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (zoneError || !zone) {
        return (
            <>
                <PageMeta title={`${t("errors.notFound")} | XetaSuite`} description={t("errors.pageNotFound")} />
                <NotFoundContent
                    title={t("zones.notFound")}
                    message={t("zones.notFoundMessage")}
                    backTo="/zones"
                    backLabel={t("zones.detail.backToList")}
                />
            </>
        );
    }

    const isParentZone = zone.children_count > 0;
    const isLeafZoneWithMaterials = zone.allow_material && zone.children_count === 0;

    return (
        <>
            <PageMeta title={`${zone.name} | ${t("zones.title")} | XetaSuite`} description={t('zones.description')} />
            <PageBreadcrumb
                pageTitle={zone.name}
                breadcrumbs={[{ label: t('zones.title'), path: '/zones' }, { label: zone.name }]}
            />

            {/* Header Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/5 dark:bg-white/3 lg:p-6">
                {/* Header Row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/zones"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-white/5 dark:text-gray-400 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-gray-200"
                            title={t('common.back')}
                        >
                            <FaArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{zone.name}</h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {zone.site?.name}
                                {zone.parent && (
                                    <>
                                        {' • '}
                                        <Link
                                            to={`/zones/${zone.parent.id}`}
                                            className="text-brand-600 hover:text-brand-700 dark:text-brand-400"
                                        >
                                            {zone.parent.name}
                                        </Link>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    {permissions.canUpdate && (
                        <Button
                            variant="outline"
                            size="sm"
                            startIcon={<FaPenToSquare className="h-4 w-4" />}
                            onClick={() => editModal.openModal()}
                        >
                            {t('common.edit')}
                        </Button>
                    )}
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20">
                            <FaLayerGroup className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{zone.children_count}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('zones.detail.totalChildZones')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-500/20">
                            <FaWrench className="h-5 w-5 text-success-600 dark:text-success-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{zone.material_count}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('zones.detail.totalMaterials')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-500/20">
                            <FaCalendar className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(zone.created_at)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.createdAt')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Zone Information */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                        {t('zones.detail.info')}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <FaLayerGroup className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('zones.parent')}</p>
                                <p className="text-gray-900 dark:text-white">
                                    {zone.parent ? (
                                        <Link
                                            to={`/zones/${zone.parent.id}`}
                                            className="text-brand-600 hover:text-brand-700 dark:text-brand-400"
                                        >
                                            {zone.parent.name}
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FaWrench className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('zones.allowMaterial')}</p>
                                <p className="text-gray-900 dark:text-white">
                                    <Badge color={zone.allow_material ? "success" : "dark"}>
                                        {zone.allow_material ? t('common.yes') : t('common.no')}
                                    </Badge>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Site Information */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                        {t('zones.detail.siteInfo')}
                    </h3>
                    {zone.site ? (
                        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-neutral-800/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                                {zone.site.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <LinkedName
                                    canView={canViewSite}
                                    id={zone.site.id}
                                    name={zone.site.name}
                                    basePath="sites" />
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">{t('common.notAvailable')}</p>
                    )}
                </div>
            </div>

            {/* Children Zones Table (for parent zones) */}
            {isParentZone && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
                    {/* Header */}
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                                {t('zones.detail.childZones')}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {t('zones.detail.childZonesDescription')}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-white/5">
                        <div className="relative max-w-md">
                            <FaMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10" />
                            <Input
                                type="text"
                                placeholder={t('common.search')}
                                value={childrenSearch}
                                onChange={(e) => setChildrenSearch(e.target.value)}
                                className="pl-10"
                            />
                            {childrenSearch && (
                                <button
                                    onClick={() => setChildrenSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    title={t('common.clearSearch')}
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-gray-200 dark:border-white/5">
                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('zones.table.name')}
                                    </TableCell>
                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('zones.table.allowMaterial')}
                                    </TableCell>
                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('zones.table.childrenCount')}
                                    </TableCell>
                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('zones.table.materialCount')}
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingChildren ? (
                                    [...Array(3)].map((_, index) => (
                                        <TableRow key={index} className="border-b border-gray-100 dark:border-white/5">
                                            <TableCell className="px-6 py-4">
                                                <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="h-5 w-12 animate-pulse rounded-full bg-gray-200 dark:bg-neutral-700" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredChildren.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="px-6 py-12 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                                            {childrenSearch ? (
                                                <div>
                                                    <p>{t('common.noSearchResults')}</p>
                                                    <button
                                                        onClick={() => setChildrenSearch('')}
                                                        className="mt-2 text-sm text-brand-500 hover:text-brand-600"
                                                    >
                                                        {t('common.clearSearch')}
                                                    </button>
                                                </div>
                                            ) : (
                                                t('zones.detail.noChildren')
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredChildren.map((child) => (
                                        <TableRow
                                            key={child.id}
                                            className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50"
                                        >
                                            <TableCell className="px-6 py-4">
                                                <LinkedName
                                                    canView={permissions.canView}
                                                    id={child.id}
                                                    name={child.name}
                                                    basePath="zones" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <Badge
                                                    color={child.allow_material ? "success" : "dark"}
                                                    size='sm'
                                                >
                                                    {child.allow_material ? t('common.yes') : t('common.no')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {child.children_count}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {child.material_count}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Materials Table (for leaf zones with allow_material) */}
            {isLeafZoneWithMaterials && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
                    {/* Header */}
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                                {t('zones.detail.materials')}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {t('zones.detail.materialsDescription')}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-white/5">
                        <div className="relative max-w-md">
                            <FaMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10" />
                            <Input
                                type="text"
                                placeholder={t('common.search')}
                                value={materialsSearch}
                                onChange={(e) => setMaterialsSearch(e.target.value)}
                                className="pl-10"
                            />
                            {materialsSearch && (
                                <button
                                    onClick={() => setMaterialsSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    title={t('common.clearSearch')}
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-gray-200 dark:border-white/5">
                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('zones.table.materialName')}
                                    </TableCell>
                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('zones.table.materialDescription')}
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingMaterials ? (
                                    [...Array(3)].map((_, index) => (
                                        <TableRow key={index} className="border-b border-gray-100 dark:border-white/5">
                                            <TableCell className="px-6 py-4">
                                                <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-neutral-700" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredMaterials.length === 0 ? (
                                    <TableRow>
                                        <TableCell className="px-6 py-12 text-center text-gray-500 dark:text-gray-400" colSpan={2}>
                                            {materialsSearch ? (
                                                <div>
                                                    <p>{t('common.noSearchResults')}</p>
                                                    <button
                                                        onClick={() => setMaterialsSearch('')}
                                                        className="mt-2 text-sm text-brand-500 hover:text-brand-600"
                                                    >
                                                        {t('common.clearSearch')}
                                                    </button>
                                                </div>
                                            ) : (
                                                t('zones.detail.noMaterials')
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMaterials.map((material) => (
                                        <TableRow
                                            key={material.id}
                                            className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50"
                                        >
                                            <TableCell className="px-6 py-4">
                                                <LinkedName
                                                    canView={canViewMaterial}
                                                    id={material.id}
                                                    name={material.name}
                                                    basePath="materials" />
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {material.description || <span className="text-gray-400">—</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Empty state for zones that are neither parent nor allow materials */}
            {!isParentZone && !isLeafZoneWithMaterials && (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-white/5 dark:bg-white/3">
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('zones.detail.emptyZone')}
                    </p>
                </div>
            )}

            {/* Edit Modal */}
            <ZoneModal
                isOpen={editModal.isOpen}
                onClose={editModal.closeModal}
                onSuccess={handleZoneUpdated}
                zone={zone}
            />
        </>
    );
}

export default ZoneDetailPage;
