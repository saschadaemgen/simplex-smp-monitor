/**
 * OverviewTab - Executive Network Dashboard (EXTENDED)
 * =====================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * COMPLETE TorNetwork Display with ALL 38+ fields:
 * - Network Status Banner (7 fields)
 * - KPI Cards (nodes, circuits, bandwidth, consensus)
 * - Live Bandwidth Chart (InfluxDB ready)
 * - Node Distribution Pie Chart
 * - Network Configuration Panel (10 fields)
 * - Docker Configuration (2 fields) ← NEW
 * - Port Ranges (4 fields) ← NEW
 * - Consensus Timestamps (3 fields) ← NEW
 * - Lifecycle Timestamps (4 fields) ← NEW
 * - Statistics Summary (3 fields)
 * - Recent Activity Feed
 * 
 * Design: Neon Blue (#88CED0) theme throughout
 */
import React, { useMemo } from 'react';
import {
  Activity,
  Server,
  GitBranch,
  Wifi,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Zap,
  Network,
  Clock,
  Settings,
  Database,
  Radio,
  FileText,
  TrendingUp,
  ChevronRight,
  Container,
  Plug,
  Calendar,
  CheckCircle,
  XCircle as XCircleIcon,
  Timer,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BandwidthData, TorEvent } from '../../../../hooks/useTorWebSocket';

// =============================================================================
// DESIGN TOKENS - Neon Blue Theme
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';
const NEON_GLOW = 'rgba(136, 206, 208, 0.4)';
const DARK_NEON = '#4FA3A5';
const LIGHT_NEON = '#A5DFE1';
const BRIGHT_NEON = '#B8E8EA';

const NODE_COLORS: Record<string, string> = {
  da: '#4FA3A5',
  guard: '#88CED0',
  middle: '#6BB8BA',
  exit: '#A5DFE1',
  client: '#3D8B8D',
  hs: '#B8E8EA',
};

const NODE_LABELS: Record<string, string> = {
  da: 'Directory Authority',
  guard: 'Guard Relay',
  middle: 'Middle Relay',
  exit: 'Exit Relay',
  client: 'Client',
  hs: 'Hidden Service',
};

// =============================================================================
// UTILITIES
// =============================================================================
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatUptime = (startedAt: string | null): string => {
  if (!startedAt) return '-';
  const start = new Date(startedAt);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDateTime = (timestamp: string | null): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelativeTime = (timestamp: string | null): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return 'Expired';
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  return `in ${minutes}m`;
};

// =============================================================================
// TYPES - COMPLETE TorNetwork (ALL 38 fields)
// =============================================================================
export interface NetworkConfig {
  // Identification (4)
  id: string;
  name: string;
  slug: string;
  description: string;
  
  // Configuration (7)
  template: string;
  num_directory_authorities: number;
  num_guard_relays: number;
  num_middle_relays: number;
  num_exit_relays: number;
  num_clients: number;
  num_hidden_services: number;
  
  // Docker (2)
  docker_network_name: string;
  container_prefix: string;
  
  // Port Ranges (4)
  base_control_port: number;
  base_socks_port: number;
  base_or_port: number;
  base_dir_port: number;
  
  // Tor Options (3)
  testing_tor_network: boolean;
  voting_interval: number;
  assume_reachable: boolean;
  
  // Traffic Capture (4)
  capture_enabled: boolean;
  capture_filter: string;
  max_capture_size_mb: number;
  capture_rotate_interval: number;
  
  // Status (3)
  status: string;
  status_message: string;
  bootstrap_progress: number;
  
  // Consensus (4)
  consensus_valid: boolean;
  consensus_valid_after: string | null;
  consensus_fresh_until: string | null;
  consensus_valid_until: string | null;
  
  // Statistics (3)
  total_circuits_created: number;
  total_bytes_transferred: number;
  total_cells_processed: number;
  
  // Timestamps (4)
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  stopped_at: string | null;
  
  // Computed
  total_nodes: number;
  is_running?: boolean;
}

interface OverviewTabProps {
  networkId: string;
  network: NetworkConfig | null;
  isLive: boolean;
  
  // Live data
  nodesTotal: number;
  nodesRunning: number;
  nodesByType: Record<string, number>;
  
  circuitsTotal: number;
  circuitsActive: number;
  circuitsByStatus: Record<string, number>;
  
  bytesRead: number;
  bytesWritten: number;
  bandwidth: Map<string, BandwidthData>;
  bandwidthHistory: Array<{ time: string; read: number; write: number }>;
  
