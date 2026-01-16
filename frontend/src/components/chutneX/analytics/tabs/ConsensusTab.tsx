/**
 * ConsensusTab - Consensus Status & Voting
 * =========================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Shows:
 * - Current consensus validity window
 * - Voting timeline visualization
 * - Consensus parameters
 * - Relay descriptor counts
 */
import React, { useMemo } from 'react';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  FileText,
  Calendar,
  Timer,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';

interface ConsensusData {
  is_valid: boolean;
  valid_after?: string;
  fresh_until?: string;
  valid_until?: string;
  relay_count: number;
  
  // Voting parameters
  vote_interval_seconds?: number;
  dist_interval_seconds?: number;
  
  // Directory authorities
  authority_count: number;
  required_authorities: number;
}

interface ConsensusEvent {
  timestamp: string;
  type: 'new_consensus' | 'validity_change';
  relay_count?: number;
  is_valid?: boolean;
}

interface ConsensusTabProps {
  consensus: ConsensusData;
  consensusHistory: ConsensusEvent[];
  isLive: boolean;
}

export const ConsensusTab: React.FC<ConsensusTabProps> = ({
  consensus,
  consensusHistory,
  isLive,
}) => {
  // Calculate time remaining in current consensus
  const timeInfo = useMemo(() => {
    if (!consensus.valid_until) return null;
    
    const now = new Date();
    const validUntil = new Date(consensus.valid_until);
    const freshUntil = consensus.fresh_until ? new Date(consensus.fresh_until) : null;
    const validAfter = consensus.valid_after ? new Date(consensus.valid_after) : null;
    
    const remainingMs = validUntil.getTime() - now.getTime();
    const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));
    
    const isFresh = freshUntil ? now < freshUntil : true;
    
    // Calculate progress through validity window
    let progress = 0;
    if (validAfter) {
      const totalMs = validUntil.getTime() - validAfter.getTime();
      const elapsedMs = now.getTime() - validAfter.getTime();
      progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
    }
    
    return {
      remainingMinutes,
      isFresh,
      progress,
      validAfter,
      freshUntil,
      validUntil,
    };
  }, [consensus]);

  // Format dates
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('de-DE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Status Banner */}
      <div 
        className="rounded-lg border p-4"
        style={{
          backgroundColor: consensus.is_valid ? NEON_DIM : 'rgba(248, 113, 113, 0.1)',
          borderColor: consensus.is_valid ? 'rgba(136, 206, 208, 0.3)' : 'rgba(248, 113, 113, 0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          {consensus.is_valid ? (
            <CheckCircle2 size={24} style={{ color: NEON }} />
          ) : (
            <XCircle size={24} className="text-red-400" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-white">
              Consensus {consensus.is_valid ? 'Valid' : 'Invalid'}
            </h2>
            <p className="text-sm text-gray-400">
              {consensus.is_valid 
                ? `${consensus.relay_count} relays in current consensus`
                : 'Network is synchronizing or consensus unavailable'
              }
            </p>
          </div>
          
          {/* Live indicator */}
          {isLive && (
            <div className="ml-auto flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: NEON }}
              />
              <span className="text-sm" style={{ color: NEON }}>Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Validity Timeline */}
      {timeInfo && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <Timer size={14} style={{ color: NEON }} />
            Consensus Validity Window
          </h3>

          {/* Timeline visualization */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>{formatTime(consensus.valid_after)}</span>
              <span>Fresh Until: {formatTime(consensus.fresh_until)}</span>
              <span>{formatTime(consensus.valid_until)}</span>
            </div>
            
            <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
              {/* Progress */}
              <div 
                className="absolute left-0 top-0 h-full transition-all duration-1000"
                style={{ 
                  width: `${timeInfo.progress}%`,
                  backgroundColor: timeInfo.isFresh ? NEON : '#fbbf24',
                }}
              />
              
              {/* Fresh marker */}
              {consensus.fresh_until && (
                <div 
                  className="absolute top-0 w-0.5 h-full bg-white/30"
                  style={{ 
                    left: `${((new Date(consensus.fresh_until).getTime() - new Date(consensus.valid_after!).getTime()) / 
                           (new Date(consensus.valid_until!).getTime() - new Date(consensus.valid_after!).getTime())) * 100}%`
                  }}
                />
              )}
            </div>
            
            {/* Labels */}
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-gray-400">Valid After</span>
              <span className={timeInfo.isFresh ? 'text-emerald-400' : 'text-yellow-400'}>
                {timeInfo.isFresh ? 'Fresh' : 'Stale (still valid)'}
              </span>
              <span className="text-gray-400">Valid Until</span>
            </div>
          </div>

          {/* Time remaining */}
          <div 
            className="flex items-center justify-center gap-2 p-3 rounded-lg"
            style={{ backgroundColor: NEON_DIM }}
          >
            <Clock size={16} style={{ color: NEON }} />
            <span className="text-lg font-mono" style={{ color: NEON }}>
              {timeInfo.remainingMinutes} minutes remaining
            </span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Relays"
          value={consensus.relay_count.toString()}
        />
        <StatCard
          icon={Shield}
          label="Authorities"
          value={`${consensus.authority_count}/${consensus.required_authorities}`}
        />
        <StatCard
          icon={Timer}
          label="Vote Interval"
          value={consensus.vote_interval_seconds 
            ? `${consensus.vote_interval_seconds / 60}m` 
            : '-'
          }
        />
        <StatCard
          icon={Clock}
          label="Dist Interval"
          value={consensus.dist_interval_seconds 
            ? `${consensus.dist_interval_seconds / 60}m` 
            : '-'
          }
        />
      </div>

      {/* Consensus History Chart */}
      {consensusHistory.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
            <FileText size={14} style={{ color: NEON }} />
            Relay Count Over Time
          </h3>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={consensusHistory
                  .filter(e => e.relay_count !== undefined)
                  .map(e => ({
                    time: new Date(e.timestamp).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    relays: e.relay_count,
                  }))}
              >
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
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: `1px solid ${NEON}33`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: NEON }}
                />
                <Line 
                  type="stepAfter"
                  dataKey="relays"
                  stroke={NEON}
                  strokeWidth={2}
                  dot={{ fill: NEON, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Consensus Details */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <Calendar size={14} style={{ color: NEON }} />
          Consensus Timestamps
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TimestampCard
            label="Valid After"
            value={formatDateTime(consensus.valid_after)}
            icon={Clock}
          />
          <TimestampCard
            label="Fresh Until"
            value={formatDateTime(consensus.fresh_until)}
            icon={CheckCircle2}
            highlight={timeInfo?.isFresh}
          />
          <TimestampCard
            label="Valid Until"
            value={formatDateTime(consensus.valid_until)}
            icon={AlertTriangle}
          />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value }) => (
  <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} style={{ color: NEON }} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <p className="text-xl font-bold text-white">{value}</p>
  </div>
);

interface TimestampCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
}

const TimestampCard: React.FC<TimestampCardProps> = ({ 
  label, value, icon: Icon, highlight 
}) => (
  <div 
    className={`p-3 rounded-lg border ${
      highlight 
        ? 'border-[#88CED0]/30 bg-[#88CED0]/10' 
        : 'border-gray-700/50 bg-gray-900/30'
    }`}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} style={{ color: highlight ? NEON : '#64748b' }} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <p className="text-sm font-mono text-white">{value}</p>
  </div>
);

export default ConsensusTab;