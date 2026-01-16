/**
 * AnalyticsDashboardPage - Main ChutneX Analytics Controller
 * ===========================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Main page component that orchestrates all 8 analytics tabs
 * with real-time WebSocket updates and state management.
 * 
 * Path: frontend/src/pages/chutney/analytics/AnalyticsDashboardPage.tsx
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// Hooks
import { useTorEvents, useAnalytics, formatBytes } from '../../../hooks/useTorWebSocket';

// Components
import { AnalyticsTabs, type AnalyticsTab } from '../../../components/chutneX/analytics/AnalyticsTabs';
import { OverviewTab } from '../../../components/chutneX/analytics/tabs/OverviewTab';
import { NodesTab, type TorNodeData } from '../../../components/chutneX/analytics/tabs/NodesTab';
import { CircuitsTab } from '../../../components/chutneX/analytics/tabs/CircuitsTab';
import { TrafficTab } from '../../../components/chutneX/analytics/tabs/TrafficTab';
import { ConsensusTab } from '../../../components/chutneX/analytics/tabs/ConsensusTab';
import { AuthoritiesTab } from '../../../components/chutneX/analytics/tabs/AuthoritiesTab';
import { ForensicsTab } from '../../../components/chutneX/analytics/tabs/ForensicsTab';
import { AlertsTab, type Alert } from '../../../components/chutneX/analytics/tabs/AlertsTab';

const NEON = '#88CED0';

// =============================================================================
// TYPES
// =============================================================================

interface NetworkData {
  id: string;
  name: string;
  status: string;
  bootstrap_progress: number;
  consensus_valid: boolean;
  total_nodes: number;
  nodes_running: number;
  total_circuits: number;
  bytes_read: number;
  bytes_written: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AnalyticsDashboardPage: React.FC = () => {
  const { id: networkId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    (searchParams.get('tab') as AnalyticsTab) || 'overview'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [nodes, setNodes] = useState<TorNodeData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [bandwidthHistory, setBandwidthHistory] = useState<Array<{
    time: string;
    read: number;
    write: number;
    total: number;
  }>>([]);
  
  // WebSocket hooks
  const {
    state: eventState,
    events,
    circuits,
    bandwidth,
    subscribe,
    requestSnapshot,
  } = useTorEvents(networkId || '', {
    autoConnect: !!networkId,
    categories: ['circuit', 'bandwidth', 'node_status', 'alert'],
    maxEvents: 500,
  });
  
  const {
    state: analyticsState,
    stats,
    refresh: refreshAnalytics,
  } = useAnalytics(networkId || '', {
    autoConnect: !!networkId,
    refreshInterval: 5000,
  });
  
  // Combined connection state
  const isLive = eventState.isConnected || analyticsState.isConnected;
  
  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  
  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as AnalyticsTab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  
  // Update URL when tab changes
  const handleTabChange = useCallback((tab: AnalyticsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  }, [setSearchParams]);
  
  // Fetch initial network data
  useEffect(() => {
    if (!networkId) return;
    
    const fetchNetworkData = async () => {
      try {
        const response = await fetch(`/api/chutney/networks/${networkId}/analytics/overview/`);
        if (response.ok) {
          const data = await response.json();
          setNetworkData({
            id: data.network.id,
            name: data.network.name,
            status: data.network.status,
            bootstrap_progress: data.network.bootstrap_progress,
            consensus_valid: data.network.consensus_valid,
            total_nodes: data.nodes.total,
            nodes_running: data.nodes.running,
            total_circuits: data.activity?.circuits_last_hour || 0,
            bytes_read: data.traffic.bytes_read,
            bytes_written: data.traffic.bytes_written,
          });
        }
      } catch (error) {
        console.error('Failed to fetch network data:', error);
      }
    };
    
    fetchNetworkData();
  }, [networkId]);
  
  // Fetch nodes for Nodes tab
  useEffect(() => {
    if (!networkId || activeTab !== 'nodes') return;
    
    const fetchNodes = async () => {
      try {
        const response = await fetch(`/api/chutney/networks/${networkId}/analytics/nodes/`);
        if (response.ok) {
          const data = await response.json();
          setNodes(data.nodes);
        }
      } catch (error) {
        console.error('Failed to fetch nodes:', error);
      }
    };
    
    fetchNodes();
  }, [networkId, activeTab]);
  
  // Fetch alerts for Alerts tab
  useEffect(() => {
    if (!networkId || activeTab !== 'alerts') return;
    
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`/api/chutney/networks/${networkId}/analytics/alerts/`);
        if (response.ok) {
          const data = await response.json();
          setAlerts(data.alerts.map((a: any, i: number) => ({
            id: a.id || `alert-${i}`,
            severity: a.severity || 'info',
            type: a.alert_type || 'Unknown',
            message: a.message || '',
            timestamp: a.time || new Date().toISOString(),
            node_id: a.node_id,
            node_name: a.node_name,
            acknowledged: false,
            details: a.details,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      }
    };
    
    fetchAlerts();
  }, [networkId, activeTab]);
  
  // Update bandwidth history from WebSocket events
  useEffect(() => {
    if (bandwidth.size === 0) return;
    
    // Aggregate all node bandwidth
    let totalRead = 0;
    let totalWritten = 0;
    bandwidth.forEach(bw => {
      totalRead += bw.bytes_read;
      totalWritten += bw.bytes_written;
    });
    
    const newSample = {
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      read: totalRead,
      write: totalWritten,
      total: totalRead + totalWritten,
    };
    
    setBandwidthHistory(prev => {
      const updated = [...prev, newSample];
      // Keep last 60 samples (5 minutes at 5s intervals)
      return updated.slice(-60);
    });
  }, [bandwidth]);
  
  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  const handleRefresh = useCallback(() => {
    refreshAnalytics();
    requestSnapshot();
  }, [refreshAnalytics, requestSnapshot]);
  
  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
    // TODO: Send to backend
  }, []);
  
  const handleDismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    // TODO: Send to backend
  }, []);
  
  const handleDismissAllAlerts = useCallback(() => {
    setAlerts([]);
    // TODO: Send to backend
  }, []);
  
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);
  
  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  
  const tabCounts = useMemo(() => ({
    nodes: nodes.length,
    runningNodes: nodes.filter(n => n.status === 'running').length,
    circuits: circuits.length,
    alerts: alerts.filter(a => !a.acknowledged).length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
  }), [nodes, circuits, alerts]);
  
  const nodesByType = useMemo(() => {
    const byType: Record<string, { bytes_read: number; bytes_written: number }> = {};
    nodes.forEach(node => {
      if (!byType[node.node_type]) {
        byType[node.node_type] = { bytes_read: 0, bytes_written: 0 };
      }
      byType[node.node_type].bytes_read += node.bytes_read;
      byType[node.node_type].bytes_written += node.bytes_written;
    });
    return byType;
  }, [nodes]);
  
  // Filter events by category for tabs
  const circuitEvents = useMemo(() => 
    events.filter(e => e.category === 'circuit'),
    [events]
  );
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  if (!networkId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-gray-500">No network selected</div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-900/80">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/chutney')}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <h1 className="text-lg font-semibold text-white">
              {networkData?.name || 'ChutneX Analytics'}
            </h1>
            <p className="text-xs text-gray-400">
              Real-time Tor Network Monitoring
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
            isLive ? 'bg-[#88CED0]/10' : 'bg-gray-800/50'
          }`}>
            <span 
              className={`w-2 h-2 rounded-full ${isLive ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: isLive ? NEON : '#64748b' }}
            />
            <span style={{ color: isLive ? NEON : '#64748b' }}>
              {isLive ? 'Live' : 'Connecting...'}
            </span>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"
            title="Refresh data"
          >
            <RefreshCw size={18} />
          </button>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          
          {/* Settings */}
          <button
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <AnalyticsTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isLive={isLive}
        counts={tabCounts}
      />
      
      {/* Tab Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <OverviewTab
            networkId={networkId}
            networkName={networkData?.name || ''}
            networkStatus={networkData?.status || 'unknown'}
            isLive={isLive}
            totalNodes={networkData?.total_nodes || 0}
            runningNodes={networkData?.nodes_running || 0}
            nodesByType={Object.fromEntries(
              Object.entries(nodesByType).map(([k, v]) => [k, v.bytes_read + v.bytes_written])
            ) as Record<string, number>}
            totalCircuits={networkData?.total_circuits || 0}
            activeCircuits={circuits.length}
            bandwidth={bandwidth}
            bandwidthHistory={bandwidthHistory}
            recentEvents={events.slice(0, 20)}
            consensusValid={networkData?.consensus_valid || false}
            bootstrapProgress={networkData?.bootstrap_progress || 0}
          />
        )}
        
        {activeTab === 'nodes' && (
          <NodesTab
            nodes={nodes}
            bandwidth={bandwidth}
            isLive={isLive}
          />
        )}
        
        {activeTab === 'circuits' && (
          <CircuitsTab
            circuits={circuits}
            circuitEvents={circuitEvents}
            isLive={isLive}
          />
        )}
        
        {activeTab === 'traffic' && (
          <TrafficTab
            bandwidth={bandwidth}
            bandwidthHistory={bandwidthHistory}
            nodesByType={nodesByType}
            isLive={isLive}
          />
        )}
        
        {activeTab === 'consensus' && networkData && (
          <ConsensusTab
            consensus={{
              is_valid: networkData.consensus_valid,
              relay_count: networkData.total_nodes,
              authority_count: nodes.filter(n => n.node_type === 'da').length,
              required_authorities: Math.floor(nodes.filter(n => n.node_type === 'da').length / 2) + 1,
            }}
            consensusHistory={[]}
            isLive={isLive}
          />
        )}
        
        {activeTab === 'authorities' && (
          <AuthoritiesTab
            authorities={nodes
              .filter(n => n.node_type === 'da')
              .map(n => ({
                id: n.id,
                name: n.name,
                nickname: n.nickname || n.name,
                fingerprint: n.fingerprint,
                v3_identity: n.v3_identity,
                status: n.status === 'running' ? 'online' as const : 'offline' as const,
                is_voting: n.bootstrap_progress >= 100,
                reachable: n.status === 'running',
                address: n.address,
                or_port: n.or_port,
                dir_port: n.dir_port,
                flags: n.flags,
                is_local: true,
              }))}
            requiredVotes={Math.floor(nodes.filter(n => n.node_type === 'da').length / 2) + 1}
            isLive={isLive}
          />
        )}
        
        {activeTab === 'forensics' && (
          <ForensicsTab
            events={events}
            isLive={isLive}
          />
        )}
        
        {activeTab === 'alerts' && (
          <AlertsTab
            alerts={alerts}
            onAcknowledge={handleAcknowledgeAlert}
            onDismiss={handleDismissAlert}
            onDismissAll={handleDismissAllAlerts}
            isLive={isLive}
          />
        )}
      </main>
    </div>
  );
};

export default AnalyticsDashboardPage;