/**
 * CircuitsListPage - Circuit Overview with Path Visualization
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Activity, ArrowLeft, ArrowRight, ChevronRight, Clock,
  GitBranch, Globe, Loader2, RefreshCw, Server, Shield, Wifi, Zap,
  Users, CheckCircle2, AlertCircle, MoreHorizontal, Copy,
  Search, List, Grid, TrendingUp, Hash, Route, Network
} from 'lucide-react';
import { analyticsApi, NetworkAnalytics, CircuitInfo } from '../../../api/chutney_analytics';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';
const NEON_MEDIUM = 'rgba(136, 206, 208, 0.2)';
const CHART_COLORS = ['#88CED0', '#6BB8BA', '#A5DFE1', '#4FA3A5', '#C2EDEF', '#3D8B8D'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  BUILT: { label: 'Built', color: NEON, bgColor: NEON_DIM },
  LAUNCHED: { label: 'Launched', color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.1)' },
  EXTENDED: { label: 'Extended', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
  FAILED: { label: 'Failed', color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.1)' },
  CLOSED: { label: 'Closed', color: '#9ca3af', bgColor: 'rgba(156, 163, 175, 0.1)' },
};

const PURPOSE_CONFIG: Record<string, { label: string; shortLabel: string; description: string }> = {
  GENERAL: { label: 'General Purpose', shortLabel: 'General', description: 'Standard traffic circuits' },
  HS_CLIENT_INTRO: { label: 'HS Client Intro', shortLabel: 'HS Intro', description: 'Hidden service introduction' },
  HS_CLIENT_REND: { label: 'HS Client Rendezvous', shortLabel: 'HS Rend', description: 'Hidden service rendezvous' },
  HS_SERVICE_INTRO: { label: 'HS Service Intro', shortLabel: 'Svc Intro', description: 'Service introduction point' },
  HS_SERVICE_REND: { label: 'HS Service Rendezvous', shortLabel: 'Svc Rend', description: 'Service rendezvous point' },
  TESTING: { label: 'Testing', shortLabel: 'Test', description: 'Circuit testing' },
  CONTROLLER: { label: 'Controller', shortLabel: 'Ctrl', description: 'Controller-created circuit' },
  CONFLUX_LINKED: { label: 'Conflux Linked', shortLabel: 'Conflux', description: 'Conflux linked circuit' },
  HS_VANGUARDS: { label: 'HS Vanguards', shortLabel: 'Vanguard', description: 'Hidden service vanguards' },
};

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
];

const truncateFingerprint = (fp: string): string => {
  if (!fp || fp.length < 12) return fp || 'N/A';
  return `${fp.slice(0, 6)}...${fp.slice(-4)}`;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// StatCard Component
const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: React.ReactNode }> = 
  ({ title, value, subtitle, icon }) => (
  <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-[#88CED0]/30 transition-all">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: NEON }}>{value}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
      </div>
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
        <div style={{ color: NEON }}>{icon}</div>
      </div>
    </div>
  </div>
);

// CircuitPath Component
const CircuitPath: React.FC<{ circuit: CircuitInfo; expanded?: boolean }> = ({ circuit, expanded = false }) => {
  const path = circuit.path || [];
  if (path.length === 0) return <div className="text-gray-500 text-sm italic">No path information</div>;

  return (
    <div className={`flex items-center gap-1 ${expanded ? 'flex-wrap' : 'overflow-hidden'}`}>
      {circuit.source_node && (
        <>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs" style={{ backgroundColor: NEON_DIM }}>
            <Users size={12} style={{ color: NEON }} />
            <span className="text-gray-300 font-medium">{circuit.source_node}</span>
          </div>
          <ArrowRight size={14} className="text-gray-600 flex-shrink-0" />
        </>
      )}
      {path.map((hop, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs group relative"
               style={{ backgroundColor: index === 0 ? NEON_MEDIUM : NEON_DIM }}>
            {index === 0 && <Shield size={12} style={{ color: NEON }} />}
            {index > 0 && index < path.length - 1 && <Server size={12} style={{ color: NEON }} />}
            {index === path.length - 1 && <Globe size={12} style={{ color: NEON }} />}
            <span className="text-gray-300 font-medium">{hop.nickname || truncateFingerprint(hop.fingerprint)}</span>
          </div>
          {index < path.length - 1 && <ArrowRight size={14} className="text-gray-600 flex-shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );
};

// CircuitCard Component
const CircuitCard: React.FC<{ circuit: CircuitInfo }> = ({ circuit }) => {
  const statusConfig = STATUS_CONFIG[circuit.status] || STATUS_CONFIG.BUILT;
  const purposeConfig = PURPOSE_CONFIG[circuit.purpose] || { label: circuit.purpose, shortLabel: circuit.purpose, description: '' };
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-[#88CED0]/30 transition-all overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
            <GitBranch size={16} style={{ color: NEON }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">Circuit #{circuit.circuit_id}</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">{purposeConfig.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{circuit.path_length} hops</span>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded hover:bg-gray-700/50 transition-colors">
            <MoreHorizontal size={14} style={{ color: NEON }} />
          </button>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500 mb-2">Circuit Path</p>
        <CircuitPath circuit={circuit} expanded={expanded} />
      </div>
      {expanded && (
        <div className="px-4 py-3 border-t border-gray-700/30 bg-gray-900/30">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 mb-1">Purpose</p>
              <p className="text-gray-300">{purposeConfig.description || purposeConfig.label}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Build Flags</p>
              <div className="flex flex-wrap gap-1">
                {circuit.build_flags?.length > 0 ? circuit.build_flags.map((flag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: NEON_DIM, color: NEON }}>{flag}</span>
                )) : <span className="text-gray-500">None</span>}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-500 text-xs mb-2">Full Path Details</p>
            <div className="space-y-2">
              {circuit.path?.map((hop, index) => (
                <div key={index} className="flex items-center gap-3 text-xs bg-gray-800/50 rounded-md p-2">
                  <span className="text-gray-500 w-16">
                    {index === 0 ? 'Guard' : index === (circuit.path?.length || 0) - 1 ? 'Exit' : `Middle ${index}`}
                  </span>
                  <span className="text-gray-300 font-medium">{hop.nickname || 'Unknown'}</span>
                  <span className="text-gray-500 font-mono text-xs ml-auto">{truncateFingerprint(hop.fingerprint)}</span>
                  <button onClick={() => copyToClipboard(hop.fingerprint)} className="p-1 hover:bg-gray-700 rounded" title="Copy">
                    <Copy size={10} style={{ color: NEON }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CircuitRow Component  
const CircuitRow: React.FC<{ circuit: CircuitInfo }> = ({ circuit }) => {
  const statusConfig = STATUS_CONFIG[circuit.status] || STATUS_CONFIG.BUILT;
  const purposeConfig = PURPOSE_CONFIG[circuit.purpose] || { shortLabel: circuit.purpose };

  return (
    <tr className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch size={14} style={{ color: NEON }} />
          <span className="text-white font-medium">#{circuit.circuit_id}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}>
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3"><span className="text-gray-300 text-sm">{purposeConfig.shortLabel}</span></td>
      <td className="px-4 py-3"><span style={{ color: NEON }} className="text-sm font-medium">{circuit.path_length}</span></td>
      <td className="px-4 py-3"><div className="max-w-md"><CircuitPath circuit={circuit} /></div></td>
      <td className="px-4 py-3"><span className="text-gray-400 text-sm">{circuit.source_node || 'N/A'}</span></td>
      <td className="px-4 py-3"><ChevronRight size={14} className="text-gray-600" /></td>
    </tr>
  );
};

// ChartCard Component
const ChartCard: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode }> = 
  ({ title, subtitle, icon, children }) => (
  <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-700/50">
      <div className="p-2 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
        <div style={{ color: NEON }}>{icon}</div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// CustomTooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-900/95 border border-[#88CED0]/30 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="font-semibold" style={{ color: NEON }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Main Component
export default function CircuitsListPage() {
  const { id: networkId } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (refreshInterval === 0) return;
    const interval = setInterval(() => fetchData(true), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  const circuits: CircuitInfo[] = analytics?.circuits?.circuits || [];
  const circuitStats = analytics?.circuits;

  const filteredCircuits = useMemo(() => {
    return circuits.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (purposeFilter !== 'all' && c.purpose !== purposeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!c.circuit_id.toLowerCase().includes(query) &&
            !c.source_node?.toLowerCase().includes(query) &&
            !c.path?.some(h => h.nickname?.toLowerCase().includes(query))) return false;
      }
      return true;
    });
  }, [circuits, statusFilter, purposeFilter, searchQuery]);

  const statusChartData = useMemo(() => {
    if (!circuitStats?.by_status) return [];
    return Object.entries(circuitStats.by_status).map(([status, count], index) => ({
      name: STATUS_CONFIG[status]?.label || status, value: count, fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [circuitStats]);

  const purposeChartData = useMemo(() => {
    if (!circuitStats?.by_purpose) return [];
    return Object.entries(circuitStats.by_purpose).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([purpose, count], index) => ({
      name: PURPOSE_CONFIG[purpose]?.shortLabel || purpose, value: count, fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [circuitStats]);

  const uniqueStatuses = [...new Set(circuits.map(c => c.status))];
  const uniquePurposes = [...new Set(circuits.map(c => c.purpose))];

  if (loading) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: NEON }} />
          <p className="text-gray-400">Loading circuit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800/50 border border-[#88CED0]/30 rounded-lg p-6 text-center">
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: NEON }} />
            <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button onClick={() => { setLoading(true); fetchData(); }} className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: NEON, color: '#0f172a' }}>
              <RefreshCw size={16} className="inline mr-2" />Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 overflow-auto">
      <div className="bg-gray-800/30 border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center gap-2 text-sm mb-4">
          <Link to="/tor-networks" className="text-gray-500 hover:text-[#88CED0] transition-colors flex items-center gap-1">
            <ArrowLeft size={14} />Networks
          </Link>
          <ChevronRight size={14} className="text-gray-600" />
          <Link to={`/tor-networks/${networkId}`} className="text-gray-500 hover:text-[#88CED0]">{analytics?.network_name || 'Network'}</Link>
          <ChevronRight size={14} className="text-gray-600" />
          <Link to={`/tor-networks/${networkId}/analytics`} className="text-gray-500 hover:text-[#88CED0]">Analytics</Link>
          <ChevronRight size={14} className="text-gray-600" />
          <span style={{ color: NEON }}>Circuits</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: NEON_DIM }}><GitBranch size={24} style={{ color: NEON }} /></div>
            <div>
              <h1 className="text-2xl font-bold text-white">Circuits List</h1>
              <p className="text-gray-500 text-sm">Real-time circuit monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <div className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} />{lastUpdated.toLocaleTimeString()}</div>}
            <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5">
              <Activity size={14} style={{ color: NEON }} />
              <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="bg-transparent text-sm text-white border-none outline-none cursor-pointer">
                {REFRESH_INTERVALS.map(opt => <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>)}
              </select>
            </div>
            <button onClick={() => fetchData(true)} disabled={isRefreshing} className="p-2 rounded-lg border border-gray-700/50 hover:border-[#88CED0]/50 disabled:opacity-50" style={{ backgroundColor: NEON_DIM }}>
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} style={{ color: NEON }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ backgroundColor: NEON_DIM, borderColor: 'rgba(136, 206, 208, 0.3)' }}>
              <Wifi size={14} style={{ color: NEON }} /><span className="text-xs font-medium" style={{ color: NEON }}>LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Total Circuits" value={circuitStats?.total_circuits || 0} subtitle="All circuits" icon={<GitBranch size={18} />} />
          <StatCard title="Built Circuits" value={circuitStats?.built_circuits || 0} subtitle="Successfully built" icon={<CheckCircle2 size={18} />} />
          <StatCard title="Success Rate" value={`${circuitStats?.total_circuits ? Math.round((circuitStats.built_circuits / circuitStats.total_circuits) * 100) : 0}%`} subtitle="Build success" icon={<TrendingUp size={18} />} />
          <StatCard title="Avg Path Length" value={circuits.length > 0 ? (circuits.reduce((sum, c) => sum + c.path_length, 0) / circuits.length).toFixed(1) : '0'} subtitle="Hops per circuit" icon={<Route size={18} />} />
          <StatCard title="Unique Purposes" value={uniquePurposes.length} subtitle="Circuit types" icon={<Hash size={18} />} />
          <StatCard title="Active Sources" value={[...new Set(circuits.map(c => c.source_node).filter(Boolean))].length} subtitle="Source nodes" icon={<Network size={18} />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Circuit Status Distribution" subtitle="Breakdown by status" icon={<Activity size={16} />}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                       label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}>
                    {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Circuit Purpose Distribution" subtitle="Top purposes" icon={<Zap size={16} />}>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purposeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Circuits" fill={NEON} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-gray-800/30 rounded-lg border border-gray-700/50 px-4 py-3">
          <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
            <Search size={14} style={{ color: NEON }} />
            <input type="text" placeholder="Search circuits..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                   className="bg-transparent text-sm text-white border-none outline-none w-full placeholder-gray-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Status:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
              <option value="all">All</option>
              {uniqueStatuses.map(status => <option key={status} value={status}>{STATUS_CONFIG[status]?.label || status}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Purpose:</span>
            <select value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)} className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
              <option value="all">All</option>
              {uniquePurposes.map(purpose => <option key={purpose} value={purpose}>{PURPOSE_CONFIG[purpose]?.shortLabel || purpose}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setViewMode('cards')} className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-[#88CED0]/20 text-[#88CED0]' : 'text-gray-400 hover:bg-gray-700/50'}`}><Grid size={16} /></button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-[#88CED0]/20 text-[#88CED0]' : 'text-gray-400 hover:bg-gray-700/50'}`}><List size={16} /></button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Showing <span style={{ color: NEON }}>{filteredCircuits.length}</span> of {circuits.length} circuits</p>
        </div>

        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCircuits.map(circuit => <CircuitCard key={circuit.circuit_id} circuit={circuit} />)}
          </div>
        ) : (
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50 bg-gray-800/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hops</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Path</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Source</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>{filteredCircuits.map(circuit => <CircuitRow key={circuit.circuit_id} circuit={circuit} />)}</tbody>
              </table>
            </div>
          </div>
        )}

        {filteredCircuits.length === 0 && (
          <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <GitBranch size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No circuits found matching the current filter.</p>
            <button onClick={() => { setStatusFilter('all'); setPurposeFilter('all'); setSearchQuery(''); }}
                    className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: NEON_DIM, color: NEON }}>Clear Filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
