'use client';

import { Filter, X, ChevronDown, CalendarDays } from 'lucide-react';
import { FilterState } from '@/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface FilterPanelProps {
  filters: FilterState;
  filterOptions: {
    organizations: unknown[];
    currencies: unknown[];
    businessLines: unknown[];
    revenueSources?: unknown[];
  };
  onFilterChange: (filters: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
}

// Quick-range presets
const PRESETS: { label: string; getDates: () => { dateFrom: string; dateTo: string } }[] = [
  {
    label: 'Last 30 days',
    getDates: () => {
      const to   = new Date();
      const from = new Date(); from.setDate(from.getDate() - 30);
      return { dateFrom: fmt(from), dateTo: fmt(to) };
    },
  },
  {
    label: 'Last 3 months',
    getDates: () => {
      const to   = new Date();
      const from = new Date(); from.setMonth(from.getMonth() - 3); from.setDate(1);
      return { dateFrom: fmt(from), dateTo: fmt(to) };
    },
  },
  {
    label: 'Last 6 months',
    getDates: () => {
      const to   = new Date();
      const from = new Date(); from.setMonth(from.getMonth() - 6); from.setDate(1);
      return { dateFrom: fmt(from), dateTo: fmt(to) };
    },
  },
  {
    label: 'This year',
    getDates: () => {
      const to   = new Date();
      const from = new Date(to.getFullYear(), 0, 1);
      return { dateFrom: fmt(from), dateTo: fmt(to) };
    },
  },
  {
    label: 'Last year',
    getDates: () => {
      const y    = new Date().getFullYear() - 1;
      return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
    },
  },
];

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}
function FilterSelect({ label, value, options, onChange }: SelectProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
        >
          <option value="">All</option>
          {options.map((o) => (
            <option key={String(o)} value={String(o)}>{String(o)}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

export default function FilterPanel({
  filters,
  filterOptions,
  onFilterChange,
  onApply,
  onReset,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(true);   // open by default

  const activeCount = [filters.dateFrom, filters.dateTo, filters.businessLine,
    filters.organization, filters.currency].filter(Boolean).length;

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const dates = preset.getDates();
    onFilterChange({ ...filters, ...dates });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cura-blue" />
          <span className="font-semibold text-gray-700 text-sm">Filters</span>
          {activeCount > 0 && (
            <span className="bg-cura-blue text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform',
          expanded ? 'rotate-180' : ''
        )} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">

          {/* Date range */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Range</span>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-1 mb-3">
              {PRESETS.map((p) => {
                const dates   = p.getDates();
                const active  = filters.dateFrom === dates.dateFrom && filters.dateTo === dates.dateTo;
                return (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium transition-all border',
                      active
                        ? 'bg-cura-blue text-white border-cura-blue'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-cura-blue hover:text-cura-blue'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Manual date inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
                />
              </div>
            </div>
          </div>

          {/* Business filters */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Business</div>
            <div className="space-y-2">
              <FilterSelect
                label="Business Line"
                value={filters.businessLine || ''}
                options={filterOptions.businessLines as string[]}
                onChange={(v) => onFilterChange({ ...filters, businessLine: v })}
              />
              <FilterSelect
                label="Organization"
                value={filters.organization || ''}
                options={filterOptions.organizations as string[]}
                onChange={(v) => onFilterChange({ ...filters, organization: v })}
              />
              <FilterSelect
                label="Currency"
                value={filters.currency || ''}
                options={filterOptions.currencies as string[]}
                onChange={(v) => onFilterChange({ ...filters, currency: v })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onApply}
              className="flex-1 bg-cura-blue text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={onReset}
              title="Reset filters"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
