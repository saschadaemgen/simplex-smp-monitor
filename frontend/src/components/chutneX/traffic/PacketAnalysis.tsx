/**
 * PacketAnalysis - Packet Statistics Display
 */
import React from 'react';
import { 
  Database, Layers, Activity, AlertTriangle,
  TrendingUp, Clock, Zap
} from 'lucide-react';

interface PacketAnalysisProps {
  packetCount: number;
  bytesCaptures: number;
  packetsDropped: number;
  torCellsDetected: number;
  avgInterPacketDelay?: number;
  uniqueFlows: number;
}

export const PacketAnalysis: React.FC<PacketAnalysisProps> = ({
  packetCount,
  bytesCaptures,
  packetsDropped,
  torCellsDetected,
  avgInterPacketDelay,
  uniqueFlows,
}) => {
  const dropRate = packetCount > 0 ? (packetsDropped / packetCount) * 100 : 0;
  const avgPacketSize = packetCount > 0 ? bytesCaptures / packetCount : 0;
  const torCellPercent = packetCount > 0 ? (torCellsDetected / packetCount) * 100 : 0;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h4 className="font-medium text-white mb-4 flex items-center gap-2">
        <Database size={18} className="text-[#88CED0]" />
        Packet Analysis
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Total Packets */}
        <StatBox
          icon={<Database className="text-blue-400" />}
          label="Total Packets"
          value={formatNumber(packetCount)}
        />

        {/* Bytes Captured */}
        <StatBox
          icon={<Activity className="text-green-400" />}
          label="Data Captured"
          value={formatBytes(bytesCaptures)}
        />

        {/* Avg Packet Size */}
        <StatBox
          icon={<TrendingUp className="text-cyan-400" />}
          label="Avg Packet Size"
          value={formatBytes(avgPacketSize)}
        />

        {/* Tor Cells */}
        <StatBox
          icon={<Layers className="text-purple-400" />}
          label="Tor Cells"
          value={formatNumber(torCellsDetected)}
          subtext={`${torCellPercent.toFixed(1)}% of traffic`}
        />

        {/* Unique Flows */}
        <StatBox
          icon={<Zap className="text-orange-400" />}
          label="Unique Flows"
          value={uniqueFlows.toString()}
        />

        {/* Dropped Packets */}
        <StatBox
          icon={<AlertTriangle className={dropRate > 1 ? 'text-red-400' : 'text-gray-400'} />}
          label="Dropped"
          value={formatNumber(packetsDropped)}
          subtext={`${dropRate.toFixed(2)}% loss`}
          warning={dropRate > 1}
        />
      </div>

      {/* Inter-Packet Delay */}
      {avgInterPacketDelay !== undefined && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock size={14} />
              <span className="text-sm">Avg Inter-Packet Delay</span>
            </div>
            <span className="font-mono text-[#88CED0]">{avgInterPacketDelay.toFixed(2)} ms</span>
          </div>
          
          {/* Delay Indicator */}
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                avgInterPacketDelay < 1 ? 'bg-green-500' :
                avgInterPacketDelay < 10 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, avgInterPacketDelay * 10)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Fast (&lt;1ms)</span>
            <span>Normal (1-10ms)</span>
            <span>Slow (&gt;10ms)</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  warning?: boolean;
}

const StatBox: React.FC<StatBoxProps> = ({ icon, label, value, subtext, warning = false }) => (
  <div className={`bg-gray-900/50 rounded-lg p-3 ${warning ? 'border border-red-500/30' : ''}`}>
    <div className="flex items-center gap-2 mb-1">
      {React.cloneElement(icon as React.ReactElement, { size: 14 })}
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <div className={`text-lg font-bold font-mono ${warning ? 'text-red-400' : 'text-white'}`}>
      {value}
    </div>
    {subtext && (
      <div className={`text-xs ${warning ? 'text-red-400/70' : 'text-gray-500'}`}>
        {subtext}
      </div>
    )}
  </div>
);

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default PacketAnalysis;
