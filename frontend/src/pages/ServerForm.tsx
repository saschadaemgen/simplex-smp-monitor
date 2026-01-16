import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useServer, useCategories } from '../hooks/useApi';
import { serversApi, Category } from '../api/client';

// Hosting Mode Type
type HostingMode = 'external' | 'ip' | 'tor' | 'chutnex';

// ChutneX Network Type
interface ChutneXNetwork {
  id: string;
  name: string;
  slug: string;
  status: string;
}

// Docker Status Badge Component
function DockerStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    not_created: { bg: 'bg-slate-700/50', text: 'text-slate-300', label: '⚪ Not Created' },
    created: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: '🔵 Created' },
    starting: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: '🟡 Starting...' },
    running: { bg: 'bg-green-900/30', text: 'text-green-400', label: '🟢 Running' },
    stopping: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: '🟡 Stopping...' },
    stopped: { bg: 'bg-red-900/30', text: 'text-red-400', label: '🔴 Stopped' },
    error: { bg: 'bg-red-900/30', text: 'text-red-400', label: '❌ Error' },
  };
  const config = statusConfig[status] || statusConfig.not_created;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

interface ServerData {
  name?: string;
  server_type?: 'smp' | 'xftp' | 'ntf';
  address?: string;
  is_active?: boolean;
  maintenance_mode?: boolean;
  categories?: Category[];
  location?: string;
  description?: string;
  fingerprint?: string;
  password?: string;
  host?: string;
  is_docker_hosted?: boolean;
  docker_status?: string;
  docker_error?: string;
  generated_address?: string;
  exposed_port?: number;
  container_name?: string;
  data_volume?: string;
  hosting_mode?: string;
  host_ip?: string;
  onion_address?: string;
  chutnex_network?: string;
}

