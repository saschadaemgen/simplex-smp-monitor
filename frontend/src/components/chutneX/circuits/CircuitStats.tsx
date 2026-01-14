/**
 * CircuitStats - Circuit Statistics Display
 */
import React from 'react';
import { 
  GitBranch, CheckCircle, Clock, XCircle, 
  PieChart, BarChart2, Flag
} from 'lucide-react';

interface CircuitStatsProps {
  stats: {
    total_circuits: number;
    built_circuits: number;
    by_status: Record<string, number>;
    by_purpose: Record<string, number>;
  };
}

const statusColors: Record<string, string> = {
  BUILT: 'bg-green-500',
  LAUNCHED: 'bg-yellow-500',
  EXTENDED: 'bg-blue-500',
  FAILED: 'bg-red-500',
  CLOSED: 'bg-gray-500',
};

const purposeColors: Record<string, string> = {
  GENERAL: 'bg-blue-500',
  TESTING: 'bg-yellow-500',
  CONTROLLER: 'bg-purple-500',
  HS_CLIENT_INTRO: 'bg-pink-500',
  HS_CLIENT_REND: 'bg-pink-400',
  HS_SERVICE_INTRO: 'bg-orange-500',
  HS_SERVICE_REND: 'bg-orange-400',
  HS_VANGUARDS: 'bg-red-500',
  CONFLUX_LINKED: 'bg-cyan-500',
};

export const CircuitStats: React.FC<CircuitStatsProps> = ({ stats }) => {
  const successRate = stats.total_circuits > 0 
    ? ((stats.built_circuits / stats.total_circuits) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary Card */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h4 className="font-medium text-white mb-4 flex items-center gap-2">
          <GitBranch size={18} className="text-[#88CED0]" />
          Circuit Summary
        </h4>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatBox
            icon={<GitBranch className="text-[#88CED0]" />}
            label="Total Circuits"
            value={stats.total_circuits}
          />
          <StatBox
            icon={<CheckCircle className="text-green-400" />}
            label="Built Circuits"
            value={stats.built_circuits}
          />
        </div>

        {/* Success Rate */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Success Rate</span>
            <span className="text-2xl font-bold text-green-400">{successRate}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* By Status */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h4 className="font-medium text-white mb-4 flex items-center gap-2">
          <BarChart2 size={18} className="text-purple-400" />
          By Status
        </h4>
        <div className="space-y-3">
          {Object.entries(stats.by_status).map(([status, count]) => {
            const percent = stats.total_circuits > 0 
              ? (count / stats.total_circuits) * 100 
              : 0;
            const color = statusColors[status.replace('CircStatus.', '')] || 'bg-gray-500';
            
            return (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300">{status.replace('CircStatus.', '')}</span>
                  <span className="text-gray-400">{count} ({percent.toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Purpose */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:col-span-2">
        <h4 className="font-medium text-white mb-4 flex items-center gap-2">
          <Flag size={18} className="text-orange-400" />
          By Purpose
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(stats.by_purpose).map(([purpose, count]) => {
            const color = purposeColors[purpose] || 'bg-gray-500';
            return (
              <div 
                key={purpose}
                className="bg-gray-900/50 rounded-lg p-3 flex items-center gap-3"
              >
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 truncate">{purpose}</div>
                  <div className="font-mono text-white">{count}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface StatBoxProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

const StatBox: React.FC<StatBoxProps> = ({ icon, label, value }) => (
  <div className="bg-gray-900/50 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-1">
      {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <div className="text-2xl font-bold font-mono text-white">{value}</div>
  </div>
);

export default CircuitStats;
