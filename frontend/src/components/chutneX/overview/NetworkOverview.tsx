/**
 * NetworkOverview - Main Network Status Dashboard
 */
import React from 'react';
import { NetworkAnalytics } from '../types';
import { NetworkStatsCards } from './NetworkStatsCards';
import { NetworkConfig } from './NetworkConfig';
import { NetworkTimestamps } from './NetworkTimestamps';
import { ConsensusInfo } from './ConsensusInfo';
import { Activity, Server, GitBranch, Shield } from 'lucide-react';

interface NetworkOverviewProps {
  analytics: NetworkAnalytics;
  network?: {
    id: string;
    name: string;
    description?: string;
    template: string;
    created_at: string;
    started_at?: string;
    capture_enabled?: boolean;
  };
}

export const NetworkOverview: React.FC<NetworkOverviewProps> = ({ analytics, network }) => {
  const { nodes, summary, bandwidth, circuits, consensus } = analytics;
  
  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeroStat
          icon={<Server className="text-purple-400" />}
          label="Nodes Running"
          value={`${nodes.running}/${nodes.total}`}
          color={nodes.running === nodes.total ? 'text-green-400' : 'text-yellow-400'}
        />
        <HeroStat
          icon={<GitBranch className="text-blue-400" />}
          label="Active Circuits"
          value={summary.active_circuits.toString()}
          color="text-[#88CED0]"
        />
        <HeroStat
          icon={<Activity className="text-green-400" />}
          label="Total Traffic"
          value={formatTraffic(summary.total_bytes)}
          color="text-green-400"
        />
        <HeroStat
          icon={<Shield className="text-orange-400" />}
          label="Consensus"
          value={summary.consensus_valid ? 'Valid' : 'Invalid'}
          color={summary.consensus_valid ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      {/* Stats Cards */}
      <NetworkStatsCards
        bandwidth={bandwidth}
        circuits={circuits}
        nodesRunning={nodes.running}
        nodesTotal={nodes.total}
        avgUptime={summary.avg_node_uptime}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consensus Info */}
        <ConsensusInfo consensus={consensus} />
        
        {/* Network Config */}
        {network && (
          <NetworkConfig
            template={network.template}
            captureEnabled={network.capture_enabled}
            nodesTotal={nodes.total}
          />
        )}
      </div>

      {/* Timestamps */}
      {network && (
        <NetworkTimestamps
          createdAt={network.created_at}
          startedAt={network.started_at}
          lastUpdated={analytics.timestamp}
        />
      )}
    </div>
  );
};

// Helper Components
interface HeroStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const HeroStat: React.FC<HeroStatProps> = ({ icon, label, value, color }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-[#88CED0]/50 transition-colors">
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
  </div>
);

const formatTraffic = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export default NetworkOverview;
