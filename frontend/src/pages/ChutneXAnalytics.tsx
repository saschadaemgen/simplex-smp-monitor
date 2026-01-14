/**
 * SimpleX SMP Monitor - ChutneX Analytics Dashboard
 * =================================================
 * Copyright (c) 2025 cannatoshi
 * 
 * Live visualization for private Tor networks.
 * 
 * Features:
 * - Network overview stats (traffic, circuits, nodes, consensus)
 * - Bandwidth chart per node type
 * - Active circuits table with path visualization
 * - Node stats grid with bootstrap progress
 * - Auto-refresh with 5 second interval
 * 
 * Integrates with:
 * - analyticsApi for REST endpoints
 * - TorControlService via backend
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { torNetworksApi, TorNetwork } from '../api/chutney';
import { analyticsApi } from '../api/chutney_analytics';
import type { NetworkAnalytics, CircuitInfo, NodeStats } from '../api/chutney_analytics';

// =============================================================================
// DESIGN SYSTEM
// =============================================================================

const neonBlue = '#88CED0';
const cyan = '#22D3EE';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function getNodeTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    da: '🏛️',
    guard: '🛡️',
    middle: '🔄',
    exit: '🚪',
    client: '💻',
    hs: '🧅',
  };
  return icons[type] || '📦';
}

function getNodeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    da: '#F59E0B',
    guard: '#10B981',
    middle: '#3B82F6',
    exit: '#EF4444',
    client: '#8B5CF6',
    hs: '#EC4899',
  };
  return colors[type] || '#6B7280';
}

// =============================================================================
// STATUS BADGE COMPONENT
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    running: { bg: 'bg-green-900/30', text: 'text-green-400', label: '🟢 Running' },
    stopped: { bg: 'bg-red-900/30', text: 'text-red-400', label: '🔴 Stopped' },
    bootstrapping: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: '🟡 Bootstrapping' },
    error: { bg: 'bg-red-900/30', text: 'text-red-400', label: '❌ Error' },
    BUILT: { bg: 'bg-green-900/30', text: 'text-green-400', label: '✓ Built' },
    LAUNCHED: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: '○ Launched' },
    FAILED: { bg: 'bg-red-900/30', text: 'text-red-400', label: '✗ Failed' },
    CLOSED: { bg: 'bg-slate-700', text: 'text-slate-400', label: '— Closed' },
  };
  
  const cfg = config[status] || { bg: 'bg-slate-700', text: 'text-slate-400', label: status };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  color = neonBlue,
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-slate-800">
          {icon}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BANDWIDTH BAR CHART
// =============================================================================

function BandwidthChart({ 
  data 
}: { 
  data: Record<string, { bytes_read: number; bytes_written: number; node_count: number }> 
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No bandwidth data available
      </div>
    );
  }
  
  const maxBytes = Math.max(
    ...entries.map(([_, d]) => d.bytes_read + d.bytes_written)
  );
  
  return (
    <div className="space-y-4">
      {entries.map(([nodeType, stats]) => {
        const total = stats.bytes_read + stats.bytes_written;
        const percentage = maxBytes > 0 ? (total / maxBytes) * 100 : 0;
        const readPercentage = total > 0 ? (stats.bytes_read / total) * 100 : 50;
        
        return (
          <div key={nodeType} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{getNodeTypeIcon(nodeType)}</span>
                <span className="text-slate-300 font-medium uppercase">{nodeType}</span>
                <span className="text-slate-500 text-xs">({stats.node_count} nodes)</span>
              </div>
              <span style={{ color: neonBlue }} className="font-mono">
                {formatBytes(total)}
              </span>
            </div>
            <div className="h-6 bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${percentage * (readPercentage / 100)}%`,
                  backgroundColor: getNodeTypeColor(nodeType),
                  opacity: 0.8,
                }}
                title={`Read: ${formatBytes(stats.bytes_read)}`}
              />
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${percentage * ((100 - readPercentage) / 100)}%`,
                  backgroundColor: getNodeTypeColor(nodeType),
                  opacity: 0.5,
                }}
                title={`Write: ${formatBytes(stats.bytes_written)}`}
              />
            </div>
          </div>
        );
      })}
      
      <div className="flex items-center justify-center gap-6 pt-2 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: cyan, opacity: 0.8 }}></div>
          <span>Read</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: cyan, opacity: 0.5 }}></div>
          <span>Write</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CIRCUITS TABLE
// =============================================================================

function CircuitsTable({ circuits }: { circuits: CircuitInfo[] }) {
  if (circuits.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No active circuits
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-800">
            <th className="pb-2 font-medium">Circuit ID</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Purpose</th>
            <th className="pb-2 font-medium">Path</th>
            <th className="pb-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {circuits.slice(0, 10).map((circuit, idx) => (
            <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
              <td className="py-2 font-mono text-slate-300">{circuit.circuit_id}</td>
              <td className="py-2"><StatusBadge status={circuit.status} /></td>
              <td className="py-2 text-slate-400">{circuit.purpose}</td>
              <td className="py-2">
                <div className="flex items-center gap-1">
                  {circuit.path.map((hop, i) => (
                    <span key={i} className="flex items-center">
                      <span 
                        className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{ backgroundColor: `${cyan}20`, color: cyan }}
                        title={hop.fingerprint}
                      >
                        {hop.nickname}
                      </span>
                      {i < circuit.path.length - 1 && (
                        <span className="text-slate-600 mx-1">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-2 text-slate-500 text-xs">{circuit.source_node || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {circuits.length > 10 && (
        <p className="text-center text-slate-500 text-xs mt-2">
          Showing 10 of {circuits.length} circuits
        </p>
      )}
    </div>
  );
}

// =============================================================================
// NODE STATS GRID
// =============================================================================

function NodeStatsGrid({ nodes }: { nodes: NodeStats[] }) {
  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No node stats available
      </div>
    );
  }
  
  const byType = nodes.reduce((acc, node) => {
    const type = node.node_type as string;
    if (!acc[type]) acc[type] = [];
    acc[type].push(node);
    return acc;
  }, {} as Record<string, NodeStats[]>);
  
  return (
    <div className="space-y-6">
      {Object.entries(byType).map(([type, typeNodes]) => (
        <div key={type}>
          <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            {getNodeTypeIcon(type)}
            <span className="uppercase">{type}</span>
            <span className="text-slate-600">({typeNodes.length})</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {typeNodes.map((node) => (
              <div 
                key={node.node_id}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-medium text-sm">{node.node_name}</span>
                  <span className="text-xs text-slate-500">{formatUptime(node.uptime)}</span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Bootstrap</span>
                    <span style={{ color: neonBlue }}>{node.bootstrap_progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${node.bootstrap_progress}%`,
                        backgroundColor: node.bootstrap_progress === 100 ? '#10B981' : cyan,
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">↓ Read</span>
                    <p className="text-slate-300 font-mono">{formatBytes(node.bytes_read)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">↑ Write</span>
                    <p className="text-slate-300 font-mono">{formatBytes(node.bytes_written)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// CONSENSUS INFO CARD
// =============================================================================

function ConsensusCard({ consensus }: { consensus: NetworkAnalytics['consensus'] }) {
  if (!consensus) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <h3 className="font-semibold text-slate-400 mb-4">🗳️ Consensus</h3>
        <div className="text-center py-4 text-slate-500">
          No consensus data available
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: neonBlue }}>🗳️ Consensus</h3>
        <StatusBadge status={consensus.valid ? 'running' : 'error'} />
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Tor Version</span>
          <span className="text-slate-300 font-mono text-xs">{consensus.tor_version}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Source DA</span>
          <span className="text-slate-300">{consensus.source_da}</span>
        </div>
        {consensus.valid_after && (
          <div className="flex justify-between">
            <span className="text-slate-500">Valid After</span>
            <span className="text-slate-300 text-xs">{consensus.valid_after}</span>
          </div>
        )}
        {consensus.fresh_until && (
          <div className="flex justify-between">
            <span className="text-slate-500">Fresh Until</span>
            <span className="text-slate-300 text-xs">{consensus.fresh_until}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ChutneXAnalytics() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  
  const [network, setNetwork] = useState<TorNetwork | null>(null);
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const fetchNetwork = useCallback(async () => {
    if (!id) return;
    try {
      const data = await torNetworksApi.get(id);
      setNetwork(data);
    } catch (err) {
      console.error('Failed to fetch network:', err);
    }
  }, [id]);
  
  const fetchAnalytics = useCallback(async () => {
    if (!id) return;
    
    try {
      const data = await analyticsApi.getNetworkAnalytics(id);
      setAnalytics(data);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchNetwork();
    fetchAnalytics();
  }, [fetchNetwork, fetchAnalytics]);
  
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);
  
  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: neonBlue }}
        />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link 
              to="/chutney" 
              className="text-slate-500 hover:text-slate-300 text-sm inline-flex items-center gap-1 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              ChutneX Networks
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: neonBlue }}>
              📊 Network Analytics
            </h1>
          </div>
        </div>
        
        <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-6 text-center">
          <p className="text-amber-400 text-lg mb-2">⚠️ {error}</p>
          <p className="text-amber-300 text-sm mb-4">
            Analytics are only available for running networks.
          </p>
          <Link 
            to={`/chutney/${id}`}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: neonBlue, color: 'white' }}
          >
            Go to Network Details
          </Link>
        </div>
      </div>
    );
  }
  
  if (!analytics) {
    return (
      <div className="text-center py-12 text-slate-500">
        No analytics data available
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            to="/chutney" 
            className="text-slate-500 hover:text-slate-300 text-sm inline-flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            ChutneX Networks
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: neonBlue }}>
            📊 {analytics.network_name} - Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Live forensic data from private Tor network
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 bg-slate-800 border-slate-600"
            />
            <span className="text-slate-400">Auto-refresh</span>
          </label>
          
          <div className="text-sm text-slate-500">
            Last update: <span style={{ color: neonBlue }}>{lastUpdate.toLocaleTimeString()}</span>
          </div>
          
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" style={{ color: neonBlue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
          
          <Link
            to={`/chutney/${id}`}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            ← Network Detail
          </Link>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Traffic"
          value={formatBytes(analytics.summary.total_bytes)}
          subtitle={`${analytics.bandwidth.nodes_reporting} nodes reporting`}
          icon={
            <svg className="w-6 h-6" style={{ color: neonBlue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
          }
        />
        
        <StatCard
          title="Active Circuits"
          value={analytics.summary.active_circuits}
          subtitle={`${analytics.circuits.total_circuits} total`}
          color={cyan}
          icon={
            <svg className="w-6 h-6" style={{ color: cyan }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          }
        />
        
        <StatCard
          title="Nodes Running"
          value={`${analytics.nodes.running}/${analytics.nodes.total}`}
          subtitle={`${Math.round((analytics.nodes.running / analytics.nodes.total) * 100)}% online`}
          icon={
            <svg className="w-6 h-6" style={{ color: neonBlue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
            </svg>
          }
        />
        
        <StatCard
          title="Consensus"
          value={analytics.summary.consensus_valid ? 'Valid' : 'Invalid'}
          subtitle={analytics.consensus?.source_da || 'No DA'}
          color={analytics.summary.consensus_valid ? '#10B981' : '#EF4444'}
          icon={
            <svg className="w-6 h-6" style={{ color: analytics.summary.consensus_valid ? '#10B981' : '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: neonBlue }}>
              📊 Bandwidth by Node Type
            </h2>
            <span className="text-xs text-slate-500">
              Total: {formatBytes(analytics.bandwidth.total_bytes)}
            </span>
          </div>
          <BandwidthChart data={analytics.bandwidth.by_type} />
        </div>
        
        <ConsensusCard consensus={analytics.consensus} />
      </div>
      
      {/* Circuits Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: neonBlue }}>
            ⚡ Active Circuits
          </h2>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {Object.entries(analytics.circuits.by_status).map(([status, count]) => (
              <span key={status} className="flex items-center gap-1">
                <StatusBadge status={status} />
                <span>{count}</span>
              </span>
            ))}
          </div>
        </div>
        <CircuitsTable circuits={analytics.circuits.circuits} />
      </div>
      
      {/* Node Stats Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: neonBlue }}>
            🖥️ Node Statistics
          </h2>
          <span className="text-xs text-slate-500">
            Avg uptime: {formatUptime(analytics.summary.avg_node_uptime)}
          </span>
        </div>
        <NodeStatsGrid nodes={analytics.nodes.stats} />
      </div>
      
      {/* Footer Info */}
      <div className="bg-cyan-900/20 border border-cyan-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔬</span>
          <div>
            <p className="font-medium text-cyan-400">ChutneX Forensic Analysis</p>
            <p className="text-sm text-cyan-300 mt-1">
              All data is collected via Tor Control Port (stem library). 
              Traffic stays 100% within your private network - no external connections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}