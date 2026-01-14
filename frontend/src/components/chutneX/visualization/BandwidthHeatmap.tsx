/**
 * BandwidthHeatmap - Node Bandwidth Heatmap
 */
import React from 'react';
import { NodeStats } from '../types';
import { Activity } from 'lucide-react';

interface BandwidthHeatmapProps {
  nodes: NodeStats[];
  metric?: 'total' | 'read' | 'written';
}

export const BandwidthHeatmap: React.FC<BandwidthHeatmapProps> = ({
  nodes,
  metric = 'total',
}) => {
  const getValue = (node: NodeStats) => {
    switch (metric) {
      case 'read': return node.bytes_read;
      case 'written': return node.bytes_written;
      default: return node.bytes_read + node.bytes_written;
    }
  };

  const maxValue = Math.max(...nodes.map(getValue), 1);

  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity > 0.8) return 'bg-red-500';
    if (intensity > 0.6) return 'bg-orange-500';
    if (intensity > 0.4) return 'bg-yellow-500';
    if (intensity > 0.2) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getOpacity = (value: number) => {
    const intensity = value / maxValue;
    return 0.3 + intensity * 0.7;
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Activity size={18} className="text-[#88CED0]" />
          Bandwidth Heatmap
        </h4>
        <div className="flex items-center gap-2">
          {['total', 'read', 'written'].map(m => (
            <button
              key={m}
              className={`text-xs px-2 py-1 rounded ${
                metric === m ? 'bg-[#88CED0] text-gray-900' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {nodes.map(node => {
          const value = getValue(node);
          return (
            <div
              key={node.node_id}
              className={`aspect-square rounded-lg ${getColor(value)} flex flex-col items-center justify-center p-2 cursor-pointer hover:ring-2 hover:ring-white/50 transition-all`}
              style={{ opacity: getOpacity(value) }}
              title={`${node.node_name}: ${formatBytes(value)}`}
            >
              <span className="text-white text-xs font-bold truncate w-full text-center">
                {node.node_name}
              </span>
              <span className="text-white/80 text-xs">
                {formatBytes(value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
        <span className="text-xs text-gray-500">Low</span>
        <div className="flex-1 mx-4 h-2 rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 via-orange-500 to-red-500" />
        <span className="text-xs text-gray-500">High</span>
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

export default BandwidthHeatmap;
