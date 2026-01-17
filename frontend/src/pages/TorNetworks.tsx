/**
 * TorNetworks - Private Tor Network Management
 * =============================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Compact stats + expandable table view for Chutney networks.
 * Design: Neon Blue (#88CED0) theme - ChutneX Style
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  Container,
  Network,
  BarChart3,
  Shield,
  Radio,
  Video,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useTorNetworks } from '../hooks/useChutney';
import { 
  torNetworksApi, 
  TorNetwork, 
  NetworkStatus, 
  NetworkTemplate,
  NetworkAction 
} from '../api/chutney';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const NEON = '#88CED0';
const NEON_BORDER = 'rgba(136, 206, 208, 0.1)';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';
const CYAN = '#22D3EE';
const RED = '#EF4444';
const AMBER = '#F59E0B';
const PURPLE = '#A855F7';
const GREEN = '#22C55E';
const BLUE = '#3B82F6';

const cardStyle = {
  background: 'rgba(31, 41, 55, 0.5)',
  border: `1px solid ${NEON_BORDER}`,
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// Multi-Info Stat Card
const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ label, value, topLeft, topRight, footer }) => (
  <div className="rounded-lg p-3 h-28 flex flex-col" style={cardStyle}>
    <div className="flex justify-between text-[10px] text-gray-500 mb-auto">
      {topLeft || <span />}
      {topRight || <span />}
    </div>
    <div className="text-center my-auto">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
    {footer && <div className="mt-auto pt-1">{footer}</div>}
  </div>
);

// Network Status Badge
const StatusBadge: React.FC<{ status: NetworkStatus }> = ({ status }) => {
  const config: Record<NetworkStatus, { bg: string; color: string; icon: string; pulse?: boolean }> = {
    not_created: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8', icon: '⚪' },
    created: { bg: 'rgba(59,130,246,0.2)', color: BLUE, icon: '🔵' },
    creating: { bg: 'rgba(59,130,246,0.2)', color: BLUE, icon: '🔵', pulse: true },
    bootstrapping: { bg: 'rgba(245,158,11,0.2)', color: AMBER, icon: '🟡', pulse: true },
    running: { bg: 'rgba(34,197,94,0.2)', color: GREEN, icon: '🟢' },
    stopping: { bg: 'rgba(245,158,11,0.2)', color: AMBER, icon: '🟡', pulse: true },
    stopped: { bg: 'rgba(239,68,68,0.2)', color: RED, icon: '🔴' },
    error: { bg: 'rgba(239,68,68,0.2)', color: RED, icon: '❌' },
  };
  const c = config[status] || config.not_created;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.pulse && <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: c.color }} />}
      {c.icon} {status.replace('_', ' ')}
    </span>
  );
};

// Template Badge
const TemplateBadge: React.FC<{ template: NetworkTemplate }> = ({ template }) => {
  const config: Record<NetworkTemplate, { bg: string; color: string }> = {
    minimal: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
    basic: { bg: 'rgba(59,130,246,0.2)', color: BLUE },
    standard: { bg: 'rgba(34,211,238,0.2)', color: CYAN },
    forensic: { bg: 'rgba(168,85,247,0.2)', color: PURPLE },
    custom: { bg: 'rgba(245,158,11,0.2)', color: AMBER },
  };
  const c = config[template] || config.basic;
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: c.bg, color: c.color }}>
      {template.charAt(0).toUpperCase() + template.slice(1)}
    </span>
  );
};

// Filter Button
const FilterBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className="px-2 py-1 rounded text-[10px] transition-colors"
    style={active ? {
      backgroundColor: NEON_DIM,
      color: NEON,
      border: `1px solid ${NEON}50`,
    } : {
      backgroundColor: 'rgba(31, 41, 55, 0.3)',
      color: '#94a3b8',
      border: '1px solid transparent',
    }}
  >
    {children}
  </button>
);

// Expandable Network Row
const NetworkRow: React.FC<{
  network: TorNetwork;
  isExpanded: boolean;
  onToggle: () => void;
  actionLoading: boolean;
  onAction: (action: NetworkAction) => void;
  onDelete: () => void;
  timeAgo: (d: string | null) => string | null;
}> = ({ network, isExpanded, onToggle, actionLoading, onAction, onDelete, timeAgo }) => {
  const status = network.status;
  const totalRelays = network.num_guard_relays + network.num_middle_relays + network.num_exit_relays;
  
  return (
    <>
      {/* Main Row */}
      <tr 
        className="hover:bg-gray-800/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        {/* Expand Icon */}
        <td className="px-2 py-2 w-8">
          {isExpanded ? (
            <ChevronDown size={14} style={{ color: NEON }} />
          ) : (
            <ChevronRight size={14} className="text-gray-500" />
          )}
        </td>
        
        {/* Running Indicator + Name */}
        <td className="px-2 py-2">
          <div className="flex items-center gap-2">
            {network.is_running ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75" style={{ backgroundColor: NEON }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: NEON }} />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-gray-600" />
            )}
            <div>
              <div className="text-sm font-medium text-white">{network.name}</div>
              {network.description && (
                <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{network.description}</div>
              )}
            </div>
          </div>
        </td>
        
        {/* Status */}
        <td className="px-2 py-2">
          <StatusBadge status={status} />
        </td>
        
        {/* Template */}
        <td className="px-2 py-2">
          <div className="flex items-center gap-1">
            <TemplateBadge template={network.template} />
            {network.capture_enabled && (
              <span className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: RED }}>
                <Video size={10} className="inline" />
              </span>
            )}
          </div>
        </td>
        
        {/* Nodes */}
        <td className="px-2 py-2">
          <div className="flex items-center gap-1 text-[10px]">
            <span className="px-1 py-0.5 rounded bg-gray-800 text-gray-300">🏛️ {network.num_directory_authorities}</span>
            <span className="px-1 py-0.5 rounded bg-gray-800 text-gray-300">🔀 {totalRelays}</span>
            <span className="px-1 py-0.5 rounded bg-gray-800 text-gray-300">💻 {network.num_clients}</span>
          </div>
        </td>
        
        {/* Running Nodes */}
        <td className="px-2 py-2 text-center">
          {network.is_running ? (
            <span className="text-xs" style={{ color: NEON }}>
              {network.running_nodes_count}/{network.total_nodes}
            </span>
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </td>
        
        {/* Consensus */}
        <td className="px-2 py-2 text-center">
          {network.is_running ? (
            network.consensus_valid ? (
              <CheckCircle size={14} style={{ color: GREEN }} className="mx-auto" />
            ) : (
              <XCircle size={14} className="text-gray-500 mx-auto" />
            )
          ) : (
            <span className="text-xs text-gray-500">—</span>
          )}
        </td>
        
        {/* Bootstrap */}
        <td className="px-2 py-2">
          {status === 'bootstrapping' ? (
            <div className="flex items-center gap-1">
              <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${network.bootstrap_progress}%`, backgroundColor: NEON }}
                />
              </div>
              <span className="text-[10px]" style={{ color: NEON }}>{network.bootstrap_progress}%</span>
            </div>
          ) : network.is_running ? (
            <span className="text-[10px]" style={{ color: GREEN }}>100%</span>
          ) : (
            <span className="text-[10px] text-gray-500">—</span>
          )}
        </td>
        
        {/* Created/Started */}
        <td className="px-2 py-2 text-[10px] text-gray-500">
          {network.started_at ? timeAgo(network.started_at) : timeAgo(network.created_at)}
        </td>
        
        {/* Actions */}
        <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {actionLoading ? (
              <RefreshCw size={12} className="animate-spin" style={{ color: NEON }} />
            ) : (
              <>
                {/* Create Infrastructure */}
                {status === 'not_created' && (
                  <button
                    onClick={() => onAction('create')}
                    className="p-1 rounded hover:bg-blue-500/20"
                    title="Create Docker Infrastructure"
                  >
                    <Container size={12} style={{ color: BLUE }} />
                  </button>
                )}
                
                {/* Start */}
                {(status === 'stopped' || status === 'created') && (
                  <button
                    onClick={() => onAction('start')}
                    className="p-1 rounded hover:bg-green-500/20"
                    title="Start Network"
                  >
                    <Play size={12} style={{ color: GREEN }} />
                  </button>
                )}
                
                {/* Stop */}
                {status === 'running' && (
                  <button
                    onClick={() => onAction('stop')}
                    className="p-1 rounded hover:bg-amber-500/20"
                    title="Stop Network"
                  >
                    <Square size={12} style={{ color: AMBER }} />
                  </button>
                )}
                
                {/* Analytics (only when running) */}
                {status === 'running' && (
                  <Link
                    to={`/tor-networks/${network.id}/analytics`}
                    className="p-1 rounded hover:bg-gray-700/50"
                    title="Analytics"
                  >
                    <BarChart3 size={12} style={{ color: NEON }} />
                  </Link>
                )}
                
                {/* Details */}
                <Link
                  to={`/tor-networks/${network.id}`}
                  className="p-1 rounded hover:bg-gray-700/50"
                  title="Details"
                >
                  <Eye size={12} style={{ color: NEON }} />
                </Link>
                
                {/* Edit */}
                <Link
                  to={`/tor-networks/${network.id}/edit`}
                  className="p-1 rounded hover:bg-gray-700/50"
                  title="Edit"
                >
                  <Pencil size={12} style={{ color: NEON }} />
                </Link>
                
                {/* Delete */}
                <button
                  onClick={onDelete}
                  className="p-1 rounded hover:bg-red-500/20"
                  title="Delete"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      
      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="bg-gray-800/20">
          <td colSpan={10} className="px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {/* Column 1: Identity */}
              <div className="space-y-2">
                <div className="text-gray-500 font-medium mb-1">Identity</div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID</span>
                  <span className="font-mono text-gray-300 text-[10px]">{network.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slug</span>
                  <span className="font-mono text-gray-300">{network.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Template</span>
                  <TemplateBadge template={network.template} />
                </div>
              </div>
              
              {/* Column 2: Nodes */}
              <div className="space-y-2">
                <div className="text-gray-500 font-medium mb-1">Nodes Configuration</div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Directory Auth</span>
                  <span style={{ color: NEON }}>{network.num_directory_authorities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Guard Relays</span>
                  <span style={{ color: NEON }}>{network.num_guard_relays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Middle Relays</span>
                  <span style={{ color: NEON }}>{network.num_middle_relays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Exit Relays</span>
                  <span style={{ color: NEON }}>{network.num_exit_relays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Clients</span>
                  <span style={{ color: NEON }}>{network.num_clients}</span>
                </div>
              </div>
              
              {/* Column 3: Status */}
              <div className="space-y-2">
                <div className="text-gray-500 font-medium mb-1">Runtime Status</div>
                <div className="flex justify-between">
                  <span className="text-gray-500">State</span>
                  <StatusBadge status={status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Running Nodes</span>
                  <span style={{ color: network.is_running ? NEON : '#64748b' }}>
                    {network.is_running ? `${network.running_nodes_count}/${network.total_nodes}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Consensus</span>
                  <span style={{ color: network.consensus_valid ? GREEN : '#64748b' }}>
                    {network.is_running ? (network.consensus_valid ? '✓ Valid' : '✗ Invalid') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capture</span>
                  <span style={{ color: network.capture_enabled ? RED : '#64748b' }}>
                    {network.capture_enabled ? '📹 Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              {/* Column 4: Timestamps & Actions */}
              <div className="space-y-2">
                <div className="text-gray-500 font-medium mb-1">Timestamps</div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-300">{timeAgo(network.created_at) || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Started</span>
                  <span className="text-gray-300">{timeAgo(network.started_at) || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Actions</span>
                  <Link 
                    to={`/tor-networks/${network.id}`}
                    className="flex items-center gap-1 hover:opacity-80"
                    style={{ color: NEON }}
                  >
                    <Eye size={10} /> Details →
                  </Link>
                </div>
                {status === 'running' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Analytics</span>
                    <Link 
                      to={`/tor-networks/${network.id}/analytics`}
                      className="flex items-center gap-1 hover:opacity-80"
                      style={{ color: NEON }}
                    >
                      <BarChart3 size={10} /> Open →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function TorNetworks() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<NetworkStatus | ''>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const { data: networksData, loading, refetch } = useTorNetworks(
    statusFilter ? { status: statusFilter } : undefined
  );
  
  const networks: TorNetwork[] = networksData?.results || [];

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Actions
  const handleAction = async (network: TorNetwork, action: NetworkAction) => {
    if (action === 'delete' && !confirm(t('chutney.confirmDelete', `Delete network '${network.name}'?`))) return;
    setActionLoading(network.id);
    try {
      await torNetworksApi.action(network.id, action);
      await refetch();
    } catch (err) {
      alert(`Action failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (network: TorNetwork) => {
    if (!confirm(t('chutney.confirmDeleteFull', `Delete network '${network.name}'? This will remove all containers and data.`))) return;
    setActionLoading(network.id);
    try {
      await torNetworksApi.delete(network.id);
      await refetch();
    } catch (err) {
      alert(`Delete failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Helpers
  const timeAgo = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  // Stats
  const totalNetworks = networks.length;
  const runningNetworks = networks.filter(n => n.status === 'running').length;
  const stoppedNetworks = networks.filter(n => n.status === 'stopped').length;
  const errorNetworks = networks.filter(n => n.status === 'error').length;
  const totalNodes = networks.reduce((sum, n) => sum + n.total_nodes, 0);
  const runningNodes = networks.reduce((sum, n) => sum + (n.running_nodes_count || 0), 0);
  const withCapture = networks.filter(n => n.capture_enabled).length;
  const withConsensus = networks.filter(n => n.consensus_valid).length;

  // Filter options
  const statusOptions: { value: NetworkStatus | ''; label: string }[] = [
    { value: '', label: t('common.all', 'All') },
    { value: 'running', label: '🟢 Running' },
    { value: 'stopped', label: '🔴 Stopped' },
    { value: 'bootstrapping', label: '🟡 Bootstrap' },
    { value: 'error', label: '❌ Error' },
  ];

  // Loading
  if (loading && !networks.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw size={24} className="animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              🧅 {t('chutney.title', 'Private Tor Networks')}
            </h1>
            <p className="text-[10px] text-gray-500">{t('chutney.subtitle', 'Chutney-based test networks for traffic analysis')}</p>
          </div>
          <Link
            to="/tor-networks/new"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-90"
            style={{ backgroundColor: NEON_DIM, color: NEON, border: `1px solid ${NEON}` }}
          >
            <Plus size={14} />
            {t('chutney.createNetwork', 'Create Network')}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Networks */}
          <StatCard
            label="Networks"
            value={<span style={{ color: NEON }}>{totalNetworks}</span>}
            topLeft={<><Network size={10} className="inline mr-1" />Running: <span style={{ color: GREEN }}>{runningNetworks}</span></>}
            topRight={<>Stopped: <span className="text-red-400">{stoppedNetworks}</span></>}
            footer={
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Error: {errorNetworks}</span>
                <span>Filter: {statusFilter || 'All'}</span>
              </div>
            }
          />
          
          {/* Nodes */}
          <StatCard
            label="Total Nodes"
            value={<span style={{ color: NEON }}>{totalNodes}</span>}
            topLeft={<><Radio size={10} className="inline mr-1" />Running: <span style={{ color: GREEN }}>{runningNodes}</span></>}
            topRight={<>Configured</>}
            footer={
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ width: `${totalNodes > 0 ? (runningNodes / totalNodes) * 100 : 0}%`, backgroundColor: CYAN }}
                />
              </div>
            }
          />
          
          {/* Consensus */}
          <StatCard
            label="Consensus"
            value={<span style={{ color: withConsensus > 0 ? GREEN : '#64748b' }}>{withConsensus}/{runningNetworks}</span>}
            topLeft={<><Shield size={10} className="inline mr-1" />Valid</>}
            topRight={<>Networks</>}
            footer={
              <div className="flex justify-center gap-1">
                {networks.slice(0, 8).map(n => (
                  <span 
                    key={n.id} 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: n.consensus_valid ? GREEN : n.is_running ? AMBER : '#374151' }}
                    title={n.name}
                  />
                ))}
              </div>
            }
          />
          
          {/* Capture */}
          <StatCard
            label="Capture"
            value={<span style={{ color: withCapture > 0 ? RED : '#64748b' }}>{withCapture}</span>}
            topLeft={<><Video size={10} className="inline mr-1" style={{ color: RED }} />Recording</>}
            topRight={<>Networks</>}
            footer={
              <div className="text-[10px] text-center" style={{ color: withCapture > 0 ? RED : '#64748b' }}>
                {withCapture > 0 ? '📹 Active capture sessions' : 'No active captures'}
              </div>
            }
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{t('common.filter', 'Filter')}:</span>
          {statusOptions.map(opt => (
            <FilterBtn 
              key={opt.value || 'all'} 
              active={statusFilter === opt.value} 
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </FilterBtn>
          ))}
          <div className="ml-auto text-[10px] text-gray-500">
            {networks.length} networks · Click row to expand
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-2 py-2 w-8"></th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '18%' }}>Network</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '10%' }}>Status</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '12%' }}>Template</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '18%' }}>Nodes</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '8%' }}>Running</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '8%' }}>Cons.</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '10%' }}>Bootstrap</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '8%' }}>Age</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-medium" style={{ width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {networks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <div className="text-4xl mb-2">🧅</div>
                      <div className="text-sm text-gray-400 mb-1">{t('chutney.noNetworks', 'No Private Tor Networks')}</div>
                      <Link to="/tor-networks/new" className="inline-flex items-center gap-1 text-xs" style={{ color: NEON }}>
                        <Plus size={12} /> {t('chutney.createNetwork', 'Create Network')}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  networks.map(network => (
                    <NetworkRow
                      key={network.id}
                      network={network}
                      isExpanded={expandedRows.has(network.id)}
                      onToggle={() => toggleExpand(network.id)}
                      actionLoading={actionLoading === network.id}
                      onAction={(action) => handleAction(network, action)}
                      onDelete={() => handleDelete(network)}
                      timeAgo={timeAgo}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}