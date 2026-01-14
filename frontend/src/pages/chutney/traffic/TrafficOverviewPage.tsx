/**
 * TrafficOverviewPage - Network Traffic Analysis Dashboard
 * ========================================================
 * Comprehensive traffic monitoring with multiple chart types,
 * real-time updates, and detailed statistics.
 * 
 * Design: Neon Blue (#88CED0) - Dark Theme
 * i18n: Full German/English support
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  ComposedChart,
  Treemap,
} from 'recharts';
import { 
  Activity,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
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
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Filter,
  AlertCircle,
  Radio,
  Globe,
  Shield,
  Users,
  Eye
} from 'lucide-react';
import { analyticsApi, NetworkAnalytics } from '../../../api/chutney_analytics';

// =============================================================================
// CONSTANTS
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';
const NEON_MEDIUM = 'rgba(136, 206, 208, 0.2)';
const NEON_BRIGHT = 'rgba(136, 206, 208, 0.4)';

const CHART_COLORS = [
  '#88CED0', '#6BB8BA', '#A5DFE1', '#4FA3A5', '#C2EDEF', '#3D8B8D',
  '#5AABAD', '#7DC9CB', '#9EDCDE', '#B5E7E9'
];

type NodeType = 'da' | 'guard' | 'middle' | 'exit' | 'client' | 'hs';

const NODE_TYPE_CONFIG: Record<NodeType, { icon: React.ReactNode; label: string }> = {
  da: { icon: <Shield size={14} />, label: 'Directory Authority' },
  guard: { icon: <Shield size={14} />, label: 'Guard Relay' },
  middle: { icon: <Server size={14} />, label: 'Middle Relay' },
  exit: { icon: <Globe size={14} />, label: 'Exit Relay' },
  client: { icon: <Users size={14} />, label: 'Tor Client' },
  hs: { icon: <Eye size={14} />, label: 'Hidden Service' },
};

const REFRESH_INTERVALS = [
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '1m', value: 60000 },
];

// =============================================================================
// HELPERS
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

// =============================================================================
// CUSTOM TOOLTIP
// =============================================================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-gray-900/95 border border-[#88CED0]/30 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="font-semibold" style={{ color: NEON }}>
            {typeof entry.value === 'number' ? formatBytes(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// STAT CARD
// =============================================================================
interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
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
            {trend.positive ? (
              <ArrowUpRight size={12} style={{ color: NEON }} />
            ) : (
              <ArrowDownLeft size={12} className="text-gray-400" />
            )}
            <span className="text-xs" style={{ color: trend.positive ? NEON : '#9ca3af' }}>
              {trend.value}%
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
// CHART CARD
// =============================================================================
interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, icon, children, fullWidth }) => (
  <div className={`bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden ${fullWidth ? 'col-span-full' : ''}`}>
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

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function TrafficOverviewPage() {
  const { id: networkId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  
  // State
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);
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
      
      // Add to history
      setTrafficHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          read: data.bandwidth?.total_bytes_read || 0,
          written: data.bandwidth?.total_bytes_written || 0,
          total: (data.bandwidth?.total_bytes_read || 0) + (data.bandwidth?.total_bytes_written || 0),
        };
        return [...prev, newEntry].slice(-30);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
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
  const nodes = analytics?.nodes?.stats || [];
  const bandwidth = analytics?.bandwidth;
  
  const totalRead = bandwidth?.total_bytes_read || 0;
  const totalWritten = bandwidth?.total_bytes_written || 0;
  const totalTraffic = totalRead + totalWritten;

  // Filter nodes by type
  const filteredNodes = selectedNodeType === 'all' 
    ? nodes 
    : nodes.filter(n => n.node_type === selectedNodeType);

  // Node type distribution data
  const nodeTypeData = useMemo(() => {
    const types = ['da', 'guard', 'middle', 'exit', 'client', 'hs'] as NodeType[];
    return types.map((type, index) => {
      const typeNodes = nodes.filter(n => n.node_type === type);
      const read = typeNodes.reduce((sum, n) => sum + n.bytes_read, 0);
      const written = typeNodes.reduce((sum, n) => sum + n.bytes_written, 0);
      return {
        name: type.toUpperCase(),
        fullName: NODE_TYPE_CONFIG[type].label,
        read,
        written,
        total: read + written,
        count: typeNodes.length,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      };
    }).filter(d => d.count > 0);
  }, [nodes]);

  // Top talkers data
  const topTalkersData = useMemo(() => {
    return [...filteredNodes]
      .sort((a, b) => (b.bytes_read + b.bytes_written) - (a.bytes_read + a.bytes_written))
      .slice(0, 8)
      .map((n, index) => ({
        name: n.node_name.length > 10 ? n.node_name.slice(0, 10) + '...' : n.node_name,
        fullName: n.node_name,
        read: n.bytes_read,
        written: n.bytes_written,
        total: n.bytes_read + n.bytes_written,
        type: n.node_type,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }));
  }, [filteredNodes]);

  // Treemap data
  const treemapData = useMemo(() => {
    return filteredNodes.map(n => ({
      name: n.node_name,
      size: n.bytes_read + n.bytes_written,
      type: n.node_type,
    }));
  }, [filteredNodes]);

  // Inbound vs Outbound comparison
  const inOutData = useMemo(() => {
    return [
      { name: t('chutnexPages.traffic.inbound', 'Inbound'), value: totalRead, fill: NEON },
      { name: t('chutnexPages.traffic.outbound', 'Outbound'), value: totalWritten, fill: CHART_COLORS[2] },
    ];
  }, [totalRead, totalWritten, t]);

  // Cumulative traffic over time
  const cumulativeData = useMemo(() => {
    let cumRead = 0;
    let cumWritten = 0;
    return trafficHistory.map(entry => {
      cumRead += entry.read * 0.1; // Simulate growth
      cumWritten += entry.written * 0.1;
      return {
        ...entry,
        cumRead: Math.round(cumRead),
        cumWritten: Math.round(cumWritten),
        cumTotal: Math.round(cumRead + cumWritten),
      };
    });
  }, [trafficHistory]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: NEON }} />
          <p className="text-gray-400">{t('chutnexPages.common.loading', 'Loading data...')}</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800/50 border border-[#88CED0]/30 rounded-lg p-6 text-center">
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: NEON }} />
            <h2 className="text-xl font-bold text-white mb-2">{t('chutnexPages.common.error', 'Connection Error')}</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: NEON, color: '#0f172a' }}
            >
              <RefreshCw size={16} className="inline mr-2" />
              {t('chutnexPages.common.retry', 'Retry')}
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
              {t('chutnexPages.common.networks', 'Networks')}
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <Link to={`/tor-networks/${networkId}`} className="text-gray-500 hover:text-[#88CED0] transition-colors">
              {analytics?.network_name || 'Network'}
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <Link to={`/tor-networks/${networkId}/analytics`} className="text-gray-500 hover:text-[#88CED0] transition-colors">
              {t('chutnexPages.common.analytics', 'Analytics')}
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <span style={{ color: NEON }}>Traffic</span>
          </div>

          {/* Title */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
                <Activity size={24} style={{ color: NEON }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{t('chutnexPages.traffic.title', 'Traffic Overview')}</h1>
                <p className="text-gray-500 text-sm">{t('chutnexPages.traffic.subtitle', 'Real-time network traffic analysis')}</p>
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
                  <option value={0} className="bg-gray-800">{t('chutnexPages.common.off', 'Off')}</option>
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
                <span className="text-xs font-medium" style={{ color: NEON }}>{t('chutnexPages.common.live', 'LIVE')}</span>
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
            title={t('chutnexPages.traffic.totalTraffic', 'Total Traffic')}
            value={formatBytes(totalTraffic)}
            subtitle={t('chutnexPages.traffic.inVsOut', 'In + Out')}
            icon={<HardDrive size={18} />}
          />
          <StatCard
            title={t('chutnexPages.traffic.inbound', 'Inbound')}
            value={formatBytes(totalRead)}
            subtitle={`${totalTraffic > 0 ? ((totalRead / totalTraffic) * 100).toFixed(1) : 0}%`}
            icon={<ArrowDownLeft size={18} />}
          />
          <StatCard
            title={t('chutnexPages.traffic.outbound', 'Outbound')}
            value={formatBytes(totalWritten)}
            subtitle={`${totalTraffic > 0 ? ((totalWritten / totalTraffic) * 100).toFixed(1) : 0}%`}
            icon={<ArrowUpRight size={18} />}
          />
          <StatCard
            title={t('chutnexPages.traffic.activeFlows', 'Active Nodes')}
            value={nodes.length.toString()}
            subtitle={t('chutnexPages.traffic.packetsProcessed', 'Processing traffic')}
            icon={<Server size={18} />}
          />
          <StatCard
            title={t('chutnexPages.traffic.avgPacketSize', 'Avg per Node')}
            value={formatBytes(Math.round(totalTraffic / (nodes.length || 1)))}
            subtitle={t('chutnexPages.traffic.meanBandwidth', 'Mean bandwidth')}
            icon={<TrendingUp size={18} />}
          />
          <StatCard
            title={t('chutnexPages.traffic.peakBandwidth', 'Node Types')}
            value={nodeTypeData.length.toString()}
            subtitle={t('chutnexPages.traffic.activeFlows', 'Active types')}
            icon={<Layers size={18} />}
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 bg-gray-800/30 rounded-lg border border-gray-700/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: NEON }} />
            <span className="text-sm text-gray-400">{t('chutnexPages.common.filter', 'Filter')}:</span>
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
              {t('chutnexPages.common.all', 'All')} ({nodes.length})
            </button>
            {(Object.keys(NODE_TYPE_CONFIG) as NodeType[]).map(type => {
              const count = nodes.filter(n => n.node_type === type).length;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedNodeType(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedNodeType === type
                      ? 'bg-[#88CED0]/20 text-[#88CED0] border border-[#88CED0]/30'
                      : 'text-gray-400 hover:bg-gray-700/50 border border-transparent'
                  }`}
                >
                  {NODE_TYPE_CONFIG[type].icon}
                  {type.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Traffic Area Chart */}
          <ChartCard
            title={t('chutnexPages.traffic.realtimeBandwidth', 'Real-time Bandwidth')}
            subtitle={t('chutnexPages.traffic.trafficOverTime', 'Traffic over time')}
            icon={<Activity size={16} />}
            fullWidth
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficHistory}>
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
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={formatBytesShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Area type="monotone" dataKey="read" name={t('chutnexPages.traffic.inbound', 'Inbound')} stroke={NEON} strokeWidth={2} fillOpacity={1} fill="url(#readGradient)" />
                  <Area type="monotone" dataKey="written" name={t('chutnexPages.traffic.outbound', 'Outbound')} stroke={CHART_COLORS[2]} strokeWidth={2} fillOpacity={1} fill="url(#writtenGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Traffic by Node Type */}
          <ChartCard
            title={t('chutnexPages.traffic.trafficByNodeType', 'Traffic by Node Type')}
            subtitle={t('chutnexPages.traffic.bandwidthByType', 'Bandwidth by type')}
            icon={<BarChart3 size={16} />}
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nodeTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={formatBytesShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Bar dataKey="read" name={t('chutnexPages.traffic.read', 'Read')} fill={NEON} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="written" name={t('chutnexPages.traffic.written', 'Written')} fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Inbound vs Outbound Pie Chart */}
          <ChartCard
            title={t('chutnexPages.traffic.trafficDirection', 'Traffic Direction')}
            subtitle={t('chutnexPages.traffic.inVsOut', 'Inbound vs Outbound')}
            icon={<PieChartIcon size={16} />}
          >
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inOutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                  >
                    {inOutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatBytes(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {inOutData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-gray-400">{item.name}</span>
                  <span style={{ color: NEON }} className="font-medium">{formatBytes(item.value)}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Top Talkers */}
          <ChartCard
            title={t('chutnexPages.traffic.topTalkers', 'Top Talkers')}
            subtitle={t('chutnexPages.traffic.highestTraffic', 'Highest traffic nodes')}
            icon={<TrendingUp size={16} />}
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTalkersData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={formatBytesShort} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name={t('chutnexPages.traffic.total', 'Total')} fill={NEON} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Cumulative Traffic Line Chart */}
          <ChartCard
            title={t('chutnexPages.traffic.cumulativeTraffic', 'Cumulative Traffic')}
            subtitle={t('chutnexPages.traffic.trafficGrowth', 'Traffic growth over time')}
            icon={<Layers size={16} />}
            fullWidth
          >
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={formatBytesShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Line type="monotone" dataKey="cumTotal" name={t('chutnexPages.traffic.total', 'Total')} stroke={NEON} strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="cumRead" name={t('chutnexPages.traffic.inbound', 'Inbound')} stroke={CHART_COLORS[1]} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="cumWritten" name={t('chutnexPages.traffic.outbound', 'Outbound')} stroke={CHART_COLORS[2]} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Node Traffic Table */}
        <ChartCard
          title={t('chutnexPages.traffic.nodeTrafficTable', 'Node Traffic Table')}
          subtitle={t('chutnexPages.traffic.completeStats', 'Complete traffic statistics')}
          icon={<Database size={16} />}
          fullWidth
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t('chutnexPages.traffic.node', 'Node')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t('chutnexPages.traffic.type', 'Type')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">{t('chutnexPages.traffic.read', 'Read')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">{t('chutnexPages.traffic.written', 'Written')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">{t('chutnexPages.traffic.total', 'Total')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">{t('chutnexPages.traffic.share', 'Share')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">{t('chutnexPages.traffic.distribution', 'Distribution')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes
                  .sort((a, b) => (b.bytes_read + b.bytes_written) - (a.bytes_read + a.bytes_written))
                  .map((node, index) => {
                    const nodeTotal = node.bytes_read + node.bytes_written;
                    const percentage = totalTraffic > 0 ? (nodeTotal / totalTraffic) * 100 : 0;
                    const readPercent = nodeTotal > 0 ? (node.bytes_read / nodeTotal) * 100 : 0;
                    
                    return (
                      <tr key={node.node_id} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-500">#{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className="text-white text-sm font-medium">{node.node_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: NEON_DIM, color: NEON }}>
                            {node.node_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">{formatBytes(node.bytes_read)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">{formatBytes(node.bytes_written)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium" style={{ color: NEON }}>{formatBytes(nodeTotal)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-400">{percentage.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden flex">
                            <div className="h-full" style={{ width: `${readPercent}%`, backgroundColor: NEON }} />
                            <div className="h-full" style={{ width: `${100 - readPercent}%`, backgroundColor: CHART_COLORS[2] }} />
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
