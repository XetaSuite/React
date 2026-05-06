import { useState, useEffect, useRef, useCallback, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaCheck, FaPlus, FaTrash, FaMinus } from 'react-icons/fa6';
import { Modal, Button, SearchableDropdown, type PinnedItem } from '@/shared/components/ui';
import { Label, Input, TextArea } from '@/shared/components/form';
import { showSuccess, showError } from '@/shared/utils';
import { useSettings } from '@/features/Settings';
import { MaintenanceManager } from '../services';
import type {
    Maintenance,
    MaintenanceFormData,
    MaintenanceRealization,
    MaintenanceType,
    MaintenanceStatus,
    AvailableMaterial,
    AvailableIncident,
    AvailableOperator,
    AvailableCompany,
    AvailableItem,
    TypeOption,
    StatusOption,
    RealizationOption,
} from '../types';

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    maintenance: Maintenance | null;
    onSuccess: () => void;
    preselectedMaterialId?: number | null;
}

const initialFormData: MaintenanceFormData = {
    material_id: null,
    description: '',
    type: 'corrective',
    realization: 'internal',
    status: 'planned',
    started_at: null,
    resolved_at: null,
    incident_ids: [],
    operator_ids: [],
    company_ids: [],
    item_movements: [],
};

export const MaintenanceModal: FC<MaintenanceModalProps> = ({
    isOpen,
    onClose,
    maintenance,
    onSuccess,
    preselectedMaterialId
}) => {
    const { t } = useTranslation();
    const { getCurrencySymbol } = useSettings();
    const [formData, setFormData] = useState<MaintenanceFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Available options
    const [availableMaterials, setAvailableMaterials] = useState<AvailableMaterial[]>([]);
    const [availableIncidents, setAvailableIncidents] = useState<AvailableIncident[]>([]);
    const [availableOperators, setAvailableOperators] = useState<AvailableOperator[]>([]);
    const [availableCompanies, setAvailableCompanies] = useState<AvailableCompany[]>([]);
    const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
    const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
    const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
    const [realizationOptions, setRealizationOptions] = useState<RealizationOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    // Dropdown states for type, status, realization
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isRealizationDropdownOpen, setIsRealizationDropdownOpen] = useState(false);

    // Multi-select dropdowns
    const [isIncidentsDropdownOpen, setIsIncidentsDropdownOpen] = useState(false);
    const [isOperatorsDropdownOpen, setIsOperatorsDropdownOpen] = useState(false);
    const [isCompaniesDropdownOpen, setIsCompaniesDropdownOpen] = useState(false);
    const [isItemsDropdownOpen, setIsItemsDropdownOpen] = useState(false);

    // Search states
    const [incidentSearch, setIncidentSearch] = useState('');
    const [operatorSearch, setOperatorSearch] = useState('');
    const [companySearch, setCompanySearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');

    // Original data for editing (to display selected items that may not be in available lists)
    const [originalMaterial, setOriginalMaterial] = useState<AvailableMaterial | null>(null);
    const [originalOperators, setOriginalOperators] = useState<AvailableOperator[]>([]);
    const [originalCompanies, setOriginalCompanies] = useState<AvailableCompany[]>([]);
    const [originalIncidents, setOriginalIncidents] = useState<AvailableIncident[]>([]);

    // Check if resolved_at should be shown (completed or canceled status)
    const showResolvedAt = formData.status === 'completed' || formData.status === 'canceled';

    // Check what executors to show based on realization
    const showOperators = formData.realization === 'internal' || formData.realization === 'both';
    const showCompanies = formData.realization === 'external' || formData.realization === 'both';

    // Refs for dropdowns
    const typeDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const realizationDropdownRef = useRef<HTMLDivElement>(null);
    const incidentsDropdownRef = useRef<HTMLDivElement>(null);
    const operatorsDropdownRef = useRef<HTMLDivElement>(null);
    const companiesDropdownRef = useRef<HTMLDivElement>(null);
    const itemsDropdownRef = useRef<HTMLDivElement>(null);

    const isEditing = maintenance !== null;

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setFormData(initialFormData);
            setErrors({});
            setIsTypeDropdownOpen(false);
            setIsStatusDropdownOpen(false);
            setIsRealizationDropdownOpen(false);
            setIsIncidentsDropdownOpen(false);
            setIsOperatorsDropdownOpen(false);
            setIsCompaniesDropdownOpen(false);
            setIsItemsDropdownOpen(false);
            setOriginalMaterial(null);
            setOriginalOperators([]);
            setOriginalCompanies([]);
            setOriginalIncidents([]);
            setIncidentSearch('');
            setOperatorSearch('');
            setCompanySearch('');
            setItemSearch('');
        }
    }, [isOpen]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) {
                setIsTypeDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
                setIsStatusDropdownOpen(false);
            }
            if (realizationDropdownRef.current && !realizationDropdownRef.current.contains(target)) {
                setIsRealizationDropdownOpen(false);
            }
            if (incidentsDropdownRef.current && !incidentsDropdownRef.current.contains(target)) {
                setIsIncidentsDropdownOpen(false);
            }
            if (operatorsDropdownRef.current && !operatorsDropdownRef.current.contains(target)) {
                setIsOperatorsDropdownOpen(false);
            }
            if (companiesDropdownRef.current && !companiesDropdownRef.current.contains(target)) {
                setIsCompaniesDropdownOpen(false);
            }
            if (itemsDropdownRef.current && !itemsDropdownRef.current.contains(target)) {
                setIsItemsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search for dropdowns
    useEffect(() => {
        const timer = setTimeout(() => {
            if (incidentSearch) searchIncidents(incidentSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [incidentSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (operatorSearch) searchOperators(operatorSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [operatorSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (companySearch) searchCompanies(companySearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [companySearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (itemSearch) searchItems(itemSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [itemSearch]);

    const loadOptions = useCallback(async () => {
        setIsLoadingOptions(true);

        const [
            materialsResult,
            incidentsResult,
            operatorsResult,
            companiesResult,
            itemsResult,
            typeResult,
            statusResult,
            realizationResult,
        ] = await Promise.all([
            MaintenanceManager.getAvailableMaterials(),
            MaintenanceManager.getAvailableIncidents(),
            MaintenanceManager.getAvailableOperators(),
            MaintenanceManager.getAvailableCompanies(),
            MaintenanceManager.getAvailableItems(),
            MaintenanceManager.getTypeOptions(),
            MaintenanceManager.getStatusOptions(),
            MaintenanceManager.getRealizationOptions(),
        ]);

        if (materialsResult.success && materialsResult.data) {
            setAvailableMaterials(materialsResult.data);
        }
        if (incidentsResult.success && incidentsResult.data) {
            setAvailableIncidents(incidentsResult.data);
        }
        if (operatorsResult.success && operatorsResult.data) {
            setAvailableOperators(operatorsResult.data);
        }
        if (companiesResult.success && companiesResult.data) {
            setAvailableCompanies(companiesResult.data);
        }
        if (itemsResult.success && itemsResult.data) {
            setAvailableItems(itemsResult.data);
        }
        if (typeResult.success && typeResult.data) {
            setTypeOptions(typeResult.data);
        }
        if (statusResult.success && statusResult.data) {
            setStatusOptions(statusResult.data);
        }
        if (realizationResult.success && realizationResult.data) {
            setRealizationOptions(realizationResult.data);
        }

        // Initialize form data for editing
        if (maintenance) {
            const detailResult = await MaintenanceManager.getById(maintenance.id);
            if (detailResult.success && detailResult.data) {
                const detail = detailResult.data.data;
                setFormData({
                    material_id: detail.material_id || null,
                    description: detail.description,
                    type: detail.type,
                    realization: detail.realization,
                    status: detail.status,
                    started_at: detail.started_at,
                    resolved_at: detail.resolved_at,
                    incident_ids: detail.incidents?.map(i => i.id) || [],
                    operator_ids: detail.operators?.map(o => o.id) || [],
                    company_ids: detail.companies?.map(c => c.id) || [],
                    item_movements: [], // Don't pre-populate spare parts for editing
                });

                // Save original material for pinned item
                if (detail.material_id && detail.material_name) {
                    setOriginalMaterial({
                        id: detail.material_id,
                        name: detail.material_name,
                    });
                }

                // Save original operators, companies, and incidents for display
                if (detail.operators && detail.operators.length > 0) {
                    setOriginalOperators(detail.operators.map(o => ({
                        id: o.id,
                        full_name: o.full_name,
                        email: o.email,
                    })));
                }
                if (detail.companies && detail.companies.length > 0) {
                    setOriginalCompanies(detail.companies.map(c => ({
                        id: c.id,
                        name: c.name,
                    })));
                }
                if (detail.incidents && detail.incidents.length > 0) {
                    setOriginalIncidents(detail.incidents.map(i => ({
                        id: i.id,
                        description: i.description,
                        severity: i.severity,
                        severity_label: i.severity_label,
                        material_id: null,
                        material_name: null,
                    })));
                }
            }
        } else {
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
    }, [maintenance, preselectedMaterialId]);

    // Load options when modal opens
    useEffect(() => {
        if (isOpen) {
            loadOptions();
        }
    }, [isOpen, loadOptions]);

    const searchIncidents = async (search: string) => {
        const result = await MaintenanceManager.getAvailableIncidents(search);
        if (result.success && result.data) {
            setAvailableIncidents(result.data);
        }
    };

    const searchOperators = async (search: string) => {
        const result = await MaintenanceManager.getAvailableOperators(search);
        if (result.success && result.data) {
            setAvailableOperators(result.data);
        }
    };

    const searchCompanies = async (search: string) => {
        const result = await MaintenanceManager.getAvailableCompanies(search);
        if (result.success && result.data) {
            setAvailableCompanies(result.data);
        }
    };

    const searchItems = async (search: string) => {
        const result = await MaintenanceManager.getAvailableItems(search);
        if (result.success && result.data) {
            setAvailableItems(result.data);
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.description.trim()) {
            newErrors.description = t('validation.required');
        }

        // Validate operators required for internal/both realization
        if ((formData.realization === 'internal' || formData.realization === 'both') &&
            (!formData.operator_ids || formData.operator_ids.length === 0)) {
            newErrors.operator_ids = t('maintenances.form.operatorsRequired');
        }

        // Validate companies required for external/both realization
        if ((formData.realization === 'external' || formData.realization === 'both') &&
            (!formData.company_ids || formData.company_ids.length === 0)) {
            newErrors.company_ids = t('maintenances.form.companiesRequired');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);

        // Prepare submit data
        const submitData: MaintenanceFormData = {
            ...formData,
            material_id: formData.material_id || null,
        };

        // Only include operator_ids if internal/both
        if (formData.realization !== 'internal' && formData.realization !== 'both') {
            submitData.operator_ids = [];
        }

        // Only include company_ids if external/both
        if (formData.realization !== 'external' && formData.realization !== 'both') {
            submitData.company_ids = [];
        }

        let result;
        if (isEditing) {
            result = await MaintenanceManager.update(maintenance.id, submitData);
        } else {
            result = await MaintenanceManager.create(submitData);
        }

        if (result.success) {
            const successMessage = isEditing
                ? t('maintenances.messages.updated')
                : t('maintenances.messages.created');
            showSuccess(successMessage);
            onSuccess();
            onClose();
        } else {
            showError(result.error || t('errors.generic'));
            setErrors({ general: result.error || t('errors.generic') });
        }
        setIsLoading(false);
    };

    // Toggle functions for multi-select
    const toggleIncident = (id: number) => {
        setFormData(prev => ({
            ...prev,
            incident_ids: prev.incident_ids?.includes(id)
                ? prev.incident_ids.filter(i => i !== id)
                : [...(prev.incident_ids || []), id]
        }));
    };

    const toggleOperator = (id: number) => {
        setFormData(prev => ({
            ...prev,
            operator_ids: prev.operator_ids?.includes(id)
                ? prev.operator_ids.filter(i => i !== id)
                : [...(prev.operator_ids || []), id]
        }));
        if (errors.operator_ids) {
            setErrors(prev => ({ ...prev, operator_ids: '' }));
        }
    };

    const toggleCompany = (id: number) => {
        setFormData(prev => ({
            ...prev,
            company_ids: prev.company_ids?.includes(id)
                ? prev.company_ids.filter(i => i !== id)
                : [...(prev.company_ids || []), id]
        }));
        if (errors.company_ids) {
            setErrors(prev => ({ ...prev, company_ids: '' }));
        }
    };

    // Spare parts functions
    const addSparePart = (item: AvailableItem) => {
        // Check if already added
        if (formData.item_movements?.some(im => im.item_id === item.id)) {
            return;
        }
        setFormData(prev => ({
            ...prev,
            item_movements: [...(prev.item_movements || []), { item_id: item.id, quantity: 1 }]
        }));
        setIsItemsDropdownOpen(false);
        setItemSearch('');
    };

    const updateSparePartQuantity = (itemId: number, quantity: number) => {
        const item = availableItems.find(i => i.id === itemId);
        const maxStock = item?.current_stock || 999;
        const newQuantity = Math.max(1, Math.min(quantity, maxStock));

        setFormData(prev => ({
            ...prev,
            item_movements: prev.item_movements?.map(im =>
                im.item_id === itemId ? { ...im, quantity: newQuantity } : im
            ) || []
        }));
    };

    const removeSparePart = (itemId: number) => {
        setFormData(prev => ({
            ...prev,
            item_movements: prev.item_movements?.filter(im => im.item_id !== itemId) || []
        }));
    };

    const getTypeColor = (type: MaintenanceType): string => {
        switch (type) {
            case 'corrective':
                return 'text-error-600 dark:text-error-400';
            case 'preventive':
                return 'text-success-600 dark:text-success-400';
            case 'inspection':
                return 'text-brand-600 dark:text-brand-400';
            case 'improvement':
                return 'text-warning-600 dark:text-warning-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getStatusColor = (status: MaintenanceStatus): string => {
        switch (status) {
            case 'planned':
                return 'text-brand-600 dark:text-brand-400';
            case 'in_progress':
                return 'text-warning-600 dark:text-warning-400';
            case 'completed':
                return 'text-success-600 dark:text-success-400';
            case 'canceled':
                return 'text-gray-600 dark:text-gray-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getRealizationColor = (realization: MaintenanceRealization): string => {
        switch (realization) {
            case 'internal':
                return 'text-brand-600 dark:text-brand-400';
            case 'external':
                return 'text-warning-600 dark:text-warning-400';
            case 'both':
                return 'text-success-600 dark:text-success-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl p-6 lg:p-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? t('maintenances.edit') : t('maintenances.create')}
            </h2>

            {errors.general && (
                <div className="mb-4 rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {errors.general}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Row 1: Type and Realization */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Type Selection */}
                        <div>
                            <Label>{t('maintenances.fields.type')} *</Label>
                            <div className="relative mt-1.5" ref={typeDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:bg-white/3 dark:border-white/5 dark:text-white/90 dark:focus:border-brand-800"
                                >
                                    <span className={getTypeColor(formData.type)}>
                                        {typeOptions.find(t => t.value === formData.type)?.label || t('maintenances.form.selectType')}
                                    </span>
                                    <FaChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isTypeDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                        {typeOptions.map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, type: option.value }));
                                                    setIsTypeDropdownOpen(false);
                                                }}
                                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                            >
                                                <span className={getTypeColor(option.value)}>{option.label}</span>
                                                {formData.type === option.value && <FaCheck className="h-4 w-4 text-brand-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Realization Selection */}
                        <div>
                            <Label>{t('maintenances.fields.realization')} *</Label>
                            <div className="relative mt-1.5" ref={realizationDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsRealizationDropdownOpen(!isRealizationDropdownOpen)}
                                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:bg-white/3 dark:border-white/5 dark:text-white/90 dark:focus:border-brand-800"
                                >
                                    <span className={getRealizationColor(formData.realization)}>
                                        {realizationOptions.find(r => r.value === formData.realization)?.label || t('maintenances.form.selectRealization')}
                                    </span>
                                    <FaChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isRealizationDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isRealizationDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                        {realizationOptions.map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        realization: option.value,
                                                        // Clear operators/companies based on new realization
                                                        operator_ids: option.value === 'external' ? [] : prev.operator_ids,
                                                        company_ids: option.value === 'internal' ? [] : prev.company_ids,
                                                    }));
                                                    setIsRealizationDropdownOpen(false);
                                                }}
                                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                            >
                                                <span className={getRealizationColor(option.value)}>{option.label}</span>
                                                {formData.realization === option.value && <FaCheck className="h-4 w-4 text-brand-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Status and Material */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Status Selection */}
                        <div>
                            <Label>{t('maintenances.fields.status')}</Label>
                            <div className="relative mt-1.5" ref={statusDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:bg-white/3 dark:border-white/5 dark:text-white/90 dark:focus:border-brand-800"
                                >
                                    <span className={getStatusColor(formData.status || 'planned')}>
                                        {statusOptions.find(s => s.value === formData.status)?.label || t('maintenances.form.selectStatus')}
                                    </span>
                                    <FaChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isStatusDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                        {statusOptions.map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, status: option.value }));
                                                    setIsStatusDropdownOpen(false);
                                                }}
                                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                            >
                                                <span className={getStatusColor(option.value)}>{option.label}</span>
                                                {formData.status === option.value && <FaCheck className="h-4 w-4 text-brand-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Material Selection (Optional) */}
                        <div>
                            <Label>{t('maintenances.fields.material')} ({t('common.optional')})</Label>
                            <SearchableDropdown
                                value={formData.material_id}
                                onChange={(value) => setFormData(prev => ({ ...prev, material_id: value }))}
                                options={availableMaterials}
                                placeholder={t('maintenances.form.selectMaterial')}
                                searchPlaceholder={t('maintenances.form.searchMaterial')}
                                noSelectionText={t('maintenances.form.noMaterial')}
                                noResultsText={t('common.noResults')}
                                loadingText={t('common.loading')}
                                nullable
                                isLoading={isLoadingOptions}
                                pinnedItem={originalMaterial ? {
                                    id: originalMaterial.id,
                                    name: originalMaterial.name,
                                    label: t('maintenances.form.currentMaterial'),
                                } as PinnedItem : undefined}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    {/* Date fields */}
                    <div className={`grid gap-4 ${showResolvedAt ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div>
                            <Label htmlFor="started_at">{t('maintenances.fields.started_at')}</Label>
                            <Input
                                type="datetime-local"
                                id="started_at"
                                name="started_at"
                                value={formData.started_at ? formData.started_at.slice(0, 16) : ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData(prev => ({
                                        ...prev,
                                        started_at: value ? `${value}:00` : null,
                                    }));
                                }}
                            />
                        </div>
                        {showResolvedAt && (
                            <div>
                                <Label htmlFor="resolved_at">{t('maintenances.fields.resolved_at')}</Label>
                                <Input
                                    type="datetime-local"
                                    id="resolved_at"
                                    name="resolved_at"
                                    value={formData.resolved_at ? formData.resolved_at.slice(0, 16) : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            resolved_at: value ? `${value}:00` : null,
                                        }));
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Operators (conditional) */}
                    {showOperators && (
                        <div>
                            <Label>{t('maintenances.fields.operators')} *</Label>
                            <div className="relative mt-1.5" ref={operatorsDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsOperatorsDropdownOpen(!isOperatorsDropdownOpen)}
                                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:focus:border-brand-800 ${errors.operator_ids ? 'border-error-500 dark:border-error-500' : 'border-gray-300 dark:border-white/5'} bg-white dark:bg-white/3 text-gray-800 dark:text-white/90`}
                                >
                                    <span>
                                        {formData.operator_ids && formData.operator_ids.length > 0
                                            ? `${formData.operator_ids.length} ${t('maintenances.form.selected')}`
                                            : t('maintenances.form.selectOperators')}
                                    </span>
                                    <FaChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOperatorsDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOperatorsDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-neutral-900 dark:border-white/5">
                                        <div className="p-2 border-b border-gray-200 dark:border-white/5">
                                            <input
                                                type="text"
                                                placeholder={t('maintenances.form.searchOperators')}
                                                value={operatorSearch}
                                                onChange={(e) => setOperatorSearch(e.target.value)}
                                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-white/5 dark:bg-white/3 dark:text-white"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {availableOperators.map(operator => (
                                                <button
                                                    key={operator.id}
                                                    type="button"
                                                    onClick={() => toggleOperator(operator.id)}
                                                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                                >
                                                    <div>
                                                        <span className="text-gray-800 dark:text-white">{operator.full_name}</span>
                                                        {operator.email && (
                                                            <span className="block text-xs text-gray-500 dark:text-gray-400">{operator.email}</span>
                                                        )}
                                                    </div>
                                                    {formData.operator_ids?.includes(operator.id) && <FaCheck className="h-4 w-4 text-brand-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Selected operators tags */}
                            {formData.operator_ids && formData.operator_ids.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {formData.operator_ids.map(id => {
                                        const operator = availableOperators.find(o => o.id === id) || originalOperators.find(o => o.id === id);
                                        return operator ? (
                                            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
                                                {operator.full_name}
                                                <button type="button" onClick={() => toggleOperator(id)} className="hover:text-brand-600" title={t('common.delete')}>
                                                    <FaTrash className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                            {errors.operator_ids && <p className="mt-1 text-xs text-error-500">{errors.operator_ids}</p>}
                        </div>
                    )}

                    {/* Companies (conditional) */}
                    {showCompanies && (
                        <div>
                            <Label>{t('maintenances.fields.companies')} *</Label>
                            <div className="relative mt-1.5" ref={companiesDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsCompaniesDropdownOpen(!isCompaniesDropdownOpen)}
                                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:focus:border-brand-800 ${errors.company_ids ? 'border-error-500 dark:border-error-500' : 'border-gray-300 dark:border-white/5'} bg-white dark:bg-white/3 text-gray-800 dark:text-white/90`}
                                >
                                    <span>
                                        {formData.company_ids && formData.company_ids.length > 0
                                            ? `${formData.company_ids.length} ${t('maintenances.form.selected')}`
                                            : t('maintenances.form.selectCompanies')}
                                    </span>
                                    <FaChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCompaniesDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isCompaniesDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                        <div className="p-2 border-b border-gray-200 dark:border-white/5">
                                            <input
                                                type="text"
                                                placeholder={t('maintenances.form.searchCompanies')}
                                                value={companySearch}
                                                onChange={(e) => setCompanySearch(e.target.value)}
                                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-white/5 dark:bg-white/3 dark:text-white"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {availableCompanies.map(company => (
                                                <button
                                                    key={company.id}
                                                    type="button"
                                                    onClick={() => toggleCompany(company.id)}
                                                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                                >
                                                    <span className="text-gray-800 dark:text-white">{company.name}</span>
                                                    {formData.company_ids?.includes(company.id) && <FaCheck className="h-4 w-4 text-brand-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Selected companies tags */}
                            {formData.company_ids && formData.company_ids.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {formData.company_ids.map(id => {
                                        const company = availableCompanies.find(c => c.id === id) || originalCompanies.find(c => c.id === id);
                                        return company ? (
                                            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-3 py-1 text-xs font-medium text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
                                                {company.name}
                                                <button type="button" onClick={() => toggleCompany(id)} className="hover:text-warning-600" title={t('common.delete')}>
                                                    <FaTrash className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                            {errors.company_ids && <p className="mt-1 text-xs text-error-500">{errors.company_ids}</p>}
                        </div>
                    )}

                    {/* Incidents (optional multi-select) */}
                    <div>
                        <Label>{t('maintenances.fields.incidents')} ({t('common.optional')})</Label>
                        <div className="relative mt-1.5" ref={incidentsDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsIncidentsDropdownOpen(!isIncidentsDropdownOpen)}
                                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:bg-white/3 dark:border-white/5 dark:text-white/90 dark:focus:border-brand-800"
                            >
                                <span>
                                    {formData.incident_ids && formData.incident_ids.length > 0
                                        ? `${formData.incident_ids.length} ${t('maintenances.form.incidentsSelected')}`
                                        : t('maintenances.form.selectIncidents')}
                                </span>
                                <FaChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isIncidentsDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isIncidentsDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                    <div className="p-2 border-b border-gray-200 dark:border-white/5">
                                        <input
                                            type="text"
                                            placeholder={t('maintenances.form.searchIncidents')}
                                            value={incidentSearch}
                                            onChange={(e) => setIncidentSearch(e.target.value)}
                                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-white/5 dark:bg-white/3 dark:text-white"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {availableIncidents.map(incident => (
                                            <button
                                                key={incident.id}
                                                type="button"
                                                onClick={() => toggleIncident(incident.id)}
                                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-gray-800 dark:text-white line-clamp-1">
                                                        #{incident.id} - {incident.description}
                                                    </span>
                                                    {incident.material_name && (
                                                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                            {incident.material_name}
                                                        </span>
                                                    )}
                                                </div>
                                                {formData.incident_ids?.includes(incident.id) && <FaCheck className="h-4 w-4 text-brand-500 ml-2" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Selected incidents tags */}
                        {formData.incident_ids && formData.incident_ids.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {formData.incident_ids.map(id => {
                                    const incident = availableIncidents.find(i => i.id === id) || originalIncidents.find(i => i.id === id);
                                    return (
                                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-error-100 px-3 py-1 text-xs font-medium text-error-800 dark:bg-error-900/30 dark:text-error-300">
                                            #{id}{incident ? ` - ${incident.description.slice(0, 20)}...` : ''}
                                            <button type="button" onClick={() => toggleIncident(id)} className="hover:text-error-600" title={t('common.delete')}>
                                                <FaTrash className="h-3 w-3" />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Spare Parts (only for creation) */}
                    {!isEditing && (
                        <div>
                            <Label>{t('maintenances.fields.spareParts')} ({t('common.optional')})</Label>
                            <div className="relative mt-1.5" ref={itemsDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsItemsDropdownOpen(!isItemsDropdownOpen)}
                                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-white/5 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800"
                                >
                                    <span className="flex items-center gap-2">
                                        <FaPlus className="h-3 w-3" />
                                        {t('maintenances.form.addSparePart')}
                                    </span>
                                    <FaChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isItemsDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isItemsDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                        <div className="p-2 border-b border-gray-200 dark:border-white/5">
                                            <input
                                                type="text"
                                                placeholder={t('maintenances.form.searchItems')}
                                                value={itemSearch}
                                                onChange={(e) => setItemSearch(e.target.value)}
                                                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-white/5 dark:bg-white/3 dark:text-white"
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {availableItems.filter(item => !formData.item_movements?.some(im => im.item_id === item.id)).map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => addSparePart(item)}
                                                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-gray-800 dark:text-white">{item.name}</span>
                                                        {item.reference && (
                                                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({item.reference})</span>
                                                        )}
                                                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                            {t('maintenances.form.stockAvailable')}: {item.current_stock} - {item.current_price} {getCurrencySymbol()}
                                                        </span>
                                                    </div>
                                                    <FaPlus className="h-3 w-3 text-brand-500 ml-2" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Selected spare parts with quantity controls */}
                            {formData.item_movements && formData.item_movements.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {formData.item_movements.map(im => {
                                        const item = availableItems.find(i => i.id === im.item_id);
                                        return item ? (
                                            <div key={im.item_id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-white/5 dark:bg-white/3">
                                                <div className="flex-1">
                                                    <span className="text-sm font-medium text-gray-800 dark:text-white">{item.name}</span>
                                                    <span className="ml-2 text-xs text-gray-500">({item.current_price} {getCurrencySymbol()}/u)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSparePartQuantity(im.item_id, im.quantity - 1)}
                                                        className="rounded bg-gray-200 p-1 hover:bg-gray-300 dark:bg-white/3 dark:hover:bg-neutral-700 dark:text-gray-400"
                                                        disabled={im.quantity <= 1}
                                                        title={t('common.decrease')}
                                                    >
                                                        <FaMinus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-medium dark:text-gray-400">
                                                        {im.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSparePartQuantity(im.item_id, im.quantity + 1)}
                                                        className="rounded bg-gray-200 p-1 hover:bg-gray-300 dark:bg-white/3 dark:hover:bg-neutral-700 dark:text-gray-400"
                                                        disabled={im.quantity >= item.current_stock}
                                                        title={t('common.increase')}
                                                    >
                                                        <FaPlus className="h-3 w-3" />
                                                    </button>
                                                    <span className="text-xs text-gray-500">/ {item.current_stock}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSparePart(im.item_id)}
                                                        className="ml-2 rounded bg-error-100 p-1 text-error-600 hover:bg-error-200 dark:bg-error-900/30 dark:text-error-400"
                                                        title={t('common.delete')}
                                                    >
                                                        <FaTrash className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">{t('common.description')} *</Label>
                        <TextArea
                            id="description"
                            name="description"
                            rows={3}
                            placeholder={t('maintenances.form.descriptionPlaceholder')}
                            value={formData.description}
                            onChange={(value) => {
                                setFormData(prev => ({ ...prev, description: value }));
                                if (errors.description) {
                                    setErrors(prev => ({ ...prev, description: '' }));
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

export default MaintenanceModal;
