/**
 * TrafficTab - Bandwidth & Data Flow (SCROLL FIXED)
 * ==================================================
 * Copyright (c) 2026 cannatoshi
 */
import React, { useState, useMemo } from 'react';
import { Activity, ArrowUp, ArrowDown, Server, TrendingUp, Zap } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BandwidthData } from '../../../../hooks/useTorWebSocket';

const NEON = '#88CED0';
const TYPE_COLORS: Record<string, string> = { da: '#4FA3A5', guard: '#88CED0', middle: '#6BB8BA', exit: '#A5DFE1', client: '#3D8B8D', hs: '#B8E8EA' };

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface TrafficTabProps {
  bandwidth: Map<string, BandwidthData>;
  bandwidthHistory: Array<{ time: string; read: number; write: number; total: number }>;
  nodesByType: Record<string, { bytes_read: number; bytes_written: number }>;
  isLive: boolean;
}

export const TrafficTab: React.FC<TrafficTabProps> = ({ bandwidth, bandwidthHistory, nodesByType, isLive }) => {
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m' | '1h'>('5m');

  const totals = useMemo(() => {
    let read = 0, written = 0, rate = 0;
    bandwidth.forEach(bw => { read += bw.bytes_read; written += bw.bytes_written; rate += bw.avg_bytes_read + bw.avg_bytes_written; });
    return { read, written, total: read + written, rate };
  }, [bandwidth]);

  const topConsumers = useMemo(() => {
    const list: Array<{ node_id: string; node_name: string; total: number; rate: number }> = [];
    bandwidth.forEach((bw, nodeId) => { list.push({ node_id: nodeId, node_name: bw.node_name, total: bw.bytes_read + bw.bytes_written, rate: bw.avg_bytes_read + bw.avg_bytes_written }); });
    return list.sort((a, b) => b.total - a.total).slice(0, 10);
  }, [bandwidth]);

  const trafficByType = useMemo(() => Object.entries(nodesByType).map(([type, data]) => ({ name: type.toUpperCase(), value: data.bytes_read + data.bytes_written, color: TYPE_COLORS[type] || NEON })), [nodesByType]);

  const tooltipStyle = { backgroundColor: '#1e293b', border: `1px solid ${NEON}33`, borderRadius: '8px' };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Total Traffic" value={formatBytes(totals.total)} icon={Activity} trend={isLive ? 'live' : undefined} />
          <SummaryCard label="Downloaded" value={formatBytes(totals.read)} icon={ArrowDown} subValue={totals.total > 0 ? `${Math.round((totals.read / totals.total) * 100)}%` : '0%'} />
          <SummaryCard label="Uploaded" value={formatBytes(totals.written)} icon={ArrowUp} subValue={totals.total > 0 ? `${Math.round((totals.written / totals.total) * 100)}%` : '0%'} />
          <SummaryCard label="Current Rate" value={`${formatBytes(totals.rate)}/s`} icon={Zap} trend={isLive ? 'live' : undefined} />
        </div>

        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2"><TrendingUp size={14} style={{ color: NEON }} />Network Bandwidth Over Time</h3>
            <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
              {(['1m', '5m', '15m', '1h'] as const).map(range => (
                <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-xs rounded transition-colors ${timeRange === range ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>{range}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bandwidthHistory}>
                <defs>
                  <linearGradient id="gradRead" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={NEON} stopOpacity={0.4} /><stop offset="100%" stopColor={NEON} stopOpacity={0} /></linearGradient>
                  <linearGradient id="gradWrite" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6BB8BA" stopOpacity={0.4} /><stop offset="100%" stopColor="#6BB8BA" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: NEON }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Area type="monotone" dataKey="read" stroke={NEON} fill="url(#gradRead)" strokeWidth={2} dot={false} name="Download" />
                <Area type="monotone" dataKey="write" stroke="#6BB8BA" fill="url(#gradWrite)" strokeWidth={2} dot={false} name="Upload" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2"><Server size={14} style={{ color: NEON }} />Top Bandwidth Consumers</h3>
            <div className="space-y-2">
              {topConsumers.length === 0 ? <p className="text-gray-500 text-sm text-center py-4">No data</p> : topConsumers.map((consumer, index) => <ConsumerRow key={consumer.node_id} rank={index + 1} name={consumer.node_name} total={consumer.total} rate={consumer.rate} maxTotal={topConsumers[0]?.total || 1} />)}
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Traffic by Node Type</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={trafficByType} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">{trafficByType.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {trafficByType.map(entry => <span key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name}: {formatBytes(entry.value)}</span>)}
            </div>
          </div>
        </div>

        {bandwidth.size > 0 && (
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">{isLive && <Zap size={14} style={{ color: NEON }} className="animate-pulse" />}Live Node Bandwidth</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Array.from(bandwidth.values()).map(bw => ({ name: bw.node_name, read: bw.avg_bytes_read, write: bw.avg_bytes_written }))} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="read" stackId="a" fill={NEON} name="Download" />
                  <Bar dataKey="write" stackId="a" fill="#6BB8BA" name="Upload" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ElementType; subValue?: string; trend?: 'live' | 'up' | 'down' }> = ({ label, value, icon: Icon, subValue, trend }) => (
  <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
    <div className="flex items-center justify-between mb-2">
      <Icon size={18} style={{ color: NEON }} />
      {trend === 'live' && <span className="flex items-center gap-1 text-xs" style={{ color: NEON }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: NEON }} />Live</span>}
    </div>
    <div className="text-xl font-bold text-white mb-1">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
    {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
  </div>
);

const ConsumerRow: React.FC<{ rank: number; name: string; total: number; rate: number; maxTotal: number }> = ({ rank, name, total, rate, maxTotal }) => {
  const percentage = (total / maxTotal) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-5">{rank}.</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1"><span className="text-sm text-white truncate">{name}</span><span className="text-xs text-gray-400">{formatBytes(total)}</span></div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden"><div className="h-full transition-all duration-300" style={{ width: `${percentage}%`, backgroundColor: NEON }} /></div>
      </div>
      <span className="text-xs text-gray-500 w-16 text-right">{formatBytes(rate)}/s</span>
    </div>
  );
};

export default TrafficTab;