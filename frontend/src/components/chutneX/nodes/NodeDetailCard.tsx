/**
 * NodeDetailCard - Individual Node Display
 */
import React from 'react';
import { NodeStats, NodeType } from '../types';
import { 
  Server, Shield, Shuffle, DoorOpen, Monitor, Globe,
  ArrowDown, ArrowUp, Clock, Fingerprint, Cpu, CheckCircle
} from 'lucide-react';

interface NodeDetailCardProps {
  node: NodeStats;
  variant?: 'card' | 'row' | 'compact';
  onClick?: () => void;
  showDetails?: boolean;
}

const nodeTypeConfig: Record<NodeType, { icon: React.ElementType; color: string; bgColor: string }> = {
  da: { icon: Server, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  guard: { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  middle: { icon: Shuffle, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  exit: { icon: DoorOpen, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  client: { icon: Monitor, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  hs: { icon: Globe, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
};

export const NodeDetailCard: React.FC<NodeDetailCardProps> = ({ 
  node, 
  variant = 'card',
  onClick,
  showDetails = true
}) => {
  const config = nodeTypeConfig[node.node_type as NodeType] || nodeTypeConfig.client;
  const Icon = config.icon;
  const isBootstrapped = node.bootstrap_progress >= 100;
  const totalBandwidth = node.bytes_read + node.bytes_written;

  if (variant === 'row') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-[#88CED0]/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon size={18} className={config.color} />
          </div>
          <div>
            <div className="font-medium text-white">{node.node_name}</div>
            <div className="text-xs text-gray-500">{node.node_type.toUpperCase()}</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm">
              <ArrowDown size={12} className="text-green-400" />
              <span className="text-green-400 font-mono">{formatBytes(node.bytes_read)}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUp size={12} className="text-blue-400" />
              <span className="text-blue-400 font-mono">{formatBytes(node.bytes_written)}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">Uptime</div>
            <div className="font-mono text-[#88CED0]">{formatUptime(node.uptime)}</div>
          </div>

          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            isBootstrapped ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {isBootstrapped ? <CheckCircle size={12} /> : <Cpu size={12} className="animate-spin" />}
            {node.bootstrap_progress}%
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      >
        <Icon size={14} className={config.color} />
        <span className="text-sm text-white">{node.node_name}</span>
        <span className="text-xs text-gray-500 ml-auto">{formatBytes(totalBandwidth)}</span>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      onClick={onClick}
      className={`bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-[#88CED0]/50 transition-all hover:shadow-lg hover:shadow-[#88CED0]/5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Header */}
      <div className={`p-3 ${config.bgColor} border-b border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={20} className={config.color} />
            <div>
              <div className="font-medium text-white">{node.node_name}</div>
              <div className="text-xs text-gray-400">{node.node_type.toUpperCase()}</div>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            isBootstrapped ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400 animate-pulse'
          }`}>
            {isBootstrapped ? <CheckCircle size={12} /> : <Cpu size={12} />}
            {node.bootstrap_progress}%
          </div>
        </div>
      </div>

      {/* Body */}
      {showDetails && (
        <div className="p-3 space-y-3">
          {/* Bandwidth */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <ArrowDown size={10} /> Download
              </div>
              <div className="font-mono text-green-400 text-sm">{formatBytes(node.bytes_read)}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <ArrowUp size={10} /> Upload
              </div>
              <div className="font-mono text-blue-400 text-sm">{formatBytes(node.bytes_written)}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-400">
              <Clock size={12} />
              <span>Uptime</span>
            </div>
            <span className="font-mono text-[#88CED0]">{formatUptime(node.uptime)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-400">
              <Cpu size={12} />
              <span>Version</span>
            </div>
            <span className="font-mono text-gray-300 text-xs">{node.version}</span>
          </div>

          {/* Fingerprint */}
          {node.fingerprint && (
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Fingerprint size={10} /> Fingerprint
              </div>
              <div className="font-mono text-xs text-gray-400 break-all">
                {node.fingerprint.slice(0, 20)}...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Utilities
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

export default NodeDetailCard;
