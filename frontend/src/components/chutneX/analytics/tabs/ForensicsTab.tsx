/**
 * ForensicsTab - Timeline & Analysis
 * ===================================
 * Copyright (c) 2026 cannatoshi
 */
import React, { useState, useMemo, useRef } from 'react';
import { Search, GitBranch, Server, Activity, Shield, AlertTriangle, Download, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { TorEvent } from '../../../../hooks/useTorWebSocket';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';

const LANES = [
  { id: 'node_status', label: 'Node Events', icon: Server, color: '#4FA3A5' },
  { id: 'circuit', label: 'Circuits', icon: GitBranch, color: '#88CED0' },
  { id: 'bandwidth', label: 'Bandwidth', icon: Activity, color: '#6BB8BA' },
  { id: 'consensus', label: 'Consensus', icon: Shield, color: '#A5DFE1' },
  { id: 'alert', label: 'Alerts', icon: AlertTriangle, color: '#f87171' },
];

interface ForensicsTabProps {
  events: TorEvent[];
  isLive: boolean;
}

export const ForensicsTab: React.FC<ForensicsTabProps> = ({ events, isLive }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'5m' | '15m' | '1h' | '6h' | '24h'>('15m');
  const [visibleLanes, setVisibleLanes] = useState<Set<string>>(new Set(LANES.map(l => l.id)));
  const [selectedEvent, setSelectedEvent] = useState<TorEvent | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const rangeMs = { '5m': 5 * 60 * 1000, '15m': 15 * 60 * 1000, '1h': 60 * 60 * 1000, '6h': 6 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000 }[timeRange];
    return events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      if (now - eventTime > rangeMs) return false;
      if (!visibleLanes.has(event.category)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.event_type.toLowerCase().includes(query) && !event.node_name.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [events, timeRange, visibleLanes, searchQuery]);

  const eventsByLane = useMemo(() => {
    const grouped: Record<string, TorEvent[]> = {};
    LANES.forEach(lane => { grouped[lane.id] = filteredEvents.filter(e => e.category === lane.id); });
    return grouped;
  }, [filteredEvents]);

  const timeAxis = useMemo(() => {
    const now = Date.now();
    const rangeMs = { '5m': 5 * 60 * 1000, '15m': 15 * 60 * 1000, '1h': 60 * 60 * 1000, '6h': 6 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000 }[timeRange];
    const start = now - rangeMs;
    const ticks: Array<{ time: number; label: string }> = [];
    for (let i = 0; i <= 6; i++) {
      const time = start + (rangeMs * i / 6);
      ticks.push({ time, label: new Date(time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) });
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

  return (
    <div className="p-4 space-y-4 h-full overflow-hidden flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
          {(['5m', '15m', '1h', '6h', '24h'] as const).map(range => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 text-xs rounded ${timeRange === range ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              {range}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))} className="p-1.5 text-gray-400 hover:text-white bg-gray-800/50 rounded"><ZoomOut size={14} /></button>
          <span className="text-xs text-gray-400 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))} className="p-1.5 text-gray-400 hover:text-white bg-gray-800/50 rounded"><ZoomIn size={14} /></button>
        </div>

        <div className="flex items-center gap-1">
          <Layers size={14} className="text-gray-400" />
          {LANES.map(lane => {
            const Icon = lane.icon;
            const isVisible = visibleLanes.has(lane.id);
            return (
              <button key={lane.id} onClick={() => toggleLane(lane.id)} className={`p-1.5 rounded ${isVisible ? 'bg-gray-700' : 'bg-gray-800/50'}`} title={lane.label}>
                <Icon size={12} style={{ color: isVisible ? lane.color : '#64748b' }} />
              </button>
            );
          })}
        </div>

        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/50 rounded-lg">
          <Download size={12} />Export
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{filteredEvents.length} events in view</span>
        {isLive && <span className="flex items-center gap-1" style={{ color: NEON }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: NEON }} />Live</span>}
      </div>

      {/* Timeline */}
      <div className="flex-1 bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden flex flex-col">
        <div className="flex items-center border-b border-gray-700/50 px-4 py-2">
          <div className="w-24 text-xs text-gray-500">Time →</div>
          <div className="flex-1 flex justify-between">
            {timeAxis.ticks.map((tick, i) => (<span key={i} className="text-xs text-gray-500">{tick.label}</span>))}
          </div>
        </div>

        <div ref={timelineRef} className="flex-1 overflow-y-auto" style={{ transform: `scaleX(${zoomLevel})`, transformOrigin: 'left' }}>
          {LANES.filter(lane => visibleLanes.has(lane.id)).map(lane => {
            const Icon = lane.icon;
            const laneEvents = eventsByLane[lane.id] || [];
            return (
              <div key={lane.id} className="flex items-stretch border-b border-gray-700/30 min-h-[60px]">
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
                  {laneEvents.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600">No events</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedEvent && <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
};

interface TimelineEventProps {
  event: TorEvent;
  position: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

const TimelineEvent: React.FC<TimelineEventProps> = ({ event, position, color, isSelected, onClick }) => {
  const isError = event.data.status === 'FAILED' || event.category === 'alert';
  const eventColor = isError ? '#f87171' : color;
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 transition-all ${isSelected ? 'z-10 scale-125' : 'hover:scale-110'}`}
      style={{ left: `${position}%` }}
      title={`${event.event_type} - ${event.node_name}`}
    >
      <span
        className={`block w-3 h-3 rounded-full border-2 ${isSelected ? 'ring-2 ring-offset-1 ring-offset-gray-900' : ''}`}
        style={{ backgroundColor: isSelected ? eventColor : `${eventColor}40`, borderColor: eventColor }}
      />
    </button>
  );
};

const EventDetailPanel: React.FC<{ event: TorEvent; onClose: () => void }> = ({ event, onClose }) => (
  <div className="bg-gray-900/80 rounded-lg border border-gray-700/50 p-4">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h4 className="text-sm font-medium text-white">{event.event_type}</h4>
        <p className="text-xs text-gray-400">{event.node_name}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString('de-DE')}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white">×</button>
      </div>
    </div>
    <div className="bg-gray-800/50 rounded p-3 max-h-48 overflow-y-auto">
      <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{JSON.stringify(event.data, null, 2)}</pre>
    </div>
  </div>
);

export default ForensicsTab;