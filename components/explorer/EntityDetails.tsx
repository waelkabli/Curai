'use client';

import { SchemaTable } from '@/types';
import { Key, Link2, Hash, Type, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EntityDetailsProps {
  table: SchemaTable | null;
  onRelatedClick: (tableName: string) => void;
  sampleData?: Record<string, unknown>[] | null;
  loadingSample?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  int: 'text-blue-600 bg-blue-50',
  bigint: 'text-blue-600 bg-blue-50',
  varchar: 'text-green-600 bg-green-50',
  text: 'text-green-600 bg-green-50',
  datetime: 'text-purple-600 bg-purple-50',
  date: 'text-purple-600 bg-purple-50',
  timestamp: 'text-purple-600 bg-purple-50',
  decimal: 'text-amber-600 bg-amber-50',
  float: 'text-amber-600 bg-amber-50',
  double: 'text-amber-600 bg-amber-50',
  tinyint: 'text-rose-600 bg-rose-50',
  boolean: 'text-rose-600 bg-rose-50',
};

function getTypeColor(type: string) {
  const baseType = type.toLowerCase().split('(')[0];
  return TYPE_COLORS[baseType] || 'text-gray-600 bg-gray-100';
}

export default function EntityDetails({
  table,
  onRelatedClick,
  sampleData,
  loadingSample,
}: EntityDetailsProps) {
  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Hash className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-gray-500 font-medium mb-1">No table selected</h3>
        <p className="text-gray-400 text-sm">
          Select a table from the list to view its details
        </p>
      </div>
    );
  }

  const primaryKeys = table.columns.filter((c) => c.key === 'PRI');
  const foreignKeyColumns = table.foreignKeys.map((fk) => fk.columnName);
  const relatedTables = [...new Set(table.foreignKeys.map((fk) => fk.referencedTable))];

  return (
    <div className="overflow-y-auto h-full">
      {/* Table header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cura-blue to-cura-navy rounded-lg flex items-center justify-center">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-cura-navy text-lg">{table.name}</h2>
            <p className="text-xs text-gray-500">
              {table.columns.length} columns · {table.foreignKeys.length} foreign keys · {relatedTables.length} relations
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Columns */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Type className="w-4 h-4 text-cura-blue" />
            Columns
          </h3>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Column</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Nullable</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {table.columns.map((col) => (
                  <tr
                    key={col.name}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      col.key === 'PRI' ? 'bg-amber-50/50' : ''
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {col.key === 'PRI' && <Key className="w-3 h-3 text-amber-500" />}
                        {foreignKeyColumns.includes(col.name) && <Link2 className="w-3 h-3 text-blue-500" />}
                        <span className={cn(
                          'font-medium',
                          col.key === 'PRI' ? 'text-amber-700' : 'text-gray-700'
                        )}>
                          {col.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-mono font-medium',
                        getTypeColor(col.type)
                      )}>
                        {col.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'text-xs',
                        col.nullable ? 'text-gray-400' : 'text-gray-600 font-medium'
                      )}>
                        {col.nullable ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {col.key && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-medium',
                          col.key === 'PRI' ? 'bg-amber-100 text-amber-700' :
                          col.key === 'MUL' ? 'bg-blue-100 text-blue-700' :
                          col.key === 'UNI' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {col.key}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Foreign Keys */}
        {table.foreignKeys.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-cura-blue" />
              Foreign Keys
            </h3>
            <div className="space-y-2">
              {table.foreignKeys.map((fk, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-xs">
                  <span className="font-medium text-blue-700">{fk.columnName}</span>
                  <ChevronRight className="w-3 h-3 text-blue-400" />
                  <button
                    onClick={() => onRelatedClick(fk.referencedTable)}
                    className="font-medium text-cura-blue hover:underline"
                  >
                    {fk.referencedTable}
                  </button>
                  <span className="text-blue-400">.</span>
                  <span className="text-blue-600">{fk.referencedColumn}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Tables */}
        {relatedTables.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Related Tables</h3>
            <div className="flex flex-wrap gap-2">
              {relatedTables.map((t) => (
                <button
                  key={t}
                  onClick={() => onRelatedClick(t)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-cura-blue hover:text-white text-gray-600 text-xs rounded-lg transition-colors font-medium"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sample Data */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sample Data (5 rows)</h3>
          {loadingSample ? (
            <div className="h-24 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
              <span className="text-gray-400 text-xs">Loading sample data...</span>
            </div>
          ) : sampleData && sampleData.length > 0 ? (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(sampleData[0]).slice(0, 6).map((key) => (
                        <th key={key} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sampleData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).slice(0, 6).map((val, j) => (
                          <td key={j} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                            {val === null ? (
                              <span className="text-gray-300 italic">null</span>
                            ) : String(val).length > 30 ? (
                              String(val).slice(0, 30) + '...'
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-6 bg-gray-50 rounded-xl text-center">
              <p className="text-gray-400 text-xs">
                No sample data available. Connect to database to preview.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
