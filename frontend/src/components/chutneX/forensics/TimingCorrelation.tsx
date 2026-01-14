/**
 * TimingCorrelation - Timing Correlation Attack Analysis
 */
import React from 'react';
import { TimingCorrelation as TimingCorrelationType } from '../types';
import { 
  Clock, AlertTriangle, Activity,
  TrendingUp, Zap, Shield
} from 'lucide-react';

interface TimingCorrelationProps {
  correlations: TimingCorrelationType[];
  threshold?: number;
}

export const TimingCorrelation: React.FC<TimingCorrelationProps> = ({
  correlations,
  threshold = 0.7,
}) => {
  const highCorrelations = correlations.filter(c => c.correlation_score >= threshold);
  const avgCorrelation = correlations.length > 0
    ? correlations.reduce((sum, c) => sum + c.correlation_score, 0) / correlations.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Activity className="text-[#88CED0]" />}
          label="Total Pairs Analyzed"
          value={correlations.length.toString()}
        />
        <SummaryCard
          icon={<TrendingUp className="text-purple-400" />}
          label="Average Correlation"
          value={`${(avgCorrelation * 100).toFixed(1)}%`}
          warning={avgCorrelation > 0.5}
        />
        <SummaryCard
          icon={<AlertTriangle className={highCorrelations.length > 0 ? 'text-red-400' : 'text-green-400'} />}
          label="High Correlations"
          value={highCorrelations.length.toString()}
          warning={highCorrelations.length > 0}
        />
      </div>

      {/* Threshold Explanation */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-white flex items-center gap-2">
            <Clock radius={4} className="text-purple-400" />
            Timing Correlation Analysis
          </h4>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Threshold:</span>
            <span className="font-mono text-[#88CED0]">{(threshold * 100).toFixed(0)}%</span>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Timing correlation measures the statistical relationship between traffic patterns at entry and exit nodes.
          High correlation scores may indicate vulnerability to traffic analysis attacks.
        </p>

        {/* Correlation Scale */}
        <div className="mb-4">
          <div className="h-3 rounded-full overflow-hidden flex">
            <div className="bg-green-500 flex-1" title="Low Risk (0-30%)" />
            <div className="bg-yellow-500 flex-1" title="Medium Risk (30-70%)" />
            <div className="bg-red-500 flex-1" title="High Risk (70-100%)" />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0% - Low Risk</span>
            <span>50%</span>
            <span>100% - High Risk</span>
          </div>
        </div>
      </div>

      {/* Correlation Results */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h4 className="font-medium text-white">Correlation Results</h4>
        </div>

        {correlations.length > 0 ? (
          <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
            {correlations
              .sort((a, b) => b.correlation_score - a.correlation_score)
              .map((correlation, index) => (
                <CorrelationRow 
                  key={index} 
                  correlation={correlation} 
                  threshold={threshold}
                />
              ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Clock radius={4} className="mx-auto mb-4 opacity-50" />
            <p>No timing correlation data available</p>
            <p className="text-sm mt-1">Collect traffic data to enable analysis</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {highCorrelations.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <h4 className="font-medium text-red-400 mb-3 flex items-center gap-2">
            <Shield radius={4} />
            Security Recommendations
          </h4>
          <ul className="text-sm text-red-400/80 space-y-2">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Consider implementing additional padding to obscure timing patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Evaluate the use of cover traffic during sensitive operations</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Review circuit building strategies to reduce correlation opportunities</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  warning?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, warning = false }) => (
  <div className={`bg-gray-800/50 border rounded-xl p-4 ${warning ? 'border-red-500/50' : 'border-gray-700'}`}>
    <div className="flex items-center gap-2 mb-2">
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className={`text-2xl font-bold font-mono ${warning ? 'text-red-400' : 'text-white'}`}>
      {value}
    </div>
  </div>
);

interface CorrelationRowProps {
  correlation: TimingCorrelationType;
  threshold: number;
}

const CorrelationRow: React.FC<CorrelationRowProps> = ({ correlation, threshold }) => {
  const isHigh = correlation.correlation_score >= threshold;
  const scorePercent = correlation.correlation_score * 100;
  
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-red-400';
    if (score >= 0.4) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getBarColor = (score: number) => {
    if (score >= 0.7) return 'bg-red-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`p-4 hover:bg-gray-700/20 ${isHigh ? 'bg-red-500/5' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-green-400 font-mono text-sm">{correlation.entry_node}</span>
          <Zap radius={4} className="text-gray-500" />
          <span className="text-orange-400 font-mono text-sm">{correlation.exit_node}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {isHigh && <AlertTriangle radius={4} className="text-red-400" />}
          <span className={`font-mono font-bold ${getScoreColor(correlation.correlation_score)}`}>
            {scorePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full ${getBarColor(correlation.correlation_score)} transition-all`}
          style={{ width: `${scorePercent}%` }}
        />
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Offset: {correlation.time_offset_ms}ms</span>
        <span>Confidence: {(correlation.confidence * 100).toFixed(0)}%</span>
        <span>Samples: {correlation.sample_count}</span>
      </div>
    </div>
  );
};

export default TimingCorrelation;
