/**
 * NodeBandwidth - Node Bandwidth Visualization
 */
import React from 'react';
import { NodeStats } from '../types';
import { ArrowDown, ArrowUp, Activity, TrendingUp } from 'lucide-react';

interface NodeBandwidthProps {
  node: NodeStats;
  showChart?: boolean;
  historicalData?: { timestamp: string; read: number; written: number }[];
}

export const NodeBandwidth: React.FC<NodeBandwidthProps> = ({ 
  node,
  showChart = false,
  historicalData = []
}) => {
  const total = node.bytes_read + node.bytes_written;
  const readPercent = total > 0 ? (node.bytes_read / total) * 100 : 50;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Activity size={16} className="text-[#88CED0]" />
          Bandwidth - {node.node_name}
        </h4>
        <span className="text-[#88CED0] font-mono">{formatBytes(total)}</span>
      </div>

      {/* Read/Write Bar */}
      <div className="mb-4">
        <div className="flex h-4 rounded-full overflow-hidden">
          <div 
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${readPercent}%` }}
            title={`Download: ${formatBytes(node.bytes_read)}`}
          />
          <div 
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${100 - readPercent}%` }}
            title={`Upload: ${formatBytes(node.bytes_written)}`}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-green-400 flex items-center gap-1">
            <ArrowDown size={10} /> {formatBytes(node.bytes_read)} ({readPercent.toFixed(1)}%)
          </span>
          <span className="text-blue-400 flex items-center gap-1">
            <ArrowUp size={10} /> {formatBytes(node.bytes_written)} ({(100 - readPercent).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Simple Chart Placeholder */}
      {showChart && historicalData.length > 0 && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <TrendingUp size={14} />
            <span>Bandwidth over time</span>
          </div>
          <div className="h-20 flex items-end gap-1">
            {historicalData.slice(-20).map((point, i) => {
              const maxVal = Math.max(...historicalData.map(d => d.read + d.written));
              const height = maxVal > 0 ? ((point.read + point.written) / maxVal) * 100 : 0;
              return (
                <div
                  key={i}
                  className="flex-1 bg-[#88CED0]/50 rounded-t hover:bg-[#88CED0] transition-colors"
                  style={{ height: `${height}%` }}
                  title={`${formatBytes(point.read + point.written)}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default NodeBandwidth;
