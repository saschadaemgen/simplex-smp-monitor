/**
 * BandwidthChart - Bandwidth Distribution by Node Type
 */
import React from 'react';
import { BandwidthByType, NodeType } from '../types';
import { 
  Server, Shield, Shuffle, DoorOpen, Monitor, Globe,
  ArrowDown, ArrowUp
} from 'lucide-react';

interface BandwidthChartProps {
  byType: Record<string, BandwidthByType>;
}

const nodeTypeConfig: Record<NodeType, { icon: React.ElementType; color: string; bgColor: string }> = {
  da: { icon: Server, color: 'text-purple-400', bgColor: 'bg-purple-500' },
  guard: { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500' },
  middle: { icon: Shuffle, color: 'text-cyan-400', bgColor: 'bg-cyan-500' },
  exit: { icon: DoorOpen, color: 'text-orange-400', bgColor: 'bg-orange-500' },
  client: { icon: Monitor, color: 'text-green-400', bgColor: 'bg-green-500' },
  hs: { icon: Globe, color: 'text-pink-400', bgColor: 'bg-pink-500' },
};

export const BandwidthChart: React.FC<BandwidthChartProps> = ({ byType }) => {
  const entries = Object.entries(byType);
  const totalBytes = entries.reduce((sum, [_, data]) => 
    sum + data.bytes_read + data.bytes_written, 0
  );

  if (entries.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h4 className="font-medium text-white mb-4">Bandwidth by Type</h4>
        <div className="text-center py-8 text-gray-500">
          No bandwidth data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h4 className="font-medium text-white mb-4 flex items-center gap-2">
        <Server size={18} className="text-[#88CED0]" />
        Bandwidth by Node Type
      </h4>

      {/* Stacked Bar */}
      <div className="h-8 flex rounded-lg overflow-hidden mb-4">
        {entries.map(([type, data]) => {
          const total = data.bytes_read + data.bytes_written;
          const percent = totalBytes > 0 ? (total / totalBytes) * 100 : 0;
          const config = nodeTypeConfig[type as NodeType] || nodeTypeConfig.client;
          
          return (
            <div
              key={type}
              className={`${config.bgColor} transition-all duration-500 relative group`}
              style={{ width: `${percent}%` }}
              title={`${type.toUpperCase()}: ${formatBytes(total)} (${percent.toFixed(1)}%)`}
            >
              {percent > 10 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                  {type.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend with Details */}
      <div className="space-y-2">
        {entries.map(([type, data]) => {
          const total = data.bytes_read + data.bytes_written;
          const percent = totalBytes > 0 ? (total / totalBytes) * 100 : 0;
          const config = nodeTypeConfig[type as NodeType] || nodeTypeConfig.client;
          const Icon = config.icon;
          
          return (
            <div key={type} className="flex items-center justify-between p-2 bg-gray-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${config.bgColor}`} />
                <Icon size={14} className={config.color} />
                <span className="text-sm text-white">{type.toUpperCase()}</span>
                <span className="text-xs text-gray-500">({data.node_count} nodes)</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs">
                  <ArrowDown size={10} className="text-green-400" />
                  <span className="text-green-400 font-mono">{formatBytes(data.bytes_read)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <ArrowUp size={10} className="text-blue-400" />
                  <span className="text-blue-400 font-mono">{formatBytes(data.bytes_written)}</span>
                </div>
                <span className="text-[#88CED0] font-mono text-sm w-20 text-right">
                  {percent.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export default BandwidthChart;
