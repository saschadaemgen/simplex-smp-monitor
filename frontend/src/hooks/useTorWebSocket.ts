/**
 * ChutneX Analytics - WebSocket Hooks
 * ====================================
 * Copyright (c) 2026 cannatoshi
 * 
 * React hooks for real-time WebSocket communication with ChutneX backend.
 * 
 * Hooks:
 * - useTorEvents: Raw event stream for forensics
 * - useAnalytics: Aggregated data for dashboard
 * 
 * Usage:
 *   const { events, circuits, bandwidth, subscribe, isConnected } = useTorEvents(networkId);
 *   const { stats, nodes, refresh } = useAnalytics(networkId);
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type EventCategory = 
  | 'bandwidth' 
  | 'circuit' 
  | 'stream' 
  | 'connection' 
  | 'consensus' 
  | 'node_status' 
  | 'alert';

export interface TorEvent {
  event_type: string;
  category: EventCategory;
  node_id: string;
  node_name: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface CircuitData {
  circuit_id: string;
  status: string;
  path: Array<{ fingerprint: string; nickname: string }>;
  path_length: number;
  purpose: string | null;
  build_flags: string[];
  reason: string | null;
  source_node?: string;
}

export interface BandwidthData {
  node_id: string;
  node_name: string;
  bytes_read: number;
  bytes_written: number;
  avg_bytes_read: number;
  avg_bytes_written: number;
  sample_count: number;
  interval_seconds: number;
}

export interface NetworkStats {
  network_id: string;
  nodes_total: number;
  nodes_connected: number;
  nodes_disconnected: number;
  queue_size: number;
  queue_max: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: Date | null;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const getWsBaseUrl = (): string => {
  // @ts-ignore - Vite env
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL;
  if (envUrl) return envUrl;
  return (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
};

const WS_BASE_URL = getWsBaseUrl();

const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// =============================================================================
// useTorEvents - Raw Event Stream
// =============================================================================

interface UseTorEventsOptions {
  autoConnect?: boolean;
  categories?: EventCategory[];
  nodeIds?: string[];
  maxEvents?: number;
  maxCircuits?: number;
  maxBandwidthSamples?: number;
}

interface UseTorEventsReturn {
  // Connection
  state: WebSocketState;
  connect: () => void;
  disconnect: () => void;
  
  // Subscriptions
  subscribe: (categories: EventCategory[], nodeIds?: string[]) => void;
  unsubscribe: (categories: EventCategory[]) => void;
  requestSnapshot: () => void;
  
  // Data
  events: TorEvent[];
  circuits: CircuitData[];
  bandwidth: Map<string, BandwidthData>;
  
  // Helpers
  clearEvents: () => void;
}

export function useTorEvents(
  networkId: string,
  options: UseTorEventsOptions = {}
): UseTorEventsReturn {
  const {
    autoConnect = true,
    categories = [],
    nodeIds = [],
    maxEvents = 1000,
    maxCircuits = 100,
    maxBandwidthSamples = 60,
  } = options;
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // State
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });
  
  const [events, setEvents] = useState<TorEvent[]>([]);
  const [circuits, setCircuits] = useState<CircuitData[]>([]);
  const [bandwidth, setBandwidth] = useState<Map<string, BandwidthData>>(new Map());
  
  // Connect
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setState(s => ({ ...s, isConnecting: true, error: null }));
    
    const url = `${WS_BASE_URL}/ws/chutnex/${networkId}/events/`;
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log(`[ChutneX] Connected to ${networkId}`);
      wsRef.current = ws;
      reconnectAttempts.current = 0;
      
      setState(s => ({
        ...s,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));
      
      // Subscribe to initial categories
      if (categories.length > 0) {
        ws.send(JSON.stringify({
          action: 'subscribe',
          categories,
          node_ids: nodeIds,
        }));
      }
      
      // Start heartbeat
      heartbeatInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'ping' }));
        }
      }, HEARTBEAT_INTERVAL);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
        setState(s => ({ ...s, lastMessage: new Date() }));
      } catch (e) {
        console.error('[ChutneX] Failed to parse message:', e);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[ChutneX] WebSocket error:', error);
      setState(s => ({ ...s, error: 'WebSocket error' }));
    };
    
    ws.onclose = (event) => {
      console.log(`[ChutneX] Disconnected (code: ${event.code})`);
      wsRef.current = null;
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      
      setState(s => ({
        ...s,
        isConnected: false,
        isConnecting: false,
      }));
      
      // Attempt reconnect
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
      } else {
        setState(s => ({ ...s, error: 'Max reconnect attempts reached' }));
      }
    };
  }, [networkId, categories, nodeIds]);
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS; // Prevent reconnect
    wsRef.current?.close();
  }, []);
  
  // Handle incoming messages
  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('[ChutneX] Welcome:', data.message);
        break;
        
      case 'event':
        handleEvent(data as TorEvent);
        break;
        
      case 'subscribed':
        console.log('[ChutneX] Subscribed to:', data.categories);
        break;
        
      case 'pong':
        // Heartbeat response
        break;
        
      case 'error':
        console.error('[ChutneX] Server error:', data.message);
        setState(s => ({ ...s, error: data.message }));
        break;
    }
  }, []);
  
  // Handle individual events
  const handleEvent = useCallback((event: TorEvent) => {
    // Add to general event log
    setEvents(prev => {
      const newEvents = [event, ...prev];
      return newEvents.slice(0, maxEvents);
    });
    
    // Process by category
    switch (event.category) {
      case 'circuit':
        handleCircuitEvent(event);
        break;
      case 'bandwidth':
        handleBandwidthEvent(event);
        break;
    }
  }, [maxEvents]);
  
  // Handle circuit events
  const handleCircuitEvent = useCallback((event: TorEvent) => {
    const circuitData: CircuitData = {
      circuit_id: event.data.circuit_id,
      status: event.data.status,
      path: event.data.path || [],
      path_length: event.data.path_length || 0,
      purpose: event.data.purpose,
      build_flags: event.data.build_flags || [],
      reason: event.data.reason,
      source_node: event.node_id,
    };
    
    setCircuits(prev => {
      // Update or add circuit
      const existing = prev.findIndex(c => c.circuit_id === circuitData.circuit_id);
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = circuitData;
        return updated;
      }
      
      const newCircuits = [circuitData, ...prev];
      return newCircuits.slice(0, maxCircuits);
    });
  }, [maxCircuits]);
  
  // Handle bandwidth events
  const handleBandwidthEvent = useCallback((event: TorEvent) => {
    const bwData: BandwidthData = {
      node_id: event.node_id,
      node_name: event.node_name,
      bytes_read: event.data.bytes_read || 0,
      bytes_written: event.data.bytes_written || 0,
      avg_bytes_read: event.data.avg_bytes_read || 0,
      avg_bytes_written: event.data.avg_bytes_written || 0,
      sample_count: event.data.sample_count || 0,
      interval_seconds: event.data.interval_seconds || 1,
    };
    
    setBandwidth(prev => {
      const newMap = new Map(prev);
      newMap.set(event.node_id, bwData);
      return newMap;
    });
  }, []);
  
  // Subscribe to categories
  const subscribe = useCallback((cats: EventCategory[], nodes?: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'subscribe',
        categories: cats,
        node_ids: nodes || [],
      }));
    }
  }, []);
  
  // Unsubscribe
  const unsubscribe = useCallback((cats: EventCategory[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'unsubscribe',
        categories: cats,
      }));
    }
  }, []);
  
  // Request snapshot
  const requestSnapshot = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'snapshot' }));
    }
  }, []);
  
  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setCircuits([]);
  }, []);
  
  // Auto-connect
  useEffect(() => {
    if (autoConnect && networkId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [networkId, autoConnect]);
  
  return {
    state,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    requestSnapshot,
    events,
    circuits,
    bandwidth,
    clearEvents,
  };
}


// =============================================================================
// useAnalytics - Aggregated Dashboard Data
// =============================================================================

interface UseAnalyticsOptions {
  autoConnect?: boolean;
  refreshInterval?: number; // ms, 0 = manual only
}

interface UseAnalyticsReturn {
  state: WebSocketState;
  connect: () => void;
  disconnect: () => void;
  refresh: () => void;
  setRefreshInterval: (interval: number) => void;
  
  // Data
  stats: NetworkStats | null;
  nodes: any[];
  circuits: CircuitData[];
  lastRefresh: Date | null;
}

export function useAnalytics(
  networkId: string,
  options: UseAnalyticsOptions = {}
): UseAnalyticsReturn {
  const {
    autoConnect = true,
    refreshInterval: initialInterval = 5000,
  } = options;
  
  const wsRef = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<number>(initialInterval);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
  });
  
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [circuits, setCircuits] = useState<CircuitData[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Connect
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setState(s => ({ ...s, isConnecting: true }));
    
    const url = `${WS_BASE_URL}/ws/chutnex/${networkId}/analytics/`;
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      wsRef.current = ws;
      setState(s => ({ ...s, isConnected: true, isConnecting: false }));
      
      // Initial data fetch
      refresh();
      
      // Start refresh timer
      if (refreshIntervalRef.current > 0) {
        refreshTimerRef.current = setInterval(refresh, refreshIntervalRef.current);
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error('[Analytics] Failed to parse message:', e);
      }
    };
    
    ws.onerror = () => {
      setState(s => ({ ...s, error: 'Connection error' }));
    };
    
    ws.onclose = () => {
      wsRef.current = null;
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      setState(s => ({ ...s, isConnected: false, isConnecting: false }));
    };
  }, [networkId]);
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    wsRef.current?.close();
  }, []);
  
  // Handle messages
  const handleMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'stats':
        if (data.bridge) setStats(data.bridge);
        setLastRefresh(new Date());
        break;
        
      case 'nodes':
        setNodes(data.nodes || []);
        break;
        
      case 'circuits':
        setCircuits(data.circuits || []);
        break;
        
      case 'analytics_update':
        // Handle periodic updates
        if (data.stats) setStats(data.stats);
        if (data.nodes) setNodes(data.nodes);
        if (data.circuits) setCircuits(data.circuits);
        setLastRefresh(new Date());
        break;
    }
  }, []);
  
  // Refresh data
  const refresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'get_stats',
        metrics: ['all']
      }));
    }
  }, []);
  
  // Set refresh interval
  const setRefreshInterval = useCallback((interval: number) => {
    refreshIntervalRef.current = interval;
    
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    if (interval > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      refreshTimerRef.current = setInterval(refresh, interval);
    }
  }, [refresh]);
  
  // Auto-connect
  useEffect(() => {
    if (autoConnect && networkId) {
      connect();
    }
    return () => disconnect();
  }, [networkId, autoConnect]);
  
  return {
    state,
    connect,
    disconnect,
    refresh,
    setRefreshInterval,
    stats,
    nodes,
    circuits,
    lastRefresh,
  };
}


// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate bandwidth rate (bytes/second) from BandwidthData
 */
export function getBandwidthRate(bw: BandwidthData): { read: number; write: number } {
  const interval = Math.max(1, bw.interval_seconds);
  return {
    read: Math.round(bw.bytes_read / interval),
    write: Math.round(bw.bytes_written / interval),
  };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get circuit status color (Neon Blue palette)
 */
export function getCircuitStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'LAUNCHED': '#6BB8BA',    // Dim neon
    'BUILT': '#88CED0',       // Primary neon
    'EXTENDED': '#A5DFE1',    // Bright neon
    'FAILED': '#f87171',      // Error red
    'CLOSED': '#4FA3A5',      // Dark neon
  };
  return colors[status] || '#64748b';
}