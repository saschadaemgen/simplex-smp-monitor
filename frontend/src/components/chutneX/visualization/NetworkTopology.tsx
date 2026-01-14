/**
 * NetworkTopology - Interactive Network Graph Visualization
 */
import React, { useMemo } from 'react';
import { TopologyNode, TopologyEdge, NodeType, Circuit } from '../types';
import { 
  Server, Shield, Shuffle, DoorOpen, Monitor, Globe,
  ZoomIn, ZoomOut, Maximize2, Download
} from 'lucide-react';

interface NetworkTopologyProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  circuits?: Circuit[];
  onNodeClick?: (node: TopologyNode) => void;
  highlightCircuit?: string;
}

const nodeTypeConfig: Record<NodeType, { color: string; bgColor: string }> = {
  da: { color: '#A855F7', bgColor: 'rgba(168, 85, 247, 0.2)' },
  guard: { color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.2)' },
  middle: { color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.2)' },
  exit: { color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.2)' },
  client: { color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.2)' },
  hs: { color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.2)' },
};

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  nodes,
  edges,
  circuits = [],
  onNodeClick,
  highlightCircuit,
}) => {
  // Calculate positions in a circular layout by type
  const positionedNodes = useMemo(() => {
    const typeGroups: Record<string, TopologyNode[]> = {};
    nodes.forEach(node => {
      const type = node.type || 'client';
      if (!typeGroups[type]) typeGroups[type] = [];
      typeGroups[type].push(node);
    });

    const centerX = 400;
    const centerY = 300;
    const typeOrder: NodeType[] = ['da', 'guard', 'middle', 'exit', 'client', 'hs'];
    const radiusStep = 80;

    const positioned: (TopologyNode & { x: number; y: number })[] = [];

    typeOrder.forEach((type, ringIndex) => {
      const group = typeGroups[type] || [];
      const radius = 100 + ringIndex * radiusStep;
      
      group.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / Math.max(group.length, 1) - Math.PI / 2;
        positioned.push({
          ...node,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      });
    });

    return positioned;
  }, [nodes]);

  // Build edge paths
  const edgePaths = useMemo(() => {
    return edges.map(edge => {
      const from = positionedNodes.find(n => n.id === edge.from);
      const to = positionedNodes.find(n => n.id === edge.to);
      if (!from || !to) return null;
      return { ...edge, x1: from.x, y1: from.y, x2: to.x, y2: to.y };
    }).filter(Boolean);
  }, [edges, positionedNodes]);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/30">
        <h4 className="font-medium text-white">Network Topology</h4>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
            <ZoomIn size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
            <ZoomOut size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
            <Maximize2 size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg viewBox="0 0 800 600" className="w-full h-96 bg-gray-900/50">
        {/* Edges */}
        <g className="edges">
          {edgePaths.map((edge, i) => edge && (
            <line
              key={i}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke={edge.type === 'circuit' ? '#88CED0' : '#374151'}
              strokeWidth={edge.type === 'circuit' ? 2 : 1}
              strokeOpacity={edge.type === 'circuit' ? 0.8 : 0.3}
              strokeDasharray={edge.type === 'directory' ? '4,4' : undefined}
            />
          ))}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {positionedNodes.map(node => {
            const config = nodeTypeConfig[node.type] || nodeTypeConfig.client;
            const isRunning = node.status === 'running';
            
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onNodeClick?.(node)}
                className="cursor-pointer"
              >
                {/* Glow effect for running nodes */}
                {isRunning && (
                  <circle
                    r={28}
                    fill={config.bgColor}
                    className="animate-pulse"
                  />
                )}
                
                {/* Node circle */}
                <circle
                  r={20}
                  fill="#1F2937"
                  stroke={config.color}
                  strokeWidth={2}
                />
                
                {/* Status indicator */}
                <circle
                  r={5}
                  cx={14}
                  cy={-14}
                  fill={isRunning ? '#22C55E' : '#EF4444'}
                />
                
                {/* Label */}
                <text
                  y={35}
                  textAnchor="middle"
                  fill="#9CA3AF"
                  fontSize={10}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 p-3 border-t border-gray-700 bg-gray-800/30">
        {Object.entries(nodeTypeConfig).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: config.color }}
            />
            <span className="text-xs text-gray-400 uppercase">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkTopology;
