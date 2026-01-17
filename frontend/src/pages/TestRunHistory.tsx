/**
 * TestRunHistory - Quick Test History Dashboard
 * ==============================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Compact, high-density test history with latency metrics.
 * Design: Neon Blue (#88CED0) theme - ChutneX Style
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Trash2,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const NEON = '#88CED0';
const NEON_BORDER = 'rgba(136, 206, 208, 0.1)';
const NEON_GLOW = '0 0 8px rgba(136, 206, 208, 0.4)';
const CYAN = '#22D3EE';
const RED = '#EF4444';
const AMBER = '#F59E0B';
const PURPLE = '#A855F7';

const cardStyle = {
  background: 'rgba(31, 41, 55, 0.5)',
  border: `1px solid ${NEON_BORDER}`,
};

const btnStyle = {
  backgroundColor: 'rgba(31, 41, 55, 0.8)',
  color: NEON,
  border: `1px solid ${NEON}`,
  boxShadow: NEON_GLOW,
};

// =============================================================================
// TYPES
// =============================================================================
interface TestRun {
  id: string;
  name: string;
  sender: string;
  sender_name: string;
  sender_profile: string;
  sender_use_tor: boolean;
  message_count: number;
  interval_ms: number;
  message_size: number;
  recipient_mode: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  avg_latency_ms: number | null;
  min_latency_ms: number | null;
  max_latency_ms: number | null;
  avg_latency_to_server_ms: number | null;
  min_latency_to_server_ms: number | null;
  max_latency_to_server_ms: number | null;
  avg_latency_to_client_ms: number | null;
  min_latency_to_client_ms: number | null;
  max_latency_to_client_ms: number | null;
  success_rate: number | null;
  progress_percent: number;
  duration_seconds: number | null;
  created_at: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TestRun[];
}

// =============================================================================
// UTILITIES
// =============================================================================
const getCsrfToken = (): string => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === 'csrftoken') return value;
  }
  return '';
};

const formatDuration = (s: number | null): string => {
  if (!s) return '—';
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m${Math.round(s % 60)}s`;
};

const formatAge = (dateStr: string): string => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'now';
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
};

const getSparklineData = (test: TestRun) => {
  if (!test.avg_latency_ms) return [];
  const min = test.min_latency_ms || test.avg_latency_ms * 0.7;
  const max = test.max_latency_ms || test.avg_latency_ms * 1.3;
  return Array.from({ length: 10 }, () => ({
    v: Math.max(0, test.avg_latency_ms! + (Math.random() - 0.5) * (max - min))
  }));
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// Compact Dropdown
const Dropdown: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
        style={btnStyle}
      >
        {options.find(o => o.value === value)?.label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div 
          className="absolute right-0 mt-1 min-w-[120px] rounded-lg shadow-xl z-50 overflow-hidden"
          style={{ background: 'rgb(31, 41, 55)', border: `1px solid ${NEON_BORDER}` }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-700/50 transition-colors"
              style={{ color: opt.value === value ? NEON : '#94a3b8' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Stat Card (compact)
const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  footer?: React.ReactNode;
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
}> = ({ label, value, sub, footer, topLeft, topRight }) => (
  <div className="rounded-lg p-3 h-28 flex flex-col" style={cardStyle}>
    <div className="flex justify-between text-[10px] text-gray-500 mb-auto">
      {topLeft || <span />}
      {topRight || <span />}
    </div>
    <div className="text-center my-auto">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
    {sub && <div className="text-center text-xs">{sub}</div>}
    {footer && <div className="mt-auto pt-1">{footer}</div>}
  </div>
);

// Status Badge
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; color: string; pulse?: boolean }> = {
    pending: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
    running: { bg: 'rgba(34,211,238,0.2)', color: CYAN, pulse: true },
    completed: { bg: 'rgba(34,211,238,0.2)', color: CYAN },
    cancelled: { bg: 'rgba(245,158,11,0.2)', color: AMBER },
    failed: { bg: 'rgba(239,68,68,0.2)', color: RED },
  };
  const c = config[status] || config.pending;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: c.bg, color: c.color, boxShadow: c.pulse ? `0 0 6px ${CYAN}` : undefined }}
    >
      {c.pulse && <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: CYAN }} />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Latency Cell
const LatencyCell: React.FC<{ avg: number | null; min?: number | null; max?: number | null; color?: string }> = ({
  avg, min, max, color = CYAN
}) => {
  if (avg == null) return <span className="text-gray-600">—</span>;
  return (
    <div className="text-[10px] leading-tight text-center">
      <div style={{ color }} className="font-medium">{Math.round(avg)}ms</div>
      {min != null && max != null && <div className="text-gray-500">{min}–{max}</div>}
    </div>
  );
};

// Delete Confirm Modal
const DeleteModal: React.FC<{
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ count, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative rounded-xl p-5 max-w-sm w-full mx-4" style={{ background: 'rgb(17,24,39)', border: `1px solid ${NEON_BORDER}` }}>
      <h3 className="text-base font-bold text-white mb-2">Delete {count} Tests?</h3>
      <p className="text-sm text-gray-400 mb-4">This action cannot be undone.</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white">Cancel</button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: RED, border: `1px solid ${RED}` }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function TestRunHistory() {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_at');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const pageSize = 25;

  // Fetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), ordering: sortBy });
      if (filter !== 'all') params.append('status', filter);
      const res = await fetch(`/api/v1/test-runs/?${params}`);
      if (res.ok) {
        const data: PaginatedResponse = await res.json();
        setTestRuns(data.results || []);
        setTotalCount(data.count);
        setHasNext(!!data.next);
        setHasPrev(!!data.previous);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [page, filter, sortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [filter, sortBy]);

  // Auto-refresh if running
  useEffect(() => {
    if (!testRuns.some(t => t.status === 'running' || t.status === 'pending')) return;
    const iv = setInterval(fetchData, 2000);
    return () => clearInterval(iv);
  }, [testRuns, fetchData]);

  // Delete handlers
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this test?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/v1/test-runs/${id}/`, { method: 'DELETE', headers: { 'X-CSRFToken': getCsrfToken() } });
      if (res.ok) {
        setTestRuns(p => p.filter(t => t.id !== id));
        setTotalCount(p => p - 1);
      }
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const handleBulkDelete = async () => {
    setShowDeleteModal(false);
    for (const id of selected) {
      try { await fetch(`/api/v1/test-runs/${id}/`, { method: 'DELETE', headers: { 'X-CSRFToken': getCsrfToken() } }); }
      catch (e) { console.error(e); }
    }
    setSelected(new Set());
    fetchData();
  };

  // Stats
  const stats = useMemo(() => {
    const completed = testRuns.filter(t => t.success_rate != null);
    const latencyRuns = testRuns.filter(t => t.avg_latency_ms != null);
    return {
      avgRate: completed.length ? completed.reduce((s, t) => s + (t.success_rate || 0), 0) / completed.length : 0,
      bestRate: completed.length ? Math.max(...completed.map(t => t.success_rate || 0)) : 0,
      worstRate: completed.length ? Math.min(...completed.map(t => t.success_rate || 100)) : 0,
      avgLatency: latencyRuns.length ? latencyRuns.reduce((s, t) => s + (t.avg_latency_ms || 0), 0) / latencyRuns.length : 0,
      minLatency: latencyRuns.length ? Math.min(...latencyRuns.map(t => t.min_latency_ms || Infinity).filter(v => v !== Infinity)) : 0,
      maxLatency: latencyRuns.length ? Math.max(...latencyRuns.map(t => t.max_latency_ms || 0)) : 0,
      running: testRuns.filter(t => t.status === 'running').length,
      pending: testRuns.filter(t => t.status === 'pending').length,
      failed: testRuns.filter(t => t.status === 'failed').length,
      completedCount: testRuns.filter(t => t.status === 'completed').length,
      latencyRuns,
    };
  }, [testRuns]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Loading
  if (loading && !testRuns.length) {
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
          <div className="flex items-center gap-3">
            <Link to="/clients" className="p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors" style={{ color: NEON }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">Test History</h1>
              <p className="text-xs text-gray-500">Latency metrics · Tor comparison</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: RED, border: `1px solid ${RED}` }}
              >
                <Trash2 size={14} /> {selected.size}
              </button>
            )}
            <Dropdown
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'completed', label: 'Completed' },
                { value: 'running', label: 'Running' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
            <Dropdown
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: '-created_at', label: 'Newest' },
                { value: 'created_at', label: 'Oldest' },
                { value: '-success_rate', label: 'Best Rate' },
                { value: 'avg_latency_ms', label: 'Low Latency' },
              ]}
            />
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-lg text-xs disabled:opacity-50"
              style={btnStyle}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link to="/clients" className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1" style={btnStyle}>
              <Users size={14} /> Clients
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Tests"
            value={<span style={{ color: NEON }}>{totalCount}</span>}
            topLeft={<>Done: <span style={{ color: CYAN }}>{stats.completedCount}</span></>}
            topRight={<>Fail: <span className="text-red-400">{stats.failed}</span></>}
            footer={<div className="flex justify-between text-[10px] text-gray-500"><span>Pg {page}/{totalPages||1}</span><span>{pageSize}/pg</span></div>}
          />
          <StatCard
            label="Avg Success"
            value={<span style={{ color: CYAN }}>{stats.avgRate.toFixed(1)}%</span>}
            topLeft={<>Best: <span style={{ color: CYAN }}>{stats.bestRate.toFixed(0)}%</span></>}
            topRight={<>Worst: <span className="text-amber-400">{stats.worstRate.toFixed(0)}%</span></>}
            footer={
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${stats.avgRate}%`, backgroundColor: CYAN }} />
              </div>
            }
          />
          <StatCard
            label="Avg Latency"
            value={stats.avgLatency ? <>{Math.round(stats.avgLatency)}<span className="text-sm text-gray-400">ms</span></> : '—'}
            topLeft={<>↓ <span style={{ color: NEON }}>{stats.minLatency || '—'}ms</span></>}
            topRight={<>↑ <span className="text-red-400">{stats.maxLatency || '—'}ms</span></>}
            footer={
              <div className="h-4 flex items-end gap-0.5">
                {stats.latencyRuns.slice(0, 12).map((t, i) => {
                  const max = Math.max(...stats.latencyRuns.slice(0, 12).map(r => r.avg_latency_ms || 0), 1);
                  return <div key={i} className="flex-1 rounded-t" style={{ height: `${Math.max(15, ((t.avg_latency_ms || 0) / max) * 100)}%`, backgroundColor: CYAN, opacity: 0.7 }} />;
                })}
              </div>
            }
          />
          <StatCard
            label="Running"
            value={
              stats.running > 0 ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: CYAN }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: CYAN }} />
                  </span>
                  <span style={{ color: CYAN }}>{stats.running}</span>
                </div>
              ) : <span className="text-gray-500">0</span>
            }
            topLeft={<>Pending: <span className="text-amber-400">{stats.pending}</span></>}
            topRight={<>Live</>}
          />
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-2 py-2 text-left" style={{ width: '32px' }}>
                    <input
                      type="checkbox"
                      checked={selected.size === testRuns.length && testRuns.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(testRuns.map(t => t.id)) : new Set())}
                      className="accent-[#88CED0] w-3 h-3"
                    />
                  </th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '14%' }}>Test</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '14%' }}>Client</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '40px' }}>Tor</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-medium" style={{ width: '80px' }}>Status</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '60px' }}>Msg</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '50px' }}>Rate</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '70px' }}>Total</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '70px' }}>→Srv</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '70px' }}>→Cli</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '56px' }}>Trend</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '50px' }}>Time</th>
                  <th className="px-2 py-2 text-center text-gray-500 font-medium" style={{ width: '40px' }}>Age</th>
                  <th className="px-2 py-2" style={{ width: '56px' }}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {testRuns.length === 0 ? (
                  <tr><td colSpan={14} className="px-2 py-6 text-center text-gray-500">No tests found</td></tr>
                ) : testRuns.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={e => {
                          const s = new Set(selected);
                          e.target.checked ? s.add(t.id) : s.delete(t.id);
                          setSelected(s);
                        }}
                        className="accent-[#88CED0] w-3 h-3"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-white font-medium truncate" style={{ maxWidth: '140px' }}>{t.name}</td>
                    <td className="px-2 py-1.5" style={{ maxWidth: '140px' }}>
                      <div className="text-gray-300 truncate">{t.sender_name}</div>
                      <div className="text-[10px] text-gray-500 truncate">{t.sender_profile}</div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {t.sender_use_tor ? <Check size={12} style={{ color: PURPLE }} className="mx-auto" /> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-2 py-1.5"><StatusBadge status={t.status} /></td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="text-white">{t.messages_delivered}</span>
                      <span className="text-gray-500">/{t.message_count}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {t.success_rate != null ? (
                        <span style={{ color: t.success_rate >= 95 ? CYAN : t.success_rate >= 80 ? AMBER : RED }}>
                          {t.success_rate.toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center"><LatencyCell avg={t.avg_latency_ms} min={t.min_latency_ms} max={t.max_latency_ms} /></td>
                    <td className="px-2 py-1.5 text-center"><LatencyCell avg={t.avg_latency_to_server_ms} min={t.min_latency_to_server_ms} max={t.max_latency_to_server_ms} color={NEON} /></td>
                    <td className="px-2 py-1.5 text-center"><LatencyCell avg={t.avg_latency_to_client_ms} min={t.min_latency_to_client_ms} max={t.max_latency_to_client_ms} color={NEON} /></td>
                    <td className="px-2 py-1.5 text-center">
                      {t.avg_latency_ms ? (
                        <div className="w-12 h-4 mx-auto">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getSparklineData(t)}>
                              <defs>
                                <linearGradient id={`g-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={CYAN} stopOpacity={0.4} />
                                  <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="v" stroke={CYAN} strokeWidth={1} fill={`url(#g-${t.id})`} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-400">{formatDuration(t.duration_seconds)}</td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{formatAge(t.created_at)}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/clients/${t.sender}`}
                          className="p-1 rounded hover:bg-gray-700/50"
                          title="View"
                        >
                          <Eye size={12} style={{ color: NEON }} />
                        </Link>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                          className="p-1 rounded hover:bg-gray-700/50 disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === t.id ? (
                            <RefreshCw size={12} className="animate-spin text-red-400" />
                          ) : (
                            <Trash2 size={12} className="text-red-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-gray-700/50 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={!hasPrev} className="p-1 rounded disabled:opacity-30" style={{ color: NEON }}>
                  <ChevronsLeft size={14} />
                </button>
                <button onClick={() => setPage(p => p - 1)} disabled={!hasPrev} className="p-1 rounded disabled:opacity-30" style={{ color: NEON }}>
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 text-xs" style={{ color: NEON }}>{page}/{totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={!hasNext} className="p-1 rounded disabled:opacity-30" style={{ color: NEON }}>
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => setPage(totalPages)} disabled={!hasNext} className="p-1 rounded disabled:opacity-30" style={{ color: NEON }}>
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteModal
          count={selected.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}