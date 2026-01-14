/**
 * CellAnalysis - Tor Cell Deep Analysis
 */
import React from 'react';
import { CellAnalysis as CellAnalysisType } from '../types';
import { 
  Layers, Database, Activity, AlertTriangle,
  PieChart, Info
} from 'lucide-react';

interface CellAnalysisProps {
  analysis: CellAnalysisType | null;
}

const cellTypeInfo: Record<string, { color: string; description: string }> = {
  CREATE: { color: 'bg-green-500', description: 'Circuit creation cells' },
  CREATED: { color: 'bg-green-400', description: 'Circuit creation response' },
  RELAY: { color: 'bg-blue-500', description: 'Data relay cells' },
  DESTROY: { color: 'bg-red-500', description: 'Circuit teardown cells' },
  PADDING: { color: 'bg-gray-500', description: 'Padding cells for traffic analysis resistance' },
  VERSIONS: { color: 'bg-purple-500', description: 'Version negotiation' },
  NETINFO: { color: 'bg-cyan-500', description: 'Network information exchange' },
  CREATE_FAST: { color: 'bg-green-600', description: 'Fast circuit creation (one-hop)' },
  CREATED_FAST: { color: 'bg-green-300', description: 'Fast circuit creation response' },
  RELAY_EARLY: { color: 'bg-blue-400', description: 'Early relay cells' },
};

export const CellAnalysis: React.FC<CellAnalysisProps> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
        <Layers radius={4} className="mx-auto mb-4 text-gray-600" />
        <h4 className="font-medium text-white mb-2">Cell Analysis Not Available</h4>
        <p className="text-sm text-gray-500">
          Deep packet inspection data is required to analyze Tor cell types.
          This feature requires traffic capture with cell-level parsing enabled.
        </p>
      </div>
    );
  }

  const sortedTypes = Object.entries(analysis.cell_types)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Layers className="text-[#88CED0]" />}
          label="Total Cells"
          value={formatNumber(analysis.total_cells)}
        />
        <StatCard
          icon={<Database className="text-purple-400" />}
          label="Cell Types"
          value={Object.keys(analysis.cell_types).length.toString()}
        />
        <StatCard
          icon={<Activity className="text-green-400" />}
          label="Avg Cell Rate"
          value={`${analysis.avg_cell_rate.toFixed(1)}/s`}
        />
        <StatCard
          icon={<PieChart className="text-orange-400" />}
          label="Tor Overhead"
          value={`${analysis.tor_overhead_percent.toFixed(1)}%`}
          warning={analysis.tor_overhead_percent > 30}
        />
      </div>

      {/* Cell Type Distribution */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h4 className="font-medium text-white mb-4 flex items-center gap-2">
          <Layers radius={4} className="text-purple-400" />
          Cell Type Distribution
        </h4>

        {/* Stacked Bar */}
        <div className="h-8 flex rounded-lg overflow-hidden mb-4">
          {sortedTypes.map(([type, count]) => {
            const percent = (count / analysis.total_cells) * 100;
            const config = cellTypeInfo[type] || { color: 'bg-gray-500' };
            return (
              <div
                key={type}
                className={`${config.color} transition-all relative group`}
                style={{ width: `${percent}%` }}
                title={`${type}: ${count} (${percent.toFixed(1)}%)`}
              >
                {percent > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                    {type}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {sortedTypes.map(([type, count]) => {
            const percent = (count / analysis.total_cells) * 100;
            const config = cellTypeInfo[type] || { color: 'bg-gray-500', description: 'Unknown cell type' };
            
            return (
              <div 
                key={type}
                className="flex items-center gap-2 p-2 bg-gray-900/30 rounded-lg group"
                title={config.description}
              >
                <div className={`w-3 h-3 rounded ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white truncate">{type}</span>
                    <span className="text-xs text-gray-400">{percent.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{formatNumber(count)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis Notes */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
          <Info radius={4} className="text-[#88CED0]" />
          Analysis Notes
        </h4>
        <div className="space-y-2 text-sm text-gray-400">
          <p>
            <strong className="text-white">RELAY cells</strong> carry encrypted data through the circuit.
            A high proportion of RELAY cells indicates active data transfer.
          </p>
          <p>
            <strong className="text-white">PADDING cells</strong> are used to resist traffic analysis.
            Low padding ratios may indicate vulnerability to timing attacks.
          </p>
          <p>
            <strong className="text-white">CREATE/DESTROY ratio</strong> indicates circuit churn.
            High ratios may suggest instability or attack conditions.
          </p>
        </div>
      </div>

      {/* Warnings */}
      {analysis.tor_overhead_percent > 30 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-400 flex-shrink-0" radius={4} />
            <div>
              <h5 className="font-medium text-yellow-400 mb-1">High Protocol Overhead</h5>
              <p className="text-sm text-yellow-400/70">
                Tor protocol overhead is {analysis.tor_overhead_percent.toFixed(1)}%, which is above normal levels.
                This could indicate inefficient circuit usage or potential issues with the network configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  warning?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, warning = false }) => (
  <div className={`bg-gray-800/50 border rounded-xl p-4 ${warning ? 'border-yellow-500/50' : 'border-gray-700'}`}>
    <div className="flex items-center gap-2 mb-2">
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <div className={`text-xl font-bold font-mono ${warning ? 'text-yellow-400' : 'text-white'}`}>
      {value}
    </div>
  </div>
);

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default CellAnalysis;