export default function ServerForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const { data: existingServer, loading: serverLoading } = useServer(id ? parseInt(id) : null) as { data: ServerData | null; loading: boolean };
  const { data: categoriesData } = useCategories();
  const categories = (categoriesData as { results?: Category[] })?.results || (Array.isArray(categoriesData) ? categoriesData : []);

  // Neon Blue
  const neonBlue = '#88CED0';

  const [formData, setFormData] = useState({
    name: '',
    server_type: 'smp' as 'smp' | 'xftp' | 'ntf',
    hosting_mode: 'external' as HostingMode,
    address: '',
    description: '',
    location: '',
    is_active: true,
    maintenance_mode: false,
    category_ids: [] as number[],
    // Docker specific
    exposed_port: '',
    host_ip: '',
    smp_password: '',
    // ChutneX specific
    chutnex_network: null as string | null,
  });

  // Docker state
  const [dockerStatus, setDockerStatus] = useState('not_created');
  const [dockerError, setDockerError] = useState('');
  const [generatedAddress, setGeneratedAddress] = useState('');
  const [onionAddress, setOnionAddress] = useState('');
  const [dockerActionLoading, setDockerActionLoading] = useState(false);
  const [containerLogs, setContainerLogs] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [dockerImagesAvailable, setDockerImagesAvailable] = useState<Record<string, { ip: boolean; tor: boolean }>>({}); 
  const [chutnexNetworks, setChutnexNetworks] = useState<ChutneXNetwork[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Check available Docker images on mount
  useEffect(() => {
    checkDockerImages();
    loadChutnexNetworks();
  }, []);

  const checkDockerImages = async () => {
    try {
      const response = await fetch('/api/v1/servers/docker-images/');
      if (response.ok) {
        const data = await response.json();
        setDockerImagesAvailable(data);
      }
    } catch (err) {
      console.error('Failed to check Docker images:', err);
    }
  };

  const loadChutnexNetworks = async () => {
    try {
      const response = await fetch('/api/v1/chutney/networks/');
      if (response.ok) {
        const data = await response.json();
        setChutnexNetworks(data.results || []);
      }
    } catch (err) {
      console.log('ChutneX API not available');
    }
  };

  useEffect(() => {
    if (existingServer) {
      // Determine hosting mode from existing server
      let hostingMode: HostingMode = 'external';
      if (existingServer.is_docker_hosted) {
        if (existingServer.chutnex_network) {
          hostingMode = 'chutnex';
        } else if (existingServer.hosting_mode === 'tor') {
          hostingMode = 'tor';
        } else {
          hostingMode = 'ip';
        }
      }

      let serverAddress = existingServer.address || '';
      if (!serverAddress && existingServer.host && !existingServer.is_docker_hosted) {
        const prefix = existingServer.server_type || 'smp';
        const fingerprint = existingServer.fingerprint || '';
        const password = existingServer.password || '';
        const host = existingServer.host || '';
        
        if (fingerprint && password) {
          serverAddress = `${prefix}://${fingerprint}:${password}@${host}`;
        } else if (fingerprint) {
          serverAddress = `${prefix}://${fingerprint}@${host}`;
        } else {
          serverAddress = host;
        }
      }

      setFormData(prev => ({
        ...prev,
        name: existingServer.name || '',
        server_type: existingServer.server_type || 'smp',
        hosting_mode: hostingMode,
        address: serverAddress,
        is_active: existingServer.is_active ?? true,
        maintenance_mode: existingServer.maintenance_mode ?? false,
        category_ids: existingServer.categories?.map((c: Category) => c.id) || [],
        location: existingServer.location || '',
        description: existingServer.description || '',
        exposed_port: existingServer.exposed_port?.toString() || '',
        host_ip: (existingServer as any).host_ip || '',
        chutnex_network: existingServer.chutnex_network || null,
      }));
      
      if (existingServer.is_docker_hosted) {
        setDockerStatus(existingServer.docker_status || 'not_created');
        setDockerError(existingServer.docker_error || '');
        setGeneratedAddress(existingServer.generated_address || '');
        setOnionAddress((existingServer as any).onion_address || '');
      }
    }
  }, [existingServer]);

  // Hosting Mode Options
  const hostingModeOptions = [
    { 
      value: 'external', 
      label: t('servers.hostingModes.external', 'Extern'),
      description: t('servers.hostingModes.externalDesc', 'ClearNet oder Onion'),
      icon: '🌍'
    },
    { 
      value: 'ip', 
      label: t('servers.hostingModes.ip', 'Docker LAN'),
      description: t('servers.hostingModes.ipDesc', 'Nur im lokalen Netzwerk'),
      icon: '🏠'
    },
    { 
      value: 'tor', 
      label: t('servers.hostingModes.tor', 'Docker Onion'),
      description: t('servers.hostingModes.torDesc', 'Über öffentliches Tor'),
      icon: '🧅'
    },
    { 
      value: 'chutnex', 
      label: t('servers.hostingModes.chutnex', 'ChutneX'),
      description: t('servers.hostingModes.chutnexDesc', 'Privates Tor-Netzwerk'),
      icon: '🔬'
    },
  ];

  const isDocker = formData.hosting_mode !== 'external';
  const needsChutneX = formData.hosting_mode === 'chutnex';
  const runningNetworks = chutnexNetworks.filter(n => n.status === 'running');

  // Get image availability for current mode
  const getImageAvailable = () => {
    const imageStatus = dockerImagesAvailable[formData.server_type];
    if (!imageStatus) return false;
    if (formData.hosting_mode === 'ip') return imageStatus.ip;
    if (formData.hosting_mode === 'tor' || formData.hosting_mode === 'chutnex') return imageStatus.tor;
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleHostingModeChange = (mode: HostingMode) => {
    setFormData(prev => ({
      ...prev,
      hosting_mode: mode,
      address: mode !== 'external' ? '' : prev.address,
      chutnex_network: mode === 'chutnex' ? prev.chutnex_network : null,
    }));
  };

  const handleCategoryToggle = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(cid => cid !== categoryId)
        : [...prev.category_ids, categoryId]
    }));
  };

  // Docker Actions
  const handleDockerAction = async (action: 'start' | 'stop' | 'restart' | 'delete') => {
    if (!id) return;
    
    setDockerActionLoading(true);
    setDockerError('');
    try {
      const response = await fetch(`/api/v1/servers/${id}/docker-action/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, remove_volumes: false }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setDockerStatus(data.docker_status);
        setGeneratedAddress(data.generated_address || '');
        if (showLogs) fetchContainerLogs();
      } else {
        setDockerError(data.error || 'Action failed');
      }
    } catch (err) {
      setDockerError((err as Error).message);
    } finally {
      setDockerActionLoading(false);
    }
  };

  const fetchContainerLogs = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/v1/servers/${id}/logs/?tail=100`);
      if (response.ok) {
        const data = await response.json();
        setContainerLogs(data.logs);
      }
    } catch (err) {
      setContainerLogs(`Error fetching logs: ${(err as Error).message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (needsChutneX && !formData.chutnex_network) {
      setSaveError('Bitte wähle ein ChutneX Netzwerk aus.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    
    try {
      // Map hosting_mode to API format
      let apiHostingMode = 'ip';
      if (formData.hosting_mode === 'tor') apiHostingMode = 'tor';
      if (formData.hosting_mode === 'chutnex') apiHostingMode = 'chutnex';

      const payload: any = {
        name: formData.name,
        server_type: formData.server_type,
        address: isDocker ? '' : formData.address,
        description: formData.description,
        location: formData.location,
        is_active: formData.is_active,
        maintenance_mode: formData.maintenance_mode,
        category_ids: formData.category_ids,
        is_docker_hosted: isDocker,
        hosting_mode: apiHostingMode,
        exposed_port: formData.exposed_port ? parseInt(formData.exposed_port) : null,
        host_ip: formData.host_ip,
        smp_password: formData.smp_password || null,
        chutnex_network: formData.chutnex_network,
      };
      
      if (isEdit && id) {
        await serversApi.update(parseInt(id), payload);
        navigate('/servers');
      } else {
        await serversApi.create(payload);
        navigate('/servers', { replace: true });
      }
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (serverLoading) {
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
              to="/servers" 
              className="text-sm flex items-center gap-1 mb-2 hover:opacity-80 transition-opacity"
              style={{ color: neonBlue }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              {t('servers.allServers', 'Alle Server')}
            </Link>
            <h1 className="text-xl font-semibold text-white">
              {isEdit ? t('servers.editServer', 'Server bearbeiten') : t('servers.newServer', 'Neuer Server')}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link 
              to="/servers" 
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm font-medium border border-slate-700/50 transition-colors"
            >
              {t('common.cancel', 'Abbrechen')}
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 hover:opacity-90 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              style={{ backgroundColor: neonBlue, color: '#0f172a' }}
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              )}
              {isEdit ? t('common.save', 'Speichern') : t('servers.createServer', 'Server erstellen')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <div className="space-y-6">
          {/* Error Message */}
          {saveError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div className="flex-1">
                <p className="text-red-400 font-medium">Fehler</p>
                <p className="text-red-300 text-sm">{saveError}</p>
              </div>
              <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-300 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Main Settings */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Basic Info */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Server Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      required
                      placeholder="My SMP Server"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Server Type</label>
                    <select 
                      name="server_type" 
                      value={formData.server_type} 
                      onChange={handleChange}
                      disabled={isEdit && isDocker}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none disabled:opacity-50 transition-colors"
                    >
                      <option value="smp">SMP (Messaging)</option>
                      <option value="xftp">XFTP (File Transfer)</option>
                      <option value="ntf">NTF (Notifications)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                    <input 
                      type="text" 
                      name="location" 
                      value={formData.location} 
                      onChange={handleChange}
                      placeholder="Berlin, Rack 2"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Hosting Mode Selection */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {t('servers.hostingMode', 'Hosting Modus')}
                </h2>
                
                {/* Hosting Mode Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {hostingModeOptions.map(option => {
                    const isSelected = formData.hosting_mode === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleHostingModeChange(option.value as HostingMode)}
                        disabled={isEdit && existingServer?.is_docker_hosted}
                        className={`p-4 rounded-lg border-2 text-left transition-all disabled:opacity-50 ${
                          isSelected
                            ? 'border-cyan-500/50 bg-cyan-900/20'
                            : 'border-slate-700/50 hover:border-slate-600/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{option.icon}</span>
                            <span className={`font-medium ${
                              isSelected ? 'text-cyan-300' : 'text-slate-300'
                            }`}>
                              {option.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 text-right">{option.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Mode-specific Info */}
                <div className="text-sm text-slate-500">
                  {formData.hosting_mode === 'external' && (
                    <p>🌍 {t('servers.externalInfo', 'Existierenden Server überwachen (Adresse erforderlich)')}</p>
                  )}
                  {formData.hosting_mode === 'ip' && (
                    <p>🏠 {t('servers.ipInfo', 'Docker Container mit LAN-IP - für interne Tests')}</p>
                  )}
                  {formData.hosting_mode === 'tor' && (
                    <p>🧅 {t('servers.torInfo', 'Docker Container mit .onion Adresse - global erreichbar')}</p>
                  )}
                  {formData.hosting_mode === 'chutnex' && (
                    <p>🔬 {t('servers.chutnexInfo', 'Docker im privaten ChutneX Tor-Netzwerk - für Forensik')}</p>
                  )}
                </div>

                {/* Image Warning */}
                {isDocker && !getImageAvailable() && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-sm text-amber-400">
                      ⚠️ Docker Image <code className="bg-slate-800/50 px-1 rounded">
                        simplex-{formData.server_type}{formData.hosting_mode !== 'ip' ? '-tor' : ''}:latest
                      </code> nicht gefunden.
                    </p>
                  </div>
                )}
              </div>

              {/* External Server Address */}
              {formData.hosting_mode === 'external' && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Server Adresse</h2>
                  <textarea 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    rows={3} 
                    required
                    placeholder="smp://fingerprint:password@host.onion"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                  />
                  {formData.address.includes('.onion') && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">🧅 Onion</span>
                      <span className="text-xs text-slate-500">Timeout: 120s</span>
                    </div>
                  )}
                </div>
              )}

              {/* ChutneX Network Selection */}
              {needsChutneX && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">🔬 ChutneX Netzwerk</h2>
                  
                  {runningNetworks.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-amber-400 mb-2">⚠️ Kein ChutneX Netzwerk läuft</p>
                      <Link to="/chutney" className="text-sm hover:opacity-80" style={{ color: neonBlue }}>
                        → ChutneX Netzwerk erstellen
                      </Link>
                    </div>
                  ) : (
                    <select
                      value={formData.chutnex_network || ''}
                      onChange={e => setFormData(prev => ({ ...prev, chutnex_network: e.target.value || null }))}
                      required={needsChutneX}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                    >
                      <option value="">-- Netzwerk wählen --</option>
                      {runningNetworks.map(network => (
                        <option key={network.id} value={network.id}>
                          {network.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Docker Configuration (IP & Tor mode) */}
              {isDocker && formData.hosting_mode !== 'chutnex' && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Docker Konfiguration</h2>
                  
                  {formData.hosting_mode === 'ip' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Host IP <span className="text-slate-500 text-xs">(auto-detect wenn leer)</span>
                        </label>
                        <input 
                          type="text" 
                          name="host_ip" 
                          value={formData.host_ip} 
                          onChange={handleChange}
                          placeholder="192.168.1.100"
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Exposed Port <span className="text-slate-500 text-xs">(optional)</span>
                        </label>
                        <input 
                          type="number" 
                          name="exposed_port" 
                          value={formData.exposed_port} 
                          onChange={handleChange}
                          placeholder={formData.server_type === 'smp' ? '5223' : '443'} 
                          min="1024" 
                          max="65535"
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  )}
                  
                  {formData.hosting_mode === 'tor' && (
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <p className="text-sm text-purple-300">
                        🧅 Tor Hidden Service generiert automatisch eine <code className="bg-slate-800/50 px-1 rounded">.onion</code> Adresse.
                        Kein Port-Mapping nötig - global über Tor erreichbar.
                      </p>
                    </div>
                  )}
                  
                  {/* SMP Password */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      SMP Password <span className="text-slate-500 text-xs">(optional)</span>
                    </label>
                    <input 
                      type="text" 
                      name="smp_password" 
                      value={formData.smp_password} 
                      onChange={handleChange}
                      placeholder="Leer = kein Passwort"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-1">Passwort für neue Message Queues</p>
                  </div>
                </div>
              )}

              {/* Generated Addresses (Edit mode) */}
              {isEdit && isDocker && (generatedAddress || onionAddress) && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Generierte Adressen</h2>
                  
                  {onionAddress && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-1">🧅 Onion Adresse</label>
                      <div className="flex items-center gap-2">
                        <input type="text" value={onionAddress} readOnly
                          className="flex-1 bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2.5 text-purple-400 font-mono text-sm" />
                        <button type="button" onClick={() => navigator.clipboard.writeText(onionAddress)}
                          className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-slate-300 transition-colors">
                          📋
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {generatedAddress && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Vollständige Adresse</label>
                      <div className="flex items-center gap-2">
                        <input type="text" value={generatedAddress} readOnly
                          className="flex-1 bg-slate-800/50 border border-green-500/30 rounded-lg px-4 py-2.5 text-green-400 font-mono text-sm" />
                        <button type="button" onClick={() => navigator.clipboard.writeText(generatedAddress)}
                          className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-slate-300 transition-colors">
                          📋
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Docker Container Management (Edit mode) */}
              {isEdit && isDocker && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">🐳 Docker Container</h2>
                    <DockerStatusBadge status={dockerStatus} />
                  </div>
                  
                  {dockerError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-sm text-red-400">{dockerError}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => handleDockerAction('start')}
                      disabled={dockerActionLoading || dockerStatus === 'running'}
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 disabled:opacity-50 text-green-400 rounded-lg text-sm transition-colors">
                      ▶ Start
                    </button>
                    <button type="button" onClick={() => handleDockerAction('stop')}
                      disabled={dockerActionLoading || dockerStatus !== 'running'}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 disabled:opacity-50 text-amber-400 rounded-lg text-sm transition-colors">
                      ⏹ Stop
                    </button>
                    <button type="button" onClick={() => handleDockerAction('restart')}
                      disabled={dockerActionLoading || dockerStatus !== 'running'}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 disabled:opacity-50 text-blue-400 rounded-lg text-sm transition-colors">
                      🔄 Restart
                    </button>
                    <button type="button" onClick={() => { setShowLogs(!showLogs); if (!showLogs) fetchContainerLogs(); }}
                      disabled={dockerStatus === 'not_created'}
                      className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
                      📋 {showLogs ? 'Hide' : 'View'} Logs
                    </button>
                    <button type="button" onClick={() => { if (confirm('Container löschen?')) handleDockerAction('delete'); }}
                      disabled={dockerActionLoading}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50 text-red-400 rounded-lg text-sm ml-auto transition-colors">
                      🗑 Delete
                    </button>
                  </div>
                  
                  {showLogs && (
                    <div className="mt-4">
                      <pre className="bg-slate-950/50 rounded-lg p-4 text-xs text-slate-300 font-mono overflow-x-auto max-h-64 overflow-y-auto">
                        {containerLogs || 'No logs available'}
                      </pre>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Right Column - Categories & Status */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Status Toggles */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Status</h2>
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-slate-300 font-medium">Aktiv</span>
                      <p className="text-xs text-slate-500">Im Monitoring einbeziehen</p>
                    </div>
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      checked={formData.is_active} 
                      onChange={handleChange}
                      className="w-5 h-5 rounded text-cyan-600 bg-slate-800 border-slate-600 focus:ring-cyan-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-slate-300 font-medium">Wartung</span>
                      <p className="text-xs text-slate-500">Temporär ausschließen</p>
                    </div>
                    <input 
                      type="checkbox" 
                      name="maintenance_mode" 
                      checked={formData.maintenance_mode} 
                      onChange={handleChange}
                      className="w-5 h-5 rounded text-amber-600 bg-slate-800 border-slate-600 focus:ring-amber-500"
                    />
                  </label>
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Kategorien</h2>
                  <div className="space-y-2">
                    {categories.map((cat: Category) => (
                      <label
                        key={cat.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.category_ids.includes(cat.id)
                            ? 'border-cyan-500/50 bg-cyan-900/20'
                            : 'border-slate-700/50 hover:border-slate-600/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.category_ids.includes(cat.id)}
                          onChange={() => handleCategoryToggle(cat.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="w-3 h-3 rounded-full ml-3" style={{ backgroundColor: cat.color }}></span>
                        <span className="ml-2 text-sm text-slate-300">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Description - flex-grow to fill space */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-800/50 p-6 flex-grow flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-4">Beschreibung</h2>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optionale Notizen..."
                  className="w-full flex-grow bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none min-h-[100px] resize-none transition-colors"
                />
              </div>

              {/* Info Card */}
              <div 
                className="rounded-lg p-4"
                style={{ 
                  backgroundColor: 'rgba(136, 206, 208, 0.05)',
                  border: '1px solid rgba(136, 206, 208, 0.2)'
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <p className="font-medium" style={{ color: neonBlue }}>Tipp</p>
                    <p className="text-sm mt-1" style={{ color: neonBlue, opacity: 0.7 }}>
                      {isDocker 
                        ? 'Docker Container werden automatisch erstellt wenn du den Server speicherst.'
                        : 'Externe Server benötigen eine vollständige Adresse im Format smp://fingerprint:password@host'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}