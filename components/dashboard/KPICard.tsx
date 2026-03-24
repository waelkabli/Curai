'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: string;
  loading?: boolean;
  prefix?: string;
  suffix?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  loading = false,
  prefix = '',
  suffix = '',
}: KPICardProps) {
  const colorMap: Record<string, string> = {
    blue: 'from-cura-blue to-blue-700',
    navy: 'from-cura-navy to-blue-900',
    coral: 'from-cura-coral to-red-600',
    teal: 'from-teal-500 to-teal-700',
    green: 'from-green-500 to-green-700',
    purple: 'from-purple-500 to-purple-700',
  };

  const gradientClass = colorMap[color] || colorMap.blue;

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="text-sm font-medium text-gray-500 leading-tight">{title}</div>
        {icon && (
          <div className={cn(
            'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-lg',
            gradientClass
          )}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <div className="text-2xl font-bold text-cura-navy">
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : value}{suffix}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        {subtitle && (
          <div className="text-xs text-gray-400">{subtitle}</div>
        )}
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'
          )}>
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className={cn(
        'mt-3 h-1 rounded-full bg-gradient-to-r opacity-40',
        gradientClass
      )} />
    </div>
  );
}
