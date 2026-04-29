import { useState, useEffect, useCallback, type FC, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, SearchableDropdown } from '@/shared/components/ui';
import { Label, Input, Checkbox, TextArea } from '@/shared/components/form';
import { showSuccess, showError } from '@/shared/utils';
import { MaterialManager } from '../services';
import type { Material, MaterialFormData, AvailableZone, AvailableRecipient, CleaningFrequency } from '../types';

interface MaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    material: Material | null;
    onSuccess: () => void;
}

const initialFormData: MaterialFormData = {
    zone_id: 0,
    name: '',
    description: '',
    cleaning_alert: false,
    cleaning_alert_email: false,
    cleaning_alert_frequency_repeatedly: 1,
    cleaning_alert_frequency_type: 'daily',
    recipients: [],
};

const frequencyOptions: { value: CleaningFrequency; labelKey: string }[] = [
    { value: 'daily', labelKey: 'materials.frequencyDaily' },
    { value: 'weekly', labelKey: 'materials.frequencyWeekly' },
    { value: 'monthly', labelKey: 'materials.frequencyMonthly' },
];

export const MaterialModal: FC<MaterialModalProps> = ({ isOpen, onClose, material, onSuccess }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<MaterialFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Available zones and recipients
    const [availableZones, setAvailableZones] = useState<AvailableZone[]>([]);
    const [availableRecipients, setAvailableRecipients] = useState<AvailableRecipient[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    const isEditing = material !== null;

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setFormData(initialFormData);
            setErrors({});
        }
    }, [isOpen]);

    const loadOptionsAndMaterial = useCallback(async () => {
        setIsLoadingOptions(true);

        // Load zones, recipients, and material details in parallel
        const promises: Promise<unknown>[] = [
            MaterialManager.getAvailableZones(),
            MaterialManager.getAvailableRecipients(),
        ];

        // If editing, also fetch material details to get recipients
        if (material) {
            promises.push(MaterialManager.getById(material.id));
        }

        const results = await Promise.all(promises);

        const zonesResult = results[0] as Awaited<ReturnType<typeof MaterialManager.getAvailableZones>>;
        const recipientsResult = results[1] as Awaited<ReturnType<typeof MaterialManager.getAvailableRecipients>>;

        if (zonesResult.success && zonesResult.data) {
            setAvailableZones(zonesResult.data);
        }

        if (recipientsResult.success && recipientsResult.data) {
            setAvailableRecipients(recipientsResult.data);
        }

        // Initialize form data
        if (material) {
            const materialDetailResult = results[2] as Awaited<ReturnType<typeof MaterialManager.getById>>;
            const recipientIds = materialDetailResult.success && materialDetailResult.data?.data.recipients
                ? materialDetailResult.data.data.recipients.map((r) => r.id)
                : [];

            setFormData({
                zone_id: material.zone_id,
                name: material.name,
                description: material.description || '',
                cleaning_alert: material.cleaning_alert,
                cleaning_alert_email: material.cleaning_alert_email,
                cleaning_alert_frequency_repeatedly: material.cleaning_alert_frequency_repeatedly || 1,
                cleaning_alert_frequency_type: material.cleaning_alert_frequency_type || 'daily',
                recipients: recipientIds,
            });
        } else {
            // Set default zone if creating and zones available
            if (zonesResult.success && zonesResult.data && zonesResult.data.length > 0) {
                setFormData((prev) => ({ ...prev, zone_id: zonesResult.data![0].id }));
            }
        }

        setIsLoadingOptions(false);
    }, [material]);

    // Load options and material details when modal opens
    useEffect(() => {
        if (isOpen) {
            loadOptionsAndMaterial();
        }
    }, [isOpen, loadOptionsAndMaterial]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else if (name === 'zone_id' || name === 'cleaning_alert_frequency_repeatedly') {
            setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
        } else if (name === 'cleaning_alert_frequency_type') {
            setFormData((prev) => ({ ...prev, [name]: value as CleaningFrequency }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleCheckboxChange = (name: keyof MaterialFormData) => (checked: boolean) => {
        setFormData((prev) => ({ ...prev, [name]: checked }));

        // If disabling cleaning alert, reset related fields
        if (name === 'cleaning_alert' && !checked) {
            setFormData((prev) => ({
                ...prev,
                cleaning_alert_email: false,
                recipients: [],
            }));
        }
    };

    const handleRecipientToggle = (recipientId: number) => {
        setFormData((prev) => {
            const currentRecipients = prev.recipients || [];
            const isSelected = currentRecipients.includes(recipientId);
            return {
                ...prev,
                recipients: isSelected
                    ? currentRecipients.filter((id) => id !== recipientId)
                    : [...currentRecipients, recipientId],
            };
        });
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = t('validation.nameRequired');
        } else if (formData.name.length > 255) {
            newErrors.name = t('validation.nameMaxLength');
        }

        if (!formData.zone_id) {
            newErrors.zone_id = t('validation.zoneRequired');
        }

        if (formData.description && formData.description.length > 1000) {
            newErrors.description = t('validation.descriptionMaxLength');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsLoading(true);

        const submitData: MaterialFormData = {
            ...formData,
            description: formData.description || null,
        };

        let result;
        if (isEditing) {
            result = await MaterialManager.update(material.id, submitData);
        } else {
            result = await MaterialManager.create(submitData);
        }

        if (result.success) {
            const successMessage = isEditing
                ? t('materials.messages.updated', { name: formData.name })
                : t('materials.messages.created', { name: formData.name });
            showSuccess(successMessage);
            onSuccess();
            onClose();
        } else {
            showError(result.error || t('errors.generic'));
            setErrors({ general: result.error || t('errors.generic') });
        }
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6 lg:p-8">
            <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? t('materials.edit') : t('materials.create')}
            </h2>

            {errors.general && (
                <div className="mb-4 rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {errors.general}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    {/* Zone Selection */}
                    <div>
                        <Label>{t('materials.zone')} *</Label>
                        <SearchableDropdown
                            value={formData.zone_id || null}
                            onChange={(value) => {
                                setFormData((prev) => ({ ...prev, zone_id: value || 0 }));
                                if (errors.zone_id) {
                                    setErrors((prev) => ({ ...prev, zone_id: '' }));
                                }
                            }}
                            options={availableZones}
                            placeholder={t('materials.form.selectZone')}
                            searchPlaceholder={t('materials.form.searchZone')}
                            noResultsText={t('common.noResults')}
                            loadingText={t('common.loading')}
                            isLoading={isLoadingOptions}
                            className="mt-1.5"
                        />
                        {errors.zone_id && <p className="mt-1 text-xs text-error-500">{errors.zone_id}</p>}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('materials.form.zoneHint')}
                        </p>
                    </div>

                    {/* Name */}
                    <div>
                        <Label htmlFor="name">{t('common.name')} *</Label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder={t('materials.form.namePlaceholder')}
                            value={formData.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            hint={errors.name}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">{t('common.description')}</Label>
                        <TextArea
                            id="description"
                            name="description"
                            rows={3}
                            placeholder={t('materials.form.descriptionPlaceholder')}
                            value={formData.description || ''}
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

                    {/* Cleaning Alert Section */}
                    <div className="border-t border-gray-200 pt-4 dark:border-white/5">
                        <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                            {t('materials.cleaningAlertSettings')}
                        </h3>

                        {/* Enable Cleaning Alert */}
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="cleaning_alert"
                                checked={formData.cleaning_alert || false}
                                onChange={handleCheckboxChange('cleaning_alert')}
                            />
                            <div>
                                <Label htmlFor="cleaning_alert" className="cursor-pointer">
                                    {t('materials.form.enableCleaningAlert')}
                                </Label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('materials.form.enableCleaningAlertHint')}
                                </p>
                            </div>
                        </div>

                        {/* Cleaning Alert Options (only visible when enabled) */}
                        {formData.cleaning_alert && (
                            <div className="mt-4 space-y-4 rounded-lg bg-gray-50 p-4 dark:bg-neutral-800/50">
                                {/* Email Notification */}
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="cleaning_alert_email"
                                        checked={formData.cleaning_alert_email || false}
                                        onChange={handleCheckboxChange('cleaning_alert_email')}
                                    />
                                    <div>
                                        <Label htmlFor="cleaning_alert_email" className="cursor-pointer">
                                            {t('materials.form.enableEmailNotification')}
                                        </Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('materials.form.enableEmailNotificationHint')}
                                        </p>
                                    </div>
                                </div>

                                {/* Frequency Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="cleaning_alert_frequency_repeatedly">
                                            {t('materials.form.frequencyEvery')}
                                        </Label>
                                        <Input
                                            id="cleaning_alert_frequency_repeatedly"
                                            name="cleaning_alert_frequency_repeatedly"
                                            type="number"
                                            min="1"
                                            value={formData.cleaning_alert_frequency_repeatedly || 1}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="cleaning_alert_frequency_type">
                                            {t('materials.form.frequencyType')}
                                        </Label>
                                        <select
                                            id="cleaning_alert_frequency_type"
                                            name="cleaning_alert_frequency_type"
                                            title={t('materials.form.frequencyType')}
                                            value={formData.cleaning_alert_frequency_type}
                                            onChange={handleChange}
                                            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-white/5 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800"
                                        >
                                            {frequencyOptions.map((option) => (
                                                <option key={option.value} value={option.value} className="bg-white dark:bg-neutral-900">
                                                    {t(option.labelKey)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Recipients Selection */}
                                <div>
                                    <Label>{t('materials.form.recipients')}</Label>
                                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                        {t('materials.form.recipientsHint')}
                                    </p>
                                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/5">
                                        {isLoadingOptions ? (
                                            <div className="p-3 text-center text-sm text-gray-500">
                                                {t('common.loading')}
                                            </div>
                                        ) : availableRecipients.length === 0 ? (
                                            <div className="p-3 text-center text-sm text-gray-500">
                                                {t('materials.form.noRecipientsAvailable')}
                                            </div>
                                        ) : (
                                            availableRecipients.map((recipient) => (
                                                <div
                                                    key={recipient.id}
                                                    className="flex items-center gap-3 border-b border-gray-100 p-3 last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800"
                                                >
                                                    <Checkbox
                                                        id={`recipient-${recipient.id}`}
                                                        checked={formData.recipients?.includes(recipient.id) || false}
                                                        onChange={() => handleRecipientToggle(recipient.id)}
                                                    />
                                                    <label
                                                        htmlFor={`recipient-${recipient.id}`}
                                                        className="flex-1 cursor-pointer"
                                                    >
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {recipient.full_name}
                                                        </span>
                                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                                            {recipient.email}
                                                        </span>
                                                    </label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
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

export default MaterialModal;
