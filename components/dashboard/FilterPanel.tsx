'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { FilterState } from '@/types';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: FilterState;
  filterOptions: {
    organizations: string[];
    currencies: string[];
    businessLines: string[];
    revenueSources: string[];
  };
  onFilterChange: (filters: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
}

const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
const QUARTERS = ['1', '2', '3', '4'];
const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const DISPENSE_OPTIONS = ['All', 'Dispensed', 'Not Dispensed'];

interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
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
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
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
  const [expanded, setExpanded] = useState(false);
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
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
          {/* Date filters */}
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date Period</div>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                label="Year"
                value={filters.year || ''}
                options={YEARS.map((y) => ({ value: y, label: y }))}
                onChange={(v) => onFilterChange({ ...filters, year: v })}
              />
              <FilterSelect
                label="Quarter"
                value={filters.quarter || ''}
                options={QUARTERS.map((q) => ({ value: q, label: `Q${q}` }))}
                onChange={(v) => onFilterChange({ ...filters, quarter: v })}
              />
              <FilterSelect
                label="Month"
                value={filters.month || ''}
                options={MONTHS}
                onChange={(v) => onFilterChange({ ...filters, month: v })}
              />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={filters.day || ''}
                  onChange={(e) => onFilterChange({ ...filters, day: e.target.value })}
                  placeholder="Any day"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
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
                options={filterOptions.businessLines.map((bl) => ({ value: bl, label: bl }))}
                onChange={(v) => onFilterChange({ ...filters, businessLine: v })}
              />
              <FilterSelect
                label="Organization"
                value={filters.organization || ''}
                options={filterOptions.organizations.map((o) => ({ value: o, label: o }))}
                onChange={(v) => onFilterChange({ ...filters, organization: v })}
              />
              <FilterSelect
                label="Revenue Source"
                value={filters.revenueSource || ''}
                options={filterOptions.revenueSources.map((r) => ({ value: r, label: r }))}
                onChange={(v) => onFilterChange({ ...filters, revenueSource: v })}
              />
              <FilterSelect
                label="Currency"
                value={filters.currency || ''}
                options={filterOptions.currencies.map((c) => ({ value: c, label: c }))}
                onChange={(v) => onFilterChange({ ...filters, currency: v })}
              />
              <FilterSelect
                label="Dispense Amount"
                value={filters.dispenseAmount || ''}
                options={DISPENSE_OPTIONS.map((d) => ({ value: d, label: d }))}
                onChange={(v) => onFilterChange({ ...filters, dispenseAmount: v })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onApply}
              className="flex-1 bg-cura-blue text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={onReset}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
