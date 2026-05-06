import { useState, useEffect, useRef, useCallback, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaCheck } from 'react-icons/fa6';
import { Modal, Button, SearchableDropdown, type PinnedItem } from '@/shared/components/ui';
import { Label, Input, TextArea } from '@/shared/components/form';
import { showSuccess, showError } from '@/shared/utils';
import { IncidentManager } from '../services';
import type {
    Incident,
    IncidentFormData,
    AvailableMaterial,
    AvailableMaintenance,
    SeverityOption,
    StatusOption,
    IncidentSeverity,
    IncidentStatus,
} from '../types';

interface IncidentModalProps {
    isOpen: boolean;
    onClose: () => void;
    incident: Incident | null;
    onSuccess: () => void;
    preselectedMaterialId?: number | null;
}

const initialFormData: IncidentFormData = {
    material_id: 0,
    maintenance_id: null,
    description: '',
    severity: 'medium',
    status: 'open',
    started_at: null,
    resolved_at: null,
};

export const IncidentModal: FC<IncidentModalProps> = ({
    isOpen,
    onClose,
    incident,
    onSuccess,
    preselectedMaterialId
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<IncidentFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Available options
    const [availableMaterials, setAvailableMaterials] = useState<AvailableMaterial[]>([]);
    const [availableMaintenances, setAvailableMaintenances] = useState<AvailableMaintenance[]>([]);
    const [severityOptions, setSeverityOptions] = useState<SeverityOption[]>([]);
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [isLoadingMaintenances, setIsLoadingMaintenances] = useState(false);

    // Dropdown states for severity and status (keep simple dropdowns for these)
    const [isSeverityDropdownOpen, setIsSeverityDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    // Original material and maintenance for pinned items
    const [originalMaterial, setOriginalMaterial] = useState<AvailableMaterial | null>(null);
    const [originalMaintenance, setOriginalMaintenance] = useState<AvailableMaintenance | null>(null);

    // Check if resolved_at should be shown (resolved or closed status)
    const showResolvedAt = formData.status === 'resolved' || formData.status === 'closed';

    // Refs for severity and status dropdowns
    const severityDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    const isEditing = incident !== null;

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setFormData(initialFormData);
            setErrors({});
            setIsSeverityDropdownOpen(false);
            setIsStatusDropdownOpen(false);
            setOriginalMaterial(null);
            setOriginalMaintenance(null);
        }
    }, [isOpen]);

    // Close severity/status dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (severityDropdownRef.current && !severityDropdownRef.current.contains(event.target as Node)) {
                setIsSeverityDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadMaintenances = useCallback(async (materialId: number) => {
        setIsLoadingMaintenances(true);
        const result = await IncidentManager.getAvailableMaintenances(materialId);
        if (result.success && result.data) {
            setAvailableMaintenances(result.data);
        }
        setIsLoadingMaintenances(false);
    }, []);

    // Load maintenances when material changes
    useEffect(() => {
        if (formData.material_id > 0) {
            loadMaintenances(formData.material_id);
        } else {
            setAvailableMaintenances([]);
            setFormData((prev) => ({ ...prev, maintenance_id: null }));
        }
    }, [formData.material_id, loadMaintenances]);

    const loadOptions = useCallback(async () => {
        setIsLoadingOptions(true);

        const [materialsResult, severityResult, statusResult] = await Promise.all([
            IncidentManager.getAvailableMaterials(),
            IncidentManager.getSeverityOptions(),
            IncidentManager.getStatusOptions(),
        ]);

        if (materialsResult.success && materialsResult.data) {
            setAvailableMaterials(materialsResult.data);
        }

        if (severityResult.success && severityResult.data) {
            setSeverityOptions(severityResult.data);
        }

        if (statusResult.success && statusResult.data) {
            setStatusOptions(statusResult.data);
        }

        // Initialize form data for editing
        if (incident) {
            const incidentDetailResult = await IncidentManager.getById(incident.id);
            if (incidentDetailResult.success && incidentDetailResult.data) {
                const detail = incidentDetailResult.data.data;
                setFormData({
                    material_id: detail.material_id || 0,
                    maintenance_id: detail.maintenance_id || null,
                    description: detail.description,
                    severity: detail.severity,
                    status: detail.status,
                    started_at: detail.started_at,
                    resolved_at: detail.resolved_at,
                });

                // Save original material for pinned item
                if (detail.material_id && detail.material_name) {
                    setOriginalMaterial({
                        id: detail.material_id,
                        name: detail.material_name,
                    });
                }

                // Save original maintenance for pinned item
                if (detail.maintenance_id && detail.maintenance) {
                    setOriginalMaintenance({
                        id: detail.maintenance_id,
                        description: detail.maintenance.description,
                        material_id: detail.material_id || 0,
                        material_name: detail.material_name,
                    });
                }

                // Load maintenances for the selected material
                if (detail.material_id) {
                    await loadMaintenances(detail.material_id);
                }
            }
        } else {
            // Creating new cleaning
            // Check for preselected material from QR scan
            if (preselectedMaterialId) {
                setFormData((prev) => ({ ...prev, material_id: preselectedMaterialId }));
                // Find and set original material for display
                if (materialsResult.success && materialsResult.data) {
                    const preselected = materialsResult.data.find(m => m.id === preselectedMaterialId);
                    if (preselected) {
                        setOriginalMaterial(preselected);
                    }
                }
            } else if (materialsResult.success && materialsResult.data && materialsResult.data.length > 0) {
                // Set default material if creating and materials available
                setFormData((prev) => ({ ...prev, material_id: materialsResult.data![0].id }));
            }
        }

        setIsLoadingOptions(false);
    }, [incident, preselectedMaterialId, loadMaintenances]);

    // Load options when modal opens
    useEffect(() => {
        if (isOpen) {
            loadOptions();
        }
    }, [isOpen, loadOptions]);

    // Search maintenances via API (searches across all maintenances of the site)
    const searchMaintenances = useCallback(async (search: string) => {
        setIsLoadingMaintenances(true);
        // When searching, don't filter by material_id to allow searching all site maintenances
        const result = await IncidentManager.getAvailableMaintenances(
            search ? undefined : formData.material_id || undefined,
            search || undefined
        );
        if (result.success && result.data) {
            setAvailableMaintenances(result.data);
        }
        setIsLoadingMaintenances(false);
    }, [formData.material_id]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.material_id) {
            newErrors.material_id = t('incidents.validation.materialRequired');
        }

        if (!formData.description.trim()) {
            newErrors.description = t('validation.required');
        } else if (formData.description.length > 1000) {
            newErrors.description = t('validation.descriptionMaxLength');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);

        const submitData: IncidentFormData = {
            ...formData,
            maintenance_id: formData.maintenance_id || null,
        };

        let result;
        if (isEditing) {
            result = await IncidentManager.update(incident.id, submitData);
        } else {
            result = await IncidentManager.create(submitData);
        }

        if (result.success) {
            const successMessage = isEditing
                ? t('incidents.messages.updated')
                : t('incidents.messages.created');
            showSuccess(successMessage);
            onSuccess();
            onClose();
        } else {
            showError(result.error || t('errors.generic'));
            setErrors({ general: result.error || t('errors.generic') });
        }
        setIsLoading(false);
    };

    const getSeverityColor = (severity: IncidentSeverity): string => {
        switch (severity) {
            case 'critical':
                return 'text-error-600 dark:text-error-400';
            case 'high':
                return 'text-warning-600 dark:text-warning-400';
            case 'medium':
                return 'text-brand-600 dark:text-brand-400';
            case 'low':
                return 'text-success-600 dark:text-success-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getStatusColor = (status: IncidentStatus): string => {
        switch (status) {
            case 'open':
                return 'text-error-600 dark:text-error-400';
            case 'in_progress':
                return 'text-warning-600 dark:text-warning-400';
            case 'resolved':
                return 'text-success-600 dark:text-success-400';
            case 'closed':
                return 'text-gray-600 dark:text-gray-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6 lg:p-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? t('incidents.edit') : t('incidents.create')}
            </h2>

            {errors.general && (
                <div className="mb-4 rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {errors.general}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    {/* Material Selection */}
                    <div>
                        <Label>{t('incidents.material')} *</Label>
                        <SearchableDropdown
                            value={formData.material_id || null}
                            onChange={(value) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    material_id: value || 0,
                                    maintenance_id: null,
                                }));
                                if (errors.material_id) {
                                    setErrors((prev) => ({ ...prev, material_id: '' }));
                                }
                            }}
                            options={availableMaterials}
                            placeholder={t('incidents.form.selectMaterial')}
                            searchPlaceholder={t('incidents.form.searchMaterial')}
                            noResultsText={t('common.noResults')}
                            loadingText={t('common.loading')}
                            disabled={isEditing}
                            isLoading={isLoadingOptions}
                            pinnedItem={originalMaterial ? {
                                id: originalMaterial.id,
                                name: originalMaterial.name,
                                label: t('incidents.form.currentMaterial'),
                            } as PinnedItem : undefined}
                            className="mt-1.5"
                        />
                        {errors.material_id && <p className="mt-1 text-xs text-error-500">{errors.material_id}</p>}
                        {isEditing && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {t('incidents.form.materialCannotBeChanged')}
                            </p>
                        )}
                    </div>

                    {/* Maintenance Selection (Optional) */}
                    <div>
                        <Label>{t('incidents.maintenance')} ({t('common.optional')})</Label>
                        <SearchableDropdown
                            value={formData.maintenance_id}
                            onChange={(value) => setFormData((prev) => ({ ...prev, maintenance_id: value }))}
                            options={availableMaintenances.map(m => ({ ...m, name: `#${m.id} - ${m.description}` }))}
                            placeholder={t('incidents.form.selectMaintenance')}
                            searchPlaceholder={t('incidents.form.searchMaintenance')}
                            noSelectionText={t('incidents.form.noMaintenance')}
                            noResultsText={t('common.noResults')}
                            loadingText={t('common.loading')}
                            nullable
                            disabled={!formData.material_id}
                            isLoading={isLoadingMaintenances}
                            onSearch={searchMaintenances}
                            pinnedItem={originalMaintenance ? {
                                id: originalMaintenance.id,
                                name: `#${originalMaintenance.id} - ${originalMaintenance.description}`,
                                label: t('incidents.form.currentMaintenance'),
                            } as PinnedItem : undefined}
                            renderOption={(opt) => {
                                const original = availableMaintenances.find(m => m.id === opt.id);
                                return (
                                    <div className="flex-1 min-w-0">
                                        <span className="text-gray-800 dark:text-white/90">
                                            #{opt.id} - <span className="line-clamp-1">{original?.description}</span>
                                        </span>
                                        {original?.material_name && (
                                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                {original.material_name}
                                            </span>
                                        )}
                                    </div>
                                );
                            }}
                            className="mt-1.5"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('incidents.form.maintenanceHint')}
                        </p>
                    </div>

                    {/* Severity Selection */}
                    <div>
                        <Label>{t('incidents.severity')}</Label>
                        <div className="relative mt-1.5" ref={severityDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsSeverityDropdownOpen(!isSeverityDropdownOpen)}
                                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-white/5 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800"
                            >
                                <span className={getSeverityColor(formData.severity || 'medium')}>
                                    {severityOptions.find((s) => s.value === formData.severity)?.label ||
                                        t('incidents.form.selectSeverity')}
                                </span>
                                <FaChevronDown
                                    className={`h-4 w-4 text-gray-400 transition-transform ${isSeverityDropdownOpen ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            {isSeverityDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                    {severityOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                setFormData((prev) => ({ ...prev, severity: option.value }));
                                                setIsSeverityDropdownOpen(false);
                                            }}
                                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                        >
                                            <span className={getSeverityColor(option.value)}>{option.label}</span>
                                            {formData.severity === option.value && (
                                                <FaCheck className="h-4 w-4 text-brand-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Selection */}
                    <div>
                        <Label>{t('incidents.status')}</Label>
                        <div className="relative mt-1.5" ref={statusDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-white/5 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800"
                            >
                                <span className={getStatusColor(formData.status || 'open')}>
                                    {statusOptions.find((s) => s.value === formData.status)?.label ||
                                        t('incidents.form.selectStatus')}
                                </span>
                                <FaChevronDown
                                    className={`h-4 w-4 text-gray-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            {isStatusDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                    {statusOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                setFormData((prev) => ({ ...prev, status: option.value }));
                                                setIsStatusDropdownOpen(false);
                                            }}
                                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                        >
                                            <span className={getStatusColor(option.value)}>{option.label}</span>
                                            {formData.status === option.value && (
                                                <FaCheck className="h-4 w-4 text-brand-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date fields */}
                    <div className={`grid gap-4 ${showResolvedAt ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div>
                            <Label htmlFor="started_at">{t('incidents.startedAt')}</Label>
                            <Input
                                type="datetime-local"
                                id="started_at"
                                name="started_at"
                                value={formData.started_at ? formData.started_at.slice(0, 16) : ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData((prev) => ({
                                        ...prev,
                                        started_at: value ? `${value}:00` : null,
                                    }));
                                }}
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {t('incidents.form.startedAtHint')}
                            </p>
                        </div>
                        {showResolvedAt && (
                            <div>
                                <Label htmlFor="resolved_at">{t('incidents.resolvedAt')}</Label>
                                <Input
                                    type="datetime-local"
                                    id="resolved_at"
                                    name="resolved_at"
                                    value={formData.resolved_at ? formData.resolved_at.slice(0, 16) : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData((prev) => ({
                                            ...prev,
                                            resolved_at: value ? `${value}:00` : null,
                                        }));
                                    }}
                                />
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {t('incidents.form.resolvedAtHint')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">{t('common.description')} *</Label>
                        <TextArea
                            id="description"
                            name="description"
                            rows={4}
                            placeholder={t('incidents.form.descriptionPlaceholder')}
                            value={formData.description}
                            onChange={(value) => {
                                setFormData((prev) => ({ ...prev, description: value }));
                                if (errors.description) {
                                    setErrors((prev) => ({ ...prev, description: '' }));
                                }
                            }}
                            error={!!errors.description}
                            hint={errors.description}
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                        {t('common.close')}
                    </Button>
                    <Button type="submit" variant="primary" isLoading={isLoading}>
                        {isEditing ? t('common.edit') : t('common.create')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default IncidentModal;
