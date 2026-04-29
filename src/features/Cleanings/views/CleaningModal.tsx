import { useState, useEffect, useRef, useCallback, type FC, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaCheck } from 'react-icons/fa6';
import { Modal, Button, SearchableDropdown, type PinnedItem } from '@/shared/components/ui';
import { Label, TextArea } from '@/shared/components/form';
import { showSuccess, showError } from '@/shared/utils';
import { CleaningManager } from '../services';
import type {
    Cleaning,
    CleaningFormData,
    AvailableMaterial,
    TypeOption,
    CleaningType,
} from '../types';

interface CleaningModalProps {
    isOpen: boolean;
    onClose: () => void;
    cleaning: Cleaning | null;
    onSuccess: () => void;
    preselectedMaterialId?: number | null;
}

const initialFormData: CleaningFormData = {
    material_id: 0,
    description: '',
    type: 'casual',
};

export const CleaningModal: FC<CleaningModalProps> = ({
    isOpen,
    onClose,
    cleaning,
    onSuccess,
    preselectedMaterialId
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<CleaningFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Available options
    const [availableMaterials, setAvailableMaterials] = useState<AvailableMaterial[]>([]);
    const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    // Dropdown states for type
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

    // Original material for pinned items
    const [originalMaterial, setOriginalMaterial] = useState<AvailableMaterial | null>(null);

    // Refs for type dropdown
    const typeDropdownRef = useRef<HTMLDivElement>(null);

    const isEditing = cleaning !== null;

    const loadOptions = useCallback(async () => {
        setIsLoadingOptions(true);

        const [materialsResult, typeResult] = await Promise.all([
            CleaningManager.getAvailableMaterials(),
            CleaningManager.getTypeOptions(),
        ]);

        if (materialsResult.success && materialsResult.data) {
            setAvailableMaterials(materialsResult.data);
        }

        if (typeResult.success && typeResult.data) {
            setTypeOptions(typeResult.data);
        }

        // Initialize form data for editing
        if (cleaning) {
            const cleaningDetailResult = await CleaningManager.getById(cleaning.id);
            if (cleaningDetailResult.success && cleaningDetailResult.data) {
                const detail = cleaningDetailResult.data.data;
                setFormData({
                    material_id: detail.material_id,
                    description: detail.description,
                    type: detail.type,
                });

                // Save original material for pinned item
                if (detail.material_id && detail.material_name) {
                    setOriginalMaterial({
                        id: detail.material_id,
                        name: detail.material_name,
                    });
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
    }, [cleaning, preselectedMaterialId]);

    // Load options when modal opens
    useEffect(() => {
        if (isOpen) {
            loadOptions();
        }
    }, [isOpen, loadOptions]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setFormData(initialFormData);
            setErrors({});
            setIsTypeDropdownOpen(false);
            setOriginalMaterial(null);
        }
    }, [isOpen]);

    // Close type dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
                setIsTypeDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.material_id) {
            newErrors.material_id = t('cleanings.validation.materialRequired');
        }

        if (!formData.description.trim()) {
            newErrors.description = t('validation.required');
        } else if (formData.description.length > 5000) {
            newErrors.description = t('validation.descriptionMaxLength');
        }

        if (!formData.type) {
            newErrors.type = t('cleanings.validation.typeRequired');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);

        let result;
        if (isEditing) {
            result = await CleaningManager.update(cleaning.id, formData);
        } else {
            result = await CleaningManager.create(formData);
        }

        if (result.success) {
            const successMessage = isEditing
                ? t('cleanings.messages.updated')
                : t('cleanings.messages.created');
            showSuccess(successMessage);
            onSuccess();
            onClose();
        } else {
            showError(result.error || t('errors.generic'));
            setErrors({ general: result.error || t('errors.generic') });
        }
        setIsLoading(false);
    };

    const getTypeColor = (type: CleaningType): string => {
        switch (type) {
            case 'daily':
                return 'text-brand-600 dark:text-brand-400';
            case 'weekly':
                return 'text-success-600 dark:text-success-400';
            case 'monthly':
                return 'text-warning-600 dark:text-warning-400';
            case 'casual':
                return 'text-gray-600 dark:text-gray-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6 lg:p-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? t('cleanings.edit') : t('cleanings.create')}
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
                        <Label>{t('cleanings.material')} *</Label>
                        <SearchableDropdown
                            value={formData.material_id || null}
                            onChange={(value) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    material_id: value || 0,
                                }));
                                if (errors.material_id) {
                                    setErrors((prev) => ({ ...prev, material_id: '' }));
                                }
                            }}
                            options={availableMaterials}
                            placeholder={t('cleanings.form.selectMaterial')}
                            searchPlaceholder={t('cleanings.form.searchMaterial')}
                            noResultsText={t('common.noResults')}
                            loadingText={t('common.loading')}
                            disabled={isEditing}
                            isLoading={isLoadingOptions}
                            pinnedItem={originalMaterial ? {
                                id: originalMaterial.id,
                                name: originalMaterial.name,
                                label: t('cleanings.form.currentMaterial'),
                            } as PinnedItem : undefined}
                            className="mt-1.5"
                        />
                        {errors.material_id && <p className="mt-1 text-xs text-error-500">{errors.material_id}</p>}
                        {isEditing && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {t('cleanings.form.materialCannotBeChanged')}
                            </p>
                        )}
                    </div>

                    {/* Type Selection */}
                    <div>
                        <Label>{t('cleanings.type')} *</Label>
                        <div className="relative mt-1.5" ref={typeDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-white/5 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800"
                            >
                                <span className={getTypeColor(formData.type)}>
                                    {typeOptions.find((s) => s.value === formData.type)?.label ||
                                        t('cleanings.form.selectType')}
                                </span>
                                <FaChevronDown
                                    className={`h-4 w-4 text-gray-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            {isTypeDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/5 dark:bg-neutral-900">
                                    {typeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                setFormData((prev) => ({ ...prev, type: option.value }));
                                                setIsTypeDropdownOpen(false);
                                                if (errors.type) {
                                                    setErrors((prev) => ({ ...prev, type: '' }));
                                                }
                                            }}
                                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                                        >
                                            <span className={getTypeColor(option.value)}>{option.label}</span>
                                            {formData.type === option.value && (
                                                <FaCheck className="h-4 w-4 text-brand-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {errors.type && <p className="mt-1 text-xs text-error-500">{errors.type}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <Label>{t('cleanings.description')} *</Label>
                        <TextArea
                            value={formData.description}
                            onChange={(value) => {
                                setFormData((prev) => ({ ...prev, description: value }));
                                if (errors.description) {
                                    setErrors((prev) => ({ ...prev, description: '' }));
                                }
                            }}
                            placeholder={t('cleanings.form.descriptionPlaceholder')}
                            rows={4}
                            error={!!errors.description}
                            hint={errors.description}
                            className="mt-1.5"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading || isLoadingOptions}
                    >
                        {isLoading ? t('common.saving') : isEditing ? t('common.save') : t('common.create')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
