import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { simplexClientsApi, serversApi, Server } from '../api/client';

// Connection Mode Type
type ConnectionMode = 'direct' | 'public_tor' | 'chutnex_internal' | 'chutnex_external';

// ChutneX Network Type (from API)
interface ChutneXNetwork {
  id: string;
  name: string;
  slug: string;
  status: string;
  num_clients: number;
  base_socks_port: number;
}

interface FormData {
  websocket_port: number;
  connection_mode: ConnectionMode;
  chutnex_network: string | null;
  chutnex_socks_port: number | null;
  description: string;
  smp_server_ids: number[];
}

export default function ClientForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<number[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [chutnexNetworks, setChutnexNetworks] = useState<ChutneXNetwork[]>([]);
  const [formData, setFormData] = useState<FormData>({
    websocket_port: 0,
    connection_mode: 'public_tor',
    chutnex_network: null,
    chutnex_socks_port: null,
    description: '',
    smp_server_ids: []
  });

  // Neon Blue
  const neonBlue = '#88CED0';

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [statsData, serversData] = await Promise.all([
        simplexClientsApi.stats(),
        serversApi.list()
      ]);

      // Nur SMP Server (nicht XFTP)
      const smpServers = serversData.results.filter(s => s.server_type === 'smp');
      setServers(smpServers);

      const ports = statsData.available_ports || [];
      setAvailablePorts(ports);

      // Load ChutneX Networks
      try {
        const response = await fetch('/api/v1/chutney/networks/');
        if (response.ok) {
          const data = await response.json();
          setChutnexNetworks(data.results || []);
        }
      } catch (err) {
        console.log('ChutneX API not available');
      }

      if (isEdit && id) {
        const client = await simplexClientsApi.get(id);
        setFormData({
          websocket_port: client.websocket_port,
          connection_mode: client.connection_mode || 'public_tor',
          chutnex_network: client.chutnex_network || null,
          chutnex_socks_port: client.chutnex_socks_port || null,
          description: client.description || '',
          smp_server_ids: client.smp_server_ids || []
        });
        if (!ports.includes(client.websocket_port)) {
          setAvailablePorts([client.websocket_port, ...ports]);
        }
      } else {
        if (ports.length > 0) {
          setFormData(prev => ({ ...prev, websocket_port: ports[0] }));
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleServerToggle = (serverId: number) => {
    setFormData(prev => ({
      ...prev,
      smp_server_ids: prev.smp_server_ids.includes(serverId)
        ? prev.smp_server_ids.filter(id => id !== serverId)
        : [...prev.smp_server_ids, serverId]
    }));
  };

  const handleConnectionModeChange = (mode: ConnectionMode) => {
    setFormData(prev => ({
      ...prev,
      connection_mode: mode,
      // Reset ChutneX fields wenn nicht ChutneX mode
      chutnex_network: mode.startsWith('chutnex') ? prev.chutnex_network : null,
      chutnex_socks_port: mode === 'chutnex_external' ? prev.chutnex_socks_port : null
    }));
  };

  const getAvailableSocksPorts = (): number[] => {
    const selectedNetwork = chutnexNetworks.find(n => n.id === formData.chutnex_network);
    if (!selectedNetwork) return [];
    // Generate ports based on num_clients
    const ports: number[] = [];
    for (let i = 0; i < selectedNetwork.num_clients; i++) {
      ports.push(selectedNetwork.base_socks_port + i);
    }
    return ports;
  };

  // Prüft ob ein Server mit dem gewählten Connection Mode kompatibel ist
  const isServerCompatible = (server: Server): boolean => {
    switch (formData.connection_mode) {
      case 'direct':
        // Direct: Nur IP-Server (lokal oder extern)
        return server.hosting_mode === 'ip' || (!server.is_docker_hosted && !server.is_onion);
      
      case 'public_tor':
        // Public Tor: Alle Server (Tor kann alles erreichen)
        return true;
      
      case 'chutnex_internal':
      case 'chutnex_external':
        // ChutneX: Nur Server im gleichen ChutneX-Netzwerk
        if (server.hosting_mode !== 'chutnex') return false;
        // Prüfe ob gleiches Netzwerk (wenn wir die Info haben)
        if (!formData.chutnex_network) return false;
        // Server muss zum gleichen Netzwerk gehören
        return server.chutnex_network === formData.chutnex_network;
      
      default:
        return true;
    }
  };

  // Gibt den Grund zurück, warum ein Server inkompatibel ist
  const getIncompatibilityReason = (server: Server): string => {
    switch (formData.connection_mode) {
      case 'direct':
        if (server.is_onion) return 'Onion-Server benötigt Tor';
        if (server.hosting_mode === 'chutnex') return 'ChutneX-Server benötigt ChutneX-Mode';
        return 'Nicht kompatibel';
      
      case 'chutnex_internal':
      case 'chutnex_external':
        if (server.hosting_mode !== 'chutnex') return 'Kein ChutneX-Server';
        if (!formData.chutnex_network) return 'Wähle erst ein Netzwerk';
        if (server.chutnex_network !== formData.chutnex_network) return 'Anderes Netzwerk';
        return 'Nicht kompatibel';
      
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availablePorts.length === 0 && !isEdit) {
      alert('Keine Ports verfügbar.');
      return;
    }
    
    // Validate ChutneX mode
    if (formData.connection_mode.startsWith('chutnex') && !formData.chutnex_network) {
      alert('Bitte wähle ein ChutneX Netzwerk aus.');
      return;
    }
    if (formData.connection_mode === 'chutnex_external' && !formData.chutnex_socks_port) {
      alert('Bitte wähle einen SOCKS Port aus.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await simplexClientsApi.update(id!, formData);
      } else {
        await simplexClientsApi.create(formData);
      }
      navigate('/clients');
    } catch (err) {
      console.error('Error saving client:', err);
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const connectionModeOptions = [
    { 
      value: 'direct', 
      label: t('clients.connectionModes.direct', 'Direkt'),
      description: t('clients.connectionModes.directDesc', 'Ohne Tor (für ClearNet + Docker LAN)'),
      icon: '🌐' 
    },
    { 
      value: 'public_tor', 
      label: t('clients.connectionModes.publicTor', 'Public Tor'),
      description: t('clients.connectionModes.publicTorDesc', 'Über localhost:9050 (für Onion Server)'),
      icon: '🧅' 
    },
    { 
      value: 'chutnex_internal', 
      label: t('clients.connectionModes.chutnexInternal', 'ChutneX Intern'),
      description: t('clients.connectionModes.chutnexInternalDesc', 'Client läuft IM privaten Netzwerk'),
      icon: '🔬' 
    },
    { 
      value: 'chutnex_external', 
      label: t('clients.connectionModes.chutnexExternal', 'ChutneX Extern'),
      description: t('clients.connectionModes.chutnexExternalDesc', 'Client verbindet über SOCKS Port'),
      icon: '🔗' 
    },
  ];

  const runningNetworks = chutnexNetworks.filter(n => n.status === 'running');
  const needsChutneX = formData.connection_mode.startsWith('chutnex');
  const needsSocksPort = formData.connection_mode === 'chutnex_external';

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: neonBlue }}></div>
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
            <Link 
              to="/clients" 
              className="text-sm flex items-center gap-1 mb-2 hover:opacity-80 transition-opacity"
              style={{ color: neonBlue }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              {t('clients.allClients', 'Alle Clients')}
            </Link>
            <h1 className="text-xl font-semibold text-white">
              {isEdit ? t('clients.editClient', 'Client bearbeiten') : t('clients.newClient', 'Neuer Client')}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link 
              to="/clients" 
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700/50"
            >
              {t('common.cancel', 'Abbrechen')}
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving || (availablePorts.length === 0 && !isEdit)}
              className="px-4 py-2 hover:opacity-90 disabled:opacity-50 text-slate-900 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              style={{ backgroundColor: neonBlue }}
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              )}
              {isEdit ? t('common.save', 'Speichern') : t('clients.createClient', 'Client erstellen')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="space-y-6">
          {/* Info Banner */}
          {!isEdit && (
            <div 
              className="rounded-lg p-4 flex items-start gap-3"
              style={{ 
                backgroundColor: 'rgba(136, 206, 208, 0.05)',
                border: '1px solid rgba(136, 206, 208, 0.2)'
              }}
            >
              <svg className="w-6 h-6 flex-shrink-0" style={{ color: neonBlue }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <div>
                <p className="font-medium" style={{ color: neonBlue }}>{t('clients.autoGeneration', 'Automatische Generierung')}</p>
                <p className="text-sm mt-1" style={{ color: neonBlue, opacity: 0.7 }}>
                  {t('clients.autoGenerationInfo', 'Name, Slug und Profil werden automatisch generiert.')}
                </p>
              </div>
            </div>
          )}

          {/* Port Warning */}
          {availablePorts.length === 0 && !isEdit && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p className="font-medium text-red-300">{t('clients.noPortsAvailable', 'Keine Ports verfügbar')}</p>
                <p className="text-sm text-red-400/80 mt-1">{t('clients.deleteClientFirst', 'Alle Ports (3031-3080) sind belegt.')}</p>
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Main Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Docker Configuration */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Docker Konfiguration</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">WebSocket Port *</label>
                  <select
                    value={formData.websocket_port}
                    onChange={e => setFormData(prev => ({ ...prev, websocket_port: parseInt(e.target.value) }))}
                    required
                    disabled={availablePorts.length === 0 && !isEdit}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none disabled:opacity-50 transition-colors"
                  >
                    {availablePorts.length === 0 ? (
                      <option value="">Keine Ports verfügbar</option>
                    ) : (
                      availablePorts.map(port => (
                        <option key={port} value={port}>Port {port}</option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">{availablePorts.length} Port{availablePorts.length !== 1 ? 's' : ''} verfügbar (3031-3080)</p>
                </div>
              </div>

              {/* Connection Mode */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {t('clients.connectionMode', 'Verbindungsmodus')}
                </h2>
                
                {/* Connection Mode Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {connectionModeOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleConnectionModeChange(option.value as ConnectionMode)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.connection_mode === option.value
                          ? 'border-cyan-500/50 bg-cyan-900/20'
                          : 'border-slate-700/50 hover:border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{option.icon}</span>
                        <span className={`font-medium ${
                          formData.connection_mode === option.value
                            ? 'text-cyan-300'
                            : 'text-slate-300'
                        }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </button>
                  ))}
                </div>

                {/* ChutneX Network Selection */}
                {needsChutneX && (
                  <div className="mt-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      🔬 ChutneX Netzwerk *
                    </label>
                    
                    {runningNetworks.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-amber-400 mb-2">
                          ⚠️ {t('clients.noChutneXNetworks', 'Kein ChutneX Netzwerk läuft')}
                        </p>
                        <Link 
                          to="/chutney" 
                          className="text-sm hover:opacity-80"
                          style={{ color: neonBlue }}
                        >
                          → {t('clients.createChutneXNetwork', 'ChutneX Netzwerk erstellen')}
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={formData.chutnex_network || ''}
                        onChange={e => setFormData(prev => ({ 
                          ...prev, 
                          chutnex_network: e.target.value || null,
                          chutnex_socks_port: null // Reset SOCKS port when network changes
                        }))}
                        required={needsChutneX}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none transition-colors"
                      >
                        <option value="">{t('clients.selectNetwork', '-- Netzwerk wählen --')}</option>
                        {runningNetworks.map(network => (
                          <option key={network.id} value={network.id}>
                            {network.name} ({network.num_clients} Clients)
                          </option>
                        ))}
                      </select>
                    )}

                    {/* SOCKS Port Selection (nur für external) */}
                    {needsSocksPort && formData.chutnex_network && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          🔗 SOCKS Port *
                        </label>
                        <select
                          value={formData.chutnex_socks_port || ''}
                          onChange={e => setFormData(prev => ({ 
                            ...prev, 
                            chutnex_socks_port: e.target.value ? parseInt(e.target.value) : null 
                          }))}
                          required={needsSocksPort}
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none transition-colors"
                        >
                          <option value="">{t('clients.selectSocksPort', '-- SOCKS Port wählen --')}</option>
                          {getAvailableSocksPorts().map(port => (
                            <option key={port} value={port}>
                              Port {port}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                          {t('clients.socksPortInfo', 'SOCKS Proxy vom ChutneX Client Node')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Connection Mode Info */}
                <div className="mt-4 text-sm text-slate-500">
                  {formData.connection_mode === 'direct' && (
                    <p>🌐 {t('clients.directInfo', 'Direkte Verbindung ohne Tor - nur für LAN-Server')}</p>
                  )}
                  {formData.connection_mode === 'public_tor' && (
                    <p>🧅 {t('clients.publicTorInfo', 'Verbindung über öffentliches Tor (localhost:9050)')}</p>
                  )}
                  {formData.connection_mode === 'chutnex_internal' && (
                    <p>🔬 {t('clients.chutnexInternalInfo', 'Client läuft IM ChutneX Netzwerk - für Forensik')}</p>
                  )}
                  {formData.connection_mode === 'chutnex_external' && (
                    <p>🔗 {t('clients.chutnexExternalInfo', 'Client verbindet sich ÜBER ChutneX SOCKS - simuliert externen Zugriff')}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">{t('common.description', 'Beschreibung')}</h2>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder={t('clients.descriptionPlaceholder', 'Optionale Notizen zu diesem Client...')}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Right Column - Server Selection */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 h-full flex flex-col">
                <div className="p-4 border-b border-slate-800/50">
                  <h2 className="text-lg font-semibold text-white">
                    SMP Server
                    {formData.smp_server_ids.length > 0 && (
                      <span className="ml-2 text-sm font-normal" style={{ color: neonBlue }}>
                        ({formData.smp_server_ids.length} {t('common.selected', 'ausgewählt')})
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">{t('clients.serverInfo', 'Client nutzt diese Server für Nachrichten')}</p>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto">
                  {servers.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/>
                      </svg>
                      <p className="text-slate-500 mb-2">{t('clients.noServers', 'Keine SMP Server')}</p>
                      <Link to="/servers/new" style={{ color: neonBlue }} className="text-sm hover:opacity-80">
                        + {t('servers.addServer', 'Server hinzufügen')}
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {servers.map(server => {
                        // Server-Kompatibilität prüfen
                        const isCompatible = isServerCompatible(server);
                        const isSelected = formData.smp_server_ids.includes(server.id);
                        
                        return (
                          <label
                            key={server.id}
                            className={`flex items-center p-3 rounded-lg border transition-all ${
                              !isCompatible 
                                ? 'opacity-40 cursor-not-allowed border-slate-700/50'
                                : isSelected
                                  ? 'cursor-pointer border-cyan-500/50 bg-cyan-900/20'
                                  : 'cursor-pointer border-slate-700/50 hover:border-slate-600/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => isCompatible && handleServerToggle(server.id)}
                              disabled={!isCompatible}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500 disabled:opacity-50"
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  server.is_active ? 'bg-emerald-500' : 'bg-slate-500'
                                }`}></span>
                                <span className={`font-medium text-sm truncate ${
                                  isCompatible ? 'text-white' : 'text-slate-500'
                                }`}>
                                  {server.name}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 truncate">{server.host}</p>
                              {!isCompatible && (
                                <p className="text-xs text-amber-400 mt-1">
                                  {getIncompatibilityReason(server)}
                                </p>
                              )}
                            </div>
                            {/* Hosting Mode Badge */}
                            <div className="flex gap-1 flex-shrink-0">
                              {server.hosting_mode === 'chutnex' && (
                                <span className="text-xs text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded">
                                  🔬
                                </span>
                              )}
                              {server.is_onion && (
                                <span className="text-xs text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded">
                                  TOR
                                </span>
                              )}
                              {server.is_docker_hosted && server.hosting_mode === 'ip' && (
                                <span className="text-xs text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded">
                                  LAN
                                </span>
                              )}
                              {!server.is_docker_hosted && (
                                <span className="text-xs text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">
                                  EXT
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}