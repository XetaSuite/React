import { useSearchParams } from "react-router";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "@/shared/components/common/PageMeta";
import ComponentCard from "@/shared/components/common/ComponentCard";
import { QrCodeScanModal } from "@/features/Qrcode/views";
import {
  StatCard,
  RecentActivityCard,
  UpcomingMaintenancesCard,
  LowStockItemsCard,
  IncidentsSummaryCard,
  type Activity,
  type Maintenance,
  type LowStockItem,
  type IncidentsSummary,
} from "../../shared/components/dashboard";
import {
  FaScrewdriverWrench,
  FaTriangleExclamation,
  FaCubes,
  FaBroom,
} from "react-icons/fa6";
import { DashboardRepository } from "./services";
import type { DashboardData, IncidentsEvolution, MaintenancesEvolution } from "./types";
import { useAppConfig } from "@/shared/store";
import { MaintenanceEvolutionChart, IncidentEvolutionChart } from "./components";

export default function Home() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDemoMode } = useAppConfig();

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [chartsMaintenancesData, setChartsMaintenancesData] = useState<MaintenancesEvolution | null>(null);
  const [chartsIncidentsData, setChartsIncidentsData] = useState<IncidentsEvolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await DashboardRepository.getStats();
      setDashboardData(data);

      const chartsData = await DashboardRepository.getChartsData();
      setChartsIncidentsData(chartsData.incidents_evolution);
      setChartsMaintenancesData(chartsData.maintenances_evolution);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // QR Code scan detection
  const source = searchParams.get("source");
  const materialId = searchParams.get("material");
  const itemId = searchParams.get("item");

  const qrScanInfo = useMemo(() => {
    if (source !== "qr") return null;

    if (materialId) {
      const id = parseInt(materialId, 10);
      if (!isNaN(id)) return { type: "material" as const, id };
    }
    if (itemId) {
      const id = parseInt(itemId, 10);
      if (!isNaN(id)) return { type: "item" as const, id };
    }
    return null;
  }, [source, materialId, itemId]);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    if (qrScanInfo) {
      setIsQrModalOpen(true);
    }
  }, [qrScanInfo]);

  const handleCloseQrModal = () => {
    setIsQrModalOpen(false);
    // Clean URL parameters
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("source");
    newParams.delete("material");
    newParams.delete("item");
    setSearchParams(newParams, { replace: true });
  };

  // Transform API data to component props
  const recentActivities: Activity[] = useMemo(() => {
    if (!dashboardData?.recent_activities) return [];
    return dashboardData.recent_activities.map((activity) => ({
      id: parseInt(activity.id.split('_')[1]) || 0,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      time: activity.time,
      status: activity.status,
    }));
  }, [dashboardData?.recent_activities]);

  const upcomingMaintenances: Maintenance[] = useMemo(() => {
    if (!dashboardData?.upcoming_maintenances) return [];
    return dashboardData.upcoming_maintenances.map((m) => ({
      id: m.id,
      title: m.title,
      location: m.location,
      date: m.date,
      priority: m.priority,
      type: m.type,
    }));
  }, [dashboardData?.upcoming_maintenances]);

  const lowStockItems: LowStockItem[] = useMemo(() => {
    if (!dashboardData?.low_stock_items) return [];
    return dashboardData.low_stock_items.map((item) => ({
      id: item.id,
      name: item.name,
      reference: item.reference,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      stock_status: item.stock_status,
      stock_status_color: item.stock_status_color,
    }));
  }, [dashboardData?.low_stock_items, t]);

  const incidentsSummary: IncidentsSummary = useMemo(() => {
    if (!dashboardData?.incidents_summary) {
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      };
    }
    return {
      total: dashboardData.incidents_summary.total,
      open: dashboardData.incidents_summary.open,
      inProgress: dashboardData.incidents_summary.in_progress,
      resolved: dashboardData.incidents_summary.resolved,
      bySeverity: dashboardData.incidents_summary.by_severity,
    };
  }, [dashboardData?.incidents_summary]);

  // Format large numbers with separator
  const formatNumber = (num: number): string => {
    return num.toLocaleString('fr-FR');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-error-500 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-brand-500 hover:text-brand-600"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={t('dashboard.pageTitle')}
        description={t('dashboard.pageDescription')}
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="col-span-12">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2 text-yellow-700 dark:text-yellow-300 text-sm">
              <span className="font-medium">{t('dashboard.demoModeActive')}</span>
              {' - '}
              {t('dashboard.demoModeInfo')}
            </div>
          </div>
        )}

        {/* HQ indicator */}
        {dashboardData?.is_headquarters && (
          <div className="col-span-12">
            <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg px-4 py-2 text-brand-700 dark:text-brand-300 text-sm">
              <span className="font-medium">{t('dashboard.headquartersView')}</span>
              {' - '}
              {t('dashboard.aggregatedStats')}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
          <StatCard
            title={t('dashboard.stats.maintenancesThisMonth')}
            value={isLoading ? '-' : dashboardData?.stats.maintenances_this_month ?? 0}
            icon={<FaScrewdriverWrench className="h-5 w-5" />}
            trend={
              dashboardData?.stats.maintenances_trend !== undefined
                ? {
                  value: Math.abs(dashboardData.stats.maintenances_trend),
                  isPositive: dashboardData.stats.maintenances_trend >= 0,
                  inverted: true,
                }
                : undefined
            }
            color="warning"
            isLoading={isLoading}
          />
          <StatCard
            title={t('dashboard.stats.openIncidents')}
            value={isLoading ? '-' : dashboardData?.stats.open_incidents ?? 0}
            icon={<FaTriangleExclamation className="h-5 w-5" />}
            trend={
              dashboardData?.stats.incidents_trend !== undefined
                ? {
                  value: Math.abs(dashboardData.stats.incidents_trend),
                  isPositive: dashboardData.stats.incidents_trend <= 0, // Less incidents is positive
                  inverted: true,
                }
                : undefined
            }
            color="error"
            isLoading={isLoading}
          />
          <StatCard
            title={t('dashboard.stats.itemsInStock')}
            value={isLoading ? '-' : formatNumber(dashboardData?.stats.items_in_stock ?? 0)}
            icon={<FaCubes className="h-5 w-5" />}
            color="brand"
            isLoading={isLoading}
          />
          <StatCard
            title={t('dashboard.stats.cleaningsThisMonth')}
            value={isLoading ? '-' : dashboardData?.stats.cleanings_this_month ?? 0}
            icon={<FaBroom className="h-5 w-5" />}
            trend={
              dashboardData?.stats.cleanings_trend !== undefined
                ? {
                  value: Math.abs(dashboardData.stats.cleanings_trend),
                  isPositive: dashboardData.stats.cleanings_trend >= 0,
                }
                : undefined
            }
            color="success"
            isLoading={isLoading}
          />
        </div>

        {/* Main Content Row */}
        <div className="col-span-12">
          <IncidentsSummaryCard summary={incidentsSummary} isLoading={isLoading} />
        </div>
        <div className="col-span-12">
          <RecentActivityCard activities={recentActivities} isLoading={isLoading} />
        </div>

        {/* Bottom Row */}
        <div className="col-span-12 xl:col-span-7">
          <UpcomingMaintenancesCard maintenances={upcomingMaintenances} isLoading={isLoading} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <LowStockItemsCard items={lowStockItems} isLoading={isLoading} />
        </div>

        {/* Charts Row */}
        <div className="col-span-12 xl:col-span-7">
          <ComponentCard title={t('dashboard.charts.maintenanceEvolution')} desc={t('dashboard.charts.maintenanceEvolutionDesc')}>
            <MaintenanceEvolutionChart data={chartsMaintenancesData} isLoading={isLoading} />
          </ComponentCard>
        </div>
        <div className="col-span-12 xl:col-span-5">
          <ComponentCard title={t('dashboard.charts.incidentsByMonth')} desc={t('dashboard.charts.incidentsByMonthDesc')}>
            <IncidentEvolutionChart data={chartsIncidentsData} isLoading={isLoading} />
          </ComponentCard>
        </div>
      </div>

      {/* QR Code Scan Modal */}
      {qrScanInfo && (
        <QrCodeScanModal
          isOpen={isQrModalOpen}
          onClose={handleCloseQrModal}
          scanType={qrScanInfo.type}
          scanId={qrScanInfo.id}
        />
      )}
    </>
  );
}
