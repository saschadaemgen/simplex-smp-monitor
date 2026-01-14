/**
 * NodeBandwidthPage - Advanced Bandwidth Analytics with Charts
 * ============================================================
 * Professional bandwidth visualization with recharts.
 * Real-time updates, multiple chart types, detailed statistics.
 * 
 * Design: Neon Blue (#88CED0) - Dark Theme
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart,
} from 'recharts';
import { 
  Activity,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronRight,
  Clock,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  TrendingUp,
  Wifi,
  Zap,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Filter,
  Maximize2,
  AlertCircle
} from 'lucide-react';
import { analyticsApi, NetworkAnalytics } from '../../../api/chutney_analytics';

// =============================================================================
// CONSTANTS & TYPES
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';
const NEON_MEDIUM = 'rgba(136, 206, 208, 0.2)';
const NEON_BRIGHT = 'rgba(136, 206, 208, 0.4)';
const NEON_GRADIENT_START = 'rgba(136, 206, 208, 0.8)';
const NEON_GRADIENT_END = 'rgba(136, 206, 208, 0.1)';

const CHART_COLORS = [
  '#88CED0', // Primary Neon
  '#6BB8BA', // Darker
  '#A5DFE1', // Lighter
  '#4FA3A5', // Deep
  '#C2EDEF', // Very Light
  '#3D8B8D', // Dark
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

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  da: 'Directory Authority',
  guard: 'Guard Relay',
  middle: 'Middle Relay',
  exit: 'Exit Relay',
  client: 'Tor Client',
  hs: 'Hidden Service',
};

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
];

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

const formatBytesShort = (bytes: number): string => {
  if (bytes === 0) return '0';
  const k = 1024;
  const sizes = ['B', 'K', 'M', 'G', 'T'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))}${sizes[i]}`;
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

// =============================================================================
// CUSTOM TOOLTIP COMPONENT
// =============================================================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-gray-900/95 border border-[#88CED0]/30 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="font-semibold" style={{ color: NEON }}>
            {formatBytes(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend }) => (
  <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-[#88CED0]/30 transition-all">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: NEON }}>{value}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.value >= 0 ? (
              <ArrowUpRight size={12} style={{ color: NEON }} />
            ) : (
              <ArrowDownRight size={12} className="text-gray-400" />
            )}
            <span className="text-xs" style={{ color: trend.value >= 0 ? NEON : '#9ca3af' }}>
              {trend.label}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
        <div style={{ color: NEON }}>{icon}</div>
      </div>
    </div>
  </div>
);

// =============================================================================
// CHART CARD WRAPPER
// =============================================================================
interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  fullWidth?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, icon, children, actions, fullWidth }) => (
  <div className={`bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden ${fullWidth ? 'col-span-full' : ''}`}>
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
          <div style={{ color: NEON }}>{icon}</div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================
export default function NodeBandwidthPage() {
  const { id: networkId } = useParams<{ id: string }>();
  
  // State
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bandwidthHistory, setBandwidthHistory] = useState<any[]>([]);
  const [selectedNodeType, setSelectedNodeType] = useState<NodeType | 'all'>('all');

  // Fetch data
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (!networkId) return;
    if (showRefreshIndicator) setIsRefreshing(true);
    
    try {
      const data = await analyticsApi.getNetworkAnalytics(networkId);
      setAnalytics(data);
      setLastUpdated(new Date());
      setError(null);
      
      // Add to history for time-series charts
      setBandwidthHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          totalRead: data.bandwidth?.total_bytes_read || 0,
          totalWritten: data.bandwidth?.total_bytes_written || 0,
          total: (data.bandwidth?.total_bytes_read || 0) + (data.bandwidth?.total_bytes_written || 0),
        };
        const updated = [...prev, newEntry].slice(-20); // Keep last 20 entries
        return updated;
      });
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

  // Process data
  const nodes: NodeStats[] = analytics?.nodes?.stats || [];
  
  // Filter nodes
  const filteredNodes = selectedNodeType === 'all' 
    ? nodes 
    : nodes.filter(n => n.node_type === selectedNodeType);

  // Calculate totals
  const totalRead = nodes.reduce((sum, n) => sum + n.bytes_read, 0);
  const totalWritten = nodes.reduce((sum, n) => sum + n.bytes_written, 0);
  const totalBandwidth = totalRead + totalWritten;

  // Data for Node Comparison Bar Chart (Top 10)
  const nodeComparisonData = useMemo(() => {
    return [...filteredNodes]
      .sort((a, b) => (b.bytes_read + b.bytes_written) - (a.bytes_read + a.bytes_written))
      .slice(0, 10)
      .map(n => ({
        name: n.node_name.length > 12 ? n.node_name.slice(0, 12) + '...' : n.node_name,
        fullName: n.node_name,
        read: n.bytes_read,
        written: n.bytes_written,
        total: n.bytes_read + n.bytes_written,
        type: n.node_type,
      }));
  }, [filteredNodes]);

  // Data for Node Type Distribution (Pie Chart)
  const typeDistributionData = useMemo(() => {
    const typeGroups: Record<string, { read: number; written: number; count: number }> = {};
    
    nodes.forEach(n => {
      if (!typeGroups[n.node_type]) {
        typeGroups[n.node_type] = { read: 0, written: 0, count: 0 };
      }
      typeGroups[n.node_type].read += n.bytes_read;
      typeGroups[n.node_type].written += n.bytes_written;
      typeGroups[n.node_type].count++;
    });

    return Object.entries(typeGroups).map(([type, data], index) => ({
      name: NODE_TYPE_LABELS[type as NodeType] || type,
      shortName: type.toUpperCase(),
      value: data.read + data.written,
      read: data.read,
      written: data.written,
      count: data.count,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [nodes]);

  // Data for Read vs Written Comparison
  const readWriteComparisonData = useMemo(() => {
    return nodes.map(n => ({
      name: n.node_name.length > 8 ? n.node_name.slice(0, 8) + '...' : n.node_name,
      read: n.bytes_read,
      written: n.bytes_written,
      ratio: n.bytes_read > 0 ? (n.bytes_written / n.bytes_read).toFixed(2) : 0,
    }));
  }, [nodes]);

  // Data for Bandwidth per Node Type (Stacked Area)
  const typeAreaData = useMemo(() => {
    if (bandwidthHistory.length === 0) return [];
    
    // For demo, create mock distribution based on current node counts
    return bandwidthHistory.map((entry, index) => {
      const result: any = { time: entry.time };
      typeDistributionData.forEach(type => {
        const proportion = type.value / (totalBandwidth || 1);
        result[type.shortName] = Math.round(entry.total * proportion);
      });
      return result;
    });
  }, [bandwidthHistory, typeDistributionData, totalBandwidth]);

  // Radial chart data for bandwidth utilization
  const radialData = useMemo(() => {
    return [
      { name: 'Read', value: totalRead, fill: NEON },
      { name: 'Written', value: totalWritten, fill: CHART_COLORS[2] },
    ];
  }, [totalRead, totalWritten]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: NEON }} />
          <p className="text-gray-400">Loading bandwidth data...</p>
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
              className="px-4 py-2 rounded-lg font-medium"
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
            <Link to="/tor-networks" className="text-gray-500 hover:text-[#88CED0] transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />
              Networks
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <Link to={`/tor-networks/${networkId}`} className="text-gray-500 hover:text-[#88CED0] transition-colors">
              {analytics?.network_name || 'Network'}
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <Link to={`/tor-networks/${networkId}/analytics`} className="text-gray-500 hover:text-[#88CED0] transition-colors">
              Analytics
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <span style={{ color: NEON }}>Bandwidth</span>
          </div>

          {/* Title Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
                <BarChart3 size={24} style={{ color: NEON }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Node Bandwidth</h1>
                <p className="text-gray-500 text-sm">
                  Real-time bandwidth analytics for {nodes.length} nodes
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
                    <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="p-2 rounded-lg border border-gray-700/50 hover:border-[#88CED0]/50 transition-colors disabled:opacity-50"
                style={{ backgroundColor: NEON_DIM }}
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} style={{ color: NEON }} />
              </button>

              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ backgroundColor: NEON_DIM, borderColor: 'rgba(136, 206, 208, 0.3)' }}
              >
                <Wifi size={14} style={{ color: NEON }} />
                <span className="text-xs font-medium" style={{ color: NEON }}>LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Bandwidth"
            value={formatBytes(totalBandwidth)}
            subtitle="All nodes combined"
            icon={<HardDrive size={18} />}
          />
          <StatCard
            title="Data Read"
            value={formatBytes(totalRead)}
            subtitle={`${((totalRead / totalBandwidth) * 100).toFixed(1)}% of total`}
            icon={<Download size={18} />}
          />
          <StatCard
            title="Data Written"
            value={formatBytes(totalWritten)}
            subtitle={`${((totalWritten / totalBandwidth) * 100).toFixed(1)}% of total`}
            icon={<ArrowUpRight size={18} />}
          />
          <StatCard
            title="Active Nodes"
            value={nodes.length.toString()}
            subtitle="Reporting bandwidth"
            icon={<Server size={18} />}
          />
          <StatCard
            title="Avg per Node"
            value={formatBytes(Math.round(totalBandwidth / (nodes.length || 1)))}
            subtitle="Mean bandwidth"
            icon={<TrendingUp size={18} />}
          />
          <StatCard
            title="Read/Write Ratio"
            value={totalWritten > 0 ? (totalRead / totalWritten).toFixed(2) : 'N/A'}
            subtitle="Read vs Written"
            icon={<Zap size={18} />}
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 bg-gray-800/30 rounded-lg border border-gray-700/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: NEON }} />
            <span className="text-sm text-gray-400">Filter by type:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedNodeType('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedNodeType === 'all'
                  ? 'bg-[#88CED0]/20 text-[#88CED0] border border-[#88CED0]/30'
                  : 'text-gray-400 hover:bg-gray-700/50 border border-transparent'
              }`}
            >
              All ({nodes.length})
            </button>
            {(Object.keys(NODE_TYPE_LABELS) as NodeType[]).map(type => {
              const count = nodes.filter(n => n.node_type === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedNodeType(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    selectedNodeType === type
                      ? 'bg-[#88CED0]/20 text-[#88CED0] border border-[#88CED0]/30'
                      : 'text-gray-400 hover:bg-gray-700/50 border border-transparent'
                  }`}
                >
                  {type.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Real-time Bandwidth Chart */}
          <ChartCard
            title="Real-time Bandwidth"
            subtitle="Live traffic over time"
            icon={<Activity size={16} />}
            fullWidth
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bandwidthHistory}>
                  <defs>
                    <linearGradient id="readGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NEON} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={NEON} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="writtenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={formatBytesShort}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalRead"
                    name="Data Read"
                    stroke={NEON}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#readGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="totalWritten"
                    name="Data Written"
                    stroke={CHART_COLORS[2]}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#writtenGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Top Nodes Bar Chart */}
          <ChartCard
            title="Top 10 Nodes by Bandwidth"
            subtitle="Highest traffic nodes"
            icon={<BarChart3 size={16} />}
          >
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nodeComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={formatBytesShort}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                  />
                  <Bar dataKey="read" name="Read" fill={NEON} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="written" name="Written" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Node Type Distribution Pie Chart */}
          <ChartCard
            title="Bandwidth by Node Type"
            subtitle="Traffic distribution"
            icon={<PieChartIcon size={16} />}
          >
            <div className="h-[350px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ shortName, percent }) => `${shortName} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                  >
                    {typeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatBytes(value)}
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid rgba(136, 206, 208, 0.3)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {typeDistributionData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-gray-400">{item.shortName}</span>
                  <span className="text-gray-500 ml-auto">{formatBytesShort(item.value)}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Read vs Written Composed Chart */}
          <ChartCard
            title="Read vs Written per Node"
            subtitle="Traffic direction comparison"
            icon={<AreaChartIcon size={16} />}
          >
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={nodeComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af', fontSize: 10, angle: -45, textAnchor: 'end' }}
                    height={60}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={formatBytesShort}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                  />
                  <Bar dataKey="read" name="Read" fill={NEON} opacity={0.8} />
                  <Line 
                    type="monotone" 
                    dataKey="written" 
                    name="Written" 
                    stroke={CHART_COLORS[2]} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS[2], strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Bandwidth Distribution Line Chart */}
          <ChartCard
            title="Bandwidth Distribution"
            subtitle="All nodes bandwidth comparison"
            icon={<TrendingUp size={16} />}
            fullWidth
          >
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredNodes.map((n, i) => ({ 
                  index: i + 1, 
                  name: n.node_name,
                  total: n.bytes_read + n.bytes_written,
                  read: n.bytes_read,
                  written: n.bytes_written
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="index" 
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={formatBytesShort}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Total" 
                    stroke={NEON} 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="read" 
                    name="Read" 
                    stroke={CHART_COLORS[1]} 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="written" 
                    name="Written" 
                    stroke={CHART_COLORS[2]} 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Detailed Node Table */}
        <ChartCard
          title="Node Bandwidth Details"
          subtitle="Complete bandwidth statistics for all nodes"
          icon={<Database size={16} />}
          fullWidth
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Node</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Read</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Written</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">% of Network</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes
                  .sort((a, b) => (b.bytes_read + b.bytes_written) - (a.bytes_read + a.bytes_written))
                  .map((node, index) => {
                    const nodeTotal = node.bytes_read + node.bytes_written;
                    const percentage = totalBandwidth > 0 ? (nodeTotal / totalBandwidth) * 100 : 0;
                    const readPercent = nodeTotal > 0 ? (node.bytes_read / nodeTotal) * 100 : 0;
                    
                    return (
                      <tr key={node.node_id} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs w-6">#{index + 1}</span>
                            <span className="text-white text-sm font-medium">{node.node_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ backgroundColor: NEON_DIM, color: NEON }}
                          >
                            {node.node_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">{formatBytes(node.bytes_read)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">{formatBytes(node.bytes_written)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium" style={{ color: NEON }}>
                          {formatBytes(nodeTotal)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-400">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden flex">
                            <div 
                              className="h-full"
                              style={{ width: `${readPercent}%`, backgroundColor: NEON }}
                            />
                            <div 
                              className="h-full"
                              style={{ width: `${100 - readPercent}%`, backgroundColor: CHART_COLORS[2] }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
