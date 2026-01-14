/**
 * NetworkConfig - Network Configuration Display
 */
import React from 'react';
import { Settings, Video, Server, Shield, Shuffle, DoorOpen, Monitor, Globe } from 'lucide-react';

interface NetworkConfigProps {
  template: string;
  captureEnabled?: boolean;
  nodesTotal: number;
  nodeBreakdown?: {
    da: number;
    guard: number;
    middle: number;
    exit: number;
    client: number;
    hs: number;
  };
}

export const NetworkConfig: React.FC<NetworkConfigProps> = ({
  template,
  captureEnabled = false,
  nodesTotal,
  nodeBreakdown,
}) => {
  // Default breakdown if not provided
  const breakdown = nodeBreakdown || {
    da: 3,
    guard: 2,
    middle: 2,
    exit: 2,
    client: 2,
    hs: 0,
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Settings className="text-[#88CED0]" size={20} />
          <h3 className="font-medium text-white">Configuration</h3>
        </div>
        <span className="text-xs bg-[#88CED0]/20 text-[#88CED0] px-2 py-1 rounded-full">
          {template}
        </span>
      </div>

      <div className="space-y-4">
        {/* Capture Status */}
        <div className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400">
            <Video size={16} className={captureEnabled ? 'text-green-400' : 'text-gray-500'} />
            <span className="text-sm">Traffic Capture</span>
          </div>
          <span className={`text-sm font-medium ${captureEnabled ? 'text-green-400' : 'text-gray-500'}`}>
            {captureEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Node Breakdown */}
        <div>
          <div className="text-xs text-gray-500 mb-2">Node Breakdown ({nodesTotal} total)</div>
          <div className="grid grid-cols-2 gap-2">
            <NodeTypeCount icon={<Server size={14} />} label="DA" count={breakdown.da} color="text-purple-400" />
            <NodeTypeCount icon={<Shield size={14} />} label="Guard" count={breakdown.guard} color="text-blue-400" />
            <NodeTypeCount icon={<Shuffle size={14} />} label="Middle" count={breakdown.middle} color="text-cyan-400" />
            <NodeTypeCount icon={<DoorOpen size={14} />} label="Exit" count={breakdown.exit} color="text-orange-400" />
            <NodeTypeCount icon={<Monitor size={14} />} label="Client" count={breakdown.client} color="text-green-400" />
            <NodeTypeCount icon={<Globe size={14} />} label="HS" count={breakdown.hs} color="text-pink-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface NodeTypeCountProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}

const NodeTypeCount: React.FC<NodeTypeCountProps> = ({ icon, label, count, color }) => (
  <div className="flex items-center justify-between p-2 bg-gray-900/30 rounded">
    <div className={`flex items-center gap-1.5 ${color}`}>
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <span className="font-mono text-sm text-white">{count}</span>
  </div>
);

export default NetworkConfig;
