/**
 * NodesTab - Node Monitoring & Details (EXTENDED)
 * ================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * COMPLETE TorNode Display with ALL 34 fields:
 * - Identification (5): id, network_id, name, node_type, index
 * - Docker (2): container_id, container_name
 * - Network Config (4): control_port, socks_port, or_port, dir_port
 * - Tor Identity (3): fingerprint, v3_identity, nickname
 * - Hidden Service (3): onion_address, hs_port, hs_target_port
 * - Flags (1): flags[]
 * - Status (3): status, status_message, bootstrap_progress
 * - Traffic Capture (3): capture_enabled, capture_interface, capture_file_path
 * - Statistics (5): bytes_read, bytes_written, circuits_active, circuits_created, bandwidth_rate, bandwidth_burst
 * - Timestamps (2): started_at, uptime_seconds
 * 
 * Design: Neon Blue (#88CED0) theme
 */
import React, { useState, useMemo } from 'react';
import {
  Zap,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  Wifi,
  GitBranch,
  Terminal,
  Container,
  Fingerprint,
  FileText,
  TrendingUp,
  Network,
  Eye,
} from 'lucide-react';
import { BandwidthData } from '../../../../hooks/useTorWebSocket';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';
const DARK_NEON = '#4FA3A5';
const LIGHT_NEON = '#A5DFE1';

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

const NODE_ICONS: Record<string, string> = {
  da: '🏛️',
  guard: '🛡️',
  middle: '🔀',
  exit: '🚪',
  client: '💻',
  hs: '🧅',
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  running: { color: '#4ade80', icon: CheckCircle2, label: 'Running' },
  bootstrapping: { color: '#fbbf24', icon: Loader2, label: 'Bootstrapping' },
  stopped: { color: '#64748b', icon: XCircle, label: 'Stopped' },
  error: { color: '#f87171', icon: AlertCircle, label: 'Error' },
};

// =============================================================================
// TYPES - COMPLETE TorNode (ALL 34 fields)
// =============================================================================
export interface TorNodeData {
  // Identification (5)
  id: string;
  network_id?: string;
  name: string;
  node_type: string;
  index?: number;
  
  // Docker (2)
  container_id?: string;
  container_name?: string;
  
  // Network Config (4)
  control_port?: number;
  socks_port?: number;
  or_port?: number;
  dir_port?: number;
  address?: string;
  
  // Tor Identity (3)
  fingerprint?: string;
  v3_identity?: string;
  nickname?: string;
  
  // Hidden Service (3)
  onion_address?: string;
  hs_address?: string; // Legacy alias
  hs_port?: number;
  hs_target_port?: number;
  
  // Flags (1)
  flags?: string[];
  
  // Status (3)
  status: string;
  status_message?: string;
  bootstrap_progress: number;
  
  // Traffic Capture (3)
  capture_enabled?: boolean;
  capture_interface?: string;
  capture_file_path?: string;
  
  // Statistics (6)
  bytes_read: number;
  bytes_written: number;
  circuits_active?: number;
  circuits_created?: number;
  bandwidth_rate?: number;
  bandwidth_burst?: number;
  
  // Platform Info (2)
  platform?: string;
  tor_version?: string;
  
  // Timestamps (2)
  started_at?: string;
  uptime_seconds?: number;
}

interface NodesTabProps {
  nodes: TorNodeData[];
  bandwidth: Map<string, BandwidthData>;
  isLive: boolean;
}

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

const formatBytesPerSec = (bytes: number): string => {
  return `${formatBytes(bytes)}/s`;
};

