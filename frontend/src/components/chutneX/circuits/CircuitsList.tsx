/**
 * CircuitsList - All Circuits Display
 */
import React, { useState, useMemo } from 'react';
import { Circuit, CircuitPurpose } from '../types';
import { CircuitCard } from './CircuitCard';
import { CircuitStats } from './CircuitStats';
import { CircuitFilters } from './CircuitFilters';
import { GitBranch, List, Grid, BarChart2 } from 'lucide-react';

interface CircuitsListProps {
  circuits: Circuit[];
  stats: {
    total_circuits: number;
    built_circuits: number;
    by_status: Record<string, number>;
    by_purpose: Record<string, number>;
  };
  onCircuitClick?: (circuit: Circuit) => void;
}

export const CircuitsList: React.FC<CircuitsListProps> = ({
  circuits,
  stats,
  onCircuitClick,
}) => {
  const [view, setView] = useState<'list' | 'grid' | 'stats'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPurpose, setFilterPurpose] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'id' | 'status' | 'purpose' | 'path_length'>('id');

  // Filter circuits
  const filteredCircuits = useMemo(() => {
    return circuits.filter(c => {
      if (filterStatus !== 'all' && !c.status.includes(filterStatus)) return false;
      if (filterPurpose !== 'all' && c.purpose !== filterPurpose) return false;
      return true;
    });
  }, [circuits, filterStatus, filterPurpose]);

  // Sort circuits
  const sortedCircuits = useMemo(() => {
    return [...filteredCircuits].sort((a, b) => {
      switch (sortBy) {
        case 'id':
          return parseInt(a.circuit_id) - parseInt(b.circuit_id);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'purpose':
          return a.purpose.localeCompare(b.purpose);
        case 'path_length':
          return b.path_length - a.path_length;
        default:
          return 0;
      }
    });
  }, [filteredCircuits, sortBy]);

  // Get unique values for filters
  const statuses = useMemo(() => 
    [...new Set(circuits.map(c => c.status.replace('CircStatus.', '')))],
    [circuits]
  );
  const purposes = useMemo(() => 
    [...new Set(circuits.map(c => c.purpose))],
    [circuits]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center gap-3">
          <GitBranch className="text-[#88CED0]" size={24} />
          <div>
            <h3 className="font-medium text-white">Circuits</h3>
            <p className="text-sm text-gray-400">
              {stats.built_circuits} built / {stats.total_circuits} total
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded ${view === 'list' ? 'bg-[#88CED0] text-gray-900' : 'text-gray-400 hover:text-white'}`}
            title="List View"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded ${view === 'grid' ? 'bg-[#88CED0] text-gray-900' : 'text-gray-400 hover:text-white'}`}
            title="Grid View"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setView('stats')}
            className={`p-2 rounded ${view === 'stats' ? 'bg-[#88CED0] text-gray-900' : 'text-gray-400 hover:text-white'}`}
            title="Statistics"
          >
            <BarChart2 size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <CircuitFilters
        statuses={statuses}
        purposes={purposes}
        filterStatus={filterStatus}
        filterPurpose={filterPurpose}
        sortBy={sortBy}
        onStatusChange={setFilterStatus}
        onPurposeChange={setFilterPurpose}
        onSortChange={setSortBy}
        totalCount={circuits.length}
        filteredCount={filteredCircuits.length}
      />

      {/* Content */}
      {view === 'stats' ? (
        <CircuitStats stats={stats} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCircuits.map(circuit => (
            <CircuitCard
              key={`${circuit.circuit_id}-${circuit.source_node}`}
              circuit={circuit}
              variant="card"
              onClick={() => onCircuitClick?.(circuit)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedCircuits.map(circuit => (
            <CircuitCard
              key={`${circuit.circuit_id}-${circuit.source_node}`}
              circuit={circuit}
              variant="row"
              onClick={() => onCircuitClick?.(circuit)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedCircuits.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <GitBranch size={48} className="mx-auto mb-4 opacity-50" />
          <p>No circuits match the current filters.</p>
        </div>
      )}
    </div>
  );
};

export default CircuitsList;