  authoritiesTotal: number;
  authoritiesRunning: number;
  authoritiesRequired: number;
  
  recentEvents: TorEvent[];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// Status Banner
const StatusBanner: React.FC<{
  network: NetworkConfig | null;
  isLive: boolean;
  nodesRunning: number;
  nodesTotal: number;
}> = ({ network, isLive, nodesRunning, nodesTotal }) => {
  const status = network?.status || 'unknown';
  const isRunning = status === 'running';
  const bootstrapProgress = network?.bootstrap_progress || 0;
  
  return (
    <div 
      className="rounded-xl p-4 mb-6"
      style={{ 
        background: isRunning 
          ? `linear-gradient(135deg, ${NEON_DIM} 0%, rgba(79, 163, 165, 0.1) 100%)`
          : 'rgba(100, 116, 139, 0.1)',
        border: `1px solid ${isRunning ? NEON : '#64748b'}40`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className={`w-3 h-3 rounded-full ${isLive ? 'animate-pulse' : ''}`}
            style={{ 
              backgroundColor: isRunning ? NEON : '#64748b',
              boxShadow: isRunning ? `0 0 12px ${NEON_GLOW}` : 'none',
            }}
          />
          <div>
            <h2 className="text-xl font-semibold text-white">
              {network?.name || 'Loading...'}
            </h2>
            <p className="text-sm text-gray-400">
              {network?.description || 'Real-time Tor Network Monitoring'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Template Badge */}
          <div 
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: NEON_DIM,
              color: NEON,
            }}
          >
            {network?.template?.toUpperCase() || 'BASIC'}
          </div>
          
          {/* Uptime */}
          <div className="text-right">
            <div className="text-xs text-gray-500">Uptime</div>
            <div className="text-sm font-mono" style={{ color: NEON }}>
              {formatUptime(network?.started_at || null)}
            </div>
          </div>
          
          {/* Bootstrap Progress */}
          <div className="text-right">
            <div className="text-xs text-gray-500">Bootstrap</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${bootstrapProgress}%`,
                    backgroundColor: bootstrapProgress === 100 ? NEON : DARK_NEON,
                  }}
                />
              </div>
              <span className="text-sm font-mono" style={{ color: NEON }}>
                {bootstrapProgress}%
              </span>
            </div>
          </div>
          
          {/* Live Indicator */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: NEON_DIM }}
          >
            <Wifi size={14} style={{ color: isLive ? NEON : '#64748b' }} />
            <span className="text-xs font-medium" style={{ color: NEON }}>
              {isLive ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// KPI Card
const KPICard: React.FC<{
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  details?: Array<{ label: string; value: string }>;
  onClick?: () => void;
}> = ({ icon: Icon, title, value, subtitle, trend, trendValue, details, onClick }) => {
  return (
    <div 
      className="rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] group"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(136, 206, 208, 0.1)',
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: NEON_DIM }}
        >
          <Icon size={20} style={{ color: NEON }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend === 'up' ? 'text-emerald-400' : 
            trend === 'down' ? 'text-red-400' : 
            'text-gray-400'
          }`}>
            {trend === 'up' && <ArrowUpRight size={12} />}
            {trend === 'down' && <ArrowDownRight size={12} />}
            {trendValue}
          </div>
        )}
        <ChevronRight 
          size={16} 
          className="text-gray-600 group-hover:text-gray-400 transition-colors"
        />
      </div>
      
      <div className="mb-1">
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <div className="text-xs text-gray-500 mb-3">{title}</div>
      <div className="text-sm" style={{ color: LIGHT_NEON }}>{subtitle}</div>
      
      {details && details.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-1">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-500">{d.label}</span>
              <span className="text-gray-300">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Configuration Panel (Original)
const ConfigPanel: React.FC<{ network: NetworkConfig | null }> = ({ network }) => {
  if (!network) return null;
  
  const configItems = [
    { 
      icon: Settings, 
      label: 'Template', 
      value: network.template,
      highlight: true,
    },
    { 
      icon: Clock, 
      label: 'Voting Interval', 
      value: `${network.voting_interval}s`,
    },
    { 
      icon: Radio, 
      label: 'Testing Network', 
      value: network.testing_tor_network ? 'Yes' : 'No',
    },
    { 
      icon: Zap, 
      label: 'Assume Reachable', 
      value: network.assume_reachable ? 'Yes' : 'No',
    },
    { 
      icon: FileText, 
      label: 'Capture Enabled', 
      value: network.capture_enabled ? 'Yes' : 'No',
      highlight: network.capture_enabled,
    },
    { 
      icon: Database, 
      label: 'Max Capture Size', 
      value: `${network.max_capture_size_mb} MB`,
    },
  ];
  
  return (
    <div 
      className="rounded-xl p-5"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(136, 206, 208, 0.1)',
      }}
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Settings size={14} style={{ color: NEON }} />
        Network Configuration
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {configItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30">
            <item.icon size={14} className="text-gray-500" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 truncate">{item.label}</div>
              <div 
                className="text-sm font-mono truncate"
                style={{ color: item.highlight ? NEON : '#e5e7eb' }}
              >
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {network.capture_filter && (
        <div className="mt-3 p-2 rounded-lg bg-gray-800/30">
          <div className="text-xs text-gray-500 mb-1">Capture Filter</div>
          <code className="text-xs font-mono" style={{ color: LIGHT_NEON }}>
            {network.capture_filter}
          </code>
        </div>
      )}
    </div>
  );
};

