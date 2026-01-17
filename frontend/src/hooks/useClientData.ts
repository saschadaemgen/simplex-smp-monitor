/**
 * SimpleX SMP Monitor - Unified Client Data Hook (FIXED v3 + DEBUG)
 * ==================================================================
 * Copyright (c) 2026 cannatoshi
 * 
 * FIXES v3:
 * - Status updates now check: tracking_id, id, mapped ID, AND reverse mapped ID
 * - Stores BOTH directions in idMapping (local->server AND server->local)
 * - Immediate state update on status change (no batching delay for UX)
 * - Better debug logging for tracking ID flow
 * 
 * DEBUG VERSION:
 * - Enhanced logging in message_status handler
 * - Logs actual state inside setSentMessages to avoid closure issues
 * 
 * FIXES v2:
 * - Tracking ID matching: searches BOTH tracking_id AND id
 * - Server tracking_id is properly stored after send
 * - Status updates now find optimistic messages correctly
 * - ID mapping from local UUID to server tracking_id
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  simplexClientsApi, 
  SimplexClient, 
  ClientConnection, 
  messagesApi, 
  TestMessage 
} from '../api/client';

// =============================================================================
// TYPES
// =============================================================================

export interface LiveMessage {
  id: string;
  tracking_id?: string;
  direction: 'sent' | 'received';
  sender_name?: string;
  recipient_name?: string;
  sender_profile?: string;
  recipient_profile?: string;
  contact_name?: string;
  content: string;
  content_clean?: string;
  delivery_status: 'sending' | 'sent' | 'delivered' | 'failed';
  total_latency_ms?: number | null;
  created_at: string;
}

export interface LatencyPoint {
  latency: number;
  timestamp: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseClientDataReturn {
  client: SimplexClient | null;
  loading: boolean;
  error: string | null;
  sentMessages: LiveMessage[];
  receivedMessages: LiveMessage[];
  connections: ClientConnection[];
  allClients: SimplexClient[];
  logs: string;
  lastLatency: LatencyPoint | null;
  connectionState: ConnectionState;
  bridgeClients: number;
  actions: {
    refreshClient: () => Promise<void>;
    refreshLogs: () => Promise<void>;
    refreshMessages: () => Promise<void>;
    refreshConnections: () => Promise<void>;
    refreshAll: () => Promise<void>;
    startClient: () => Promise<void>;
    stopClient: () => Promise<void>;
    restartClient: () => Promise<void>;
    deleteClient: () => Promise<boolean>;
    sendMessage: (contactName: string, message: string) => Promise<void>;
    createConnection: (targetSlug: string) => Promise<void>;
    deleteConnection: (connectionId: string) => Promise<void>;
    resetMessages: () => Promise<void>;
    resetCounters: () => Promise<void>;
    resetLatency: () => Promise<void>;
    resetAll: () => Promise<void>;
  };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const BATCH_INTERVAL_MS = 50;
const MAX_MESSAGES = 500;
const MAX_PENDING_BATCH = 100;
const LOGS_POLL_INTERVAL = 30000;
const CLIENT_POLL_INTERVAL = 60000;
const DEBUG = true;

// =============================================================================
// HELPERS
// =============================================================================

function debug(...args: any[]) {
  if (DEBUG) {
    console.log('[useClientData]', ...args);
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getCsrfToken(): string {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === 'csrftoken') return value;
  }
  return '';
}

function getWsUrl(clientSlug: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = (import.meta as any).env?.DEV ? '8000' : window.location.port;
  return `${protocol}//${host}:${port}/ws/clients/${clientSlug}/`;
}

function apiMessageToLive(msg: TestMessage, direction: 'sent' | 'received'): LiveMessage {
  return {
    id: msg.id,
    tracking_id: msg.tracking_id,
    direction,
    sender_name: msg.sender_name,
    recipient_name: msg.recipient_name,
    sender_profile: msg.sender_profile,
    recipient_profile: msg.recipient_profile,
    contact_name: (msg as any).contact_name,
    content: msg.content,
    content_clean: msg.content_clean,
    delivery_status: msg.delivery_status as LiveMessage['delivery_status'],
    total_latency_ms: msg.total_latency_ms,
    created_at: msg.created_at,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export function useClientData(clientId: string | undefined): UseClientDataReturn {
  
  // =========================================================================
  // STATE
  // =========================================================================
  
  const [client, setClient] = useState<SimplexClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sentMessages, setSentMessages] = useState<LiveMessage[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<LiveMessage[]>([]);
  
  const [connections, setConnections] = useState<ClientConnection[]>([]);
  const [allClients, setAllClients] = useState<SimplexClient[]>([]);
  const [logs, setLogs] = useState<string>('');
  
  const [lastLatency, setLastLatency] = useState<LatencyPoint | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [bridgeClients, setBridgeClients] = useState(0);
  
  // =========================================================================
  // REFS
  // =========================================================================
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  
  const pendingReceived = useRef<LiveMessage[]>([]);
  const pendingSent = useRef<LiveMessage[]>([]);
  const pendingStatusUpdates = useRef<Map<string, { status: string; latency_ms?: number }>>(new Map());
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track local ID <-> server tracking_id mapping (BIDIRECTIONAL)
  const idMapping = useRef<Map<string, string>>(new Map());
  
  const logsInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // =========================================================================
  // IMMEDIATE STATUS UPDATE (v3 - for real-time UX)
  // =========================================================================
  
  const applyStatusUpdateImmediate = useCallback((messageId: string, status: string, latencyMs?: number) => {
    debug('🎯 Immediate status update:', messageId, status, latencyMs);
    
    setSentMessages(prev => {
      let found = false;
      const updated = prev.map(msg => {
        // Check ALL possible ID matches
        const matches = 
          msg.tracking_id === messageId ||
          msg.id === messageId ||
          idMapping.current.get(msg.id) === messageId ||
          idMapping.current.get(msg.tracking_id || '') === messageId ||
          // Reverse lookup: if messageId maps to this msg's id or tracking_id
          idMapping.current.get(messageId) === msg.id ||
          idMapping.current.get(messageId) === msg.tracking_id;
        
        if (matches) {
          found = true;
          debug('✅ MATCH FOUND for message:', msg.id, '/', msg.tracking_id, '-> status:', status);
          return {
            ...msg,
            delivery_status: status as LiveMessage['delivery_status'],
            total_latency_ms: latencyMs ?? msg.total_latency_ms,
          };
        }
        return msg;
      });
      
      if (!found) {
        debug('⚠️ No match found for message_id:', messageId);
        debug('   Available messages:', prev.map(m => ({ id: m.id, tracking_id: m.tracking_id })));
        debug('   ID mappings:', Array.from(idMapping.current.entries()));
      }
      
      return updated;
    });
  }, []);
  
  // =========================================================================
  // BATCHING LOGIC (for received messages)
  // =========================================================================
  
  const flushBatch = useCallback(() => {
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
      batchTimer.current = null;
    }
    
    const newReceived = [...pendingReceived.current];
    const newSent = [...pendingSent.current];
    
    pendingReceived.current = [];
    pendingSent.current = [];
    
    debug('🔄 Flushing batch:', {
      received: newReceived.length,
      sent: newSent.length,
    });
    
    // Apply received messages
    if (newReceived.length > 0) {
      setReceivedMessages(prev => {
        const updated = [...newReceived, ...prev];
        debug('📥 Received messages updated:', updated.length);
        return updated.slice(0, MAX_MESSAGES);
      });
    }
    
    // Apply sent messages
    if (newSent.length > 0) {
      setSentMessages(prev => {
        const updated = [...newSent, ...prev];
        debug('📤 Sent messages updated:', updated.length);
        return updated.slice(0, MAX_MESSAGES);
      });
    }
  }, []);
  
  const scheduleBatch = useCallback(() => {
    const totalPending = pendingReceived.current.length + pendingSent.current.length;
    
    if (totalPending >= MAX_PENDING_BATCH) {
      debug('⚡ Force flush - too many pending');
      flushBatch();
      return;
    }
    
    if (!batchTimer.current) {
      batchTimer.current = setTimeout(flushBatch, BATCH_INTERVAL_MS);
    }
  }, [flushBatch]);
  
  // =========================================================================
  // WEBSOCKET
  // =========================================================================
  
  const connectWebSocket = useCallback(() => {
    if (!client?.slug) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setConnectionState('connecting');
    const url = getWsUrl(client.slug);
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('🔌 WebSocket connected:', url);
        setConnectionState('connected');
        reconnectAttempts.current = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          debug('📨 WS Event:', data.type, data);
          
          switch (data.type) {
            case 'bridge_status':
              setBridgeClients(data.connected_clients);
              break;
              
            case 'client_stats':
              if (data.client_slug === client.slug) {
                setClient(prev => prev ? {
                  ...prev,
                  messages_sent: data.messages_sent,
                  messages_received: data.messages_received,
                } : prev);
              }
              break;
              
            case 'new_message':
              debug('📥 New message for', data.client_slug);
              if (data.client_slug === client.slug) {
                const msg: LiveMessage = {
                  id: generateId(),
                  direction: 'received',
                  sender_name: data.sender,
                  recipient_name: client.name,
                  content: data.content,
                  content_clean: data.content,
                  delivery_status: 'delivered',
                  created_at: data.timestamp || new Date().toISOString(),
                };
                pendingReceived.current.push(msg);
                scheduleBatch();
                
                setClient(prev => prev ? {
                  ...prev,
                  messages_received: prev.messages_received + 1,
                } : prev);
              }
              break;
              
            case 'message_sent':
              debug('📤 Message sent:', data);
              if (data.client_slug === client.slug) {
                const msg: LiveMessage = {
                  id: generateId(),
                  tracking_id: data.tracking_id,
                  direction: 'sent',
                  sender_name: client.name,
                  recipient_name: data.recipient || data.contact_name,
                  contact_name: data.contact_name,
                  content: data.content,
                  content_clean: data.content,
                  delivery_status: 'sending',
                  created_at: data.timestamp || new Date().toISOString(),
                };
                pendingSent.current.push(msg);
                scheduleBatch();
              }
              break;
              
            case 'message_status':
              // ============================================================
              // 🔍 ENHANCED DEBUG LOGGING (TEMPORARY)
              // ============================================================
              console.log('🔍 STATUS DEBUG:', {
                message_id: data.message_id,
                status: data.status,
                latency: data.latency_ms,
                currentMappings: Array.from(idMapping.current.entries()),
              });
              
              // Log INSIDE the state updater to see actual current state (avoids closure issues)
              setSentMessages(prev => {
                console.log('🔍 ACTUAL sentMessages at update time:', 
                  prev.map(m => ({ id: m.id, tracking_id: m.tracking_id, status: m.delivery_status }))
                );
                return prev; // Don't modify here, just log
              });
              // ============================================================
              
              debug('📊 Status update:', data.message_id, data.status, data.latency_ms);
              
              // IMMEDIATE update for real-time UX (v3)
              applyStatusUpdateImmediate(data.message_id, data.status, data.latency_ms);
              
              // Live Latency Update
              if (data.latency_ms) {
                debug('⏱️ Latency:', data.latency_ms, 'ms');
                setLastLatency({
                  latency: data.latency_ms,
                  timestamp: new Date().toISOString(),
                });
              }
              
              if (data.status === 'delivered') {
                setClient(prev => prev ? {
                  ...prev,
                  messages_delivered: (prev.messages_delivered || 0) + 1,
                } : prev);
              } else if (data.status === 'failed') {
                setClient(prev => prev ? {
                  ...prev,
                  messages_failed: (prev.messages_failed || 0) + 1,
                } : prev);
              }
              break;
              
            case 'connection_created':
            case 'connection_deleted':
              refreshConnections();
              break;
              
            default:
              debug('❓ Unknown event type:', data.type);
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setConnectionState('error');
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        setConnectionState('disconnected');
        wsRef.current = null;
        
        if (reconnectAttempts.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          debug('🔄 Reconnecting in', delay, 'ms');
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        }
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setConnectionState('error');
    }
  }, [client?.slug, client?.name, scheduleBatch, applyStatusUpdateImmediate]);
  
  // =========================================================================
  // FETCH FUNCTIONS
  // =========================================================================
  
  const refreshClient = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await simplexClientsApi.get(clientId);
      setClient(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [clientId]);
  
  const refreshAllClients = useCallback(async () => {
    try {
      const response = await simplexClientsApi.list();
      const clients = Array.isArray(response) ? response : response.results || [];
      setAllClients(clients);
    } catch (err) {
      console.error('Error fetching all clients:', err);
    }
  }, []);
  
  const refreshLogs = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await simplexClientsApi.logs(clientId);
      setLogs(data.logs || '');
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  }, [clientId]);
  
  const refreshConnections = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await simplexClientsApi.connections(clientId);
      setConnections(data || []);
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  }, [clientId]);
  
  const refreshMessages = useCallback(async () => {
    if (!clientId) return;
    try {
      const [sent, received] = await Promise.all([
        messagesApi.list(clientId, "sent"),
        messagesApi.list(clientId, "received")
      ]);
      
      const sentLive = (sent || []).map((m: TestMessage) => apiMessageToLive(m, 'sent'));
      const receivedLive = (received || []).map((m: TestMessage) => apiMessageToLive(m, 'received'));
      
      setSentMessages(sentLive.slice(0, MAX_MESSAGES));
      setReceivedMessages(receivedLive.slice(0, MAX_MESSAGES));
      debug('📦 Messages loaded - sent:', sentLive.length, 'received:', receivedLive.length);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [clientId]);
  
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      refreshClient(),
      refreshAllClients(),
      refreshLogs(),
      refreshConnections(),
      refreshMessages()
    ]);
    setLoading(false);
  }, [refreshClient, refreshAllClients, refreshLogs, refreshConnections, refreshMessages]);
  
  // =========================================================================
  // ACTIONS
  // =========================================================================
  
  const startClient = useCallback(async () => {
    if (!client) return;
    await simplexClientsApi.start(client.id);
    await refreshClient();
  }, [client, refreshClient]);
  
  const stopClient = useCallback(async () => {
    if (!client) return;
    await simplexClientsApi.stop(client.id);
    await refreshClient();
  }, [client, refreshClient]);
  
  const restartClient = useCallback(async () => {
    if (!client) return;
    await simplexClientsApi.restart(client.id);
    await refreshClient();
  }, [client, refreshClient]);
  
  const deleteClient = useCallback(async (): Promise<boolean> => {
    if (!client) return false;
    await simplexClientsApi.delete(client.id);
    return true;
  }, [client]);
  
  const sendMessage = useCallback(async (contactName: string, message: string) => {
    if (!client) return;
    
    // Generate local tracking ID for optimistic update
    const localId = generateId();
    
    // OPTIMISTIC UPDATE: Add message to sent list immediately
    const optimisticMsg: LiveMessage = {
      id: localId,
      tracking_id: localId, // Temporary - will be updated with server tracking_id
      direction: 'sent',
      sender_name: client.name,
      recipient_name: contactName,
      contact_name: contactName,
      content: message,
      content_clean: message,
      delivery_status: 'sending',
      created_at: new Date().toISOString(),
    };
    
    setSentMessages(prev => [optimisticMsg, ...prev].slice(0, MAX_MESSAGES));
    debug('📤 Optimistic sent:', optimisticMsg);
    
    // Update counter immediately
    setClient(prev => prev ? {
      ...prev,
      messages_sent: prev.messages_sent + 1,
    } : prev);
    
    const formData = new FormData();
    formData.append('sender', String(client.id));
    formData.append('contact_name', contactName);
    formData.append('message', message);
    
    try {
      const response = await fetch('/clients/messages/send/', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken()
        },
        body: formData
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        // Revert optimistic update on failure
        setSentMessages(prev => prev.filter(m => m.id !== localId));
        setClient(prev => prev ? {
          ...prev,
          messages_sent: prev.messages_sent - 1,
        } : prev);
        throw new Error(data.error || 'Send failed');
      }
      
      debug('✅ Send confirmed:', data);
      
      // CRITICAL FIX v3: Store BIDIRECTIONAL mapping
      if (data.tracking_id) {
        debug('🔗 Mapping IDs bidirectionally:');
        debug('   local:', localId, '-> server:', data.tracking_id);
        debug('   server:', data.tracking_id, '-> local:', localId);
        
        // Store both directions
        idMapping.current.set(localId, data.tracking_id);
        idMapping.current.set(data.tracking_id, localId);
        
        // Also update the message with the server tracking_id
        setSentMessages(prev => prev.map(m => 
          m.id === localId 
            ? { ...m, tracking_id: data.tracking_id }
            : m
        ));
      }
      
      // If we got message_id from server (different from tracking_id), map that too
      if (data.message_id && data.message_id !== data.tracking_id) {
        debug('🔗 Also mapping message_id:', data.message_id);
        idMapping.current.set(data.message_id, localId);
        idMapping.current.set(localId, data.message_id);
      }
      
    } catch (err) {
      console.error('Send error:', err);
      throw err;
    }
  }, [client]);
  
  const createConnection = useCallback(async (targetSlug: string) => {
    if (!client) return;
    
    const formData = new FormData();
    formData.append('target_slug', targetSlug);
    
    const response = await fetch(`/clients/${client.slug}/connect/`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken()
      },
      body: formData
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Server returned non-JSON response');
    }
    
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Connection failed');
    }
    
    await Promise.all([refreshConnections(), refreshAllClients()]);
  }, [client, refreshConnections, refreshAllClients]);
  
  const deleteConnection = useCallback(async (connectionId: string) => {
    const response = await fetch(`/clients/connections/${connectionId}/delete/`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken()
      }
    });
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Delete failed');
      }
    }
    
    await Promise.all([refreshConnections(), refreshAllClients()]);
  }, [refreshConnections, refreshAllClients]);
  
  const resetMessages = useCallback(async () => {
    if (!clientId) return;
    await fetch(`/api/v1/clients/${clientId}/reset-messages/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrfToken() },
    });
    setSentMessages([]);
    setReceivedMessages([]);
    idMapping.current.clear();
    await refreshClient();
  }, [clientId, refreshClient]);
  
  const resetCounters = useCallback(async () => {
    if (!clientId) return;
    await fetch(`/api/v1/clients/${clientId}/reset-counters/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrfToken() },
    });
    await refreshClient();
  }, [clientId, refreshClient]);
  
  const resetLatency = useCallback(async () => {
    if (!clientId) return;
    await fetch(`/api/v1/clients/${clientId}/reset-latency/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrfToken() },
    });
    await refreshClient();
    setLastLatency(null);
  }, [clientId, refreshClient]);
  
  const resetAll = useCallback(async () => {
    if (!clientId) return;
    await fetch(`/api/v1/clients/${clientId}/reset-all/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrfToken() },
    });
    setSentMessages([]);
    setReceivedMessages([]);
    setLastLatency(null);
    idMapping.current.clear();
    await refreshClient();
  }, [clientId, refreshClient]);
  
  // =========================================================================
  // EFFECTS
  // =========================================================================
  
  // Initial Load
  useEffect(() => {
    if (clientId) {
      debug('🚀 Initial load for client:', clientId);
      refreshAll();
    }
    
    return () => {
      debug('🧹 Cleanup');
      if (batchTimer.current) clearTimeout(batchTimer.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (logsInterval.current) clearInterval(logsInterval.current);
      if (clientInterval.current) clearInterval(clientInterval.current);
      wsRef.current?.close();
      idMapping.current.clear();
    };
  }, [clientId]);
  
  // WebSocket Connect
  useEffect(() => {
    if (client?.slug) {
      debug('🔌 Connecting WebSocket for:', client.slug);
      connectWebSocket();
    }
  }, [client?.slug, connectWebSocket]);
  
  // Polling
  useEffect(() => {
    if (!clientId) return;
    
    logsInterval.current = setInterval(refreshLogs, LOGS_POLL_INTERVAL);
    clientInterval.current = setInterval(refreshClient, CLIENT_POLL_INTERVAL);
    
    return () => {
      if (logsInterval.current) clearInterval(logsInterval.current);
      if (clientInterval.current) clearInterval(clientInterval.current);
    };
  }, [clientId, refreshLogs, refreshClient]);
  
  // Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // =========================================================================
  // RETURN
  // =========================================================================
  
  return {
    client,
    loading,
    error,
    sentMessages,
    receivedMessages,
    connections,
    allClients,
    logs,
    lastLatency,
    connectionState,
    bridgeClients,
    actions: {
      refreshClient,
      refreshLogs,
      refreshMessages,
      refreshConnections,
      refreshAll,
      startClient,
      stopClient,
      restartClient,
      deleteClient,
      sendMessage,
      createConnection,
      deleteConnection,
      resetMessages,
      resetCounters,
      resetLatency,
      resetAll,
    },
  };
}