/**
 * AnalyticsHeader - Dashboard Header Component
 * ============================================
 * Pure UI component - receives all data via props
 * 
 * Shows:
 * - Network name and status
 * - Bootstrap progress (if not 100%)
 * - Last updated timestamp
 * - Auto-refresh toggle
 * - Manual refresh button
 */
import React from 'react';
import { 
  Activity, RefreshCw, Clock, 
  CheckCircle, AlertTriangle, Loader2, Wifi
} from 'lucide-react';
import { NetworkStatus } from '../types';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';

interface AnalyticsHeaderProps {
  networkName: string;
  networkStatus: NetworkStatus;
  bootstrapProgress: number;
  consensusValid: boolean;
  lastUpdated: string | null;
  isAutoRefresh: boolean;
  refreshInterval: number;
  isLoading: boolean;
  onRefresh: () => void;
  onIntervalChange: (interval: number) => void;
}

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
];

const STATUS_CONFIG: Record<NetworkStatus, { icon: React.ElementType; color: string; label: string }> = {
  running: { icon: CheckCircle, color: '#34d399', label: 'Running' },
  bootstrapping: { icon: Loader2, color: '#fbbf24', label: 'Bootstrapping' },
  creating: { icon: Loader2, color: '#60a5fa', label: 'Creating' },
  stopping: { icon: Loader2, color: '#fb923c', label: 'Stopping' },
  stopped: { icon: AlertTriangle, color: '#f87171', label: 'Stopped' },
  error: { icon: AlertTriangle, color: '#f87171', label: 'Error' },
  not_created: { icon: AlertTriangle, color: '#9ca3af', label: 'Not Created' },
};

const formatTimeAgo = (timestamp: string): string => {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  networkName,
  networkStatus,
  bootstrapProgress,
  consensusValid,
  lastUpdated,
  isAutoRefresh,
  refreshInterval,
  isLoading,
  onRefresh,
  onIntervalChange,
}) => {
  const config = STATUS_CONFIG[networkStatus] || STATUS_CONFIG.not_created;
  const StatusIcon = config.icon;
  const isBootstrapping = networkStatus === 'bootstrapping' || bootstrapProgress < 100;

  return (
    <div className="bg-gray-800/50 border-b border-gray-700/50">
      <div className="px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Title & Status */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: NEON_DIM }}>
              <Activity size={28} style={{ color: NEON }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                ChutneX Analytics
                <span style={{ color: NEON }}>— {networkName}</span>
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {/* Status */}
                <div className="flex items-center gap-1.5">
                  <StatusIcon 
                    size={14} 
                    style={{ color: config.color }}
                    className={networkStatus === 'bootstrapping' ? 'animate-spin' : ''}
                  />
                  <span className="text-sm" style={{ color: config.color }}>
                    {config.label}
                  </span>
                </div>

                {/* Bootstrap Progress */}
                {isBootstrapping && networkStatus !== 'stopped' && networkStatus !== 'error' && (
                  <>
                    <span className="text-gray-600">•</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${bootstrapProgress}%`, backgroundColor: NEON }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{bootstrapProgress}%</span>
                    </div>
                  </>
                )}

                {/* Consensus */}
                {networkStatus === 'running' && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className={`text-xs ${consensusValid ? 'text-green-400' : 'text-yellow-400'}`}>
                      Consensus: {consensusValid ? '✓ Valid' : '⚠ Pending'}
                    </span>
                  </>
                )}

                {/* Last Updated */}
                {lastUpdated && (
                  <>
                    <span className="text-gray-600">•</span>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock size={12} />
                      <span className="text-xs">{formatTimeAgo(lastUpdated)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            {isAutoRefresh && (
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ backgroundColor: NEON_DIM, borderColor: 'rgba(136, 206, 208, 0.3)' }}
              >
                <Wifi size={14} style={{ color: NEON }} className="animate-pulse" />
                <span className="text-xs font-medium" style={{ color: NEON }}>LIVE</span>
              </div>
            )}

            {/* Refresh Interval Selector */}
            <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5">
              <Activity size={14} style={{ color: NEON }} />
              <select
                value={refreshInterval}
                onChange={(e) => onIntervalChange(Number(e.target.value))}
                className="bg-transparent text-sm text-white border-none outline-none cursor-pointer"
              >
                {REFRESH_INTERVALS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-gray-800">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg border border-gray-700/50 hover:border-[#88CED0]/50 transition-colors disabled:opacity-50"
              style={{ backgroundColor: NEON_DIM }}
              title="Refresh now"
            >
              <RefreshCw 
                size={18} 
                style={{ color: NEON }}
                className={isLoading ? 'animate-spin' : ''} 
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsHeader;
