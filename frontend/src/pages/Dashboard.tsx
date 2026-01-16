/**
 * Dashboard - SimpleX SMP Monitor Home
 * =====================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Compact, information-dense dashboard with real-time stats.
 * Design: Neon Blue (#88CED0) theme - ChutneX Style
 * 
 * Now includes ChutneX Tor Network overview!
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Server as ServerIcon,
  Activity,
  Zap,
  Clock,
  CheckCircle,
  Wifi,
  Cpu,
  Globe,
  Shield,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { dashboardApi, DashboardStats, Server, Test, Event } from '../api/client';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';
const NEON_BORDER = 'rgba(136, 206, 208, 0.1)';
const CYAN = '#22D3EE';

// =============================================================================
// TYPES
// =============================================================================
interface TorCircuit {
  id: string;
  status: 'established' | 'building';
  hops: number;
  latency: number | null;
}

interface Diagnostics {
  cpu: number;
  memory: number;
  disk: number;
  docker: 'running' | 'stopped';
  redis: 'connected' | 'disconnected';
  tor: 'connected' | 'disconnected';
}

interface ChutneXNetwork {
  id: string;
  name: string;
  status: string;
  total_nodes: number;
  running_nodes: number;
  total_circuits: number;
  bootstrap_progress: number;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// Compact Stat Card
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  iconColor?: string;
}> = ({ icon: Icon, label, value, sub, iconColor = NEON }) => (
  <div 
    className="rounded-lg p-3"
    style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
        {sub && <div className="text-xs mt-1">{sub}</div>}
      </div>
      <div className="p-2 rounded-lg ml-2" style={{ backgroundColor: NEON_DIM }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
    </div>
  </div>
);

// Mini List Item
const ListItem: React.FC<{
  status: 'online' | 'offline' | 'warning';
  title: string;
  subtitle: string;
  value?: string;
  valueColor?: string;
}> = ({ status, title, subtitle, value, valueColor = NEON }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
    <div className="flex items-center gap-2 min-w-0">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        status === 'online' ? 'bg-emerald-400' :
        status === 'warning' ? 'bg-amber-400' : 'bg-gray-500'
      }`} />
      <div className="min-w-0">
        <p className="text-sm text-white truncate">{title}</p>
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
    </div>
    {value && (
      <span className="text-sm font-mono ml-2" style={{ color: valueColor }}>{value}</span>
    )}
  </div>
);

// Progress Bar (compact)
const MiniProgress: React.FC<{
  label: string;
  value: number;
  warn?: number;
}> = ({ label, value, warn = 80 }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 w-12">{label}</span>
    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all"
        style={{ 
          width: `${value}%`,
          backgroundColor: value > warn ? '#f59e0b' : CYAN,
        }}
      />
    </div>
    <span className="text-xs font-mono w-8 text-right" style={{ color: NEON }}>{value}%</span>
  </div>
);

// Service Status Dot
const ServiceDot: React.FC<{ name: string; status: 'connected' | 'running' | 'disconnected' | 'stopped' }> = ({ name, status }) => {
  const isOk = status === 'connected' || status === 'running';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{name}</span>
      <span style={{ color: isOk ? CYAN : '#ef4444' }}>● {status}</span>
    </div>
  );
};

// Chart Tooltip
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded px-2 py-1 text-xs" style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: `1px solid ${NEON}40` }}>
      <div className="text-gray-400">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color }}>{p.value}</div>
      ))}
    </div>
  );
};

// ChutneX Network Card
const ChutneXCard: React.FC<{ network: ChutneXNetwork }> = ({ network }) => {
  const isRunning = network.status === 'running';
  const statusColor = isRunning ? '#4ade80' : network.status === 'bootstrapping' ? '#fbbf24' : '#64748b';
  
  return (
    <div className="p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: NEON }} />
          <span className="text-sm font-medium text-white">{network.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <div 
            className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs capitalize" style={{ color: statusColor }}>
            {network.status}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Nodes</span>
          <div className="font-mono" style={{ color: NEON }}>
            {network.running_nodes}/{network.total_nodes}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Circuits</span>
          <div className="font-mono" style={{ color: CYAN }}>
            {network.total_circuits}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Bootstrap</span>
          <div className="font-mono" style={{ color: network.bootstrap_progress === 100 ? '#4ade80' : '#fbbf24' }}>
            {network.bootstrap_progress}%
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function Dashboard() {
  const { t } = useTranslation();
  const { data: stats, loading } = useApi<DashboardStats>(() => dashboardApi.getStats());
  const { data: recentServers } = useApi<Server[]>(() => dashboardApi.getRecentServers(5));
  const { data: recentTests } = useApi<Test[]>(() => dashboardApi.getRecentTests(5));
  const { data: recentEvents } = useApi<Event[]>(() => dashboardApi.getRecentEvents(5));
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chutneXNetworks, setChutneXNetworks] = useState<ChutneXNetwork[]>([]);
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch ChutneX Networks
  useEffect(() => {
    const fetchChutneX = async () => {
      try {
        const response = await fetch('/api/chutney/networks/');
        if (response.ok) {
          const data = await response.json();
          // Transform API data to our interface
          const networks: ChutneXNetwork[] = (data.results || data || []).map((n: any) => ({
            id: n.id,
            name: n.name,
            status: n.status,
            total_nodes: n.total_nodes || (
              (n.num_directory_authorities || 0) +
              (n.num_guard_relays || 0) +
              (n.num_middle_relays || 0) +
              (n.num_exit_relays || 0) +
              (n.num_clients || 0) +
              (n.num_hidden_services || 0)
            ),
            running_nodes: n.running_nodes_count || 0,
            total_circuits: n.total_circuits_created || 0,
            bootstrap_progress: n.bootstrap_progress || 0,
          }));
          setChutneXNetworks(networks);
        }
      } catch (err) {
        console.error('ChutneX fetch error:', err);
      }
    };
    
    fetchChutneX();
    const interval = setInterval(fetchChutneX, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Demo Data
  const trafficData = useMemo(() => [
    { h: '00', v: 120 }, { h: '02', v: 85 }, { h: '04', v: 45 },
    { h: '06', v: 95 }, { h: '08', v: 180 }, { h: '10', v: 245 },
    { h: '12', v: 310 }, { h: '14', v: 285 }, { h: '16', v: 320 },
    { h: '18', v: 275 }, { h: '20', v: 195 }, { h: '22', v: 145 },
  ], []);

  const torCircuits: TorCircuit[] = [
    { id: 'circ-1', status: 'established', hops: 3, latency: 234 },
    { id: 'circ-2', status: 'established', hops: 3, latency: 189 },
    { id: 'circ-3', status: 'building', hops: 2, latency: null },
    { id: 'circ-4', status: 'established', hops: 3, latency: 312 },
  ];

  const diagnostics: Diagnostics = {
    cpu: 23, memory: 45, disk: 67,
    docker: 'running', redis: 'connected', tor: 'connected',
  };

  const forensicEvents = [
    { time: '14:02', type: 'pattern', msg: 'Timing correlation detected', warn: true },
    { time: '13:45', type: 'meta', msg: 'Size analysis complete', warn: false },
    { time: '12:30', type: 'traffic', msg: 'Spike on SMP-03', warn: false },
  ];

  // Helper to get event level status
  const getEventStatus = (level: string): 'online' | 'offline' | 'warning' => {
    if (level === 'error') return 'offline';
    if (level === 'warning') return 'warning';
    return 'online';
  };

  // Helper to get test status class
  const getTestStatusClass = (status: string): string => {
    if (status === 'active' || status === 'running') return 'bg-cyan-500/20 text-cyan-400';
    if (status === 'completed' || status === 'success') return 'bg-emerald-500/20 text-emerald-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw size={24} className="animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Compact */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
              <Activity size={20} style={{ color: NEON }} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">{t('dashboard.title')}</h1>
              <p className="text-xs text-gray-500">{t('dashboard.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wifi size={14} style={{ color: NEON }} className="animate-pulse" />
            <span className="text-xs font-mono" style={{ color: NEON }}>
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        
        {/* Row 1: Main Stats (4 cols) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={ServerIcon}
            label={t('dashboard.totalServers')}
            value={stats?.total_servers || 0}
            sub={<>
              <span style={{ color: NEON }}>{stats?.online_servers || 0}</span>
              <span className="text-gray-500"> online • </span>
              <span className="text-gray-500">{stats?.onion_servers || 0} onion</span>
            </>}
          />
          <StatCard
            icon={CheckCircle}
            label={t('dashboard.activeServers')}
            value={stats?.active_servers || 0}
            iconColor={CYAN}
            sub={<span style={{ color: CYAN }}>100% uptime</span>}
          />
          <StatCard
            icon={Zap}
            label={t('dashboard.runningTests')}
            value={stats?.running_tests || 0}
            iconColor="#fbbf24"
            sub={<>
              <span style={{ color: NEON }}>{stats?.active_tests || 1}</span>
              <span className="text-gray-500"> active • {stats?.total_tests || 1} total</span>
            </>}
          />
          <StatCard
            icon={Clock}
            label={t('dashboard.avgLatency')}
            value={`${stats?.avg_latency || 0}ms`}
            sub={<>
              <span style={{ color: NEON }}>{stats?.running_clients || 0}</span>
              <span className="text-gray-500"> clients</span>
            </>}
          />
        </div>

        {/* Row 2: ChutneX Networks */}
        {chutneXNetworks.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe size={14} style={{ color: NEON }} />
                <span className="text-sm font-medium text-gray-300">ChutneX Tor Networks</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded" style={{ backgroundColor: NEON_DIM, color: NEON }}>
                  {chutneXNetworks.length} Active
                </span>
              </div>
              <Link to="/chutney" className="text-xs flex items-center gap-0.5" style={{ color: NEON }}>
                Analytics <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {chutneXNetworks.slice(0, 3).map(network => (
                <Link key={network.id} to={`/chutney/${network.id}/analytics`}>
                  <ChutneXCard network={network} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Charts (2 cols) */}
        <div className="grid lg:grid-cols-2 gap-3">
          {/* Traffic Chart */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">{t('dashboard.serverActivity')}</span>
              <span className="text-xs text-gray-500">24h</span>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CYAN} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="h" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="v" stroke={CYAN} fill="url(#trafficGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latency Chart - FIXED: last_latency instead of last_latency_ms */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">{t('dashboard.latencyOverview')}</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CYAN }} />
                <span className="text-xs text-gray-500">ms</span>
              </div>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={
                  (recentServers?.filter(s => s.last_latency) || []).slice(0, 5).map(s => ({
                    name: s.name.slice(0, 8),
                    latency: s.last_latency,
                  }))
                }>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="latency" fill={CYAN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 4: Lists (3 cols) */}
        <div className="grid lg:grid-cols-3 gap-3">
          {/* Recent Servers - FIXED: last_status and last_latency */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">{t('dashboard.recentServers')}</span>
              <Link to="/servers" className="text-xs flex items-center gap-0.5" style={{ color: NEON }}>
                {t('common.viewAll')} <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-0">
              {(recentServers || []).slice(0, 4).map(server => (
                <ListItem
                  key={String(server.id)}
                  status={server.last_status === 'online' ? 'online' : server.last_status === 'error' ? 'warning' : 'offline'}
                  title={server.name}
                  subtitle={server.server_type || 'server'}
                  value={server.last_latency ? `${server.last_latency}ms` : '—'}
                />
              ))}
              {(!recentServers?.length) && (
                <p className="text-xs text-gray-500 text-center py-3">{t('common.noData')}</p>
              )}
            </div>
          </div>

          {/* Recent Tests */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">{t('dashboard.recentTests')}</span>
              <Link to="/tests" className="text-xs flex items-center gap-0.5" style={{ color: NEON }}>
                {t('common.viewAll')} <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-0">
              {(recentTests || []).slice(0, 4).map(test => (
                <div key={String(test.id)} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{test.name}</p>
                    <p className="text-xs text-gray-500">{test.server_count || 0} srv • {test.success_rate || 0}%</p>
                  </div>
                  <span className={`px-1.5 py-0.5 text-xs rounded ${getTestStatusClass(test.status)}`}>
                    {test.status}
                  </span>
                </div>
              ))}
              {(!recentTests?.length) && (
                <p className="text-xs text-gray-500 text-center py-3">{t('common.noData')}</p>
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">{t('dashboard.recentEvents')}</span>
              <Link to="/events" className="text-xs flex items-center gap-0.5" style={{ color: NEON }}>
                {t('common.viewAll')} <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-0">
              {(recentEvents || []).slice(0, 4).map((event, i) => (
                <ListItem
                  key={i}
                  status={getEventStatus(event.level)}
                  title={event.message}
                  subtitle={event.created_at}
                />
              ))}
              {(!recentEvents?.length) && (
                <p className="text-xs text-gray-500 text-center py-3">{t('common.noData')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: Tor & Diagnostics (2 cols) */}
        <div className="grid lg:grid-cols-2 gap-3">
          {/* Tor Network */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe size={14} style={{ color: NEON }} />
                <span className="text-sm font-medium text-gray-300">Tor Network</span>
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400">PREVIEW</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Connected</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {torCircuits.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded bg-gray-800/30">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'established' ? 'bg-cyan-400' : 'bg-amber-400 animate-pulse'}`} />
                    <div>
                      <p className="text-xs font-mono text-white">{c.id}</p>
                      <p className="text-[10px] text-gray-500">{c.hops} hops</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono" style={{ color: NEON }}>{c.latency || '...'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Diagnostics */}
          <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={14} style={{ color: NEON }} />
              <span className="text-sm font-medium text-gray-300">System</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400">PREVIEW</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="space-y-1.5">
                <MiniProgress label="CPU" value={diagnostics.cpu} />
                <MiniProgress label="RAM" value={diagnostics.memory} />
                <MiniProgress label="Disk" value={diagnostics.disk} />
              </div>
              <div className="space-y-1">
                <ServiceDot name="Docker" status={diagnostics.docker} />
                <ServiceDot name="Redis" status={diagnostics.redis} />
                <ServiceDot name="Tor" status={diagnostics.tor} />
              </div>
            </div>
          </div>
        </div>

        {/* Row 6: Forensics (full width) */}
        <div className="rounded-lg p-3" style={{ background: 'rgba(31, 41, 55, 0.5)', border: `1px solid ${NEON_BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield size={14} style={{ color: NEON }} />
              <span className="text-sm font-medium text-gray-300">Data Forensics</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400">PREVIEW</span>
            </div>
            <span className="text-xs text-gray-500">24h</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {forensicEvents.map((e, i) => (
              <div key={i} className="p-2 rounded bg-gray-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${e.warn ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                  <span className="text-[10px] font-mono text-gray-500">{e.time}</span>
                  <span className={`px-1 py-0.5 text-[10px] rounded ${
                    e.type === 'pattern' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                  }`}>{e.type}</span>
                </div>
                <p className="text-xs text-gray-300 truncate">{e.msg}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}