/**
 * OverviewTab - Network Health & KPIs
 * ====================================
 * Copyright (c) 2026 cannatoshi
 */
import React, { useMemo } from 'react';
import {
  Activity,
  Server,
  GitBranch,
  Wifi,
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Zap,
  Network,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TorEvent, BandwidthData } from '../../../../hooks/useTorWebSocket';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';

const NODE_COLORS: Record<string, string> = {
  da: '#4FA3A5',
  guard: '#88CED0',
  middle: '#6BB8BA',
  exit: '#A5DFE1',
  client: '#3D8B8D',
  hs: '#B8E8EA',
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface OverviewTabProps {
  networkId: string;
  networkName: string;
  networkStatus: string;
  isLive: boolean;
  totalNodes: number;
  runningNodes: number;
  nodesByType: Record<string, number>;
  totalCircuits: number;
  activeCircuits: number;
  bandwidth: Map<string, BandwidthData>;
  bandwidthHistory: Array<{ time: string; read: number; write: number }>;
  recentEvents: TorEvent[];
  consensusValid: boolean;
  bootstrapProgress: number;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  networkId,
  networkName,
  networkStatus,
  isLive,
  totalNodes,
  runningNodes,
  nodesByType,
  totalCircuits,
  activeCircuits,
  bandwidth,
  bandwidthHistory,
  recentEvents,
  consensusValid,
  bootstrapProgress,
}) => {
  const totalBandwidth = useMemo(() => {
    let read = 0;
    let written = 0;
    bandwidth.forEach((bw) => {
      read += bw.bytes_read;
      written += bw.bytes_written;
    });
    return { read, written, total: read + written };
  }, [bandwidth]);

  const nodeDistribution = useMemo(() => {
    return Object.entries(nodesByType).map(([type, count]) => ({
      name: type.toUpperCase(),
      value: count,
      color: NODE_COLORS[type] || NEON,
    }));
  }, [nodesByType]);

  const displayEvents = useMemo(() => {
    return recentEvents.slice(0, 10);
  }, [recentEvents]);

  const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: `1px solid ${NEON}33`,
    borderRadius: '8px',
  };

  return (
    <div className="p-4 space-y-4">
      <div 
        className="rounded-lg border p-4"
        style={{
          backgroundColor: networkStatus === 'running' ? NEON_DIM : 'rgba(248, 113, 113, 0.1)',
          borderColor: networkStatus === 'running' ? 'rgba(136, 206, 208, 0.3)' : 'rgba(248, 113, 113, 0.3)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {networkStatus === 'running' ? (
              <CheckCircle2 size={24} style={{ color: NEON }} />
            ) : (
              <XCircle size={24} className="text-red-400" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">{networkName}</h2>
              <p className="text-sm text-gray-400">
                {networkStatus === 'running' ? 'Network operational' : `Status: ${networkStatus}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isLive ? (
                <>
                  <Wifi size={16} style={{ color: NEON }} className="animate-pulse" />
                  <span className="text-sm" style={{ color: NEON }}>Live</span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-500">Offline</span>
                </>
              )}
            </div>
            
            {bootstrapProgress < 100 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ width: `${bootstrapProgress}%`, backgroundColor: NEON }}
                  />
                </div>
                <span className="text-xs text-gray-400">{bootstrapProgress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Server}
          label="Nodes"
          value={`${runningNodes}/${totalNodes}`}
          subValue={`${Math.round((runningNodes / Math.max(1, totalNodes)) * 100)}% online`}
          trend={runningNodes === totalNodes ? 'up' : 'neutral'}
        />
        <KPICard
          icon={GitBranch}
          label="Circuits"
          value={activeCircuits.toString()}
          subValue={`${totalCircuits} total created`}
          trend="neutral"
        />
        <KPICard
          icon={Activity}
          label="Bandwidth"
          value={formatBytes(totalBandwidth.total)}
          subValue={`↑${formatBytes(totalBandwidth.written)} ↓${formatBytes(totalBandwidth.read)}`}
          trend="up"
        />
        <KPICard
          icon={Shield}
          label="Consensus"
          value={consensusValid ? 'Valid' : 'Invalid'}
          subValue={consensusValid ? 'Network synchronized' : 'Synchronizing...'}
          trend={consensusValid ? 'up' : 'down'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">Network Bandwidth</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NEON }} />
                Read
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6BB8BA' }} />
                Write
              </span>
            </div>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bandwidthHistory}>
                <defs>
                  <linearGradient id="gradientRead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NEON} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={NEON} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientWrite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6BB8BA" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6BB8BA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: NEON }} />
                <Area
                  type="monotone"
                  dataKey="read"
                  stroke={NEON}
                  fill="url(#gradientRead)"
                  strokeWidth={2}
                  dot={false}
                  name="Read"
                />
                <Area
                  type="monotone"
                  dataKey="write"
                  stroke="#6BB8BA"
                  fill="url(#gradientWrite)"
                  strokeWidth={2}
                  dot={false}
                  name="Write"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Node Distribution</h3>
          
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nodeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {nodeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {nodeDistribution.map((entry) => (
              <span 
                key={entry.name}
                className="flex items-center gap-1 text-xs text-gray-400"
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }} 
                />
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <Zap size={14} style={{ color: NEON }} />
          Recent Activity
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {displayEvents.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No recent events</p>
          ) : (
            displayEvents.map((event, index) => (
              <EventRow key={`${event.timestamp}-${index}`} event={event} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const KPICard: React.FC<KPICardProps> = ({ icon: Icon, label, value, subValue, trend }) => {
  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4 hover:border-gray-600/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <Icon size={18} style={{ color: NEON }} />
        {trend && (
          <span className={`text-xs ${
            trend === 'up' ? 'text-emerald-400' : 
            trend === 'down' ? 'text-red-400' : 
            'text-gray-400'
          }`}>
            {trend === 'up' && <ArrowUpRight size={14} />}
            {trend === 'down' && <ArrowDownRight size={14} />}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
};

interface EventRowProps {
  event: TorEvent;
}

const EventRow: React.FC<EventRowProps> = ({ event }) => {
  const getEventIcon = () => {
    switch (event.category) {
      case 'circuit': return <GitBranch size={12} />;
      case 'bandwidth': return <Activity size={12} />;
      case 'connection': return <Network size={12} />;
      case 'node_status': return <Server size={12} />;
      default: return <Zap size={12} />;
    }
  };

  const getEventColor = () => {
    if (event.event_type === 'circuit' && event.data.status === 'FAILED') return '#f87171';
    if (event.event_type === 'circuit' && event.data.status === 'BUILT') return '#4ade80';
    return NEON;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getEventDescription = () => {
    switch (event.event_type) {
      case 'circuit': return `Circuit ${event.data.circuit_id} ${event.data.status}`;
      case 'bandwidth': return `${event.node_name}: ${formatBytes(event.data.bytes_read + event.data.bytes_written)}`;
      case 'node_connected': return `${event.node_name} connected`;
      case 'or_connection': return `OR Connection ${event.data.status}`;
      default: return `${event.event_type}: ${event.node_name}`;
    }
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-900/30 hover:bg-gray-900/50 transition-colors">
      <span style={{ color: getEventColor() }}>{getEventIcon()}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 truncate">{getEventDescription()}</p>
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">{formatTime(event.timestamp)}</span>
    </div>
  );
};

export default OverviewTab;