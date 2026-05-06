import { useState, useEffect, useCallback, useRef, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { showSuccess, showError } from "@/shared/utils";
import type { ManagerResult, SingleResponse } from "@/shared/types";

/**
 * Validation function type
 * Returns an object with field names as keys and error messages as values
 */
export type ValidateFn<TFormData> = (formData: TFormData, t: (key: string) => string) => Record<string, string>;

/**
 * Configuration options for useFormModal hook
 */
export interface UseFormModalOptions<TEntity, TFormData> {
    /** Initial form data for create mode */
    initialFormData: TFormData;
    /** Entity being edited (null for create mode) */
    entity: TEntity | null;
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when modal closes */
    onClose: () => void;
    /** Callback on successful create/update */
    onSuccess: () => void;
    /** Translation key prefix for success messages (e.g., "companies" for "companies.messages.created") */
    translationPrefix: string;
    /** Function to create entity */
    createFn: (data: TFormData) => Promise<ManagerResult<SingleResponse<TEntity>>>;
    /** Function to update entity */
    updateFn: (id: number, data: TFormData) => Promise<ManagerResult<SingleResponse<TEntity>>>;
    /** Function to get entity ID (default: entity.id) */
    getEntityId?: (entity: TEntity) => number;
    /** Function to get entity name for success messages (default: formData.name) */
    getEntityName?: (formData: TFormData) => string;
    /** Function to transform entity to form data when editing */
    entityToFormData?: (entity: TEntity) => TFormData;
    /** Validation function (return empty object if valid) */
    validate?: ValidateFn<TFormData>;
    /** Callback after form data is initialized (useful for loading dropdowns) */
    onFormInit?: () => void | Promise<void>;
}

/**
 * Return type for useFormModal hook
 */
export interface UseFormModalReturn<TFormData> {
    // State
    formData: TFormData;
    setFormData: React.Dispatch<React.SetStateAction<TFormData>>;
    errors: Record<string, string>;
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    isEditing: boolean;

    // Handlers
    handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleCheckboxChange: (name: keyof TFormData) => (checked: boolean) => void;
    handleSubmit: (e: FormEvent) => Promise<void>;
    clearFieldError: (field: string) => void;
    setFieldValue: <K extends keyof TFormData>(field: K, value: TFormData[K]) => void;
    resetForm: () => void;
}

/**
 * Generic hook for modal forms with create/update functionality
 *
 * @example
 * ```tsx
 * const {
 *   formData,
 *   errors,
 *   isLoading,
 *   isEditing,
 *   handleChange,
 *   handleSubmit,
 * } = useFormModal({
 *   initialFormData: { name: "", description: "" },
 *   entity: company,
 *   isOpen,
 *   onClose,
 *   onSuccess,
 *   translationPrefix: "companies",
 *   createFn: CompanyManager.create,
 *   updateFn: CompanyManager.update,
 *   validate: (data, t) => {
 *     const errors: Record<string, string> = {};
 *     if (!data.name.trim()) errors.name = t("validation.nameRequired");
 *     return errors;
 *   },
 * });
 * ```
 */
export function useFormModal<TEntity extends { id?: number; name?: string }, TFormData extends object>({
    initialFormData,
    entity,
    isOpen,
    onClose,
    onSuccess,
    translationPrefix,
    createFn,
    updateFn,
    getEntityId = (e) => e.id ?? 0,
    getEntityName = (data) => ((data as Record<string, unknown>).name as string) || "",
    entityToFormData,
    validate,
    onFormInit,
}: UseFormModalOptions<TEntity, TFormData>): UseFormModalReturn<TFormData> {
    const { t } = useTranslation();

    const [formData, setFormData] = useState<TFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const isEditing = entity !== null;

    // Keep latest references in refs so the init effect can read them
    // without re-running every time the parent passes new function/object identities.
    const initialFormDataRef = useRef(initialFormData);
    const entityToFormDataRef = useRef(entityToFormData);
    const onFormInitRef = useRef(onFormInit);

    useEffect(() => {
        initialFormDataRef.current = initialFormData;
        entityToFormDataRef.current = entityToFormData;
        onFormInitRef.current = onFormInit;
    });

    // Initialize form when modal opens or entity changes
    useEffect(() => {
        if (isOpen) {
            const baseInitial = initialFormDataRef.current;
            const toFormData = entityToFormDataRef.current;

            if (entity && toFormData) {
                setFormData(toFormData(entity));
            } else if (entity) {
                // Default: copy matching properties from entity
                const newFormData = { ...baseInitial };
                for (const key of Object.keys(baseInitial as object)) {
                    if (key in entity) {
                        (newFormData as Record<string, unknown>)[key] = (entity as Record<string, unknown>)[key] ?? baseInitial[key as keyof TFormData];
                    }
                }
                setFormData(newFormData);
            } else {
                setFormData(baseInitial);
            }
            setErrors({});

            // Trigger form initialization callback
            const initCallback = onFormInitRef.current;
            if (initCallback) {
                initCallback();
            }
        }
    }, [isOpen, entity]);

    // Handle input change
    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        setFormData((prev) => {
            const newValue = type === "number" ? (value === "" ? "" : Number(value)) : value;
            return { ...prev, [name]: newValue };
        });

        // Clear field error when user types
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    }, [errors]);

    // Handle checkbox change
    const handleCheckboxChange = useCallback((name: keyof TFormData) => (checked: boolean) => {
        setFormData((prev) => ({ ...prev, [name]: checked as TFormData[keyof TFormData] }));
    }, []);

    // Set a single field value
    const setFieldValue = useCallback(<K extends keyof TFormData>(field: K, value: TFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    // Clear a field error
    const clearFieldError = useCallback((field: string) => {
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    }, []);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setFormData(initialFormData);
        setErrors({});
    }, [initialFormData]);

    // Handle form submission
    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();

        // Run validation if provided
        if (validate) {
            const validationErrors = validate(formData, t);
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                return;
            }
        }

        setIsLoading(true);

        let result;
        if (isEditing && entity) {
            result = await updateFn(getEntityId(entity), formData);
        } else {
            result = await createFn(formData);
        }

        if (result.success) {
            const entityName = getEntityName(formData);
            const successMessage = isEditing
                ? t(`${translationPrefix}.messages.updated`, { name: entityName })
                : t(`${translationPrefix}.messages.created`, { name: entityName });
            showSuccess(successMessage);
            onSuccess();
            onClose();
        } else {
            showError(result.error || t("errors.generic"));
            setErrors({ general: result.error || t("errors.generic") });
        }

        setIsLoading(false);
    }, [formData, isEditing, entity, validate, createFn, updateFn, getEntityId, getEntityName, translationPrefix, onSuccess, onClose, t]);

    return {
        formData,
        setFormData,
        errors,
        setErrors,
        isLoading,
        setIsLoading,
        isEditing,
        handleChange,
        handleCheckboxChange,
        handleSubmit,
        clearFieldError,
        setFieldValue,
        resetForm,
    };
}
