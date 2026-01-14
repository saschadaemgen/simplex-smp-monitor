/**
 * CircuitPathViz - Circuit Path Visualization
 */
import React from 'react';
import { CircuitHop } from '../types';
import { 
  Shield, Server, Shuffle, DoorOpen, 
  ArrowRight, Fingerprint, Globe
} from 'lucide-react';

interface CircuitPathVizProps {
  path: CircuitHop[];
  size?: 'sm' | 'md' | 'lg';
  showFingerprints?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

// Detect node type from nickname
const detectNodeType = (nickname: string): { icon: React.ElementType; color: string } => {
  const lower = nickname.toLowerCase();
  if (lower.includes('da') || lower.includes('authority')) {
    return { icon: Server, color: 'text-purple-400' };
  }
  if (lower.includes('guard')) {
    return { icon: Shield, color: 'text-blue-400' };
  }
  if (lower.includes('middle')) {
    return { icon: Shuffle, color: 'text-cyan-400' };
  }
  if (lower.includes('exit')) {
    return { icon: DoorOpen, color: 'text-orange-400' };
  }
  if (lower.includes('client')) {
    return { icon: Globe, color: 'text-green-400' };
  }
  return { icon: Server, color: 'text-gray-400' };
};

const sizeConfig = {
  sm: { icon: 14, text: 'text-xs', gap: 'gap-1', padding: 'p-1.5' },
  md: { icon: 18, text: 'text-sm', gap: 'gap-2', padding: 'p-2' },
  lg: { icon: 24, text: 'text-base', gap: 'gap-3', padding: 'p-3' },
};

export const CircuitPathViz: React.FC<CircuitPathVizProps> = ({
  path,
  size = 'md',
  showFingerprints = false,
  orientation = 'horizontal',
}) => {
  const config = sizeConfig[size];

  if (path.length === 0) {
    return <span className="text-gray-500 text-sm">No path data</span>;
  }

  if (orientation === 'vertical') {
    return (
      <div className="space-y-2">
        {path.map((hop, index) => {
          const { icon: Icon, color } = detectNodeType(hop.nickname);
          return (
            <div key={index} className="flex items-start gap-3">
              {/* Line Connector */}
              <div className="flex flex-col items-center">
                <div className={`rounded-full ${config.padding} bg-gray-700`}>
                  <Icon size={config.icon} className={color} />
                </div>
                {index < path.length - 1 && (
                  <div className="w-0.5 h-6 bg-gray-600" />
                )}
              </div>

              {/* Hop Info */}
              <div className="flex-1 pt-1">
                <div className={`font-medium text-white ${config.text}`}>
                  {hop.nickname}
                </div>
                {showFingerprints && hop.fingerprint && (
                  <div className="flex items-center gap-1 mt-1">
                    <Fingerprint size={10} className="text-gray-500" />
                    <span className="font-mono text-xs text-gray-500">
                      {hop.fingerprint.slice(0, 16)}...
                    </span>
                  </div>
                )}
              </div>

              {/* Hop Number */}
              <span className="text-xs text-gray-500">#{index + 1}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className={`flex items-center ${config.gap} flex-wrap`}>
      {path.map((hop, index) => {
        const { icon: Icon, color } = detectNodeType(hop.nickname);
        return (
          <React.Fragment key={index}>
            {/* Hop */}
            <div 
              className={`flex items-center ${config.gap} bg-gray-700/50 rounded-lg ${config.padding}`}
              title={hop.fingerprint ? `Fingerprint: ${hop.fingerprint}` : undefined}
            >
              <Icon size={config.icon} className={color} />
              <span className={`${config.text} text-white`}>{hop.nickname}</span>
            </div>

            {/* Arrow */}
            {index < path.length - 1 && (
              <ArrowRight size={config.icon} className="text-gray-500 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const CircuitPathDetailed: React.FC<{ path: CircuitHop[] }> = ({ path }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
    <h4 className="font-medium text-white mb-4 flex items-center gap-2">
      <GitBranch size={16} className="text-[#88CED0]" />
      Circuit Path ({path.length} hops)
    </h4>
    <CircuitPathViz path={path} size="lg" showFingerprints orientation="vertical" />
  </div>
);

export default CircuitPathViz;
