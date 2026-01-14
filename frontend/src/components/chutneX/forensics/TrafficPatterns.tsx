/**
 * TrafficPatterns - Traffic Pattern Detection and Analysis
 */
import React from 'react';
import { TrafficPattern } from '../types';
import { 
  Activity, Zap, Clock, TrendingUp,
  BarChart2, AlertCircle, Waves
} from 'lucide-react';

interface TrafficPatternsProps {
  patterns: TrafficPattern[];
  nodeId?: string;
  nodeName?: string;
}

const patternConfig: Record<string, { icon: React.ElementType; color: string; description: string }> = {
  burst: { 
    icon: Zap, 
    color: 'text-yellow-400', 
    description: 'High-intensity traffic bursts followed by quiet periods' 
  },
  steady: { 
    icon: Activity, 
    color: 'text-green-400', 
    description: 'Consistent traffic rate with low variance' 
  },
  periodic: { 
    icon: Clock, 
    color: 'text-blue-400', 
    description: 'Regular, repeating traffic patterns' 
  },
  irregular: { 
    icon: Waves, 
    color: 'text-orange-400', 
    description: 'Unpredictable traffic with high variance' 
  },
};

export const TrafficPatterns: React.FC<TrafficPatternsProps> = ({
  patterns,
  
  nodeName,
}) => {
  // Group patterns by type
  const patternCounts = patterns.reduce((acc, p) => {
    acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgPacketSize = patterns.length > 0
    ? patterns.reduce((sum, p) => sum + p.avg_packet_size, 0) / patterns.length
    : 0;

  const avgInterArrival = patterns.length > 0
    ? patterns.reduce((sum, p) => sum + p.inter_arrival_time_ms, 0) / patterns.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-white flex items-center gap-2">
            <BarChart2 radius={4} className="text-[#88CED0]" />
            Traffic Pattern Analysis
            {nodeName && <span className="text-gray-400">- {nodeName}</span>}
          </h4>
          <span className="text-sm text-gray-400">
            {patterns.length} patterns detected
          </span>
        </div>

        {/* Pattern Type Distribution */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(patternConfig).map(([type, config]) => {
            const count = patternCounts[type] || 0;
            const Icon = config.icon;
            const percent = patterns.length > 0 ? (count / patterns.length) * 100 : 0;
            
            return (
              <div 
                key={type}
                className="bg-gray-900/50 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon radius={4} className={config.color} />
                  <span className="text-sm text-white capitalize">{type}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className={`text-xl font-bold font-mono ${config.color}`}>
                    {count}
                  </span>
                  <span className="text-xs text-gray-500">
                    {percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<BarChart2 className="text-blue-400" />}
          label="Avg Packet Size"
          value={formatBytes(avgPacketSize)}
        />
        <StatCard
          icon={<Clock className="text-purple-400" />}
          label="Avg Inter-Arrival"
          value={`${avgInterArrival.toFixed(2)}ms`}
        />
        <StatCard
          icon={<TrendingUp className="text-green-400" />}
          label="Pattern Variance"
          value={calculateVariance(patterns)}
        />
      </div>

      {/* Pattern List */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h4 className="font-medium text-white">Detected Patterns</h4>
        </div>

        {patterns.length > 0 ? (
          <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
            {patterns.map((pattern, index) => (
              <PatternRow key={index} pattern={pattern} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Activity radius={4} className="mx-auto mb-4 opacity-50" />
            <p>No traffic patterns detected</p>
          </div>
        )}
      </div>

      {/* Fingerprinting Warning */}
      {patternCounts.periodic && patternCounts.periodic > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-400 flex-shrink-0" radius={4} />
            <div>
              <h5 className="font-medium text-yellow-400 mb-1">Fingerprinting Risk</h5>
              <p className="text-sm text-yellow-400/70">
                Periodic traffic patterns detected. These regular patterns could potentially
                be used for traffic fingerprinting attacks. Consider implementing traffic
                shaping or adding randomization to reduce predictability.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className="text-xl font-bold font-mono text-white">{value}</div>
  </div>
);

interface PatternRowProps {
  pattern: TrafficPattern;
}

const PatternRow: React.FC<PatternRowProps> = ({ pattern }) => {
  const config = patternConfig[pattern.pattern_type] || patternConfig.irregular;
  const Icon = config.icon;

  return (
    <div className="p-4 hover:bg-gray-700/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg bg-gray-700/50 ${config.color}`}>
            <Icon radius={4} />
          </div>
          <div>
            <span className="text-white font-medium capitalize">{pattern.pattern_type}</span>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
        <div>
          <span className="text-gray-500">Avg Size</span>
          <div className="font-mono text-white">{formatBytes(pattern.avg_packet_size)}</div>
        </div>
        <div>
          <span className="text-gray-500">Variance</span>
          <div className="font-mono text-white">{pattern.packet_size_variance.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-gray-500">Inter-Arrival</span>
          <div className="font-mono text-white">{pattern.inter_arrival_time_ms.toFixed(2)}ms</div>
        </div>
      </div>

      {pattern.burst_count !== undefined && pattern.burst_count > 0 && (
        <div className="mt-2 text-xs text-yellow-400">
          <Zap radius={4} className="inline mr-1" />
          {pattern.burst_count} burst events detected
        </div>
      )}
    </div>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const calculateVariance = (patterns: TrafficPattern[]): string => {
  if (patterns.length === 0) return 'N/A';
  const avg = patterns.reduce((sum, p) => sum + p.packet_size_variance, 0) / patterns.length;
  if (avg < 100) return 'Low';
  if (avg < 500) return 'Medium';
  return 'High';
};

export default TrafficPatterns;
