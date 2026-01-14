/**
 * BandwidthChartPage - Advanced Bandwidth Visualization
 * =====================================================
 * Comprehensive bandwidth charts with multiple visualization types,
 * real-time updates, historical comparison, and detailed metrics.
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
  ComposedChart,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import { 
  Activity,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
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
  Layers,
  Filter,
  AlertCircle,
  Radio,
  Maximize2,
  Minimize2,
  Settings,
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

type ChartType = 'area' | 'line' | 'bar' | 'composed' | 'radar';
type TimeRange = '1m' | '5m' | '15m' | '30m' | '1h';

const TIME_RANGES: { label: string; value: TimeRange; points: number }[] = [
  { label: '1 Min', value: '1m', points: 12 },
  { label: '5 Min', value: '5m', points: 30 },
  { label: '15 Min', value: '15m', points: 45 },
  { label: '30 Min', value: '30m', points: 60 },
  { label: '1 Hour', value: '1h', points: 120 },
];

const REFRESH_INTERVALS = [
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
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

const formatBytesPerSec = (bytes: number): string => {
  return `${formatBytesShort(bytes)}/s`;
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
            {formatBytes(entry.value)}
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
  compact?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, trend, compact }) => (
  <div className={`bg-gray-800/50 rounded-lg border border-gray-700/50 ${compact ? 'p-3' : 'p-4'} hover:border-[#88CED0]/30 transition-all`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold mt-1`} style={{ color: NEON }}>{value}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.positive ? (
              <ArrowUpRight size={10} style={{ color: NEON }} />
            ) : (
              <ArrowDownLeft size={10} className="text-gray-400" />
            )}
            <span className="text-xs" style={{ color: trend.positive ? NEON : '#9ca3af' }}>
              {trend.value.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <div className={`${compact ? 'p-1.5' : 'p-2.5'} rounded-lg`} style={{ backgroundColor: NEON_DIM }}>
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
  onExpand?: () => void;
  expanded?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, icon, children, fullWidth, onExpand, expanded }) => (
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
      {onExpand && (
        <button
          onClick={onExpand}
          className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
        >
          {expanded ? <Minimize2 size={14} style={{ color: NEON }} /> : <Maximize2 size={14} style={{ color: NEON }} />}
        </button>
      )}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function BandwidthChartPage() {
  const { id: networkId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  
  // State
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bandwidthHistory, setBandwidthHistory] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('5m');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [showGrid, setShowGrid] = useState(true);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // Get max points for current time range
  const maxPoints = TIME_RANGES.find(r => r.value === timeRange)?.points || 30;

  // Fetch data
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (!networkId) return;
    if (showRefreshIndicator) setIsRefreshing(true);
    
    try {
      const data = await analyticsApi.getNetworkAnalytics(networkId);
      setAnalytics(data);
      setLastUpdated(new Date());
      setError(null);
      
      // Calculate rate (bytes per interval)
      setBandwidthHistory(prev => {
        const now = new Date();
        const prevTotal = prev.length > 0 ? prev[prev.length - 1] : null;
        
        const currentRead = data.bandwidth?.total_bytes_read || 0;
        const currentWritten = data.bandwidth?.total_bytes_written || 0;
        
        // Calculate rate since last update
        const readRate = prevTotal ? Math.max(0, currentRead - (prevTotal.totalRead || 0)) : 0;
        const writeRate = prevTotal ? Math.max(0, currentWritten - (prevTotal.totalWritten || 0)) : 0;
        
        const newEntry = {
          time: now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp: now.getTime(),
          read: readRate,
          written: writeRate,
          total: readRate + writeRate,
          totalRead: currentRead,
          totalWritten: currentWritten,
          avgRead: 0,
          avgWritten: 0,
        };
        
        const updated = [...prev, newEntry].slice(-maxPoints);
        
        // Calculate moving averages
        const windowSize = Math.min(5, updated.length);
        if (updated.length >= windowSize) {
          const lastN = updated.slice(-windowSize);
          newEntry.avgRead = lastN.reduce((sum, e) => sum + e.read, 0) / windowSize;
          newEntry.avgWritten = lastN.reduce((sum, e) => sum + e.written, 0) / windowSize;
        }
        
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [networkId, maxPoints]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  useEffect(() => {
    if (refreshInterval === 0) return;
    const interval = setInterval(() => fetchData(true), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (bandwidthHistory.length < 2) return {
      currentRate: 0,
      peakRate: 0,
      avgRate: 0,
      minRate: 0,
      totalTransferred: 0,
      readRatio: 50,
    };

    const rates = bandwidthHistory.map(h => h.total);
    const currentRate = rates[rates.length - 1] || 0;
    const peakRate = Math.max(...rates);
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const minRate = Math.min(...rates.filter(r => r > 0)) || 0;
    
    const totalRead = bandwidthHistory[bandwidthHistory.length - 1]?.totalRead || 0;
    const totalWritten = bandwidthHistory[bandwidthHistory.length - 1]?.totalWritten || 0;
    const totalTransferred = totalRead + totalWritten;
    const readRatio = totalTransferred > 0 ? (totalRead / totalTransferred) * 100 : 50;

    return { currentRate, peakRate, avgRate, minRate, totalTransferred, readRatio };
  }, [bandwidthHistory]);

  // Node type breakdown
  const nodeTypeBreakdown = useMemo(() => {
    const nodes = analytics?.nodes?.stats || [];
    const types = ['da', 'guard', 'middle', 'exit', 'client', 'hs'];
    
    return types.map((type, index) => {
      const typeNodes = nodes.filter(n => n.node_type === type);
      const read = typeNodes.reduce((sum, n) => sum + n.bytes_read, 0);
      const written = typeNodes.reduce((sum, n) => sum + n.bytes_written, 0);
      return {
        type: type.toUpperCase(),
        read,
        written,
        total: read + written,
        count: typeNodes.length,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      };
    }).filter(d => d.count > 0);
  }, [analytics]);

  // Radar data
  const radarData = useMemo(() => {
    return nodeTypeBreakdown.map(d => ({
      subject: d.type,
      read: d.read,
      written: d.written,
      fullMark: Math.max(...nodeTypeBreakdown.map(n => Math.max(n.read, n.written))) * 1.2,
    }));
  }, [nodeTypeBreakdown]);

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
            <Link to={`/tor-networks/${networkId}/analytics/traffic`} className="text-gray-500 hover:text-[#88CED0] transition-colors">
              Traffic
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <span style={{ color: NEON }}>Bandwidth Chart</span>
          </div>

          {/* Title */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
                <BarChart3 size={24} style={{ color: NEON }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Bandwidth Chart</h1>
                <p className="text-gray-500 text-sm">Advanced bandwidth visualization and analysis</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Time Range */}
              <div className="flex items-center gap-1 bg-gray-800/50 border border-gray-700/50 rounded-lg p-1">
                {TIME_RANGES.map(range => (
                  <button
                    key={range.value}
                    onClick={() => setTimeRange(range.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      timeRange === range.value
                        ? 'bg-[#88CED0]/20 text-[#88CED0]'
                        : 'text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {/* Chart Type */}
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-white"
              >
                <option value="area">Area Chart</option>
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="composed">Composed</option>
              </select>

              {/* Refresh Rate */}
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

              {lastUpdated && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} />
                  {lastUpdated.toLocaleTimeString()}
                </div>
              )}

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
                <Radio size={14} style={{ color: NEON }} className="animate-pulse" />
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
            title="Current Rate"
            value={formatBytesPerSec(stats.currentRate)}
            subtitle="Real-time throughput"
            icon={<Zap size={18} />}
            compact
          />
          <StatCard
            title="Peak Rate"
            value={formatBytesPerSec(stats.peakRate)}
            subtitle={`Last ${timeRange}`}
            icon={<TrendingUp size={18} />}
            compact
          />
          <StatCard
            title="Average Rate"
            value={formatBytesPerSec(stats.avgRate)}
            subtitle="Mean throughput"
            icon={<Activity size={18} />}
            compact
          />
          <StatCard
            title="Min Rate"
            value={formatBytesPerSec(stats.minRate)}
            subtitle="Lowest (non-zero)"
            icon={<ArrowDownLeft size={18} />}
            compact
          />
          <StatCard
            title="Total Transferred"
            value={formatBytes(stats.totalTransferred)}
            subtitle="All time"
            icon={<HardDrive size={18} />}
            compact
          />
          <StatCard
            title="Read/Write"
            value={`${stats.readRatio.toFixed(0)}%/${(100 - stats.readRatio).toFixed(0)}%`}
            subtitle="Traffic ratio"
            icon={<Layers size={18} />}
            compact
          />
        </div>

        {/* Main Chart */}
        <ChartCard
          title="Real-time Bandwidth"
          subtitle={`Live throughput over last ${TIME_RANGES.find(r => r.value === timeRange)?.label || timeRange}`}
          icon={<Activity size={16} />}
          fullWidth
        >
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={bandwidthHistory}>
                  <defs>
                    <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NEON} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={NEON} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="writeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />}
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatBytesShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <ReferenceLine y={stats.avgRate} stroke="#4FA3A5" strokeDasharray="5 5" label={{ value: 'Avg', fill: '#4FA3A5', fontSize: 10 }} />
                  <Area type="monotone" dataKey="read" name="Read" stroke={NEON} strokeWidth={2} fillOpacity={1} fill="url(#readGrad)" />
                  <Area type="monotone" dataKey="written" name="Written" stroke={CHART_COLORS[2]} strokeWidth={2} fillOpacity={1} fill="url(#writeGrad)" />
                  <Brush dataKey="time" height={20} stroke={NEON} fill="#1e293b" />
                </AreaChart>
              ) : chartType === 'line' ? (
                <LineChart data={bandwidthHistory}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatBytesShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <ReferenceLine y={stats.avgRate} stroke="#4FA3A5" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="read" name="Read" stroke={NEON} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="written" name="Written" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="avgRead" name="Avg Read" stroke={CHART_COLORS[3]} strokeWidth={1} strokeDasharray="5 5" dot={false} />
                  <Brush dataKey="time" height={20} stroke={NEON} fill="#1e293b" />
                </LineChart>
              ) : chartType === 'bar' ? (
                <BarChart data={bandwidthHistory}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />}
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatBytesShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Bar dataKey="read" name="Read" fill={NEON} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="written" name="Written" fill={CHART_COLORS[2]} radius={[2, 2, 0, 0]} />
                  <Brush dataKey="time" height={20} stroke={NEON} fill="#1e293b" />
                </BarChart>
              ) : (
                <ComposedChart data={bandwidthHistory}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatBytesShort} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Bar dataKey="read" name="Read" fill={NEON} opacity={0.6} />
                  <Line type="monotone" dataKey="written" name="Written" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="total" name="Total" stroke={CHART_COLORS[3]} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Brush dataKey="time" height={20} stroke={NEON} fill="#1e293b" />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Node Type Breakdown */}
          <ChartCard
            title="Bandwidth by Node Type"
            subtitle="Traffic distribution across node types"
            icon={<Server size={16} />}
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nodeTypeBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatBytesShort} />
                  <YAxis type="category" dataKey="type" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Bar dataKey="read" name="Read" fill={NEON} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="written" name="Written" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Radar Chart */}
          <ChartCard
            title="Traffic Radar"
            subtitle="Comparative view by node type"
            icon={<Eye size={16} />}
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#6b7280', fontSize: 9 }} tickFormatter={formatBytesShort} />
                  <Radar name="Read" dataKey="read" stroke={NEON} fill={NEON} fillOpacity={0.3} />
                  <Radar name="Written" dataKey="written" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.3} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Tooltip formatter={(value: number) => formatBytes(value)} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Cumulative Traffic */}
          <ChartCard
            title="Cumulative Bandwidth"
            subtitle="Total data transferred over time"
            icon={<Layers size={16} />}
            fullWidth
          >
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bandwidthHistory}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NEON} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={NEON} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatBytesShort} />
                  <Tooltip formatter={(value: number) => formatBytes(value)} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Area type="monotone" dataKey="totalRead" name="Total Read" stroke={NEON} strokeWidth={2} fillOpacity={1} fill="url(#cumGrad)" />
                  <Area type="monotone" dataKey="totalWritten" name="Total Written" stroke={CHART_COLORS[2]} strokeWidth={2} fillOpacity={0.3} fill={CHART_COLORS[2]} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Data Table */}
        <ChartCard
          title="Bandwidth History"
          subtitle="Recent bandwidth measurements"
          icon={<Database size={16} />}
          fullWidth
        >
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="border-b border-gray-700/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Read</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Written</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Cumulative Read</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Cumulative Written</th>
                </tr>
              </thead>
              <tbody>
                {[...bandwidthHistory].reverse().slice(0, 20).map((entry, index) => (
                  <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-sm text-gray-300">{entry.time}</td>
                    <td className="px-4 py-2 text-sm text-right" style={{ color: NEON }}>{formatBytes(entry.read)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-300">{formatBytes(entry.written)}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium" style={{ color: NEON }}>{formatBytes(entry.total)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-400">{formatBytes(entry.totalRead)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-400">{formatBytes(entry.totalWritten)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
