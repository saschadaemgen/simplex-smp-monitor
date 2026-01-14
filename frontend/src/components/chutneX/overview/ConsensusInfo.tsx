/**
 * ConsensusInfo - Consensus Status Display
 */
import React from 'react';
import { ConsensusInfo as ConsensusInfoType } from '../types';
import { Shield, Clock, CheckCircle, AlertTriangle, Server } from 'lucide-react';

interface ConsensusInfoProps {
  consensus: ConsensusInfoType ;
}

export const ConsensusInfo: React.FC<ConsensusInfoProps> = ({ consensus }) => {
  if (!consensus) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-700">
          <Shield className="text-gray-500" size={20} />
          <h3 className="font-medium text-white">Consensus</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-gray-500">
          <AlertTriangle size={20} className="mr-2" />
          No consensus data available
        </div>
      </div>
    );
  }

  const isValid = consensus.valid;
  const validUntil = consensus.valid_until ? new Date(consensus.valid_until) : null;
  const now = new Date();
  const isExpiringSoon = validUntil && (validUntil.getTime() - now.getTime()) < 10 * 60 * 1000; // 10 min

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Shield className={isValid ? 'text-green-400' : 'text-red-400'} size={20} />
          <h3 className="font-medium text-white">Consensus</h3>
        </div>
        <StatusBadge valid={isValid ?? false} expiringSoon={isExpiringSoon ?? false} />
      </div>

      <div className="space-y-3">
        <InfoRow 
          icon={<Server size={14} className="text-purple-400" />}
          label="Source DA"
          value={consensus.source_da?.replace('chutnex-', '').replace('berlin-', '') || 'Unknown'}
        />
        <InfoRow 
          icon={<CheckCircle size={14} className="text-blue-400" />}
          label="Tor Version"
          value={consensus.tor_version}
        />
        
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="text-xs text-gray-500 mb-2">Validity Period</div>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <TimeRow label="Valid After" time={consensus.valid_after ?? ""} />
            <TimeRow label="Fresh Until" time={consensus.fresh_until ?? ""} />
            <TimeRow label="Valid Until" time={consensus.valid_until ?? ""} highlight={isExpiringSoon ?? false} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatusBadge: React.FC<{ valid: boolean; expiringSoon: boolean }> = ({ valid, expiringSoon }) => {
  if (!valid) {
    return (
      <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
        <AlertTriangle size={12} /> Invalid
      </span>
    );
  }
  if (expiringSoon) {
    return (
      <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full animate-pulse">
        <Clock size={12} /> Expiring Soon
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
      <CheckCircle size={12} /> Valid
    </span>
  );
};

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      {icon}
      {label}
    </div>
    <span className="font-mono text-white text-sm">{value}</span>
  </div>
);

interface TimeRowProps {
  label: string;
  time: string ;
  highlight?: boolean;
}

const TimeRow: React.FC<TimeRowProps> = ({ label, time, highlight = false }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-500">{label}</span>
    <span className={`font-mono text-xs ${highlight ? 'text-yellow-400' : 'text-gray-300'}`}>
      {time || '—'}
    </span>
  </div>
);

export default ConsensusInfo;
