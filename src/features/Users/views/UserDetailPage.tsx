import { useState, useEffect, useCallback, type FC } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
    FaArrowLeft,
    FaCalendar,
    FaEnvelope,
    FaPhone,
    FaMobile,
    FaPenToSquare,
    FaTriangleExclamation,
    FaBroom,
    FaShield,
    FaScrewdriverWrench,
    FaBuildingFlag,
} from "react-icons/fa6";
import { PageMeta, PageBreadcrumb, Pagination } from "@/shared/components/common";
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, Badge, LinkedName } from "@/shared/components/ui";
import { NotFoundContent } from "@/shared/components/errors";
import { useModal } from "@/shared/hooks";
import type { PaginationMeta } from "@/shared/types";
import { formatDate, formatDateTime } from "@/shared/utils";
import { useAuth } from "@/features/Auth";
import { UserManager } from "../services";
import { UserModal } from "./UserModal";
import type { User, SiteWithRoles, UserCleaning, UserMaintenance, UserIncident } from "../types";

type TabType = "sites" | "cleanings" | "maintenances" | "incidents";

const UserDetailPage: FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const { hasPermission } = useAuth();
    const userId = Number(id);

    // User state
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Active tab
    const [activeTab, setActiveTab] = useState<TabType>("sites");

    // Roles per site state
    const [rolesPerSite, setRolesPerSite] = useState<SiteWithRoles[]>([]);
    const [isRolesLoading, setIsRolesLoading] = useState(false);

    // Cleanings state
    const [cleanings, setCleanings] = useState<UserCleaning[]>([]);
    const [cleaningsMeta, setCleaningsMeta] = useState<PaginationMeta | null>(null);
    const [cleaningsPage, setCleaningsPage] = useState(1);
    const [isCleaningsLoading, setIsCleaningsLoading] = useState(false);

    // Maintenances state
    const [maintenances, setMaintenances] = useState<UserMaintenance[]>([]);
    const [maintenancesMeta, setMaintenancesMeta] = useState<PaginationMeta | null>(null);
    const [maintenancesPage, setMaintenancesPage] = useState(1);
    const [isMaintenancesLoading, setIsMaintenancesLoading] = useState(false);

    // Incidents state
    const [incidents, setIncidents] = useState<UserIncident[]>([]);
    const [incidentsMeta, setIncidentsMeta] = useState<PaginationMeta | null>(null);
    const [incidentsPage, setIncidentsPage] = useState(1);
    const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);

    // Permissions
    const canUpdate = hasPermission("user.update");
    const canViewMaintenance = hasPermission("maintenance.view");
    const canViewIncident = hasPermission("incident.view");
    const canViewCleaning = hasPermission("cleaning.view");
    const canViewMaterial = hasPermission("material.view");
    const canViewSite = hasPermission("site.view");

    // Modal
    const editModal = useModal();

    // Fetch user details
    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) return;

            setIsLoading(true);
            setError(null);
            const result = await UserManager.getById(userId);
            if (result.success && result.data) {
                setUser(result.data.data);
            } else {
                setError(result.error || t("errors.generic"));
            }
            setIsLoading(false);
        };

        fetchUser();
    }, [userId, t]);

    // Fetch roles per site
    const fetchRolesPerSite = useCallback(async () => {
        if (!userId) return;

        setIsRolesLoading(true);
        const result = await UserManager.getRolesPerSite(userId);
        if (result.success && result.data) {
            setRolesPerSite(result.data.roles_per_site);
        }
        setIsRolesLoading(false);
    }, [userId]);

    // Fetch cleanings
    const fetchCleanings = useCallback(async (page: number) => {
        if (!userId) return;

        setIsCleaningsLoading(true);
        const result = await UserManager.getCleanings(userId, page);
        if (result.success && result.data) {
            setCleanings(result.data.data);
            setCleaningsMeta(result.data.meta);
        }
        setIsCleaningsLoading(false);
    }, [userId]);

    // Fetch maintenances
    const fetchMaintenances = useCallback(async (page: number) => {
        if (!userId) return;

        setIsMaintenancesLoading(true);
        const result = await UserManager.getMaintenances(userId, page);
        if (result.success && result.data) {
            setMaintenances(result.data.data);
            setMaintenancesMeta(result.data.meta);
        }
        setIsMaintenancesLoading(false);
    }, [userId]);

    // Fetch incidents
    const fetchIncidents = useCallback(async (page: number) => {
        if (!userId) return;

        setIsIncidentsLoading(true);
        const result = await UserManager.getIncidents(userId, page);
        if (result.success && result.data) {
            setIncidents(result.data.data);
            setIncidentsMeta(result.data.meta);
        }
        setIsIncidentsLoading(false);
    }, [userId]);

    // Load data when tab changes
    useEffect(() => {
        if (activeTab === "sites") {
            fetchRolesPerSite();
        } else if (activeTab === "cleanings") {
            fetchCleanings(cleaningsPage);
        } else if (activeTab === "maintenances") {
            fetchMaintenances(maintenancesPage);
        } else if (activeTab === "incidents") {
            fetchIncidents(incidentsPage);
        }
    }, [activeTab, fetchRolesPerSite, fetchCleanings, fetchMaintenances, fetchIncidents, cleaningsPage, maintenancesPage, incidentsPage]);

    const handleEditSuccess = async () => {
        const result = await UserManager.getById(userId);
        if (result.success && result.data) {
            setUser(result.data.data);
        }
        // Also refresh roles per site
        fetchRolesPerSite();
    };

    // Loading state
    if (isLoading) {
        return (
            <>
                <PageMeta title={`${t("common.loading")} | XetaSuite`} description={t("common.loading")} />
                <div className="flex h-96 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
            </>
        );
    }

    // Error state (404 - not found)
    if (error || !user) {
        return (
            <>
                <PageMeta title={`${t("errors.notFound")} | XetaSuite`} description={t("errors.pageNotFound")} />
                <NotFoundContent
                    title={t("users.notFound")}
                    message={t("users.notFoundMessage")}
                    backTo="/users"
                    backLabel={t("users.detail.backToList")}
                />
            </>
        );
    }

    const tabs = [
        { key: "sites" as TabType, label: t("users.detail.sitesTab"), icon: <FaBuildingFlag className="h-4 w-4" /> },
        { key: "cleanings" as TabType, label: t("users.detail.cleaningsTab"), icon: <FaBroom className="h-4 w-4" />, count: user.cleaning_count },
        { key: "maintenances" as TabType, label: t("users.detail.maintenancesTab"), icon: <FaScrewdriverWrench className="h-4 w-4" />, count: user.maintenance_count },
        { key: "incidents" as TabType, label: t("users.detail.incidentsTab"), icon: <FaTriangleExclamation className="h-4 w-4" />, count: user.incident_count },
    ];

    return (
        <>
            <PageMeta
                title={`${user.full_name} | ${t("users.title")} | XetaSuite`}
                description={t("users.description")}
            />
            <PageBreadcrumb
                pageTitle={user.full_name}
                breadcrumbs={[{ label: t("users.title"), path: "/users" }, { label: user.full_name }]}
            />

            {/* User Info Card */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/5 dark:bg-white/3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/users"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-white/5 dark:text-gray-400 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-gray-200"
                            title={t("common.back")}
                        >
                            <FaArrowLeft className="h-4 w-4" />
                        </Link>
                        <img
                            src={user.avatar}
                            alt={user.full_name}
                            className="h-16 w-16 rounded-full object-cover"
                        />
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{user.full_name}</h1>
                            <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
                        </div>
                    </div>
                    {canUpdate && (
                        <Button
                            variant="outline"
                            size="sm"
                            startIcon={<FaPenToSquare className="h-4 w-4" />}
                            onClick={() => editModal.openModal()}
                        >
                            {t("common.edit")}
                        </Button>
                    )}
                </div>

                {/* Contact & Stats */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20">
                            <FaEnvelope className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t("users.email")}</p>
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                                {user.email ? (
                                    <a href={`mailto:${user.email}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                                        {user.email}
                                    </a>
                                ) : (
                                    <span className="text-gray-400">—</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-500/20">
                            <FaPhone className="h-5 w-5 text-success-600 dark:text-success-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t("users.officePhone")}</p>
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                                {user.office_phone ? (
                                    <a href={`tel:${user.office_phone}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                                        {user.office_phone}
                                    </a>
                                ) : (
                                    <span className="text-gray-400">—</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-500/20">
                            <FaMobile className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t("users.cellPhone")}</p>
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                                {user.cell_phone ? (
                                    <a href={`tel:${user.cell_phone}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                                        {user.cell_phone}
                                    </a>
                                ) : (
                                    <span className="text-gray-400">—</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-neutral-800/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-100 dark:bg-error-500/20">
                            <FaCalendar className="h-5 w-5 text-error-600 dark:text-error-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t("common.createdAt")}</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {user.created_at ? formatDate(user.created_at) : "—"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-200 dark:border-white/5">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-colors ${isActive
                                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                {typeof tab.count === "number" && (
                                    <Badge variant="light" color={isActive ? "brand" : "light"}>
                                        {tab.count}
                                    </Badge>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {/* Sites Tab */}
                    {activeTab === "sites" && (
                        <div>
                            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                                {t("users.detail.sitesWithRoles")}
                            </h3>

                            {isRolesLoading ? (
                                <div className="flex h-32 items-center justify-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
                                </div>
                            ) : rolesPerSite.length === 0 ? (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-white/5 dark:bg-neutral-800/50">
                                    <FaBuildingFlag className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                                    <p className="text-gray-500 dark:text-gray-400">{t("users.detail.noSites")}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {rolesPerSite.map((siteRole) => (
                                        <div
                                            key={siteRole.site.id}
                                            className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20">
                                                    <FaBuildingFlag className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {canViewSite ? (
                                                            <Link
                                                                to={`/sites/${siteRole.site.id}`}
                                                                className="font-medium text-gray-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                                                                {siteRole.site.name}
                                                            </Link>
                                                        ) : (
                                                            siteRole.site.name
                                                        )}
                                                    </p>
                                                    {siteRole.site.is_headquarters && (
                                                        <Badge color="brand" size="sm">HQ</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <FaShield className="h-4 w-4 text-gray-400" />
                                                {siteRole.roles.length > 0 ? (
                                                    siteRole.roles.map((role) => (
                                                        <Badge key={role} color="success" size="sm">{role}</Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-gray-400">{t("users.detail.noRoles")}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cleanings Tab */}
                    {activeTab === "cleanings" && (
                        <div>
                            {isCleaningsLoading ? (
                                <div className="flex h-32 items-center justify-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
                                </div>
                            ) : cleanings.length === 0 ? (
                                <div className="p-8 text-center">
                                    <FaBroom className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                                    <p className="text-gray-500 dark:text-gray-400">{t("users.detail.noCleanings")}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-b border-gray-200 dark:border-white/5">
                                                    <TableCell isHeader className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("cleanings.id")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("cleanings.material")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("cleanings.type")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("common.createdAt")}
                                                    </TableCell>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cleanings.map((cleaning) => (
                                                    <TableRow key={cleaning.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50">
                                                        <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                            <LinkedName
                                                                canView={canViewCleaning}
                                                                id={cleaning.id}
                                                                name={`#${cleaning.id}`}
                                                                basePath="cleanings" />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                            <LinkedName
                                                                canView={canViewMaterial}
                                                                id={cleaning.material?.id}
                                                                name={cleaning.material?.name}
                                                                basePath="materials" />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <Badge
                                                                color="brand"
                                                                size="sm"
                                                            >
                                                                {t(`cleanings.types.${cleaning.type}`)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                            {formatDateTime(cleaning.created_at)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {cleaningsMeta && (
                                        <Pagination meta={cleaningsMeta} onPageChange={setCleaningsPage} />
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Maintenances Tab */}
                    {activeTab === "maintenances" && (
                        <div>
                            {isMaintenancesLoading ? (
                                <div className="flex h-32 items-center justify-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
                                </div>
                            ) : maintenances.length === 0 ? (
                                <div className="p-8 text-center">
                                    <FaScrewdriverWrench className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                                    <p className="text-gray-500 dark:text-gray-400">{t("users.detail.noMaintenances")}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-b border-gray-200 dark:border-white/5">
                                                    <TableCell isHeader className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("maintenances.title")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("maintenances.fields.material")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("maintenances.fields.status")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("common.createdAt")}
                                                    </TableCell>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {maintenances.map((maintenance) => (
                                                    <TableRow key={maintenance.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50">
                                                        <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                            <LinkedName
                                                                canView={canViewMaintenance}
                                                                id={maintenance.id}
                                                                name={`#${maintenance.id} - ${maintenance.description}`}
                                                                basePath="maintenances" />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                            <LinkedName
                                                                canView={canViewMaterial}
                                                                id={maintenance.material?.id}
                                                                name={maintenance.material?.name}
                                                                basePath="materials" />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <Badge
                                                                color={maintenance.status === "completed" ? "success" : maintenance.status === "in_progress" ? "warning" : "light"}
                                                                size="sm"
                                                            >
                                                                {t(`maintenances.status.${maintenance.status}`)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                            {formatDateTime(maintenance.created_at)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {maintenancesMeta && (
                                        <Pagination meta={maintenancesMeta} onPageChange={setMaintenancesPage} />
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Incidents Tab */}
                    {activeTab === "incidents" && (
                        <div>
                            {isIncidentsLoading ? (
                                <div className="flex h-32 items-center justify-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
                                </div>
                            ) : incidents.length === 0 ? (
                                <div className="p-8 text-center">
                                    <FaTriangleExclamation className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                                    <p className="text-gray-500 dark:text-gray-400">{t("users.detail.noIncidents")}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-b border-gray-200 dark:border-white/5">
                                                    <TableCell isHeader className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("incidents.title")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("incidents.material")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("incidents.status")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("incidents.severity")}
                                                    </TableCell>
                                                    <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t("common.createdAt")}
                                                    </TableCell>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {incidents.map((incident) => (
                                                    <TableRow key={incident.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50">
                                                        <TableCell className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                            <LinkedName
                                                                canView={canViewIncident}
                                                                id={incident.id}
                                                                name={`#${incident.id} - ${incident.description}`}
                                                                basePath="incidents" />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                            <LinkedName
                                                                canView={canViewMaterial}
                                                                id={incident.material?.id}
                                                                name={incident.material?.name}
                                                                basePath="materials" />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <Badge
                                                                color={incident.status === "resolved" ? "success" : incident.status === "in_progress" ? "warning" : "light"}
                                                                size="sm"
                                                            >
                                                                {t(`incidents.statuses.${incident.status}`)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4">
                                                            <Badge
                                                                color={incident.severity === "critical" || incident.severity === "high" ? "error" : incident.severity === "medium" ? "warning" : "light"}
                                                                size="sm"
                                                            >
                                                                {t(`incidents.severities.${incident.severity}`)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                            {formatDateTime(incident.created_at)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {incidentsMeta && (
                                        <Pagination meta={incidentsMeta} onPageChange={setIncidentsPage} />
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <UserModal
                isOpen={editModal.isOpen}
                onClose={editModal.closeModal}
                user={user}
                onSuccess={handleEditSuccess}
            />
        </>
    );
};

export default UserDetailPage;
