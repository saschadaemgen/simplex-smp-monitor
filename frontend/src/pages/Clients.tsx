/**
 * Clients - SimpleX Client Management
 * ====================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Compact stats + expandable table view.
 * Design: Neon Blue (#88CED0) theme - ChutneX Style
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Plus,
  Eye,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Wifi,
  ChevronDown,
  ChevronRight,
  Globe,
  FlaskConical,
  Link as LinkIcon,
  Users,
  Activity,
  Server,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { simplexClientsApi, SimplexClient, ClientStats, ClientListResponse } from '../api/client';
import { useClientsWebSocket } from '../hooks/useWebSocket';

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

const cardStyle = {
  background: 'rgba(31, 41, 55, 0.5)',
  border: `1px solid ${NEON_BORDER}`,
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// Multi-Info Stat Card (wie TestRunHistory)
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

// Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; color: string; pulse?: boolean }> = {
    running: { bg: 'rgba(34,211,238,0.2)', color: CYAN, pulse: true },
    stopped: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
    error: { bg: 'rgba(239,68,68,0.2)', color: RED },
    starting: { bg: 'rgba(245,158,11,0.2)', color: AMBER, pulse: true },
    stopping: { bg: 'rgba(245,158,11,0.2)', color: AMBER, pulse: true },
  };
  const c = config[status] || config.stopped;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.pulse && <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: c.color }} />}
      {status}
    </span>
  );
};

// Connection Mode Badge (compact)
const ModeBadge: React.FC<{ mode: string }> = ({ mode }) => {
  const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    direct: { icon: <Globe size={10} />, label: 'Direct', color: '#94a3b8' },
    public_tor: { icon: <span className="text-[10px]">🧅</span>, label: 'Tor', color: PURPLE },
    chutnex_internal: { icon: <FlaskConical size={10} />, label: 'ChutneX', color: CYAN },
    chutnex_external: { icon: <LinkIcon size={10} />, label: 'External', color: AMBER },
  };
  const c = config[mode] || config.direct;
  return (
    <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: c.color }}>
      {c.icon} {c.label}
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

// Expandable Table Row
const ClientRow: React.FC<{
  client: SimplexClient;
  isExpanded: boolean;
  onToggle: () => void;
  actionLoading: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}> = ({ client, isExpanded, onToggle, actionLoading, onStart, onStop, onRestart, onDelete, t }) => (
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
      
      {/* Status Dot + Name */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: client.status === 'running' ? CYAN : client.status === 'error' ? RED : '#64748b' }}
            />
            {client.status === 'running' && (
              <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75" style={{ backgroundColor: CYAN }} />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{client.name}</div>
            <div className="text-[10px] text-gray-500">{client.slug}</div>
          </div>
        </div>
      </td>
      
      {/* Profile */}
      <td className="px-2 py-2">
        <span className="text-xs font-mono text-gray-300">{client.profile_name}</span>
      </td>
      
      {/* Port */}
      <td className="px-2 py-2 text-center">
        <span className="text-xs font-mono" style={{ color: NEON }}>{client.websocket_port}</span>
      </td>
      
      {/* Status */}
      <td className="px-2 py-2">
        <StatusBadge status={client.status} />
      </td>
      
      {/* Connections */}
      <td className="px-2 py-2 text-center">
        <span className="text-xs text-white">{client.connection_count}</span>
      </td>
      
      {/* Messages */}
      <td className="px-2 py-2 text-center">
        <span className="text-[10px]">
          <span style={{ color: NEON }}>↑{client.messages_sent}</span>
          <span className="text-gray-600 mx-0.5">/</span>
          <span style={{ color: NEON }}>↓{client.messages_received}</span>
        </span>
      </td>
      
      {/* Mode */}
      <td className="px-2 py-2">
        <ModeBadge mode={client.connection_mode} />
      </td>
      
      {/* Actions */}
      <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {actionLoading ? (
            <RefreshCw size={12} className="animate-spin text-gray-400" />
          ) : (
            <>
              <Link
                to={`/clients/${client.id}`}
                className="p-1 rounded hover:bg-gray-700/50"
                title={t('common.details')}
              >
                <Eye size={12} style={{ color: NEON }} />
              </Link>
              {client.status === 'running' ? (
                <>
                  <button onClick={onRestart} className="p-1 rounded hover:bg-amber-500/20" title={t('clients.restart')}>
                    <RefreshCw size={12} className="text-amber-400" />
                  </button>
                  <button onClick={onStop} className="p-1 rounded hover:bg-red-500/20" title={t('clients.stop')}>
                    <Square size={12} className="text-red-400" />
                  </button>
                </>
              ) : (
                <button onClick={onStart} className="p-1 rounded hover:bg-cyan-500/20" title={t('clients.start')}>
                  <Play size={12} style={{ color: NEON }} />
                </button>
              )}
              <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/20" title={t('common.delete')}>
                <Trash2 size={12} className="text-gray-400 hover:text-red-400" />
              </button>
            </>
          )}
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
                <span className="font-mono text-gray-300 text-[10px]">{client.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Slug</span>
                <span className="font-mono text-gray-300">{client.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Profile</span>
                <span className="text-white">{client.profile_name}</span>
              </div>
            </div>
            
            {/* Column 2: Network */}
            <div className="space-y-2">
              <div className="text-gray-500 font-medium mb-1">Network</div>
              <div className="flex justify-between">
                <span className="text-gray-500">WS Port</span>
                <span className="font-mono" style={{ color: NEON }}>{client.websocket_port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mode</span>
                <ModeBadge mode={client.connection_mode} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Connections</span>
                <span className="text-white">{client.connection_count}</span>
              </div>
            </div>
            
            {/* Column 3: Messages */}
            <div className="space-y-2">
              <div className="text-gray-500 font-medium mb-1">Messages</div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sent</span>
                <span style={{ color: NEON }}>↑ {client.messages_sent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Received</span>
                <span style={{ color: NEON }}>↓ {client.messages_received}</span>
              </div>
              {client.delivery_success_rate > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Success</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ width: `${client.delivery_success_rate}%`, backgroundColor: CYAN }}
                      />
                    </div>
                    <span style={{ color: NEON }}>{client.delivery_success_rate.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Column 4: Status */}
            <div className="space-y-2">
              <div className="text-gray-500 font-medium mb-1">Status</div>
              <div className="flex justify-between">
                <span className="text-gray-500">State</span>
                <StatusBadge status={client.status} />
              </div>
              {client.uptime_display && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Uptime</span>
                  <span style={{ color: NEON }}>{client.uptime_display}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Actions</span>
                <Link 
                  to={`/clients/${client.id}`}
                  className="flex items-center gap-1 hover:opacity-80"
                  style={{ color: NEON }}
                >
                  <Eye size={10} /> Details →
                </Link>
              </div>
            </div>
          </div>
        </td>
      </tr>
    )}
  </>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function Clients() {
  const { t } = useTranslation();
  const { data: clientsData, loading, refetch } = useApi<ClientListResponse>(() => simplexClientsApi.list());
  const { data: stats } = useApi<ClientStats>(() => simplexClientsApi.stats());
  
  const [clients, setClients] = useState<SimplexClient[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // WebSocket
  const { connectionState, bridgeClients } = useClientsWebSocket({
    onClientStats: (event) => {
      setClients(prev => prev.map(c => 
        c.slug === event.client_slug 
          ? { ...c, messages_sent: event.messages_sent, messages_received: event.messages_received }
          : c
      ));
    },
    onClientStatus: (event) => {
      setClients(prev => prev.map(c => 
        c.slug === event.client_slug 
          ? { ...c, status: event.status as SimplexClient['status'] } 
          : c
      ));
    },
  });

  useEffect(() => {
    if (clientsData?.results) setClients(clientsData.results);
  }, [clientsData]);

  const filteredClients = statusFilter === 'all' 
    ? clients 
    : clients.filter(c => c.status === statusFilter);

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
  const handleStart = async (client: SimplexClient) => {
    setActionLoading(client.id);
    try { await simplexClientsApi.start(client.id); refetch(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleStop = async (client: SimplexClient) => {
    setActionLoading(client.id);
    try { await simplexClientsApi.stop(client.id); refetch(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleRestart = async (client: SimplexClient) => {
    setActionLoading(client.id);
    try { await simplexClientsApi.restart(client.id); refetch(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (client: SimplexClient) => {
    if (!confirm(`${t('common.confirm')}: ${client.name}?`)) return;
    setActionLoading(client.id);
    try { await simplexClientsApi.delete(client.id); refetch(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  // Calculate stats
  const totalMessages = (stats?.total_messages_sent || 0) + (stats?.total_messages_received || 0);
  const avgSuccessRate = clients.length > 0
    ? clients.filter(c => c.delivery_success_rate > 0).reduce((sum, c) => sum + c.delivery_success_rate, 0) / 
      Math.max(clients.filter(c => c.delivery_success_rate > 0).length, 1)
    : 0;
  const totalConnections = clients.reduce((sum, c) => sum + c.connection_count, 0);

  // Loading
  if (loading && !clients.length) {
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
            <h1 className="text-lg font-semibold text-white">{t('clients.title')}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Wifi 
                size={12} 
                className={connectionState === 'connecting' ? 'animate-pulse' : ''}
                style={{ color: connectionState === 'connected' ? NEON : '#64748b' }}
              />
              <span className="text-[10px]" style={{ color: connectionState === 'connected' ? NEON : '#94a3b8' }}>
                {connectionState === 'connected' ? `Live · ${bridgeClients} Bridge` : connectionState}
              </span>
            </div>
          </div>
          <Link
            to="/clients/new"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-90"
            style={{ backgroundColor: NEON_DIM, color: NEON, border: `1px solid ${NEON}` }}
          >
            <Plus size={14} />
            {t('clients.newClient')}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Clients */}
          <StatCard
            label="Total Clients"
            value={<span style={{ color: NEON }}>{stats?.total || 0}</span>}
            topLeft={<><Server size={10} className="inline mr-1" />Running: <span style={{ color: CYAN }}>{stats?.running || 0}</span></>}
            topRight={<>Error: <span className="text-red-400">{stats?.error || 0}</span></>}
            footer={
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Stopped: {stats?.stopped || 0}</span>
                <span>Filter: {statusFilter}</span>
              </div>
            }
          />
          
          {/* Messages */}
          <StatCard
            label="Messages"
            value={<span style={{ color: NEON }}>{totalMessages.toLocaleString()}</span>}
            topLeft={<>↑ Sent: <span style={{ color: NEON }}>{stats?.total_messages_sent || 0}</span></>}
            topRight={<>↓ Recv: <span style={{ color: NEON }}>{stats?.total_messages_received || 0}</span></>}
            footer={
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
                <div 
                  className="h-full" 
                  style={{ 
                    width: `${totalMessages > 0 ? ((stats?.total_messages_sent || 0) / totalMessages) * 100 : 50}%`,
                    backgroundColor: CYAN 
                  }} 
                />
                <div 
                  className="h-full" 
                  style={{ 
                    width: `${totalMessages > 0 ? ((stats?.total_messages_received || 0) / totalMessages) * 100 : 50}%`,
                    backgroundColor: NEON 
                  }} 
                />
              </div>
            }
          />
          
          {/* Connections */}
          <StatCard
            label="Connections"
            value={<span style={{ color: NEON }}>{totalConnections}</span>}
            topLeft={<><Users size={10} className="inline mr-1" />Active</>}
            topRight={<>Clients: {clients.length}</>}
            footer={
              avgSuccessRate > 0 ? (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Avg Success</span>
                  <span style={{ color: NEON }}>{avgSuccessRate.toFixed(1)}%</span>
                </div>
              ) : (
                <div className="text-[10px] text-gray-500 text-center">—</div>
              )
            }
          />
          
          {/* Live Status */}
          <StatCard
            label="Live Status"
            value={
              connectionState === 'connected' ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: NEON }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: NEON }} />
                  </span>
                  <span style={{ color: NEON }}>LIVE</span>
                </div>
              ) : (
                <span className="text-gray-500">Offline</span>
              )
            }
            topLeft={<><Activity size={10} className="inline mr-1" />WebSocket</>}
            topRight={<>Bridge: {bridgeClients}</>}
            footer={
              stats?.available_ports && stats.available_ports.length > 0 ? (
                <div className="text-[10px] text-gray-500 truncate">
                  Free: <span style={{ color: NEON }}>{stats.available_ports.slice(0, 3).join(', ')}</span>
                </div>
              ) : null
            }
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{t('common.filter')}:</span>
          <FilterBtn active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>{t('common.all')}</FilterBtn>
          <FilterBtn active={statusFilter === 'running'} onClick={() => setStatusFilter('running')}>{t('common.active')}</FilterBtn>
          <FilterBtn active={statusFilter === 'stopped'} onClick={() => setStatusFilter('stopped')}>{t('status.stopped')}</FilterBtn>
          <FilterBtn active={statusFilter === 'error'} onClick={() => setStatusFilter('error')}>{t('status.error')}</FilterBtn>
          
          <div className="ml-auto text-[10px] text-gray-500">
            {filteredClients.length} of {clients.length} · Click row to expand
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-2 py-2 w-8"></th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '20%' }}>Client</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '12%' }}>Profile</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '8%' }}>Port</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '10%' }}>Status</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '8%' }}>Conn</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '12%' }}>Messages</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '10%' }}>Mode</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-medium" style={{ width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center">
                      <Users size={32} className="mx-auto mb-2 text-gray-700" />
                      <div className="text-sm text-gray-400 mb-1">{t('clients.noClients')}</div>
                      <Link
                        to="/clients/new"
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: NEON }}
                      >
                        <Plus size={12} /> {t('clients.addClient')}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(client => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      isExpanded={expandedRows.has(client.id)}
                      onToggle={() => toggleExpand(client.id)}
                      actionLoading={actionLoading === client.id}
                      onStart={() => handleStart(client)}
                      onStop={() => handleStop(client)}
                      onRestart={() => handleRestart(client)}
                      onDelete={() => handleDelete(client)}
                      t={t}
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