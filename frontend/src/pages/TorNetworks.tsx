/**
 * TorNetworks.tsx - Private Tor Network Liste
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTorNetworks } from '../hooks/useChutney';
import { 
  torNetworksApi, 
  TorNetwork, 
  NetworkStatus, 
  NetworkTemplate,
  NetworkAction 
} from '../api/chutney';

const neonBlue = '#88CED0';
const neonGlow = '0 0 8px rgba(136, 206, 208, 0.4)';

function NetworkStatusBadge({ status }: { status: NetworkStatus }) {
  const statusConfig: Record<NetworkStatus, { bg: string; text: string; icon: string }> = {
    not_created: { bg: 'bg-slate-700/50', text: 'text-slate-400', icon: '⚪' },
    created: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: '🔵' },
    creating: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: '🔵' },
    bootstrapping: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: '🟡' },
    running: { bg: 'bg-green-900/30', text: 'text-green-400', icon: '🟢' },
    stopping: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: '🟡' },
    stopped: { bg: 'bg-red-900/30', text: 'text-red-400', icon: '🔴' },
    error: { bg: 'bg-red-900/30', text: 'text-red-400', icon: '❌' },
  };
  
  const config = statusConfig[status] || statusConfig.not_created;
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon} {status.replace('_', ' ')}
    </span>
  );
}

function TemplateBadge({ template }: { template: NetworkTemplate }) {
  const templateConfig: Record<NetworkTemplate, { bg: string; text: string; label: string }> = {
    minimal: { bg: 'bg-slate-700/50', text: 'text-slate-300', label: 'Minimal' },
    basic: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Basic' },
    standard: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', label: 'Standard' },
    forensic: { bg: 'bg-purple-900/30', text: 'text-purple-400', label: 'Forensic' },
    custom: { bg: 'bg-amber-900/30', text: 'text-amber-400', label: 'Custom' },
  };
  
  const config = templateConfig[template] || templateConfig.basic;
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function TorNetworks() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<NetworkStatus | ''>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const { data: networksData, loading, refetch } = useTorNetworks(
    statusFilter ? { status: statusFilter } : undefined
  );
  
  const networks = networksData?.results || [];

  const neonButtonStyle = {
    backgroundColor: 'rgb(30, 41, 59)',
    color: neonBlue,
    border: `1px solid ${neonBlue}`,
    boxShadow: neonGlow
  };

  const handleAction = async (network: TorNetwork, action: NetworkAction) => {
    if (action === 'delete' && !confirm(t('chutney.confirmDelete', `Delete network '${network.name}'?`))) return;
    
    setActionLoading(network.id);
    try {
      await torNetworksApi.action(network.id, action);
      await refetch();
    } catch (err) {
      alert(`Action failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (network: TorNetwork) => {
    if (!confirm(t('chutney.confirmDeleteFull', `Delete network '${network.name}'? This will remove all containers and data.`))) return;
    
    setActionLoading(network.id);
    try {
      await torNetworksApi.delete(network.id);
      await refetch();
    } catch (err) {
      alert(`Delete failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const timeAgo = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const statusOptions: { value: NetworkStatus | ''; label: string }[] = [
    { value: '', label: t('common.all', 'All') },
    { value: 'running', label: '🟢 Running' },
    { value: 'stopped', label: '🔴 Stopped' },
    { value: 'bootstrapping', label: '🟡 Bootstrapping' },
    { value: 'error', label: '❌ Error' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: neonBlue }}>
              🧅 {t('chutney.title', 'Private Tor Networks')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {t('chutney.subtitle', 'Chutney-based test networks for traffic analysis')}
            </p>
          </div>
          <Link 
            to="/tor-networks/new" 
            className="px-4 py-2 rounded-lg transition-colors font-medium text-sm inline-flex items-center space-x-2 hover:opacity-90"
            style={neonButtonStyle}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            <span>{t('chutney.createNetwork', 'Create Network')}</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-slate-800/50">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400 mr-1">{t('common.filter', 'Filter')}:</span>
          {statusOptions.map(option => (
            <button
              key={option.value || 'all'}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === option.value 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-5 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-800 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
                <div className="h-8 bg-slate-800 rounded w-1/3 mt-4"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && networks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {networks.map((network) => {
              const status = network.status;
              return (
                <div 
                  key={network.id}
                  className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-5 shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-semibold truncate">{network.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <NetworkStatusBadge status={status} />
                        <TemplateBadge template={network.template} />
                        {network.capture_enabled && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400">
                            📹 Capture
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {network.is_running && (
                      <span className="flex h-3 w-3 relative">
                        <span 
                          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                          style={{ backgroundColor: neonBlue }}
                        ></span>
                        <span 
                          className="relative inline-flex rounded-full h-3 w-3"
                          style={{ backgroundColor: neonBlue }}
                        ></span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm flex-grow">
                    <div>
                      <span className="text-slate-400 text-xs">{t('chutney.nodes', 'Nodes')}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
                          🏛️ {network.num_directory_authorities} DA
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
                          🔀 {network.num_guard_relays + network.num_middle_relays + network.num_exit_relays} Relays
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
                          💻 {network.num_clients} Clients
                        </span>
                      </div>
                    </div>
                    
                    {status === 'bootstrapping' && (
                      <div>
                        <span className="text-slate-400 text-xs">{t('chutney.bootstrapProgress', 'Bootstrap Progress')}</span>
                        <div className="w-full bg-slate-800 rounded-full h-2 mt-1">
                          <div 
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${network.bootstrap_progress}%`,
                              backgroundColor: neonBlue 
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-500">{network.bootstrap_progress}%</span>
                      </div>
                    )}
                    
                    {network.is_running && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-slate-800">
                          <span className="text-xs text-slate-500">{t('chutney.runningNodes', 'Running Nodes')}</span>
                          <p className="text-white font-mono">{network.running_nodes_count}/{network.total_nodes}</p>
                        </div>
                        <div className="p-2 rounded bg-slate-800">
                          <span className="text-xs text-slate-500">{t('chutney.consensus', 'Consensus')}</span>
                          <p className={`font-mono ${network.consensus_valid ? 'text-green-400' : 'text-slate-400'}`}>
                            {network.consensus_valid ? '✓ Valid' : '— None'}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {network.description && (
                      <p className="text-slate-500 text-xs truncate">{network.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {status === 'not_created' && (
                          <button
                            onClick={() => handleAction(network, 'create')}
                            disabled={actionLoading === network.id}
                            className="p-1.5 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 disabled:opacity-50"
                            title={t('chutney.actions.createInfra', 'Create Docker Infrastructure')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                          </button>
                        )}
                        
                        {(status === 'stopped' || status === 'created') && (
                          <button
                            onClick={() => handleAction(network, 'start')}
                            disabled={actionLoading === network.id}
                            className="p-1.5 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 disabled:opacity-50"
                            title={t('chutney.actions.start', 'Start Network')}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                            </svg>
                          </button>
                        )}
                        
                        {status === 'running' && (
                          <button
                            onClick={() => handleAction(network, 'stop')}
                            disabled={actionLoading === network.id}
                            className="p-1.5 rounded-lg bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 disabled:opacity-50"
                            title={t('chutney.actions.stop', 'Stop Network')}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
                            </svg>
                          </button>
                        )}
                        
                        {actionLoading === network.id && (
                          <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        )}
                      </div>
                      
                      <span className="text-xs text-slate-500">
                        {network.started_at ? `Started ${timeAgo(network.started_at)}` : `Created ${timeAgo(network.created_at)}`}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3 mt-3 pt-3 border-t border-slate-800/50 text-sm">
                      <Link 
                        to={`/tor-networks/${network.id}`} 
                        className="transition-colors hover:opacity-80"
                        style={{ color: neonBlue }}
                      >
                        {t('common.details', 'Details')}
                      </Link>
                      {/* Analytics Link - nur bei running */}
                      {status === 'running' && (
                        <Link 
                          to={`/tor-networks/${network.id}/analytics`} 
                          className="transition-colors hover:opacity-80"
                          style={{ color: neonBlue }}
                        >
                          📊 {t('chutney.actions.analytics', 'Analytics')}
                        </Link>
                      )}
                      <Link 
                        to={`/tor-networks/${network.id}/edit`} 
                        className="transition-colors hover:opacity-80"
                        style={{ color: neonBlue }}
                      >
                        {t('common.edit', 'Edit')}
                      </Link>
                      <button 
                        onClick={() => handleDelete(network)} 
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        {t('common.delete', 'Delete')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && networks.length === 0 && (
          <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-12 text-center">
            <div className="text-6xl mb-4">🧅</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('chutney.noNetworks', 'No Private Tor Networks')}
            </h3>
            <p className="text-slate-400 mb-6">
              {t('chutney.createFirstNetwork', 'Create your first Chutney network for local Tor traffic analysis.')}
            </p>
            <Link 
              to="/tor-networks/new" 
              className="px-6 py-2 rounded-lg transition-colors font-medium inline-block hover:opacity-90"
              style={neonButtonStyle}
            >
              {t('chutney.createNetwork', 'Create Network')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}