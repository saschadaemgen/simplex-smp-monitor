/**
 * SimpleX SMP Monitor - Cache Forensics Page
 * ===========================================
 * Copyright (c) 2026 cannatoshi
 * https://github.com/cannatoshi/simplex-smp-monitor
 *
 * Comprehensive cache analytics and forensics dashboard.
 * Features: Download History, Bandwidth Analysis, Activity Heatmap, Correlation Finder
 */
import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import {
  fetchCacheHistory,
  fetchCacheAnalytics,
  fetchCorrelation,
  cleanupCacheHistory,
  clearAllCache,
  cancelActiveDownloads,
  CacheLogEntry,
  CacheAnalytics,
  CorrelationResult,
} from '../api/cacheForensics';
import { fetchCacheStatus, fetchCacheSettings, updateCacheSettings, CacheStatus, CacheSettings } from '../api/music';

// Design System Colors
const neonBlue = '#88CED0';
const neonGlow = '0 0 8px rgba(136, 206, 208, 0.4)';
const cyan = '#22D3EE';
const green = '#22c55e';
const red = '#ef4444';
const yellow = '#eab308';
const purple = '#a855f7';

const neonButtonStyle: React.CSSProperties = {
  backgroundColor: 'rgb(30, 41, 59)',
  color: neonBlue,
  border: `1px solid ${neonBlue}`,
  boxShadow: neonGlow
};

const dangerButtonStyle: React.CSSProperties = {
  backgroundColor: 'rgb(30, 41, 59)',
  color: red,
  border: `1px solid ${red}`,
  boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
};

// Tab type
type TabId = 'overview' | 'history' | 'bandwidth' | 'correlation' | 'settings';

// ============================================================================
// SVG Icons
// ============================================================================

const IconOverview = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const IconHistory = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconBandwidth = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const IconCorrelation = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconSettings = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
);

const IconX = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconSpinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const IconRefresh = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconExport = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ============================================================================
// Helper Functions
// ============================================================================

