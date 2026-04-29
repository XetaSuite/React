import {
    FaEye,
    FaPenToSquare,
    FaTrash,
    FaQrcode,
    FaArrowRightToBracket,
    FaArrowRightFromBracket,
    FaRotateLeft,
} from "react-icons/fa6";
import type { ActionItem } from "./ActionsDropdown";

/**
 * Helper factories to build common action items used by <ActionsDropdown />.
 * Living in their own file keeps Fast Refresh (HMR) happy by ensuring the
 * neighbouring `ActionsDropdown.tsx` file only exports a React component.
 */
export const createActions = {
    view: (onClick: () => void, t: (key: string) => string): ActionItem => ({
        key: "view",
        label: t("common.view"),
        icon: <FaEye className="h-4 w-4" />,
        onClick,
    }),
    edit: (onClick: () => void, t: (key: string) => string): ActionItem => ({
        key: "edit",
        label: t("common.edit"),
        icon: <FaPenToSquare className="h-4 w-4" />,
        onClick,
    }),
    delete: (onClick: () => void, t: (key: string) => string): ActionItem => ({
        key: "delete",
        label: t("common.delete"),
        icon: <FaTrash className="h-4 w-4" />,
        onClick,
        variant: "danger",
    }),
    qrCode: (onClick: () => void, t: (key: string) => string): ActionItem => ({
        key: "qrCode",
        label: t("items.qrCode.title"),
        icon: <FaQrcode className="h-4 w-4" />,
        onClick,
    }),
    stockEntry: (onClick: () => void, t: (key: string) => string): ActionItem => ({
        key: "stockEntry",
        label: t("items.movements.addEntry"),
        icon: <FaArrowRightToBracket className="h-4 w-4" />,
        onClick,
        variant: "success",
    }),
    stockExit: (onClick: () => void, t: (key: string) => string): ActionItem => ({
        key: "stockExit",
        label: t("items.movements.addExit"),
        icon: <FaArrowRightFromBracket className="h-4 w-4" />,
        onClick,
        variant: "danger",
    }),
    restore: (onClick: () => void, t: (key: string) => string): ActionItem => ({
        key: "restore",
        label: t("common.restore"),
        icon: <FaRotateLeft className="h-4 w-4" />,
        onClick,
        variant: "success",
    }),
};
