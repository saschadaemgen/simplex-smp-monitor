/**
 * AuthoritiesTab - Directory Authority Status
 * ============================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Shows:
 * - Directory Authority status grid
 * - Voting status and history
 * - Authority reachability
 * - V3 identity information
 */
import React, { useMemo } from 'react';
import {
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wifi,
  Vote,
  Key,
  Globe,
  Hash,
} from 'lucide-react';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';

interface DirectoryAuthority {
  id: string;
  name: string;
  nickname: string;
  fingerprint?: string;
  v3_identity?: string;
  
  // Status
  status: 'online' | 'offline' | 'unknown';
  is_voting: boolean;
  last_vote_time?: string;
  reachable: boolean;
  
  // Network
  address?: string;
  or_port?: number;
  dir_port?: number;
  
  // Flags
  flags?: string[];
  
  // ChutneX specific
  is_local: boolean;  // Part of this private network
}

interface AuthoritiesTabProps {
  authorities: DirectoryAuthority[];
  requiredVotes: number;
  isLive: boolean;
}

export const AuthoritiesTab: React.FC<AuthoritiesTabProps> = ({
  authorities,
  requiredVotes,
  // isLive, // TODO: use later
}) => {
  // Calculate stats
  const stats = useMemo(() => {
    const online = authorities.filter(a => a.status === 'online').length;
    const voting = authorities.filter(a => a.is_voting).length;
    const reachable = authorities.filter(a => a.reachable).length;
    const local = authorities.filter(a => a.is_local).length;
    
    return {
      total: authorities.length,
      online,
      voting,
      reachable,
      local,
      hasQuorum: voting >= requiredVotes,
    };
  }, [authorities, requiredVotes]);

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* Quorum Status */}
      <div 
        className="rounded-lg border p-4"
        style={{
          backgroundColor: stats.hasQuorum ? NEON_DIM : 'rgba(248, 113, 113, 0.1)',
          borderColor: stats.hasQuorum ? 'rgba(136, 206, 208, 0.3)' : 'rgba(248, 113, 113, 0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          {stats.hasQuorum ? (
            <CheckCircle2 size={24} style={{ color: NEON }} />
          ) : (
            <AlertCircle size={24} className="text-red-400" />
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">
              {stats.hasQuorum ? 'Voting Quorum Reached' : 'Insufficient Voting Authorities'}
            </h2>
            <p className="text-sm text-gray-400">
              {stats.voting} of {stats.total} authorities voting 
              (minimum {requiredVotes} required)
            </p>
          </div>
          
          {/* Voting indicator */}
          <div 
            className="text-center px-4 py-2 rounded-lg"
            style={{ backgroundColor: stats.hasQuorum ? `${NEON}20` : 'rgba(248, 113, 113, 0.2)' }}
          >
            <div 
              className="text-2xl font-bold"
              style={{ color: stats.hasQuorum ? NEON : '#f87171' }}
            >
              {stats.voting}/{requiredVotes}
            </div>
            <div className="text-xs text-gray-400">Votes</div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Building2}
          label="Total DAs"
          value={stats.total.toString()}
        />
        <StatCard
          icon={Wifi}
          label="Online"
          value={`${stats.online}/${stats.total}`}
          color={stats.online === stats.total ? '#4ade80' : undefined}
        />
        <StatCard
          icon={Vote}
          label="Voting"
          value={`${stats.voting}/${stats.total}`}
          color={stats.hasQuorum ? NEON : '#f87171'}
        />
        <StatCard
          icon={Shield}
          label="Local Network"
          value={`${stats.local}/${stats.total}`}
        />
      </div>

      {/* Authority Grid */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <Building2 size={14} style={{ color: NEON }} />
          Directory Authorities
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {authorities.map(authority => (
            <AuthorityCard key={authority.id} authority={authority} />
          ))}
        </div>
        
        {authorities.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No Directory Authorities configured
          </div>
        )}
      </div>

      {/* Authority Details Table */}
      {authorities.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-700/50">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Key size={14} style={{ color: NEON }} />
              Authority Identities
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900/30">
                  <th className="px-4 py-2 text-left text-gray-400 font-medium">Name</th>
                  <th className="px-4 py-2 text-left text-gray-400 font-medium">Fingerprint</th>
                  <th className="px-4 py-2 text-left text-gray-400 font-medium">Address</th>
                  <th className="px-4 py-2 text-left text-gray-400 font-medium">Ports</th>
                  <th className="px-4 py-2 text-left text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {authorities.map(authority => (
                  <tr 
                    key={authority.id}
                    className="border-t border-gray-700/50 hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ 
                            backgroundColor: authority.status === 'online' ? '#4ade80' : 
                                           authority.status === 'offline' ? '#f87171' : '#64748b'
                          }}
                        />
                        <span className="text-white font-medium">
                          {authority.nickname || authority.name}
                        </span>
                        {authority.is_local && (
                          <span 
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: NEON_DIM, color: NEON }}
                          >
                            Local
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-400 font-mono">
                        {authority.fingerprint 
                          ? `${authority.fingerprint.slice(0, 20)}...` 
                          : '-'
                        }
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {authority.address || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {authority.or_port && `OR:${authority.or_port}`}
                      {authority.dir_port && ` DIR:${authority.dir_port}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {authority.is_voting ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs">
                            <Vote size={12} />
                            Voting
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Not voting</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color = NEON }) => (
  <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} style={{ color }} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <p className="text-xl font-bold text-white">{value}</p>
  </div>
);

interface AuthorityCardProps {
  authority: DirectoryAuthority;
}

const AuthorityCard: React.FC<AuthorityCardProps> = ({ authority }) => {
  const statusColor = 
    authority.status === 'online' ? '#4ade80' :
    authority.status === 'offline' ? '#f87171' : '#64748b';

  return (
    <div 
      className={`p-4 rounded-lg border transition-colors ${
        authority.is_local 
          ? 'border-[#88CED0]/30 bg-[#88CED0]/5' 
          : 'border-gray-700/50 bg-gray-900/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={16} style={{ color: authority.is_local ? NEON : '#64748b' }} />
          <div>
            <h4 className="text-sm font-medium text-white">
              {authority.nickname || authority.name}
            </h4>
            {authority.is_local && (
              <span className="text-xs" style={{ color: NEON }}>Local Network</span>
            )}
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-1">
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span 
            className="text-xs capitalize"
            style={{ color: statusColor }}
          >
            {authority.status}
          </span>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {authority.is_voting && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            <Vote size={10} />
            Voting
          </span>
        )}
        {authority.reachable && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
            <Wifi size={10} />
            Reachable
          </span>
        )}
      </div>

      {/* Network Info */}
      {authority.address && (
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <Globe size={10} />
            <span>{authority.address}</span>
          </div>
          {(authority.or_port || authority.dir_port) && (
            <div className="flex items-center gap-2">
              <Hash size={10} />
              <span className="font-mono">
                {authority.or_port && `OR:${authority.or_port}`}
                {authority.dir_port && ` DIR:${authority.dir_port}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Last Vote */}
      {authority.last_vote_time && (
        <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2 text-xs text-gray-500">
          <Clock size={10} />
          Last vote: {new Date(authority.last_vote_time).toLocaleTimeString('de-DE')}
        </div>
      )}
    </div>
  );
};

export default AuthoritiesTab;