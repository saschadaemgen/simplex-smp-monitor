/**
 * ForensicsTab - Timeline, Analysis & Traffic Captures (EXTENDED)
 * ================================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * COMPLETE TrafficCapture Display with ALL 20+ fields:
 * - Identification: id, name, network_id, node_id
 * - File Info: file_path, file_size_bytes, file_hash_sha256
 * - Timing: started_at, stopped_at, duration_seconds
 * - Capture Config: interface, filter_expression
 * - Packet Stats: packet_count, packets_dropped, bytes_captured
 * - Analysis: tor_cells_detected, unique_flows, avg_inter_packet_delay_ms
 * - Metadata: first_packet_time, last_packet_time, related_circuit_id, analysis_notes
 * 
 * Features:
 * - Event Timeline with swimlanes
 * - Traffic Capture List with detailed inspection
 * - Capture Analysis & Statistics
 * - Export functionality
 */
import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  GitBranch, 
  Server, 
  Activity, 
  Shield, 
  AlertTriangle, 
  Download,
  ZoomIn, 
  ZoomOut, 
  Layers,
  FileText,
  HardDrive,
  Clock,
  Hash,
  Filter,
  Eye,
  Copy,
  ChevronRight,
  Database,
  Wifi,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import { TorEvent } from '../../../../hooks/useTorWebSocket';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';
const DARK_NEON = '#4FA3A5';
const LIGHT_NEON = '#A5DFE1';

const LANES = [
  { id: 'node_status', label: 'Node Events', icon: Server, color: '#4FA3A5' },
  { id: 'circuit', label: 'Circuits', icon: GitBranch, color: '#88CED0' },
  { id: 'bandwidth', label: 'Bandwidth', icon: Activity, color: '#6BB8BA' },
  { id: 'consensus', label: 'Consensus', icon: Shield, color: '#A5DFE1' },
  { id: 'alert', label: 'Alerts', icon: AlertTriangle, color: '#f87171' },
];

// =============================================================================
// TYPES - COMPLETE TrafficCapture (ALL 20+ fields)
// =============================================================================
export interface TrafficCaptureData {
  // Identification
  id: string;
  name: string;
  network_id?: string;
  node_id?: string;
  node_name?: string;
  
  // File Info
  file_path: string;
  file_size_bytes: number;
  file_hash_sha256?: string;
  
  // Timing
  started_at: string;
  stopped_at?: string;
  duration_seconds?: number;
  first_packet_time?: string;
  last_packet_time?: string;
  
  // Capture Config
  interface?: string;
  filter_expression?: string;
  
  // Packet Statistics
  packet_count: number;
  packets_dropped?: number;
  bytes_captured: number;
  
  // Analysis
  tor_cells_detected?: number;
  unique_flows?: number;
  avg_inter_packet_delay_ms?: number;
  related_circuit_id?: string;
  analysis_notes?: string;
  
  // Status
  status?: 'capturing' | 'completed' | 'error';
}

interface ForensicsTabProps {
  events: TorEvent[];
  captures?: TrafficCaptureData[];
  isLive: boolean;
}

// =============================================================================
// UTILITIES
// =============================================================================
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const formatTime = (timestamp?: string): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDateTime = (timestamp?: string): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return '-';
  return num.toLocaleString();
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// =============================================================================
// SUB-COMPONENTS - TIMELINE
// =============================================================================

