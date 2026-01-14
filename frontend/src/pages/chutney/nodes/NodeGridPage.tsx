/**
 * NodeGridPage - Complete Node Overview with Live Data
 * =====================================================
 * Full-featured node monitoring page with real-time updates,
 * filtering, sorting, and detailed statistics.
 * 
 * Design: Neon Blue (#88CED0) only - professional & clean
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Server, 
  RefreshCw, 
  Activity, 
  Wifi, 
  WifiOff,
  Clock,
  HardDrive,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  Shield,
  Eye,
  Users,
  Globe,
  ChevronRight,
  Database,
  Network,
  Cpu,
  BarChart3,
  ArrowUpDown,
  Filter,
  Grid,
  List,
  Info,
  Copy,
  ExternalLink
} from 'lucide-react';
import { analyticsApi, NetworkAnalytics } from '../../../api/chutney_analytics';

// =============================================================================
// CONSTANTS
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';
const NEON_MEDIUM = 'rgba(136, 206, 208, 0.2)';
const NEON_BRIGHT = 'rgba(136, 206, 208, 0.3)';

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '1m', value: 60000 },
];

type NodeType = 'da' | 'guard' | 'middle' | 'exit' | 'client' | 'hs';

interface NodeStats {
  node_id: string;
  node_name: string;
  node_type: NodeType;
  version: string;
  uptime: number;
  fingerprint: string;
  bytes_read: number;
  bytes_written: number;
  bootstrap_phase: string | null;
  bootstrap_progress: number;
}

const NODE_TYPE_INFO: Record<NodeType, { label: string; shortLabel: string; icon: React.ReactNode; description: string }> = {
  da: { 
    label: 'Directory Authority', 
    shortLabel: 'DA',
    icon: <Shield size={14} />, 
    description: 'Trusted servers that vote on network consensus'
  },
  guard: { 
    label: 'Guard Relay', 
    shortLabel: 'Guard',
    icon: <Shield size={14} />, 
    description: 'Entry points to the Tor network'
  },
  middle: { 
    label: 'Middle Relay', 
    shortLabel: 'Middle',
    icon: <Server size={14} />, 
    description: 'Intermediate hops in circuits'
  },
  exit: { 
    label: 'Exit Relay', 
    shortLabel: 'Exit',
    icon: <Globe size={14} />, 
    description: 'Exit points to the clearnet'
  },
  client: { 
    label: 'Tor Client', 
    shortLabel: 'Client',
    icon: <Users size={14} />, 
    description: 'Users connecting through the network'
  },
  hs: { 
    label: 'Hidden Service', 
    shortLabel: 'HS',
    icon: <Eye size={14} />, 
    description: 'Onion services hosting content'
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours < 24) return `${hours}h ${minutes}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

const truncateFingerprint = (fp: string): string => {
  if (!fp || fp.length < 16) return fp || 'N/A';
  return `${fp.slice(0, 8)}...${fp.slice(-8)}`;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  detail?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, detail }) => (
  <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-[#88CED0]/30 transition-all duration-300 group">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: NEON }}>{value}</p>
        {subtitle && (
          <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
        )}
        {detail && (
          <p className="text-gray-600 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">{detail}</p>
        )}
      </div>
      <div 
        className="p-2.5 rounded-lg"
        style={{ backgroundColor: NEON_DIM }}
      >
        <div style={{ color: NEON }}>{icon}</div>
      </div>
    </div>
  </div>
);

// =============================================================================
// NODE TYPE FILTER COMPONENT
// =============================================================================
interface NodeTypeFilterProps {
  nodes: NodeStats[];
  selectedType: NodeType | 'all';
  onSelect: (type: NodeType | 'all') => void;
}

const NodeTypeFilter: React.FC<NodeTypeFilterProps> = ({ nodes, selectedType, onSelect }) => {
  const counts = (Object.keys(NODE_TYPE_INFO) as NodeType[]).reduce((acc, type) => {
    acc[type] = nodes.filter(n => n.node_type === type).length;
    return acc;
  }, {} as Record<NodeType, number>);

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} style={{ color: NEON }} />
        <span className="text-sm font-medium text-white">Filter by Type</span>
      </div>
      
      <div className="space-y-1">
        <button
          onClick={() => onSelect('all')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${
            selectedType === 'all' 
              ? 'bg-[#88CED0]/20 text-[#88CED0]' 
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
          }`}
        >
          <span>All Nodes</span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: NEON_DIM, color: NEON }}>
            {nodes.length}
          </span>
        </button>
        
        {(Object.keys(NODE_TYPE_INFO) as NodeType[]).map(type => {
          const count = counts[type];
          if (count === 0) return null;
          const info = NODE_TYPE_INFO[type];
          
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${
                selectedType === type 
                  ? 'bg-[#88CED0]/20 text-[#88CED0]' 
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: selectedType === type ? NEON : 'inherit' }}>{info.icon}</span>
                <span>{info.shortLabel}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: NEON_DIM, color: NEON }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// NODE DETAIL CARD COMPONENT
// =============================================================================
interface NodeCardProps {
  node: NodeStats;
  onClick?: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onClick }) => {
  const typeInfo = NODE_TYPE_INFO[node.node_type];
  const totalBandwidth = node.bytes_read + node.bytes_written;
  const isBootstrapped = node.bootstrap_progress === 100;
  
  return (
    <div 
      className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4 hover:border-[#88CED0]/40 transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: NEON_DIM }}
          >
            <span style={{ color: NEON }}>{typeInfo.icon}</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white group-hover:text-[#88CED0] transition-colors">
              {node.node_name}
            </h4>
            <p className="text-xs text-gray-500">{typeInfo.label}</p>
          </div>
        </div>
        <div 
          className="px-2 py-1 rounded text-xs font-medium"
          style={{ 
            backgroundColor: isBootstrapped ? NEON_DIM : 'rgba(251, 191, 36, 0.1)',
            color: isBootstrapped ? NEON : '#fbbf24'
          }}
        >
          {isBootstrapped ? 'READY' : `${node.bootstrap_progress}%`}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-900/50 rounded-md p-2">
          <p className="text-xs text-gray-500 mb-1">Bandwidth</p>
          <p className="text-sm font-medium" style={{ color: NEON }}>{formatBytes(totalBandwidth)}</p>
        </div>
        <div className="bg-gray-900/50 rounded-md p-2">
          <p className="text-xs text-gray-500 mb-1">Uptime</p>
          <p className="text-sm font-medium" style={{ color: NEON }}>{formatUptime(node.uptime)}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Read</span>
          <span className="text-gray-300">{formatBytes(node.bytes_read)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Written</span>
          <span className="text-gray-300">{formatBytes(node.bytes_written)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Version</span>
          <span className="text-gray-300">{node.version || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Fingerprint</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-300 font-mono text-xs">{truncateFingerprint(node.fingerprint)}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); copyToClipboard(node.fingerprint); }}
              className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy fingerprint"
            >
              <Copy size={10} style={{ color: NEON }} />
            </button>
          </div>
        </div>
      </div>

      {/* Bootstrap Progress Bar */}
      {!isBootstrapped && (
        <div className="mt-3">
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${node.bootstrap_progress}%`,
                backgroundColor: NEON 
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{node.bootstrap_phase || 'Bootstrapping...'}</p>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// NODE TABLE ROW COMPONENT
// =============================================================================
interface NodeRowProps {
  node: NodeStats;
  onClick?: () => void;
}

const NodeRow: React.FC<NodeRowProps> = ({ node, onClick }) => {
  const typeInfo = NODE_TYPE_INFO[node.node_type];
  const totalBandwidth = node.bytes_read + node.bytes_written;
  const isBootstrapped = node.bootstrap_progress === 100;
  
  return (
    <tr 
      className="border-b border-gray-700/30 hover:bg-gray-800/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div 
            className="p-1.5 rounded"
            style={{ backgroundColor: NEON_DIM }}
          >
            <span style={{ color: NEON }}>{typeInfo.icon}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white group-hover:text-[#88CED0] transition-colors">{node.node_name}</p>
            <p className="text-xs text-gray-500">{typeInfo.shortLabel}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div 
          className="inline-flex px-2 py-1 rounded text-xs font-medium"
          style={{ 
            backgroundColor: isBootstrapped ? NEON_DIM : 'rgba(251, 191, 36, 0.1)',
            color: isBootstrapped ? NEON : '#fbbf24'
          }}
        >
          {isBootstrapped ? 'READY' : `${node.bootstrap_progress}%`}
        </div>
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: NEON }}>{formatBytes(totalBandwidth)}</td>
      <td className="px-4 py-3 text-sm text-gray-300">{formatBytes(node.bytes_read)}</td>
      <td className="px-4 py-3 text-sm text-gray-300">{formatBytes(node.bytes_written)}</td>
      <td className="px-4 py-3 text-sm" style={{ color: NEON }}>{formatUptime(node.uptime)}</td>
      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{truncateFingerprint(node.fingerprint)}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{node.version || 'N/A'}</td>
      <td className="px-4 py-3">
        <ChevronRight size={16} className="text-gray-600 group-hover:text-[#88CED0] transition-colors" />
      </td>
    </tr>
  );
};

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================
export default function NodeGridPage() {
  const { id: networkId } = useParams<{ id: string }>();
  
  // State
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // View State
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterType, setFilterType] = useState<NodeType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'bandwidth' | 'uptime'>('type');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch data
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (!networkId) return;
    
    if (showRefreshIndicator) setIsRefreshing(true);
    
    try {
      const data = await analyticsApi.getNetworkAnalytics(networkId);
      setAnalytics(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [networkId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval === 0) return;
    const interval = setInterval(() => fetchData(true), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  // Process nodes
  const allNodes: NodeStats[] = analytics?.nodes?.stats || [];
  
  // Filter nodes
  const filteredNodes = filterType === 'all' 
    ? allNodes 
    : allNodes.filter(n => n.node_type === filterType);
  
  // Sort nodes
  const sortedNodes = [...filteredNodes].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.node_name.localeCompare(b.node_name);
        break;
      case 'type':
        comparison = a.node_type.localeCompare(b.node_type);
        break;
      case 'bandwidth':
        comparison = (a.bytes_read + a.bytes_written) - (b.bytes_read + b.bytes_written);
        break;
      case 'uptime':
        comparison = a.uptime - b.uptime;
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Calculate statistics
  const totalBandwidth = allNodes.reduce((sum, n) => sum + n.bytes_read + n.bytes_written, 0);
  const totalRead = allNodes.reduce((sum, n) => sum + n.bytes_read, 0);
  const totalWritten = allNodes.reduce((sum, n) => sum + n.bytes_written, 0);
  const avgUptime = allNodes.length > 0 
    ? Math.round(allNodes.reduce((sum, n) => sum + n.uptime, 0) / allNodes.length)
    : 0;
  const fullyBootstrapped = allNodes.filter(n => n.bootstrap_progress === 100).length;
  const avgBootstrap = allNodes.length > 0
    ? Math.round(allNodes.reduce((sum, n) => sum + n.bootstrap_progress, 0) / allNodes.length)
    : 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: NEON }} />
          <p className="text-gray-400">Loading node data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800/50 border border-[#88CED0]/30 rounded-lg p-6 text-center">
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: NEON }} />
            <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{ backgroundColor: NEON, color: '#0f172a' }}
            >
              <RefreshCw size={16} className="inline mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800/30 border-b border-gray-700/50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link 
              to="/tor-networks" 
              className="text-gray-500 hover:text-[#88CED0] transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              Networks
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <Link 
              to={`/tor-networks/${networkId}`}
              className="text-gray-500 hover:text-[#88CED0] transition-colors"
            >
              {analytics?.network_name || 'Network'}
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <Link 
              to={`/tor-networks/${networkId}/analytics`}
              className="text-gray-500 hover:text-[#88CED0] transition-colors"
            >
              Analytics
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <span style={{ color: NEON }}>Nodes</span>
          </div>

          {/* Title Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: NEON_DIM }}
              >
                <Server size={24} style={{ color: NEON }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Node Grid</h1>
                <p className="text-gray-500 text-sm">
                  Real-time monitoring of {allNodes.length} nodes in {analytics?.network_name}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  {lastUpdated.toLocaleTimeString()}
                </div>
              )}

              <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5">
                <Activity size={14} style={{ color: NEON }} />
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-transparent text-sm text-white border-none outline-none cursor-pointer"
                >
                  {REFRESH_INTERVALS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-gray-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="p-2 rounded-lg border border-gray-700/50 hover:border-[#88CED0]/50 transition-colors disabled:opacity-50"
                style={{ backgroundColor: NEON_DIM }}
                title="Refresh now"
              >
                <RefreshCw 
                  size={16} 
                  className={isRefreshing ? 'animate-spin' : ''} 
                  style={{ color: NEON }} 
                />
              </button>

              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ 
                  backgroundColor: NEON_DIM,
                  borderColor: 'rgba(136, 206, 208, 0.3)'
                }}
              >
                {analytics?.network_status === 'running' ? (
                  <>
                    <Wifi size={14} style={{ color: NEON }} />
                    <span className="text-xs font-medium" style={{ color: NEON }}>LIVE</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={14} style={{ color: NEON }} />
                    <span className="text-xs font-medium" style={{ color: NEON }}>
                      {analytics?.network_status?.toUpperCase()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Total Nodes"
            value={allNodes.length}
            subtitle={`${fullyBootstrapped} ready`}
            icon={<Server size={18} />}
          />
          <StatCard
            title="Total Bandwidth"
            value={formatBytes(totalBandwidth)}
            subtitle="All nodes combined"
            icon={<HardDrive size={18} />}
          />
          <StatCard
            title="Data Read"
            value={formatBytes(totalRead)}
            subtitle="Incoming traffic"
            icon={<Database size={18} />}
          />
          <StatCard
            title="Data Written"
            value={formatBytes(totalWritten)}
            subtitle="Outgoing traffic"
            icon={<BarChart3 size={18} />}
          />
          <StatCard
            title="Avg Uptime"
            value={formatUptime(avgUptime)}
            subtitle="Per node"
            icon={<Clock size={18} />}
          />
          <StatCard
            title="Bootstrap"
            value={`${avgBootstrap}%`}
            subtitle={`${fullyBootstrapped}/${allNodes.length} complete`}
            icon={<Cpu size={18} />}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <NodeTypeFilter 
              nodes={allNodes}
              selectedType={filterType}
              onSelect={setFilterType}
            />
            
            {/* Sort Options */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown size={14} style={{ color: NEON }} />
                <span className="text-sm font-medium text-white">Sort By</span>
              </div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as typeof sortBy);
                  setSortOrder(order as typeof sortOrder);
                }}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
              >
                <option value="type-asc">Type (A-Z)</option>
                <option value="type-desc">Type (Z-A)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="bandwidth-desc">Bandwidth (High-Low)</option>
                <option value="bandwidth-asc">Bandwidth (Low-High)</option>
                <option value="uptime-desc">Uptime (High-Low)</option>
                <option value="uptime-asc">Uptime (Low-High)</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Eye size={14} style={{ color: NEON }} />
                <span className="text-sm font-medium text-white">View Mode</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[#88CED0]/20 text-[#88CED0]'
                      : 'text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  <Grid size={14} />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                    viewMode === 'table'
                      ? 'bg-[#88CED0]/20 text-[#88CED0]'
                      : 'text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  <List size={14} />
                  Table
                </button>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} style={{ color: NEON }} />
                <span className="text-sm font-medium text-white">Network Info</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Network</span>
                  <span className="text-gray-300">{analytics?.network_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span style={{ color: NEON }}>{analytics?.network_status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Circuits</span>
                  <span className="text-gray-300">{analytics?.circuits?.total_circuits || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Consensus</span>
                  <span style={{ color: analytics?.consensus?.valid ? NEON : '#fbbf24' }}>
                    {analytics?.consensus?.valid ? 'Valid' : 'Invalid'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-4">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                Showing <span style={{ color: NEON }}>{sortedNodes.length}</span> of {allNodes.length} nodes
                {filterType !== 'all' && (
                  <span className="ml-2">
                    (filtered by <span style={{ color: NEON }}>{NODE_TYPE_INFO[filterType].label}</span>)
                  </span>
                )}
              </p>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedNodes.map(node => (
                  <NodeCard 
                    key={node.node_id} 
                    node={node}
                    onClick={() => console.log('Node clicked:', node)}
                  />
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/50 bg-gray-800/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Node</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Bandwidth</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Read</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Written</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Uptime</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fingerprint</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Version</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedNodes.map(node => (
                        <NodeRow 
                          key={node.node_id} 
                          node={node}
                          onClick={() => console.log('Node clicked:', node)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {sortedNodes.length === 0 && (
              <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <Server size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">No nodes found matching the current filter.</p>
                <button
                  onClick={() => setFilterType('all')}
                  className="mt-4 px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: NEON_DIM, color: NEON }}
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
