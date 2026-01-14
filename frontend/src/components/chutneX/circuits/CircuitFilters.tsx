/**
 * CircuitFilters - Filter Controls for Circuits
 */
import React from 'react';
import { Filter, SortAsc } from 'lucide-react';

interface CircuitFiltersProps {
  statuses: string[];
  purposes: string[];
  filterStatus: string;
  filterPurpose: string;
  sortBy: string;
  onStatusChange: (status: string) => void;
  onPurposeChange: (purpose: string) => void;
  onSortChange: (sort: string) => void;
  totalCount: number;
  filteredCount: number;
}

export const CircuitFilters: React.FC<CircuitFiltersProps> = ({
  statuses,
  purposes,
  filterStatus,
  filterPurpose,
  sortBy,
  onStatusChange,
  onPurposeChange,
  onSortChange,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
      {/* Filter Icon */}
      <div className="flex items-center gap-2 text-gray-400">
        <Filter size={16} />
        <span className="text-sm">Filters</span>
      </div>

      {/* Status Filter */}
      <select
        value={filterStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-[#88CED0] focus:outline-none"
      >
        <option value="all">All Status</option>
        {statuses.map(status => (
          <option key={status} value={status}>
            {status.replace('CircStatus.', '')}
          </option>
        ))}
      </select>

      {/* Purpose Filter */}
      <select
        value={filterPurpose}
        onChange={(e) => onPurposeChange(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-[#88CED0] focus:outline-none"
      >
        <option value="all">All Purposes</option>
        {purposes.map(purpose => (
          <option key={purpose} value={purpose}>{purpose}</option>
        ))}
      </select>

      {/* Sort */}
      <div className="flex items-center gap-2 ml-auto">
        <SortAsc size={16} className="text-gray-400" />
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-[#88CED0] focus:outline-none"
        >
          <option value="id">Sort by ID</option>
          <option value="status">Sort by Status</option>
          <option value="purpose">Sort by Purpose</option>
          <option value="path_length">Sort by Path Length</option>
        </select>
      </div>

      {/* Count */}
      <div className="text-sm text-gray-400">
        Showing <span className="text-[#88CED0] font-mono">{filteredCount}</span> of{' '}
        <span className="font-mono">{totalCount}</span>
      </div>
    </div>
  );
};

export default CircuitFilters;
