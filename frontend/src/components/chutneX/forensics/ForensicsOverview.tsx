/**
 * ForensicsOverview - Main Forensic Analysis Dashboard
 */
import React from 'react';
import { 
  Search, Shield, AlertTriangle, Clock,
  Activity, Fingerprint, Eye, Target
} from 'lucide-react';

interface ForensicsOverviewProps {
  networkId: string;
  networkName: string;
  analysisAvailable: boolean;
}

export const ForensicsOverview: React.FC<ForensicsOverviewProps> = ({
  networkId: _,
  networkName,
  analysisAvailable,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-[#88CED0]/20 rounded-xl">
            <Search radius={4} className="text-[#88CED0]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Forensic Analysis</h2>
            <p className="text-gray-400">Network: {networkName}</p>
          </div>
        </div>
        
        {!analysisAvailable && (
          <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertTriangle className="text-yellow-400" radius={4} />
            <div>
              <p className="text-yellow-400 font-medium">Analysis Data Not Available</p>
              <p className="text-sm text-yellow-400/70">
                Traffic capture must be enabled and data collected before forensic analysis can be performed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ForensicModule
          icon={<Clock className="text-purple-400" />}
          title="Timing Correlation"
          description="Analyze timing patterns between entry and exit traffic to detect potential correlation attacks"
          status={analysisAvailable ? 'available' : 'disabled'}
        />
        <ForensicModule
          icon={<Activity className="text-blue-400" />}
          title="Traffic Patterns"
          description="Identify traffic patterns, burst behavior, and anomalies in network flow"
          status={analysisAvailable ? 'available' : 'disabled'}
        />
        <ForensicModule
          icon={<Fingerprint className="text-orange-400" />}
          title="Flow Fingerprinting"
          description="Detect unique flow characteristics that could identify traffic streams"
          status={analysisAvailable ? 'available' : 'disabled'}
        />
        <ForensicModule
          icon={<Eye className="text-pink-400" />}
          title="Cell Analysis"
          description="Deep inspection of Tor cell types, padding, and protocol behavior"
          status="coming_soon"
        />
        <ForensicModule
          icon={<Target className="text-red-400" />}
          title="Attack Simulation"
          description="Simulate known attacks to test network resilience"
          status="coming_soon"
        />
        <ForensicModule
          icon={<Shield className="text-green-400" />}
          title="Defense Analysis"
          description="Evaluate effectiveness of privacy countermeasures"
          status="coming_soon"
        />
      </div>

      {/* Research Notes */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
          <Search radius={4} className="text-[#88CED0]" />
          Research Applications
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <h5 className="text-white font-medium mb-1">Traffic Analysis Research</h5>
            <ul className="list-disc list-inside space-y-1">
              <li>Timing correlation attack effectiveness</li>
              <li>Website fingerprinting detection</li>
              <li>Guard relay selection analysis</li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-medium mb-1">Privacy Defense Testing</h5>
            <ul className="list-disc list-inside space-y-1">
              <li>Padding effectiveness evaluation</li>
              <li>Cover traffic analysis</li>
              <li>Multi-path routing benefits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ForensicModuleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'available' | 'disabled' | 'coming_soon';
}

const ForensicModule: React.FC<ForensicModuleProps> = ({ icon, title, description, status }) => {
  const statusConfig = {
    available: { bg: 'hover:border-[#88CED0]/50 cursor-pointer', badge: null },
    disabled: { bg: 'opacity-50 cursor-not-allowed', badge: null },
    coming_soon: { 
      bg: 'opacity-70', 
      badge: <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Coming Soon</span>
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 transition-all ${config.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-gray-700/50 rounded-lg">
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
        </div>
        {config.badge}
      </div>
      <h4 className="font-medium text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
};

export default ForensicsOverview;
