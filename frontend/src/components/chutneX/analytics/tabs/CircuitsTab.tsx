/**
 * CircuitsTab - Circuit Visualization & History
 * ==============================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Shows:
 * - Live circuit list with status
 * - Circuit path visualization (Guard → Middle → Exit)
 * - Circuit history and events
 * - Build time analytics
 */
import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  ArrowRight,
  Clock,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Zap,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CircuitData, TorEvent } from '../../../../hooks/useTorWebSocket';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';

// Circuit status colors
const STATUS_COLORS: Record<string, string> = {
  LAUNCHED: '#fbbf24',    // Yellow - building
  BUILT: '#4ade80',       // Green - success
  EXTENDED: NEON,         // Neon - extending
  FAILED: '#f87171',      // Red - failed
  CLOSED: '#64748b',      // Gray - closed
};

// Circuit purpose labels
const PURPOSE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  HS_CLIENT_INTRO: 'HS Client Intro',
  HS_CLIENT_REND: 'HS Client Rendezvous',
  HS_SERVICE_INTRO: 'HS Service Intro',
  HS_SERVICE_REND: 'HS Service Rendezvous',
  TESTING: 'Testing',
  CONTROLLER: 'Controller',
};

interface CircuitsTabProps {
  circuits: CircuitData[];
  circuitEvents: TorEvent[];
  isLive: boolean;
}

