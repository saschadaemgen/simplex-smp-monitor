/**
 * SimpleX SMP Monitor - ChutneX Analytics API Client
 * ==================================================
 * Copyright (c) 2025 cannatoshi
 * 
 * TypeScript API client for ChutneX live analytics.
 * 
 * Endpoints:
 * - Network analytics, bandwidth, circuits, consensus
 * - Node stats, bandwidth, circuits
 * 
 * Integrates with:
 * - Django REST API (analytics_views.py)
 * - React dashboard components
 */

import { NodeType, NetworkStatus } from './chutney';

// =============================================================================
// TYPES
// =============================================================================

export interface NodeStats {
  node_id: string;
  node_name: string;
  node_type: NodeType;
  version: string;
  uptime: number;
  fingerprint: string;
  bytes_read: number;
  bytes_written: number;
  bootstrap_phase: string | null;
  bootstrap_progress: number;
  timestamp: string;
}

export interface NodeBandwidth {
  node_id: string;
  node_name: string;
  node_type: NodeType;
  bytes_read: number;
  bytes_written: number;
  bytes_total: number;
  timestamp: string;
}

export interface CircuitHop {
  fingerprint: string;
  nickname: string;
}

export interface CircuitInfo {
  circuit_id: string;
  status: string;
  purpose: string;
  path: CircuitHop[];
  path_length: number;
  build_flags: string[];
  source_node?: string;
  source_node_id?: string;
}

export interface CircuitSummary {
  total_circuits: number;
  built_circuits: number;
  by_status: Record<string, number>;
  by_purpose: Record<string, number>;
  circuits: CircuitInfo[];
  timestamp: string;
}

export interface ConsensusInfo {
  valid: boolean;
  valid_after: string | null;
  fresh_until: string | null;
  valid_until: string | null;
  tor_version: string;
  source_da: string;
  timestamp: string;
}

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
  by_type: Record<string, BandwidthByType>;
  timestamp: string;
}

export interface NetworkAnalytics {
  network_id: string;
  network_name: string;
  network_status: NetworkStatus;
  bandwidth: NetworkBandwidth;
  circuits: CircuitSummary;
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
// API CLIENT
// =============================================================================

const API_BASE = '/api/v1/chutney';

async function apiFetch<T>(url: string): Promise<T> {
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export const analyticsApi = {
  /**
   * Get complete analytics for a network
   */
  getNetworkAnalytics: (networkId: string): Promise<NetworkAnalytics> => {
    return apiFetch(`${API_BASE}/networks/${networkId}/analytics/`);
  },

  /**
   * Get aggregated bandwidth for a network
   */
  getNetworkBandwidth: (networkId: string): Promise<NetworkBandwidth> => {
    return apiFetch(`${API_BASE}/networks/${networkId}/bandwidth/`);
  },

  /**
   * Get bandwidth per node
   */
  getNetworkBandwidthNodes: (networkId: string): Promise<{ network_id: string; nodes: NodeBandwidth[]; count: number }> => {
    return apiFetch(`${API_BASE}/networks/${networkId}/bandwidth/nodes/`);
  },

  /**
   * Get all circuits in a network
   */
  getNetworkCircuits: (networkId: string): Promise<CircuitSummary> => {
    return apiFetch(`${API_BASE}/networks/${networkId}/circuits/`);
  },

  /**
   * Get consensus info from DA
   */
  getNetworkConsensus: (networkId: string): Promise<ConsensusInfo> => {
    return apiFetch(`${API_BASE}/networks/${networkId}/consensus/`);
  },

  /**
   * Get live stats for a single node
   */
  getNodeStats: (nodeId: string): Promise<NodeStats> => {
    return apiFetch(`${API_BASE}/nodes/${nodeId}/stats/`);
  },

  /**
   * Get live bandwidth for a single node
   */
  getNodeBandwidth: (nodeId: string): Promise<NodeBandwidth> => {
    return apiFetch(`${API_BASE}/nodes/${nodeId}/live-bandwidth/`);
  },

  /**
   * Get circuits from a single node
   */
  getNodeCircuits: (nodeId: string): Promise<{ node_id: string; node_name: string; node_type: NodeType; circuits: CircuitInfo[]; count: number }> => {
    return apiFetch(`${API_BASE}/nodes/${nodeId}/circuits/`);
  },
};