import { useState, useEffect, useCallback, type FC } from "react";
import { useTranslation } from "react-i18next";
import { FaArrowRightToBracket, FaArrowRightFromBracket, FaPen } from "react-icons/fa6";
import { Modal, Button, SearchableDropdown, type PinnedItem } from "@/shared/components/ui";
import { Input, Label, TextArea } from "@/shared/components/form";
import { showSuccess, showError, formatCurrency } from "@/shared/utils";
import { useSettings } from "@/features/Settings";
import { ItemMovementManager } from "../services";
import type { MovementType, ItemMovementFormData, ItemMovement } from "../types";
import type { AvailableCompany } from "@/features/Items/types";

interface ItemMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    // For creation mode
    item?: {
        id: number;
        name: string;
        reference?: string | null;
        current_stock: number;
        current_price?: number | null;
        company_id?: number | null;
    } | null;
    type?: MovementType;
    // For edit mode
    movement?: ItemMovement | null;
    onSuccess: () => void;
}

export const ItemMovementModal: FC<ItemMovementModalProps> = ({
    isOpen,
    onClose,
    item,
    type,
    movement,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const { getCurrency } = useSettings();

    // Determine mode: edit if movement is provided, otherwise create
    const isEditMode = !!movement;
    const effectiveType = isEditMode ? movement.type : (type || "entry");
    const isEntry = effectiveType === "entry";

    // For edit mode, we need item info from the movement
    const effectiveItem = isEditMode && movement?.item ? {
        id: movement.item_id,
        name: movement.item.name,
        reference: movement.item.reference,
        current_stock: movement.item.current_stock ?? 0,
        current_price: movement.item.current_price ?? 0,
        company_id: movement.company_id,
    } : item;

    // Use primitive values for useEffect dependencies to avoid infinite loops
    const itemId = effectiveItem?.id;
    const itemCompanyId = effectiveItem?.company_id;
    const movementId = movement?.id;

    const [formData, setFormData] = useState<ItemMovementFormData>({
        type: effectiveType,
        quantity: 1,
        unit_price: undefined,
        company_id: undefined,
        company_invoice_number: "",
        invoice_date: "",
        notes: "",
        movement_date: new Date().toISOString().split("T")[0],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [companies, setCompanies] = useState<AvailableCompany[]>([]);
    const [itemCompany, setItemCompany] = useState<AvailableCompany | null>(null);

    // Search companies (includeId ensures current company is always included)
    const searchCompanies = useCallback(async (search: string) => {
        setIsLoadingCompanies(true);
        const result = await ItemMovementManager.getAvailableCompanies(search || undefined, formData.company_id ?? itemCompanyId ?? undefined);
        if (result.success && result.data) {
            setCompanies(result.data);
        }
        setIsLoadingCompanies(false);
    }, [formData.company_id, itemCompanyId]);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && movement) {
                // Edit mode: populate form with movement data
                setFormData({
                    type: movement.type,
                    quantity: movement.quantity,
                    unit_price: movement.unit_price || undefined,
                    company_id: movement.company_id || undefined,
                    company_invoice_number: movement.company_invoice_number || "",
                    invoice_date: movement.invoice_date?.split("T")[0] || "",
                    notes: movement.notes || "",
                    movement_date: movement.movement_date?.split("T")[0] || new Date().toISOString().split("T")[0],
                });
            } else if (itemId) {
                // Create mode: reset form
                setFormData({
                    type: effectiveType,
                    quantity: 1,
                    unit_price: undefined,
                    company_id: isEntry ? itemCompanyId || undefined : undefined,
                    company_invoice_number: "",
                    invoice_date: "",
                    notes: "",
                    movement_date: new Date().toISOString().split("T")[0],
                });
            }
            setErrors({});
            setItemCompany(null);

            // Load companies for entry (include item's company to ensure it's always in the list)
            if (isEntry) {
                setIsLoadingCompanies(true);
                ItemMovementManager.getAvailableCompanies(undefined, itemCompanyId || undefined)
                    .then((result) => {
                        if (result.success && result.data) {
                            setCompanies(result.data);
                            // The item's company is now the first in the list if includeId was provided
                            if (itemCompanyId) {
                                const found = result.data.find(s => s.id === itemCompanyId);
                                if (found) {
                                    setItemCompany(found);
                                }
                            }
                        }
                        setIsLoadingCompanies(false);
                    });
            }
        }
    }, [isOpen, isEditMode, movement, movementId, effectiveType, isEntry, itemId, itemCompanyId]);

    const handleChange = (
        field: keyof ItemMovementFormData,
        value: string | number | undefined
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.quantity || formData.quantity <= 0) {
            newErrors.quantity = t("items.movements.validation.quantityRequired");
        }

        // For exit, check we don't exceed current stock (only for creation, not edit)
        if (!isEntry && effectiveItem && !isEditMode && formData.quantity > effectiveItem.current_stock) {
            newErrors.quantity = t("items.movements.validation.insufficientStock", {
                available: effectiveItem.current_stock,
            });
        }

        if (isEntry && formData.unit_price !== undefined && formData.unit_price < 0) {
            newErrors.unit_price = t("validation.min", { min: 0 });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!effectiveItem || !validate()) return;

        setIsLoading(true);

        let result;
        if (isEditMode && movement) {
            result = await ItemMovementManager.update(movement.item_id, movement.id, formData);
        } else {
            result = await ItemMovementManager.create(effectiveItem.id, formData);
        }

        if (result.success) {
            if (isEditMode) {
                showSuccess(t("itemMovements.messages.updated"));
            } else {
                showSuccess(
                    isEntry
                        ? t("items.movements.messages.entryCreated", { quantity: formData.quantity })
                        : t("items.movements.messages.exitCreated", { quantity: formData.quantity })
                );
            }
            onSuccess();
            onClose();
        } else {
            showError(result.error || t("errors.generic"));
        }

        setIsLoading(false);
    };

    if (!effectiveItem) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6">
            {/* Title */}
            <div className="flex items-center gap-3 mb-6">
                {isEditMode ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
                        <FaPen className="h-5 w-5 text-brand-600" />
                    </div>
                ) : isEntry ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
                        <FaArrowRightToBracket className="h-5 w-5 text-success-600" />
                    </div>
                ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
                        <FaArrowRightFromBracket className="h-5 w-5 text-error-600" />
                    </div>
                )}
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {isEditMode
                        ? t("itemMovements.editTitle")
                        : isEntry
                            ? t("items.movements.addEntry")
                            : t("items.movements.addExit")}
                </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Item info */}
                <div className="rounded-lg bg-gray-50 dark:bg-neutral-800 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-800 dark:text-white">
                                {effectiveItem.name}
                            </h4>
                            {effectiveItem.reference && (
                                <p className="text-sm text-gray-500">{effectiveItem.reference}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">{t("items.fields.currentStock")}</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                {effectiveItem.current_stock}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quantity */}
                <div>
                    <Label htmlFor="quantity">
                        {t("items.movements.fields.quantity")} *
                    </Label>
                    <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={isEntry || isEditMode ? undefined : String(effectiveItem.current_stock)}
                        value={formData.quantity}
                        onChange={(e) => handleChange("quantity", parseInt(e.target.value) || 0)}
                        error={!!errors.quantity}
                        hint={errors.quantity}
                        disabled={isLoading}
                    />
                    {!isEntry && !isEditMode && (
                        <p className="mt-1 text-xs text-gray-500">
                            {t("items.movements.availableStock", { count: effectiveItem.current_stock })}
                        </p>
                    )}
                </div>

                {/* Entry-specific fields */}
                {isEntry && (
                    <>
                        {/* Unit price */}
                        <div>
                            <Label htmlFor="unit_price">{t("items.movements.fields.unitPrice")}</Label>
                            <Input
                                id="unit_price"
                                type="number"
                                step={0.01}
                                min="0"
                                value={formData.unit_price ?? effectiveItem.current_price ?? ""}
                                onChange={(e) =>
                                    handleChange(
                                        "unit_price",
                                        e.target.value ? parseFloat(e.target.value) : undefined
                                    )
                                }
                                error={!!errors.unit_price}
                                hint={errors.unit_price}
                                disabled={isLoading}
                            />
                            {(formData.unit_price || effectiveItem.current_price) && formData.quantity > 0 && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {t("items.movements.totalPrice")}:{" "}
                                    <span className="font-semibold">
                                        {formatCurrency(
                                            (formData.unit_price ?? effectiveItem.current_price ?? 0) * formData.quantity,
                                            getCurrency()
                                        )}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Company */}
                        <div>
                            <Label>{t("items.movements.fields.company")}</Label>
                            <SearchableDropdown
                                value={formData.company_id ?? null}
                                onChange={(value) => handleChange("company_id", value ?? undefined)}
                                options={companies}
                                placeholder={t("items.form.selectCompany")}
                                searchPlaceholder={t("items.form.searchCompany")}
                                noSelectionText={t("items.noCompany")}
                                noResultsText={t("common.noResults")}
                                loadingText={t("common.loading")}
                                nullable
                                disabled={isLoading}
                                isLoading={isLoadingCompanies}
                                onSearch={searchCompanies}
                                pinnedItem={itemCompany ? {
                                    id: itemCompany.id,
                                    name: itemCompany.name,
                                    label: t("items.movements.itemCompany"),
                                } as PinnedItem : undefined}
                                className="mt-1.5"
                            />
                        </div>

                        {/* Invoice fields */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="company_invoice_number">
                                    {t("items.movements.fields.invoiceNumber")}
                                </Label>
                                <Input
                                    id="company_invoice_number"
                                    value={formData.company_invoice_number || ""}
                                    onChange={(e) =>
                                        handleChange("company_invoice_number", e.target.value)
                                    }
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="invoice_date">
                                    {t("items.movements.fields.invoiceDate")}
                                </Label>
                                <Input
                                    id="invoice_date"
                                    type="date"
                                    value={formData.invoice_date || ""}
                                    onChange={(e) => handleChange("invoice_date", e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Movement date */}
                <div>
                    <Label htmlFor="movement_date">{t("items.movements.fields.date")}</Label>
                    <Input
                        id="movement_date"
                        type="date"
                        value={formData.movement_date || ""}
                        onChange={(e) => handleChange("movement_date", e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                {/* Notes */}
                <div>
                    <Label htmlFor="notes">{t("items.movements.fields.notes")}</Label>
                    <TextArea
                        id="notes"
                        name="notes"
                        rows={3}
                        placeholder={t('items.movements.fields.notes')}
                        value={formData.notes}
                        onChange={(value) => {
                            setFormData(prev => ({ ...prev, notes: value }));
                            if (errors.notes) {
                                setErrors(prev => ({ ...prev, notes: '' }));
                            }
                        }}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/5">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading}
                        className={!isEditMode && !isEntry ? "bg-error-500 hover:bg-error-600" : ""}
                    >
                        {isLoading
                            ? t("common.saving")
                            : isEditMode
                                ? t("common.save")
                                : isEntry
                                    ? t("items.movements.confirmEntry")
                                    : t("items.movements.confirmExit")}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
