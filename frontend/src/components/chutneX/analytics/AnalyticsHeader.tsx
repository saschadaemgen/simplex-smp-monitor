/**
 * AnalyticsHeader - Dashboard Header with Controls
 */
import React from 'react';
import { 
  Activity, RefreshCw, Play, Pause, 
  Clock, CheckCircle, AlertTriangle
} from 'lucide-react';

interface AnalyticsHeaderProps {
  networkName: string;
  networkStatus: string;
  lastUpdated: string | null;
  isAutoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  networkName,
  networkStatus,
  lastUpdated,
  isAutoRefresh,
  onToggleAutoRefresh,
  onRefresh,
  isLoading,
}) => {
  const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
    running: { icon: CheckCircle, color: 'text-green-400' },
    bootstrapping: { icon: Activity, color: 'text-yellow-400' },
    stopped: { icon: AlertTriangle, color: 'text-red-400' },
  };

  const config = statusConfig[networkStatus] || statusConfig.stopped;
  const StatusIcon = config.icon;

  return (
    <div className="bg-gray-800/50 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#88CED0]/20 rounded-lg">
              <Activity size={28} className="text-[#88CED0]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                ChutneX Analytics
                <span className="text-[#88CED0]">- {networkName}</span>
              </h1>
              <div className="flex items-center gap-2 text-sm">
                <StatusIcon size={14} className={config.color} />
                <span className={config.color}>{networkStatus}</span>
                {lastUpdated && (
                  <>
                    <span className="text-gray-600">•</span>
                    <Clock size={12} className="text-gray-500" />
                    <span className="text-gray-500">
                      {formatTimeAgo(lastUpdated)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Auto Refresh Toggle */}
            <button
              onClick={onToggleAutoRefresh}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isAutoRefresh
                  ? 'border-[#88CED0] bg-[#88CED0]/10 text-[#88CED0]'
                  : 'border-gray-600 text-gray-400 hover:text-white'
              }`}
            >
              {isAutoRefresh ? <Play size={14} /> : <Pause size={14} />}
              <span className="text-sm">Auto</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTimeAgo = (timestamp: string): string => {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

export default AnalyticsHeader;
