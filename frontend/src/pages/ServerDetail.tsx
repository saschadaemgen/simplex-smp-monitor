import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useServer } from '../hooks/useApi';
import { serversApi } from '../api/client';

// Neon Blue
const neonBlue = '#88CED0';

export default function ServerDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: server, loading, error } = useServer(id ? parseInt(id) : null);

  const handleDelete = async () => {
    if (!server) return;
    if (!confirm(`Delete server '${server.name}'?`)) return;
    try {
      await serversApi.delete(server.id);
      navigate('/servers');
    } catch (err) {
      alert('Delete failed: ' + (err as Error).message);
    }
  };

  const handleToggle = async () => {
    if (!server) return;
    try {
      await serversApi.toggleActive(server.id);
      window.location.reload();
    } catch (err) {
      alert('Toggle failed: ' + (err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: neonBlue }}></div>
        </div>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            {error || 'Server not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <div className="flex justify-between items-start">
          <div>
            <Link 
              to="/servers" 
              className="text-sm flex items-center gap-1 mb-2 hover:opacity-80 transition-opacity"
              style={{ color: neonBlue }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              {t('servers.allServers', 'Alle Server')}
            </Link>
            <h1 className="text-xl font-semibold text-white">{server.name}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{server.server_type.toUpperCase()} Server</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              server.is_active 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'bg-slate-500/20 text-slate-400'
            }`}>
              {server.is_active ? t('common.active') : t('common.inactive')}
            </span>
            <button 
              onClick={handleToggle} 
              className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 px-4 py-1.5 rounded-lg text-sm font-medium border border-slate-700/50 transition-colors"
            >
              {server.is_active ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="space-y-6">
          {/* Server Details Card */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-5">Server Details</h2>
            <dl className="space-y-5">
              <div>
                <dt className="text-slate-500 text-sm font-medium mb-1">Host</dt>
                <dd className="text-white font-mono text-sm bg-slate-800/50 p-3 rounded-lg break-all">{server.host}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-sm font-medium mb-1">Fingerprint</dt>
                <dd className="text-white font-mono text-sm bg-slate-800/50 p-3 rounded-lg break-all">{server.fingerprint || '-'}</dd>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <dt className="text-slate-500 text-sm font-medium mb-1">Status</dt>
                  <dd>
                    <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                      server.last_status === 'online' 
                        ? 'bg-cyan-500/20 text-cyan-400' 
                        : server.last_status === 'offline' 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {server.last_status || 'Unknown'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-sm font-medium mb-1">Letzter Check</dt>
                  <dd className="text-white">{server.last_check ? new Date(server.last_check).toLocaleString('de-DE') : '—'}</dd>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <dt className="text-slate-500 text-sm font-medium mb-1">Latenz</dt>
                  <dd className="text-white">{server.last_latency ? `${server.last_latency}ms` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 text-sm font-medium mb-1">Uptime</dt>
                  <dd className="text-white">{server.uptime_percent ? `${server.uptime_percent.toFixed(1)}%` : '—'}</dd>
                </div>
              </div>
              {server.is_onion && (
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">🧅 Onion</span>
                </div>
              )}
            </dl>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Link 
              to="/servers" 
              className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 px-4 py-2 rounded-lg font-medium border border-slate-700/50 transition-colors"
            >
              ← Zurück
            </Link>
            <Link 
              to={`/servers/${server.id}/edit`} 
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: neonBlue, color: '#0f172a' }}
            >
              Bearbeiten
            </Link>
            <button 
              onClick={handleDelete} 
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg font-medium border border-red-500/30 transition-colors"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}