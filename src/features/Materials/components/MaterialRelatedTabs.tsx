import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FaTriangleExclamation,
    FaScrewdriverWrench,
    FaBroom,
    FaCubes,
    FaMagnifyingGlass,
} from 'react-icons/fa6';
import { MaterialManager } from '../services/MaterialManager';
import type {
    MaterialDetail,
    MaterialIncident,
    MaterialMaintenance,
    MaterialCleaning,
    MaterialItem,
} from '../types';
import type { PaginationMeta } from '@/shared/types';
import { useAuth } from '@/features/Auth/hooks';
import { formatDateTime } from '@/shared/utils';
import { Pagination } from '@/shared/components/common';
import { Table, TableHeader, TableBody, TableRow, TableCell, Badge, LinkedName } from '@/shared/components/ui';
import { Input } from '@/shared/components/form';

type TabType = 'incidents' | 'maintenances' | 'cleanings' | 'items';

interface MaterialRelatedTabsProps {
    material: MaterialDetail;
}

export function MaterialRelatedTabs({ material }: MaterialRelatedTabsProps) {
    const { t } = useTranslation();
    const { hasPermission, isOnHeadquarters } = useAuth();

    // Active tab
    const [activeTab, setActiveTab] = useState<TabType>('incidents');

    // Permissions
    const canViewIncident = hasPermission('incident.view');
    const canViewMaintenance = hasPermission('maintenance.view');
    const canViewCleaning = hasPermission('cleaning.view');
    const canViewItem = hasPermission('item.view');
    const canViewCreator = isOnHeadquarters && hasPermission('user.view');
    const canViewCompany = hasPermission('company.view');

    // Incidents state
    const [incidents, setIncidents] = useState<MaterialIncident[]>([]);
    const [incidentsMeta, setIncidentsMeta] = useState<PaginationMeta | null>(null);
    const [incidentsPage, setIncidentsPage] = useState(1);
    const [incidentsSearch, setIncidentsSearch] = useState('');
    const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);

    // Maintenances state
    const [maintenances, setMaintenances] = useState<MaterialMaintenance[]>([]);
    const [maintenancesMeta, setMaintenancesMeta] = useState<PaginationMeta | null>(null);
    const [maintenancesPage, setMaintenancesPage] = useState(1);
    const [maintenancesSearch, setMaintenancesSearch] = useState('');
    const [isMaintenancesLoading, setIsMaintenancesLoading] = useState(false);

    // Cleanings state
    const [cleanings, setCleanings] = useState<MaterialCleaning[]>([]);
    const [cleaningsMeta, setCleaningsMeta] = useState<PaginationMeta | null>(null);
    const [cleaningsPage, setCleaningsPage] = useState(1);
    const [cleaningsSearch, setCleaningsSearch] = useState('');
    const [isCleaningsLoading, setIsCleaningsLoading] = useState(false);

    // Items state
    const [items, setItems] = useState<MaterialItem[]>([]);
    const [itemsMeta, setItemsMeta] = useState<PaginationMeta | null>(null);
    const [itemsPage, setItemsPage] = useState(1);
    const [itemsSearch, setItemsSearch] = useState('');
    const [isItemsLoading, setIsItemsLoading] = useState(false);

    // Fetch incidents
    const fetchIncidents = useCallback(async (page: number, search: string) => {
        setIsIncidentsLoading(true);
        const result = await MaterialManager.getIncidents(material.id, page, 10, search || undefined);
        if (result.success && result.data) {
            setIncidents(result.data.data);
            setIncidentsMeta(result.data.meta);
        }
        setIsIncidentsLoading(false);
    }, [material.id]);

    // Fetch maintenances
    const fetchMaintenances = useCallback(async (page: number, search: string) => {
        setIsMaintenancesLoading(true);
        const result = await MaterialManager.getMaintenances(material.id, page, 10, search || undefined);
        if (result.success && result.data) {
            setMaintenances(result.data.data);
            setMaintenancesMeta(result.data.meta);
        }
        setIsMaintenancesLoading(false);
    }, [material.id]);

    // Fetch cleanings
    const fetchCleanings = useCallback(async (page: number, search: string) => {
        setIsCleaningsLoading(true);
        const result = await MaterialManager.getCleanings(material.id, page, 10, search || undefined);
        if (result.success && result.data) {
            setCleanings(result.data.data);
            setCleaningsMeta(result.data.meta);
        }
        setIsCleaningsLoading(false);
    }, [material.id]);

    // Fetch items
    const fetchItems = useCallback(async (page: number, search: string) => {
        setIsItemsLoading(true);
        const result = await MaterialManager.getItems(material.id, page, 10, search || undefined);
        if (result.success && result.data) {
            setItems(result.data.data);
            setItemsMeta(result.data.meta);
        }
        setIsItemsLoading(false);
    }, [material.id]);

    // Load data when tab or page/search changes
    useEffect(() => {
        if (activeTab === 'incidents') {
            fetchIncidents(incidentsPage, incidentsSearch);
        } else if (activeTab === 'maintenances') {
            fetchMaintenances(maintenancesPage, maintenancesSearch);
        } else if (activeTab === 'cleanings') {
            fetchCleanings(cleaningsPage, cleaningsSearch);
        } else if (activeTab === 'items') {
            fetchItems(itemsPage, itemsSearch);
        }
    }, [
        activeTab,
        incidentsPage, incidentsSearch, fetchIncidents,
        maintenancesPage, maintenancesSearch, fetchMaintenances,
        cleaningsPage, cleaningsSearch, fetchCleanings,
        itemsPage, itemsSearch, fetchItems,
    ]);

    // Handle search with debounce (reset page)
    const handleIncidentsSearch = (value: string) => {
        setIncidentsSearch(value);
        setIncidentsPage(1);
    };

    const handleMaintenancesSearch = (value: string) => {
        setMaintenancesSearch(value);
        setMaintenancesPage(1);
    };

    const handleCleaningsSearch = (value: string) => {
        setCleaningsSearch(value);
        setCleaningsPage(1);
    };

    const handleItemsSearch = (value: string) => {
        setItemsSearch(value);
        setItemsPage(1);
    };

    // Tab configuration
    const tabs = useMemo(() => [
        { key: 'incidents' as TabType, label: t('materials.tabs.incidents'), icon: <FaTriangleExclamation className="h-4 w-4" />, count: material.incident_count },
        { key: 'maintenances' as TabType, label: t('materials.tabs.maintenances'), icon: <FaScrewdriverWrench className="h-4 w-4" />, count: material.maintenance_count },
        { key: 'cleanings' as TabType, label: t('materials.tabs.cleanings'), icon: <FaBroom className="h-4 w-4" />, count: material.cleaning_count },
        { key: 'items' as TabType, label: t('materials.tabs.items'), icon: <FaCubes className="h-4 w-4" />, count: material.item_count },
    ], [t, material]);

    // Render loading spinner
    const renderLoading = () => (
        <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
        </div>
    );

    // Render search input
    const renderSearchInput = (
        value: string,
        onChange: (value: string) => void,
        placeholder: string
    ) => (
        <div className="mb-4 relative max-w-md">
            <FaMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10" />
            <Input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                className="pl-10"
            />
        </div>
    );

    // Render empty state
    const renderEmpty = (icon: React.ReactNode, message: string) => (
        <div className="p-8 flex flex-col items-center">
            <div className="mx-auto mb-3 text-gray-400">{icon}</div>
            <p className="text-gray-500 dark:text-gray-400">{message}</p>
        </div>
    );

    return (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
            {/* Tab Headers */}
            <div className="flex flex-wrap border-b border-gray-200 dark:border-white/5">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-colors sm:px-6 ${isActive
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                            {typeof tab.count === 'number' && (
                                <Badge variant="light" color={isActive ? 'brand' : 'light'} size="sm">
                                    {tab.count}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {/* Incidents Tab */}
                {activeTab === 'incidents' && (
                    <div>
                        {renderSearchInput(incidentsSearch, handleIncidentsSearch, t('materials.tabs.searchIncidents'))}
                        {isIncidentsLoading ? renderLoading() : incidents.length === 0 ? (
                            renderEmpty(<FaTriangleExclamation className="h-10 w-10" />, t('materials.tabs.noIncidents'))
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-gray-200 dark:border-white/5">
                                                <TableCell isHeader className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('incidents.title')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('incidents.status')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('incidents.severity')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('common.createdAt')}
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {incidents.map((incident) => (
                                                <TableRow key={incident.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50">
                                                    <TableCell className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                                        <LinkedName
                                                            canView={canViewIncident}
                                                            id={incident.id}
                                                            name={`#${incident.id} - ${incident.description}`}
                                                            basePath="incidents"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <Badge
                                                            color={incident.status === 'resolved' ? 'success' : incident.status === 'in_progress' ? 'warning' : 'light'}
                                                            size="sm"
                                                        >
                                                            {t(`incidents.statuses.${incident.status}`)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <Badge
                                                            color={incident.severity === 'critical' || incident.severity === 'high' ? 'error' : incident.severity === 'medium' ? 'warning' : 'light'}
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

                {/* Maintenances Tab */}
                {activeTab === 'maintenances' && (
                    <div>
                        {renderSearchInput(maintenancesSearch, handleMaintenancesSearch, t('materials.tabs.searchMaintenances'))}
                        {isMaintenancesLoading ? renderLoading() : maintenances.length === 0 ? (
                            renderEmpty(<FaScrewdriverWrench className="h-10 w-10" />, t('materials.tabs.noMaintenances'))
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-gray-200 dark:border-white/5">
                                                <TableCell isHeader className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('maintenances.title')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('maintenances.fields.type')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('maintenances.fields.status')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('common.createdAt')}
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {maintenances.map((maintenance) => (
                                                <TableRow key={maintenance.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50">
                                                    <TableCell className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                                        <LinkedName
                                                            canView={canViewMaintenance}
                                                            id={maintenance.id}
                                                            name={`#${maintenance.id} - ${maintenance.description}`}
                                                            basePath="maintenances"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <Badge color="brand" size="sm">
                                                            {t(`maintenances.type.${maintenance.type}`)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <Badge
                                                            color={maintenance.status === 'completed' ? 'success' : maintenance.status === 'in_progress' ? 'warning' : 'light'}
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

                {/* Cleanings Tab */}
                {activeTab === 'cleanings' && (
                    <div>
                        {renderSearchInput(cleaningsSearch, handleCleaningsSearch, t('materials.tabs.searchCleanings'))}
                        {isCleaningsLoading ? renderLoading() : cleanings.length === 0 ? (
                            renderEmpty(<FaBroom className="h-10 w-10" />, t('materials.tabs.noCleanings'))
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-gray-200 dark:border-white/5">
                                                <TableCell isHeader className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('cleanings.id')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('cleanings.type')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('cleanings.createdBy')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('common.createdAt')}
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cleanings.map((cleaning) => (
                                                <TableRow key={cleaning.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50">
                                                    <TableCell className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                                        <LinkedName
                                                            canView={canViewCleaning}
                                                            id={cleaning.id}
                                                            name={`#${cleaning.id}`}
                                                            basePath="cleanings"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <Badge color="brand" size="sm">
                                                            {t(`cleanings.types.${cleaning.type}`)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                        <LinkedName
                                                            canView={canViewCreator}
                                                            id={cleaning.creator?.id}
                                                            name={cleaning.creator?.full_name}
                                                            basePath="users"
                                                        />
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

                {/* Items Tab */}
                {activeTab === 'items' && (
                    <div>
                        {renderSearchInput(itemsSearch, handleItemsSearch, t('materials.tabs.searchItems'))}
                        {isItemsLoading ? renderLoading() : items.length === 0 ? (
                            renderEmpty(<FaCubes className="h-10 w-10" />, t('materials.tabs.noItems'))
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b border-gray-200 dark:border-white/5">
                                                <TableCell isHeader className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('items.fields.name')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('items.fields.reference')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('items.fields.stock')}
                                                </TableCell>
                                                <TableCell isHeader className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('items.fields.company')}
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item) => (
                                                <TableRow key={item.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-neutral-800/50">
                                                    <TableCell className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                                        <LinkedName
                                                            canView={canViewItem}
                                                            id={item.id}
                                                            name={item.name}
                                                            basePath="items"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                        {item.reference || '—'}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <Badge
                                                            color={item.stock_status === 'ok' ? 'success' : item.stock_status === 'warning' ? 'warning' : item.stock_status === 'error' ? 'error' : 'light'}
                                                            size="sm"
                                                        >
                                                            {item.current_stock} {t('common.units')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                        <LinkedName
                                                            canView={canViewCompany}
                                                            id={item.company?.id}
                                                            name={item.company?.name}
                                                            basePath="companies"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {itemsMeta && (
                                    <Pagination meta={itemsMeta} onPageChange={setItemsPage} />
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MaterialRelatedTabs;
