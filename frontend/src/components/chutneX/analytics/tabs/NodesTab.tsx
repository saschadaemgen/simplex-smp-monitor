/**
 * NodesTab - Node Grid with Detail Panel
 * =======================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Master-detail layout showing:
 * - Filterable/searchable node grid
 * - Detailed node information panel (30+ fields)
 * - Progressive disclosure for advanced fields
 * - Real-time status updates
 */
import React, { useState, useMemo } from 'react';
import {
  Server,
  Shield,
  ArrowLeftRight,
  LogOut,
  User,
  Eye,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Activity,
  Clock,
  Hash,
  Key,
  Globe,
  Settings,
  HardDrive,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { BandwidthData } from '../../../../hooks/useTorWebSocket';

// Utility function
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';

// Node type icons and colors
const NODE_TYPES = {
  da: { icon: Shield, label: 'Directory Authority', color: '#4FA3A5' },
  guard: { icon: Shield, label: 'Guard', color: '#88CED0' },
  middle: { icon: ArrowLeftRight, label: 'Middle', color: '#6BB8BA' },
  exit: { icon: LogOut, label: 'Exit', color: '#A5DFE1' },
  client: { icon: User, label: 'Client', color: '#3D8B8D' },
  hs: { icon: Eye, label: 'Hidden Service', color: '#B8E8EA' },
};

// Node status colors
const STATUS_COLORS = {
  running: '#4ade80',
  bootstrapping: NEON,
  stopped: '#64748b',
  error: '#f87171',
};

export interface TorNodeData {
  id: string;
  name: string;
  node_type: string;
  status: string;
  
  // Identity
  fingerprint?: string;
  nickname?: string;
  v3_identity?: string;
  
  // Network
  control_port?: number;
  socks_port?: number;
  or_port?: number;
  dir_port?: number;
  address?: string;
  
  // Status
  bootstrap_progress: number;
  flags?: string[];
  
  // Traffic
  bytes_read: number;
  bytes_written: number;
  circuits_active?: number;
  
  // Advanced
  bandwidth_rate?: number;
  bandwidth_burst?: number;
  platform?: string;
  tor_version?: string;
  uptime_seconds?: number;
  
  // Hidden Service
  hs_address?: string;
  hs_port?: number;
  
  // Container
  container_name?: string;
  container_id?: string;
}

interface NodesTabProps {
  nodes: TorNodeData[];
  bandwidth: Map<string, BandwidthData>;
  isLive: boolean;
}

export const NodesTab: React.FC<NodesTabProps> = ({
  nodes,
  bandwidth,
  isLive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TorNodeData | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          node.name.toLowerCase().includes(query) ||
          node.fingerprint?.toLowerCase().includes(query) ||
          node.nickname?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Type filter
      if (typeFilter && node.node_type !== typeFilter) return false;
      
      // Status filter
      if (statusFilter && node.status !== statusFilter) return false;
      
      return true;
    });
  }, [nodes, searchQuery, typeFilter, statusFilter]);

  // Group nodes by type for summary
  const nodeStats = useMemo(() => {
    const stats = {
      total: nodes.length,
      running: nodes.filter(n => n.status === 'running').length,
      byType: {} as Record<string, number>,
    };
    nodes.forEach(n => {
      stats.byType[n.node_type] = (stats.byType[n.node_type] || 0) + 1;
    });
    return stats;
  }, [nodes]);

  return (
    <div className="flex h-full">
      {/* Left Panel - Node List */}
      <div className={`flex-1 flex flex-col border-r border-gray-700/50 ${selectedNode ? 'hidden lg:flex' : ''}`}>
        {/* Search & Filters */}
        <div className="p-4 border-b border-gray-700/50 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg
                        text-white placeholder-gray-500 focus:outline-none focus:border-[#88CED0]/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <Filter size={14} />
            Filters
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {(typeFilter || statusFilter) && (
              <span 
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ backgroundColor: NEON_DIM, color: NEON }}
              >
                {[typeFilter, statusFilter].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Filter Options */}
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {/* Type Filter */}
              <select
                value={typeFilter || ''}
                onChange={(e) => setTypeFilter(e.target.value || null)}
                className="px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-lg
                          text-sm text-white focus:outline-none focus:border-[#88CED0]/50"
              >
                <option value="">All Types</option>
                {Object.entries(NODE_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-lg
                          text-sm text-white focus:outline-none focus:border-[#88CED0]/50"
              >
                <option value="">All Status</option>
                <option value="running">Running</option>
                <option value="bootstrapping">Bootstrapping</option>
                <option value="stopped">Stopped</option>
                <option value="error">Error</option>
              </select>

              {/* Clear Filters */}
              {(typeFilter || statusFilter) && (
                <button
                  onClick={() => { setTypeFilter(null); setStatusFilter(null); }}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Stats Summary */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{filteredNodes.length} of {nodeStats.total} nodes</span>
            <span className="text-emerald-400">{nodeStats.running} running</span>
          </div>
        </div>

        {/* Node Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredNodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                bandwidth={bandwidth.get(node.id)}
                isSelected={selectedNode?.id === node.id}
                onClick={() => setSelectedNode(node)}
              />
            ))}
          </div>
          
          {filteredNodes.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No nodes match your filters
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Node Detail */}
      {selectedNode && (
        <div className="w-full lg:w-96 xl:w-[450px] flex flex-col bg-gray-900/50">
          <NodeDetailPanel
            node={selectedNode}
            bandwidth={bandwidth.get(selectedNode.id)}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// NODE CARD
// =============================================================================

interface NodeCardProps {
  node: TorNodeData;
  bandwidth?: BandwidthData;
  isSelected: boolean;
  onClick: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, bandwidth, isSelected, onClick }) => {
  const typeConfig = NODE_TYPES[node.node_type as keyof typeof NODE_TYPES] || NODE_TYPES.middle;
  const Icon = typeConfig.icon;
  const statusColor = STATUS_COLORS[node.status as keyof typeof STATUS_COLORS] || '#64748b';

  return (
    <button
      onClick={onClick}
      className={`
        text-left p-4 rounded-lg border transition-all
        ${isSelected 
          ? 'border-[#88CED0]/50 bg-[#88CED0]/10' 
          : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded"
            style={{ backgroundColor: `${typeConfig.color}20` }}
          >
            <Icon size={14} style={{ color: typeConfig.color }} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{node.name}</h4>
            <p className="text-xs text-gray-500">{typeConfig.label}</p>
          </div>
        </div>
        
        {/* Status dot */}
        <div className="flex items-center gap-1.5">
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs text-gray-400 capitalize">{node.status}</span>
        </div>
      </div>

      {/* Bootstrap Progress */}
      {node.bootstrap_progress < 100 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Bootstrap</span>
            <span style={{ color: NEON }}>{node.bootstrap_progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ width: `${node.bootstrap_progress}%`, backgroundColor: NEON }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Traffic</span>
          <p className="text-gray-300 font-mono">
            {formatBytes(node.bytes_read + node.bytes_written)}
          </p>
        </div>
        {node.circuits_active !== undefined && (
          <div>
            <span className="text-gray-500">Circuits</span>
            <p className="text-gray-300 font-mono">{node.circuits_active}</p>
          </div>
        )}
      </div>

      {/* Live bandwidth indicator */}
      {bandwidth && (
        <div 
          className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2"
        >
          <Activity size={12} style={{ color: NEON }} className="animate-pulse" />
          <span className="text-xs" style={{ color: NEON }}>
            {formatBytes(bandwidth.avg_bytes_read + bandwidth.avg_bytes_written)}/s
          </span>
        </div>
      )}
    </button>
  );
};

// =============================================================================
// NODE DETAIL PANEL
// =============================================================================

interface NodeDetailPanelProps {
  node: TorNodeData;
  bandwidth?: BandwidthData;
  onClose: () => void;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, bandwidth, onClose }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const typeConfig = NODE_TYPES[node.node_type as keyof typeof NODE_TYPES] || NODE_TYPES.middle;
  const Icon = typeConfig.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${typeConfig.color}20` }}
            >
              <Icon size={20} style={{ color: typeConfig.color }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{node.name}</h3>
              <p className="text-sm text-gray-400">{typeConfig.label}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status Section */}
        <DetailSection title="Status" icon={Activity}>
          <DetailRow label="Status" value={node.status} />
          <DetailRow label="Bootstrap" value={`${node.bootstrap_progress}%`} />
          {node.flags && node.flags.length > 0 && (
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Flags</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {node.flags.map(flag => (
                  <span 
                    key={flag}
                    className="px-2 py-0.5 text-xs rounded"
                    style={{ backgroundColor: NEON_DIM, color: NEON }}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </DetailSection>

        {/* Identity Section */}
        <DetailSection title="Identity" icon={Fingerprint}>
          {node.fingerprint && (
            <DetailRow 
              label="Fingerprint" 
              value={node.fingerprint} 
              mono 
              copyable
              fullWidth
            />
          )}
          {node.nickname && (
            <DetailRow label="Nickname" value={node.nickname} />
          )}
          {node.v3_identity && (
            <DetailRow 
              label="V3 Identity" 
              value={node.v3_identity} 
              mono 
              copyable
              fullWidth
            />
          )}
        </DetailSection>

        {/* Network Section */}
        <DetailSection title="Network" icon={Globe}>
          {node.address && <DetailRow label="Address" value={node.address} />}
          {node.control_port && <DetailRow label="Control Port" value={node.control_port.toString()} mono />}
          {node.socks_port && <DetailRow label="SOCKS Port" value={node.socks_port.toString()} mono />}
          {node.or_port && <DetailRow label="OR Port" value={node.or_port.toString()} mono />}
          {node.dir_port && <DetailRow label="Dir Port" value={node.dir_port.toString()} mono />}
        </DetailSection>

        {/* Traffic Section */}
        <DetailSection title="Traffic" icon={HardDrive}>
          <DetailRow label="Bytes Read" value={formatBytes(node.bytes_read)} />
          <DetailRow label="Bytes Written" value={formatBytes(node.bytes_written)} />
          <DetailRow label="Total" value={formatBytes(node.bytes_read + node.bytes_written)} />
          {node.circuits_active !== undefined && (
            <DetailRow label="Active Circuits" value={node.circuits_active.toString()} />
          )}
          {bandwidth && (
            <>
              <div className="col-span-2 pt-2 border-t border-gray-700/50">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Activity size={10} style={{ color: NEON }} className="animate-pulse" />
                  Live Bandwidth
                </span>
              </div>
              <DetailRow 
                label="Current Rate" 
                value={`${formatBytes(bandwidth.avg_bytes_read + bandwidth.avg_bytes_written)}/s`} 
              />
            </>
          )}
        </DetailSection>

        {/* Hidden Service */}
        {node.node_type === 'hs' && node.hs_address && (
          <DetailSection title="Hidden Service" icon={Eye}>
            <DetailRow 
              label="Onion Address" 
              value={node.hs_address} 
              mono 
              copyable
              fullWidth
            />
            {node.hs_port && <DetailRow label="HS Port" value={node.hs_port.toString()} mono />}
          </DetailSection>
        )}

        {/* Advanced Section (collapsible) */}
        <div className="border border-gray-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-400 hover:text-white hover:bg-gray-800/30"
          >
            <span className="flex items-center gap-2">
              <Settings size={14} />
              Advanced Details
            </span>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {showAdvanced && (
            <div className="p-4 border-t border-gray-700/50 grid grid-cols-2 gap-3">
              {node.bandwidth_rate && (
                <DetailRow label="Bandwidth Rate" value={formatBytes(node.bandwidth_rate)} />
              )}
              {node.bandwidth_burst && (
                <DetailRow label="Bandwidth Burst" value={formatBytes(node.bandwidth_burst)} />
              )}
              {node.platform && (
                <DetailRow label="Platform" value={node.platform} fullWidth />
              )}
              {node.tor_version && (
                <DetailRow label="Tor Version" value={node.tor_version} />
              )}
              {node.uptime_seconds !== undefined && (
                <DetailRow 
                  label="Uptime" 
                  value={formatUptime(node.uptime_seconds)} 
                />
              )}
              {node.container_name && (
                <DetailRow label="Container" value={node.container_name} mono fullWidth />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface DetailSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const DetailSection: React.FC<DetailSectionProps> = ({ title, icon: Icon, children }) => (
  <div className="space-y-2">
    <h4 className="text-xs font-medium text-gray-400 flex items-center gap-2">
      <Icon size={12} style={{ color: NEON }} />
      {title}
    </h4>
    <div className="grid grid-cols-2 gap-3 bg-gray-800/30 rounded-lg p-3">
      {children}
    </div>
  </div>
);

interface DetailRowProps {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  fullWidth?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, mono, copyable, fullWidth }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <span className="text-xs text-gray-500">{label}</span>
      <p 
        className={`text-sm text-gray-300 truncate ${mono ? 'font-mono text-xs' : ''} ${copyable ? 'cursor-pointer hover:text-white' : ''}`}
        onClick={copyable ? handleCopy : undefined}
        title={copyable ? 'Click to copy' : value}
      >
        {value}
      </p>
    </div>
  );
};

// Helper function
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default NodesTab;