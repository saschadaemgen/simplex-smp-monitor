/**
 * NodeGrid - Grid Display of All Nodes
 */
import React, { useState } from 'react';
import { NodeStats, NodeType } from '../types';
import { NodeDetailCard } from './NodeDetailCard';
import { Grid, List, Filter } from 'lucide-react';

interface NodeGridProps {
  nodes: NodeStats[];
  layout?: 'grid' | 'list';
  onNodeClick?: (node: NodeStats) => void;
}

const nodeTypeOrder: NodeType[] = ['da', 'guard', 'middle', 'exit', 'client', 'hs'];

export const NodeGrid: React.FC<NodeGridProps> = ({ 
  nodes, 
  layout: initialLayout = 'grid',
  onNodeClick 
}) => {
  const [layout, setLayout] = useState<'grid' | 'list'>(initialLayout);
  const [filterType, setFilterType] = useState<NodeType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'bandwidth' | 'uptime'>('type');

  // Group nodes by type
  const groupedNodes = nodeTypeOrder.reduce((acc, type) => {
    acc[type] = nodes.filter(n => n.node_type === type);
    return acc;
  }, {} as Record<NodeType, NodeStats[]>);

  // Filter nodes
  const filteredNodes = filterType === 'all' 
    ? nodes 
    : nodes.filter(n => n.node_type === filterType);

  // Sort nodes
  const sortedNodes = [...filteredNodes].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.node_name.localeCompare(b.node_name);
      case 'type':
        return nodeTypeOrder.indexOf(a.node_type as NodeType) - nodeTypeOrder.indexOf(b.node_type as NodeType);
      case 'bandwidth':
        return (b.bytes_read + b.bytes_written) - (a.bytes_read + a.bytes_written);
      case 'uptime':
        return b.uptime - a.uptime;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NodeType | 'all')}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="all">All Types ({nodes.length})</option>
            {nodeTypeOrder.map(type => (
              <option key={type} value={type}>
                {type.toUpperCase()} ({groupedNodes[type]?.length || 0})
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="type">Sort by Type</option>
            <option value="name">Sort by Name</option>
            <option value="bandwidth">Sort by Bandwidth</option>
            <option value="uptime">Sort by Uptime</option>
          </select>
        </div>

        {/* Layout Toggle */}
        <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setLayout('grid')}
            className={`p-1.5 rounded ${layout === 'grid' ? 'bg-[#88CED0] text-gray-900' : 'text-gray-400 hover:text-white'}`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setLayout('list')}
            className={`p-1.5 rounded ${layout === 'list' ? 'bg-[#88CED0] text-gray-900' : 'text-gray-400 hover:text-white'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap gap-2">
        {nodeTypeOrder.map(type => {
          const count = groupedNodes[type]?.length || 0;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === type
                  ? 'bg-[#88CED0] text-gray-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {type.toUpperCase()}: {count}
            </button>
          );
        })}
      </div>

      {/* Node Display */}
      {layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedNodes.map(node => (
            <NodeDetailCard
              key={node.node_id}
              node={node}
              variant="card"
              onClick={() => onNodeClick?.(node)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedNodes.map(node => (
            <NodeDetailCard
              key={node.node_id}
              node={node}
              variant="row"
              onClick={() => onNodeClick?.(node)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedNodes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No nodes found matching the current filter.
        </div>
      )}
    </div>
  );
};

export default NodeGrid;
