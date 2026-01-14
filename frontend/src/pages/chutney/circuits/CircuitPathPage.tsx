import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Shield, 
  Server, 
  Globe, 
  Activity,
  Zap,
  RefreshCw,
  Radio,
  Lock
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface CircuitNode {
  id: string;
  nickname: string;
  fingerprint: string;
  type: 'guard' | 'middle' | 'exit' | 'rendezvous';
  ip: string;
  bandwidth: number;
  flags: string[];
}

interface Circuit {
  id: string;
  status: string;
  purpose: string;
  path: CircuitNode[];
  created_at: string;
  bytes_read: number;
  bytes_written: number;
}

// ============================================================================
// ANIMATED DATA PACKET COMPONENT
// ============================================================================

const DataPacket: React.FC<{ delay: number; duration: number; pathId: string }> = ({ 
  delay, 
  duration, 
  pathId 
}) => (
  <circle r="4" fill="#88CED0" className="data-packet">
    <animateMotion
      dur={`${duration}s`}
      repeatCount="indefinite"
      begin={`${delay}s`}
    >
      <mpath href={`#${pathId}`} />
    </animateMotion>
    <animate
      attributeName="opacity"
      values="0;1;1;0"
      dur={`${duration}s`}
      repeatCount="indefinite"
      begin={`${delay}s`}
    />
    <animate
      attributeName="r"
      values="3;5;3"
      dur={`${duration}s`}
      repeatCount="indefinite"
      begin={`${delay}s`}
    />
  </circle>
);

// ============================================================================
// NODE VISUALIZATION COMPONENT
// ============================================================================

interface NodeVizProps {
  node: CircuitNode;
  x: number;
  y: number;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  index: number;
}

