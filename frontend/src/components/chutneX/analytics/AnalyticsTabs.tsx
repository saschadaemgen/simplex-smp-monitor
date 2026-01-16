/**
 * AnalyticsTabs - Tab Navigation Component (8 Tabs)
 * ==================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Complete tab navigation for ChutneX Analytics Dashboard.
 * 
 * 8 Tabs covering all ~80 database fields:
 * 1. Overview    - Network health, KPIs, activity feed
 * 2. Nodes       - Node grid with 30+ fields per node
 * 3. Circuits    - Circuit visualization, history, paths
 * 4. Traffic     - Bandwidth charts, top consumers
 * 5. Consensus   - Consensus validity, voting timeline
 * 6. Authorities - Directory Authority status grid
 * 7. Forensics   - Timeline, correlation, analysis
 * 8. Alerts      - Anomalies, warnings, acknowledge
 */
import React from 'react';
import { 
  LayoutDashboard, 
  Server, 
  GitBranch, 
  Activity,
  Shield,
  Building2,
  Search,
  AlertTriangle,
  Wifi
} from 'lucide-react';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';

// All 8 analytics tabs
export type AnalyticsTab = 
  | 'overview' 
  | 'nodes' 
  | 'circuits' 
  | 'traffic' 
  | 'consensus' 
  | 'authorities' 
  | 'forensics' 
  | 'alerts';

interface TabConfig {
  id: AnalyticsTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TABS: TabConfig[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: LayoutDashboard,
    description: 'Network health & KPIs'
  },
  { 
    id: 'nodes', 
    label: 'Nodes', 
    icon: Server,
    description: 'All node details'
  },
  { 
    id: 'circuits', 
    label: 'Circuits', 
    icon: GitBranch,
    description: 'Circuit paths & events'
  },
  { 
    id: 'traffic', 
    label: 'Traffic', 
    icon: Activity,
    description: 'Bandwidth & data flow'
  },
  { 
    id: 'consensus', 
    label: 'Consensus', 
    icon: Shield,
    description: 'Consensus validity'
  },
  { 
    id: 'authorities', 
    label: 'Dir Auth', 
    icon: Building2,
    description: 'Directory Authorities'
  },
  { 
    id: 'forensics', 
    label: 'Forensics', 
    icon: Search,
    description: 'Timeline & correlation'
  },
  { 
    id: 'alerts', 
    label: 'Alerts', 
    icon: AlertTriangle,
    description: 'Anomalies & warnings'
  },
];

interface AnalyticsTabsProps {
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
  isLive?: boolean;
  counts?: {
    nodes?: number;
    runningNodes?: number;
    circuits?: number;
    captures?: number;
    alerts?: number;
    criticalAlerts?: number;
  };
}

export const AnalyticsTabs: React.FC<AnalyticsTabsProps> = ({
  activeTab,
  onTabChange,
  isLive = false,
  counts = {},
}) => {
  return (
    <div className="bg-gray-800/30 border-b border-gray-700/50">
      <div className="px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide">
          {/* Live Indicator (compact) */}
          {isLive && (
            <div 
              className="flex items-center gap-1.5 px-2 py-1 mr-2 rounded border"
              style={{ 
                backgroundColor: NEON_DIM, 
                borderColor: 'rgba(136, 206, 208, 0.3)' 
              }}
            >
              <Wifi size={12} style={{ color: NEON }} className="animate-pulse" />
              <span className="text-xs font-medium" style={{ color: NEON }}>LIVE</span>
            </div>
          )}
          
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            // Get count/badge for this tab
            let badge: string | number | undefined;
            let badgeColor = NEON;
            
            if (tab.id === 'nodes' && counts.nodes !== undefined) {
              badge = counts.runningNodes !== undefined 
                ? `${counts.runningNodes}/${counts.nodes}`
                : counts.nodes;
            }
            if (tab.id === 'circuits' && counts.circuits !== undefined) {
              badge = counts.circuits;
            }
            if (tab.id === 'alerts' && counts.alerts !== undefined) {
              badge = counts.alerts;
              if (counts.criticalAlerts && counts.criticalAlerts > 0) {
                badgeColor = '#f87171'; // Red for critical
              }
            }

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.description}
                className={`
                  flex items-center gap-2 px-3 py-2.5 rounded-t-lg font-medium 
                  transition-all whitespace-nowrap relative group
                  ${isActive 
                    ? 'text-white bg-gray-900/80' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }
                `}
                style={isActive ? { borderBottom: `2px solid ${NEON}` } : undefined}
              >
                <Icon 
                  size={16} 
                  style={isActive ? { color: NEON } : undefined}
                  className="flex-shrink-0"
                />
                <span className="hidden sm:inline">{tab.label}</span>
                
                {/* Badge */}
                {badge !== undefined && (
                  <span 
                    className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                    style={{ 
                      backgroundColor: isActive 
                        ? `${badgeColor}33` 
                        : 'rgba(100, 116, 139, 0.3)',
                      color: isActive ? badgeColor : '#94a3b8'
                    }}
                  >
                    {badge}
                  </span>
                )}
                
                {/* Tooltip on hover */}
                <div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                             px-2 py-1 rounded text-xs whitespace-nowrap
                             opacity-0 group-hover:opacity-100 transition-opacity
                             pointer-events-none z-50"
                  style={{ backgroundColor: '#1e293b', color: NEON }}
                >
                  {tab.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTabs;