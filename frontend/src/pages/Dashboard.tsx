import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { dashboardApi, DashboardStats } from '../api/client';

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: stats, loading: statsLoading } = useApi<DashboardStats>(() => dashboardApi.getStats());
  const { data: recentServers } = useApi<any[]>(() => dashboardApi.getRecentServers(5));
  const { data: recentTests } = useApi<any[]>(() => dashboardApi.getRecentTests(5));
  const { data: recentEvents } = useApi<any[]>(() => dashboardApi.getRecentEvents(5));
  
  const loading = statsLoading;
  
  // Neon Blue Color System
  const neonBlue = '#88CED0';
  const cyan = '#22D3EE';
  
  // Demo data for upcoming features
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Demo: Simulated traffic data for the last 24h (more realistic values)
  const trafficData = [
    { hour: '00:00', messages: 120 },
    { hour: '02:00', messages: 85 },
    { hour: '04:00', messages: 45 },
    { hour: '06:00', messages: 95 },
    { hour: '08:00', messages: 180 },
    { hour: '10:00', messages: 245 },
    { hour: '12:00', messages: 310 },
    { hour: '14:00', messages: 285 },
    { hour: '16:00', messages: 320 },
    { hour: '18:00', messages: 275 },
    { hour: '20:00', messages: 195 },
    { hour: '22:00', messages: 145 },
  ];

  // Demo: Tor circuit status
  const torCircuits = [
    { id: 'circuit-1', status: 'established', hops: 3, latency: 234 },
    { id: 'circuit-2', status: 'established', hops: 3, latency: 189 },
    { id: 'circuit-3', status: 'building', hops: 2, latency: null },
    { id: 'circuit-4', status: 'established', hops: 3, latency: 312 },
  ];

  // Demo: System diagnostics
  const diagnostics = {
    cpu: 23,
    memory: 45,
    disk: 67,
    network: 'healthy',
    docker: 'running',
    redis: 'connected',
    tor: 'connected',
  };

  // Demo: Recent forensic events
  const forensicEvents = [
    { time: '14:02:34', type: 'pattern', message: 'Unusual timing correlation detected', severity: 'warning' },
    { time: '13:45:12', type: 'metadata', message: 'Message size analysis complete', severity: 'info' },
    { time: '12:30:05', type: 'traffic', message: 'Traffic spike on SMP-03', severity: 'info' },
  ];

  const maxTraffic = Math.max(...trafficData.map(d => d.messages));

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: neonBlue }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: neonBlue }}>{t('dashboard.title')}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{t('dashboard.subtitle')}</p>
          </div>
          <div className="text-sm text-slate-500">
            {t('time.lastUpdate')}: <span style={{ color: neonBlue }}>{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="space-y-6">
          {/* Main Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Servers */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm">{t('dashboard.totalServers')}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: neonBlue }}>{stats?.total_servers || 0}</p>
                  <p className="text-xs mt-2">
                    <span style={{ color: neonBlue }}>{stats?.online_servers || 0} online</span>
                    <span className="text-slate-500 mx-1">•</span>
                    <span className="text-slate-500">{stats?.onion_servers || 0} onion</span>
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50">
                  <svg className="w-6 h-6" style={{ color: neonBlue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Servers */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm">{t('dashboard.activeServers')}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: neonBlue }}>{stats?.active_servers || 0}</p>
                  <p className="text-xs mt-2" style={{ color: cyan }}>100% uptime</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50">
                  <svg className="w-6 h-6" style={{ color: cyan }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Running Tests */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm">{t('dashboard.runningTests')}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: neonBlue }}>{stats?.running_tests || 0}</p>
                  <p className="text-xs mt-2">
                    <span style={{ color: neonBlue }}>{stats?.active_tests || 1} Active</span>
                    <span className="text-slate-500 mx-1">•</span>
                    <span className="text-slate-500">{stats?.total_tests || 1} total</span>
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Avg Latency */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm">{t('dashboard.avgLatency')}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: neonBlue }}>{stats?.avg_latency || 0}ms</p>
                  <p className="text-xs mt-2">
                    <span style={{ color: neonBlue }}>{stats?.running_clients || 0} clients</span>
                    <span className="text-slate-500"> running</span>
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50">
                  <svg className="w-6 h-6" style={{ color: neonBlue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Traffic Analysis - Server Activity (24h) */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: neonBlue }}>{t('dashboard.serverActivity')}</h2>
                <span className="text-xs text-slate-500">24h</span>
              </div>
              <div className="h-48 flex items-end gap-1">
                {trafficData.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full rounded-t transition-all hover:opacity-80"
                      style={{ 
                        height: `${(item.messages / maxTraffic) * 100}%`,
                        backgroundColor: cyan,
                        minHeight: '4px'
                      }}
                      title={`${item.messages} messages`}
                    ></div>
                    <span className="text-[10px] text-slate-500 rotate-45 origin-left">{item.hour}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Latency Overview */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: neonBlue }}>{t('dashboard.latencyOverview')}</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cyan }}></div>
                    <span className="text-xs text-slate-500">Avg</span>
                  </div>
                </div>
              </div>
              <div className="h-48 flex items-end gap-3">
                {(() => {
                  // Check if we have real servers with actual latency data
                  const serversWithLatency = recentServers?.filter((s: any) => s.last_latency_ms && s.last_latency_ms > 0) || [];
                  
                  const displayData = serversWithLatency.length > 0 
                    ? serversWithLatency.slice(0, 5).map((s: any) => ({ name: s.name, latency: s.last_latency_ms }))
                    : [
                        { name: 'RPi SMP-01', latency: 324 },
                        { name: 'RPi SMP-02', latency: 289 },
                        { name: 'RPi SMP-03', latency: 412 },
                        { name: 'VPS XFTP', latency: 156 },
                      ];
                  
                  return displayData.map((server: any, index: number) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full rounded-t transition-all hover:opacity-80"
                      style={{ 
                        height: `${Math.min((server.latency / 500) * 100, 100)}%`,
                        backgroundColor: cyan,
                        minHeight: '20px'
                      }}
                    ></div>
                    <span className="text-xs font-mono" style={{ color: neonBlue }}>{server.latency}ms</span>
                    <span className="text-[10px] text-slate-500 truncate max-w-full">{server.name}</span>
                  </div>
                ));
                })()}
              </div>
              {/* Average line indicator */}
              <div className="relative -mt-24 mb-20 border-t-2 border-dashed" style={{ borderColor: `${neonBlue}50` }}>
                <span className="absolute -top-3 right-0 text-xs px-1 bg-slate-900" style={{ color: neonBlue }}>Avg</span>
              </div>
            </div>
          </div>

          {/* Three Column Section */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Recent Servers */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: neonBlue }}>{t('dashboard.recentServers')}</h2>
                <Link to="/servers" className="text-sm hover:opacity-80" style={{ color: neonBlue }}>
                  {t('common.viewAll')} →
                </Link>
              </div>
              <div className="space-y-3">
                {(recentServers || []).slice(0, 4).map((server: any) => (
                  <div key={server.id} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${server.is_online ? 'bg-cyan-500' : 'bg-slate-500'}`}></div>
                      <div>
                        <p className="text-sm text-white">{server.name}</p>
                        <p className="text-xs text-slate-500">{server.server_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono" style={{ color: neonBlue }}>{server.last_latency_ms || '—'}ms</p>
                      <p className="text-xs text-slate-500">{server.uptime_percentage || 100}%</p>
                    </div>
                  </div>
                ))}
                {(!recentServers || recentServers.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-4">{t('common.noData')}</p>
                )}
              </div>
            </div>

            {/* Recent Tests */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: neonBlue }}>{t('dashboard.recentTests')}</h2>
                <Link to="/tests" className="text-sm hover:opacity-80" style={{ color: neonBlue }}>
                  {t('common.viewAll')} →
                </Link>
              </div>
              <div className="space-y-3">
                {(recentTests || []).slice(0, 4).map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                    <div>
                      <p className="text-sm text-white">{test.name}</p>
                      <p className="text-xs text-slate-500">{test.server_count} servers • {test.success_rate}% success</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      test.status === 'active' ? 'bg-cyan-500/20 text-cyan-400' :
                      test.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {test.status}
                    </span>
                  </div>
                ))}
                {(!recentTests || recentTests.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-4">{t('common.noData')}</p>
                )}
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: neonBlue }}>{t('dashboard.recentEvents')}</h2>
                <Link to="/events" className="text-sm hover:opacity-80" style={{ color: neonBlue }}>
                  {t('common.viewAll')} →
                </Link>
              </div>
              <div className="space-y-3">
                {recentEvents && recentEvents.length > 0 ? (
                  recentEvents.slice(0, 4).map((event: any, index: number) => (
                    <div key={index} className="flex items-start gap-2 py-2 border-b border-slate-800/50 last:border-0">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        event.level === 'error' ? 'bg-red-500' :
                        event.level === 'warning' ? 'bg-amber-500' :
                        'bg-cyan-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{event.message}</p>
                        <p className="text-xs text-slate-500">{event.created_at}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">{t('common.noData')}</p>
                )}
              </div>
            </div>
          </div>

          {/* New: Coming Soon Features Preview */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Tor Network Status */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold" style={{ color: neonBlue }}>Tor Network Status</h2>
                  <span className="px-2 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400">PREVIEW</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              </div>
              <div className="space-y-3">
                {torCircuits.map((circuit, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        circuit.status === 'established' ? 'bg-cyan-500' : 'bg-amber-500 animate-pulse'
                      }`}></div>
                      <div>
                        <p className="text-sm font-mono text-white">{circuit.id}</p>
                        <p className="text-xs text-slate-500">{circuit.hops} hops • {circuit.status}</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono" style={{ color: neonBlue }}>
                      {circuit.latency ? `${circuit.latency}ms` : '...'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Diagnostics */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold" style={{ color: neonBlue }}>System Diagnostics</h2>
                  <span className="px-2 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400">PREVIEW</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* CPU */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">CPU</span>
                    <span style={{ color: neonBlue }}>{diagnostics.cpu}%</span>
                  </div>
                  <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${diagnostics.cpu}%`, backgroundColor: cyan }}></div>
                  </div>
                </div>
                {/* Memory */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Memory</span>
                    <span style={{ color: neonBlue }}>{diagnostics.memory}%</span>
                  </div>
                  <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${diagnostics.memory}%`, backgroundColor: cyan }}></div>
                  </div>
                </div>
                {/* Disk */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Disk</span>
                    <span style={{ color: neonBlue }}>{diagnostics.disk}%</span>
                  </div>
                  <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${diagnostics.disk}%`, backgroundColor: diagnostics.disk > 80 ? '#f59e0b' : cyan }}></div>
                  </div>
                </div>
                {/* Services */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Docker</span>
                    <span className="text-cyan-400">● running</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Redis</span>
                    <span className="text-cyan-400">● connected</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tor</span>
                    <span className="text-purple-400">● connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Forensics Preview */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold" style={{ color: neonBlue }}>Data Forensics</h2>
                <span className="px-2 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-400">PREVIEW</span>
              </div>
              <span className="text-xs text-slate-500">Last 24h analysis</span>
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              {forensicEvents.map((event, index) => (
                <div key={index} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      event.severity === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'
                    }`}></div>
                    <span className="text-xs font-mono text-slate-500">{event.time}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                      event.type === 'pattern' ? 'bg-amber-500/20 text-amber-400' :
                      event.type === 'metadata' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>{event.type}</span>
                  </div>
                  <p className="text-sm text-slate-300">{event.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}