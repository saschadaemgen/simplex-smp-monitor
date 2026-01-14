/**
 * NodeFlags - Relay Flags Display from Consensus
 */
import React from 'react';
import { 
  Shield, Zap, Clock, Server, DoorOpen, 
  Eye, CheckCircle, Activity, Lock, Star
} from 'lucide-react';

interface NodeFlagsProps {
  flags: string[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

const flagConfig: Record<string, { icon: React.ElementType; color: string; description: string }> = {
  Authority: { icon: Server, color: 'text-purple-400', description: 'Directory Authority' },
  BadExit: { icon: DoorOpen, color: 'text-red-500', description: 'Known bad exit relay' },
  Exit: { icon: DoorOpen, color: 'text-orange-400', description: 'Allows exit traffic' },
  Fast: { icon: Zap, color: 'text-yellow-400', description: 'High bandwidth relay' },
  Guard: { icon: Shield, color: 'text-blue-400', description: 'Suitable as entry guard' },
  HSDir: { icon: Eye, color: 'text-pink-400', description: 'Hidden service directory' },
  Running: { icon: CheckCircle, color: 'text-green-400', description: 'Currently online' },
  Stable: { icon: Clock, color: 'text-cyan-400', description: 'Long uptime' },
  StaleDesc: { icon: Activity, color: 'text-gray-500', description: 'Outdated descriptor' },
  Valid: { icon: CheckCircle, color: 'text-green-500', description: 'Verified relay' },
  V2Dir: { icon: Server, color: 'text-gray-400', description: 'V2 directory' },
  NoEdConsensus: { icon: Lock, color: 'text-gray-500', description: 'No Ed25519 consensus' },
};

const sizeMap = {
  sm: { icon: 12, text: 'text-xs', padding: 'px-1.5 py-0.5' },
  md: { icon: 14, text: 'text-sm', padding: 'px-2 py-1' },
  lg: { icon: 16, text: 'text-base', padding: 'px-3 py-1.5' },
};

export const NodeFlags: React.FC<NodeFlagsProps> = ({ 
  flags, 
  size = 'md',
  showLabels = true 
}) => {
  const sizeConfig = sizeMap[size];

  if (!flags || flags.length === 0) {
    return (
      <span className="text-gray-500 text-sm italic">No flags</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map(flag => {
        const config = flagConfig[flag] || { 
          icon: Star, 
          color: 'text-gray-400', 
          description: flag 
        };
        const Icon = config.icon;

        return (
          <div
            key={flag}
            className={`inline-flex items-center gap-1 rounded-full bg-gray-700/50 ${sizeConfig.padding} ${config.color}`}
            title={config.description}
          >
            <Icon size={sizeConfig.icon} />
            {showLabels && <span className={sizeConfig.text}>{flag}</span>}
          </div>
        );
      })}
    </div>
  );
};

export const FlagLegend: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 bg-gray-800/30 rounded-lg">
    {Object.entries(flagConfig).map(([flag, config]) => {
      const Icon = config.icon;
      return (
        <div key={flag} className="flex items-center gap-2 text-sm">
          <Icon size={14} className={config.color} />
          <span className="text-gray-300">{flag}</span>
        </div>
      );
    })}
  </div>
);

export default NodeFlags;