const TimelineEvent: React.FC<{
  event: TorEvent;
  position: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ event, position, color, isSelected, onClick }) => {
  const isError = event.data?.status === 'FAILED' || event.category === 'alert';
  const eventColor = isError ? '#f87171' : color;
  
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 transition-all ${
        isSelected ? 'z-10 scale-125' : 'hover:scale-110'
      }`}
      style={{ left: `${position}%` }}
      title={`${event.event_type} - ${event.node_name}`}
    >
      <span
        className={`block w-3 h-3 rounded-full border-2 ${
          isSelected ? 'ring-2 ring-offset-1 ring-offset-gray-900' : ''
        }`}
        style={{
          backgroundColor: isSelected ? eventColor : `${eventColor}40`,
          borderColor: eventColor,
        }}
      />
    </button>
  );
};

const EventDetailPanel: React.FC<{
  event: TorEvent;
  onClose: () => void;
}> = ({ event, onClose }) => (
  <div className="bg-gray-900/80 rounded-lg border border-gray-700/50 p-4">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h4 className="text-sm font-medium text-white">{event.event_type}</h4>
        <p className="text-xs text-gray-400">{event.node_name}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {new Date(event.timestamp).toLocaleString('de-DE')}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
    <div className="bg-gray-800/50 rounded p-3 max-h-32 overflow-y-auto">
      <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
        {JSON.stringify(event.data, null, 2)}
      </pre>
    </div>
  </div>
);

// =============================================================================
// SUB-COMPONENTS - CAPTURES
// =============================================================================

// Capture Stats Overview
const CaptureStats: React.FC<{ captures: TrafficCaptureData[] }> = ({ captures }) => {
  const stats = useMemo(() => {
    let totalBytes = 0;
    let totalPackets = 0;
    let totalCells = 0;
    let totalFlows = 0;
    
    captures.forEach(c => {
      totalBytes += c.bytes_captured;
      totalPackets += c.packet_count;
      totalCells += c.tor_cells_detected || 0;
      totalFlows += c.unique_flows || 0;
    });
    
    return {
      count: captures.length,
      totalBytes,
      totalPackets,
      totalCells,
      totalFlows,
      active: captures.filter(c => c.status === 'capturing').length,
    };
  }, [captures]);
  
  return (
    <div className="grid grid-cols-6 gap-3 mb-4">
      <StatBadge icon={FileText} label="Captures" value={stats.count} color={NEON} />
      <StatBadge icon={Activity} label="Active" value={stats.active} color="#4ade80" />
      <StatBadge icon={Database} label="Total Size" value={formatBytes(stats.totalBytes)} color={LIGHT_NEON} />
      <StatBadge icon={BarChart2} label="Packets" value={formatNumber(stats.totalPackets)} color={DARK_NEON} />
      <StatBadge icon={Shield} label="Tor Cells" value={formatNumber(stats.totalCells)} color="#A5DFE1" />
      <StatBadge icon={GitBranch} label="Flows" value={formatNumber(stats.totalFlows)} color="#6BB8BA" />
    </div>
  );
};

const StatBadge: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon: Icon, label, value, color }) => (
  <div 
    className="rounded-lg p-3 text-center"
    style={{ 
      background: 'rgba(31, 41, 55, 0.5)',
      border: '1px solid rgba(136, 206, 208, 0.1)',
    }}
  >
    <Icon size={14} style={{ color }} className="mx-auto mb-1" />
    <div className="text-lg font-bold" style={{ color }}>{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

// Capture Row
interface CaptureRowProps {
  capture: TrafficCaptureData;
  isSelected: boolean;
  onClick: () => void;
}

const CaptureRow: React.FC<CaptureRowProps> = ({ capture, isSelected, onClick }) => {
  const statusColor = capture.status === 'capturing' ? '#4ade80' : 
                      capture.status === 'error' ? '#f87171' : '#64748b';
  
  return (
    <div 
      className={`flex items-center gap-4 p-3 border-b border-gray-700/30 cursor-pointer hover:bg-gray-800/30 transition-colors ${
        isSelected ? 'bg-gray-800/50' : ''
      }`}
      onClick={onClick}
    >
      {/* Status */}
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: statusColor }}
      />
      
      {/* Name */}
      <div className="w-32 truncate">
        <span className="text-sm text-white">{capture.name}</span>
      </div>
      
      {/* Node */}
      <div className="w-24 truncate">
        <span className="text-xs text-gray-400">{capture.node_name || '-'}</span>
      </div>
      
      {/* Size */}
      <div className="w-20 text-right">
        <span className="font-mono text-xs" style={{ color: NEON }}>
          {formatBytes(capture.bytes_captured)}
        </span>
      </div>
      
      {/* Packets */}
      <div className="w-20 text-right">
        <span className="font-mono text-xs text-gray-400">
          {formatNumber(capture.packet_count)}
        </span>
      </div>
      
      {/* Duration */}
      <div className="w-20 text-right">
        <span className="font-mono text-xs text-gray-400">
          {formatDuration(capture.duration_seconds)}
        </span>
      </div>
      
      {/* Tor Cells */}
      <div className="w-20 text-right">
        <span className="font-mono text-xs" style={{ color: LIGHT_NEON }}>
          {formatNumber(capture.tor_cells_detected)}
        </span>
      </div>
      
      {/* Started */}
      <div className="flex-1 text-right">
        <span className="text-xs text-gray-500">
          {formatDateTime(capture.started_at)}
        </span>
      </div>
      
      <ChevronRight size={14} className="text-gray-600" />
    </div>
  );
};

// Capture Detail Panel
interface CaptureDetailPanelProps {
  capture: TrafficCaptureData;
  onClose: () => void;
}

const CaptureDetailPanel: React.FC<CaptureDetailPanelProps> = ({ capture, onClose }) => {
  const statusColor = capture.status === 'capturing' ? '#4ade80' : 
                      capture.status === 'error' ? '#f87171' : '#64748b';
  
  return (
    <div 
      className="rounded-xl overflow-hidden h-full"
      style={{ 
        background: 'rgba(31, 41, 55, 0.8)',
        border: `1px solid ${NEON}40`,
      }}
    >
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${NEON}20, transparent)` }}
      >
        <div className="flex items-center gap-3">
          <FileText size={20} style={{ color: NEON }} />
          <div>
            <h3 className="text-lg font-semibold text-white">{capture.name}</h3>
            <p className="text-sm text-gray-400">{capture.node_name || 'Network Capture'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div 
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
          >
            {capture.status || 'completed'}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none p-2"
          >
            ×
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100%-80px)]">
        {/* File Information */}
        <DetailSection title="File Information" icon={HardDrive}>
          <DetailRow label="File Path" value={capture.file_path} mono copyable />
          <DetailRow label="File Size" value={formatBytes(capture.file_size_bytes)} color={NEON} />
          {capture.file_hash_sha256 && (
            <DetailRow 
              label="SHA-256" 
              value={capture.file_hash_sha256.substring(0, 32) + '...'} 
              mono 
              copyable 
              fullValue={capture.file_hash_sha256}
            />
          )}
        </DetailSection>
        
        {/* Timing */}
        <DetailSection title="Timing" icon={Clock}>
          <DetailRow label="Started" value={formatDateTime(capture.started_at)} />
          <DetailRow label="Stopped" value={formatDateTime(capture.stopped_at)} />
          <DetailRow label="Duration" value={formatDuration(capture.duration_seconds)} color={NEON} />
          {capture.first_packet_time && (
            <DetailRow label="First Packet" value={formatDateTime(capture.first_packet_time)} />
          )}
          {capture.last_packet_time && (
            <DetailRow label="Last Packet" value={formatDateTime(capture.last_packet_time)} />
          )}
        </DetailSection>
        
        {/* Capture Configuration */}
        <DetailSection title="Capture Configuration" icon={Filter}>
          {capture.interface && (
            <DetailRow label="Interface" value={capture.interface} mono />
          )}
          {capture.filter_expression && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Filter Expression</div>
              <code 
                className="block p-2 rounded bg-gray-900/50 text-xs font-mono"
                style={{ color: LIGHT_NEON }}
              >
                {capture.filter_expression}
              </code>
            </div>
          )}
        </DetailSection>
        
        {/* Packet Statistics */}
        <DetailSection title="Packet Statistics" icon={BarChart2}>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Packets" value={formatNumber(capture.packet_count)} color={NEON} />
            <StatBox label="Packets Dropped" value={formatNumber(capture.packets_dropped)} color="#f87171" />
            <StatBox label="Bytes Captured" value={formatBytes(capture.bytes_captured)} color={LIGHT_NEON} />
            {capture.avg_inter_packet_delay_ms !== undefined && (
              <StatBox 
                label="Avg Delay" 
                value={`${capture.avg_inter_packet_delay_ms.toFixed(2)}ms`} 
                color={DARK_NEON} 
              />
            )}
          </div>
        </DetailSection>
        
        {/* Tor Analysis */}
        <DetailSection title="Tor Analysis" icon={Shield}>
          <div className="grid grid-cols-2 gap-3">
            <StatBox 
              label="Tor Cells Detected" 
              value={formatNumber(capture.tor_cells_detected)} 
              color={NEON}
              large 
            />
            <StatBox 
              label="Unique Flows" 
              value={formatNumber(capture.unique_flows)} 
              color={LIGHT_NEON}
              large 
            />
          </div>
          {capture.related_circuit_id && (
            <div className="mt-3">
              <DetailRow 
                label="Related Circuit" 
                value={capture.related_circuit_id} 
                mono 
                copyable 
              />
            </div>
          )}
        </DetailSection>
        
        {/* Analysis Notes */}
        {capture.analysis_notes && (
          <DetailSection title="Analysis Notes" icon={FileText}>
            <div className="p-3 rounded-lg bg-gray-900/50">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {capture.analysis_notes}
              </p>
            </div>
          </DetailSection>
        )}
        
        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button 
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: NEON_DIM, color: NEON }}
          >
            <Download size={14} />
            Download PCAP
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm bg-gray-800 text-gray-300"
          >
            <Eye size={14} />
            Open in Wireshark
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const DetailSection: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div className="p-3 rounded-lg bg-gray-800/30">
    <h4 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
      <Icon size={12} style={{ color: NEON }} />
      {title}
    </h4>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const DetailRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  fullValue?: string;
  color?: string;
}> = ({ label, value, mono, copyable, fullValue, color }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-gray-500">{label}</span>
    <div className="flex items-center gap-1">
      <span 
        className={`${mono ? 'font-mono' : ''} truncate max-w-[200px]`}
        style={{ color: color || '#e5e7eb' }}
        title={fullValue || value}
      >
        {value}
      </span>
      {copyable && (
        <button 
          onClick={() => copyToClipboard(fullValue || value)}
          className="text-gray-500 hover:text-white p-0.5"
        >
          <Copy size={10} />
        </button>
      )}
    </div>
  </div>
);

