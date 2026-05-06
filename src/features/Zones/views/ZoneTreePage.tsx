import { useState, useEffect, useCallback, useRef, type FC } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
    FaChevronDown,
    FaSignsPost,
    FaArrowsRotate,
    FaBuildingFlag,
} from "react-icons/fa6";
import { PageMeta, PageBreadcrumb } from "@/shared/components/common";
import { Button } from "@/shared/components/ui";
import { useAuth } from "@/features/Auth";
import { SiteManager } from "@/features/Sites/services";
import type { Site } from "@/features/Sites/types";
import { ZoneManager } from "../services";
import { ZoneTreeItem } from "../components";
import type { ZoneTreeNode, ZoneTreeResponse } from "../types";

const ZoneTreePage: FC = () => {
    const { t } = useTranslation();
    const { user, isOnHeadquarters } = useAuth();

    const [treeData, setTreeData] = useState<ZoneTreeResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedZones, setExpandedZones] = useState<Set<number>>(new Set());

    // Site selection for HQ - load all sites excluding HQ
    const [sites, setSites] = useState<Site[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>(undefined);
    const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
    const siteDropdownRef = useRef<HTMLDivElement>(null);

    // Get selected site
    const selectedSite = sites.find((s) => s.id === selectedSiteId);

    // Load sites for HQ users (excluding HQ site)
    useEffect(() => {
        if (!isOnHeadquarters) return;

        const loadSites = async () => {
            setIsLoadingSites(true);
            // Load all sites (high per_page to get all in one request)
            const result = await SiteManager.getAll({ per_page: 100 });
            if (result.success && result.data) {
                // Filter out the HQ site since zones cannot be created there
                const nonHqSites = result.data.data.filter((s) => !s.is_headquarters);
                setSites(nonHqSites);
                // Auto-select first site if none selected yet (preserves user choice on re-runs)
                if (nonHqSites.length > 0) {
                    setSelectedSiteId((prev) => prev ?? nonHqSites[0].id);
                }
            }
            setIsLoadingSites(false);
        };

        loadSites();
    }, [isOnHeadquarters]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target as Node)) {
                setIsSiteDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchTree = useCallback(async (siteId?: number) => {
        setIsLoading(true);
        setError(null);
        const result = await ZoneManager.getTree(siteId);
        if (result.success && result.data) {
            setTreeData(result.data);
            // Auto-expand root zones
            const rootIds = new Set(result.data.data.map((z) => z.id));
            setExpandedZones(rootIds);
        } else {
            setError(result.error || t("errors.generic"));
        }
        setIsLoading(false);
    }, [t]);

    useEffect(() => {
        fetchTree(selectedSiteId);
    }, [fetchTree, selectedSiteId]);

    const handleToggle = (zoneId: number) => {
        setExpandedZones((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(zoneId)) {
                newSet.delete(zoneId);
            } else {
                newSet.add(zoneId);
            }
            return newSet;
        });
    };

    const handleExpandAll = () => {
        if (!treeData) return;
        const allIds = new Set<number>();
        const collectIds = (zones: ZoneTreeNode[]) => {
            zones.forEach((zone) => {
                allIds.add(zone.id);
                if (zone.children) {
                    collectIds(zone.children);
                }
            });
        };
        collectIds(treeData.data);
        setExpandedZones(allIds);
    };

    const handleCollapseAll = () => {
        setExpandedZones(new Set());
    };

    const handleRefresh = () => {
        fetchTree(selectedSiteId);
    };

    // Don't render if user is not authenticated
    if (!user) {
        return null;
    }

    return (
        <>
            <PageMeta
                title={`${t("zones.tree.title")} | XetaSuite`}
                description={t("zones.tree.description")}
            />
            <PageBreadcrumb
                pageTitle={t("zones.tree.title")}
                breadcrumbs={[
                    { label: t("zones.title"), path: "/zones" },
                    { label: t("zones.tree.title") },
                ]}
            />

            <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
                {/* Header */}
                <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                            {t("zones.tree.pageTitle")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t("zones.tree.pageDescription")}
                            {treeData && (
                                <span className="ml-2 font-medium text-brand-600 dark:text-brand-400">
                                    ({treeData.meta.total_zones} {t("zones.tree.totalZones")})
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Site selector for HQ */}
                        {isOnHeadquarters && sites.length > 0 && (
                            <div ref={siteDropdownRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
                                    disabled={isLoadingSites}
                                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-white/5 dark:bg-white/3 dark:text-white/90 dark:hover:bg-neutral-800"
                                >
                                    <FaBuildingFlag className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    <span className="max-w-37.5 truncate">
                                        {selectedSite?.name || t("zones.tree.selectSite")}
                                    </span>
                                    <FaChevronDown
                                        className={`h-3 w-3 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${isSiteDropdownOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>

                                {isSiteDropdownOpen && (
                                    <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-white/5 dark:bg-neutral-900">
                                        <div className="max-h-60 overflow-y-auto">
                                            {/* Site list (HQ excluded) */}
                                            {sites.map((site) => (
                                                <button
                                                    key={site.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSiteId(site.id);
                                                        setIsSiteDropdownOpen(false);
                                                    }}
                                                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${selectedSiteId === site.id
                                                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                                                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-800"
                                                        }`}
                                                >
                                                    <FaBuildingFlag className="h-4 w-4" />
                                                    <span className="flex-1 truncate">
                                                        {site.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExpandAll}
                            disabled={isLoading}
                        >
                            {t("zones.tree.expandAll")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCollapseAll}
                            disabled={isLoading}
                        >
                            {t("zones.tree.collapseAll")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            startIcon={<FaArrowsRotate className="h-4 w-4" />}
                            onClick={handleRefresh}
                            disabled={isLoading}
                        >
                            {t("common.refresh")}
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg bg-error-50 p-4 text-center text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                            {error}
                        </div>
                    ) : treeData && treeData.data.length > 0 ? (
                        <div className="space-y-1">
                            {treeData.data.map((zone) => (
                                <ZoneTreeItem
                                    key={zone.id}
                                    zone={zone}
                                    level={0}
                                    expandedZones={expandedZones}
                                    onToggle={handleToggle}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <FaSignsPost className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-gray-500 dark:text-gray-400">
                                {t("zones.tree.noZones")}
                            </p>
                            <Link
                                to="/zones"
                                className="mt-2 inline-block text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                            >
                                {t("zones.tree.goToManagement")}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ZoneTreePage;
