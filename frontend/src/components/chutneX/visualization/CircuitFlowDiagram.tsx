/**
 * CircuitFlowDiagram - Animated Circuit Flow Visualization
 */
import React from 'react';
import { Circuit } from '../types';
import { Zap } from 'lucide-react';

interface CircuitFlowDiagramProps {
  circuit: Circuit;
  animated?: boolean;
  showDetails?: boolean;
}

export const CircuitFlowDiagram: React.FC<CircuitFlowDiagramProps> = ({
  circuit,
  animated = true,
  showDetails = true,
}) => {
  const isBuilt = circuit.status.includes('BUILT');

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Zap size={18} className="text-[#88CED0]" />
          Circuit #{circuit.circuit_id} Flow
        </h4>
        <span className={`text-sm ${isBuilt ? 'text-green-400' : 'text-yellow-400'}`}>
          {circuit.status.replace('CircStatus.', '')}
        </span>
      </div>

      {/* Flow Visualization */}
      <div className="relative py-8">
        {/* Connection Line */}
        <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-700 -translate-y-1/2 rounded-full overflow-hidden">
          {animated && isBuilt && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#88CED0] to-transparent animate-flow" />
          )}
        </div>

        {/* Nodes */}
        <div className="relative flex justify-between items-center px-4">
          {/* Client (Start) */}
          <div className="flex flex-col items-center z-10">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-2">
              <span className="text-green-400 text-xs font-bold">YOU</span>
            </div>
            <span className="text-xs text-gray-400">Client</span>
          </div>

          {/* Hops */}
          {circuit.path.map((hop, index) => (
            <div key={index} className="flex flex-col items-center z-10">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 ${
                index === 0 ? 'bg-blue-500/20 border-blue-500' :
                index === circuit.path.length - 1 ? 'bg-orange-500/20 border-orange-500' :
                'bg-cyan-500/20 border-cyan-500'
              }`}>
                <span className={`text-xs font-bold ${
                  index === 0 ? 'text-blue-400' :
                  index === circuit.path.length - 1 ? 'text-orange-400' :
                  'text-cyan-400'
                }`}>
                  {index + 1}
                </span>
              </div>
              <span className="text-xs text-white font-medium">{hop.nickname}</span>
              <span className="text-xs text-gray-500">
                {index === 0 ? 'Guard' : index === circuit.path.length - 1 ? 'Exit' : 'Middle'}
              </span>
            </div>
          ))}

          {/* Destination */}
          <div className="flex flex-col items-center z-10">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center mb-2">
              <span className="text-purple-400 text-xs font-bold">DST</span>
            </div>
            <span className="text-xs text-gray-400">Destination</span>
          </div>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Purpose</span>
            <div className="text-white">{circuit.purpose}</div>
          </div>
          <div>
            <span className="text-gray-500">Path Length</span>
            <div className="text-white">{circuit.path_length} hops</div>
          </div>
          <div>
            <span className="text-gray-500">Source</span>
            <div className="text-white">{circuit.source_node}</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-flow {
          animation: flow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CircuitFlowDiagram;
