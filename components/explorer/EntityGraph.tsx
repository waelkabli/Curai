'use client';

import { useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { SchemaData } from '@/types';

interface EntityGraphProps {
  schema: SchemaData;
  selectedTable?: string;
  onTableSelect: (tableName: string) => void;
}

const TABLE_NODE_STYLE = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '2px solid #e2e8f0',
  background: '#ffffff',
  fontSize: '12px',
  fontWeight: 600,
  color: '#0D2137',
  minWidth: 120,
  textAlign: 'center' as const,
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const SELECTED_NODE_STYLE = {
  ...TABLE_NODE_STYLE,
  background: '#1565C0',
  color: '#ffffff',
  border: '2px solid #1565C0',
  boxShadow: '0 4px 12px rgba(21,101,192,0.3)',
};

function buildGraph(schema: SchemaData, selectedTable?: string) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Layout: simple grid with some spacing
  const tablesWithRelations = new Set<string>();
  for (const rel of schema.relationships) {
    tablesWithRelations.add(rel.from);
    tablesWithRelations.add(rel.to);
  }

  // Show all tables if few, otherwise only related
  const tablesToShow = schema.tables.length <= 30
    ? schema.tables.map((t) => t.name)
    : selectedTable
    ? [
        selectedTable,
        ...schema.tables
          .find((t) => t.name === selectedTable)
          ?.foreignKeys.map((fk) => fk.referencedTable) || [],
      ]
    : [...tablesWithRelations].slice(0, 20);

  const cols = Math.ceil(Math.sqrt(tablesToShow.length));

  tablesToShow.forEach((tableName, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const isSelected = tableName === selectedTable;

    nodes.push({
      id: tableName,
      position: { x: col * 180, y: row * 100 },
      data: { label: tableName },
      style: isSelected ? SELECTED_NODE_STYLE : TABLE_NODE_STYLE,
    });
  });

  const shownTableSet = new Set(tablesToShow);
  const edgeSet = new Set<string>();

  for (const rel of schema.relationships) {
    if (shownTableSet.has(rel.from) && shownTableSet.has(rel.to)) {
      const edgeId = `${rel.from}-${rel.to}-${rel.fromColumn}`;
      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        edges.push({
          id: edgeId,
          source: rel.from,
          target: rel.to,
          label: rel.fromColumn,
          labelStyle: { fontSize: 9, fill: '#6b7280' },
          style: { stroke: '#42A5F5', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#42A5F5' },
          animated: rel.from === selectedTable || rel.to === selectedTable,
        });
      }
    }
  }

  return { nodes, edges };
}

export default function EntityGraph({ schema, selectedTable, onTableSelect }: EntityGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(schema, selectedTable),
    [schema, selectedTable]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildGraph(schema, selectedTable);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [schema, selectedTable, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onTableSelect(node.id);
    },
    [onTableSelect]
  );

  if (!schema || schema.tables.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl">
        <p className="text-gray-400 text-sm">Discover schema to view entity relationships</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
        <MiniMap
          nodeStrokeColor="#1565C0"
          nodeColor={(node) => node.id === selectedTable ? '#1565C0' : '#ffffff'}
          maskColor="rgba(240, 244, 248, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