const NodeViz: React.FC<NodeVizProps> = ({ node, x, y, isHovered, onHover, index }) => {
  const getNodeIcon = () => {
    switch (node.type) {
      case 'guard': return '🛡️';
      case 'middle': return '🔀';
      case 'exit': return '🚪';
      case 'rendezvous': return '🎯';
      default: return '⚡';
    }
  };

  const getNodeColor = () => {
    switch (node.type) {
      case 'guard': return '#4ADE80';
      case 'middle': return '#FBBF24';
      case 'exit': return '#F87171';
      case 'rendezvous': return '#A78BFA';
      default: return '#88CED0';
    }
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <defs>
        <filter id={`glow-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <radialGradient id={`grad-${node.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={getNodeColor()} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={getNodeColor()} stopOpacity="0"/>
        </radialGradient>
      </defs>

      <circle r="60" fill={`url(#grad-${node.id})`}>
        <animate attributeName="r" values="40;60;40" dur="3s" repeatCount="indefinite" begin={`${index * 0.5}s`} />
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" begin={`${index * 0.5}s`} />
      </circle>

      <circle
        r={isHovered ? 45 : 40}
        fill="#1a1a2e"
        stroke={getNodeColor()}
        strokeWidth={isHovered ? 4 : 2}
        filter={isHovered ? `url(#glow-${node.id})` : undefined}
        style={{ transition: 'all 0.3s ease' }}
      />

      <circle r="30" fill="none" stroke={getNodeColor()} strokeWidth="1" strokeDasharray="4 4" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite" />
      </circle>

      <text textAnchor="middle" dominantBaseline="central" fontSize="24" style={{ pointerEvents: 'none' }}>
        {getNodeIcon()}
      </text>

      <text y="65" textAnchor="middle" fill="#88CED0" fontSize="14" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
        {node.nickname}
      </text>

      <text y="82" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="'JetBrains Mono', monospace">
        {node.type.toUpperCase()}
      </text>

      {isHovered && (
        <g transform="translate(0, -70)">
          <rect x="-90" y="-40" width="180" height="75" rx="8" fill="#0d1117" stroke="#88CED0" strokeWidth="1" opacity="0.95" />
          <text x="0" y="-20" textAnchor="middle" fill="#88CED0" fontSize="10" fontFamily="'JetBrains Mono', monospace">{node.ip}</text>
          <text x="0" y="-5" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="'JetBrains Mono', monospace">{node.fingerprint.substring(0, 20)}...</text>
          <text x="0" y="12" textAnchor="middle" fill="#4ADE80" fontSize="10" fontFamily="'JetBrains Mono', monospace">⚡ {(node.bandwidth / 1024 / 1024).toFixed(1)} MB/s</text>
          <text x="0" y="27" textAnchor="middle" fill="#FBBF24" fontSize="9" fontFamily="'JetBrains Mono', monospace">{node.flags.slice(0, 3).join(' • ')}</text>
        </g>
      )}
    </g>
  );
};

// ============================================================================
// DEMO DATA
// ============================================================================

const getDemoCircuits = (): Circuit[] => [{
  id: '1',
  status: 'BUILT',
  purpose: 'HS_CLIENT_REND',
  created_at: new Date().toISOString(),
  bytes_read: 4523890,
  bytes_written: 1234567,
  path: [
    { id: 'g1', nickname: 'GuardBerlin', fingerprint: 'ABC123DEF456789', type: 'guard', ip: '10.99.1.20', bandwidth: 45000000, flags: ['Fast', 'Stable', 'Guard'] },
    { id: 'm1', nickname: 'RelayFrankfurt', fingerprint: 'DEF456GHI789012', type: 'middle', ip: '10.99.1.22', bandwidth: 32000000, flags: ['Fast', 'Stable', 'Valid'] },
    { id: 'e1', nickname: 'ExitMunich', fingerprint: 'GHI789JKL012345', type: 'exit', ip: '10.99.1.24', bandwidth: 28000000, flags: ['Fast', 'Exit', 'Valid'] },
  ]
}, {
  id: '2',
  status: 'BUILT',
  purpose: 'GENERAL',
  created_at: new Date(Date.now() - 60000).toISOString(),
  bytes_read: 892345,
  bytes_written: 456123,
  path: [
    { id: 'g2', nickname: 'GuardHamburg', fingerprint: 'XYZ789ABC123456', type: 'guard', ip: '10.99.1.21', bandwidth: 51000000, flags: ['Fast', 'Stable', 'Guard'] },
    { id: 'm2', nickname: 'RelayCologne', fingerprint: 'MNO345PQR678901', type: 'middle', ip: '10.99.1.23', bandwidth: 29000000, flags: ['Fast', 'Valid'] },
    { id: 'e2', nickname: 'ExitDresden', fingerprint: 'STU901VWX234567', type: 'exit', ip: '10.99.1.25', bandwidth: 35000000, flags: ['Fast', 'Exit'] },
  ]
}];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CircuitPathPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  useEffect(() => {
    setCircuits(getDemoCircuits());
    setSelectedCircuit(getDemoCircuits()[0]);
    setLoading(false);
  }, []);

  const getAnimationDuration = () => {
    switch (animationSpeed) {
      case 'slow': return 4;
      case 'fast': return 1.5;
      default: return 2.5;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const nodePositions = useMemo(() => {
    if (!selectedCircuit) return [];
    const width = 900;
    const nodeCount = selectedCircuit.path.length;
    const spacing = width / (nodeCount + 1);
    return selectedCircuit.path.map((node, idx) => ({
      ...node,
      x: spacing * (idx + 1),
      y: 200
    }));
  }, [selectedCircuit]);

  if (loading) {
    return (
      <div className="h-full bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-[#88CED0]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-[#88CED0] rounded-full animate-spin"></div>
            <Activity className="absolute inset-0 m-auto w-10 h-10 text-[#88CED0]" />
          </div>
          <p className="text-[#88CED0] font-mono">{t('analytics.circuits.loadingPath', 'Loading circuit path...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0a0a0f] text-white overflow-auto">
      <div className="fixed inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: `linear-gradient(#88CED0 1px, transparent 1px), linear-gradient(90deg, #88CED0 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative z-10 border-b border-[#88CED0]/20 bg-[#0a0a0f]/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/tor-networks/${id}/analytics/circuits`} className="p-2 rounded-lg bg-[#88CED0]/10 hover:bg-[#88CED0]/20 transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#88CED0]" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#88CED0] to-[#4ADE80] bg-clip-text text-transparent">
                {t('analytics.circuits.pathVisualization', 'Circuit Path Visualization')}
              </h1>
              <p className="text-sm text-gray-500 font-mono">{t('analytics.circuits.pathSubtitle', 'Real-time onion routing visualization')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#1a1a2e] rounded-lg p-1">
              <span className="text-xs text-gray-500 px-2">Speed:</span>
              {(['slow', 'normal', 'fast'] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setAnimationSpeed(speed)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                    animationSpeed === speed ? 'bg-[#88CED0] text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {speed.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                autoRefresh ? 'bg-[#4ADE80]/20 text-[#4ADE80]' : 'bg-gray-800 text-gray-400'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <span className="text-sm font-mono">{autoRefresh ? 'LIVE' : 'PAUSED'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-6">
        <div className="mb-8 flex gap-4 overflow-x-auto pb-2">
          {circuits.map((circuit) => (
            <button
              key={circuit.id}
              onClick={() => setSelectedCircuit(circuit)}
              className={`flex-shrink-0 px-6 py-3 rounded-xl border-2 transition-all ${
                selectedCircuit?.id === circuit.id
                  ? 'border-[#88CED0] bg-[#88CED0]/10'
                  : 'border-gray-700 bg-[#1a1a2e] hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${circuit.status === 'BUILT' ? 'bg-[#4ADE80]' : 'bg-yellow-500'} animate-pulse`} />
                <span className="font-mono text-sm">Circuit #{circuit.id}</span>
                <span className="text-xs text-gray-500">{circuit.purpose}</span>
              </div>
            </button>
          ))}
        </div>

        {selectedCircuit && (
          <>
            <div className="bg-[#0d1117] rounded-2xl border border-[#88CED0]/20 p-6 mb-8 overflow-hidden">
              <svg width="100%" height="400" viewBox="0 0 900 400" className="overflow-visible">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ADE80" />
                    <stop offset="50%" stopColor="#88CED0" />
                    <stop offset="100%" stopColor="#F87171" />
                  </linearGradient>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#88CED0" />
                  </marker>
                </defs>

                {nodePositions.slice(0, -1).map((node, idx) => {
                  const nextNode = nodePositions[idx + 1];
                  const pathId = `path-${idx}`;
                  return (
                    <g key={pathId}>
                      <path
                        d={`M ${node.x + 45} ${node.y} Q ${(node.x + nextNode.x) / 2} ${node.y - 50} ${nextNode.x - 45} ${nextNode.y}`}
                        stroke="#88CED0" strokeWidth="8" fill="none" opacity="0.1" filter="url(#glow)"
                      />
                      <path
                        id={pathId}
                        d={`M ${node.x + 45} ${node.y} Q ${(node.x + nextNode.x) / 2} ${node.y - 50} ${nextNode.x - 45} ${nextNode.y}`}
                        stroke="url(#lineGradient)" strokeWidth="3" fill="none" strokeDasharray="10 5" opacity="0.6"
                      >
                        <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1s" repeatCount="indefinite" />
                      </path>
                      {[0, 0.3, 0.6].map((delay, i) => (
                        <DataPacket key={`packet-${pathId}-${i}`} delay={delay * getAnimationDuration()} duration={getAnimationDuration()} pathId={pathId} />
                      ))}
                      <g transform={`translate(${(node.x + nextNode.x) / 2 - 15}, ${node.y - 80})`}>
                        <rect width="30" height="20" rx="4" fill="#1a1a2e" stroke="#88CED0" strokeWidth="1" />
                        <text x="15" y="14" textAnchor="middle" fill="#88CED0" fontSize="10" fontFamily="'JetBrains Mono', monospace">
                          🔐 {nodePositions.length - 1 - idx}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {nodePositions.map((node, idx) => (
                  <NodeViz key={node.id} node={node} x={node.x} y={node.y} isHovered={hoveredNode === node.id} onHover={setHoveredNode} index={idx} />
                ))}

                <g transform="translate(50, 200)">
                  <circle r="25" fill="#1a1a2e" stroke="#4ADE80" strokeWidth="2" />
                  <text textAnchor="middle" dominantBaseline="central" fill="#4ADE80" fontSize="20">👤</text>
                  <text y="45" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="'JetBrains Mono', monospace">CLIENT</text>
                </g>

                <g transform="translate(850, 200)">
                  <circle r="25" fill="#1a1a2e" stroke="#A78BFA" strokeWidth="2" />
                  <text textAnchor="middle" dominantBaseline="central" fill="#A78BFA" fontSize="20">🧅</text>
                  <text y="45" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="'JetBrains Mono', monospace">.ONION</text>
                </g>

                <g transform="translate(350, 350)">
                  <text fill="#6b7280" fontSize="12" fontFamily="'JetBrains Mono', monospace">
                    {t('analytics.circuits.encryptionLayers', 'Encryption Layers')}:
                  </text>
                  {[0, 1, 2].map((i) => (
                    <g key={i} transform={`translate(${170 + i * 30}, -8)`}>
                      <rect width="24" height="24" rx="4" fill={`rgba(136, 206, 208, ${0.3 + i * 0.2})`} stroke="#88CED0" />
                      <Lock size={14} x={5} y={5} stroke="#88CED0" />
                    </g>
                  ))}
                </g>
              </svg>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#0d1117] rounded-xl border border-[#88CED0]/20 p-6">
                <h3 className="text-lg font-bold text-[#88CED0] mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {t('analytics.circuits.circuitInfo', 'Circuit Info')}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-500">ID</span>
                    <span className="font-mono text-[#88CED0]">#{selectedCircuit.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-500">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-mono ${
                      selectedCircuit.status === 'BUILT' ? 'bg-[#4ADE80]/20 text-[#4ADE80]' : 'bg-yellow-500/20 text-yellow-500'
                    }`}>{selectedCircuit.status}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-500">Purpose</span>
                    <span className="font-mono text-sm">{selectedCircuit.purpose}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-500">Path Length</span>
                    <span className="font-mono">{selectedCircuit.path.length} hops</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Created</span>
                    <span className="font-mono text-sm">{new Date(selectedCircuit.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0d1117] rounded-xl border border-[#88CED0]/20 p-6">
                <h3 className="text-lg font-bold text-[#88CED0] mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {t('analytics.circuits.trafficStats', 'Traffic Stats')}
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500">⬇️ Downloaded</span>
                      <span className="font-mono text-[#4ADE80]">{formatBytes(selectedCircuit.bytes_read)}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#4ADE80] to-[#88CED0] rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, selectedCircuit.bytes_read / 100000)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500">⬆️ Uploaded</span>
                      <span className="font-mono text-[#F87171]">{formatBytes(selectedCircuit.bytes_written)}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#F87171] to-[#FBBF24] rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, selectedCircuit.bytes_written / 50000)}%` }} />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total</span>
                      <span className="font-mono text-white">{formatBytes(selectedCircuit.bytes_read + selectedCircuit.bytes_written)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0d1117] rounded-xl border border-[#88CED0]/20 p-6">
                <h3 className="text-lg font-bold text-[#88CED0] mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  {t('analytics.circuits.pathNodes', 'Path Nodes')}
                </h3>
                <div className="space-y-3">
                  {selectedCircuit.path.map((node, idx) => (
                    <div
                      key={node.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        hoveredNode === node.id ? 'border-[#88CED0] bg-[#88CED0]/10' : 'border-gray-800 hover:border-gray-600'
                      }`}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                          node.type === 'guard' ? 'bg-[#4ADE80]/20' : node.type === 'exit' ? 'bg-[#F87171]/20' : 'bg-[#FBBF24]/20'
                        }`}>
                          {node.type === 'guard' ? '🛡️' : node.type === 'exit' ? '🚪' : '🔀'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm truncate">{node.nickname}</div>
                          <div className="text-xs text-gray-500">{node.ip}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#88CED0] font-mono">{(node.bandwidth / 1024 / 1024).toFixed(1)} MB/s</div>
                          <div className="text-xs text-gray-600">Hop {idx + 1}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-[#0d1117] to-[#1a1a2e] rounded-xl border border-[#88CED0]/20 p-6">
              <h3 className="text-lg font-bold text-[#88CED0] mb-4">
                🧅 {t('analytics.circuits.howItWorks', 'How Onion Routing Works')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#4ADE80]/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-[#4ADE80]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#4ADE80]">{t('analytics.circuits.guardNode', 'Guard Node')}</h4>
                    <p className="text-gray-500">{t('analytics.circuits.guardDesc', 'Entry point. Knows your IP but not your destination.')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FBBF24]/20 flex items-center justify-center flex-shrink-0">
                    <Radio className="w-5 h-5 text-[#FBBF24]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#FBBF24]">{t('analytics.circuits.middleNode', 'Middle Node')}</h4>
                    <p className="text-gray-500">{t('analytics.circuits.middleDesc', 'Relay point. Only knows previous and next hop.')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F87171]/20 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-[#F87171]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#F87171]">{t('analytics.circuits.exitNode', 'Exit Node')}</h4>
                    <p className="text-gray-500">{t('analytics.circuits.exitDesc', 'Exit point. Sees destination but not your IP.')}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CircuitPathPage;
