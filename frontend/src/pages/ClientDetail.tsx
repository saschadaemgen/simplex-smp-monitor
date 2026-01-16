import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { simplexClientsApi, SimplexClient, ClientConnection, messagesApi, TestMessage } from '../api/client';
import { useClientDetailWebSocket } from '../hooks/useWebSocket';
import ClientStats from '../components/clients/ClientStats';
import ClientConnections from '../components/clients/ClientConnections';
import ClientSidebar from '../components/clients/ClientSidebar';
import ClientMessages from '../components/clients/ClientMessages';
import ResetButtons from '../components/clients/ResetButtons';
import TestRunModal from '../components/clients/TestRunModal';

// Neon Blue
const neonBlue = '#88CED0';
const neonGlow = '0 0 8px rgba(136, 206, 208, 0.4)';
// Cyan für Status-Punkte
const cyan = '#22D3EE';

// CSRF Token aus Cookie holen
function getCsrfToken(): string {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return '';
}

export default function ClientDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<SimplexClient | null>(null);
  const [allClients, setAllClients] = useState<SimplexClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [connections, setConnections] = useState<ClientConnection[]>([]);
  const [sentMessages, setSentMessages] = useState<TestMessage[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<TestMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  // WebSocket für Live-Updates
  const { connectionState } = useClientDetailWebSocket(client?.slug, {
    onClientStats: (event) => {
      if (client && event.client_slug === client.slug) {
        setClient(prev => prev ? {
          ...prev,
          messages_sent: event.messages_sent,
          messages_received: event.messages_received,
        } : prev);
      }
    },
    onNewMessage: () => fetchMessages(),
    onMessageStatus: () => {
      fetchMessages();
    },
    onConnectionCreated: () => fetchConnections(),
    onConnectionDeleted: () => fetchConnections(),
  });

  // Neon Button Style
  const neonButtonStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    color: neonBlue,
    border: `1px solid rgba(136, 206, 208, 0.3)`,
    boxShadow: 'none'
  };

  const neonButtonHoverStyle = {
    ...neonButtonStyle,
    boxShadow: neonGlow
  };

  // Initial Fetch
  useEffect(() => {
    fetchAll();
    // Reduziertes Polling da WebSocket live updated
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchAll = async () => {
    await Promise.all([
      fetchClient(),
      fetchAllClients(),
      fetchLogs(),
      fetchConnections(),
      fetchMessages()
    ]);
  };

  const fetchClient = async () => {
    if (!id) return;
    try {
      const data = await simplexClientsApi.get(id);
      setClient(data);
    } catch (err) {
      console.error('Error fetching client:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllClients = async () => {
    try {
      const response = await simplexClientsApi.list();
      const clients = Array.isArray(response) ? response : response.results || [];
      setAllClients(clients);
    } catch (err) {
      console.error('Error fetching all clients:', err);
    }
  };

  const fetchLogs = async () => {
    if (!id) return;
    try {
      const data = await simplexClientsApi.logs(id);
      setLogs(data.logs || '');
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const fetchConnections = async () => {
    if (!id) return;
    try {
      const data = await simplexClientsApi.connections(id);
      setConnections(data || []);
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  };

  const fetchMessages = async () => {
    if (!id) return;
    try {
      const [sent, received] = await Promise.all([
        messagesApi.list(id, "sent"),
        messagesApi.list(id, "received")
      ]);
      setSentMessages(sent || []);
      setReceivedMessages(received || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const getOtherClients = (): SimplexClient[] => {
    if (!client) return [];
    const connectedIds = new Set<string>();
    connections.forEach(conn => {
      connectedIds.add(String(conn.client_a));
      connectedIds.add(String(conn.client_b));
    });
    return allClients.filter(c => 
      c.id !== client.id && 
      !connectedIds.has(String(c.id)) &&
      c.status === 'running'
    );
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!client) return;
    setActionLoading(action);
    try {
      if (action === 'start') await simplexClientsApi.start(client.id);
      else if (action === 'stop') await simplexClientsApi.stop(client.id);
      else await simplexClientsApi.restart(client.id);
      fetchClient();
      fetchMessages();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!client || !confirm(`${client.name} ${t('clients.deleteConfirm')}`)) return;
    setActionLoading('delete');
    try {
      await simplexClientsApi.delete(client.id);
      navigate('/clients');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnect = async (targetSlug: string) => {
    if (!client) return;
    try {
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
      
      fetchConnections();
      fetchMessages();
      fetchAllClients();
    } catch (err) {
      console.error('Error creating connection:', err);
      alert(`${t('clients.connectError')}: ` + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    try {
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
      
      fetchConnections();
      fetchMessages();
      fetchAllClients();
    } catch (err) {
      console.error('Error deleting connection:', err);
    }
  };

  const handleSendMessage = async (contactName: string, message: string) => {
    if (!client) return;
    
    const formData = new FormData();
    formData.append('sender', String(client.id));
    formData.append('contact_name', contactName);
    formData.append('message', message);
    
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
      throw new Error(data.error || 'Send failed');
    }
    
    fetchClient();
    fetchMessages();
  };

  // Handler für Reset-Aktionen
  const handleResetComplete = () => {
    fetchClient();
    fetchMessages();
  };

  // WebSocket Status Indicator
  const getWsStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-emerald-500';
      case 'connecting': return 'bg-amber-500 animate-pulse';
      case 'disconnected': return 'bg-slate-500';
      case 'error': return 'bg-red-500';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex justify-center items-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: neonBlue }}
          ></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-4">{t('clients.clientNotFound')}</h2>
            <Link to="/clients" style={{ color: neonBlue }} className="hover:opacity-80">← {t('common.back')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const otherClients = getOtherClients();

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <Link 
              to="/clients" 
              className="text-sm flex items-center gap-1 mb-2 hover:opacity-80 transition-opacity"
              style={{ color: neonBlue }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              {t('clients.allClients')}
            </Link>
            <div className="flex items-center gap-3">
              <div className="relative">
                {client.status === 'running' ? (
                  <>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cyan }}></div>
                    <div 
                      className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75"
                      style={{ backgroundColor: cyan }}
                    ></div>
                  </>
                ) : client.status === 'error' ? (
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                ) : (
                  <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {client.name} <span className="text-slate-400 font-normal text-base">({client.profile_name})</span>
                </h1>
                <p className="text-slate-500 text-sm">{client.slug} · Port {client.websocket_port}</p>
              </div>
              
              {/* WebSocket Status Badge */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50 ml-2">
                <div className={`w-2 h-2 rounded-full ${getWsStatusColor()}`}></div>
                <span className="text-xs text-slate-400">
                  {connectionState === 'connected' ? 'Live' : connectionState}
                </span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {client.status === 'running' ? (
              <>
                <button 
                  onClick={() => handleAction('stop')} 
                  disabled={!!actionLoading}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-all"
                  style={neonButtonStyle}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
                  </svg>
                  {t('clients.stop')}
                </button>
                <button 
                  onClick={() => handleAction('restart')} 
                  disabled={!!actionLoading}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-all"
                  style={neonButtonStyle}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  {t('clients.restart')}
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleAction('start')} 
                disabled={!!actionLoading}
                className="px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-all"
                style={neonButtonStyle}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {t('clients.start')}
              </button>
            )}
            <Link 
              to={`/clients/${id}/edit`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-all"
              style={neonButtonStyle}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              {t('common.edit')}
            </Link>
            <button 
              onClick={handleDelete} 
              disabled={!!actionLoading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-all"
              style={neonButtonStyle}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              {t('common.delete')}
            </button>

            {/* Test Run Button */}
            <button
              onClick={() => setShowTestModal(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-all"
              style={neonButtonStyle}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Test
            </button>

            {/* Test History Button */}
            <Link
              to="/test-runs"
              className="px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition-all"
              style={neonButtonStyle}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              History
            </Link>
            
            {/* Reset Dropdown */}
            <ResetButtons 
              clientId={client.id} 
              onResetComplete={handleResetComplete}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="space-y-6">
          {/* Error Display */}
          {client.last_error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              <strong>{t('status.error')}:</strong> {client.last_error}
            </div>
          )}

          {/* Stats Cards */}
          <ClientStats client={client} connectionCount={connections.length} />

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3" style={{ alignItems: 'stretch' }}>
            {/* Main Content */}
            <div className="lg:col-span-2 flex flex-col space-y-6">
              <ClientConnections 
                client={client} 
                connections={connections}
                otherClients={otherClients}
                onConnect={handleConnect}
                onDelete={handleDeleteConnection}
              />

              {/* Container Logs */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 overflow-hidden">
                <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: neonBlue }}>{t('clients.containerLogs')}</h2>
                  <button 
                    onClick={fetchLogs} 
                    className="text-sm hover:opacity-80 transition-opacity"
                    style={{ color: neonBlue }}
                  >
                    {t('common.refresh')}
                  </button>
                </div>
                <div className="p-4 font-mono text-xs overflow-auto max-h-64 bg-slate-950/50">
                  {logs ? (
                    <pre className="whitespace-pre-wrap" style={{ color: '#22D3EE' }}>{logs}</pre>
                  ) : (
                    <p className="text-slate-500">{t('clients.noLogs')}</p>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* Messages */}
              <ClientMessages sentMessages={sentMessages} receivedMessages={receivedMessages} />
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <ClientSidebar 
                client={client} 
                connections={connections}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>

          {/* Grafana Info */}
          <div 
            className="rounded-lg p-4 flex items-start space-x-3"
            style={{ 
              backgroundColor: 'rgba(136, 206, 208, 0.05)',
              border: `1px solid rgba(136, 206, 208, 0.2)`
            }}
          >
            <svg className="w-6 h-6 flex-shrink-0" style={{ color: neonBlue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p className="font-medium" style={{ color: neonBlue }}>{t('clients.grafanaDashboard')}</p>
              <p className="text-sm" style={{ color: neonBlue, opacity: 0.8 }}>
                {t('clients.grafanaInfo')}{' '}
                <a 
                  href="http://localhost:3000" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="underline hover:no-underline"
                  style={{ color: neonBlue }}
                >
                  {t('clients.grafanaLink')}
                </a>
                {' '}{t('clients.grafanaVisualization')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Run Modal */}
      <TestRunModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        client={client}
        connections={connections}
        allClients={allClients}
      />
    </div>
  );
}