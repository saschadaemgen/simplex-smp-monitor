import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useServers, useCategories } from '../hooks/useApi';
import { serversApi, Server, Category } from '../api/client';

// Neon Blue Design System
const neonBlue = '#88CED0';

// Docker Status Badge Component
function DockerStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
    not_created: { bg: 'bg-slate-700/50', text: 'text-slate-400', icon: '⚪' },
    created: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: '🔵' },
    starting: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: '🟡' },
    running: { bg: 'bg-green-900/30', text: 'text-green-400', icon: '🟢' },
    stopping: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: '🟡' },
    stopped: { bg: 'bg-red-900/30', text: 'text-red-400', icon: '🔴' },
    error: { bg: 'bg-red-900/30', text: 'text-red-400', icon: '❌' },
  };
  
  const config = statusConfig[status] || statusConfig.not_created;
  
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
    </span>
  );
}

export default function Servers() {
  const { t } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [testingServer, setTestingServer] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [localServers, setLocalServers] = useState<Server[] | null>(null);

  const { data: categoriesData } = useCategories();
  const { data: serversData, loading, refetch } = useServers({
    category: categoryFilter || undefined,
  });

  const categories = categoriesData || [];
  const servers = localServers || (serversData as any)?.results || [];

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, serverId: number) => {
    setDraggedId(serverId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('ring-2', 'ring-cyan-500/50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-cyan-500/50');
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-cyan-500/50');
    
    if (draggedId === null || draggedId === targetId) return;

    const currentServers = [...servers];
    const draggedIndex = currentServers.findIndex(s => s.id === draggedId);
    const targetIndex = currentServers.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder
    const [draggedServer] = currentServers.splice(draggedIndex, 1);
    currentServers.splice(targetIndex, 0, draggedServer);
    
    setLocalServers(currentServers);
    setDraggedId(null);

    // Save order to API
    try {
      const order = currentServers.map((s, idx) => ({ id: s.id, order: idx }));
      await fetch('/api/v1/servers/reorder/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const togglePassword = (id: number) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQuickTest = async (server: Server) => {
    setTestingServer(server.id);
    try {
      await serversApi.test(server.id);
      await refetch();
      setLocalServers(null);
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      setTestingServer(null);
    }
  };

  const handleDelete = async (server: Server) => {
    if (!confirm(`Delete server '${server.name}'?`)) return;
    try {
      await serversApi.delete(server.id);
      setLocalServers(null);
      refetch();
    } catch (err) {
      alert('Delete failed: ' + (err as Error).message);
    }
  };

  const handleToggleActive = async (server: Server) => {
    try {
      await serversApi.toggleActive(server.id);
      setLocalServers(null);
      refetch();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const timeAgo = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} Sekunden ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} Minute${minutes > 1 ? 'n' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} Stunde${hours > 1 ? 'n' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} Tag${days > 1 ? 'en' : ''} ago`;
  };

  // Get effective host display
  const getHostDisplay = (server: Server) => {
    if (server.is_docker_hosted) {
      if (server.hosting_mode === 'tor' && server.onion_address) {
        return server.onion_address;
      }
      if (server.generated_address) {
        // Extract host from generated address
        const match = server.generated_address.match(/@([^:]+)/);
        if (match) return `${match[1]}:${server.exposed_port || 5223}`;
      }
      return server.docker_status === 'running' ? 'Starting...' : 'Not started';
    }
    return server.host;
  };

  // Get effective fingerprint display
  const getFingerprintDisplay = (server: Server) => {
    if (server.is_docker_hosted && server.generated_fingerprint) {
      return server.generated_fingerprint;
    }
    return server.fingerprint || '-';
  };

  const activeCategory = categories.find((c: { id: number }) => c.id === categoryFilter);

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: neonBlue }}>{t('servers.subtitle')}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{t('servers.description', 'SMP & XFTP Server verwalten')}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link 
              to="/servers/categories" 
              className="px-4 py-2 rounded-lg transition-colors font-medium text-sm inline-flex items-center space-x-2 hover:opacity-90 bg-slate-800/50 border border-slate-700/50"
              style={{ color: neonBlue, borderColor: `${neonBlue}30` }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
              <span>{t('common.category')}</span>
            </Link>
            <Link 
              to="/servers/new" 
              className="px-4 py-2 rounded-lg transition-colors font-medium text-sm inline-flex items-center space-x-2 hover:opacity-90 bg-slate-800/50 border"
              style={{ color: neonBlue, borderColor: `${neonBlue}50` }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              <span>{t('servers.addServer')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="space-y-6">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500 mr-1">{t('common.filter')}:</span>
              <button 
                onClick={() => { setCategoryFilter(null); setLocalServers(null); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === null 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                {t('common.all')} <span className="ml-1 opacity-70">({serversData?.count || 0})</span>
              </button>
              {categories.map((category: { id: number; name: string; color: string; server_count: number }) => (
                <button 
                  key={category.id} 
                  onClick={() => { setCategoryFilter(category.id); setLocalServers(null); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex items-center space-x-1.5 ${
                    categoryFilter === category.id ? 'ring-2 ring-offset-2 ring-offset-slate-950 ring-cyan-500/50' : ''
                  }`}
                  style={{ 
                    backgroundColor: categoryFilter === category.id ? category.color : `${category.color}33`, 
                    color: categoryFilter === category.id ? 'white' : category.color 
                  }}
                >
                  <span 
                    className={`w-2 h-2 rounded-full ${categoryFilter === category.id ? 'bg-white' : ''}`} 
                    style={{ backgroundColor: categoryFilter !== category.id ? category.color : undefined }}
                  ></span>
                  <span>{category.name}</span>
                  <span className="opacity-70">({category.server_count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Active Filter Info */}
          {activeCategory && (
            <div className="flex items-center justify-between bg-slate-800/30 rounded-lg px-4 py-3 border border-slate-700/50">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeCategory.color }}></span>
                <span className="text-slate-300">Zeige Server in <strong>{activeCategory.name}</strong></span>
              </div>
              <button 
                onClick={() => { setCategoryFilter(null); setLocalServers(null); }} 
                className="text-sm hover:underline"
                style={{ color: neonBlue }}
              >
                Filter aufheben
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-5 animate-pulse">
                  <div className="h-6 bg-slate-800/50 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-800/50 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-slate-800/50 rounded w-full mb-2"></div>
                  <div className="h-8 bg-slate-800/50 rounded w-1/3 mt-4"></div>
                </div>
              ))}
            </div>
          )}

          {/* Server Grid */}
          {!loading && servers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server: Server) => (
                <div 
                  key={server.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, server.id)}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, server.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-slate-900/50 rounded-lg border border-slate-800/50 p-5 hover:border-slate-700/50 transition-all flex flex-col ${
                    draggedId === server.id ? 'opacity-50' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-800/50 rounded-lg cursor-grab active:cursor-grabbing drag-handle">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold truncate">{server.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {/* Server Type Badge */}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 font-medium">
                            {server.server_type.toUpperCase()}
                          </span>
                          
                          {/* Hosting Mode Badge */}
                          {server.is_docker_hosted ? (
                            server.hosting_mode === 'chutnex' ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 font-medium">
                                🔬 CHUTNEX
                              </span>
                            ) : server.hosting_mode === 'tor' || server.is_onion ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 font-medium">
                                🧅 ONION
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 font-medium">
                                🏠 LAN
                              </span>
                            )
                          ) : server.is_onion ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 font-medium">
                              🧅 EXT-ONION
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 font-medium">
                              🌍 EXTERN
                            </span>
                          )}
                          
                          {/* Docker Badge with Status */}
                          {server.is_docker_hosted && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 font-medium inline-flex items-center space-x-1">
                              <span>🐳</span>
                              <DockerStatusBadge status={server.docker_status || 'not_created'} />
                            </span>
                          )}
                          
                          {/* Categories */}
                          {server.categories?.map((cat: Category) => (
                            <span key={cat.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Active Toggle */}
                    <button onClick={() => handleToggleActive(server)} className="p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors" title="Toggle Active">
                      {server.is_active ? (
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
                      ) : (
                        <span className="h-3 w-3 rounded-full bg-slate-600 block"></span>
                      )}
                    </button>
                  </div>

                  {/* Server Info - Fixed Height for Consistency */}
                  <div className="space-y-2 text-sm flex-grow">
                    {/* Host */}
                    <div>
                      <span className="text-slate-500 text-xs">Host</span>
                      <p className="font-mono text-xs text-slate-300 bg-slate-800/50 px-2 py-1 rounded truncate">
                        {getHostDisplay(server)}
                      </p>
                    </div>
                    
                    {/* Fingerprint */}
                    <div>
                      <span className="text-slate-500 text-xs">Fingerprint</span>
                      <p className="font-mono text-xs text-slate-300 bg-slate-800/50 px-2 py-1 rounded truncate">
                        {getFingerprintDisplay(server)}
                      </p>
                    </div>
                    
                    {/* Password - ALWAYS SHOWN */}
                    <div>
                      <span className="text-slate-500 text-xs">Password</span>
                      <div className="flex items-center space-x-2">
                        <p className="flex-1 font-mono text-xs text-slate-300 bg-slate-800/50 px-2 py-1 rounded truncate">
                          {server.password ? (
                            showPasswords[server.id] ? server.password : '••••••••'
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </p>
                        {server.password && (
                          <button onClick={() => togglePassword(server.id)} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPasswords[server.id] ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"}/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {/* Online Status */}
                        {server.last_status === 'online' ? (
                          <>
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: 'rgba(136, 206, 208, 0.2)',
                                color: neonBlue
                              }}
                            >
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>
                              Online
                            </span>
                            {server.last_latency && <span className="text-xs font-mono text-slate-500">{server.last_latency}ms</span>}
                          </>
                        ) : server.last_status === 'error' || server.last_status === 'offline' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>
                            {server.last_status === 'error' ? 'Error' : 'Offline'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Not tested</span>
                        )}
                        {server.last_check && <span className="text-xs text-slate-500">{timeAgo(server.last_check)}</span>}
                      </div>
                      <button 
                        onClick={() => handleQuickTest(server)} 
                        disabled={testingServer === server.id}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-50 hover:opacity-80"
                        style={{ color: neonBlue }}
                        title="Test Connection"
                      >
                        {testingServer === server.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 mt-3 pt-3 border-t border-slate-800/50 text-sm">
                      <Link 
                        to={`/servers/${server.id}`} 
                        className="transition-colors hover:opacity-80"
                        style={{ color: neonBlue }}
                      >
                        Details
                      </Link>
                      <Link 
                        to={`/servers/${server.id}/edit`} 
                        className="transition-colors hover:opacity-80"
                        style={{ color: neonBlue }}
                      >
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(server)} className="text-red-400 hover:text-red-300 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && servers.length === 0 && (
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-12 text-center">
              <svg className="w-16 h-16 text-slate-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/>
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">{t('servers.noServers')}</h3>
              <p className="text-slate-500 mb-4">{t('servers.addFirstServer')}</p>
              <Link 
                to="/servers/new" 
                className="px-6 py-2 rounded-lg transition-colors font-medium inline-block hover:opacity-90 bg-slate-800/50 border"
                style={{ color: neonBlue, borderColor: `${neonBlue}50` }}
              >
                {t('servers.addServer')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}