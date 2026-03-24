'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  RefreshCw,
  AlertCircle,
  WifiOff,
} from 'lucide-react';
import axios from 'axios';
import KPICard from '@/components/dashboard/KPICard';
import SalesChart from '@/components/dashboard/SalesChart';
import BusinessLineTable from '@/components/dashboard/BusinessLineTable';
import FilterPanel from '@/components/dashboard/FilterPanel';
import { MainReportData, FilterState, KPIData, ChartDataPoint, BusinessLineRow } from '@/types';
import { getSettings } from '@/lib/utils';

const DEFAULT_FILTER_OPTIONS = {
  organizations: [],
  currencies: [],
  businessLines: [],
  revenueSources: [],
};

export default function DashboardPage() {
  const [data, setData] = useState<MainReportData | null>(null);
  const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async (appliedFilters: FilterState) => {
    const settings = getSettings();
    const dbConfig = settings?.db;

    if (!dbConfig?.host || !dbConfig?.database) {
      setError('Database not configured. Please go to Settings to configure your database connection.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/reports/main', {
        dbConfig,
        filters: appliedFilters,
      });

      setData({
        kpis: response.data.kpis as KPIData,
        chartData: response.data.chartData as ChartDataPoint[],
        tableData: response.data.tableData as BusinessLineRow[],
      });
      setFilterOptions(response.data.filterOptions || DEFAULT_FILTER_OPTIONS);
      setLastRefreshed(new Date());
    } catch (err) {
      let message = 'Failed to load report data.';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error || err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData({});
  }, [fetchData]);

  const handleApplyFilters = () => {
    fetchData(filters);
  };

  const handleResetFilters = () => {
    setFilters({});
    fetchData({});
  };

  return (
    <div className="flex gap-0 h-full">
      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-cura-navy">Sales Overview</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Customers, Orders and Sales by Year, Quarter and Month
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-gray-400">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchData(filters)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cura-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            {error.includes('configured') ? (
              <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-red-700 font-medium text-sm">Unable to load data</p>
              <p className="text-red-600 text-sm mt-0.5">{error}</p>
              {error.includes('configured') && (
                <a href="/settings" className="text-cura-blue text-sm font-medium underline mt-1 inline-block">
                  Go to Settings →
                </a>
              )}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <KPICard
            title="Daily Ave. Sales"
            value={data?.kpis.dailyAveSales ?? 0}
            prefix="SAR "
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
            loading={loading && !data}
            subtitle="Average daily revenue"
          />
          <KPICard
            title="Daily Ave. Orders"
            value={data?.kpis.dailyAveOrders ?? 0}
            icon={<ShoppingCart className="w-5 h-5" />}
            color="navy"
            loading={loading && !data}
            subtitle="Orders per day"
          />
          <KPICard
            title="Dispense Amount"
            value={data?.kpis.dispenseAmount ?? 0}
            icon={<Package className="w-5 h-5" />}
            color="teal"
            loading={loading && !data}
            subtitle="Prescription dispenses"
          />
          <KPICard
            title="Total Sales"
            value={data?.kpis.totalSales ?? 0}
            prefix="SAR "
            icon={<TrendingUp className="w-5 h-5" />}
            color="coral"
            loading={loading && !data}
            subtitle="Total revenue"
          />
          <KPICard
            title="Total Orders"
            value={data?.kpis.totalOrders ?? 0}
            icon={<Users className="w-5 h-5" />}
            color="purple"
            loading={loading && !data}
            subtitle="All-time orders"
          />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-cura-navy">Customers, Orders and Sales</h3>
              <p className="text-xs text-gray-500 mt-0.5">Monthly trend overview</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-cura-light-blue" />
                <span>Customers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-cura-blue" />
                <span>Orders</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-cura-coral" />
                <span>Sales</span>
              </div>
            </div>
          </div>
          <SalesChart data={data?.chartData || []} loading={loading && !data} />
        </div>

        {/* Business Line Table */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-cura-navy">Business Line Breakdown</h3>
              <p className="text-xs text-gray-500 mt-0.5">Performance by service category</p>
            </div>
            {data && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {data.tableData.length} business lines
              </span>
            )}
          </div>
          <BusinessLineTable data={data?.tableData || []} loading={loading && !data} />
        </div>
      </div>

      {/* Filter sidebar */}
      <div className="w-64 flex-shrink-0 p-4 border-l border-gray-200 bg-white/50 overflow-y-auto">
        <FilterPanel
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={setFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />
      </div>
    </div>
  );
}
