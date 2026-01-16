/**
 * CircuitCard - Single Circuit Display Card
 * =========================================
 * Pure UI component - receives props, no API calls
 */
import React, { useState } from 'react';
import { GitBranch, Copy, ChevronDown, ChevronUp, Shield, Server, Globe, Users } from 'lucide-react';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';
const NEON_MEDIUM = 'rgba(136, 206, 208, 0.2)';

// Types
export interface CircuitHop {
  fingerprint: string;
  nickname: string;
}

export interface CircuitData {
  circuit_id: string;
  status: string;
  purpose: string;
  path: CircuitHop[];
  path_length: number;
  build_flags?: string[];
  source_node?: string;
  source_node_id?: string;
  build_time_ms?: number;
}

interface CircuitCardProps {
  circuit: CircuitData;
  onClick?: () => void;
  showDetails?: boolean;
}

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  BUILT: { label: 'Built', color: NEON, bgColor: NEON_DIM },
  LAUNCHED: { label: 'Launched', color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.1)' },
  EXTENDED: { label: 'Extended', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.1)' },
  FAILED: { label: 'Failed', color: '#f87171', bgColor: 'rgba(248, 113, 113, 0.1)' },
  CLOSED: { label: 'Closed', color: '#9ca3af', bgColor: 'rgba(156, 163, 175, 0.1)' },
};

// Purpose configuration
const PURPOSE_CONFIG: Record<string, { label: string; shortLabel: string }> = {
  GENERAL: { label: 'General Purpose', shortLabel: 'General' },
  HS_CLIENT_INTRO: { label: 'HS Client Intro', shortLabel: 'HS Intro' },
  HS_CLIENT_REND: { label: 'HS Client Rendezvous', shortLabel: 'HS Rend' },
  HS_SERVICE_INTRO: { label: 'HS Service Intro', shortLabel: 'Svc Intro' },
  HS_SERVICE_REND: { label: 'HS Service Rendezvous', shortLabel: 'Svc Rend' },
  TESTING: { label: 'Testing', shortLabel: 'Test' },
  CONTROLLER: { label: 'Controller', shortLabel: 'Ctrl' },
  CONFLUX_LINKED: { label: 'Conflux Linked', shortLabel: 'Conflux' },
  HS_VANGUARDS: { label: 'HS Vanguards', shortLabel: 'Vanguard' },
};

// Helper functions
const truncateFingerprint = (fp: string): string => {
  if (!fp || fp.length < 12) return fp || 'N/A';
  return `${fp.slice(0, 6)}...${fp.slice(-4)}`;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

// CircuitPath Component (inline)
const CircuitPath: React.FC<{ circuit: CircuitData; expanded?: boolean }> = ({ circuit, expanded = false }) => {
  const path = circuit.path || [];
  if (path.length === 0) return <div className="text-gray-500 text-sm italic">No path information</div>;

  return (
    <div className={`flex items-center gap-1 ${expanded ? 'flex-wrap' : 'overflow-hidden'}`}>
      {circuit.source_node && (
        <>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs" style={{ backgroundColor: NEON_DIM }}>
            <Users size={12} style={{ color: NEON }} />
            <span className="text-gray-300 font-medium">{circuit.source_node}</span>
          </div>
          <span className="text-gray-600">→</span>
        </>
      )}
      {path.map((hop, index) => (
        <React.Fragment key={index}>
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
            style={{ backgroundColor: index === 0 ? NEON_MEDIUM : NEON_DIM }}
          >
            {index === 0 && <Shield size={12} style={{ color: NEON }} />}
            {index > 0 && index < path.length - 1 && <Server size={12} style={{ color: NEON }} />}
            {index === path.length - 1 && <Globe size={12} style={{ color: NEON }} />}
            <span className="text-gray-300 font-medium">
              {hop.nickname || truncateFingerprint(hop.fingerprint)}
            </span>
          </div>
          {index < path.length - 1 && <span className="text-gray-600 flex-shrink-0">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

// Main Component
export const CircuitCard: React.FC<CircuitCardProps> = ({ circuit, onClick, showDetails = false }) => {
  const [expanded, setExpanded] = useState(showDetails);
  
  const statusConfig = STATUS_CONFIG[circuit.status] || STATUS_CONFIG.BUILT;
  const purposeConfig = PURPOSE_CONFIG[circuit.purpose] || { label: circuit.purpose, shortLabel: circuit.purpose };

  return (
    <div 
      className="bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-[#88CED0]/30 transition-all overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
            <GitBranch size={16} style={{ color: NEON }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">Circuit #{circuit.circuit_id}</span>
              <span 
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">{purposeConfig.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{circuit.path_length} hops</span>
          <button 
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} 
            className="p-1.5 rounded hover:bg-gray-700/50 transition-colors"
          >
            {expanded ? (
              <ChevronUp size={14} style={{ color: NEON }} />
            ) : (
              <ChevronDown size={14} style={{ color: NEON }} />
            )}
          </button>
        </div>
      </div>

      {/* Path */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500 mb-2">Circuit Path</p>
        <CircuitPath circuit={circuit} expanded={expanded} />
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 py-3 border-t border-gray-700/30 bg-gray-900/30">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500 mb-1">Purpose</p>
              <p className="text-gray-300">{purposeConfig.label}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Build Flags</p>
              <div className="flex flex-wrap gap-1">
                {circuit.build_flags && circuit.build_flags.length > 0 ? (
                  circuit.build_flags.map((flag, i) => (
                    <span 
                      key={i} 
                      className="px-1.5 py-0.5 rounded text-xs" 
                      style={{ backgroundColor: NEON_DIM, color: NEON }}
                    >
                      {flag}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">None</span>
                )}
              </div>
            </div>
            {circuit.build_time_ms && (
              <div>
                <p className="text-gray-500 mb-1">Build Time</p>
                <p className="text-gray-300">{circuit.build_time_ms}ms</p>
              </div>
            )}
          </div>

          {/* Full Path Details */}
          <div className="mt-4">
            <p className="text-gray-500 text-xs mb-2">Full Path Details</p>
            <div className="space-y-2">
              {circuit.path?.map((hop, index) => (
                <div key={index} className="flex items-center gap-3 text-xs bg-gray-800/50 rounded-md p-2">
                  <span className="text-gray-500 w-16">
                    {index === 0 ? 'Guard' : index === (circuit.path?.length || 0) - 1 ? 'Exit' : `Middle ${index}`}
                  </span>
                  <span className="text-gray-300 font-medium">{hop.nickname || 'Unknown'}</span>
                  <span className="text-gray-500 font-mono text-xs ml-auto">
                    {truncateFingerprint(hop.fingerprint)}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(hop.fingerprint); }} 
                    className="p-1 hover:bg-gray-700 rounded" 
                    title="Copy Fingerprint"
                  >
                    <Copy size={10} style={{ color: NEON }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CircuitCard;
