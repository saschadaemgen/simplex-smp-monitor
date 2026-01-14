/**
 * BytesDisplay - Human-readable Byte Formatting
 */
import React from 'react';
import { ArrowDown, ArrowUp, Activity } from 'lucide-react';

interface BytesDisplayProps {
  bytes: number;
  showIcon?: boolean;
  direction?: 'read' | 'write' | 'total';
  className?: string;
  precision?: number;
}

export const formatBytes = (bytes: number, precision: number = 2): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(precision))} ${sizes[i]}`;
};

export const formatBytesPerSecond = (bytes: number, precision: number = 2): string => {
  return `${formatBytes(bytes, precision)}/s`;
};

export const BytesDisplay: React.FC<BytesDisplayProps> = ({ 
  bytes, 
  showIcon = false, 
  direction = 'total',
  className = '',
  precision = 2
}) => {
  const iconMap = {
    read: { icon: ArrowDown, color: 'text-green-400' },
    write: { icon: ArrowUp, color: 'text-blue-400' },
    total: { icon: Activity, color: 'text-[#88CED0]' },
  };
  const { icon: Icon, color } = iconMap[direction];
  
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${className}`}>
      {showIcon && <Icon size={14} className={color} />}
      <span className={color}>{formatBytes(bytes, precision)}</span>
    </span>
  );
};

interface BandwidthDisplayProps {
  bytesRead: number;
  bytesWritten: number;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export const BandwidthDisplay: React.FC<BandwidthDisplayProps> = ({ 
  bytesRead, 
  bytesWritten, 
  className = '',
  layout = 'horizontal'
}) => {
  const total = bytesRead + bytesWritten;
  const containerClass = layout === 'horizontal' ? 'flex items-center gap-4' : 'flex flex-col gap-1';
  
  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex items-center gap-1">
        <ArrowDown size={14} className="text-green-400" />
        <span className="text-green-400 font-mono text-sm">{formatBytes(bytesRead)}</span>
      </div>
      <div className="flex items-center gap-1">
        <ArrowUp size={14} className="text-blue-400" />
        <span className="text-blue-400 font-mono text-sm">{formatBytes(bytesWritten)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Activity size={14} className="text-[#88CED0]" />
        <span className="text-[#88CED0] font-mono text-sm">{formatBytes(total)}</span>
      </div>
    </div>
  );
};

export default BytesDisplay;
