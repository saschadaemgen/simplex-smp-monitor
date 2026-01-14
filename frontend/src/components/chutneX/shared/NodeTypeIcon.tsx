/**
 * NodeTypeIcon - Visual Icon for Node Types
 */
import React from 'react';
import { NodeType } from '../types';
import { Shield, Server, Shuffle, DoorOpen, Monitor, Globe } from 'lucide-react';

interface NodeTypeIconProps {
  type: NodeType;
  size?: number;
  className?: string;
}

const iconMap: Record<NodeType, { icon: React.ElementType; color: string; label: string }> = {
  da: { icon: Server, color: 'text-purple-400', label: 'Directory Authority' },
  guard: { icon: Shield, color: 'text-blue-400', label: 'Guard Relay' },
  middle: { icon: Shuffle, color: 'text-cyan-400', label: 'Middle Relay' },
  exit: { icon: DoorOpen, color: 'text-orange-400', label: 'Exit Relay' },
  client: { icon: Monitor, color: 'text-green-400', label: 'Client' },
  hs: { icon: Globe, color: 'text-pink-400', label: 'Hidden Service' },
};

export const NodeTypeIcon: React.FC<NodeTypeIconProps> = ({ type, size = 20, className = '' }) => {
  const config = iconMap[type] || iconMap.client;
  const Icon = config.icon;
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} title={config.label}>
      <Icon size={size} className={config.color} />
    </div>
  );
};

export const NodeTypeBadge: React.FC<NodeTypeIconProps & { showLabel?: boolean }> = ({ 
  type, 
  size = 16, 
  className = '',
  showLabel = true 
}) => {
  const config = iconMap[type] || iconMap.client;
  const Icon = config.icon;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-800/50 ${className}`}>
      <Icon size={size} className={config.color} />
      {showLabel && <span className={`text-sm ${config.color}`}>{config.label}</span>}
    </div>
  );
};

export default NodeTypeIcon;
