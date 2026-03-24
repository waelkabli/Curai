'use client';

import { BusinessLineRow } from '@/types';
import { getColorForBusinessLine } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface BusinessLineTableProps {
  data: BusinessLineRow[];
  loading?: boolean;
}

export default function BusinessLineTable({ data, loading }: BusinessLineTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="flex-1 h-8 bg-gray-200 rounded" />
            <div className="w-24 h-8 bg-gray-200 rounded" />
            <div className="w-16 h-8 bg-gray-200 rounded" />
            <div className="w-20 h-8 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400 text-sm">No business line data available</p>
      </div>
    );
  }

  const maxSales = Math.max(...data.map((d) => d.sales));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
              Business Line
            </th>
            <th className="text-right py-3 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
              Sales (SAR)
            </th>
            <th className="text-right py-3 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
              Orders
            </th>
            <th className="text-right py-3 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
              Customers
            </th>
            <th className="text-left py-3 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider w-32">
              Share
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row, idx) => {
            const color = getColorForBusinessLine(row.businessLine);
            const sharePercent = maxSales > 0 ? (row.sales / maxSales) * 100 : 0;
            return (
              <tr
                key={row.businessLine}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-gray-700">{row.businessLine}</span>
                    {idx === 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">
                        Top
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-semibold text-cura-navy">
                  {row.sales.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right text-gray-600">
                  {row.orders.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right text-gray-600">
                  {row.customers.toLocaleString()}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${sharePercent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">
                      {sharePercent.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td className="py-3 px-3 font-semibold text-gray-700">Total</td>
            <td className="py-3 px-3 text-right font-bold text-cura-navy">
              {data.reduce((s, r) => s + r.sales, 0).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="py-3 px-3 text-right font-semibold text-gray-700">
              {data.reduce((s, r) => s + r.orders, 0).toLocaleString()}
            </td>
            <td className="py-3 px-3 text-right font-semibold text-gray-700">
              {data.reduce((s, r) => s + r.customers, 0).toLocaleString()}
            </td>
            <td className="py-3 px-3">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <TrendingUp className="w-3 h-3" />
                <span>100%</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
