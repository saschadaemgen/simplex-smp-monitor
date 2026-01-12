import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  dockerApi, 
  DockerManagedContainer, 
  DockerManagerInfo, 
  ContainerStats 
} from '../api/client';

// Color scheme
const neonBlue = '#88CED0';
const neonGlow = '0 0 10px rgba(136, 206, 208, 0.6), 0 0 20px rgba(136, 206, 208, 0.3)';

// Check if container is Tor/ChutneX related
function isTorContainer(container: { name: string; networks?: Record<string, any>; image?: string }): boolean {
  const name = container.name.toLowerCase();
  const image = (container.image || '').toLowerCase();
  const networks = Object.keys(container.networks || {}).map(n => n.toLowerCase());
  
  // Check name
  if (name.includes('tor') || name.includes('chutnex') || name.includes('chutney')) {
    return true;
  }
  
  // Check image
  if (image.includes('tor') || image.includes('chutnex') || image.includes('chutney')) {
    return true;
  }
  
  // Check networks
  if (networks.some(n => n.includes('tor') || n.includes('chutnex') || n.includes('chutney'))) {
    return true;
  }
  
  return false;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function formatUptime(startedAt: string): string {
  if (!startedAt || startedAt === '0001-01-01T00:00:00Z') return '-';
  const start = new Date(startedAt);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

// Progress Bar Component with Glow
function GlowBar({ percent, color, glow }: { percent: number; color: string; glow: string }) {
  // Minimum 3% width so it's visible but subtle
  const displayPercent = Math.max(percent, 3);
  const isWarning = percent > 80;
  const barColor = isWarning ? '#ef4444' : color;
  const barGlow = isWarning ? '0 0 10px rgba(239, 68, 68, 0.6)' : glow;
  
  return (
    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500"
        style={{ 
          width: `${Math.min(displayPercent, 100)}%`,
          backgroundColor: barColor,
          boxShadow: barGlow,
        }}
      />
    </div>
  );
}

interface ExtendedContainer extends DockerManagedContainer {
  image_size?: number;
}

function ExpandableRow({ 
  container, stats, isSelected, isExpanded, isLoading,
  onToggleSelect, onToggleExpand, onAction, onRemove, onOpenLogs, t 
}: {
  container: ExtendedContainer;
  stats?: ContainerStats;
  isSelected: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onAction: (action: string, e?: React.MouseEvent) => void;
  onRemove: (force: boolean, e?: React.MouseEvent) => void;
  onOpenLogs: (e?: React.MouseEvent) => void;
  t: any;
}) {
  const isTor = isTorContainer(container);
  // Stats always in neonBlue
  const statsColor = neonBlue;
  const statsGlowStyle = neonGlow;

  const getStatusColor = (status: string) => {
    if (status === 'running') {
      return isTor ? 'bg-purple-500' : 'bg-cyan-600';
    }
    switch (status) {
      case 'exited': return 'bg-slate-500';
      case 'paused': return 'bg-amber-500';
      case 'restarting': return 'bg-blue-500';
      case 'dead': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusGlow = (status: string) => {
    if (status === 'running') {
      return isTor ? '0 0 8px rgba(125, 70, 152, 0.6)' : '0 0 8px rgba(74, 155, 160, 0.6)';
    }
    return undefined;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'running') {
      return isTor 
        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
    switch (status) {
      case 'exited': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'paused': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'restarting': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'dead': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <>
      <tr 
        className={`border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer ${isSelected ? 'bg-slate-800/30' : ''} ${isExpanded ? 'bg-slate-800/40' : ''}`}
        onClick={onToggleExpand}
      >
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={onToggleSelect}
            className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"/>
        </td>
        <td className="p-3 w-8">
          <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </td>
        <td className="p-3 w-8">
          <div className="relative">
            <div 
              className={`w-2.5 h-2.5 rounded-full ${getStatusColor(container.status)}`} 
              style={{ boxShadow: getStatusGlow(container.status) }}
            ></div>
            {container.status === 'running' && (
              <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${getStatusColor(container.status)} animate-ping opacity-50`}></div>
            )}
          </div>
        </td>
        <td className="p-3">
          <div className="font-medium text-white flex items-center gap-2">
            {container.name}
            {isTor && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400" title="Tor Network">
                🧅
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono">{container.short_id}</div>
        </td>
        <td className="p-3">
          <div className="text-slate-300 font-mono text-xs truncate max-w-[150px]" title={container.image}>
            {container.image.split(':')[0].split('/').pop()}
          </div>
        </td>
        <td className="p-3">
          <span className="text-slate-400 text-xs">{formatBytes(container.image_size || 0)}</span>
        </td>
        <td className="p-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${getStatusBadge(container.status)}`}>
            {container.status}
          </span>
        </td>
        <td className="p-3 w-32">
          {stats && container.status === 'running' ? (
            <div className="space-y-1">
              <GlowBar percent={stats.cpu_percent} color={statsColor} glow={statsGlowStyle} />
              <div className="text-xs text-right" style={{ color: statsColor }}>{stats.cpu_percent.toFixed(1)}%</div>
            </div>
          ) : <span className="text-slate-600 text-xs">-</span>}
        </td>
        <td className="p-3 w-36">
          {stats && container.status === 'running' ? (
            <div className="space-y-1">
              <GlowBar percent={stats.memory_percent} color={statsColor} glow={statsGlowStyle} />
              <div className="text-xs text-right" style={{ color: statsColor }}>{formatBytes(stats.memory_usage)}</div>
            </div>
          ) : <span className="text-slate-600 text-xs">-</span>}
        </td>
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <>
                <button onClick={(e) => onOpenLogs(e)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title={t('docker.logs')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </button>
                {container.status === 'running' ? (
                  <>
                    <button onClick={(e) => onAction('restart', e)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors" title={t('docker.restart')}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                    </button>
                    <button onClick={(e) => onAction('stop', e)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors" title={t('docker.stop')}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
                      </svg>
                    </button>
                  </>
                ) : container.status === 'paused' ? (
                  <button onClick={(e) => onAction('unpause', e)} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors" title={t('docker.unpause')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                ) : (
                  <button onClick={(e) => onAction('start', e)} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors" title={t('docker.start')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                )}
                <button onClick={(e) => onRemove(container.status === 'running', e)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title={t('docker.remove')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-800/20">
          <td colSpan={10} className="p-0">
            <div className="p-4 border-t border-slate-800/50 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Container</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-slate-400">ID:</span><span className="text-white font-mono text-xs">{container.id.substring(0, 12)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Created:</span><span className="text-white text-xs">{formatDate(container.created)}</span></div>
                    {container.state?.started_at && container.status === 'running' && (
                      <div className="flex justify-between"><span className="text-slate-400">Uptime:</span><span className="text-white text-xs">{formatUptime(container.state.started_at)}</span></div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Image</h4>
                  <div className="space-y-1">
                    <div className="text-white font-mono text-xs break-all">{container.image}</div>
                    {container.image_size && <div className="text-slate-400 text-xs">Size: {formatBytes(container.image_size)}</div>}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ports</h4>
                  <div className="space-y-1">
                    {container.ports && container.ports.length > 0 ? (
                      container.ports.map((p, i) => (
                        <div key={i} className="text-white font-mono text-xs">{p.host_bindings?.[0]?.host_port || '?'}:{p.container_port}</div>
                      ))
                    ) : <span className="text-slate-500 text-xs">No ports exposed</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resources</h4>
                  {stats && container.status === 'running' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between"><span className="text-slate-400">CPU:</span><span style={{ color: statsColor }} className="text-xs">{stats.cpu_percent.toFixed(2)}%</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Memory:</span><span style={{ color: statsColor }} className="text-xs">{formatBytes(stats.memory_usage)} / {formatBytes(stats.memory_limit)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Net I/O:</span><span style={{ color: statsColor }} className="text-xs">↓{formatBytes(stats.network_rx)} / ↑{formatBytes(stats.network_tx)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Block I/O:</span><span style={{ color: statsColor }} className="text-xs">R:{formatBytes(stats.block_read)} / W:{formatBytes(stats.block_write)}</span></div>
                    </div>
                  ) : <span className="text-slate-500 text-xs">Container not running</span>}
                </div>
              </div>
              {container.mounts && container.mounts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mounts</h4>
                  <div className="space-y-1">
                    {container.mounts.map((m, i) => (
                      <div key={i} className="text-xs font-mono flex items-center gap-2">
                        <span className="text-slate-500">{m.type}:</span>
                        <span className="text-slate-400">{m.source}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-white">{m.destination}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {container.networks && Object.keys(container.networks).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Networks</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(container.networks).map(([name, info]) => {
                      const isNetworkTor = name.toLowerCase().includes('tor') || name.toLowerCase().includes('chutnex');
                      return (
                        <div key={name} className={`rounded px-2 py-1 text-xs ${isNetworkTor ? 'bg-purple-500/20' : 'bg-slate-700/50'}`}>
                          <span className={isNetworkTor ? 'text-purple-300' : 'text-white'}>{isNetworkTor && '🧅 '}{name}</span>
                          {info.ip_address && <span className="text-slate-400 ml-2">{info.ip_address}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ContainerCard({ container, stats, isSelected, isLoading, onToggleSelect, onAction, onRemove, onOpenLogs, t }: {
  container: ExtendedContainer; stats?: ContainerStats; isSelected: boolean; isLoading: boolean;
  onToggleSelect: () => void; onAction: (action: string) => void; onRemove: (force: boolean) => void; onOpenLogs: () => void; t: any;
}) {
  const isTor = isTorContainer(container);
  // Stats always in neonBlue
  const statsColor = neonBlue;
  const statsGlowStyle = neonGlow;

  const getStatusColor = (s: string) => {
    if (s === 'running') return isTor ? 'bg-purple-500' : 'bg-cyan-600';
    if (s === 'paused') return 'bg-amber-500';
    return 'bg-slate-500';
  };

  const getStatusGlow = (s: string) => {
    if (s === 'running') {
      return isTor ? '0 0 8px rgba(125, 70, 152, 0.6)' : '0 0 8px rgba(74, 155, 160, 0.6)';
    }
    return undefined;
  };

  const getStatusBadge = (s: string) => {
    if (s === 'running') {
      return isTor 
        ? 'bg-purple-500/20 text-purple-400'
        : 'bg-cyan-500/20 text-cyan-400';
    }
    if (s === 'paused') return 'bg-amber-500/20 text-amber-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className={`bg-slate-900 rounded-lg border transition-all overflow-hidden ${isSelected ? 'border-cyan-500 ring-1 ring-cyan-500/50' : isTor ? 'border-purple-800 hover:border-purple-700' : 'border-slate-800 hover:border-slate-700'}`}>
      <div className="p-3 border-b border-slate-800 flex items-center gap-3">
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="rounded border-slate-600 bg-slate-800 text-cyan-500"/>
        <div className="relative">
          <div 
            className={`w-2.5 h-2.5 rounded-full ${getStatusColor(container.status)}`} 
            style={{ boxShadow: getStatusGlow(container.status) }}
          ></div>
          {container.status === 'running' && <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${getStatusColor(container.status)} animate-ping opacity-50`}></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white truncate flex items-center gap-1">
            {container.name}
            {isTor && <span className="text-xs" title="Tor Network">🧅</span>}
          </div>
          <div className="text-xs text-slate-500 font-mono">{container.short_id}</div>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge(container.status)}`}>{container.status}</span>
      </div>
      <div className="p-3 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Image:</span>
          <span className="text-slate-300 font-mono text-xs truncate max-w-[150px]">{container.image.split(':')[0].split('/').pop()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Size:</span>
          <span className="text-slate-300 text-xs">{formatBytes(container.image_size || 0)}</span>
        </div>
        {container.status === 'running' && stats && (
          <>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">CPU</span>
                <span style={{ color: statsColor }}>{stats.cpu_percent.toFixed(1)}%</span>
              </div>
              <GlowBar percent={stats.cpu_percent} color={statsColor} glow={statsGlowStyle} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Memory</span>
                <span style={{ color: statsColor }}>{formatBytes(stats.memory_usage)}</span>
              </div>
              <GlowBar percent={stats.memory_percent} color={statsColor} glow={statsGlowStyle} />
            </div>
          </>
        )}
      </div>
      <div className="p-2 border-t border-slate-800 flex justify-between">
        <button onClick={onOpenLogs} className="p-1.5 text-slate-400 hover:text-white rounded" title={t('docker.logs')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </button>
        <div className="flex gap-1">
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin text-slate-400 m-1.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          ) : (
            <>
              {container.status === 'running' ? (
                <>
                  <button onClick={() => onAction('restart')} className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
                  <button onClick={() => onAction('stop')} className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg></button>
                </>
              ) : (
                <button onClick={() => onAction('start')} className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button>
              )}
              <button onClick={() => onRemove(container.status === 'running')} className="p-1.5 text-slate-400 hover:text-red-400 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Docker() {
  const { t } = useTranslation();
  const [dockerInfo, setDockerInfo] = useState<DockerManagerInfo | null>(null);
  const [containers, setContainers] = useState<ExtendedContainer[]>([]);
  const [containerStats, setContainerStats] = useState<Record<string, ContainerStats>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedContainers, setSelectedContainers] = useState<Set<string>>(new Set());
  const [logsModal, setLogsModal] = useState<{ containerId: string; name: string } | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);

  // Count Tor containers
  const torCount = containers.filter(c => c.status === 'running' && isTorContainer(c)).length;
  const normalCount = containers.filter(c => c.status === 'running' && !isTorContainer(c)).length;

  const fetchDockerInfo = useCallback(async () => {
    try { setDockerInfo(await dockerApi.info()); } catch (err) { console.error('Docker info error:', err); }
  }, []);

  const fetchContainers = useCallback(async () => {
    try {
      const response = await dockerApi.list({ all: true });
      setContainers(response.containers as ExtendedContainer[]);
      setError(null);
    } catch (err) {
      console.error('Container list error:', err);
      setError('Failed to connect to Docker');
    } finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await dockerApi.allStats();
      const statsMap: Record<string, ContainerStats> = {};
      response.stats.forEach((stat: ContainerStats) => { statsMap[stat.container_id] = stat; });
      setContainerStats(statsMap);
    } catch (err) { console.error('Stats error:', err); }
  }, []);

  useEffect(() => { fetchDockerInfo(); fetchContainers(); fetchStats(); }, [fetchDockerInfo, fetchContainers, fetchStats]);
  useEffect(() => {
    const statsInterval = setInterval(fetchStats, 5000);
    const listInterval = setInterval(() => { fetchContainers(); fetchDockerInfo(); }, 15000);
    return () => { clearInterval(statsInterval); clearInterval(listInterval); };
  }, [fetchStats, fetchContainers, fetchDockerInfo]);

  const handleAction = async (containerId: string, action: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoading(`${containerId}-${action}`);
    try { await dockerApi.action(containerId, action as any); await fetchContainers(); await fetchStats(); await fetchDockerInfo(); } 
    catch (err) { console.error(`Action ${action} error:`, err); } 
    finally { setActionLoading(null); }
  };

  const handleRemove = async (containerId: string, force: boolean = false, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(t('docker.confirmRemove'))) return;
    setActionLoading(`${containerId}-remove`);
    try { await dockerApi.remove(containerId, force); await fetchContainers(); await fetchDockerInfo(); } 
    catch (err) { console.error('Remove error:', err); } 
    finally { setActionLoading(null); }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedContainers.size === 0) return;
    if (!confirm(t('docker.confirmBulkAction', { count: selectedContainers.size, action }))) return;
    setActionLoading('bulk');
    try { await dockerApi.bulk(Array.from(selectedContainers), action as any); setSelectedContainers(new Set()); await fetchContainers(); await fetchStats(); await fetchDockerInfo(); } 
    catch (err) { console.error('Bulk error:', err); } 
    finally { setActionLoading(null); }
  };

  const handlePrune = async () => {
    if (!confirm(t('docker.confirmPrune'))) return;
    setActionLoading('prune');
    try { const result = await dockerApi.prune(); alert(t('docker.pruneSuccess', { count: result.containers_deleted?.length || 0 })); await fetchContainers(); await fetchDockerInfo(); } 
    catch (err) { console.error('Prune error:', err); } 
    finally { setActionLoading(null); }
  };

  const openLogs = async (containerId: string, name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLogsModal({ containerId, name });
    setLogsLoading(true);
    try { const response = await dockerApi.logs(containerId, 200); setLogs(response.logs); } 
    catch (err) { setLogs('Failed to load logs'); } 
    finally { setLogsLoading(false); }
  };

  const filteredContainers = containers
    .filter(c => (statusFilter === 'all' || c.status === statusFilter) && (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => {
      const aVal = sortField === 'status' ? a.status : sortField === 'image' ? a.image : a.name;
      const bVal = sortField === 'status' ? b.status : sortField === 'image' ? b.image : b.name;
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

  const toggleSelection = (id: string) => { const s = new Set(selectedContainers); s.has(id) ? s.delete(id) : s.add(id); setSelectedContainers(s); };
  const toggleSelectAll = () => { setSelectedContainers(selectedContainers.size === filteredContainers.length ? new Set() : new Set(filteredContainers.map(c => c.id))); };
  const toggleExpand = (id: string) => { const e = new Set(expandedRows); e.has(id) ? e.delete(id) : e.add(id); setExpandedRows(e); };
  const handleSort = (field: string) => { sortField === field ? setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') : (setSortField(field), setSortOrder('asc')); };

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 inline-block w-3">{sortField === field && (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        {sortOrder === 'asc' ? <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z"/> : <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z"/>}
      </svg>
    )}</span>
  );

  if (loading) return <div className="flex justify-center items-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: neonBlue }}></div></div>;
  if (error) return (
    <div className="text-center py-24">
      <div className="text-red-500 text-6xl mb-4">🐳</div>
      <h2 className="text-xl font-semibold text-white mb-2">{t('docker.connectionError')}</h2>
      <p className="text-slate-500">{error}</p>
      <button onClick={() => { setLoading(true); fetchContainers(); }} className="mt-4 px-4 py-2 rounded-lg border" style={{ borderColor: neonBlue, color: neonBlue }}>{t('common.retry')}</button>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: neonBlue }}>🐳 {t('docker.title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('docker.subtitle')}</p>
        </div>
        {dockerInfo && (
          <div className="flex items-center gap-4 text-sm">
            {torCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" style={{ boxShadow: '0 0 8px rgba(125, 70, 152, 0.6)' }}></span>
                <span className="text-slate-400">{torCount} 🧅 tor</span>
              </div>
            )}
            {normalCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" style={{ boxShadow: '0 0 8px rgba(74, 155, 160, 0.6)' }}></span>
                <span className="text-slate-400">{normalCount} {t('docker.running').toLowerCase()}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span className="text-slate-400">{dockerInfo.containers_stopped} {t('docker.stopped').toLowerCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" style={{ boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)' }}></span>
              <span className="text-slate-400">{dockerInfo.containers_paused} {t('docker.paused').toLowerCase()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('docker.searchPlaceholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 pl-8 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"/>
            <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none">
            <option value="all">{t('docker.filter.all')}</option>
            <option value="running">{t('docker.filter.running')}</option>
            <option value="exited">{t('docker.filter.exited')}</option>
            <option value="paused">{t('docker.filter.paused')}</option>
          </select>
          <div className="flex rounded overflow-hidden border border-slate-700">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            </button>
            <button onClick={() => setViewMode('cards')} className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'cards' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            </button>
          </div>
          <div className="flex-1"></div>
          {selectedContainers.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{selectedContainers.size} {t('docker.selected')}</span>
              <button onClick={() => handleBulkAction('start')} className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">{t('docker.startAll')}</button>
              <button onClick={() => handleBulkAction('stop')} className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">{t('docker.stopAll')}</button>
              <button onClick={() => handleBulkAction('remove')} className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">{t('docker.removeAll')}</button>
            </div>
          )}
          <button onClick={handlePrune} disabled={actionLoading === 'prune'} className="px-3 py-1.5 text-sm rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600">{t('docker.prune')}</button>
          <button onClick={() => { fetchContainers(); fetchStats(); fetchDockerInfo(); }} className="px-3 py-1.5 text-sm rounded border transition-all" style={{ borderColor: neonBlue, color: neonBlue, boxShadow: neonGlow }}>{t('common.refresh')}</button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="p-3 w-10"><input type="checkbox" checked={selectedContainers.size === filteredContainers.length && filteredContainers.length > 0} onChange={toggleSelectAll} className="rounded border-slate-600 bg-slate-800 text-cyan-500"/></th>
                  <th className="p-3 w-8"></th>
                  <th className="p-3 w-8"></th>
                  <th className="p-3 cursor-pointer hover:text-white text-slate-400 select-none" onClick={() => handleSort('name')}>Name <SortIcon field="name"/></th>
                  <th className="p-3 cursor-pointer hover:text-white text-slate-400 select-none" onClick={() => handleSort('image')}>Image <SortIcon field="image"/></th>
                  <th className="p-3 text-slate-400 w-20">Size</th>
                  <th className="p-3 cursor-pointer hover:text-white text-slate-400 select-none" onClick={() => handleSort('status')}>Status <SortIcon field="status"/></th>
                  <th className="p-3 text-slate-400 w-32">CPU</th>
                  <th className="p-3 text-slate-400 w-36">Memory</th>
                  <th className="p-3 text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContainers.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-500"><div className="text-4xl mb-2">🐳</div>{t('docker.noContainers')}</td></tr>
                ) : filteredContainers.map(container => (
                  <ExpandableRow key={container.id} container={container} stats={containerStats[container.id]} isSelected={selectedContainers.has(container.id)} isExpanded={expandedRows.has(container.id)} isLoading={!!actionLoading?.startsWith(container.id)}
                    onToggleSelect={() => toggleSelection(container.id)} onToggleExpand={() => toggleExpand(container.id)} onAction={(a, e) => handleAction(container.id, a, e)} onRemove={(f, e) => handleRemove(container.id, f, e)} onOpenLogs={(e) => openLogs(container.id, container.name, e)} t={t}/>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
            <span>{filteredContainers.length} containers</span>
            {dockerInfo && <span>Docker {dockerInfo.docker_version} • {dockerInfo.images_total} images • {dockerInfo.cpus} CPUs • {formatBytes(dockerInfo.memory_total)} RAM</span>}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredContainers.length === 0 ? (
            <div className="col-span-full bg-slate-900 rounded-lg border border-slate-800 p-12 text-center">
              <div className="text-6xl mb-4">🐳</div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('docker.noContainers')}</h3>
              <p className="text-slate-500">{t('docker.noContainersDesc')}</p>
            </div>
          ) : filteredContainers.map(container => (
            <ContainerCard key={container.id} container={container} stats={containerStats[container.id]} isSelected={selectedContainers.has(container.id)} isLoading={!!actionLoading?.startsWith(container.id)}
              onToggleSelect={() => toggleSelection(container.id)} onAction={(a) => handleAction(container.id, a)} onRemove={(f) => handleRemove(container.id, f)} onOpenLogs={() => openLogs(container.id, container.name)} t={t}/>
          ))}
        </div>
      )}

      {logsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg border border-slate-700 w-full max-w-5xl max-h-[85vh] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-medium" style={{ color: neonBlue }}>📋 {logsModal.name}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => openLogs(logsModal.containerId, logsModal.name)} className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-400 hover:text-white">{t('common.refresh')}</button>
                <button onClick={() => setLogsModal(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs">
              {logsLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: neonBlue }}></div></div> : <pre className="whitespace-pre-wrap text-slate-300">{logs || t('docker.noLogs')}</pre>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}