export const CircuitsTab: React.FC<CircuitsTabProps> = ({
  circuits,
  circuitEvents,
  isLive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedCircuit, setExpandedCircuit] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  // Filter circuits
  const filteredCircuits = useMemo(() => {
    return circuits.filter(circuit => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          circuit.circuit_id.toLowerCase().includes(query) ||
          circuit.path.some(p => 
            p.nickname.toLowerCase().includes(query) ||
            p.fingerprint.toLowerCase().includes(query)
          );
        if (!matchesSearch) return false;
      }
      
      if (statusFilter && circuit.status !== statusFilter) return false;
      
      return true;
    });
  }, [circuits, searchQuery, statusFilter]);

  // Circuit stats
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    circuits.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });
    
    return {
      total: circuits.length,
      built: byStatus['BUILT'] || 0,
      failed: byStatus['FAILED'] || 0,
      building: (byStatus['LAUNCHED'] || 0) + (byStatus['EXTENDED'] || 0),
      byStatus,
    };
  }, [circuits]);

  // Build time distribution (from events)
  const buildTimeData = useMemo(() => {
    const buildTimes: number[] = [];
    circuitEvents
      .filter(e => e.event_type === 'circuit' && e.data.status === 'BUILT')
      .forEach(e => {
        // If we have build time data
        if (e.data.build_time_ms) {
          buildTimes.push(e.data.build_time_ms);
        }
      });
    
    // Create histogram buckets
    const buckets = [
      { range: '0-100ms', min: 0, max: 100, count: 0 },
      { range: '100-250ms', min: 100, max: 250, count: 0 },
      { range: '250-500ms', min: 250, max: 500, count: 0 },
      { range: '500ms-1s', min: 500, max: 1000, count: 0 },
      { range: '>1s', min: 1000, max: Infinity, count: 0 },
    ];
    
    buildTimes.forEach(t => {
      const bucket = buckets.find(b => t >= b.min && t < b.max);
      if (bucket) bucket.count++;
    });
    
    return buckets;
  }, [circuitEvents]);

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Circuits"
          value={stats.total}
          icon={GitBranch}
        />
        <StatCard
          label="Built"
          value={stats.built}
          icon={CheckCircle2}
          color="#4ade80"
        />
        <StatCard
          label="Building"
          value={stats.building}
          icon={Loader2}
          color={NEON}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
          color="#f87171"
        />
      </div>

      {/* Build Time Chart */}
      {buildTimeData.some(b => b.count > 0) && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp size={14} style={{ color: NEON }} />
            Circuit Build Time Distribution
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buildTimeData}>
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: `1px solid ${NEON}33`,
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill={NEON}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search circuits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg
                      text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#88CED0]/50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <div className="flex gap-1">
            {['BUILT', 'LAUNCHED', 'FAILED', 'CLOSED'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  statusFilter === status
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                style={statusFilter === status ? {
                  backgroundColor: `${STATUS_COLORS[status]}33`,
                  color: STATUS_COLORS[status],
                } : undefined}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-xs rounded ${
              viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-xs rounded ${
              viewMode === 'timeline' ? 'bg-gray-700 text-white' : 'text-gray-400'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Circuit List */}
      <div className="space-y-2">
        {filteredCircuits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {circuits.length === 0 ? 'No circuits yet' : 'No circuits match your filters'}
          </div>
        ) : (
          filteredCircuits.map(circuit => (
            <CircuitRow
              key={circuit.circuit_id}
              circuit={circuit}
              isExpanded={expandedCircuit === circuit.circuit_id}
              onToggle={() => setExpandedCircuit(
                expandedCircuit === circuit.circuit_id ? null : circuit.circuit_id
              )}
            />
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color = NEON }) => (
  <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} style={{ color }} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

interface CircuitRowProps {
  circuit: CircuitData;
  isExpanded: boolean;
  onToggle: () => void;
}

const CircuitRow: React.FC<CircuitRowProps> = ({ circuit, isExpanded, onToggle }) => {
  const statusColor = STATUS_COLORS[circuit.status] || '#64748b';
  
  const getStatusIcon = () => {
    switch (circuit.status) {
      case 'BUILT':
        return <CheckCircle2 size={14} />;
      case 'FAILED':
        return <XCircle size={14} />;
      case 'LAUNCHED':
      case 'EXTENDED':
        return <Loader2 size={14} className="animate-spin" />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  return (
    <div 
      className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden
                hover:border-gray-600/50 transition-colors"
    >
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 text-left"
      >
        {/* Expand icon */}
        <span className="text-gray-400">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Status */}
        <span style={{ color: statusColor }}>
          {getStatusIcon()}
        </span>

        {/* Circuit ID */}
        <span className="font-mono text-sm text-white w-20">
          #{circuit.circuit_id}
        </span>

        {/* Path Preview */}
        <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
          {circuit.path.length > 0 ? (
            <CircuitPathPreview path={circuit.path} />
          ) : (
            <span className="text-gray-500 text-sm">No path</span>
          )}
        </div>

        {/* Purpose */}
        {circuit.purpose && (
          <span 
            className="text-xs px-2 py-0.5 rounded hidden sm:inline"
            style={{ backgroundColor: NEON_DIM, color: NEON }}
          >
            {PURPOSE_LABELS[circuit.purpose] || circuit.purpose}
          </span>
        )}

        {/* Path length */}
        <span className="text-xs text-gray-400">
          {circuit.path_length} hops
        </span>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50 pt-4">
          {/* Full Path Visualization */}
          <div className="mb-4">
            <h4 className="text-xs text-gray-400 mb-3">Circuit Path</h4>
            <CircuitPathFull path={circuit.path} status={circuit.status} />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-500">Status</span>
              <p className="text-gray-300" style={{ color: statusColor }}>{circuit.status}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Purpose</span>
              <p className="text-gray-300">{PURPOSE_LABELS[circuit.purpose || ''] || circuit.purpose || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Path Length</span>
              <p className="text-gray-300">{circuit.path_length} hops</p>
            </div>
            {circuit.reason && (
              <div>
                <span className="text-xs text-gray-500">Reason</span>
                <p className="text-red-400">{circuit.reason}</p>
              </div>
            )}
          </div>

          {/* Build Flags */}
          {circuit.build_flags.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">Build Flags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {circuit.build_flags.map(flag => (
                  <span 
                    key={flag}
                    className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-300"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CircuitPathPreviewProps {
  path: Array<{ fingerprint: string; nickname: string }>;
}

const CircuitPathPreview: React.FC<CircuitPathPreviewProps> = ({ path }) => {
  if (path.length === 0) return null;

  // Show max 3 nodes
  const displayPath = path.slice(0, 3);
  const hasMore = path.length > 3;

  return (
    <div className="flex items-center gap-1 text-xs overflow-hidden">
      {displayPath.map((node, index) => (
        <React.Fragment key={node.fingerprint}>
          <span 
            className="px-2 py-0.5 rounded truncate max-w-[80px]"
            style={{ backgroundColor: NEON_DIM }}
            title={`${node.nickname}\n${node.fingerprint}`}
          >
            <span style={{ color: NEON }}>{node.nickname || node.fingerprint.slice(0, 8)}</span>
          </span>
          {index < displayPath.length - 1 && (
            <ArrowRight size={10} className="text-gray-500 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
      {hasMore && (
        <span className="text-gray-500">+{path.length - 3}</span>
      )}
    </div>
  );
};

interface CircuitPathFullProps {
  path: Array<{ fingerprint: string; nickname: string }>;
  status: string;
}

const CircuitPathFull: React.FC<CircuitPathFullProps> = ({ path, status }) => {
  const statusColor = STATUS_COLORS[status] || '#64748b';

  if (path.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-4">
        No path established
      </div>
    );
  }

  const getNodeRole = (index: number) => {
    if (index === 0) return 'Guard';
    if (index === path.length - 1) return 'Exit';
    return 'Middle';
  };

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {/* Client */}
      <div className="text-center">
        <div 
          className="w-12 h-12 rounded-full border-2 flex items-center justify-center mx-auto mb-1"
          style={{ borderColor: NEON, backgroundColor: NEON_DIM }}
        >
          <Zap size={16} style={{ color: NEON }} />
        </div>
        <span className="text-xs text-gray-400">Client</span>
      </div>

      {path.map((node, index) => (
        <React.Fragment key={node.fingerprint}>
          {/* Arrow */}
          <ArrowRight 
            size={20} 
            className="text-gray-600 flex-shrink-0"
            style={status === 'BUILT' ? { color: statusColor } : undefined}
          />

          {/* Node */}
          <div className="text-center">
            <div 
              className="w-12 h-12 rounded-full border-2 flex items-center justify-center mx-auto mb-1 relative"
              style={{ 
                borderColor: status === 'BUILT' ? statusColor : '#64748b',
                backgroundColor: status === 'BUILT' ? `${statusColor}20` : 'transparent',
              }}
            >
              <GitBranch size={16} style={{ color: status === 'BUILT' ? statusColor : '#64748b' }} />
              
              {/* Building indicator */}
              {(status === 'LAUNCHED' || status === 'EXTENDED') && index === path.length - 1 && (
                <div className="absolute -top-1 -right-1">
                  <Loader2 size={12} className="animate-spin" style={{ color: NEON }} />
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400 block">{getNodeRole(index)}</span>
            <span 
              className="text-xs font-mono truncate block max-w-[80px]"
              style={{ color: NEON }}
              title={node.fingerprint}
            >
              {node.nickname || node.fingerprint.slice(0, 8)}
            </span>
          </div>
        </React.Fragment>
      ))}

      {/* Destination (for exit circuits) */}
      {status === 'BUILT' && (
        <>
          <ArrowRight size={20} style={{ color: statusColor }} />
          <div className="text-center">
            <div 
              className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center mx-auto mb-1"
              style={{ borderColor: '#64748b' }}
            >
              <span className="text-gray-500 text-lg">🌐</span>
            </div>
            <span className="text-xs text-gray-400">Internet</span>
          </div>
        </>
      )}
    </div>
  );
};

export default CircuitsTab;