const formatBytes = (bytes: number | null): string => {
  if (bytes === null || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDuration = (seconds: number | null): string => {
  if (seconds === null) return '-';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
    case 'cached':
      return green;
    case 'failed':
    case 'cancelled':
      return red;
    case 'downloading':
    case 'started':
    case 'converting':
      return yellow;
    default:
      return '#64748b';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
    case 'cached':
      return <IconCheck />;
    case 'failed':
    case 'cancelled':
      return <IconX />;
    case 'downloading':
    case 'started':
    case 'converting':
      return <IconSpinner />;
    default:
      return null;
  }
};

// Weekday names for heatmap
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// Main Component
// ============================================================================

export default function CacheForensics() {
  // State
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CacheAnalytics | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [cacheSettings, setCacheSettingsState] = useState<CacheSettings | null>(null);
  const [analyticsDays] = useState(30);
  
  // History state
  const [history, setHistory] = useState<CacheLogEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('');
  
  // Correlation state
  const [correlationStart, setCorrelationStart] = useState('');
  const [correlationEnd, setCorrelationEnd] = useState('');
  const [correlationResult, setCorrelationResult] = useState<CorrelationResult | null>(null);
  const [correlationLoading, setCorrelationLoading] = useState(false);
  
  // ============================================================================
  // Data Loading
  // ============================================================================
  
  const loadAnalytics = async (days: number = analyticsDays) => {
    try {
      const data = await fetchCacheAnalytics(days);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };
  
  const loadCacheStatus = async () => {
    try {
      const status = await fetchCacheStatus();
      setCacheStatus(status);
    } catch (err) {
      console.error('Failed to load cache status:', err);
    }
  };
  
  const loadSettings = async () => {
    try {
      const settings = await fetchCacheSettings();
      setCacheSettingsState(settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };
  
  const loadHistory = async (page: number = 1, status?: string) => {
    setHistoryLoading(true);
    try {
      const data = await fetchCacheHistory({
        page,
        page_size: 50,
        status: status || undefined,
        order: '-started_at'
      });
      setHistory(data.results);
      setHistoryTotal(data.count);
      setHistoryPage(page);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([
      loadAnalytics(),
      loadCacheStatus(),
      loadSettings(),
    ]);
    setIsLoading(false);
  };
  
  useEffect(() => {
    loadAll();
  }, []);
  
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory(1, historyFilter);
    }
  }, [activeTab, historyFilter]);
  
  // ============================================================================
  // Actions
  // ============================================================================
  
  const handleUpdateSettings = async (updates: Partial<CacheSettings>) => {
    if (!cacheSettings) return;
    try {
      const updated = await updateCacheSettings(updates);
      setCacheSettingsState(updated);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };
  
  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to delete ALL cached audio files? This cannot be undone.')) return;
    
    try {
      const result = await clearAllCache();
      alert(`Deleted ${result.deleted_count} files (${formatBytes(result.freed_bytes)})`);
      loadCacheStatus();
      loadAnalytics();
    } catch (err) {
      console.error('Failed to clear cache:', err);
      alert('Failed to clear cache');
    }
  };
  
  const handleCleanupHistory = async (days: number) => {
    if (!confirm(`Delete all cache logs older than ${days} days?`)) return;
    
    try {
      const result = await cleanupCacheHistory(days);
      alert(`Deleted ${result.deleted_count} log entries`);
      loadHistory(1, historyFilter);
      loadAnalytics();
    } catch (err) {
      console.error('Failed to cleanup history:', err);
      alert('Failed to cleanup history');
    }
  };
  
  const handleFindCorrelation = async () => {
    if (!correlationStart || !correlationEnd) {
      alert('Please select start and end time');
      return;
    }
    
    setCorrelationLoading(true);
    try {
      const result = await fetchCorrelation(correlationStart, correlationEnd);
      setCorrelationResult(result);
    } catch (err) {
      console.error('Failed to find correlation:', err);
      alert('Failed to find correlation');
    } finally {
      setCorrelationLoading(false);
    }
  };
  
  const handleExportCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['Date', 'Video ID', 'Status', 'File Size', 'Duration', 'Bandwidth', 'Error'];
    const rows = history.map(log => [
      log.started_at,
      log.video_id,
      log.status,
      log.file_size_bytes || '',
      log.download_duration_seconds || '',
      log.bandwidth_bytes_per_sec || '',
      log.error_message || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // ============================================================================
  // Render: Tabs
  // ============================================================================
  
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <IconOverview /> },
    { id: 'history', label: 'Download History', icon: <IconHistory /> },
    { id: 'bandwidth', label: 'Bandwidth Analysis', icon: <IconBandwidth /> },
    { id: 'correlation', label: 'Correlation Finder', icon: <IconCorrelation /> },
    { id: 'settings', label: 'Settings', icon: <IconSettings /> },
  ];
  
  // ============================================================================
  // Render: Overview Tab
  // ============================================================================
  
  const renderOverview = () => {
    if (!analytics || !cacheStatus) return null;
    
    const { summary, last_24h, downloads_per_day, heatmap } = analytics;
    const cacheSize = cacheStatus.stats.cache_size;
    
    // Prepare pie chart data
    const pieData = [
      { name: 'Used', value: cacheSize.total_mb },
      { name: 'Free', value: Math.max(0, cacheSize.max_mb - cacheSize.total_mb) },
    ];
    
    // Prepare heatmap grid (7 days x 24 hours)
    const heatmapGrid: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    heatmap.forEach(cell => {
      // Adjust weekday (1=Sunday becomes 0)
      const dayIndex = cell.weekday - 1;
      if (dayIndex >= 0 && dayIndex < 7 && cell.hour >= 0 && cell.hour < 24) {
        heatmapGrid[dayIndex][cell.hour] = cell.count;
      }
    });
    const maxHeatmapValue = Math.max(1, ...heatmap.map(c => c.count));
    
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${neonBlue}` }}>
            <p className="text-sm text-slate-400">Total Downloads</p>
            <p className="text-2xl font-bold" style={{ color: neonBlue }}>{summary.total_downloads}</p>
            <p className="text-xs text-slate-500 mt-1">{summary.success_rate}% success rate</p>
          </div>
          
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${green}` }}>
            <p className="text-sm text-slate-400">Total Cached</p>
            <p className="text-2xl font-bold" style={{ color: green }}>{summary.total_gb.toFixed(2)} GB</p>
            <p className="text-xs text-slate-500 mt-1">{cacheSize.file_count} files</p>
          </div>
          
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${cyan}` }}>
            <p className="text-sm text-slate-400">Avg Bandwidth</p>
            <p className="text-2xl font-bold" style={{ color: cyan }}>{summary.avg_bandwidth_kbps} KB/s</p>
            <p className="text-xs text-slate-500 mt-1">Peak: {summary.max_bandwidth_kbps} KB/s</p>
          </div>
          
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${purple}` }}>
            <p className="text-sm text-slate-400">Last 24h</p>
            <p className="text-2xl font-bold" style={{ color: purple }}>{last_24h.total}</p>
            <p className="text-xs text-slate-500 mt-1">{last_24h.total_mb} MB downloaded</p>
          </div>
        </div>
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Storage Pie Chart */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: neonBlue }}>Storage Usage</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill={neonBlue} />
                    <Cell fill="#334155" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: `1px solid ${neonBlue}`, borderRadius: '8px' }}
                    formatter={(value) => [`${Number(value).toFixed(1)} MB`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-2">
              <p className="text-xl font-bold" style={{ color: neonBlue }}>{cacheSize.usage_percent}%</p>
              <p className="text-xs text-slate-500">{cacheSize.total_mb} / {cacheSize.max_mb} MB</p>
            </div>
          </div>
          
          {/* Downloads per Day */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: neonBlue }}>Downloads per Day (Last {analyticsDays} Days)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={downloads_per_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(val) => formatDate(val)}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: `1px solid ${neonBlue}`, borderRadius: '8px' }}
                    labelFormatter={(val) => formatDate(val as string)}
                  />
                  <Area type="monotone" dataKey="completed" stroke={green} fill={green} fillOpacity={0.3} name="Completed" />
                  <Area type="monotone" dataKey="failed" stroke={red} fill={red} fillOpacity={0.3} name="Failed" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Activity Heatmap */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: neonBlue }}>Activity Heatmap (Hour × Day of Week)</h3>
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Hour labels */}
              <div className="flex ml-12 mb-1">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="w-4 text-[8px] text-slate-500 text-center">
                    {i % 3 === 0 ? i : ''}
                  </div>
                ))}
              </div>
              {/* Heatmap rows */}
              {WEEKDAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center">
                  <span className="w-12 text-xs text-slate-500">{day}</span>
                  {heatmapGrid[dayIndex].map((count, hour) => {
                    const intensity = count / maxHeatmapValue;
                    return (
                      <div
                        key={hour}
                        className="w-4 h-4 rounded-sm m-px cursor-pointer transition-transform hover:scale-125"
                        style={{
                          backgroundColor: count === 0 
                            ? '#1e293b' 
                            : `rgba(136, 206, 208, ${0.2 + intensity * 0.8})`,
                        }}
                        title={`${day} ${hour}:00 - ${count} downloads`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
            <span>Less</span>
            <div className="flex">
              {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm m-px"
                  style={{ backgroundColor: intensity === 0 ? '#1e293b' : `rgba(136, 206, 208, ${0.2 + intensity * 0.8})` }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
        
        {/* Active Downloads */}
        {cacheStatus.active_downloads.length > 0 && (
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${yellow}` }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: yellow }}>Active Downloads ({cacheStatus.active_downloads_count})</h3>
            <div className="space-y-2">
              {cacheStatus.active_downloads.map((dl) => (
                <div key={dl.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                  <IconSpinner />
                  <span className="text-sm" style={{ color: neonBlue }}>{dl.video_id}</span>
                  <span className="text-xs text-slate-500">{dl.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // ============================================================================
  // Render: History Tab
  // ============================================================================
  
  const renderHistory = () => {
    const totalPages = Math.ceil(historyTotal / 50);
    
    return (
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-700"
              style={{ color: neonBlue }}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="downloading">Downloading</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <button
              onClick={() => loadHistory(historyPage, historyFilter)}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={neonButtonStyle}
              disabled={historyLoading}
            >
              {historyLoading ? <IconSpinner /> : <IconRefresh />}
              Refresh
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={neonButtonStyle}
              disabled={history.length === 0}
            >
              <IconExport />
              Export CSV
            </button>
            
            <span className="text-sm text-slate-500">{historyTotal} total entries</span>
          </div>
        </div>
        
        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Time</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Video ID</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">Size</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">Duration</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium">Speed</th>
                  <th className="px-4 py-3 text-left text-slate-400 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <IconSpinner />
                      <span className="ml-2">Loading...</span>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No download history found
                    </td>
                  </tr>
                ) : (
                  history.map((log) => (
                    <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-slate-300">{formatDateTime(log.started_at)}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://youtube.com/watch?v=${log.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          style={{ color: neonBlue }}
                        >
                          {log.video_id}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                          style={{ color: getStatusColor(log.status), backgroundColor: `${getStatusColor(log.status)}20` }}
                        >
                          {getStatusIcon(log.status)}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatBytes(log.file_size_bytes)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatDuration(log.download_duration_seconds)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {log.bandwidth_bytes_per_sec ? `${(log.bandwidth_bytes_per_sec / 1024).toFixed(0)} KB/s` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-xs" title={log.error_message}>
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => loadHistory(historyPage - 1, historyFilter)}
              disabled={historyPage <= 1 || historyLoading}
              className="px-3 py-1 rounded text-sm disabled:opacity-50"
              style={neonButtonStyle}
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {historyPage} of {totalPages}
            </span>
            <button
              onClick={() => loadHistory(historyPage + 1, historyFilter)}
              disabled={historyPage >= totalPages || historyLoading}
              className="px-3 py-1 rounded text-sm disabled:opacity-50"
              style={neonButtonStyle}
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // ============================================================================
  // Render: Bandwidth Tab
  // ============================================================================
  
  const renderBandwidth = () => {
    if (!analytics) return null;
    
    const { bandwidth_timeline, size_distribution, summary } = analytics;
    
    return (
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${cyan}` }}>
            <p className="text-sm text-slate-400">Average Speed</p>
            <p className="text-2xl font-bold" style={{ color: cyan }}>{summary.avg_bandwidth_kbps} KB/s</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${green}` }}>
            <p className="text-sm text-slate-400">Peak Speed</p>
            <p className="text-2xl font-bold" style={{ color: green }}>{summary.max_bandwidth_kbps} KB/s</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${purple}` }}>
            <p className="text-sm text-slate-400">Avg Duration</p>
            <p className="text-2xl font-bold" style={{ color: purple }}>{summary.avg_duration_seconds}s</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${neonBlue}` }}>
            <p className="text-sm text-slate-400">Total Time</p>
            <p className="text-2xl font-bold" style={{ color: neonBlue }}>{summary.total_duration_minutes}m</p>
          </div>
        </div>
        
        {/* Bandwidth Timeline */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: neonBlue }}>Bandwidth Over Time (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bandwidth_timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#64748b" 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(val) => formatTime(val)}
                />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} unit=" KB/s" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: `1px solid ${neonBlue}`, borderRadius: '8px' }}
                  labelFormatter={(val) => formatDateTime(val as string)}
                  formatter={(value) => [`${Number(value).toFixed(0)} KB/s`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="avg_bandwidth_kbps" stroke={cyan} strokeWidth={2} dot={false} name="Avg Speed" />
                <Line type="monotone" dataKey="max_bandwidth_kbps" stroke={green} strokeWidth={1} dot={false} name="Peak Speed" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* File Size Distribution */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: neonBlue }}>File Size Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={size_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="range" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: `1px solid ${neonBlue}`, borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill={neonBlue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Top Errors */}
        {analytics.top_errors.length > 0 && (
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${red}` }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: red }}>Top Errors</h3>
            <div className="space-y-2">
              {analytics.top_errors.map((error, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                  <span className="text-sm text-slate-400 truncate flex-1" title={error.error_message}>
                    {error.error_message.substring(0, 100)}...
                  </span>
                  <span className="text-sm font-medium ml-4" style={{ color: red }}>{error.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // ============================================================================
  // Render: Correlation Tab
  // ============================================================================
  
  const renderCorrelation = () => {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: neonBlue }}>Find Downloads During Time Range</h3>
          <p className="text-sm text-slate-500 mb-4">
            Use this tool to find cache downloads that were active during a specific time range.
            Useful for correlating with latency test anomalies.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={correlationStart}
                onChange={(e) => setCorrelationStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">End Time</label>
              <input
                type="datetime-local"
                value={correlationEnd}
                onChange={(e) => setCorrelationEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFindCorrelation}
                disabled={correlationLoading || !correlationStart || !correlationEnd}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                style={neonButtonStyle}
              >
                {correlationLoading ? <IconSpinner /> : <IconCorrelation />}
                Find Correlations
              </button>
            </div>
          </div>
        </div>
        
        {/* Results */}
        {correlationResult && (
          <div className="p-4 rounded-xl" style={{ 
            backgroundColor: 'rgb(30, 41, 59)', 
            border: `1px solid ${correlationResult.network_impact ? yellow : green}` 
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium" style={{ color: correlationResult.network_impact ? yellow : green }}>
                {correlationResult.network_impact 
                  ? `⚠️ ${correlationResult.downloads_found} Downloads Found - Possible Network Impact!` 
                  : `✓ ${correlationResult.downloads_found} Downloads Found - No Active Downloads`}
              </h3>
            </div>
            
            {correlationResult.downloads.length > 0 ? (
              <div className="space-y-2">
                {correlationResult.downloads.map((dl) => (
                  <div key={dl.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                    <div>
                      <span className="text-sm" style={{ color: neonBlue }}>{dl.video_id}</span>
                      <span className="text-xs text-slate-500 ml-2">{formatDateTime(dl.started_at)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">{formatBytes(dl.file_size_bytes)}</span>
                      <span 
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ color: getStatusColor(dl.status), backgroundColor: `${getStatusColor(dl.status)}20` }}
                      >
                        {dl.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No downloads were active during this time range.</p>
            )}
          </div>
        )}
      </div>
    );
  };
  
  // ============================================================================
  // Render: Settings Tab
  // ============================================================================
  
  const renderSettings = () => {
    if (!cacheSettings || !cacheStatus) return null;
    
    const cacheSize = cacheStatus.stats.cache_size;
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cache Settings */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: neonBlue }}>Cache Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">Max Cache Size</span>
              <select
                value={cacheSettings.max_cache_size_mb}
                onChange={(e) => handleUpdateSettings({ max_cache_size_mb: parseInt(e.target.value) })}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700"
                style={{ color: neonBlue }}
              >
                <option value="500">500 MB</option>
                <option value="1000">1 GB</option>
                <option value="2000">2 GB</option>
                <option value="5000">5 GB</option>
                <option value="10000">10 GB</option>
                <option value="20000">20 GB</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">Bitrate (MP3)</span>
              <select
                value={cacheSettings.preferred_bitrate}
                onChange={(e) => handleUpdateSettings({ preferred_bitrate: parseInt(e.target.value) })}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700"
                style={{ color: neonBlue }}
              >
                <option value="128">128 kbps</option>
                <option value="192">192 kbps</option>
                <option value="256">256 kbps</option>
                <option value="320">320 kbps</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">Auto Cleanup</span>
              <button
                onClick={() => handleUpdateSettings({ auto_cleanup_enabled: !cacheSettings.auto_cleanup_enabled })}
                className={`w-12 h-6 rounded-full relative ${cacheSettings.auto_cleanup_enabled ? '' : 'bg-slate-700'}`}
                style={cacheSettings.auto_cleanup_enabled ? { backgroundColor: neonBlue } : undefined}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${cacheSettings.auto_cleanup_enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            
            {cacheSettings.auto_cleanup_enabled && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                <span className="text-sm text-slate-300">Cleanup After</span>
                <select
                  value={cacheSettings.cleanup_after_days}
                  onChange={(e) => handleUpdateSettings({ cleanup_after_days: parseInt(e.target.value) })}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700"
                  style={{ color: neonBlue }}
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">Max Concurrent Downloads</span>
              <select
                value={cacheSettings.max_concurrent_downloads}
                onChange={(e) => handleUpdateSettings({ max_concurrent_downloads: parseInt(e.target.value) })}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700"
                style={{ color: neonBlue }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="5">5</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Danger Zone */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: `1px solid ${red}` }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: red }}>⚠️ Danger Zone</h3>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-800/30">
                <p className="text-sm text-slate-300 mb-2">Clear All Cached Audio</p>
                <p className="text-xs text-slate-500 mb-3">
                  Delete all {cacheSize.file_count} cached files ({cacheSize.total_mb} MB). 
                  Tracks will need to be re-downloaded.
                </p>
                <button
                  onClick={handleClearCache}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  style={dangerButtonStyle}
                >
                  <IconTrash />
                  Clear All Cache
                </button>
              </div>
              
              <div className="p-3 rounded-lg bg-slate-800/30">
                <p className="text-sm text-slate-300 mb-2">Cleanup Old Logs</p>
                <p className="text-xs text-slate-500 mb-3">
                  Delete download history older than a specified time.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCleanupHistory(30)}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={dangerButtonStyle}
                  >
                    &gt;30 days
                  </button>
                  <button
                    onClick={() => handleCleanupHistory(60)}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={dangerButtonStyle}
                  >
                    &gt;60 days
                  </button>
                  <button
                    onClick={() => handleCleanupHistory(90)}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={dangerButtonStyle}
                  >
                    &gt;90 days
                  </button>
                </div>
              </div>
              
              {cacheStatus.active_downloads.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-800/30">
                  <p className="text-sm text-slate-300 mb-2">Cancel Active Downloads</p>
                  <p className="text-xs text-slate-500 mb-3">
                    Stop {cacheStatus.active_downloads_count} currently running downloads.
                  </p>
                  <button
                    onClick={async () => {
                      const result = await cancelActiveDownloads();
                      alert(`Cancelled ${result.cancelled_count} downloads`);
                      loadCacheStatus();
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={dangerButtonStyle}
                  >
                    <IconX />
                    Cancel All
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Info Card */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(30, 41, 59)', border: '1px solid rgba(136, 206, 208, 0.3)' }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: neonBlue }}>ℹ️ About Caching</h3>
            <p className="text-xs text-slate-500">
              Audio is always cached as MP3 for maximum browser compatibility. 
              The bitrate setting controls the quality/size tradeoff.
              Higher bitrates = better quality but larger files.
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <IconSpinner />
          <span className="text-slate-500">Loading Cache Forensics...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <h1 className="text-2xl font-bold" style={{ color: neonBlue }}>🗄️ Cache Forensics</h1>
        <p className="text-slate-500 mt-1">Download history, bandwidth analysis, and latency correlation</p>
      </div>
      
      {/* Tabs */}
      <div className="flex-shrink-0 px-6 border-b border-slate-800">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id ? '' : 'text-slate-500 hover:text-white'
              }`}
              style={{ color: activeTab === tab.id ? neonBlue : undefined }}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" 
                  style={{ backgroundColor: neonBlue }} 
                />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'bandwidth' && renderBandwidth()}
        {activeTab === 'correlation' && renderCorrelation()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
}