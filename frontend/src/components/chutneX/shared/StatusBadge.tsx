/**
 * StatusBadge - Node/Network Status Display
 */
import React from 'react';
import { NodeStatus, NetworkStatus } from '../types';

interface StatusBadgeProps {
  status: NodeStatus | NetworkStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  running: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '●', label: 'Running' },
  bootstrapping: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '◐', label: 'Bootstrapping' },
  starting: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '◑', label: 'Starting' },
  stopped: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '○', label: 'Stopped' },
  error: { color: 'text-red-500', bg: 'bg-red-500/20', icon: '✕', label: 'Error' },
  not_created: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '○', label: 'Not Created' },
  creating: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '◐', label: 'Creating' },
  stopping: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: '◑', label: 'Stopping' },
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const config = statusConfig[status] || statusConfig.not_created;
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.color} ${sizeClasses[size]}`}>
      {showIcon && <span className="animate-pulse">{config.icon}</span>}
      {config.label}
    </span>
  );
};

export default StatusBadge;
