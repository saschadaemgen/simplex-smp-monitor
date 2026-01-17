/**
 * Servers - SMP & XFTP Server Management
 * =======================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Compact stats + expandable table view with drag & drop.
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
  GripVertical,
  Server,
  Wifi,
  WifiOff,
  Zap,
  FolderOpen,
  Globe,
  FlaskConical,
  Container,
  Activity,
  EyeOff,
} from 'lucide-react';
import { useServers, useCategories } from '../hooks/useApi';
import { serversApi, Server as ServerType, Category } from '../api/client';

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

// Server Type Badge
const TypeBadge: React.FC<{ type: string }> = ({ type }) => (
  <span 
    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
    style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
  >
    {type.toUpperCase()}
  </span>
);

// Hosting Mode Badge
const HostingBadge: React.FC<{ server: ServerType }> = ({ server }) => {
  if (server.is_docker_hosted) {
    if (server.hosting_mode === 'chutnex') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'rgba(34,211,238,0.2)', color: CYAN }}>🔬 ChutneX</span>;
    }
    if (server.hosting_mode === 'tor' || server.is_onion) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'rgba(168,85,247,0.2)', color: PURPLE }}>🧅 Onion</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: GREEN }}>🏠 LAN</span>;
  }
  if (server.is_onion) {
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'rgba(168,85,247,0.2)', color: PURPLE }}>🧅 Ext-Onion</span>;
  }
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'rgba(100,116,139,0.2)', color: '#94a3b8' }}>🌍 External</span>;
};

// Docker Status Badge
const DockerBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { color: string; icon: string }> = {
    not_created: { color: '#64748b', icon: '⚪' },
    created: { color: '#60a5fa', icon: '🔵' },
    starting: { color: AMBER, icon: '🟡' },
    running: { color: GREEN, icon: '🟢' },
    stopping: { color: AMBER, icon: '🟡' },
    stopped: { color: RED, icon: '🔴' },
    error: { color: RED, icon: '❌' },
  };
  const c = config[status] || config.not_created;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(100,116,139,0.2)' }}>
      <Container size={10} className="text-gray-400" />
      <span>{c.icon}</span>
    </span>
  );
};

// Online Status Badge
const OnlineStatus: React.FC<{ status: string | null; latency?: number | null }> = ({ status, latency }) => {
  if (status === 'online') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: NEON_DIM, color: NEON }}>
          <Wifi size={10} /> Online
        </span>
        {latency && <span className="text-[10px] font-mono text-gray-500">{latency}ms</span>}
      </div>
    );
  }
  if (status === 'error' || status === 'offline') {
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: RED }}>
        <WifiOff size={10} /> {status === 'error' ? 'Error' : 'Offline'}
      </span>
    );
  }
  return <span className="text-[10px] text-gray-500">Not tested</span>;
};

// Category Badge
const CategoryBadge: React.FC<{ category: Category }> = ({ category }) => (
  <span 
    className="px-1.5 py-0.5 rounded text-[10px]"
    style={{ backgroundColor: `${category.color}20`, color: category.color }}
  >
    {category.name}
  </span>
);

// Filter Button
const FilterBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}> = ({ active, onClick, children, color }) => (
  <button
    onClick={onClick}
    className="px-2 py-1 rounded text-[10px] transition-colors inline-flex items-center gap-1"
    style={active ? {
      backgroundColor: color ? `${color}33` : NEON_DIM,
      color: color || NEON,
      border: `1px solid ${color || NEON}50`,
    } : {
      backgroundColor: 'rgba(31, 41, 55, 0.3)',
      color: '#94a3b8',
      border: '1px solid transparent',
    }}
  >
    {children}
  </button>
);

// Expandable Server Row
const ServerRow: React.FC<{
  server: ServerType;
  isExpanded: boolean;
  onToggle: () => void;
  isDragging: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  isTesting: boolean;
  onTest: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  getHostDisplay: (s: ServerType) => string;
  getFingerprintDisplay: (s: ServerType) => string;
  timeAgo: (d: string | null) => string | null;
}> = ({ 
  server, isExpanded, onToggle, isDragging, showPassword, onTogglePassword,
  isTesting, onTest, onDelete, onToggleActive,
  onDragStart, onDragOver, onDragEnter, onDragLeave, onDrop, onDragEnd,
  getHostDisplay, getFingerprintDisplay, timeAgo
}) => (
  <>
    {/* Main Row */}
    <tr 
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`hover:bg-gray-800/30 transition-colors cursor-pointer ${isDragging ? 'opacity-50' : ''}`}
      onClick={onToggle}
    >
      {/* Drag Handle + Expand */}
      <td className="px-2 py-2 w-12">
        <div className="flex items-center gap-1">
          <GripVertical size={12} className="text-gray-600 cursor-grab" onClick={e => e.stopPropagation()} />
          {isExpanded ? (
            <ChevronDown size={14} style={{ color: NEON }} />
          ) : (
            <ChevronRight size={14} className="text-gray-500" />
          )}
        </div>
      </td>
      
      {/* Active + Name */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={e => { e.stopPropagation(); onToggleActive(); }}
            className="relative"
            title="Toggle Active"
          >
            {server.is_active ? (
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75" style={{ backgroundColor: NEON }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: NEON }} />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-gray-600 block" />
            )}
          </button>
          <div>
            <div className="text-sm font-medium text-white">{server.name}</div>
          </div>
        </div>
      </td>
      
      {/* Type */}
      <td className="px-2 py-2">
        <TypeBadge type={server.server_type} />
      </td>
      
      {/* Hosting */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <HostingBadge server={server} />
          {server.is_docker_hosted && <DockerBadge status={server.docker_status || 'not_created'} />}
        </div>
      </td>
      
      {/* Host */}
      <td className="px-2 py-2">
        <span className="text-[10px] font-mono text-gray-300 truncate block max-w-[150px]">
          {getHostDisplay(server)}
        </span>
      </td>
      
      {/* Status */}
      <td className="px-2 py-2">
        <OnlineStatus status={server.last_status} latency={server.last_latency} />
      </td>
      
      {/* Categories */}
      <td className="px-2 py-2">
        <div className="flex flex-wrap gap-1">
          {server.categories?.slice(0, 2).map(cat => (
            <CategoryBadge key={cat.id} category={cat} />
          ))}
          {(server.categories?.length || 0) > 2 && (
            <span className="text-[10px] text-gray-500">+{server.categories!.length - 2}</span>
          )}
        </div>
      </td>
      
      {/* Last Check */}
      <td className="px-2 py-2 text-[10px] text-gray-500">
        {timeAgo(server.last_check) || '—'}
      </td>
      
      {/* Actions */}
      <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onTest}
            disabled={isTesting}
            className="p-1 rounded hover:bg-gray-700/50 disabled:opacity-50"
            title="Test Connection"
          >
            {isTesting ? (
              <RefreshCw size={12} className="animate-spin" style={{ color: NEON }} />
            ) : (
              <Zap size={12} style={{ color: NEON }} />
            )}
          </button>
          <Link to={`/servers/${server.id}`} className="p-1 rounded hover:bg-gray-700/50" title="Details">
            <Eye size={12} style={{ color: NEON }} />
          </Link>
          <Link to={`/servers/${server.id}/edit`} className="p-1 rounded hover:bg-gray-700/50" title="Edit">
            <Pencil size={12} style={{ color: NEON }} />
          </Link>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/20" title="Delete">
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      </td>
    </tr>
    
    {/* Expanded Details Row */}
    {isExpanded && (
      <tr className="bg-gray-800/20">
        <td colSpan={9} className="px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Column 1: Identity */}
            <div className="space-y-2">
              <div className="text-gray-500 font-medium mb-1">Identity</div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="font-mono text-gray-300 text-[10px]">{server.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <TypeBadge type={server.server_type} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Active</span>
                <span style={{ color: server.is_active ? NEON : '#64748b' }}>
                  {server.is_active ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            
            {/* Column 2: Connection */}
            <div className="space-y-2">
              <div className="text-gray-500 font-medium mb-1">Connection</div>
              <div>
                <span className="text-gray-500 text-[10px]">Host</span>
                <div className="font-mono text-[10px] text-gray-300 bg-gray-800/50 px-2 py-1 rounded truncate">
                  {getHostDisplay(server)}
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-[10px]">Fingerprint</span>
                <div className="font-mono text-[10px] text-gray-300 bg-gray-800/50 px-2 py-1 rounded truncate">
                  {getFingerprintDisplay(server)}
                </div>
              </div>
            </div>
            
            {/* Column 3: Security */}
            <div className="space-y-2">
              <div className="text-gray-500 font-medium mb-1">Security</div>
              <div>
                <span className="text-gray-500 text-[10px]">Password</span>
                <div className="flex items-center gap-1">
                  <div className="flex-1 font-mono text-[10px] text-gray-300 bg-gray-800/50 px-2 py-1 rounded truncate">
                    {server.password ? (showPassword ? server.password : '••••••••') : '—'}
                  </div>
                  {server.password && (
                    <button onClick={onTogglePassword} className="p-1 text-gray-500 hover:text-gray-300">
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hosting</span>
                <HostingBadge server={server} />
              </div>
            </div>
            
            {/* Column 4: Status */}
            <div className="space-y-2">
              <div className="text-gray-500 font-medium mb-1">Status</div>
              <div className="flex justify-between">
                <span className="text-gray-500">State</span>
                <OnlineStatus status={server.last_status} latency={server.last_latency} />
              </div>
              {server.is_docker_hosted && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Docker</span>
                  <DockerBadge status={server.docker_status || 'not_created'} />
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Actions</span>
                <Link 
                  to={`/servers/${server.id}`}
                  className="flex items-center gap-1 hover:opacity-80"
                  style={{ color: NEON }}
                >
                  <Eye size={10} /> Details →
                </Link>
              </div>
            </div>
          </div>
          
          {/* Categories Row */}
          {server.categories && server.categories.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700/30">
              <span className="text-[10px] text-gray-500 mr-2">Categories:</span>
              {server.categories.map(cat => (
                <CategoryBadge key={cat.id} category={cat} />
              ))}
            </div>
          )}
        </td>
      </tr>
    )}
  </>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function Servers() {
  const { t } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [testingServer, setTestingServer] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [localServers, setLocalServers] = useState<ServerType[] | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: categoriesData } = useCategories();
  const { data: serversData, loading, refetch } = useServers({
    category: categoryFilter || undefined,
  });

  const categories = categoriesData || [];
  const servers: ServerType[] = localServers || (serversData as any)?.results || [];

  // Toggle expand
  const toggleExpand = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, serverId: number) => {
    setDraggedId(serverId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('ring-1', 'ring-cyan-500/50'); };
  const handleDragLeave = (e: React.DragEvent) => { (e.currentTarget as HTMLElement).classList.remove('ring-1', 'ring-cyan-500/50'); };
  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('ring-1', 'ring-cyan-500/50');
    if (draggedId === null || draggedId === targetId) return;
    const currentServers = [...servers];
    const draggedIndex = currentServers.findIndex(s => s.id === draggedId);
    const targetIndex = currentServers.findIndex(s => s.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;
    const [draggedServer] = currentServers.splice(draggedIndex, 1);
    currentServers.splice(targetIndex, 0, draggedServer);
    setLocalServers(currentServers);
    setDraggedId(null);
    try {
      const order = currentServers.map((s, idx) => ({ id: s.id, order: idx }));
      await fetch('/api/v1/servers/reorder/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }) });
    } catch (e) { console.error(e); }
  };
  const handleDragEnd = () => setDraggedId(null);

  // Actions
  const togglePassword = (id: number) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  
  const handleQuickTest = async (server: ServerType) => {
    setTestingServer(server.id);
    try { await serversApi.test(server.id); await refetch(); setLocalServers(null); }
    catch (e) { console.error(e); }
    finally { setTestingServer(null); }
  };

  const handleDelete = async (server: ServerType) => {
    if (!confirm(`Delete server '${server.name}'?`)) return;
    try { await serversApi.delete(server.id); setLocalServers(null); refetch(); }
    catch (e) { alert('Delete failed: ' + (e as Error).message); }
  };

  const handleToggleActive = async (server: ServerType) => {
    try { await serversApi.toggleActive(server.id); setLocalServers(null); refetch(); }
    catch (e) { console.error(e); }
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

  const getHostDisplay = (server: ServerType): string => {
    if (server.is_docker_hosted) {
      if (server.hosting_mode === 'tor' && server.onion_address) return server.onion_address;
      if (server.generated_address) {
        const match = server.generated_address.match(/@([^:]+)/);
        if (match) return `${match[1]}:${server.exposed_port || 5223}`;
      }
      return server.docker_status === 'running' ? 'Starting...' : 'Not started';
    }
    return server.host;
  };

  const getFingerprintDisplay = (server: ServerType): string => {
    if (server.is_docker_hosted && server.generated_fingerprint) return server.generated_fingerprint;
    return server.fingerprint || '—';
  };

  // Stats
  const totalServers = servers.length;
  const onlineServers = servers.filter(s => s.last_status === 'online').length;
  const offlineServers = servers.filter(s => s.last_status === 'offline' || s.last_status === 'error').length;
  const dockerServers = servers.filter(s => s.is_docker_hosted).length;
  const avgLatency = servers.filter(s => s.last_latency).reduce((sum, s) => sum + (s.last_latency || 0), 0) / Math.max(servers.filter(s => s.last_latency).length, 1);
  const smpCount = servers.filter(s => s.server_type === 'smp').length;
  const xftpCount = servers.filter(s => s.server_type === 'xftp').length;

  // Loading
  if (loading && !servers.length) {
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
            <h1 className="text-lg font-semibold text-white">{t('servers.subtitle')}</h1>
            <p className="text-[10px] text-gray-500">{t('servers.description', 'SMP & XFTP Server verwalten')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/servers/categories"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-90"
              style={{ backgroundColor: 'rgba(31,41,55,0.5)', color: NEON, border: `1px solid ${NEON}30` }}
            >
              <FolderOpen size={14} />
              {t('common.category')}
            </Link>
            <Link
              to="/servers/new"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-90"
              style={{ backgroundColor: NEON_DIM, color: NEON, border: `1px solid ${NEON}` }}
            >
              <Plus size={14} />
              {t('servers.addServer')}
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Servers */}
          <StatCard
            label="Total Servers"
            value={<span style={{ color: NEON }}>{totalServers}</span>}
            topLeft={<><Server size={10} className="inline mr-1" />SMP: <span style={{ color: CYAN }}>{smpCount}</span></>}
            topRight={<>XFTP: <span style={{ color: NEON }}>{xftpCount}</span></>}
            footer={
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Docker: {dockerServers}</span>
                <span>External: {totalServers - dockerServers}</span>
              </div>
            }
          />
          
          {/* Online Status */}
          <StatCard
            label="Online"
            value={<span style={{ color: CYAN }}>{onlineServers}/{totalServers}</span>}
            topLeft={<><Wifi size={10} className="inline mr-1" style={{ color: GREEN }} />Online: <span style={{ color: GREEN }}>{onlineServers}</span></>}
            topRight={<>Offline: <span className="text-red-400">{offlineServers}</span></>}
            footer={
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full" 
                  style={{ width: `${totalServers > 0 ? (onlineServers / totalServers) * 100 : 0}%`, backgroundColor: CYAN }}
                />
              </div>
            }
          />
          
          {/* Avg Latency */}
          <StatCard
            label="Avg Latency"
            value={avgLatency > 0 ? <>{Math.round(avgLatency)}<span className="text-sm text-gray-400">ms</span></> : '—'}
            topLeft={<><Activity size={10} className="inline mr-1" />Response</>}
            topRight={<>Tested: {servers.filter(s => s.last_latency).length}</>}
            footer={
              <div className="h-4 flex items-end gap-0.5">
                {servers.filter(s => s.last_latency).slice(0, 10).map((s, i) => {
                  const max = Math.max(...servers.filter(x => x.last_latency).map(x => x.last_latency || 0), 1);
                  return <div key={i} className="flex-1 rounded-t" style={{ height: `${Math.max(15, ((s.last_latency || 0) / max) * 100)}%`, backgroundColor: CYAN, opacity: 0.7 }} />;
                })}
              </div>
            }
          />
          
          {/* Categories */}
          <StatCard
            label="Categories"
            value={<span style={{ color: NEON }}>{categories.length}</span>}
            topLeft={<><FolderOpen size={10} className="inline mr-1" />Groups</>}
            topRight={<>Filter: {categoryFilter ? 'Active' : 'All'}</>}
            footer={
              <div className="flex gap-1 overflow-hidden">
                {categories.slice(0, 4).map((cat: Category) => (
                  <span key={cat.id} className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} title={cat.name} />
                ))}
                {categories.length > 4 && <span className="text-[10px] text-gray-500">+{categories.length - 4}</span>}
              </div>
            }
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-gray-500">{t('common.filter')}:</span>
          <FilterBtn active={categoryFilter === null} onClick={() => { setCategoryFilter(null); setLocalServers(null); }}>
            {t('common.all')} ({(serversData as any)?.count || 0})
          </FilterBtn>
          {categories.map((cat: Category) => (
            <FilterBtn 
              key={cat.id} 
              active={categoryFilter === cat.id} 
              onClick={() => { setCategoryFilter(cat.id); setLocalServers(null); }}
              color={cat.color}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.name} ({cat.server_count})
            </FilterBtn>
          ))}
          <div className="ml-auto text-[10px] text-gray-500">
            {servers.length} servers · Drag to reorder · Click row to expand
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-2 py-2 w-12"></th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '18%' }}>Server</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '8%' }}>Type</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '14%' }}>Hosting</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '16%' }}>Host</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '12%' }}>Status</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '10%' }}>Category</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '8%' }}>Checked</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-medium" style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {servers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <Server size={32} className="mx-auto mb-2 text-gray-700" />
                      <div className="text-sm text-gray-400 mb-1">{t('servers.noServers')}</div>
                      <Link to="/servers/new" className="inline-flex items-center gap-1 text-xs" style={{ color: NEON }}>
                        <Plus size={12} /> {t('servers.addServer')}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  servers.map(server => (
                    <ServerRow
                      key={server.id}
                      server={server}
                      isExpanded={expandedRows.has(server.id)}
                      onToggle={() => toggleExpand(server.id)}
                      isDragging={draggedId === server.id}
                      showPassword={showPasswords[server.id] || false}
                      onTogglePassword={() => togglePassword(server.id)}
                      isTesting={testingServer === server.id}
                      onTest={() => handleQuickTest(server)}
                      onDelete={() => handleDelete(server)}
                      onToggleActive={() => handleToggleActive(server)}
                      onDragStart={(e) => handleDragStart(e, server.id)}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, server.id)}
                      onDragEnd={handleDragEnd}
                      getHostDisplay={getHostDisplay}
                      getFingerprintDisplay={getFingerprintDisplay}
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