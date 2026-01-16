/**
 * ChutneX Analytics - TypeScript Types
 * =====================================
 * Complete type definitions for Tor network forensic analysis
 */

// =============================================================================
// ENUMS
// =============================================================================

export type NodeType = 'da' | 'guard' | 'middle' | 'exit' | 'client' | 'hs';
export type NodeStatus = 'not_created' | 'starting' | 'bootstrapping' | 'running' | 'stopped' | 'error';
export type NetworkStatus = 'not_created' | 'creating' | 'bootstrapping' | 'running' | 'stopping' | 'stopped' | 'error';
export type CircuitStatus = 'LAUNCHED' | 'BUILT' | 'EXTENDED' | 'FAILED' | 'CLOSED';
export type CircuitPurpose = 'GENERAL' | 'HS_CLIENT_INTRO' | 'HS_CLIENT_REND' | 'HS_SERVICE_INTRO' | 'HS_SERVICE_REND' | 'TESTING' | 'CONTROLLER' | 'CONFLUX_LINKED' | 'HS_VANGUARDS';
export type CaptureStatus = 'recording' | 'completed' | 'analyzing' | 'analyzed' | 'error' | 'deleted';
export type CaptureType = 'continuous' | 'triggered' | 'manual' | 'circuit';

// =============================================================================
// NODE TYPES
// =============================================================================

export interface TorNode {
  id: string;
  name: string;
  node_type: NodeType;
  node_type_icon: string;
  index: number;
  status: NodeStatus;
  status_display: string;
  is_running: boolean;
  
  // Ports
  control_port: number | null;
  socks_port: number | null;
  or_port: number | null;
  dir_port: number | null;
  
  // Identity
  fingerprint: string;
  v3_identity?: string;
  nickname: string;
  
  // Relay Flags (from consensus)
  flags?: string[];
  
  // Bandwidth
  bandwidth_rate: number;
  bandwidth_burst: number;
  bytes_read: number;
  bytes_written: number;
  total_bandwidth: number;
  
  // Circuits
  circuits_created: number;
  circuits_active: number;
  
  // Bootstrap
  bootstrap_progress: number;
  bootstrap_phase?: string;
  
  // Hidden Service
  onion_address?: string;
  hs_port?: number;
  hs_target_port?: number;
  
  // Capture
  capture_enabled: boolean;
  capture_interface?: string;
  capture_file_path?: string;
  
  // Container
  container_id?: string;
  container_name?: string;
  
  // Timestamps
  started_at: string | null;
  last_seen?: string;
  
  // Live data (from TorControlService)
  version?: string;
  uptime?: number;
}

export interface NodeStats {
  node_id: string;
  node_name: string;
  node_type: NodeType;
  version: string;
  uptime: number;
  fingerprint: string;
  bytes_read: number;
  bytes_written: number;
  bootstrap_phase: string;
  bootstrap_progress: number;
}

// =============================================================================
// NETWORK TYPES
// =============================================================================

export interface TorNetwork {
  id: string;
  name: string;
  slug: string;
  description?: string;
  template: string;
  status: NetworkStatus;
  status_display: string;
  status_message?: string;
  
  // Node counts
  num_directory_authorities: number;
  num_guard_relays: number;
  num_middle_relays: number;
  num_exit_relays: number;
  num_clients: number;
  num_hidden_services: number;
  total_nodes: number;
  running_nodes_count: number;
  
  // Port ranges
  base_control_port: number;
  base_or_port: number;
  base_dir_port: number;
  base_socks_port: number;
  
  // Aggregated stats
  total_circuits_created: number;
  total_bytes_transferred: number;
  total_cells_processed: number;
  
  // Consensus
  consensus_valid: boolean;
  consensus_valid_after?: string;
  consensus_fresh_until?: string;
  consensus_valid_until?: string;
  bootstrap_progress: number;
  
  // Capture settings
  capture_enabled: boolean;
  capture_filter?: string;
  max_capture_size_mb: number;
  capture_rotate_interval: number;
  
  // Docker
  docker_network_name?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  started_at?: string;
  stopped_at?: string;
  
  // Relations
  nodes?: TorNode[];
}

// =============================================================================
// CIRCUIT TYPES
// =============================================================================

export interface CircuitHop {
  fingerprint: string;
  nickname: string;
  ip?: string;
}

export interface Circuit {
  circuit_id: string;
  status: CircuitStatus | string;
  purpose: CircuitPurpose | string;
  path: CircuitHop[];
  path_length: number;
  build_flags: string[];
  source_node: string;
  source_node_id?: string;
  build_time_ms?: number;
}

export interface CircuitEvent {
  id: string;
  network_id: string;
  circuit_id: string;
  event_type: 'launched' | 'built' | 'extended' | 'failed' | 'closed';
  purpose: CircuitPurpose;
  path: CircuitHop[];
  path_length: number;
  status: string;
  reason?: string;
  remote_reason?: string;
  event_time: string;
  build_time_ms?: number;
  source_node?: string;
  raw_event?: Record<string, unknown>;
}

