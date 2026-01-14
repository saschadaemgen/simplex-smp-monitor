/**
 * TrafficOverview - Traffic Summary Dashboard
 */
import React from 'react';
import { NetworkBandwidth, NodeStats } from '../types';
import { BandwidthChart } from './BandwidthChart';
import { 
  Activity, ArrowDown, ArrowUp, Server,
  TrendingUp, Database
} from 'lucide-react';

interface TrafficOverviewProps {
  bandwidth: NetworkBandwidth;
  nodeStats: NodeStats[];
  historicalData?: { timestamp: string; read: number; written: number }[];
}

export const TrafficOverview: React.FC<TrafficOverviewProps> = ({
  bandwidth,
  nodeStats,
  historicalData = [],
}) => {
  const totalTraffic = bandwidth.total_bytes;
  const avgPerNode = bandwidth.nodes_reporting > 0 
    ? totalTraffic / bandwidth.nodes_reporting 
    : 0;

  // Top bandwidth consumers
  const topNodes = [...nodeStats]
    .sort((a, b) => (b.bytes_read + b.bytes_written) - (a.bytes_read + a.bytes_written))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TrafficStatCard
          icon={<Activity className="text-[#88CED0]" />}
          label="Total Traffic"
          value={formatBytes(totalTraffic)}
          trend="+12%"
        />
        <TrafficStatCard
          icon={<ArrowDown className="text-green-400" />}
          label="Downloaded"
          value={formatBytes(bandwidth.total_bytes_read)}
        />
        <TrafficStatCard
          icon={<ArrowUp className="text-blue-400" />}
          label="Uploaded"
          value={formatBytes(bandwidth.total_bytes_written)}
        />
        <TrafficStatCard
          icon={<Server className="text-purple-400" />}
          label="Avg per Node"
          value={formatBytes(avgPerNode)}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bandwidth by Type */}
        <BandwidthChart byType={bandwidth.by_type} />

        {/* Top Consumers */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <h4 className="font-medium text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-400" />
            Top Bandwidth Consumers
          </h4>
          <div className="space-y-3">
            {topNodes.map((node, index) => {
              const total = node.bytes_read + node.bytes_written;
              const percent = totalTraffic > 0 ? (total / totalTraffic) * 100 : 0;
              return (
                <div key={node.node_id} className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-6">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm">{node.node_name}</span>
                      <span className="text-[#88CED0] font-mono text-sm">
                        {formatBytes(total)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#88CED0] to-blue-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-gray-500 text-xs w-12 text-right">
                    {percent.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Traffic Timeline */}
      {historicalData.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <h4 className="font-medium text-white mb-4 flex items-center gap-2">
            <Database size={18} className="text-cyan-400" />
            Traffic Over Time
          </h4>
          <div className="h-40">
            <TrafficTimeline data={historicalData} />
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
interface TrafficStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}

const TrafficStatCard: React.FC<TrafficStatCardProps> = ({ icon, label, value, trend }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-[#88CED0]/30 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      {trend && (
        <span className="text-green-400 text-xs flex items-center gap-1">
          <TrendingUp size={10} /> {trend}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold font-mono text-white">{value}</div>
  </div>
);

interface TrafficTimelineProps {
  data: { timestamp: string; read: number; written: number }[];
}

const TrafficTimeline: React.FC<TrafficTimelineProps> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.read + d.written), 1);
  
  return (
    <div className="flex items-end h-full gap-1">
      {data.slice(-30).map((point, i) => {
        const readHeight = (point.read / maxVal) * 100;
        const writeHeight = (point.written / maxVal) * 100;
        
        return (
          <div key={i} className="flex-1 flex flex-col justify-end gap-0.5 h-full">
            <div 
              className="bg-blue-500/70 rounded-t"
              style={{ height: `${writeHeight}%` }}
              title={`Upload: ${formatBytes(point.written)}`}
            />
            <div 
              className="bg-green-500/70 rounded-b"
              style={{ height: `${readHeight}%` }}
              title={`Download: ${formatBytes(point.read)}`}
            />
          </div>
        );
      })}
    </div>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default TrafficOverview;
