/**
 * FlowAnalysis - Network Flow Analysis Display
 */
import React from 'react';
import { FlowAnalysis as FlowAnalysisType } from '../types';
import { 
  Activity, ArrowRight, Clock,
} from 'lucide-react';

interface FlowAnalysisProps {
  flows: FlowAnalysisType[];
  maxFlows?: number;
}

export const FlowAnalysis: React.FC<FlowAnalysisProps> = ({
  flows,
  maxFlows = 20,
}) => {
  const displayFlows = flows.slice(0, maxFlows);
  const totalBytes = flows.reduce((sum, f) => sum + f.bytes, 0);
  const totalPackets = flows.reduce((sum, f) => sum + f.packets, 0);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white flex items-center gap-2">
            <Activity size={18} className="text-orange-400" />
            Flow Analysis
          </h4>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{flows.length} flows</span>
            <span>{formatBytes(totalBytes)}</span>
            <span>{formatNumber(totalPackets)} pkts</span>
          </div>
        </div>
      </div>

      {/* Flow List */}
      {displayFlows.length > 0 ? (
        <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
          {displayFlows.map((flow, index) => (
            <FlowRow key={flow.flow_id || index} flow={flow} totalBytes={totalBytes} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <Activity size={48} className="mx-auto mb-4 opacity-50" />
          <p>No flow data available</p>
        </div>
      )}

      {/* More indicator */}
      {flows.length > maxFlows && (
        <div className="p-3 text-center text-sm text-gray-500 border-t border-gray-700">
          Showing {maxFlows} of {flows.length} flows
        </div>
      )}
    </div>
  );
};

interface FlowRowProps {
  flow: FlowAnalysisType;
  totalBytes: number;
}

const FlowRow: React.FC<FlowRowProps> = ({ flow, totalBytes }) => {
  const percent = totalBytes > 0 ? (flow.bytes / totalBytes) * 100 : 0;

  return (
    <div className="p-3 hover:bg-gray-700/20 transition-colors">
      <div className="flex items-center gap-3">
        {/* Flow Direction */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-green-400 font-mono text-sm truncate">{flow.src_node}</span>
          <ArrowRight size={14} className="text-gray-500 flex-shrink-0" />
          <span className="text-blue-400 font-mono text-sm truncate">{flow.dst_node}</span>
        </div>

        {/* Protocol */}
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
          {flow.protocol}
        </span>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="text-white font-mono">{formatBytes(flow.bytes)}</div>
            <div className="text-xs text-gray-500">{flow.packets} pkts</div>
          </div>
          
          <div className="w-16">
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#88CED0]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-right">{percent.toFixed(1)}%</div>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={10} />
          {formatDuration(flow.duration_ms)}
        </div>
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

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.floor(seconds % 60)}s`;
};

export default FlowAnalysis;
