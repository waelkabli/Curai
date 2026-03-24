'use client';

import { useState, useCallback } from 'react';
import { Search, Loader2, Database, RefreshCw, AlertCircle, WifiOff } from 'lucide-react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import EntityDetails from '@/components/explorer/EntityDetails';
import { SchemaData, SchemaTable } from '@/types';
import { getSettings } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Lazy load ReactFlow-based component to avoid SSR issues
const EntityGraph = dynamic(() => import('@/components/explorer/EntityGraph'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl">
      <Loader2 className="w-8 h-8 text-cura-blue animate-spin" />
    </div>
  ),
});

export default function ExplorerPage() {
  const [schema, setSchema] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<SchemaTable | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, unknown>[] | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'graph'>('details');

  const discoverSchema = useCallback(async () => {
    const settings = getSettings();
    const dbConfig = settings?.db;

    if (!dbConfig?.host || !dbConfig?.database) {
      setError('Database not configured. Please go to Settings to configure your database connection.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/schema', { dbConfig });
      const discoveredSchema = response.data.schema as SchemaData;
      setSchema(discoveredSchema);

      // Cache schema for AI chat
      localStorage.setItem('curadb-schema', JSON.stringify(discoveredSchema));
    } catch (err) {
      let message = 'Failed to discover schema.';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error || err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSampleData = useCallback(async (tableName: string) => {
    const settings = getSettings();
    const dbConfig = settings?.db;
    if (!dbConfig?.host) return;

    setLoadingSample(true);
    try {
      const response = await axios.post('/api/db', {
        dbConfig,
        query: `SELECT * FROM \`${tableName}\` LIMIT 5`,
      });
      setSampleData(response.data.rows || []);
    } catch {
      setSampleData(null);
    } finally {
      setLoadingSample(false);
    }
  }, []);

  const handleTableSelect = useCallback((tableName: string) => {
    if (!schema) return;
    const table = schema.tables.find((t) => t.name === tableName);
    if (table) {
      setSelectedTable(table);
      setSampleData(null);
      loadSampleData(tableName);
    }
  }, [schema, loadSampleData]);

  const filteredTables = schema?.tables.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left panel - Table list */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-cura-navy text-sm">Tables</h2>
            <button
              onClick={discoverSchema}
              disabled={loading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                'bg-cura-blue text-white hover:bg-blue-700 disabled:opacity-50'
              )}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {loading ? 'Scanning...' : 'Discover'}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tables..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cura-blue/30 focus:border-cura-blue"
            />
          </div>
        </div>

        {/* Stats */}
        {schema && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-3 text-xs text-blue-600">
              <span>{schema.tables.length} tables</span>
              <span>·</span>
              <span>{schema.relationships.length} relations</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-3 mt-3 p-3 bg-red-50 rounded-lg">
            <div className="flex items-start gap-2">
              {error.includes('configured') ? (
                <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-xs text-red-600">{error}</p>
            </div>
            {error.includes('configured') && (
              <a href="/settings" className="text-xs text-cura-blue font-medium underline mt-1.5 block">
                Configure database →
              </a>
            )}
          </div>
        )}

        {/* Table list */}
        <div className="flex-1 overflow-y-auto py-2">
          {!schema && !loading && !error && (
            <div className="text-center py-8 px-4">
              <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Click "Discover" to scan your database schema</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 text-cura-blue animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Scanning database...</p>
            </div>
          )}

          {filteredTables.map((table) => (
            <button
              key={table.name}
              onClick={() => handleTableSelect(table.name)}
              className={cn(
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left',
                selectedTable?.name === table.name
                  ? 'bg-blue-50 text-cura-blue font-medium border-r-2 border-cura-blue'
                  : 'text-gray-700'
              )}
            >
              <Database className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
              <span className="truncate">{table.name}</span>
              <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                {table.columns.length}
              </span>
            </button>
          ))}

          {schema && filteredTables.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No tables match your search</p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        {selectedTable && (
          <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('details')}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'details'
                  ? 'border-cura-blue text-cura-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Entity Details
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'graph'
                  ? 'border-cura-blue text-cura-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Relationship Graph
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'details' || !schema ? (
            <EntityDetails
              table={selectedTable}
              onRelatedClick={handleTableSelect}
              sampleData={sampleData}
              loadingSample={loadingSample}
            />
          ) : (
            <div className="h-full p-4">
              {schema && (
                <EntityGraph
                  schema={schema}
                  selectedTable={selectedTable?.name}
                  onTableSelect={handleTableSelect}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
