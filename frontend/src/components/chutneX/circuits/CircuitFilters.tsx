/**
 * CircuitFilters - Filter Controls for Circuit List
 * ==================================================
 * Pure UI component - receives filter state via props
 */
import React from 'react';
import { Search, X } from 'lucide-react';

const NEON = '#88CED0';

interface CircuitFiltersProps {
  searchQuery: string;
  statusFilter: string;
  purposeFilter: string;
  availableStatuses: string[];
  availablePurposes: string[];
  onSearchChange: (query: string) => void;
  onStatusChange: (status: string) => void;
  onPurposeChange: (purpose: string) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  BUILT: 'Built',
  LAUNCHED: 'Launched',
  EXTENDED: 'Extended',
  FAILED: 'Failed',
  CLOSED: 'Closed',
};

const PURPOSE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  HS_CLIENT_INTRO: 'HS Intro',
  HS_CLIENT_REND: 'HS Rend',
  HS_SERVICE_INTRO: 'Svc Intro',
  HS_SERVICE_REND: 'Svc Rend',
  TESTING: 'Test',
  CONTROLLER: 'Ctrl',
  CONFLUX_LINKED: 'Conflux',
  HS_VANGUARDS: 'Vanguard',
};

export const CircuitFilters: React.FC<CircuitFiltersProps> = ({
  searchQuery,
  statusFilter,
  purposeFilter,
  availableStatuses,
  availablePurposes,
  onSearchChange,
  onStatusChange,
  onPurposeChange,
  onClearFilters,
  totalCount,
  filteredCount,
}) => {
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || purposeFilter !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-4 bg-gray-800/30 rounded-lg border border-gray-700/50 px-4 py-3">
      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
        <Search size={14} style={{ color: NEON }} />
        <input
          type="text"
          placeholder="Search circuits..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-transparent text-sm text-white border-none outline-none w-full placeholder-gray-500"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className="p-0.5 hover:bg-gray-700 rounded">
            <X size={12} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white cursor-pointer outline-none focus:border-[#88CED0]/50"
        >
          <option value="all">All</option>
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status] || status}
            </option>
          ))}
        </select>
      </div>

      {/* Purpose Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Purpose:</span>
        <select
          value={purposeFilter}
          onChange={(e) => onPurposeChange(e.target.value)}
          className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white cursor-pointer outline-none focus:border-[#88CED0]/50"
        >
          <option value="all">All</option>
          {availablePurposes.map((purpose) => (
            <option key={purpose} value={purpose}>
              {PURPOSE_LABELS[purpose] || purpose}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-700/50"
          style={{ color: NEON }}
        >
          <X size={12} />
          Clear
        </button>
      )}

      {/* Count */}
      <div className="ml-auto text-sm text-gray-400">
        Showing <span style={{ color: NEON }}>{filteredCount}</span> of {totalCount}
      </div>
    </div>
  );
};

export default CircuitFilters;
