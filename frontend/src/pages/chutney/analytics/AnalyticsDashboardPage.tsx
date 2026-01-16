/**
 * AnalyticsDashboardPage - Main ChutneX Analytics Controller
 * ===========================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Main page component that orchestrates all 8 analytics tabs
 * with real-time WebSocket updates and REST API fallback.
 * 
 * Path: frontend/src/pages/chutney/analytics/AnalyticsDashboardPage.tsx
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// Hooks
import { useTorEvents, useAnalytics, type BandwidthData, type CircuitData, type TorEvent } from '../../../hooks/useTorWebSocket';

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
  nodes_by_type: Record<string, number>;
  total_circuits: number;
  active_circuits: number;
  bytes_read: number;
  bytes_written: number;
}

interface ApiCircuit {
  id: string;
  status: string;
  purpose: string;
  path: string[];
  source_node: string;
  source_node_id: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [nodes, setNodes] = useState<TorNodeData[]>([]);
  const [apiCircuits, setApiCircuits] = useState<ApiCircuit[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [consensusData, setConsensusData] = useState<any>(null);
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
    circuits: wsCircuits,
    bandwidth: wsBandwidth,
    requestSnapshot,
  } = useTorEvents(networkId || '', {
    autoConnect: !!networkId,
    categories: ['circuit', 'bandwidth', 'node_status', 'alert'],
    maxEvents: 500,
  });
  
  const {
    state: analyticsState,
    refresh: refreshAnalytics,
  } = useAnalytics(networkId || '', {
    autoConnect: !!networkId,
    refreshInterval: 5000,
  });
  
  // Combined connection state
  const isLive = eventState.isConnected || analyticsState.isConnected;
  
  // Build bandwidth map from nodes (REST API data)
  const bandwidth = useMemo(() => {
    const map = new Map<string, BandwidthData>();
    nodes.forEach(node => {
      map.set(node.id, {
        node_id: node.id,
        node_name: node.name,
        bytes_read: node.bytes_read || 0,
        bytes_written: node.bytes_written || 0,
        avg_bytes_read: 0,
        avg_bytes_written: 0,
        sample_count: 1,
        interval_seconds: 1,
      });
    });
    // Merge with WebSocket data if available
    wsBandwidth.forEach((bw, key) => {
      map.set(key, bw);
    });
    return map;
  }, [nodes, wsBandwidth]);
  
  // Convert API circuits to CircuitData format
  const circuits: CircuitData[] = useMemo(() => {
    // Use WebSocket circuits if available, otherwise API circuits
    if (wsCircuits.length > 0) return wsCircuits;
    
    return apiCircuits.map(c => ({
      circuit_id: c.id,
      status: c.status,
      path: c.path.map(fp => ({ fingerprint: fp, nickname: fp.substring(0, 8) })),
      path_length: c.path.length,
      purpose: c.purpose,
      build_flags: [],
      reason: null,
      source_node: c.source_node,
    }));
  }, [apiCircuits, wsCircuits]);
  
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
  
  // Fetch initial network data (analytics overview)
  useEffect(() => {
    if (!networkId) return;
    
    const fetchNetworkData = async () => {
      setIsLoading(true);
      try {
        // CORRECT URL: /api/chutney/networks/{id}/analytics/
        const response = await fetch(`/api/chutney/networks/${networkId}/analytics/`);
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
            nodes_by_type: data.nodes.by_type || {},
            total_circuits: data.circuits.total,
            active_circuits: data.circuits.active,
            bytes_read: data.traffic.bytes_read,
            bytes_written: data.traffic.bytes_written,
          });
        }
      } catch (error) {
        console.error('Failed to fetch network data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNetworkData();
    // Refresh every 5 seconds
    const interval = setInterval(fetchNetworkData, 5000);
    return () => clearInterval(interval);
  }, [networkId]);
  
  // Fetch nodes
  useEffect(() => {
    if (!networkId) return;
    
    const fetchNodes = async () => {
      try {
        // CORRECT URL: /api/chutney/networks/{id}/nodes/
        const response = await fetch(`/api/chutney/networks/${networkId}/nodes/`);
        if (response.ok) {
          const data = await response.json();
          setNodes(data.nodes.map((n: any) => ({
            id: n.id,
            name: n.name,
            node_type: n.node_type,
            status: n.status,
            control_port: n.control_port,
            or_port: n.or_port,
            dir_port: n.dir_port,
            socks_port: n.socks_port,
            fingerprint: n.fingerprint,
            nickname: n.name,
            v3_identity: null,
            address: `127.0.0.1:${n.control_port}`,
            flags: n.flags || [],
            bytes_read: n.bytes_read || 0,
            bytes_written: n.bytes_written || 0,
            circuit_count: n.circuit_count || 0,
            bootstrap_progress: n.bootstrap_progress || 0,
            version: n.version,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch nodes:', error);
      }
    };
    
    fetchNodes();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, [networkId]);
  
  // Fetch circuits
  useEffect(() => {
    if (!networkId) return;
    
    const fetchCircuits = async () => {
      try {
        // CORRECT URL: /api/chutney/networks/{id}/circuits/
        const response = await fetch(`/api/chutney/networks/${networkId}/circuits/`);
        if (response.ok) {
          const data = await response.json();
          setApiCircuits(data.circuits || []);
        }
      } catch (error) {
        console.error('Failed to fetch circuits:', error);
      }
    };
    
    fetchCircuits();
    const interval = setInterval(fetchCircuits, 5000);
    return () => clearInterval(interval);
  }, [networkId]);
  
  // Fetch consensus
  useEffect(() => {
    if (!networkId) return;
    
    const fetchConsensus = async () => {
      try {
        // CORRECT URL: /api/chutney/networks/{id}/consensus/
        const response = await fetch(`/api/chutney/networks/${networkId}/consensus/`);
        if (response.ok) {
          const data = await response.json();
          setConsensusData(data.consensus);
        }
      } catch (error) {
        console.error('Failed to fetch consensus:', error);
      }
    };
    
    fetchConsensus();
  }, [networkId]);
  
  // Fetch alerts
  useEffect(() => {
    if (!networkId) return;
    
    const fetchAlerts = async () => {
      try {
        // CORRECT URL: /api/chutney/networks/{id}/alerts/
        const response = await fetch(`/api/chutney/networks/${networkId}/alerts/`);
        if (response.ok) {
          const data = await response.json();
          setAlerts((data.alerts || []).map((a: any, i: number) => ({
            id: a.id || `alert-${i}`,
            severity: a.level === 'critical' ? 'critical' : a.level === 'error' ? 'critical' : a.level === 'warning' ? 'warning' : 'info',
            type: a.type || 'Unknown',
            message: a.message || '',
            timestamp: a.timestamp || new Date().toISOString(),
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
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [networkId]);
  
  // Update bandwidth history
  useEffect(() => {
    if (!networkData) return;
    
    const newSample = {
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      read: networkData.bytes_read,
      write: networkData.bytes_written,
      total: networkData.bytes_read + networkData.bytes_written,
    };
    
    setBandwidthHistory(prev => {
      const updated = [...prev, newSample];
      return updated.slice(-60); // Keep last 60 samples
    });
  }, [networkData?.bytes_read, networkData?.bytes_written]);
  
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
  }, []);
  
  const handleDismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);
  
  const handleDismissAllAlerts = useCallback(() => {
    setAlerts([]);
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
  
  // Bandwidth by node type for TrafficTab
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
  
  // Circuit events for CircuitsTab
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
              {networkData?.name || 'Loading...'}
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
        {activeTab === 'overview' && networkData && (
          <OverviewTab
            networkId={networkId}
            networkName={networkData.name}
            networkStatus={networkData.status}
            isLive={isLive}
            totalNodes={networkData.total_nodes}
            runningNodes={networkData.nodes_running}
            nodesByType={networkData.nodes_by_type}
            totalCircuits={networkData.total_circuits}
            activeCircuits={networkData.active_circuits}
            bandwidth={bandwidth}
            bandwidthHistory={bandwidthHistory}
            recentEvents={events.slice(0, 20)}
            consensusValid={networkData.consensus_valid}
            bootstrapProgress={networkData.bootstrap_progress}
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
        
        {activeTab === 'consensus' && (
          <ConsensusTab
            consensus={consensusData || {
              is_valid: networkData?.consensus_valid || false,
              relay_count: networkData?.total_nodes || 0,
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