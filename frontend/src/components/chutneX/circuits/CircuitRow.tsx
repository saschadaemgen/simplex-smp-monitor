/**
 * CircuitRow - Table Row for Circuit List View
 * ============================================
 * Pure UI component for table display
 */
import React from 'react';
import { GitBranch, ChevronRight, Shield, Server, Globe, Users } from 'lucide-react';
import { CircuitData } from './CircuitCard';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';
const NEON_MEDIUM = 'rgba(136, 206, 208, 0.2)';

interface CircuitRowProps {
  circuit: CircuitData;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  BUILT: { label: 'Built', color: NEON, bgColor: NEON_DIM },
  LAUNCHED: { label: 'Launched', color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.1)' },
  EXTENDED: { label: 'Extended', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
  FAILED: { label: 'Failed', color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.1)' },
  CLOSED: { label: 'Closed', color: '#9ca3af', bgColor: 'rgba(156, 163, 175, 0.1)' },
};

const PURPOSE_CONFIG: Record<string, { shortLabel: string }> = {
  GENERAL: { shortLabel: 'General' },
  HS_CLIENT_INTRO: { shortLabel: 'HS Intro' },
  HS_CLIENT_REND: { shortLabel: 'HS Rend' },
  HS_SERVICE_INTRO: { shortLabel: 'Svc Intro' },
  HS_SERVICE_REND: { shortLabel: 'Svc Rend' },
  TESTING: { shortLabel: 'Test' },
  CONTROLLER: { shortLabel: 'Ctrl' },
  CONFLUX_LINKED: { shortLabel: 'Conflux' },
  HS_VANGUARDS: { shortLabel: 'Vanguard' },
};

// Inline mini path display
const MiniPath: React.FC<{ circuit: CircuitData }> = ({ circuit }) => {
  const path = circuit.path || [];
  if (path.length === 0) return <span className="text-gray-500 italic">No path</span>;

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      {circuit.source_node && (
        <>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: NEON_DIM }}>
            <Users size={10} style={{ color: NEON }} />
            <span className="text-gray-400">{circuit.source_node}</span>
          </div>
          <span className="text-gray-600">→</span>
        </>
      )}
      {path.map((hop, index) => (
        <React.Fragment key={index}>
          <div 
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
            style={{ backgroundColor: index === 0 ? NEON_MEDIUM : NEON_DIM }}
          >
            {index === 0 && <Shield size={10} style={{ color: NEON }} />}
            {index > 0 && index < path.length - 1 && <Server size={10} style={{ color: NEON }} />}
            {index === path.length - 1 && <Globe size={10} style={{ color: NEON }} />}
            <span className="text-gray-300 truncate max-w-[60px]">{hop.nickname || '???'}</span>
          </div>
          {index < path.length - 1 && <span className="text-gray-600">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

export const CircuitRow: React.FC<CircuitRowProps> = ({ circuit, onClick }) => {
  const statusConfig = STATUS_CONFIG[circuit.status] || STATUS_CONFIG.BUILT;
  const purposeConfig = PURPOSE_CONFIG[circuit.purpose] || { shortLabel: circuit.purpose };

  return (
    <tr 
      className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch size={14} style={{ color: NEON }} />
          <span className="text-white font-medium">#{circuit.circuit_id}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span 
          className="px-2 py-1 rounded text-xs font-medium" 
          style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
        >
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-300 text-sm">{purposeConfig.shortLabel}</span>
      </td>
      <td className="px-4 py-3">
        <span style={{ color: NEON }} className="text-sm font-medium">{circuit.path_length}</span>
      </td>
      <td className="px-4 py-3">
        <div className="max-w-md">
          <MiniPath circuit={circuit} />
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-400 text-sm">{circuit.source_node || 'N/A'}</span>
      </td>
      <td className="px-4 py-3">
        <ChevronRight size={14} className="text-gray-600" />
      </td>
    </tr>
  );
};

export default CircuitRow;
