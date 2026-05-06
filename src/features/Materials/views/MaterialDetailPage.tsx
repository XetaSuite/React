import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
    FaArrowLeft,
    FaPenToSquare,
    FaWrench,
    FaScrewdriverWrench,
    FaCalendar,
    FaBell,
    FaEnvelope,
    FaUsers,
    FaLayerGroup,
    FaTriangleExclamation,
    FaBroom,
    FaCubes,
    FaQrcode,
} from 'react-icons/fa6';
import { MaterialManager } from '../services/MaterialManager';
import { MaterialModal } from './MaterialModal';
import { MaterialQrCodeModal } from './MaterialQrCodeModal';
import type { MaterialDetail } from '../types';
import { MaterialStatsCharts, MaterialRelatedTabs } from '../components';
import PageBreadcrumb from '@/shared/components/common/PageBreadcrumb';
import PageMeta from '@/shared/components/common/PageMeta';
import { Button, Badge, LinkedName } from '@/shared/components/ui';
import { useModal } from '@/shared/hooks';
import { useAuth } from '@/features/Auth/hooks';
import { formatDate } from '@/shared/utils';
import { NotFoundContent } from '@/shared/components/errors';

const frequencyLabels: Record<string, string> = {
    daily: 'materials.frequencyDaily',
    weekly: 'materials.frequencyWeekly',
    monthly: 'materials.frequencyMonthly',
};

