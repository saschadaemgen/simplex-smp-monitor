/**
 * NodePortsDisplay - Port Information for a Node
 */
import React from 'react';
import { Radio, Globe, Server, Monitor } from 'lucide-react';

interface NodePortsDisplayProps {
  controlPort: number | null;
  socksPort: number | null;
  orPort: number | null;
  dirPort: number | null;
  layout?: 'horizontal' | 'vertical' | 'grid';
}

export const NodePortsDisplay: React.FC<NodePortsDisplayProps> = ({
  controlPort,
  socksPort,
  orPort,
  dirPort,
  layout = 'grid',
}) => {
  const ports = [
    { label: 'Control', value: controlPort, icon: Radio, color: 'text-purple-400' },
    { label: 'SOCKS', value: socksPort, icon: Monitor, color: 'text-green-400' },
    { label: 'OR', value: orPort, icon: Globe, color: 'text-blue-400' },
    { label: 'Dir', value: dirPort, icon: Server, color: 'text-orange-400' },
  ].filter(p => p.value !== null);

  if (ports.length === 0) {
    return <span className="text-gray-500 text-sm">No ports configured</span>;
  }

  const layoutClasses = {
    horizontal: 'flex items-center gap-4',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-2 gap-2',
  };

  return (
    <div className={layoutClasses[layout]}>
      {ports.map(port => (
        <div
          key={port.label}
          className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2"
        >
          <div className={`flex items-center gap-1.5 ${port.color}`}>
            <port.icon size={12} />
            <span className="text-xs">{port.label}</span>
          </div>
          <span className="font-mono text-white text-sm">{port.value}</span>
        </div>
      ))}
    </div>
  );
};

export default NodePortsDisplay;
