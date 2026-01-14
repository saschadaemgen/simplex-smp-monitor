/**
 * TimeAgo - Relative Time Display
 */
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimeAgoProps {
  timestamp: string | null;
  showIcon?: boolean;
  className?: string;
  updateInterval?: number;
}

export const formatTimeAgo = (timestamp: string | null): string => {
  if (!timestamp) return 'Never';
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

export const TimeAgo: React.FC<TimeAgoProps> = ({ 
  timestamp, 
  showIcon = true, 
  className = '',
  updateInterval = 10000 
}) => {
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), updateInterval);
    return () => clearInterval(timer);
  }, [updateInterval]);
  
  return (
    <span className={`inline-flex items-center gap-1 text-gray-400 ${className}`}>
      {showIcon && <Clock size={14} />}
      <span>{formatTimeAgo(timestamp)}</span>
    </span>
  );
};

export const Uptime: React.FC<{ seconds: number; className?: string }> = ({ seconds, className = '' }) => (
  <span className={`font-mono text-[#88CED0] ${className}`}>
    {formatUptime(seconds)}
  </span>
);

export default TimeAgo;