const StatBox: React.FC<{
  label: string;
  value: string;
  color: string;
  large?: boolean;
}> = ({ label, value, color, large }) => (
  <div className="p-2 rounded bg-gray-900/50 text-center">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div 
      className={`font-mono ${large ? 'text-xl' : 'text-sm'}`}
      style={{ color }}
    >
      {value}
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const ForensicsTab: React.FC<ForensicsTabProps> = ({ 
  events, 
  captures = [], 
  isLive 
}) => {
  const [activeView, setActiveView] = useState<'timeline' | 'captures'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h' | '6h' | '24h'>('15m');
  const [visibleLanes, setVisibleLanes] = useState<Set<string>>(new Set(LANES.map(l => l.id)));
  const [selectedEvent, setSelectedEvent] = useState<TorEvent | null>(null);
  const [selectedCapture, setSelectedCapture] = useState<TrafficCaptureData | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Filter events
  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const rangeMs = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }[timeRange];
    
    return events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      if (now - eventTime > rangeMs) return false;
      if (!visibleLanes.has(event.category)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.event_type.toLowerCase().includes(query) && 
            !event.node_name.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [events, timeRange, visibleLanes, searchQuery]);

  const eventsByLane = useMemo(() => {
    const grouped: Record<string, TorEvent[]> = {};
    LANES.forEach(lane => {
      grouped[lane.id] = filteredEvents.filter(e => e.category === lane.id);
    });
    return grouped;
  }, [filteredEvents]);

  const timeAxis = useMemo(() => {
    const now = Date.now();
    const rangeMs = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }[timeRange];
    const start = now - rangeMs;
    const ticks: Array<{ time: number; label: string }> = [];
    for (let i = 0; i <= 6; i++) {
      const time = start + (rangeMs * i) / 6;
      ticks.push({
        time,
        label: new Date(time).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }
    return { start, end: now, range: rangeMs, ticks };
  }, [timeRange]);

  const toggleLane = (laneId: string) => {
    setVisibleLanes(prev => {
      const next = new Set(prev);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      return next;
    });
  };

  const getEventPosition = (timestamp: string): number => {
    const eventTime = new Date(timestamp).getTime();
    return Math.max(0, Math.min(100, ((eventTime - timeAxis.start) / timeAxis.range) * 100));
  };

  // Filter captures
  const filteredCaptures = useMemo(() => {
    if (!searchQuery) return captures;
    const query = searchQuery.toLowerCase();
    return captures.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.node_name?.toLowerCase().includes(query) ||
      c.file_path.toLowerCase().includes(query)
    );
  }, [captures, searchQuery]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* View Toggle & Controls */}
      <div className="flex-shrink-0 p-4 space-y-3 border-b border-gray-700/50">
        {/* View Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-4 py-1.5 text-sm rounded ${
                activeView === 'timeline' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveView('captures')}
              className={`px-4 py-1.5 text-sm rounded flex items-center gap-2 ${
                activeView === 'captures' 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Captures
              {captures.length > 0 && (
                <span 
                  className="px-1.5 py-0.5 text-xs rounded-full"
                  style={{ backgroundColor: NEON_DIM, color: NEON }}
                >
                  {captures.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={activeView === 'timeline' ? "Search events..." : "Search captures..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
          
          {/* Live Indicator */}
          {isLive && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: NEON_DIM }}
            >
              <Wifi size={14} style={{ color: NEON }} />
              <span className="text-xs font-medium" style={{ color: NEON }}>Live</span>
            </div>
          )}
        </div>

        {/* Timeline-specific controls */}
        {activeView === 'timeline' && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
              {(['5m', '15m', '1h', '6h', '24h'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs rounded ${
                    timeRange === range ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                className="p-1.5 text-gray-400 hover:text-white bg-gray-800/50 rounded"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-xs text-gray-400 w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                className="p-1.5 text-gray-400 hover:text-white bg-gray-800/50 rounded"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <Layers size={14} className="text-gray-400" />
              {LANES.map(lane => {
                const Icon = lane.icon;
                const isVisible = visibleLanes.has(lane.id);
                return (
                  <button
                    key={lane.id}
                    onClick={() => toggleLane(lane.id)}
                    className={`p-1.5 rounded ${isVisible ? 'bg-gray-700' : 'bg-gray-800/50'}`}
                    title={lane.label}
                  >
                    <Icon size={12} style={{ color: isVisible ? lane.color : '#64748b' }} />
                  </button>
                );
              })}
            </div>

            <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 rounded-lg">
              <Download size={12} />
              Export
            </button>
            
            <span className="text-xs text-gray-400 ml-auto">
              {filteredEvents.length} events in view
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      {activeView === 'timeline' ? (
        <>
          {/* Timeline */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-gray-800/30 m-4 mt-0 rounded-lg border border-gray-700/50">
            {/* Time axis header */}
            <div className="flex-shrink-0 flex items-center border-b border-gray-700/50 px-4 py-2">
              <div className="w-24 text-xs text-gray-500">Time →</div>
              <div className="flex-1 flex justify-between">
                {timeAxis.ticks.map((tick, i) => (
                  <span key={i} className="text-xs text-gray-500">{tick.label}</span>
                ))}
              </div>
            </div>

            {/* Lanes */}
            <div
              ref={timelineRef}
              className="flex-1 overflow-y-auto"
              style={{ transform: `scaleX(${zoomLevel})`, transformOrigin: 'left' }}
            >
              {LANES.filter(lane => visibleLanes.has(lane.id)).map(lane => {
                const Icon = lane.icon;
                const laneEvents = eventsByLane[lane.id] || [];
                return (
                  <div
                    key={lane.id}
                    className="flex items-stretch border-b border-gray-700/30 min-h-[60px]"
                  >
                    <div className="w-24 flex items-center gap-2 px-3 border-r border-gray-700/30 bg-gray-900/30 flex-shrink-0">
                      <Icon size={12} style={{ color: lane.color }} />
                      <span className="text-xs text-gray-400 truncate">{lane.label}</span>
                    </div>
                    <div className="flex-1 relative py-2 px-2">
                      {laneEvents.map((event, index) => (
                        <TimelineEvent
                          key={`${event.timestamp}-${index}`}
                          event={event}
                          position={getEventPosition(event.timestamp)}
                          color={lane.color}
                          isSelected={selectedEvent === event}
                          onClick={() => setSelectedEvent(event)}
                        />
                      ))}
                      {laneEvents.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">
                          No events
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Detail */}
          {selectedEvent && (
            <div className="flex-shrink-0 mx-4 mb-4">
              <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </div>
          )}
        </>
      ) : (
        /* Captures View */
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 pt-0">
          {/* Stats */}
          {captures.length > 0 && <CaptureStats captures={captures} />}
          
          {/* Captures List & Detail */}
          <div className="flex-1 min-h-0 flex gap-4">
            {/* List */}
            <div 
              className={`${selectedCapture ? 'w-1/2' : 'w-full'} overflow-hidden flex flex-col rounded-lg border border-gray-700/50 transition-all duration-300`}
              style={{ background: 'rgba(31, 41, 55, 0.5)' }}
            >
              {/* Header */}
              <div className="flex items-center gap-4 p-3 border-b border-gray-700/50 text-xs text-gray-500">
                <div className="w-2"></div>
                <div className="w-32">Name</div>
                <div className="w-24">Node</div>
                <div className="w-20 text-right">Size</div>
                <div className="w-20 text-right">Packets</div>
                <div className="w-20 text-right">Duration</div>
                <div className="w-20 text-right">Tor Cells</div>
                <div className="flex-1 text-right">Started</div>
                <div className="w-4"></div>
              </div>
              
              {/* Rows */}
              <div className="flex-1 overflow-y-auto">
                {filteredCaptures.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {captures.length === 0 
                      ? 'No traffic captures available' 
                      : 'No captures match your search'
                    }
                  </div>
                ) : (
                  filteredCaptures.map(capture => (
                    <CaptureRow
                      key={capture.id}
                      capture={capture}
                      isSelected={selectedCapture?.id === capture.id}
                      onClick={() => setSelectedCapture(
                        selectedCapture?.id === capture.id ? null : capture
                      )}
                    />
                  ))
                )}
              </div>
            </div>
            
            {/* Detail Panel */}
            {selectedCapture && (
              <div className="w-1/2">
                <CaptureDetailPanel
                  capture={selectedCapture}
                  onClose={() => setSelectedCapture(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ForensicsTab;