const formatUptime = (seconds?: number): string => {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// Node Card (Grid View)
interface NodeCardProps {
  node: TorNodeData;
  bandwidth?: BandwidthData;
  isSelected: boolean;
  onClick: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, bandwidth, isSelected, onClick }) => {
  const statusConfig = STATUS_CONFIG[node.status] || STATUS_CONFIG.stopped;
  const StatusIcon = statusConfig.icon;
  const nodeColor = NODE_COLORS[node.node_type] || NEON;
  
  const totalBandwidth = (bandwidth?.bytes_read || 0) + (bandwidth?.bytes_written || 0);
  
  return (
    <div 
      className={`rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
      }`}
      style={{ 
        background: 'rgba(31, 41, 55, 0.5)',
        border: `1px solid ${isSelected ? nodeColor : 'rgba(136, 206, 208, 0.1)'}`,
        boxShadow: isSelected ? `0 0 0 2px ${nodeColor}` : 'none',
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{NODE_ICONS[node.node_type] || '📦'}</span>
          <div>
            <h4 className="text-sm font-medium text-white">{node.name}</h4>
            <p className="text-xs text-gray-500">{NODE_LABELS[node.node_type] || node.node_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StatusIcon 
            size={14} 
            style={{ color: statusConfig.color }}
            className={node.status === 'bootstrapping' ? 'animate-spin' : ''}
          />
        </div>
      </div>
      
      {/* Bootstrap Progress */}
      {node.status === 'bootstrapping' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Bootstrap</span>
            <span style={{ color: NEON }}>{node.bootstrap_progress}%</span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${node.bootstrap_progress}%`,
                backgroundColor: nodeColor,
              }}
            />
          </div>
        </div>
      )}
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-gray-800/50">
          <div className="text-gray-500">Bandwidth</div>
          <div className="font-mono" style={{ color: LIGHT_NEON }}>
            {formatBytes(totalBandwidth)}
          </div>
        </div>
        <div className="p-2 rounded bg-gray-800/50">
          <div className="text-gray-500">Circuits</div>
          <div className="font-mono" style={{ color: LIGHT_NEON }}>
            {node.circuits_active || 0}
          </div>
        </div>
      </div>
      
      {/* Ports */}
      {(node.control_port || node.socks_port) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.control_port && (
            <span className="px-2 py-0.5 text-xs rounded bg-gray-800/50 text-gray-400">
              CTRL:{node.control_port}
            </span>
          )}
          {node.socks_port && (
            <span className="px-2 py-0.5 text-xs rounded bg-gray-800/50 text-gray-400">
              SOCKS:{node.socks_port}
            </span>
          )}
          {node.or_port && (
            <span className="px-2 py-0.5 text-xs rounded bg-gray-800/50 text-gray-400">
              OR:{node.or_port}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Node Detail Panel (Expanded View with ALL fields)
interface NodeDetailPanelProps {
  node: TorNodeData;
  bandwidth?: BandwidthData;
  onClose: () => void;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ node, bandwidth, onClose }) => {
  const statusConfig = STATUS_CONFIG[node.status] || STATUS_CONFIG.stopped;
  const StatusIcon = statusConfig.icon;
  const nodeColor = NODE_COLORS[node.node_type] || NEON;
  
  const onionAddress = node.onion_address || node.hs_address;
  
  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{ 
        background: 'rgba(31, 41, 55, 0.8)',
        border: `1px solid ${nodeColor}40`,
      }}
    >
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${nodeColor}20, transparent)` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{NODE_ICONS[node.node_type] || '📦'}</span>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {node.name}
              <StatusIcon 
                size={16} 
                style={{ color: statusConfig.color }}
                className={node.status === 'bootstrapping' ? 'animate-spin' : ''}
              />
            </h3>
            <p className="text-sm text-gray-400">
              {NODE_LABELS[node.node_type]} • Index #{node.index ?? '-'}
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
      
      {/* Content Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Status Section */}
          <DetailSection title="Status" icon={Activity}>
            <DetailRow label="Status" value={statusConfig.label} color={statusConfig.color} />
            <DetailRow label="Bootstrap" value={`${node.bootstrap_progress}%`} />
            {node.status_message && (
              <DetailRow label="Message" value={node.status_message} mono />
            )}
            <DetailRow label="Uptime" value={formatUptime(node.uptime_seconds)} />
          </DetailSection>
          
          {/* Identity Section */}
          <DetailSection title="Tor Identity" icon={Fingerprint}>
            <DetailRow label="Nickname" value={node.nickname || node.name} />
            {node.fingerprint && (
              <DetailRow 
                label="Fingerprint" 
                value={node.fingerprint} 
                mono 
                copyable 
              />
            )}
            {node.v3_identity && (
              <DetailRow 
                label="V3 Identity" 
                value={node.v3_identity} 
                mono 
                copyable 
              />
            )}
            {node.flags && node.flags.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Flags</div>
                <div className="flex flex-wrap gap-1">
                  {node.flags.map((flag, i) => (
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
          </DetailSection>
          
          {/* Network Ports Section */}
          <DetailSection title="Network Ports" icon={Network}>
            <div className="grid grid-cols-2 gap-2">
              <PortBadge label="Control" port={node.control_port} color={NEON} />
              <PortBadge label="SOCKS" port={node.socks_port} color={LIGHT_NEON} />
              <PortBadge label="OR" port={node.or_port} color={DARK_NEON} />
              <PortBadge label="Dir" port={node.dir_port} color="#6BB8BA" />
            </div>
          </DetailSection>
          
          {/* Hidden Service Section */}
          {(onionAddress || node.hs_port) && (
            <DetailSection title="Hidden Service" icon={Eye}>
              {onionAddress && (
                <DetailRow 
                  label="Onion Address" 
                  value={onionAddress} 
                  mono 
                  copyable 
                />
              )}
              {node.hs_port && (
                <DetailRow label="HS Port" value={String(node.hs_port)} />
              )}
              {node.hs_target_port && (
                <DetailRow label="Target Port" value={String(node.hs_target_port)} />
              )}
            </DetailSection>
          )}
        </div>
        
        {/* Right Column */}
        <div className="space-y-4">
          {/* Traffic Statistics Section */}
          <DetailSection title="Traffic Statistics" icon={TrendingUp}>
            <DetailRow 
              label="Bytes Read" 
              value={formatBytes(node.bytes_read)} 
              color={NEON}
            />
            <DetailRow 
              label="Bytes Written" 
              value={formatBytes(node.bytes_written)} 
              color={LIGHT_NEON}
            />
            <DetailRow 
              label="Total" 
              value={formatBytes(node.bytes_read + node.bytes_written)} 
            />
            {bandwidth && (
              <>
                <div className="border-t border-gray-700/50 my-2" />
                <DetailRow 
                  label="Live Read" 
                  value={formatBytesPerSec(bandwidth.bytes_read)} 
                  color={NEON}
                />
                <DetailRow 
                  label="Live Write" 
                  value={formatBytesPerSec(bandwidth.bytes_written)} 
                  color={LIGHT_NEON}
                />
              </>
            )}
          </DetailSection>
          
          {/* Circuits Section */}
          <DetailSection title="Circuits" icon={GitBranch}>
            <DetailRow label="Active" value={String(node.circuits_active || 0)} color={NEON} />
            <DetailRow label="Created (Total)" value={String(node.circuits_created || 0)} />
          </DetailSection>
          
          {/* Bandwidth Limits Section */}
          {(node.bandwidth_rate || node.bandwidth_burst) && (
            <DetailSection title="Bandwidth Limits" icon={Zap}>
              {node.bandwidth_rate && (
                <DetailRow 
                  label="Rate Limit" 
                  value={formatBytesPerSec(node.bandwidth_rate)} 
                />
              )}
              {node.bandwidth_burst && (
                <DetailRow 
                  label="Burst Limit" 
                  value={formatBytesPerSec(node.bandwidth_burst)} 
                />
              )}
            </DetailSection>
          )}
          
          {/* Traffic Capture Section */}
          <DetailSection title="Traffic Capture" icon={FileText}>
            <DetailRow 
              label="Capture Enabled" 
              value={node.capture_enabled ? 'Yes' : 'No'} 
              color={node.capture_enabled ? NEON : '#64748b'}
            />
            {node.capture_interface && (
              <DetailRow label="Interface" value={node.capture_interface} mono />
            )}
            {node.capture_file_path && (
              <DetailRow 
                label="File Path" 
                value={node.capture_file_path} 
                mono 
                copyable 
              />
            )}
          </DetailSection>
          
          {/* Docker Section */}
          <DetailSection title="Docker Container" icon={Container}>
            {node.container_name && (
              <DetailRow label="Name" value={node.container_name} mono />
            )}
            {node.container_id && (
              <DetailRow 
                label="ID" 
                value={node.container_id.substring(0, 12)} 
                mono 
                copyable
                fullValue={node.container_id}
              />
            )}
          </DetailSection>
          
          {/* Platform Section */}
          {(node.platform || node.tor_version) && (
            <DetailSection title="Platform" icon={Terminal}>
              {node.tor_version && (
                <DetailRow label="Tor Version" value={node.tor_version} mono />
              )}
              {node.platform && (
                <DetailRow label="Platform" value={node.platform} mono />
              )}
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
};

// Detail Section Component
const DetailSection: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div className="p-3 rounded-lg bg-gray-800/30">
    <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
      <Icon size={12} style={{ color: NEON }} />
      {title}
    </h4>
    <div className="space-y-1.5">
      {children}
    </div>
  </div>
);

// Detail Row Component
const DetailRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  fullValue?: string;
  color?: string;
}> = ({ label, value, mono, copyable, fullValue, color }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-gray-500">{label}</span>
    <div className="flex items-center gap-1">
      <span 
        className={`${mono ? 'font-mono' : ''} truncate max-w-[180px]`}
        style={{ color: color || '#e5e7eb' }}
        title={fullValue || value}
      >
        {value}
      </span>
      {copyable && (
        <button 
          onClick={() => copyToClipboard(fullValue || value)}
          className="text-gray-500 hover:text-white p-0.5"
        >
          <Copy size={10} />
        </button>
      )}
    </div>
  </div>
);

// Port Badge Component
const PortBadge: React.FC<{
  label: string;
  port?: number;
  color: string;
}> = ({ label, port, color }) => (
  <div className="p-2 rounded bg-gray-900/50 text-center">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div 
      className="text-sm font-mono"
      style={{ color: port ? color : '#64748b' }}
    >
      {port || '-'}
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const NodesTab: React.FC<NodesTabProps> = ({
  nodes,
  bandwidth,
  isLive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TorNodeData | null>(null);
  
  // Filter nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!node.name.toLowerCase().includes(query) && 
            !node.node_type.toLowerCase().includes(query) &&
            !(node.fingerprint?.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (typeFilter && node.node_type !== typeFilter) return false;
      if (statusFilter && node.status !== statusFilter) return false;
      return true;
    });
  }, [nodes, searchQuery, typeFilter, statusFilter]);
  
  // Count by type
  const countByType = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach(node => {
      counts[node.node_type] = (counts[node.node_type] || 0) + 1;
    });
    return counts;
  }, [nodes]);
  
  // Count by status
  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach(node => {
      counts[node.status] = (counts[node.status] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header & Filters */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700/50 space-y-3">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes by name, type, or fingerprint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>
          
          {/* Live Indicator */}
          {isLive && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: NEON_DIM }}
            >
              <Wifi size={14} style={{ color: NEON }} />
              <span className="text-xs font-medium" style={{ color: NEON }}>Live</span>
            </div>
          )}
        </div>
        
        {/* Filter Pills */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Type Filters */}
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-gray-500 mr-1" />
            <button
              onClick={() => setTypeFilter(null)}
              className={`px-2 py-1 text-xs rounded ${
                !typeFilter ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              All ({nodes.length})
            </button>
            {Object.entries(countByType).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                  typeFilter === type ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>{NODE_ICONS[type]}</span>
                <span>{type.toUpperCase()}</span>
                <span className="text-gray-500">({count})</span>
              </button>
            ))}
          </div>
          
          {/* Status Filters */}
          <div className="flex items-center gap-1 border-l border-gray-700 pl-4">
            {Object.entries(countByStatus).map(([status, count]) => {
              const config = STATUS_CONFIG[status];
              if (!config) return null;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                    statusFilter === status ? 'bg-gray-700' : 'hover:bg-gray-800'
                  }`}
                  style={{ color: config.color }}
                >
                  <config.icon size={10} />
                  <span>{config.label}</span>
                  <span className="text-gray-500">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Node Grid */}
        <div className={`${selectedNode ? 'w-1/2' : 'w-full'} overflow-y-auto p-4 transition-all duration-300`}>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredNodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                bandwidth={bandwidth.get(node.name)}
                isSelected={selectedNode?.id === node.id}
                onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
              />
            ))}
          </div>
          
          {filteredNodes.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No nodes match your filters
            </div>
          )}
        </div>
        
        {/* Detail Panel */}
        {selectedNode && (
          <div className="w-1/2 border-l border-gray-700/50 overflow-y-auto p-4">
            <NodeDetailPanel
              node={selectedNode}
              bandwidth={bandwidth.get(selectedNode.name)}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NodesTab;