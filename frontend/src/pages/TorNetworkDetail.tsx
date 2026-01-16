/**
 * TorNetworkDetail.tsx - Private Tor Network Detail View
 */
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTorNetwork, useTorNetworkPolling } from '../hooks/useChutney';
import { 
  torNetworksApi, 
  torNodesApi,
  TorNode,
  NetworkAction,
  NodeAction,
  NodeType,
  NodeStatus
} from '../api/chutney';

const neonBlue = '#88CED0';

const nodeTypeConfig: Record<NodeType, { icon: string; label: string; color: string }> = {
  da: { icon: '🏛️', label: 'Directory Authority', color: 'purple' },
  guard: { icon: '🛡️', label: 'Guard Relay', color: 'blue' },
  middle: { icon: '🔀', label: 'Middle Relay', color: 'slate' },
  exit: { icon: '🚪', label: 'Exit Relay', color: 'amber' },
  client: { icon: '💻', label: 'Client', color: 'green' },
  hs: { icon: '🧅', label: 'Hidden Service', color: 'pink' },
};

function NodeStatusBadge({ status }: { status: NodeStatus }) {
  const statusConfig: Record<NodeStatus, { bg: string; text: string }> = {
    not_created: { bg: 'bg-slate-700/50', text: 'text-slate-400' },
    created: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
    starting: { bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
    bootstrapping: { bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
    running: { bg: 'bg-green-900/30', text: 'text-green-400' },
    stopping: { bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
    stopped: { bg: 'bg-red-900/30', text: 'text-red-400' },
    error: { bg: 'bg-red-900/30', text: 'text-red-400' },
  };
  
  const config = statusConfig[status] || statusConfig.not_created;
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function NodeCard({ 
  node, 
  onAction,
  actionLoading 
}: { 
  node: TorNode; 
  onAction: (action: NodeAction) => void;
  actionLoading: boolean;
}) {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  
  const typeConfig = nodeTypeConfig[node.node_type] || nodeTypeConfig.middle;
  
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await torNodesApi.logs(node.id, 50);
      setLogs(data.logs);
    } catch (err) {
      setLogs(`Error: ${(err as Error).message}`);
    } finally {
      setLogsLoading(false);
    }
  };
  
  const handleToggleLogs = () => {
    if (!showLogs) {
      fetchLogs();
    }
    setShowLogs(!showLogs);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeConfig.icon}</span>
          <div>
            <h4 className="text-white font-medium">{node.name}</h4>
            <p className="text-xs text-slate-500">{node.nickname}</p>
          </div>
        </div>
        <NodeStatusBadge status={node.status} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        {node.control_port && (
          <div className="bg-slate-900 rounded p-2">
            <span className="text-slate-500">Control</span>
            <p className="text-slate-300 font-mono">{node.control_port}</p>
          </div>
        )}
        {node.or_port && (
          <div className="bg-slate-900 rounded p-2">
            <span className="text-slate-500">OR Port</span>
            <p className="text-slate-300 font-mono">{node.or_port}</p>
          </div>
        )}
        {node.socks_port && (
          <div className="bg-slate-900 rounded p-2">
            <span className="text-slate-500">SOCKS</span>
            <p className="text-slate-300 font-mono">{node.socks_port}</p>
          </div>
        )}
        {node.dir_port && (
          <div className="bg-slate-900 rounded p-2">
            <span className="text-slate-500">Dir Port</span>
            <p className="text-slate-300 font-mono">{node.dir_port}</p>
          </div>
        )}
      </div>
      
      {node.fingerprint && (
        <div className="mb-3">
          <span className="text-xs text-slate-500">Fingerprint</span>
          <p className="text-xs text-slate-400 font-mono truncate bg-slate-900 rounded px-2 py-1">
            {node.fingerprint}
          </p>
        </div>
      )}
      
      {node.onion_address && (
        <div className="mb-3">
          <span className="text-xs text-slate-500">Onion Address</span>
          <p className="text-xs text-purple-400 font-mono truncate bg-slate-900 rounded px-2 py-1">
            {node.onion_address}
          </p>
        </div>
      )}
      
      {node.is_running && (
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div className="bg-slate-900 rounded p-2 text-center">
            <span className="text-slate-500">Read</span>
            <p className="text-green-400 font-mono">{(node.bytes_read / 1024).toFixed(1)}K</p>
          </div>
          <div className="bg-slate-900 rounded p-2 text-center">
            <span className="text-slate-500">Write</span>
            <p className="text-blue-400 font-mono">{(node.bytes_written / 1024).toFixed(1)}K</p>
          </div>
          <div className="bg-slate-900 rounded p-2 text-center">
            <span className="text-slate-500">Circuits</span>
            <p className="text-amber-400 font-mono">{node.circuits_active}</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
        {node.status === 'stopped' && (
          <button
            onClick={() => onAction('start')}
            disabled={actionLoading}
            className="flex-1 py-1.5 rounded bg-green-900/30 text-green-400 text-xs font-medium hover:bg-green-900/50 disabled:opacity-50"
          >
            ▶ Start
          </button>
        )}
        {node.status === 'running' && (
          <button
            onClick={() => onAction('stop')}
            disabled={actionLoading}
            className="flex-1 py-1.5 rounded bg-amber-900/30 text-amber-400 text-xs font-medium hover:bg-amber-900/50 disabled:opacity-50"
          >
            ⏹ Stop
          </button>
        )}
        <button
          onClick={handleToggleLogs}
          className="py-1.5 px-3 rounded bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600"
        >
          📋 Logs
        </button>
      </div>
      
      {showLogs && (
        <div className="mt-3 p-2 bg-slate-950 rounded max-h-40 overflow-auto">
          {logsLoading ? (
            <p className="text-xs text-slate-500">Loading...</p>
          ) : (
            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{logs || 'No logs'}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function TorNetworkDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: network, loading, error, refetch } = useTorNetwork(id || null);
  const { data: liveStatus } = useTorNetworkPolling(
    network?.is_running ? id || null : null, 
    3000
  );
  
  const [actionLoading, setActionLoading] = useState(false);
  const [nodeActionLoading, setNodeActionLoading] = useState<string | null>(null);

  const handleNetworkAction = async (action: NetworkAction) => {
    if (!network) return;
    if (action === 'delete' && !confirm(t('chutney.confirmDelete', `Delete network '${network.name}'?`))) return;
    
    setActionLoading(true);
    try {
      if (action === 'delete') {
        await torNetworksApi.action(network.id, 'delete', true);
        await torNetworksApi.delete(network.id);
        navigate('/tor-networks');
      } else {
        await torNetworksApi.action(network.id, action);
        await refetch();
      }
    } catch (err) {
      alert(`Action failed: ${(err as Error).message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNodeAction = async (nodeId: string, action: NodeAction) => {
    setNodeActionLoading(nodeId);
    try {
      await torNodesApi.action(nodeId, action);
      await refetch();
    } catch (err) {
      alert(`Node action failed: ${(err as Error).message}`);
    } finally {
      setNodeActionLoading(null);
    }
  };

  // Group nodes by type with proper typing
  const nodesByType: Record<NodeType, TorNode[]> = {
    da: [],
    guard: [],
    middle: [],
    exit: [],
    client: [],
    hs: [],
  };
  
  if (network?.nodes && Array.isArray(network.nodes)) {
    network.nodes.forEach((node: TorNode) => {
      const type = node.node_type;
      if (nodesByType[type]) {
        nodesByType[type].push(node);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: neonBlue }}></div>
      </div>
    );
  }

  if (error || !network) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error || t('chutney.networkNotFound', 'Network not found')}
          </div>
        </div>
      </div>
    );
  }

  const status = network.status;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white">{network.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                network.is_running 
                  ? 'bg-green-900/30 text-green-400' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {status.replace('_', ' ')}
              </span>
              <span className="text-slate-500 text-sm">{network.template} template</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Analytics Button - nur bei running */}
            {status === 'running' && (
              <Link
                to={`/tor-networks/${network.id}/analytics`}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
                style={{ backgroundColor: neonBlue, color: '#0f172a' }}
              >
                📊 {t('chutney.actions.analytics', 'Analytics')}
              </Link>
            )}
            
            {status === 'not_created' && (
              <button
                onClick={() => handleNetworkAction('create')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
                🐳 {t('chutney.actions.createInfra', 'Create Infrastructure')}
              </button>
            )}
            {(status === 'stopped' || status === 'created') && (
              <button
                onClick={() => handleNetworkAction('start')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
              >
                ▶ {t('chutney.actions.start', 'Start Network')}
              </button>
            )}
            {status === 'running' && (
              <button
                onClick={() => handleNetworkAction('stop')}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50"
              >
                ⏹ {t('chutney.actions.stop', 'Stop Network')}
              </button>
            )}
            <button
              onClick={() => handleNetworkAction('delete')}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
            >
              🗑 {t('chutney.actions.delete', 'Delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="space-y-6">
          {/* Network Overview */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{t('chutney.networkOverview', 'Network Overview')}</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-800">
                <span className="text-slate-500 text-sm">{t('chutney.totalNodes', 'Total Nodes')}</span>
                <p className="text-2xl font-bold text-white">{network.total_nodes}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800">
                <span className="text-slate-500 text-sm">{t('chutney.running', 'Running')}</span>
                <p className="text-2xl font-bold" style={{ color: neonBlue }}>
                  {liveStatus?.running_nodes || network.running_nodes_count}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800">
                <span className="text-slate-500 text-sm">{t('chutney.consensus', 'Consensus')}</span>
                <p className={`text-2xl font-bold ${network.consensus_valid ? 'text-green-400' : 'text-slate-500'}`}>
                  {network.consensus_valid ? '✓ Valid' : '—'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800">
                <span className="text-slate-500 text-sm">{t('chutney.capture', 'Capture')}</span>
                <p className={`text-2xl font-bold ${network.capture_enabled ? 'text-red-400' : 'text-slate-500'}`}>
                  {network.capture_enabled ? '📹 On' : 'Off'}
                </p>
              </div>
            </div>
            
            {status === 'bootstrapping' && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-400 mb-1">
                  <span>{t('chutney.bootstrapProgress', 'Bootstrap Progress')}</span>
                  <span>{liveStatus?.network.bootstrap_progress || network.bootstrap_progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${liveStatus?.network.bootstrap_progress || network.bootstrap_progress}%`,
                      backgroundColor: neonBlue 
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Node Groups */}
          {(Object.entries(nodesByType) as [NodeType, TorNode[]][])
            .filter(([, nodes]) => nodes.length > 0)
            .map(([type, nodes]) => {
              const typeInfo = nodeTypeConfig[type];
              return (
                <div key={type} className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>{typeInfo.icon}</span>
                    <span>{typeInfo.label}s</span>
                    <span className="text-slate-500 text-sm font-normal">({nodes.length})</span>
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nodes.map((node: TorNode) => (
                      <NodeCard
                        key={node.id}
                        node={node}
                        onAction={(action) => handleNodeAction(node.id, action)}
                        actionLoading={nodeActionLoading === node.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

          {/* Footer Actions */}
          <div className="flex space-x-3">
            <Link 
              to="/tor-networks" 
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ← {t('common.back', 'Back to Networks')}
            </Link>
            <Link 
              to={`/tor-networks/${network.id}/edit`} 
              className="px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: neonBlue, color: '#0f172a' }}
            >
              {t('common.edit', 'Edit Network')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}