/**
 * IntegrationHub - Phase 10 Tool Integrations
 */
import React from 'react';
import { 
  Search, Shield, Database, Network, Eye, 
  AlertTriangle, Lock, ExternalLink, Settings
} from 'lucide-react';

interface IntegrationHubProps {
  enabledIntegrations?: string[];
}

const integrations = [
  {
    id: 'zeek',
    name: 'Zeek (Bro)',
    description: 'Network analysis framework for deep packet inspection and protocol analysis',
    icon: Search,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    status: 'planned',
    features: ['Connection logs', 'Protocol analysis', 'Custom scripts', 'File extraction'],
  },
  {
    id: 'suricata',
    name: 'Suricata',
    description: 'High-performance IDS/IPS with rule-based threat detection',
    icon: Shield,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    status: 'planned',
    features: ['Rule-based detection', 'Protocol parsing', 'File extraction', 'Flow logging'],
  },
  {
    id: 'arkime',
    name: 'Arkime (Moloch)',
    description: 'Large-scale full packet capture and search system',
    icon: Database,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    status: 'planned',
    features: ['PCAP storage', 'Session search', 'SPI view', 'API access'],
  },
  {
    id: 'ntopng',
    name: 'ntopng',
    description: 'Real-time network traffic monitoring and flow analysis',
    icon: Network,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    status: 'planned',
    features: ['Flow analysis', 'Real-time stats', 'Historical data', 'Alerts'],
  },
  {
    id: 'neo4j',
    name: 'Neo4j',
    description: 'Graph database for circuit path and relationship analysis',
    icon: Eye,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    status: 'planned',
    features: ['Path queries', 'Relationship mapping', 'Pattern detection', 'Visualization'],
  },
  {
    id: 'misp',
    name: 'MISP / OpenCTI',
    description: 'Threat intelligence platform for indicator correlation',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    status: 'planned',
    features: ['IOC matching', 'Threat feeds', 'Attribution', 'Sharing'],
  },
];

export const IntegrationHub: React.FC<IntegrationHubProps> = ({
  enabledIntegrations = [],
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-[#88CED0]/20 rounded-xl">
            <Lock size={32} className="text-[#88CED0]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Integration Hub</h2>
            <p className="text-gray-400">Phase 10 - Enterprise Security Stack</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <AlertTriangle className="text-purple-400" size={20} />
          <div>
            <p className="text-purple-400 font-medium">Coming in Phase 10</p>
            <p className="text-sm text-purple-400/70">
              These integrations are planned for the Enterprise Security Stack phase.
              Enable traffic capture now to prepare data for future analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(integration => {
          const Icon = integration.icon;
          const isEnabled = enabledIntegrations.includes(integration.id);
          
          return (
            <div
              key={integration.id}
              className={`bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden ${
                isEnabled ? 'ring-2 ring-[#88CED0]' : ''
              }`}
            >
              {/* Header */}
              <div className={`p-4 ${integration.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={24} className={integration.color} />
                    <div>
                      <h4 className="font-medium text-white">{integration.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        integration.status === 'active' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {integration.status === 'active' ? 'Active' : 'Planned'}
                      </span>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <p className="text-sm text-gray-400 mb-4">{integration.description}</p>
                
                <div className="space-y-1">
                  <span className="text-xs text-gray-500">Features:</span>
                  <div className="flex flex-wrap gap-1">
                    {integration.features.map(feature => (
                      <span
                        key={feature}
                        className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-900/30 border-t border-gray-700">
                <button
                  disabled={integration.status !== 'active'}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    integration.status === 'active'
                      ? 'bg-[#88CED0] text-gray-900 hover:bg-[#88CED0]/80'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {integration.status === 'active' ? (
                    <>Configure <ExternalLink size={14} /></>
                  ) : (
                    'Coming Soon'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Roadmap Note */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
        <h4 className="font-medium text-white mb-3">Integration Roadmap</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h5 className="text-[#88CED0] font-medium mb-2">Phase 10.1</h5>
            <ul className="text-gray-400 space-y-1">
              <li>• Zeek integration</li>
              <li>• Basic log parsing</li>
              <li>• Protocol detection</li>
            </ul>
          </div>
          <div>
            <h5 className="text-[#88CED0] font-medium mb-2">Phase 10.2</h5>
            <ul className="text-gray-400 space-y-1">
              <li>• Suricata IDS</li>
              <li>• Alert correlation</li>
              <li>• Arkime PCAP search</li>
            </ul>
          </div>
          <div>
            <h5 className="text-[#88CED0] font-medium mb-2">Phase 10.3</h5>
            <ul className="text-gray-400 space-y-1">
              <li>• Neo4j graph analysis</li>
              <li>• MISP threat intel</li>
              <li>• Full stack deployment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationHub;
