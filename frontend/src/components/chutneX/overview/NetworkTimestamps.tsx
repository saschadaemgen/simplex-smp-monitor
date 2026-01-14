/**
 * NetworkTimestamps - Time Information Display
 */
import React from 'react';
import { Clock, Play, RefreshCw, Calendar } from 'lucide-react';

interface NetworkTimestampsProps {
  createdAt: string;
  startedAt?: string;
  stoppedAt?: string;
  lastUpdated?: string;
}

export const NetworkTimestamps: React.FC<NetworkTimestampsProps> = ({
  createdAt,
  startedAt,
  stoppedAt,
  lastUpdated,
}) => {
  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TimestampItem
          icon={<Calendar size={14} className="text-gray-400" />}
          label="Created"
          value={formatDateTime(createdAt)}
        />
        {startedAt && (
          <TimestampItem
            icon={<Play size={14} className="text-green-400" />}
            label="Started"
            value={formatDateTime(startedAt)}
          />
        )}
        {stoppedAt && (
          <TimestampItem
            icon={<Clock size={14} className="text-red-400" />}
            label="Stopped"
            value={formatDateTime(stoppedAt)}
          />
        )}
        {lastUpdated && (
          <TimestampItem
            icon={<RefreshCw size={14} className="text-[#88CED0]" />}
            label="Last Updated"
            value={formatTimeAgo(lastUpdated)}
            highlight
          />
        )}
      </div>
    </div>
  );
};

interface TimestampItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

const TimestampItem: React.FC<TimestampItemProps> = ({ icon, label, value, highlight = false }) => (
  <div className="flex items-center gap-2">
    {icon}
    <span className="text-gray-500 text-sm">{label}:</span>
    <span className={`text-sm font-mono ${highlight ? 'text-[#88CED0]' : 'text-gray-300'}`}>
      {value}
    </span>
  </div>
);

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const then = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export default NetworkTimestamps;