export interface CircuitStats {
  total_circuits: number;
  built_circuits: number;
  by_status: Record<string, number>;
  by_purpose: Record<string, number>;
  avg_build_time_ms?: number;
  circuits: Circuit[];
  timestamp: string;
}

// =============================================================================
// BANDWIDTH TYPES
// =============================================================================

export interface BandwidthByType {
  bytes_read: number;
  bytes_written: number;
  node_count: number;
}

export interface NetworkBandwidth {
  total_bytes_read: number;
  total_bytes_written: number;
  total_bytes: number;
  nodes_reporting: number;
  by_type: Record<NodeType, BandwidthByType>;
  timestamp: string;
}

export interface BandwidthSample {
  timestamp: string;
  bytes_read: number;
  bytes_written: number;
}

// =============================================================================
// CONSENSUS TYPES
// =============================================================================

export interface ConsensusInfo {
  valid: boolean;
  valid_after: string | null;
  fresh_until: string | null;
  valid_until: string | null;
  tor_version: string;
  source_da: string;
  timestamp: string;
}

// =============================================================================
// TRAFFIC CAPTURE TYPES
// =============================================================================

export interface TrafficCapture {
  id: string;
  node_id: string;
  node_name?: string;
  
  // File info
  file_path: string;
  file_size_bytes: number;
  file_hash_sha256?: string;
  
  // Timing
  started_at: string;
  stopped_at?: string;
  duration_seconds: number;
  
  // Statistics
  packet_count: number;
  bytes_captured: number;
  packets_dropped: number;
  
  // Analysis
  unique_flows: number;
  tor_cells_detected: number;
  first_packet_time?: string;
  last_packet_time?: string;
  avg_inter_packet_delay_ms?: number;
  
  // Metadata
  status: CaptureStatus;
  capture_type: CaptureType;
  analysis_notes?: string;
  related_circuit_id?: string;
}

// =============================================================================
// ANALYTICS RESPONSE TYPES
// =============================================================================

export interface NetworkAnalytics {
  network_id: string;
  network_name: string;
  network_status: NetworkStatus;
  bandwidth: NetworkBandwidth;
  circuits: CircuitStats;
  consensus: ConsensusInfo | null;
  nodes: {
    total: number;
    running: number;
    stats: NodeStats[];
  };
  summary: {
    total_bytes: number;
    active_circuits: number;
    consensus_valid: boolean;
    avg_node_uptime: number;
  };
  timestamp: string;
}

// =============================================================================
// FORENSIC ANALYSIS TYPES
// =============================================================================

export interface TimingCorrelation {
  entry_node: string;
  exit_node: string;
  correlation_score: number;
  time_offset_ms: number;
  confidence: number;
  sample_count: number;
}

export interface TrafficPattern {
  pattern_type: 'burst' | 'steady' | 'periodic' | 'irregular';
  avg_packet_size: number;
  packet_size_variance: number;
  inter_arrival_time_ms: number;
  burst_count?: number;
}

export interface FlowAnalysis {
  flow_id: string;
  src_node: string;
  dst_node: string;
  protocol: string;
  packets: number;
  bytes: number;
  start_time: string;
  end_time: string;
  duration_ms: number;
}

export interface CellAnalysis {
  total_cells: number;
  cell_types: Record<string, number>;
  avg_cell_rate: number;
  tor_overhead_percent: number;
}

// =============================================================================
// VISUALIZATION TYPES
// =============================================================================

export interface TopologyNode {
  id: string;
  label: string;
  type: NodeType;
  icon: string;
  status: NodeStatus;
  group: string;
  x?: number;
  y?: number;
}

export interface TopologyEdge {
  from: string;
  to: string;
  type: 'consensus' | 'directory' | 'circuit' | 'traffic';
  weight?: number;
}

export interface NetworkTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// =============================================================================
// INTEGRATION PLACEHOLDERS (Phase 10)
// =============================================================================

export interface ZeekLog {
  log_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface SuricataAlert {
  alert_id: string;
  signature: string;
  severity: number;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
}

export interface ArkimeSession {
  session_id: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  packets: number;
  bytes: number;
  timestamp: string;
}

export interface ThreatIntel {
  indicator: string;
  indicator_type: 'ip' | 'domain' | 'hash' | 'url';
  source: string;
  confidence: number;
  tags: string[];
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export type AnalyticsTab = 'overview' | 'nodes' | 'circuits' | 'traffic';

export interface AnalyticsState {
  activeTab: AnalyticsTab;
  autoRefresh: boolean;
  refreshInterval: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface FilterState {
  nodeTypes: NodeType[];
  circuitPurposes: CircuitPurpose[];
  minBandwidth: number;
  showOnlyRunning: boolean;
  timeRange: '1h' | '6h' | '24h' | '7d' | 'all';
}
