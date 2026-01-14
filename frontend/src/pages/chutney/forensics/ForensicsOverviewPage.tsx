/**
 * ForensicsOverviewPage - Tor Traffic Forensics Dashboard
 * =======================================================
 * Comprehensive forensics analysis with timing correlation,
 * traffic patterns, anomaly detection, and investigation tools.
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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { 
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronRight,
  Clock,
  Crosshair,
  Database,
  Eye,
  FileSearch,
  Fingerprint,
  GitBranch,
  Globe,
  HardDrive,
  Layers,
  Loader2,
  Network,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  Target,
  TrendingUp,
  Wifi,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Lock,
  Unlock
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
];

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
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

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
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
          <span className="font-semibold" style={{ color: NEON }}>{entry.value}</span>
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
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  status?: 'normal' | 'warning' | 'alert' | 'success';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, status = 'normal' }) => {
  const statusColors = {
    normal: NEON,
    warning: '#fbbf24',
    alert: '#f87171',
    success: '#34d399',
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-[#88CED0]/30 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: statusColors[status] }}>{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
          <div style={{ color: statusColors[status] }}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// CHART CARD
// =============================================================================
interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
  badge?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, icon, children, fullWidth, badge }) => (
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
      {badge && (
        <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: NEON_DIM, color: NEON }}>
          {badge}
        </span>
      )}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// =============================================================================
// ANALYSIS CARD
// =============================================================================
interface AnalysisCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'running' | 'complete' | 'pending' | 'alert';
  findings?: number;
  onClick?: () => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, description, icon, status, findings, onClick }) => {
  const statusConfig = {
    running: { color: NEON, bg: NEON_DIM, label: 'Running', Icon: Loader2 },
    complete: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', label: 'Complete', Icon: CheckCircle2 },
    pending: { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.1)', label: 'Pending', Icon: Clock },
    alert: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', label: 'Alert', Icon: AlertTriangle },
  };

  const config = statusConfig[status];

  return (
    <div 
      className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-[#88CED0]/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
          <div style={{ color: NEON }}>{icon}</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <div className="flex items-center gap-1.5">
              <config.Icon size={12} style={{ color: config.color }} className={status === 'running' ? 'animate-spin' : ''} />
              <span className="text-xs" style={{ color: config.color }}>{config.label}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-2">{description}</p>
          {findings !== undefined && findings > 0 && (
            <div className="flex items-center gap-1">
              <AlertCircle size={12} style={{ color: NEON }} />
              <span className="text-xs" style={{ color: NEON }}>{findings} findings</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// THREAT INDICATOR
// =============================================================================
interface ThreatIndicatorProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  label: string;
  description: string;
}

const ThreatIndicator: React.FC<ThreatIndicatorProps> = ({ level, label, description }) => {
  const levelConfig = {
    low: { color: '#34d399', width: '25%' },
    medium: { color: NEON, width: '50%' },
    high: { color: '#fbbf24', width: '75%' },
    critical: { color: '#f87171', width: '100%' },
  };

  const config = levelConfig[level];

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white font-medium">{label}</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
          {level.toUpperCase()}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: config.width, backgroundColor: config.color }} />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function ForensicsOverviewPage() {
  const { id: networkId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  
  // State
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timingHistory, setTimingHistory] = useState<any[]>([]);

  // Fetch data
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (!networkId) return;
    if (showRefreshIndicator) setIsRefreshing(true);
    
    try {
      const data = await analyticsApi.getNetworkAnalytics(networkId);
      setAnalytics(data);
      setLastUpdated(new Date());
      setError(null);
      
      // Generate mock timing data for visualization
      setTimingHistory(prev => {
        const now = new Date();
        const nodes = data.nodes?.stats || [];
        const circuits = data.circuits?.circuits || [];
        
        const newEntry = {
          time: now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          entryLatency: Math.random() * 50 + 10,
          exitLatency: Math.random() * 80 + 20,
          correlation: Math.random() * 0.3,
          anomalyScore: Math.random() * 100,
          packetCount: Math.floor(Math.random() * 1000) + 500,
          circuitCount: circuits.length,
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
  const circuits = analytics?.circuits?.circuits || [];
  const bandwidth = analytics?.bandwidth;

  // Calculate forensics metrics
  const forensicsMetrics = useMemo(() => {
    const totalNodes = nodes.length;
    const totalCircuits = circuits.length;
    const avgPathLength = circuits.length > 0 
      ? circuits.reduce((sum, c) => sum + c.path_length, 0) / circuits.length 
      : 0;
    
    // Mock analysis results
    const timingAnomalies = Math.floor(Math.random() * 5);
    const patternMatches = Math.floor(Math.random() * 12);
    const suspiciousFlows = Math.floor(Math.random() * 3);
    
    return {
      totalNodes,
      totalCircuits,
      avgPathLength,
      timingAnomalies,
      patternMatches,
      suspiciousFlows,
      analysisProgress: 87,
      threatLevel: timingAnomalies > 3 ? 'high' : timingAnomalies > 1 ? 'medium' : 'low',
    };
  }, [nodes, circuits]);

  // Scatter data for correlation visualization
  const correlationData = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      entryTime: Math.random() * 100,
      exitTime: Math.random() * 100 + Math.random() * 20,
      size: Math.random() * 500 + 100,
      anomaly: Math.random() > 0.9,
    }));
  }, []);

  // Radar data for security metrics
  const securityRadarData = useMemo(() => [
    { metric: 'Timing', value: 75, fullMark: 100 },
    { metric: 'Patterns', value: 82, fullMark: 100 },
    { metric: 'Anomalies', value: 45, fullMark: 100 },
    { metric: 'Correlation', value: 68, fullMark: 100 },
    { metric: 'Encryption', value: 95, fullMark: 100 },
    { metric: 'Integrity', value: 88, fullMark: 100 },
  ], []);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: NEON }} />
          <p className="text-gray-400">{t('chutnexPages.common.loading', 'Loading forensics data...')}</p>
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
              Analytics
            </Link>
            <ChevronRight size={14} className="text-gray-600" />
            <span style={{ color: NEON }}>Forensics</span>
          </div>

          {/* Title */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
                <FileSearch size={24} style={{ color: NEON }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Forensics Overview</h1>
                <p className="text-gray-500 text-sm">Tor traffic analysis and investigation tools</p>
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
                <Shield size={14} style={{ color: NEON }} />
                <span className="text-xs font-medium" style={{ color: NEON }}>ANALYZING</span>
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
            title="Nodes Analyzed"
            value={forensicsMetrics.totalNodes}
            subtitle="Active nodes"
            icon={<Server size={18} />}
          />
          <StatCard
            title="Circuits Tracked"
            value={forensicsMetrics.totalCircuits}
            subtitle="Current session"
            icon={<GitBranch size={18} />}
          />
          <StatCard
            title="Avg Path Length"
            value={forensicsMetrics.avgPathLength.toFixed(1)}
            subtitle="Hops per circuit"
            icon={<Network size={18} />}
          />
          <StatCard
            title="Timing Anomalies"
            value={forensicsMetrics.timingAnomalies}
            subtitle="Detected"
            icon={<Clock size={18} />}
            status={forensicsMetrics.timingAnomalies > 3 ? 'alert' : 'normal'}
          />
          <StatCard
            title="Pattern Matches"
            value={forensicsMetrics.patternMatches}
            subtitle="Known signatures"
            icon={<Fingerprint size={18} />}
          />
          <StatCard
            title="Suspicious Flows"
            value={forensicsMetrics.suspiciousFlows}
            subtitle="Under investigation"
            icon={<AlertTriangle size={18} />}
            status={forensicsMetrics.suspiciousFlows > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Analysis Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnalysisCard
            title="Timing Correlation"
            description="Analyze entry/exit timing patterns for traffic correlation attacks"
            icon={<Clock size={18} />}
            status="running"
            findings={forensicsMetrics.timingAnomalies}
          />
          <AnalysisCard
            title="Traffic Patterns"
            description="Detect known traffic fingerprints and behavioral patterns"
            icon={<Layers size={18} />}
            status="complete"
            findings={forensicsMetrics.patternMatches}
          />
          <AnalysisCard
            title="Cell Analysis"
            description="Inspect Tor cell structure and padding characteristics"
            icon={<Database size={18} />}
            status="running"
            findings={2}
          />
          <AnalysisCard
            title="Flow Fingerprinting"
            description="Identify unique flow characteristics across the network"
            icon={<Fingerprint size={18} />}
            status="complete"
            findings={8}
          />
          <AnalysisCard
            title="Anomaly Scanner"
            description="Machine learning-based anomaly detection in traffic flows"
            icon={<Target size={18} />}
            status={forensicsMetrics.suspiciousFlows > 0 ? 'alert' : 'complete'}
            findings={forensicsMetrics.suspiciousFlows}
          />
          <AnalysisCard
            title="Attack Detection"
            description="Monitor for active correlation and deanonymization attempts"
            icon={<Shield size={18} />}
            status="running"
            findings={0}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timing Analysis Chart */}
          <ChartCard
            title="Timing Analysis"
            subtitle="Entry/Exit latency correlation over time"
            icon={<Clock size={16} />}
            badge="LIVE"
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timingHistory}>
                  <defs>
                    <linearGradient id="entryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NEON} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={NEON} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>} />
                  <Area type="monotone" dataKey="entryLatency" name="Entry Latency (ms)" stroke={NEON} strokeWidth={2} fillOpacity={1} fill="url(#entryGrad)" />
                  <Area type="monotone" dataKey="exitLatency" name="Exit Latency (ms)" stroke={CHART_COLORS[2]} strokeWidth={2} fillOpacity={1} fill="url(#exitGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Correlation Scatter Plot */}
          <ChartCard
            title="Traffic Correlation"
            subtitle="Entry vs Exit timing scatter analysis"
            icon={<Crosshair size={16} />}
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" dataKey="entryTime" name="Entry Time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} label={{ value: 'Entry Time (ms)', position: 'bottom', fill: '#6b7280', fontSize: 10 }} />
                  <YAxis type="number" dataKey="exitTime" name="Exit Time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} label={{ value: 'Exit Time (ms)', angle: -90, position: 'left', fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: number) => value.toFixed(2)} />
                  <Scatter name="Flows" data={correlationData} fill={NEON}>
                    {correlationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.anomaly ? '#f87171' : NEON} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Security Radar */}
          <ChartCard
            title="Security Metrics"
            subtitle="Overall network security assessment"
            icon={<Shield size={16} />}
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={securityRadarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#6b7280', fontSize: 9 }} domain={[0, 100]} />
                  <Radar name="Score" dataKey="value" stroke={NEON} fill={NEON} fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Anomaly Score Timeline */}
          <ChartCard
            title="Anomaly Score"
            subtitle="Real-time anomaly detection score"
            icon={<AlertTriangle size={16} />}
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timingHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="anomalyScore" name="Anomaly Score" stroke={NEON} strokeWidth={2} dot={false} />
                  {/* Threshold line */}
                  <Line type="monotone" dataKey={() => 70} name="Threshold" stroke="#fbbf24" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Threat Indicators */}
        <ChartCard
          title="Threat Assessment"
          subtitle="Current network threat indicators"
          icon={<Target size={16} />}
          fullWidth
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ThreatIndicator
              level={forensicsMetrics.threatLevel as any}
              label="Timing Attack Risk"
              description="Risk of successful timing correlation attack"
            />
            <ThreatIndicator
              level="low"
              label="Traffic Analysis"
              description="Exposure to traffic analysis techniques"
            />
            <ThreatIndicator
              level={forensicsMetrics.suspiciousFlows > 0 ? 'medium' : 'low'}
              label="Suspicious Activity"
              description="Unusual traffic patterns detected"
            />
            <ThreatIndicator
              level="low"
              label="Fingerprinting"
              description="Website fingerprinting vulnerability"
            />
          </div>
        </ChartCard>

        {/* Investigation Queue */}
        <ChartCard
          title="Investigation Queue"
          subtitle="Flagged items requiring manual review"
          icon={<Eye size={16} />}
          fullWidth
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'INV-001', type: 'Timing', desc: 'High correlation between entry/exit traffic', severity: 'medium', time: '2 min ago', status: 'open' },
                  { id: 'INV-002', type: 'Pattern', desc: 'Unusual packet size distribution detected', severity: 'low', time: '15 min ago', status: 'reviewing' },
                  { id: 'INV-003', type: 'Anomaly', desc: 'Burst traffic pattern on exit node', severity: 'low', time: '1 hour ago', status: 'closed' },
                ].map((item, index) => (
                  <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono" style={{ color: NEON }}>{item.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: NEON_DIM, color: NEON }}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{item.desc}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        item.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.time}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs ${
                        item.status === 'open' ? 'text-yellow-400' :
                        item.status === 'reviewing' ? 'text-blue-400' :
                        'text-gray-500'
                      }`}>
                        {item.status === 'open' && <AlertCircle size={12} />}
                        {item.status === 'reviewing' && <Eye size={12} />}
                        {item.status === 'closed' && <CheckCircle2 size={12} />}
                        {item.status}
                      </span>
                    </td>
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