// NEW: Docker Configuration Panel
const DockerPanel: React.FC<{ network: NetworkConfig | null }> = ({ network }) => {
  if (!network) return null;
  
  return (
    <div 
      className="rounded-xl p-5"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(136, 206, 208, 0.1)',
      }}
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Container size={14} style={{ color: NEON }} />
        Docker Configuration
      </h3>
      
      <div className="space-y-3">
        <div className="p-2 rounded-lg bg-gray-800/30">
          <div className="text-xs text-gray-500 mb-1">Docker Network</div>
          <code className="text-sm font-mono" style={{ color: NEON }}>
            {network.docker_network_name || '-'}
          </code>
        </div>
        
        <div className="p-2 rounded-lg bg-gray-800/30">
          <div className="text-xs text-gray-500 mb-1">Container Prefix</div>
          <code className="text-sm font-mono" style={{ color: LIGHT_NEON }}>
            {network.container_prefix || '-'}
          </code>
        </div>
      </div>
    </div>
  );
};

// NEW: Port Ranges Panel
const PortRangesPanel: React.FC<{ network: NetworkConfig | null }> = ({ network }) => {
  if (!network) return null;
  
  const ports = [
    { label: 'Control Port', value: network.base_control_port, color: NEON },
    { label: 'SOCKS Port', value: network.base_socks_port, color: LIGHT_NEON },
    { label: 'OR Port', value: network.base_or_port, color: DARK_NEON },
    { label: 'Dir Port', value: network.base_dir_port, color: BRIGHT_NEON },
  ];
  
  return (
    <div 
      className="rounded-xl p-5"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(136, 206, 208, 0.1)',
      }}
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Plug size={14} style={{ color: NEON }} />
        Port Ranges (Base)
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {ports.map((port, i) => (
          <div key={i} className="p-2 rounded-lg bg-gray-800/30">
            <div className="text-xs text-gray-500 mb-1">{port.label}</div>
            <div className="text-lg font-mono" style={{ color: port.color }}>
              {port.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// NEW: Consensus Timestamps Panel
const ConsensusTimestampsPanel: React.FC<{ network: NetworkConfig | null }> = ({ network }) => {
  if (!network) return null;
  
  const isValid = network.consensus_valid;
  
  return (
    <div 
      className="rounded-xl p-5"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: `1px solid ${isValid ? 'rgba(136, 206, 208, 0.1)' : 'rgba(239, 68, 68, 0.2)'}`,
      }}
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        {isValid ? (
          <CheckCircle size={14} style={{ color: NEON }} />
        ) : (
          <XCircleIcon size={14} className="text-red-400" />
        )}
        Consensus Status
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
          <span className="text-xs text-gray-500">Status</span>
          <span 
            className="text-sm font-semibold"
            style={{ color: isValid ? NEON : '#ef4444' }}
          >
            {isValid ? 'Valid' : 'Invalid'}
          </span>
        </div>
        
        <div className="p-2 rounded-lg bg-gray-800/30">
          <div className="text-xs text-gray-500 mb-1">Valid After</div>
          <div className="text-sm font-mono text-gray-300">
            {formatDateTime(network.consensus_valid_after)}
          </div>
        </div>
        
        <div className="p-2 rounded-lg bg-gray-800/30">
          <div className="text-xs text-gray-500 mb-1">Fresh Until</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-gray-300">
              {formatDateTime(network.consensus_fresh_until)}
            </span>
            <span className="text-xs" style={{ color: LIGHT_NEON }}>
              {formatRelativeTime(network.consensus_fresh_until)}
            </span>
          </div>
        </div>
        
        <div className="p-2 rounded-lg bg-gray-800/30">
          <div className="text-xs text-gray-500 mb-1">Valid Until</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-gray-300">
              {formatDateTime(network.consensus_valid_until)}
            </span>
            <span className="text-xs" style={{ color: LIGHT_NEON }}>
              {formatRelativeTime(network.consensus_valid_until)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// NEW: Lifecycle Timestamps Panel
const LifecyclePanel: React.FC<{ network: NetworkConfig | null }> = ({ network }) => {
  if (!network) return null;
  
  const timestamps = [
    { label: 'Created', value: network.created_at, icon: Calendar },
    { label: 'Updated', value: network.updated_at, icon: Clock },
    { label: 'Started', value: network.started_at, icon: Zap },
    { label: 'Stopped', value: network.stopped_at, icon: Timer },
  ];
  
  return (
    <div 
      className="rounded-xl p-5"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(136, 206, 208, 0.1)',
      }}
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Calendar size={14} style={{ color: NEON }} />
        Lifecycle
      </h3>
      
      <div className="space-y-2">
        {timestamps.map((ts, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30">
            <ts.icon size={14} className="text-gray-500" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500">{ts.label}</div>
              <div className="text-sm font-mono text-gray-300 truncate">
                {formatDateTime(ts.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Statistics Panel
const StatsPanel: React.FC<{ network: NetworkConfig | null }> = ({ network }) => {
  if (!network) return null;
  
  return (
    <div 
      className="rounded-xl p-5"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(136, 206, 208, 0.1)',
      }}
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <TrendingUp size={14} style={{ color: NEON }} />
        Lifetime Statistics
      </h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs text-gray-500">Total Circuits Created</span>
            <span className="text-lg font-mono" style={{ color: NEON }}>
              {network.total_circuits_created.toLocaleString()}
            </span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: '100%',
                background: `linear-gradient(90deg, ${DARK_NEON}, ${NEON})`,
              }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs text-gray-500">Total Data Transferred</span>
            <span className="text-lg font-mono" style={{ color: NEON }}>
              {formatBytes(network.total_bytes_transferred)}
            </span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: '100%',
                background: `linear-gradient(90deg, ${DARK_NEON}, ${LIGHT_NEON})`,
              }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs text-gray-500">Total Tor Cells</span>
            <span className="text-lg font-mono" style={{ color: NEON }}>
              {network.total_cells_processed.toLocaleString()}
            </span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: '100%',
                background: `linear-gradient(90deg, ${DARK_NEON}, ${BRIGHT_NEON})`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Recent Activity Feed
const ActivityFeed: React.FC<{ events: TorEvent[] }> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div 
        className="rounded-xl p-5"
        style={{ 
          background: 'rgba(31, 41, 55, 0.5)',
          border: '1px solid rgba(136, 206, 208, 0.1)',
        }}
      >
        <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Activity size={14} style={{ color: NEON }} />
          Recent Activity
        </h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          No recent events
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="rounded-xl p-5"
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(136, 206, 208, 0.1)',
      }}
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Activity size={14} style={{ color: NEON }} />
        Recent Activity
      </h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {events.slice(0, 10).map((event, i) => (
          <div 
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: NEON }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-300 truncate">
                {event.event_type}
              </div>
              <div className="text-xs text-gray-500">
                {event.node_name}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {formatTime(event.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const OverviewTab: React.FC<OverviewTabProps> = ({
  networkId,
  network,
  isLive,
  nodesTotal,
  nodesRunning,
  nodesByType,
  circuitsTotal,
  circuitsActive,
  circuitsByStatus,
  bytesRead,
  bytesWritten,
  bandwidth,
  bandwidthHistory,
  authoritiesTotal,
  authoritiesRunning,
  authoritiesRequired,
  recentEvents,
}) => {
  // Calculate totals from bandwidth map
  const totalBandwidth = useMemo(() => {
    let read = 0;
    let written = 0;
    bandwidth.forEach((bw) => {
      read += bw.bytes_read;
      written += bw.bytes_written;
    });
    return { 
      read: read || bytesRead, 
      written: written || bytesWritten, 
      total: (read || bytesRead) + (written || bytesWritten),
    };
  }, [bandwidth, bytesRead, bytesWritten]);

  // Node distribution for pie chart
  const nodeDistribution = useMemo(() => {
    return Object.entries(nodesByType).map(([type, count]) => ({
      name: NODE_LABELS[type] || type.toUpperCase(),
      value: count,
      color: NODE_COLORS[type] || NEON,
    }));
  }, [nodesByType]);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div 
        className="rounded-lg px-3 py-2 text-xs"
        style={{ 
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          border: `1px solid ${NEON}40`,
        }}
      >
        <div className="text-gray-400 mb-1">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span style={{ color: p.color }}>{p.name}:</span>
            <span className="text-white font-mono">{formatBytes(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      {/* Status Banner */}
      <StatusBanner 
        network={network}
        isLive={isLive}
        nodesRunning={nodesRunning}
        nodesTotal={nodesTotal}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={Server}
          title="Nodes"
          value={`${nodesRunning}/${nodesTotal}`}
          subtitle={`${nodesTotal > 0 ? Math.round((nodesRunning / nodesTotal) * 100) : 0}% online`}
          details={Object.entries(nodesByType).map(([type, count]) => ({
            label: NODE_LABELS[type] || type,
            value: String(count),
          }))}
        />
        
        <KPICard
          icon={GitBranch}
          title="Circuits"
          value={String(circuitsActive)}
          subtitle={`${circuitsTotal} total created`}
          details={[
            { label: 'Built', value: String(circuitsByStatus?.BUILT || circuitsActive) },
            { label: 'Building', value: String(circuitsByStatus?.LAUNCHED || 0) },
            { label: 'Failed', value: String(circuitsByStatus?.FAILED || 0) },
          ]}
        />
        
        <KPICard
          icon={Activity}
          title="Bandwidth"
          value={formatBytes(totalBandwidth.total)}
          subtitle={`↓${formatBytes(totalBandwidth.read)} ↑${formatBytes(totalBandwidth.written)}`}
          trend="up"
          trendValue="Live"
        />
        
        <KPICard
          icon={Shield}
          title="Consensus"
          value={network?.consensus_valid ? 'Valid' : 'Invalid'}
          subtitle={`${authoritiesRunning}/${authoritiesTotal} DAs voting`}
          details={[
            { label: 'Required', value: String(authoritiesRequired) },
            { label: 'Online', value: String(authoritiesRunning) },
            { label: 'Status', value: authoritiesRunning >= authoritiesRequired ? 'Healthy' : 'At Risk' },
          ]}
        />
      </div>

      {/* Main Content Grid - 3 Columns */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="col-span-2 space-y-6">
          {/* Bandwidth Chart */}
          <div 
            className="rounded-xl p-5"
            style={{ 
              background: 'rgba(31, 41, 55, 0.5)',
              border: '1px solid rgba(136, 206, 208, 0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Activity size={14} style={{ color: NEON }} />
                Network Bandwidth
              </h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 rounded" style={{ backgroundColor: NEON }} />
                  <span className="text-gray-400">Read</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 rounded" style={{ backgroundColor: LIGHT_NEON }} />
                  <span className="text-gray-400">Write</span>
                </div>
              </div>
            </div>
            
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bandwidthHistory}>
                  <defs>
                    <linearGradient id="readGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={NEON} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={NEON} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="writeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={LIGHT_NEON} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={LIGHT_NEON} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(v) => formatBytes(v)}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="read"
                    name="Read"
                    stroke={NEON}
                    fill="url(#readGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="write"
                    name="Write"
                    stroke={LIGHT_NEON}
                    fill="url(#writeGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Node Distribution */}
          <div 
            className="rounded-xl p-5"
            style={{ 
              background: 'rgba(31, 41, 55, 0.5)',
              border: '1px solid rgba(136, 206, 208, 0.1)',
            }}
          >
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Network size={14} style={{ color: NEON }} />
              Node Distribution
            </h3>
            
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nodeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {nodeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div 
                            className="rounded-lg px-3 py-2 text-xs"
                            style={{ 
                              backgroundColor: 'rgba(17, 24, 39, 0.95)',
                              border: `1px solid ${data.color}40`,
                            }}
                          >
                            <span style={{ color: data.color }}>{data.name}</span>
                            <span className="text-white ml-2">{data.value}</span>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-2">
                {nodeDistribution.map((node, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/30"
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="text-xs text-gray-400 flex-1">{node.name}</span>
                    <span className="text-sm font-mono" style={{ color: node.color }}>
                      {node.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* NEW: Docker & Port Config Row */}
          <div className="grid grid-cols-2 gap-6">
            <DockerPanel network={network} />
            <PortRangesPanel network={network} />
          </div>
        </div>

        {/* Right Column - Config, Stats & Activity */}
        <div className="space-y-6">
          <ConfigPanel network={network} />
          <ConsensusTimestampsPanel network={network} />
          <LifecyclePanel network={network} />
          <StatsPanel network={network} />
          <ActivityFeed events={recentEvents} />
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;