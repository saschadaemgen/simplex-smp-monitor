/**
 * CircuitStats - Statistics Charts for Circuits
 * ==============================================
 * Pure UI component - receives stats data via props
 */
import React from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, Zap } from 'lucide-react';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';
const CHART_COLORS = ['#88CED0', '#6BB8BA', '#A5DFE1', '#4FA3A5', '#C2EDEF', '#3D8B8D'];

interface CircuitStatsProps {
  byStatus: Record<string, number>;
  byPurpose: Record<string, number>;
  
  
}

const STATUS_LABELS: Record<string, string> = {
  BUILT: 'Built',
  LAUNCHED: 'Launched',
  EXTENDED: 'Extended',
  FAILED: 'Failed',
  CLOSED: 'Closed',
};

const PURPOSE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  HS_CLIENT_INTRO: 'HS Intro',
  HS_CLIENT_REND: 'HS Rend',
  HS_SERVICE_INTRO: 'Svc Intro',
  HS_SERVICE_REND: 'Svc Rend',
  TESTING: 'Test',
  CONTROLLER: 'Ctrl',
  CONFLUX_LINKED: 'Conflux',
  HS_VANGUARDS: 'Vanguard',
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-900/95 border border-[#88CED0]/30 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="font-semibold" style={{ color: NEON }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Chart Card wrapper
const ChartCard: React.FC<{ 
  title: string; 
  subtitle?: string; 
  icon: React.ReactNode; 
  children: React.ReactNode 
}> = ({ title, subtitle, icon, children }) => (
  <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-700/50">
      <div className="p-2 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
        <div style={{ color: NEON }}>{icon}</div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

export const CircuitStats: React.FC<CircuitStatsProps> = ({
  byStatus,
  byPurpose,
  
  
}) => {
  // Prepare chart data
  const statusChartData = Object.entries(byStatus).map(([status, count], index) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const purposeChartData = Object.entries(byPurpose)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([purpose, count], index) => ({
      name: PURPOSE_LABELS[purpose] || purpose,
      value: count,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution */}
      <ChartCard title="Circuit Status Distribution" subtitle="Breakdown by status" icon={<Activity size={16} />}>
        <div className="h-[250px]">
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available
            </div>
          )}
        </div>
      </ChartCard>

      {/* Purpose Distribution */}
      <ChartCard title="Circuit Purpose Distribution" subtitle="Top purposes" icon={<Zap size={16} />}>
        <div className="h-[250px]">
          {purposeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purposeChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#6b7280" 
                  tick={{ fill: '#9ca3af', fontSize: 11 }} 
                  width={80} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Circuits" fill={NEON} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default CircuitStats;
