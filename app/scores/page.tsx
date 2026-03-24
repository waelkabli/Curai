'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, WifiOff, Users, DollarSign, ShoppingCart } from 'lucide-react';
import axios from 'axios';
import { ScoresReportData } from '@/types';
import { getSettings, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  customers: number;
  totalSales: number;
  totalOrders: number;
  color?: string;
  loading?: boolean;
}

function MetricCard({ label, customers, totalSales, totalOrders, color = 'blue', loading }: MetricCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; badge: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100' },
    coral: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-100' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-16 mb-3" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl p-4 border', colors.bg, 'border-transparent')}>
      <div className={cn('text-xs font-semibold mb-3 px-2 py-1 rounded-full inline-block', colors.badge, colors.text)}>
        {label}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            <span>Customers</span>
          </div>
          <span className={cn('text-sm font-bold', colors.text)}>
            {customers.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <DollarSign className="w-3 h-3" />
            <span>Total Sales</span>
          </div>
          <span className={cn('text-sm font-bold', colors.text)}>
            {formatCurrency(totalSales)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShoppingCart className="w-3 h-3" />
            <span>Total Orders</span>
          </div>
          <span className={cn('text-sm font-bold', colors.text)}>
            {totalOrders.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  headerColor?: string;
}

function Section({ title, children, headerColor = 'from-cura-blue to-blue-700' }: SectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={cn('px-5 py-3 bg-gradient-to-r text-white', headerColor)}>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default function ScoresPage() {
  const [data, setData] = useState<ScoresReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
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
      const response = await axios.post('/api/reports/scores', { dbConfig });
      setData(response.data as ScoresReportData);
      setLastRefreshed(new Date());
    } catch (err) {
      let message = 'Failed to load Cura Scores data.';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error || err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-900 rounded-2xl px-6 py-5 mb-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Cura Scores</h1>
            <p className="text-purple-200 text-sm mt-1">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-purple-300 text-xs">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          {error.includes('configured') ? (
            <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-red-700 font-medium text-sm">Unable to load Cura Scores</p>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
            {error.includes('configured') && (
              <a href="/settings" className="text-cura-blue text-sm font-medium underline mt-1 inline-block">
                Go to Settings →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Today's Summary */}
      <Section title="Today's Metrics" headerColor="from-purple-600 to-purple-800">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <div className="text-3xl font-bold text-purple-700">
              {loading && !data ? '—' : (data?.today.customers || 0).toLocaleString()}
            </div>
            <div className="text-xs text-purple-500 mt-1 font-medium">Customers</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <div className="text-3xl font-bold text-purple-700">
              {loading && !data ? '—' : formatCurrency(data?.today.totalSales || 0)}
            </div>
            <div className="text-xs text-purple-500 mt-1 font-medium">Total Sales</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <div className="text-3xl font-bold text-purple-700">
              {loading && !data ? '—' : (data?.today.totalOrders || 0).toLocaleString()}
            </div>
            <div className="text-xs text-purple-500 mt-1 font-medium">Total Orders</div>
          </div>
        </div>
      </Section>

      {/* Specialized & Mental */}
      <div className="mt-4">
        <Section title="Specialized & Mental Care" headerColor="from-cura-blue to-blue-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricCard
              label="Insurance"
              customers={data?.specializedMental.insurance.customers || 0}
              totalSales={data?.specializedMental.insurance.totalSales || 0}
              totalOrders={data?.specializedMental.insurance.totalOrders || 0}
              color="blue"
              loading={loading && !data}
            />
            <MetricCard
              label="Pharmacy"
              customers={data?.specializedMental.pharmacy.customers || 0}
              totalSales={data?.specializedMental.pharmacy.totalSales || 0}
              totalOrders={data?.specializedMental.pharmacy.totalOrders || 0}
              color="teal"
              loading={loading && !data}
            />
            <MetricCard
              label="Cash"
              customers={data?.specializedMental.cash.customers || 0}
              totalSales={data?.specializedMental.cash.totalSales || 0}
              totalOrders={data?.specializedMental.cash.totalOrders || 0}
              color="green"
              loading={loading && !data}
            />
          </div>
        </Section>
      </div>

      {/* Urgent Care */}
      <div className="mt-4">
        <Section title="Urgent Care" headerColor="from-cura-coral to-red-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricCard
              label="Insurance"
              customers={data?.urgentCare.insurance.customers || 0}
              totalSales={data?.urgentCare.insurance.totalSales || 0}
              totalOrders={data?.urgentCare.insurance.totalOrders || 0}
              color="coral"
              loading={loading && !data}
            />
            <MetricCard
              label="Pharmacy"
              customers={data?.urgentCare.pharmacy.customers || 0}
              totalSales={data?.urgentCare.pharmacy.totalSales || 0}
              totalOrders={data?.urgentCare.pharmacy.totalOrders || 0}
              color="amber"
              loading={loading && !data}
            />
            <MetricCard
              label="Cash"
              customers={data?.urgentCare.cash.customers || 0}
              totalSales={data?.urgentCare.cash.totalSales || 0}
              totalOrders={data?.urgentCare.cash.totalOrders || 0}
              color="green"
              loading={loading && !data}
            />
          </div>
        </Section>
      </div>

      {/* Wellness, Bundles and Home Labs */}
      <div className="mt-4 mb-6">
        <Section title="Wellness, Bundles and Home Labs" headerColor="from-teal-600 to-teal-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricCard
              label="Insurance"
              customers={data?.wellnessBundlesHomeLabs.insurance.customers || 0}
              totalSales={data?.wellnessBundlesHomeLabs.insurance.totalSales || 0}
              totalOrders={data?.wellnessBundlesHomeLabs.insurance.totalOrders || 0}
              color="teal"
              loading={loading && !data}
            />
            <MetricCard
              label="Bundle"
              customers={data?.wellnessBundlesHomeLabs.bundle.customers || 0}
              totalSales={data?.wellnessBundlesHomeLabs.bundle.totalSales || 0}
              totalOrders={data?.wellnessBundlesHomeLabs.bundle.totalOrders || 0}
              color="purple"
              loading={loading && !data}
            />
            <MetricCard
              label="Home Labs"
              customers={data?.wellnessBundlesHomeLabs.homeLabs.customers || 0}
              totalSales={data?.wellnessBundlesHomeLabs.homeLabs.totalSales || 0}
              totalOrders={data?.wellnessBundlesHomeLabs.homeLabs.totalOrders || 0}
              color="blue"
              loading={loading && !data}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
