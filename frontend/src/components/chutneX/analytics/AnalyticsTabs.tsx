/**
 * AnalyticsTabs - Tab Navigation
 */
import React from 'react';
import { AnalyticsTab } from '../types';
import { 
  LayoutDashboard, Server, GitBranch, Activity,
  Search, Network, Plug
} from 'lucide-react';

interface AnalyticsTabsProps {
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
  circuitCount?: number;
  nodeCount?: number;
}

const tabs: { id: AnalyticsTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'nodes', label: 'Nodes', icon: Server },
  { id: 'circuits', label: 'Circuits', icon: GitBranch },
  { id: 'traffic', label: 'Traffic', icon: Activity },
  { id: 'forensics', label: 'Forensics', icon: Search },
  { id: 'topology', label: 'Topology', icon: Network },
  { id: 'integration', label: 'Integration', icon: Plug },
];

export const AnalyticsTabs: React.FC<AnalyticsTabsProps> = ({
  activeTab,
  onTabChange,
  circuitCount,
  nodeCount,
}) => {
  return (
    <div className="bg-gray-800/30 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            let badge = null;
            if (tab.id === 'circuits' && circuitCount !== undefined) {
              badge = circuitCount;
            } else if (tab.id === 'nodes' && nodeCount !== undefined) {
              badge = nodeCount;
            }

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-gray-900 text-[#88CED0] border-b-2 border-[#88CED0]'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {badge !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#88CED0]/20' : 'bg-gray-700'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTabs;