export function MaterialDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const { hasPermission, isOnHeadquarters } = useAuth();

    // Material state
    const [material, setMaterial] = useState<MaterialDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [materialError, setMaterialError] = useState<string | null>(null);

    // Modals
    const editModal = useModal();
    const qrCodeModal = useModal();

    // Permissions
    const canUpdate = !isOnHeadquarters && hasPermission('material.update');
    const canGenerateQrCode = !isOnHeadquarters && hasPermission('material.generateQrCode');
    const canViewCreatorAndRecipients = isOnHeadquarters && hasPermission('user.view');
    const canViewZone = hasPermission('zone.view');

    // Load material details
    const loadMaterial = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        setMaterialError(null);

        const result = await MaterialManager.getById(parseInt(id));

        if (result.success && result.data) {
            setMaterial(result.data.data);
        } else {
            setMaterialError(result.error || t('materials.errors.loadFailed'));
        }

        setIsLoading(false);
    }, [id, t]);

    // Initial load
    useEffect(() => {
        loadMaterial();
    }, [loadMaterial]);

    // Handle material update
    const handleMaterialUpdated = async () => {
        editModal.closeModal();
        await loadMaterial();
    };

    if (isLoading) {
        return (
            <div className="flex min-h-96 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-500"></div>
            </div>
        );
    }

    if (materialError || !material) {
        return (
            <>
                <PageMeta title={`${t('errors.notFound')} | XetaSuite`} description={t('errors.pageNotFound')} />
                <NotFoundContent
                    title={t('materials.notFound')}
                    message={t('materials.notFoundMessage')}
                    backTo="/materials"
                    backLabel={t('materials.detail.backToList')}
                />
            </>
        );
    }

    return (
        <>
            <PageMeta
                title={`${material.name} | ${t('materials.title')} | XetaSuite`}
                description={t('materials.description')}
            />
            <PageBreadcrumb
                pageTitle={material.name}
                breadcrumbs={[{ label: t('materials.title'), path: '/materials' }, { label: material.name }]}
            />

            {/* Header Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/5 dark:bg-white/3 lg:p-6">
                {/* Header Row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/materials"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-white/5 dark:text-gray-400 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-gray-200"
                            title={t('common.back')}
                        >
                            <FaArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <FaWrench className="h-5 w-5 text-gray-400" />
                                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{material.name}</h1>
                            </div>
                            {material.description && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{material.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canGenerateQrCode && (
                            <Button
                                variant="outline"
                                size="sm"
                                startIcon={<FaQrcode className="h-4 w-4" />}
                                onClick={() => qrCodeModal.openModal()}
                            >
                                {t('common.qrCode')}
                            </Button>
                        )}
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
                                {material.incident_count}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('materials.stats.incidents')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-500/20">
                            <FaScrewdriverWrench className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {material.maintenance_count}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('materials.stats.maintenances')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-500/20">
                            <FaBroom className="h-5 w-5 text-success-600 dark:text-success-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {material.cleaning_count}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('materials.stats.cleanings')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20">
                            <FaCubes className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{material.item_count}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('materials.stats.items')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Material Information */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                        {t('materials.detail.info')}
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <FaLayerGroup className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('materials.zone')}
                                </p>
                                <LinkedName
                                    canView={canViewZone}
                                    id={material.zone?.id}
                                    name={material.zone?.name}
                                    basePath="zones" />
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FaUsers className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('materials.createdBy')}
                                </p>
                                <LinkedName
                                    canView={canViewCreatorAndRecipients}
                                    id={material.creator?.id}
                                    name={material.creator?.full_name}
                                    basePath="users" />
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FaCalendar className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('common.createdAt')}
                                </p>
                                <p className="text-gray-900 dark:text-white">{formatDate(material.created_at)}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FaBroom className="mt-0.5 h-4 w-4 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    {t('materials.lastCleaning')}
                                </p>
                                <p className="text-gray-900 dark:text-white">
                                    {material.last_cleaning_at ? (
                                        formatDate(material.last_cleaning_at)
                                    ) : (
                                        <span className="text-gray-400">{t('materials.neverCleaned')}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cleaning Alert Settings */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-white">
                        <FaBell className="h-4 w-4" />
                        {t('materials.cleaningAlertSettings')}
                    </h3>

                    {material.cleaning_alert ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge color="success">{t('common.enabled')}</Badge>
                                {material.cleaning_alert_email && (
                                    <Badge color="brand">
                                        <FaEnvelope className="mr-1 h-3 w-3" />
                                        {t('materials.emailEnabled')}
                                    </Badge>
                                )}
                            </div>

                            <div className="rounded-lg bg-gray-50 p-4 dark:bg-neutral-800/50">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('materials.frequency')}</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {t('materials.every')}{' '}
                                    <span className="text-brand-600 dark:text-brand-400">
                                        {material.cleaning_alert_frequency_repeatedly}
                                    </span>{' '}
                                    {t(frequencyLabels[material.cleaning_alert_frequency_type] || 'materials.frequencyDaily')}
                                </p>
                            </div>

                            {/* Recipients */}
                            {material.recipients && material.recipients.length > 0 && (
                                <div>
                                    <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('materials.recipients')} ({material.recipients.length})
                                    </p>
                                    <div className="space-y-2">
                                        {material.recipients.map((recipient) => (
                                            <div
                                                key={recipient.id}
                                                className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-neutral-800/50"
                                            >
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                                                    {recipient.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <LinkedName
                                                        canView={canViewCreatorAndRecipients}
                                                        id={recipient.id}
                                                        name={recipient.full_name}
                                                        basePath="users" />
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {recipient.email}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Badge color="dark">{t('common.disabled')}</Badge>
                            <span className="text-sm">{t('materials.cleaningAlertDisabled')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Statistics Charts */}
            <MaterialStatsCharts materialId={material.id} />

            {/* Related Tabs (Incidents, Maintenances, Cleanings, Items) */}
            <MaterialRelatedTabs material={material} />

            {/* Edit Modal */}
            <MaterialModal
                isOpen={editModal.isOpen}
                onClose={editModal.closeModal}
                material={material}
                onSuccess={handleMaterialUpdated}
            />

            {/* QR Code Modal */}
            <MaterialQrCodeModal
                isOpen={qrCodeModal.isOpen}
                onClose={qrCodeModal.closeModal}
                material={material}
            />
        </>
    );
}

export default MaterialDetailPage;
