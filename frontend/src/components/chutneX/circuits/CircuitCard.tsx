/**
 * CircuitCard - Individual Circuit Display
 */
import React from 'react';
import { Circuit } from '../types';
import { CircuitPathViz } from './CircuitPathViz';
import { 
  GitBranch, CheckCircle, XCircle, Clock, 
  AlertTriangle, Zap, Flag
} from 'lucide-react';

interface CircuitCardProps {
  circuit: Circuit;
  variant?: 'card' | 'row' | 'compact';
  onClick?: () => void;
  showPath?: boolean;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  BUILT: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  LAUNCHED: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  EXTENDED: { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  FAILED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  CLOSED: { icon: AlertTriangle, color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

const purposeColors: Record<string, string> = {
  GENERAL: 'text-blue-400',
  TESTING: 'text-yellow-400',
  CONTROLLER: 'text-purple-400',
  HS_CLIENT_INTRO: 'text-pink-400',
  HS_CLIENT_REND: 'text-pink-400',
  HS_SERVICE_INTRO: 'text-orange-400',
  HS_SERVICE_REND: 'text-orange-400',
  HS_VANGUARDS: 'text-red-400',
  CONFLUX_LINKED: 'text-cyan-400',
};

export const CircuitCard: React.FC<CircuitCardProps> = ({
  circuit,
  variant = 'card',
  onClick,
  showPath = true,
}) => {
  const statusKey = circuit.status.replace('CircStatus.', '');
  const config = statusConfig[statusKey] || statusConfig.LAUNCHED;
  const StatusIcon = config.icon;
  const purposeColor = purposeColors[circuit.purpose] || 'text-gray-400';

  if (variant === 'row') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-[#88CED0]/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center gap-4">
          {/* Circuit ID */}
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-[#88CED0]" />
            <span className="font-mono text-white">#{circuit.circuit_id}</span>
          </div>

          {/* Status Badge */}
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}>
            <StatusIcon size={10} />
            {statusKey}
          </span>

          {/* Purpose Badge */}
          <span className={`text-xs ${purposeColor}`}>
            {circuit.purpose}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Path Preview */}
          <div className="hidden md:flex items-center gap-1 text-xs text-gray-400">
            {circuit.path.slice(0, 3).map((hop, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>→</span>}
                <span className="text-gray-300">{hop.nickname}</span>
              </React.Fragment>
            ))}
            {circuit.path.length > 3 && <span>...</span>}
          </div>

          {/* Path Length */}
          <span className="text-sm text-gray-400">
            {circuit.path_length} hops
          </span>

          {/* Source Node */}
          <span className="text-xs text-gray-500">
            via {circuit.source_node}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2 p-2 bg-gray-800/30 rounded hover:bg-gray-800/50 ${onClick ? 'cursor-pointer' : ''}`}
      >
        <StatusIcon size={12} className={config.color} />
        <span className="font-mono text-sm text-white">#{circuit.circuit_id}</span>
        <span className={`text-xs ${purposeColor}`}>{circuit.purpose}</span>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      onClick={onClick}
      className={`bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-[#88CED0]/50 transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-700 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-[#88CED0]" />
            <span className="font-mono text-lg text-white">#{circuit.circuit_id}</span>
          </div>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
            <StatusIcon size={12} />
            {statusKey}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Purpose */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400 flex items-center gap-1">
            <Flag size={12} /> Purpose
          </span>
          <span className={`text-sm font-medium ${purposeColor}`}>
            {circuit.purpose}
          </span>
        </div>

        {/* Path Visualization */}
        {showPath && (
          <div className="pt-2 border-t border-gray-700">
            <CircuitPathViz path={circuit.path} size="sm" />
          </div>
        )}

        {/* Build Flags */}
        {circuit.build_flags && circuit.build_flags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-700">
            {circuit.build_flags.map(flag => (
              <span
                key={flag}
                className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded"
              >
                {flag}
              </span>
            ))}
          </div>
        )}

        {/* Source */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
          Source: {circuit.source_node}
        </div>
      </div>
    </div>
  );
};

export default CircuitCard;
