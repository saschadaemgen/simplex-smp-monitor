/**
 * AnalyticsDashboardPage - ChutneX Analytics Controller
 * ======================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * Main controller that fetches ALL 112 fields from the API and
 * distributes them to the 8 analytics tabs.
 * 
 * Data Sources:
 * - REST API: /api/chutney/networks/{id}/analytics/ (38 network fields)
 * - REST API: /api/chutney/networks/{id}/nodes/ (34 node fields each)
 * - REST API: /api/chutney/networks/{id}/circuits/ (16 circuit fields)
 * - REST API: /api/chutney/networks/{id}/consensus/ (12 consensus fields)
 * - REST API: /api/chutney/networks/{id}/captures/ (24 capture fields)
 * - REST API: /api/chutney/networks/{id}/alerts/ (alert fields)
 * - WebSocket: Real-time events and bandwidth updates
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
  Download,
  Wifi,
  WifiOff,
} from 'lucide-react';

// Hooks
import { 
  useTorEvents, 
  useAnalytics, 
  type BandwidthData, 
  type CircuitData, 
  type TorEvent,
} from '../../../hooks/useTorWebSocket';

// Components
import { AnalyticsTabs, type AnalyticsTab } from '../../../components/chutneX/analytics/AnalyticsTabs';
import { OverviewTab } from '../../../components/chutneX/analytics/tabs/OverviewTab';
import { NodesTab } from '../../../components/chutneX/analytics/tabs/NodesTab';
import { CircuitsTab } from '../../../components/chutneX/analytics/tabs/CircuitsTab';
import { TrafficTab } from '../../../components/chutneX/analytics/tabs/TrafficTab';
import { ConsensusTab } from '../../../components/chutneX/analytics/tabs/ConsensusTab';
import { AuthoritiesTab } from '../../../components/chutneX/analytics/tabs/AuthoritiesTab';
import { ForensicsTab } from '../../../components/chutneX/analytics/tabs/ForensicsTab';
import { AlertsTab, type Alert } from '../../../components/chutneX/analytics/tabs/AlertsTab';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.15)';

// =============================================================================
// TYPES - Complete TorNetwork (ALL 38 fields)
// =============================================================================
export interface NetworkConfig {
  // Identification (4)
  id: string;
  name: string;
  slug: string;
  description: string;
  
  // Configuration (7)
  template: 'minimal' | 'basic' | 'standard' | 'forensic' | 'custom';
  num_directory_authorities: number;
  num_guard_relays: number;
  num_middle_relays: number;
  num_exit_relays: number;
  num_clients: number;
  num_hidden_services: number;
  
  // Docker (2)
  docker_network_name: string;
  container_prefix: string;
  
  // Port Ranges (4)
  base_control_port: number;
  base_socks_port: number;
  base_or_port: number;
  base_dir_port: number;
  
  // Tor Options (3)
  testing_tor_network: boolean;
  voting_interval: number;
  assume_reachable: boolean;
  
  // Traffic Capture (4)
  capture_enabled: boolean;
  capture_filter: string;
  max_capture_size_mb: number;
  capture_rotate_interval: number;
  
  // Status (3)
  status: 'created' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  status_message: string;
  bootstrap_progress: number;
  
  // Consensus (4)
  consensus_valid: boolean;
  consensus_valid_after: string | null;
  consensus_fresh_until: string | null;
  consensus_valid_until: string | null;
  
  // Statistics (4)
  total_circuits_created: number;
  total_bytes_transferred: number;
  total_cells_processed: number;
  total_nodes: number;
  
  // Timestamps (4)
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  stopped_at: string | null;
}

// =============================================================================
// TYPES - Complete TorNode (ALL 34 fields)
// =============================================================================
export interface NodeData {
  // Identification (5)
  id: string;
  network_id: string;
  name: string;
  node_type: 'da' | 'guard' | 'middle' | 'exit' | 'client' | 'hs';
  index: number;
  
  // Docker (2)
  container_id: string;
  container_name: string;
  
  // Network Config (4)
  control_port: number | null;
  socks_port: number | null;
  or_port: number | null;
  dir_port: number | null;
  
  // Tor Identity (3)
  fingerprint: string;
  v3_identity: string;
  nickname: string;
  
  // Hidden Service (3)
  onion_address: string;
  hs_port: number | null;
  hs_target_port: number | null;
  
  // Flags (1)
  flags: string[];
  
  // Status (3)
  status: 'created' | 'starting' | 'running' | 'bootstrapping' | 'stopping' | 'stopped' | 'error';
  status_message: string;
  bootstrap_progress: number;
  
  // Traffic Capture (3)
  capture_enabled: boolean;
  capture_interface: string;
  capture_file_path: string;
  
  // Statistics (4)
  bytes_read: number;
  bytes_written: number;
  circuits_created: number;
  circuits_active: number;
  
  // Bandwidth (2)
  bandwidth_rate: number;
  bandwidth_burst: number;
  
  // Timestamps (4)
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  last_seen: string | null;
}

// =============================================================================
// TYPES - Complete CircuitEvent (ALL 16 fields)
// =============================================================================
export interface CircuitEventData {
  id: string;
  network_id: string;
  circuit_id: string;
  status: 'LAUNCHED' | 'BUILT' | 'EXTENDED' | 'FAILED' | 'CLOSED';
  purpose: string;
  
  // Path information
  path: Array<{
    fingerprint: string;
    nickname: string;
  }>;
  path_length: number;
  
  // Build information
  build_flags: string[];
  reason: string | null;
  remote_reason: string | null;
  
  // Source
  source_node: string;
  source_node_id: string;
  source_node_type: string;
  
  // Timestamps
  created_at: string | null;
  timestamp: string;
}

// =============================================================================
// TYPES - Complete TrafficCapture (ALL 24 fields)
// =============================================================================
export interface CaptureData {
  // Identification (3)
  id: string;
  node_id: string;
  node_name: string;
  
  // Configuration (5)
  name: string;
  capture_type: 'full' | 'filtered' | 'tor_only';
  filter_expression: string;
  interface: string;
  file_path: string;
  
  // File Info (3)
  file_size_bytes: number;
  file_size_mb: number;
  file_hash_sha256: string;
  
  // Timing (3)
  started_at: string | null;
  stopped_at: string | null;
  duration_seconds: number;
  
  // Statistics (6)
  packet_count: number;
  bytes_captured: number;
  packets_dropped: number;
  packets_per_second: number;
  unique_flows: number;
  tor_cells_detected: number;
  
  // Analysis (4)
  status: 'idle' | 'capturing' | 'stopped' | 'analyzing' | 'completed' | 'error';
  first_packet_time: string | null;
  last_packet_time: string | null;
  avg_inter_packet_delay_ms: number | null;
  analysis_notes: string;
  related_circuit_id: string;
}

// =============================================================================
// TYPES - Consensus Data (12 fields)
// =============================================================================
export interface ConsensusData {
  is_valid: boolean;
  relay_count: number;
  authority_count: number;
  authorities_running: number;
  required_authorities: number;
  
  // Timestamps
  valid_after: string | null;
  fresh_until: string | null;
  valid_until: string | null;
  
  // Configuration
  voting_interval: number;
  dist_interval_seconds: number;
  testing_tor_network: boolean;
  assume_reachable: boolean;
}

// =============================================================================
// TYPES - Authority Data
// =============================================================================
export interface AuthorityData {
  id: string;
  name: string;
  nickname: string;
  fingerprint: string;
  v3_identity: string;
  status: 'online' | 'offline' | 'unknown';
  is_voting: boolean;
  reachable: boolean;
  address: string;
  or_port: number | undefined;
  dir_port: number | undefined;
  flags: string[];
  is_local: boolean;
  bytes_read: number;
  bytes_written: number;
  circuits_active: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const AnalyticsDashboardPage: React.FC = () => {
  const { id: networkId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ==========================================================================
  // STATE - UI
  // ==========================================================================
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    (searchParams.get('tab') as AnalyticsTab) || 'overview'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // ==========================================================================
  // STATE - Network Data (38 fields)
  // ==========================================================================
  const [network, setNetwork] = useState<NetworkConfig | null>(null);
  
  // ==========================================================================
  // STATE - Live Status Summary
  // ==========================================================================
  const [liveStatus, setLiveStatus] = useState({
    status: 'unknown' as string,
    bootstrap_progress: 0,
    consensus_valid: false,
  });
  
  // ==========================================================================
  // STATE - Nodes Summary
  // ==========================================================================
  const [nodesSummary, setNodesSummary] = useState({
    total: 0,
    running: 0,
    offline: 0,
    bootstrapping: 0,
    error: 0,
    by_type: {} as Record<string, number>,
  });
  
  // ==========================================================================
  // STATE - Traffic Summary
  // ==========================================================================
  const [traffic, setTraffic] = useState({
    bytes_read: 0,
    bytes_written: 0,
    total: 0,
    rate_read: 0,
    rate_written: 0,
  });
  
  // ==========================================================================
  // STATE - Circuits Summary
  // ==========================================================================
  const [circuitsSummary, setCircuitsSummary] = useState({
    total: 0,
    active: 0,
    built: 0,
    failed: 0,
    closed: 0,
    by_status: {} as Record<string, number>,
    by_purpose: {} as Record<string, number>,
  });
  
  // ==========================================================================
  // STATE - Authorities Summary
  // ==========================================================================
  const [authorities, setAuthorities] = useState({
    total: 0,
    running: 0,
    voting: 0,
    required: 0,
  });
  
  // ==========================================================================
  // STATE - Detailed Data Arrays
  // ==========================================================================
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [circuits, setCircuits] = useState<CircuitEventData[]>([]);
  const [consensus, setConsensus] = useState<ConsensusData | null>(null);
  const [captures, setCaptures] = useState<CaptureData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // ==========================================================================
  // STATE - Bandwidth History (for charts)
  // ==========================================================================
  const [bandwidthHistory, setBandwidthHistory] = useState<Array<{
    time: string;
    read: number;
    write: number;
    total: number;
  }>>([]);
  
  // ==========================================================================
  // WEBSOCKET HOOKS
  // ==========================================================================
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
  
  const isLive = eventState.isConnected || analyticsState.isConnected;
  
  // ==========================================================================
  // BUILD BANDWIDTH MAP (from nodes + WebSocket)
  // ==========================================================================
  const bandwidth = useMemo(() => {
    const map = new Map<string, BandwidthData>();
    
    // First, build from node data
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
    
    // Then merge with WebSocket data (live rates)
    wsBandwidth.forEach((bw, key) => {
      map.set(key, bw);
    });
    
    return map;
  }, [nodes, wsBandwidth]);
  
  // ==========================================================================
  // API FETCHING - Main Analytics
  // ==========================================================================
  const fetchAnalytics = useCallback(async () => {
    if (!networkId) return;
    
    try {
      const response = await fetch(`/api/chutney/networks/${networkId}/analytics/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Network (38 fields)
      if (data.network) {
        setNetwork(data.network);
      }
      
      // Live Status
      if (data.live_status) {
        setLiveStatus(data.live_status);
      }
      
      // Nodes Summary
      if (data.nodes) {
        setNodesSummary({
          total: data.nodes.total || 0,
          running: data.nodes.running || 0,
          offline: data.nodes.offline || 0,
          bootstrapping: data.nodes.bootstrapping || 0,
          error: data.nodes.error || 0,
          by_type: data.nodes.by_type || {},
        });
      }
      
      // Traffic Summary
      if (data.traffic) {
        setTraffic({
          bytes_read: data.traffic.bytes_read || 0,
          bytes_written: data.traffic.bytes_written || 0,
          total: data.traffic.total || (data.traffic.bytes_read || 0) + (data.traffic.bytes_written || 0),
          rate_read: data.traffic.rate_read || 0,
          rate_written: data.traffic.rate_written || 0,
        });
      }
      
      // Circuits Summary
      if (data.circuits) {
        setCircuitsSummary({
          total: data.circuits.total || 0,
          active: data.circuits.active || 0,
          built: data.circuits.built || 0,
          failed: data.circuits.failed || 0,
          closed: data.circuits.closed || 0,
          by_status: data.circuits.by_status || {},
          by_purpose: data.circuits.by_purpose || {},
        });
      }
      
      // Authorities Summary
      if (data.authorities) {
        setAuthorities({
          total: data.authorities.total || 0,
          running: data.authorities.running || 0,
          voting: data.authorities.voting || 0,
          required: data.authorities.required || 0,
        });
      }
      
      setLastUpdate(new Date());
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [networkId]);
  
  // ==========================================================================
  // API FETCHING - Nodes (34 fields each)
  // ==========================================================================
  const fetchNodes = useCallback(async () => {
    if (!networkId) return;
    
    try {
      const response = await fetch(`/api/chutney/networks/${networkId}/nodes/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.nodes && Array.isArray(data.nodes)) {
        setNodes(data.nodes);
      }
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
    }
  }, [networkId]);
  
  // ==========================================================================
  // API FETCHING - Circuits (16 fields each)
  // ==========================================================================
  const fetchCircuits = useCallback(async () => {
    if (!networkId) return;
    
    try {
      const response = await fetch(`/api/chutney/networks/${networkId}/circuits/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.circuits && Array.isArray(data.circuits)) {
        setCircuits(data.circuits);
      }
      
      // Update circuits summary with detailed by_status
      if (data.by_status) {
        setCircuitsSummary(prev => ({
          ...prev,
          by_status: data.by_status,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch circuits:', err);
    }
  }, [networkId]);
  
  // ==========================================================================
  // API FETCHING - Consensus (12 fields)
  // ==========================================================================
  const fetchConsensus = useCallback(async () => {
    if (!networkId) return;
    
    try {
      const response = await fetch(`/api/chutney/networks/${networkId}/consensus/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.consensus) {
        setConsensus(data.consensus);
      }
    } catch (err) {
      console.error('Failed to fetch consensus:', err);
    }
  }, [networkId]);
  
  // ==========================================================================
  // API FETCHING - Captures (24 fields each)
  // ==========================================================================
  const fetchCaptures = useCallback(async () => {
    if (!networkId) return;
    
    try {
      const response = await fetch(`/api/chutney/networks/${networkId}/captures/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.captures && Array.isArray(data.captures)) {
        setCaptures(data.captures);
      }
    } catch (err) {
      console.error('Failed to fetch captures:', err);
    }
  }, [networkId]);
  
  // ==========================================================================
  // API FETCHING - Alerts
  // ==========================================================================
  const fetchAlerts = useCallback(async () => {
    if (!networkId) return;
    
    try {
      const response = await fetch(`/api/chutney/networks/${networkId}/alerts/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.alerts && Array.isArray(data.alerts)) {
        setAlerts(data.alerts.map((a: any, i: number) => ({
          id: a.id || `alert-${i}`,
          severity: a.level === 'critical' ? 'critical' : 
                   a.level === 'error' ? 'critical' : 
                   a.level === 'warning' ? 'warning' : 'info',
          type: a.type || 'Unknown',
          message: a.message || '',
          timestamp: a.timestamp || new Date().toISOString(),
          node_id: a.node_id,
          node_name: a.node_name,
          acknowledged: a.acknowledged || false,
          details: a.details,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, [networkId]);
  
  // ==========================================================================
  // EFFECTS - Initial Fetch
  // ==========================================================================
  useEffect(() => {
    if (networkId) {
      fetchAnalytics();
      fetchNodes();
      fetchCircuits();
      fetchConsensus();
      fetchCaptures();
      fetchAlerts();
    }
  }, [networkId, fetchAnalytics, fetchNodes, fetchCircuits, fetchConsensus, fetchCaptures, fetchAlerts]);
  
  // ==========================================================================
  // EFFECTS - Auto Refresh (fast: 5s)
  // ==========================================================================
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalytics();
      fetchNodes();
      fetchCircuits();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchAnalytics, fetchNodes, fetchCircuits]);
  
  // ==========================================================================
  // EFFECTS - Auto Refresh (slow: 10s)
  // ==========================================================================
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConsensus();
      fetchCaptures();
      fetchAlerts();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [fetchConsensus, fetchCaptures, fetchAlerts]);
  
  // ==========================================================================
  // EFFECTS - Update Bandwidth History
  // ==========================================================================
  useEffect(() => {
    if (traffic.bytes_read === 0 && traffic.bytes_written === 0) return;
    
    const newSample = {
      time: new Date().toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
      }),
      read: traffic.bytes_read,
      write: traffic.bytes_written,
      total: traffic.bytes_read + traffic.bytes_written,
    };
    
    setBandwidthHistory(prev => {
      const updated = [...prev, newSample];
      return updated.slice(-60); // Keep last 60 samples (5 min at 5s interval)
    });
  }, [traffic.bytes_read, traffic.bytes_written]);
  
  // ==========================================================================
  // EFFECTS - Sync Tab with URL
  // ==========================================================================
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as AnalyticsTab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  
  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  const handleTabChange = useCallback((tab: AnalyticsTab) => {
    // Only update URL - useEffect syncs activeTab
    setSearchParams({ tab });
  }, [setSearchParams]);
  
  const handleRefresh = useCallback(() => {
    fetchAnalytics();
    fetchNodes();
    fetchCircuits();
    fetchConsensus();
    fetchCaptures();
    fetchAlerts();
    refreshAnalytics();
    requestSnapshot();
  }, [fetchAnalytics, fetchNodes, fetchCircuits, fetchConsensus, fetchCaptures, fetchAlerts, refreshAnalytics, requestSnapshot]);
  
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
  // COMPUTED - Tab Counts
  // ==========================================================================
  const tabCounts = useMemo(() => ({
    nodes: nodes.length,
    runningNodes: nodes.filter(n => n.status === 'running').length,
    circuits: circuits.length,
    alerts: alerts.filter(a => !a.acknowledged).length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    captures: captures.length,
  }), [nodes, circuits, alerts, captures]);
  
  // ==========================================================================
  // COMPUTED - Bandwidth by Node Type
  // ==========================================================================
  const nodesByType = useMemo(() => {
    const byType: Record<string, { bytes_read: number; bytes_written: number; count: number }> = {};
    nodes.forEach(node => {
      if (!byType[node.node_type]) {
        byType[node.node_type] = { bytes_read: 0, bytes_written: 0, count: 0 };
      }
      byType[node.node_type].bytes_read += node.bytes_read;
      byType[node.node_type].bytes_written += node.bytes_written;
      byType[node.node_type].count += 1;
    });
    return byType;
  }, [nodes]);
  
  // ==========================================================================
  // COMPUTED - Circuit Events (for CircuitsTab)
  // ==========================================================================
  const circuitEvents = useMemo(() => 
    events.filter(e => e.category === 'circuit'),
    [events]
  );
  
  // ==========================================================================
  // COMPUTED - Convert Circuits to CircuitData format
  // ==========================================================================
  const circuitData: CircuitData[] = useMemo(() => {
    // Prefer WebSocket data if available
    if (wsCircuits.length > 0) return wsCircuits;
    
    // Otherwise convert from REST API
    return circuits.map(c => ({
      circuit_id: c.circuit_id || c.id,
      status: c.status,
      path: c.path,
      path_length: c.path_length || c.path.length,
      purpose: c.purpose,
      build_flags: c.build_flags || [],
      reason: c.reason || null,
      source_node: c.source_node,
    }));
  }, [circuits, wsCircuits]);
  
  // ==========================================================================
  // COMPUTED - Authorities from Nodes
  // ==========================================================================
  const authorityNodes: AuthorityData[] = useMemo(() => {
    return nodes
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
        address: `127.0.0.1:${n.control_port || 9051}`,
        or_port: n.or_port ?? undefined,
        dir_port: n.dir_port ?? undefined,
        flags: n.flags || [],
        is_local: true,
        bytes_read: n.bytes_read,
        bytes_written: n.bytes_written,
        circuits_active: n.circuits_active,
      }));
  }, [nodes]);
  
  // ==========================================================================
  // RENDER - No Network Selected
  // ==========================================================================
  if (!networkId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <WifiOff size={48} className="mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-400 mb-2">No Network Selected</h2>
          <p className="text-gray-500">Please select a Tor network to view analytics</p>
          <button
            onClick={() => navigate('/chutney')}
            className="mt-4 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ backgroundColor: NEON_DIM, color: NEON }}
          >
            Go to Networks
          </button>
        </div>
      </div>
    );
  }
  
  // ==========================================================================
  // RENDER - Main Dashboard
  // ==========================================================================
  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* ================================================================== */}
      {/* HEADER                                                            */}
      {/* ================================================================== */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <button
            onClick={() => navigate('/chutney')}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors"
            title="Back to Networks"
          >
            <ArrowLeft size={20} />
          </button>
          
          {/* Network Info */}
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              {network?.name || 'Loading...'}
              {network?.template && (
                <span 
                  className="px-2 py-0.5 text-xs rounded"
                  style={{ backgroundColor: NEON_DIM, color: NEON }}
                >
                  {network.template}
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400">
              Real-time Tor Network Analytics • {nodes.length} Nodes • {circuits.length} Circuits
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: NEON_DIM }}
          >
            {isLive ? (
              <Wifi size={14} style={{ color: NEON }} className="animate-pulse" />
            ) : (
              <WifiOff size={14} className="text-gray-500" />
            )}
            <span style={{ color: isLive ? NEON : '#64748b' }}>
              {isLive ? 'Live' : 'Connecting...'}
            </span>
            {lastUpdate && (
              <span className="text-gray-500 ml-2">
                {lastUpdate.toLocaleTimeString('de-DE', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          {/* Export Button */}
          <button
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors"
            title="Export data"
          >
            <Download size={18} />
          </button>
          
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          
          {/* Settings Button */}
          <button
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>
      
      {/* ================================================================== */}
      {/* TAB NAVIGATION                                                    */}
      {/* ================================================================== */}
      <div className="flex-shrink-0">
        <AnalyticsTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isLive={isLive}
          counts={tabCounts}
        />
      </div>
      
      {/* ================================================================== */}
      {/* TAB CONTENT                                                       */}
      {/* ================================================================== */}
      <main className="flex-1 min-h-0 overflow-hidden">
        
        {/* ============================================================== */}
        {/* OVERVIEW TAB                                                   */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <OverviewTab
            networkId={networkId}
            network={network}
            isLive={isLive}
            nodesTotal={nodesSummary.total}
            nodesRunning={nodesSummary.running}
            nodesByType={nodesSummary.by_type}
            circuitsTotal={circuitsSummary.total}
            circuitsActive={circuitsSummary.active}
            circuitsByStatus={circuitsSummary.by_status}
            bytesRead={traffic.bytes_read}
            bytesWritten={traffic.bytes_written}
            bandwidth={bandwidth}
            bandwidthHistory={bandwidthHistory}
            authoritiesTotal={authorities.total}
            authoritiesRunning={authorities.running}
            authoritiesRequired={authorities.required}
            recentEvents={events.slice(0, 20)}
          />
        )}
        
        {/* ============================================================== */}
        {/* NODES TAB                                                      */}
        {/* ============================================================== */}
        {activeTab === 'nodes' && (
          <NodesTab
            nodes={nodes.map(n => ({
              id: n.id,
              name: n.name,
              node_type: n.node_type,
              status: n.status,
              fingerprint: n.fingerprint || undefined,
              nickname: n.nickname || undefined,
              v3_identity: n.v3_identity || undefined,
              control_port: n.control_port ?? undefined,
              socks_port: n.socks_port ?? undefined,
              or_port: n.or_port ?? undefined,
              dir_port: n.dir_port ?? undefined,
              bootstrap_progress: n.bootstrap_progress,
              flags: n.flags,
              bytes_read: n.bytes_read,
              bytes_written: n.bytes_written,
              circuits_active: n.circuits_active,
              bandwidth_rate: n.bandwidth_rate,
              bandwidth_burst: n.bandwidth_burst,
              hs_address: n.onion_address || undefined,
              hs_port: n.hs_port ?? undefined,
              container_name: n.container_name || undefined,
              container_id: n.container_id || undefined,
            }))}
            bandwidth={bandwidth}
            isLive={isLive}
          />
        )}
        
        {/* ============================================================== */}
        {/* CIRCUITS TAB                                                   */}
        {/* ============================================================== */}
        {activeTab === 'circuits' && (
          <CircuitsTab
            circuits={circuitData}
            circuitEvents={circuitEvents}
            isLive={isLive}
          />
        )}
        
        {/* ============================================================== */}
        {/* TRAFFIC TAB                                                    */}
        {/* ============================================================== */}
        {activeTab === 'traffic' && (
          <TrafficTab
            bandwidth={bandwidth}
            bandwidthHistory={bandwidthHistory}
            nodesByType={nodesByType}
            isLive={isLive}
          />
        )}
        
        {/* ============================================================== */}
        {/* CONSENSUS TAB                                                  */}
        {/* ============================================================== */}
        {activeTab === 'consensus' && (
          <ConsensusTab
            consensus={{
              is_valid: consensus?.is_valid ?? liveStatus.consensus_valid,
              relay_count: consensus?.relay_count ?? nodesSummary.total,
              authority_count: consensus?.authority_count ?? authorities.total,
              required_authorities: consensus?.required_authorities ?? authorities.required,
              valid_after: consensus?.valid_after ?? undefined,
              fresh_until: consensus?.fresh_until ?? undefined,
              valid_until: consensus?.valid_until ?? undefined,
              vote_interval_seconds: consensus?.voting_interval,
              dist_interval_seconds: consensus?.dist_interval_seconds,
            }}
            consensusHistory={[]}
            isLive={isLive}
          />
        )}
        
        {/* ============================================================== */}
        {/* AUTHORITIES TAB                                                */}
        {/* ============================================================== */}
        {activeTab === 'authorities' && (
          <AuthoritiesTab
            authorities={authorityNodes}
            requiredVotes={authorities.required}
            isLive={isLive}
          />
        )}
        
        {/* ============================================================== */}
        {/* FORENSICS TAB                                                  */}
        {/* ============================================================== */}
        {activeTab === 'forensics' && (
          <ForensicsTab
            events={events}
            isLive={isLive}
          />
        )}
        
        {/* ============================================================== */}
        {/* ALERTS TAB                                                     */}
        {/* ============================================================== */}
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
      
      {/* ================================================================== */}
      {/* ERROR TOAST                                                       */}
      {/* ================================================================== */}
      {error && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-lg bg-red-900/90 border border-red-700 text-red-200 text-sm">
          <strong>Error:</strong> {error}
          <button 
            onClick={() => setError(null)}
            className="ml-3 text-red-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboardPage;