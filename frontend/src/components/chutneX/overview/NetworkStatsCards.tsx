/**
 * NetworkStatsCards - Detailed Stats Display
 */
import React from 'react';
import { NetworkBandwidth, CircuitStats } from '../types';
import { 
  ArrowDownUp, 
  GitBranch, 
  Clock, 
  Cpu,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface NetworkStatsCardsProps {
  bandwidth: NetworkBandwidth;
  circuits: CircuitStats;
  nodesRunning: number;
  nodesTotal: number;
  avgUptime: number;
}

export const NetworkStatsCards: React.FC<NetworkStatsCardsProps> = ({
  bandwidth,
  circuits,
  nodesRunning,
  nodesTotal,
  avgUptime,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Bandwidth Card */}
      <StatsCard
        title="Bandwidth"
        icon={<ArrowDownUp className="text-[#88CED0]" size={20} />}
      >
        <div className="space-y-3">
          <StatRow 
            icon={<ArrowDown size={14} className="text-green-400" />}
            label="Downloaded"
            value={formatBytes(bandwidth.total_bytes_read)}
            color="text-green-400"
          />
          <StatRow 
            icon={<ArrowUp size={14} className="text-blue-400" />}
            label="Uploaded"
            value={formatBytes(bandwidth.total_bytes_written)}
            color="text-blue-400"
          />
          <div className="border-t border-gray-700 pt-2">
            <StatRow 
              label="Nodes Reporting"
              value={`${bandwidth.nodes_reporting}/${nodesTotal}`}
              color="text-gray-300"
            />
          </div>
        </div>
      </StatsCard>

      {/* Circuits Card */}
      <StatsCard
        title="Circuits"
        icon={<GitBranch className="text-purple-400" size={20} />}
      >
        <div className="space-y-3">
          <StatRow 
            icon={<CheckCircle size={14} className="text-green-400" />}
            label="Built"
            value={circuits.built_circuits.toString()}
            color="text-green-400"
          />
          <StatRow 
            icon={<GitBranch size={14} className="text-[#88CED0]" />}
            label="Total"
            value={circuits.total_circuits.toString()}
            color="text-[#88CED0]"
          />
          <div className="border-t border-gray-700 pt-2">
            <div className="text-xs text-gray-500">By Purpose:</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(circuits.by_purpose).slice(0, 4).map(([purpose, count]) => (
                <span 
                  key={purpose} 
                  className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300"
                >
                  {purpose}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </StatsCard>

      {/* Node Health Card */}
      <StatsCard
        title="Node Health"
        icon={<Cpu className="text-orange-400" size={20} />}
      >
        <div className="space-y-3">
          <StatRow 
            icon={nodesRunning === nodesTotal ? 
              <CheckCircle size={14} className="text-green-400" /> : 
              <XCircle size={14} className="text-yellow-400" />
            }
            label="Running"
            value={`${nodesRunning}/${nodesTotal}`}
            color={nodesRunning === nodesTotal ? 'text-green-400' : 'text-yellow-400'}
          />
          <StatRow 
            icon={<Clock size={14} className="text-[#88CED0]" />}
            label="Avg Uptime"
            value={formatUptime(avgUptime)}
            color="text-[#88CED0]"
          />
          <div className="border-t border-gray-700 pt-2">
            <div className="text-xs text-gray-500">By Type:</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(bandwidth.by_type).map(([type, data]) => (
                <span 
                  key={type} 
                  className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300"
                >
                  {type}: {data.node_count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </StatsCard>
    </div>
  );
};

// Helper Components
interface StatsCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, icon, children }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-[#88CED0]/30 transition-colors">
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-700">
      {icon}
      <h3 className="font-medium text-white">{title}</h3>
    </div>
    {children}
  </div>
);

interface StatRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}

const StatRow: React.FC<StatRowProps> = ({ icon, label, value, color = 'text-white' }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      {icon}
      {label}
    </div>
    <span className={`font-mono font-medium ${color}`}>{value}</span>
  </div>
);

// Utilities
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

export default NetworkStatsCards;
