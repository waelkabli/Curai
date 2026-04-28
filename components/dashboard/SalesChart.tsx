'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartDataPoint, ChartGranularity } from '@/types';

interface SalesChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
  granularity?: ChartGranularity;
}

// Format raw period strings into readable labels
function formatPeriod(period: string, granularity: ChartGranularity): string {
  try {
    switch (granularity) {
      case 'daily': {
        // "2025-04-28" → "Apr 28"
        const d = new Date(period + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      case 'monthly': {
        // "2025-04" → "Apr '25"
        const [y, m] = period.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      case 'quarterly': {
        // "2025-Q1" → "Q1 '25"
        const [yr, q] = period.split('-');
        return `${q} '${yr.slice(2)}`;
      }
      case 'yearly':
        return period; // "2025"
      default:
        return period;
    }
  } catch {
    return period;
  }
}

const CustomTooltip = ({
  active,
  payload,
  label,
  granularity,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  granularity: ChartGranularity;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg min-w-[160px]">
        <p className="font-semibold text-gray-700 mb-2 text-sm">
          {label ? formatPeriod(label, granularity) : ''}
        </p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs py-0.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500 flex-1">{entry.name}</span>
            <span className="font-semibold" style={{ color: entry.color }}>
              {entry.name === 'Sales'
                ? `SAR ${entry.value.toLocaleString()}`
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SalesChart({ data, loading, granularity = 'monthly' }: SalesChartProps) {
  if (loading) {
    return (
      <div className="h-80 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading chart…</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-500 text-sm">No data available</p>
          <p className="text-gray-400 text-xs">Configure your database to see the chart</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="period"
          tickFormatter={(v) => formatPeriod(v, granularity)}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip content={<CustomTooltip granularity={granularity} />} />
        <Bar
          yAxisId="left"
          dataKey="customers"
          name="Customers"
          fill="#42A5F5"
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
          opacity={0.9}
        />
        <Bar
          yAxisId="left"
          dataKey="orders"
          name="Orders"
          fill="#1565C0"
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="sales"
          name="Sales"
          stroke="#E85D4A"
          strokeWidth={2.5}
          dot={{ fill: '#E85D4A', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
