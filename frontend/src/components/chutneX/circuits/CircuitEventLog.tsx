/**
 * CircuitEventLog - Circuit Events Timeline
 */
import React from 'react';
import { CircuitEvent } from '../types';
import { 
  GitBranch, CheckCircle, XCircle, Clock, 
  Zap, AlertTriangle, ChevronRight
} from 'lucide-react';

interface CircuitEventLogProps {
  events: CircuitEvent[];
  maxEvents?: number;
  onEventClick?: (event: CircuitEvent) => void;
}

const eventTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  launched: { icon: Clock, color: 'text-yellow-400' },
  built: { icon: CheckCircle, color: 'text-green-400' },
  extended: { icon: Zap, color: 'text-blue-400' },
  failed: { icon: XCircle, color: 'text-red-400' },
  closed: { icon: AlertTriangle, color: 'text-gray-400' },
};

export const CircuitEventLog: React.FC<CircuitEventLogProps> = ({
  events,
  maxEvents = 50,
  onEventClick,
}) => {
  const displayEvents = events.slice(0, maxEvents);

  if (events.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
        <GitBranch size={48} className="mx-auto mb-4 text-gray-600" />
        <p className="text-gray-500">No circuit events recorded</p>
        <p className="text-sm text-gray-600 mt-1">
          Events will appear here when circuits are built or closed
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Clock size={18} className="text-[#88CED0]" />
          Circuit Events
        </h4>
        <span className="text-sm text-gray-400">
          {events.length} total events
        </span>
      </div>

      {/* Event List */}
      <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
        {displayEvents.map((event, index) => {
          const config = eventTypeConfig[event.event_type] || eventTypeConfig.launched;
          const Icon = config.icon;

          return (
            <div
              key={`${event.circuit_id}-${event.event_time}-${index}`}
              onClick={() => onEventClick?.(event)}
              className={`p-3 hover:bg-gray-700/30 transition-colors ${onEventClick ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`p-1.5 rounded-full bg-gray-700/50 ${config.color}`}>
                  <Icon size={14} />
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white">#{event.circuit_id}</span>
                    <span className={`text-sm ${config.color}`}>
                      {event.event_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {event.purpose}
                    </span>
                  </div>
                  
                  {/* Path Preview */}
                  {event.path && event.path.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {event.path.map(h => h.nickname).join(' → ')}
                    </div>
                  )}

                  {/* Failure Reason */}
                  {event.reason && (
                    <div className="text-xs text-red-400 mt-1">
                      Reason: {event.reason}
                    </div>
                  )}
                </div>

                {/* Timestamp & Build Time */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-gray-400">
                    {formatTime(event.event_time)}
                  </div>
                  {event.build_time_ms && (
                    <div className="text-xs text-[#88CED0]">
                      {event.build_time_ms}ms
                    </div>
                  )}
                </div>

                {/* Chevron */}
                {onEventClick && (
                  <ChevronRight size={16} className="text-gray-600" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* More indicator */}
      {events.length > maxEvents && (
        <div className="p-3 text-center text-sm text-gray-500 border-t border-gray-700">
          Showing {maxEvents} of {events.length} events
        </div>
      )}
    </div>
  );
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export default CircuitEventLog;
