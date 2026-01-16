/**
 * CircuitsTab - Circuit Visualization & History (EXTENDED)
 * =========================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * COMPLETE CircuitEvent Display with ALL fields:
 * - Identification: id, circuit_id, network_id, node_id
 * - Event Details: event_type, status, event_time
 * - Path Info: path, path_length, source_node
 * - Timing: build_time_ms, created_at
 * - Failure Info: reason, remote_reason
 * - Raw Data: raw_event
 * 
 * Features:
 * - Live circuit list with status
 * - Circuit path visualization (Guard → Middle → Exit)
 * - Circuit history and events
 * - Build time analytics
 * - Detailed circuit inspection
 */
import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  ArrowRight,
  Filter,
  Search,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Timer,
  Copy,
  Eye,
  Activity,
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

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';
const DARK_NEON = '#4FA3A5';
const LIGHT_NEON = '#A5DFE1';

// Circuit status colors
const STATUS_COLORS: Record<string, string> = {
  LAUNCHED: '#fbbf24',    // Yellow - building
  BUILT: '#4ade80',       // Green - success
  EXTENDED: NEON,         // Neon - extending
  FAILED: '#f87171',      // Red - failed
  CLOSED: '#64748b',      // Gray - closed
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  LAUNCHED: Loader2,
  BUILT: CheckCircle2,
  EXTENDED: ArrowRight,
  FAILED: XCircle,
  CLOSED: XCircle,
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

// =============================================================================
// TYPES - Using CircuitData from hook + extended event data
// =============================================================================

// Extended data that can come from TorEvent.data
interface CircuitEventExtras {
  build_time_ms?: number;
  created_at?: string;
  remote_reason?: string;
  raw_event?: string;
}

interface CircuitsTabProps {
  circuits: CircuitData[];
  circuitEvents: TorEvent[];
  isLive: boolean;
}

// Helper to get path as string array for display
const getPathStrings = (path: Array<{ fingerprint: string; nickname: string }> | undefined): string[] => {
  if (!path) return [];
  return path.map(p => p.nickname || p.fingerprint.substring(0, 8));
};

// Helper to get path fingerprints
const getPathFingerprints = (path: Array<{ fingerprint: string; nickname: string }> | undefined): string[] => {
  if (!path) return [];
  return path.map(p => p.fingerprint);
};

// =============================================================================
// UTILITIES
// =============================================================================
const formatBuildTime = (ms?: number): string => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatTime = (timestamp?: string): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDateTime = (timestamp?: string): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// Circuit Stats Cards
const CircuitStats: React.FC<{
  circuits: CircuitData[];
  events: TorEvent[];
}> = ({ circuits, events }) => {
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byPurpose: Record<string, number> = {};
    let totalBuildTime = 0;
    let buildTimeCount = 0;
    
    circuits.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.purpose) {
        byPurpose[c.purpose] = (byPurpose[c.purpose] || 0) + 1;
      }
    });
    
    // Calculate average build time from events
    events.forEach(e => {
      if (e.data?.build_time_ms) {
        totalBuildTime += e.data.build_time_ms;
        buildTimeCount++;
      }
    });
    
    return {
      total: circuits.length,
      built: byStatus['BUILT'] || 0,
      building: byStatus['LAUNCHED'] || 0,
      failed: byStatus['FAILED'] || 0,
      avgBuildTime: buildTimeCount > 0 ? Math.round(totalBuildTime / buildTimeCount) : 0,
      byPurpose,
    };
  }, [circuits, events]);
  
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <StatCard 
        icon={GitBranch} 
        label="Total Circuits" 
        value={stats.total} 
        color={NEON} 
      />
      <StatCard 
        icon={CheckCircle2} 
        label="Built" 
        value={stats.built} 
        color="#4ade80" 
      />
      <StatCard 
        icon={Loader2} 
        label="Building" 
        value={stats.building} 
        color="#fbbf24" 
      />
      <StatCard 
        icon={XCircle} 
        label="Failed" 
        value={stats.failed} 
        color="#f87171" 
      />
      <StatCard 
        icon={Timer} 
        label="Avg Build Time" 
        value={formatBuildTime(stats.avgBuildTime)} 
        color={LIGHT_NEON}
        isTime 
      />
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  isTime?: boolean;
}> = ({ icon: Icon, label, value, color, isTime }) => (
  <div 
    className="rounded-xl p-4"
    style={{ 
      background: 'rgba(31, 41, 55, 0.5)',
      border: '1px solid rgba(136, 206, 208, 0.1)',
    }}
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} style={{ color }} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <div 
      className={`text-2xl font-bold ${isTime ? 'font-mono' : ''}`}
      style={{ color }}
    >
      {value}
    </div>
  </div>
);

// Circuit Row Component
interface CircuitRowProps {
  circuit: CircuitData;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

const CircuitRow: React.FC<CircuitRowProps> = ({ circuit, isExpanded, onToggle, onSelect }) => {
  const StatusIcon = STATUS_ICONS[circuit.status] || AlertCircle;
  const statusColor = STATUS_COLORS[circuit.status] || '#64748b';
  const pathStrings = getPathStrings(circuit.path);
  
  return (
    <div 
      className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors"
    >
      {/* Main Row */}
      <div 
        className="flex items-center gap-4 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        <ChevronRight 
          size={14} 
          className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
        
        {/* Circuit ID */}
        <div className="w-20">
          <span className="font-mono text-sm" style={{ color: NEON }}>
            #{circuit.circuit_id.substring(0, 8)}
          </span>
        </div>
        
        {/* Status */}
        <div className="w-24 flex items-center gap-2">
          <StatusIcon 
            size={14} 
            style={{ color: statusColor }}
            className={circuit.status === 'LAUNCHED' ? 'animate-spin' : ''}
          />
          <span className="text-xs" style={{ color: statusColor }}>
            {circuit.status}
          </span>
        </div>
        
        {/* Purpose */}
        <div className="w-32">
          <span className="text-xs text-gray-400">
            {PURPOSE_LABELS[circuit.purpose || ''] || circuit.purpose || '-'}
          </span>
        </div>
        
        {/* Path Preview */}
        <div className="flex-1">
          <CircuitPathPreview path={pathStrings} />
        </div>
        
        {/* Path Length */}
        <div className="w-20 text-right">
          <span className="font-mono text-xs text-gray-400">
            {circuit.path_length || pathStrings.length} hops
          </span>
        </div>
        
        {/* Actions */}
        <button 
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="p-1.5 text-gray-500 hover:text-white rounded"
        >
          <Eye size={14} />
        </button>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-12">
          <CircuitPathFull path={circuit.path} />
          
          {/* Additional Details */}
          <div className="mt-3 grid grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Path Length:</span>
              <span className="ml-2 text-gray-300">{circuit.path_length || circuit.path?.length || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Purpose:</span>
              <span className="ml-2 text-gray-300">{circuit.purpose || '-'}</span>
            </div>
            {circuit.source_node && (
              <div>
                <span className="text-gray-500">Source:</span>
                <span className="ml-2 text-gray-300">{circuit.source_node}</span>
              </div>
            )}
            {circuit.reason && (
              <div>
                <span className="text-gray-500">Reason:</span>
                <span className="ml-2 text-red-400">{circuit.reason}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Circuit Path Preview (compact) - takes string array
const CircuitPathPreview: React.FC<{ path: string[] }> = ({ path }) => {
  if (!path || path.length === 0) {
    return <span className="text-xs text-gray-500">No path</span>;
  }
  
  const displayPath = path.length > 3 
    ? [path[0], '...', path[path.length - 1]]
    : path;
  
  return (
    <div className="flex items-center gap-1">
      {displayPath.map((node, i) => (
        <React.Fragment key={i}>
          <span 
            className="px-2 py-0.5 text-xs rounded bg-gray-800/50"
            style={{ color: i === 0 ? DARK_NEON : i === displayPath.length - 1 ? LIGHT_NEON : NEON }}
          >
            {node === '...' ? '...' : node.substring(0, 8)}
          </span>
          {i < displayPath.length - 1 && (
            <ArrowRight size={10} className="text-gray-600" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Circuit Path Full (expanded) - takes object array from CircuitData
const CircuitPathFull: React.FC<{ path?: Array<{ fingerprint: string; nickname: string }> }> = ({ path }) => {
  if (!path || path.length === 0) {
    return <div className="text-xs text-gray-500">No path information</div>;
  }
  
  const roles = ['Guard', 'Middle', 'Exit'];
  
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-900/50 overflow-x-auto">
      {path.map((node, i) => {
        const role = roles[Math.min(i, roles.length - 1)];
        const color = i === 0 ? DARK_NEON : i === path.length - 1 ? LIGHT_NEON : NEON;
        const displayName = node.nickname || node.fingerprint.substring(0, 12);
        
        return (
          <React.Fragment key={i}>
            <div 
              className="flex-shrink-0 px-3 py-2 rounded-lg text-center"
              style={{ 
                backgroundColor: `${color}15`,
                border: `1px solid ${color}40`,
              }}
            >
              <div className="text-xs text-gray-500 mb-1">{role}</div>
              <div className="font-mono text-sm" style={{ color }}>
                {displayName}
              </div>
              <button 
                onClick={() => copyToClipboard(node.fingerprint)}
                className="mt-1 text-gray-500 hover:text-white"
                title="Copy fingerprint"
              >
                <Copy size={10} />
              </button>
            </div>
            {i < path.length - 1 && (
              <ArrowRight size={16} className="text-gray-600 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Circuit Detail Panel
interface CircuitDetailPanelProps {
  circuit: CircuitData;
  events: TorEvent[];
  onClose: () => void;
}

const CircuitDetailPanel: React.FC<CircuitDetailPanelProps> = ({ circuit, events, onClose }) => {
  const statusColor = STATUS_COLORS[circuit.status] || '#64748b';
  
  // Filter events for this circuit and extract extra data
  const circuitEvents = useMemo(() => {
    return events.filter(e => e.data?.circuit_id === circuit.circuit_id);
  }, [events, circuit.circuit_id]);
  
  // Get build time from events if available
  const buildTimeMs = useMemo(() => {
    const buildEvent = circuitEvents.find(e => e.data?.build_time_ms);
    return buildEvent?.data?.build_time_ms;
  }, [circuitEvents]);
  
  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{ 
        background: 'rgba(31, 41, 55, 0.8)',
        border: `1px solid ${statusColor}40`,
      }}
    >
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${statusColor}20, transparent)` }}
      >
        <div className="flex items-center gap-3">
          <GitBranch size={20} style={{ color: statusColor }} />
          <div>
            <h3 className="text-lg font-semibold text-white font-mono">
              Circuit #{circuit.circuit_id.substring(0, 12)}
            </h3>
            <p className="text-sm text-gray-400">
              {PURPOSE_LABELS[circuit.purpose || ''] || circuit.purpose || 'Unknown Purpose'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none p-2"
        >
          ×
        </button>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status & Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-gray-800/30">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className="text-lg font-semibold" style={{ color: statusColor }}>
              {circuit.status}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-800/30">
            <div className="text-xs text-gray-500 mb-1">Build Time</div>
            <div className="text-lg font-mono" style={{ color: NEON }}>
              {buildTimeMs ? formatBuildTime(buildTimeMs) : '-'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-gray-800/30">
            <div className="text-xs text-gray-500 mb-1">Path Length</div>
            <div className="text-lg font-mono" style={{ color: LIGHT_NEON }}>
              {circuit.path_length || circuit.path?.length || 0}
            </div>
          </div>
        </div>
        
        {/* Full Path */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Circuit Path</h4>
          <CircuitPathFull path={circuit.path} />
        </div>
        
        {/* Failure Info */}
        {circuit.reason && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
            <h4 className="text-sm font-semibold text-red-400 mb-2">Failure Information</h4>
            <div className="text-xs">
              <span className="text-gray-500">Reason:</span>
              <span className="ml-2 text-red-300">{circuit.reason}</span>
            </div>
          </div>
        )}
        
        {/* Source Node */}
        {circuit.source_node && (
          <div className="p-3 rounded-lg bg-gray-800/30">
            <div className="text-xs text-gray-500 mb-1">Source Node</div>
            <div className="font-mono text-sm" style={{ color: NEON }}>
              {circuit.source_node}
            </div>
          </div>
        )}
        
        {/* Build Flags */}
        {circuit.build_flags && circuit.build_flags.length > 0 && (
          <div className="p-3 rounded-lg bg-gray-800/30">
            <div className="text-xs text-gray-500 mb-2">Build Flags</div>
            <div className="flex flex-wrap gap-1">
              {circuit.build_flags.map((flag, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 text-xs rounded"
                  style={{ backgroundColor: NEON_DIM, color: NEON }}
                >
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Circuit Events */}
        {circuitEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">
              Events ({circuitEvents.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {circuitEvents.map((event, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 p-2 rounded bg-gray-800/50 text-xs"
                >
                  <span className="text-gray-500">{formatTime(event.timestamp)}</span>
                  <span style={{ color: NEON }}>{event.event_type}</span>
                  {event.data?.build_time_ms && (
                    <span className="text-gray-400">
                      {formatBuildTime(event.data.build_time_ms)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Full ID Copy */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30">
          <div>
            <div className="text-xs text-gray-500 mb-1">Full Circuit ID</div>
            <div className="font-mono text-sm text-gray-300">{circuit.circuit_id}</div>
          </div>
          <button 
            onClick={() => copyToClipboard(circuit.circuit_id)}
            className="p-2 text-gray-500 hover:text-white rounded"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Build Time Chart
const BuildTimeChart: React.FC<{ events: TorEvent[] }> = ({ events }) => {
  const chartData = useMemo(() => {
    // Get last 20 circuit build events with timing
    return events
      .filter(e => e.data?.build_time_ms && e.event_type === 'CIRC')
      .slice(-20)
      .map((e, i) => ({
        index: i + 1,
        time: e.data.build_time_ms,
        status: e.data.status,
      }));
  }, [events]);
  
  if (chartData.length === 0) {
    return null;
  }
  
  return (
    <div 
      className="rounded-xl p-4 mb-6"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(136, 206, 208, 0.1)',
      }}
    >
      <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        <TrendingUp size={14} style={{ color: NEON }} />
        Circuit Build Times (Last 20)
      </h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis 
              dataKey="index" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(v) => `${v}ms`}
              width={50}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const data = payload[0].payload;
                return (
                  <div 
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{ 
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: `1px solid ${NEON}40`,
                    }}
                  >
                    <div style={{ color: NEON }}>{data.time}ms</div>
                    <div className="text-gray-400">{data.status}</div>
                  </div>
                );
              }}
            />
            <Bar 
              dataKey="time" 
              fill={NEON}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const CircuitsTab: React.FC<CircuitsTabProps> = ({
  circuits,
  circuitEvents,
  isLive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedCircuit, setExpandedCircuit] = useState<string | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<CircuitData | null>(null);
  
  // Filter circuits
  const filteredCircuits = useMemo(() => {
    return circuits.filter(circuit => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const pathStrings = getPathStrings(circuit.path);
        if (!circuit.circuit_id.toLowerCase().includes(query) &&
            !pathStrings.some(p => p.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (statusFilter && circuit.status !== statusFilter) return false;
      return true;
    });
  }, [circuits, searchQuery, statusFilter]);
  
  // Count by status
  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    circuits.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [circuits]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Stats Cards */}
      <div className="flex-shrink-0 p-4 pb-0">
        <CircuitStats circuits={circuits} events={circuitEvents} />
        <BuildTimeChart events={circuitEvents} />
      </div>
      
      {/* Filters */}
      <div className="flex-shrink-0 px-4 pb-4 border-b border-gray-700/50">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by circuit ID or path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>
          
          {/* Status Filters */}
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-gray-500 mr-1" />
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-2 py-1 text-xs rounded ${
                !statusFilter ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            {Object.entries(countByStatus).map(([status, count]) => {
              const color = STATUS_COLORS[status] || '#64748b';
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                  className={`px-2 py-1 text-xs rounded ${
                    statusFilter === status ? 'bg-gray-700' : 'hover:bg-gray-800'
                  }`}
                  style={{ color }}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>
          
          {/* Live Indicator */}
          {isLive && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: NEON_DIM }}
            >
              <Activity size={14} style={{ color: NEON }} />
              <span className="text-xs font-medium" style={{ color: NEON }}>Live</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Circuit List & Detail Panel */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Circuit List */}
        <div className={`${selectedCircuit ? 'w-1/2' : 'w-full'} overflow-y-auto transition-all duration-300`}>
          {filteredCircuits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No circuits match your filters
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
                onSelect={() => setSelectedCircuit(
                  selectedCircuit?.circuit_id === circuit.circuit_id ? null : circuit
                )}
              />
            ))
          )}
        </div>
        
        {/* Detail Panel */}
        {selectedCircuit && (
          <div className="w-1/2 border-l border-gray-700/50 overflow-y-auto p-4">
            <CircuitDetailPanel
              circuit={selectedCircuit}
              events={circuitEvents}
              onClose={() => setSelectedCircuit(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CircuitsTab;