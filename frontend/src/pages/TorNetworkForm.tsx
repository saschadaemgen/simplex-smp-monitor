/**
 * TorNetworkForm.tsx - Create/Edit Private Tor Network
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTorNetwork } from '../hooks/useChutney';
import { torNetworksApi, NetworkTemplate } from '../api/chutney';

const neonBlue = '#88CED0';

const templateConfig: Record<NetworkTemplate, { label: string; description: string; defaults: Record<string, number | boolean> }> = {
  minimal: {
    label: 'Minimal',
    description: '3 DA, 1 Guard, 1 Middle, 1 Exit, 1 Client',
    defaults: { num_directory_authorities: 3, num_guard_relays: 1, num_middle_relays: 1, num_exit_relays: 1, num_clients: 1, num_hidden_services: 0 },
  },
  basic: {
    label: 'Basic',
    description: '3 DA, 2 Guards, 2 Middle, 2 Exit, 2 Clients',
    defaults: { num_directory_authorities: 3, num_guard_relays: 2, num_middle_relays: 2, num_exit_relays: 2, num_clients: 2, num_hidden_services: 0 },
  },
  standard: {
    label: 'Standard',
    description: '3 DA, 3 Guards, 3 Middle, 3 Exit, 3 Clients, 1 HS',
    defaults: { num_directory_authorities: 3, num_guard_relays: 3, num_middle_relays: 3, num_exit_relays: 3, num_clients: 3, num_hidden_services: 1 },
  },
  forensic: {
    label: 'Forensic',
    description: '3 DA, 4 Guards, 4 Middle, 4 Exit, 4 Clients, 2 HS + Capture',
    defaults: { num_directory_authorities: 3, num_guard_relays: 4, num_middle_relays: 4, num_exit_relays: 4, num_clients: 4, num_hidden_services: 2, capture_enabled: true },
  },
  custom: { label: 'Custom', description: 'Define your own topology', defaults: {} },
};

export default function TorNetworkForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const { data: existingNetwork, loading: networkLoading } = useTorNetwork(id || null);
  
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: 'basic' as NetworkTemplate,
    num_directory_authorities: 3,
    num_guard_relays: 2,
    num_middle_relays: 2,
    num_exit_relays: 2,
    num_clients: 2,
    num_hidden_services: 0,
    base_control_port: 8000,
    base_socks_port: 9000,
    base_or_port: 5000,
    base_dir_port: 7000,
    testing_tor_network: true,
    voting_interval: 20,
    assume_reachable: true,
    capture_enabled: true,
    capture_filter: 'tcp port 5000-5100 or tcp port 9000-9100',
    max_capture_size_mb: 100,
    capture_rotate_interval: 3600,
  });

  useEffect(() => {
    if (existingNetwork) {
      setFormData({
        name: existingNetwork.name,
        description: existingNetwork.description || '',
        template: existingNetwork.template,
        num_directory_authorities: existingNetwork.num_directory_authorities,
        num_guard_relays: existingNetwork.num_guard_relays,
        num_middle_relays: existingNetwork.num_middle_relays,
        num_exit_relays: existingNetwork.num_exit_relays,
        num_clients: existingNetwork.num_clients,
        num_hidden_services: existingNetwork.num_hidden_services,
        base_control_port: existingNetwork.base_control_port,
        base_socks_port: existingNetwork.base_socks_port,
        base_or_port: existingNetwork.base_or_port,
        base_dir_port: existingNetwork.base_dir_port,
        testing_tor_network: existingNetwork.testing_tor_network,
        voting_interval: existingNetwork.voting_interval,
        assume_reachable: existingNetwork.assume_reachable,
        capture_enabled: existingNetwork.capture_enabled,
        capture_filter: existingNetwork.capture_filter,
        max_capture_size_mb: existingNetwork.max_capture_size_mb,
        capture_rotate_interval: existingNetwork.capture_rotate_interval,
      });
    }
  }, [existingNetwork]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  const handleTemplateChange = (template: NetworkTemplate) => {
    const config = templateConfig[template];
    setFormData(prev => ({ ...prev, template, ...config.defaults }));
  };

  const totalNodes = formData.num_directory_authorities + formData.num_guard_relays + formData.num_middle_relays + formData.num_exit_relays + formData.num_clients + formData.num_hidden_services;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (isEdit && id) {
        await torNetworksApi.update(id, formData);
      } else {
        await torNetworksApi.create(formData);
      }
      navigate('/tor-networks');
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (networkLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: neonBlue }}></div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: t('chutney.tabs.basic', 'Basic'), icon: '⚙️' },
    { id: 'nodes', label: t('chutney.tabs.nodes', 'Nodes'), icon: '🔗' },
    { id: 'ports', label: t('chutney.tabs.ports', 'Ports'), icon: '🔌' },
    { id: 'tor', label: t('chutney.tabs.tor', 'Tor Options'), icon: '🧅' },
    { id: 'capture', label: t('chutney.tabs.capture', 'Capture'), icon: '📹' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50">
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? t('chutney.editNetwork', 'Edit Tor Network') : t('chutney.createNetwork', 'Create Tor Network')}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 border-b border-slate-800">
        <nav className="flex space-x-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 border-b-2 font-medium text-sm transition-colors rounded-t-lg flex items-center space-x-2 ${activeTab === tab.id ? 'border-primary-500 text-primary-400 bg-primary-900/20' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 px-6 py-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB: Basic */}
          {activeTab === 'basic' && (
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">{t('chutney.networkDetails', 'Network Details')}</h2>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('chutney.name', 'Name')} *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="my-test-network"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('chutney.description', 'Description')}</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={2} placeholder="Purpose..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">{t('chutney.networkTemplate', 'Network Template')}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.entries(templateConfig) as [NetworkTemplate, typeof templateConfig.minimal][]).map(([key, config]) => (
                    <label key={key} className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.template === key ? 'border-primary-500 bg-primary-900/20' : 'border-slate-700 hover:border-slate-600'}`}>
                      <input type="radio" name="template" value={key} checked={formData.template === key} onChange={() => handleTemplateChange(key)} className="sr-only" disabled={isEdit} />
                      <span className={`font-medium ${formData.template === key ? 'text-primary-400' : 'text-white'}`}>{config.label}</span>
                      <span className="text-xs text-slate-500 mt-1">{config.description}</span>
                      {formData.template === key && (
                        <div className="absolute top-2 right-2">
                          <svg className="w-5 h-5 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Nodes */}
          {activeTab === 'nodes' && (
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">{t('chutney.nodeConfiguration', 'Node Configuration')}</h2>
                <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: `${neonBlue}20`, color: neonBlue }}>
                  {t('chutney.totalNodes', 'Total')}: {totalNodes} {t('chutney.nodes', 'Nodes')}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'num_directory_authorities', icon: '🏛️', label: t('chutney.directoryAuthorities', 'Directory Authorities'), min: 3, max: 9, hint: t('chutney.minForConsensus', 'Min 3 for consensus') },
                  { name: 'num_guard_relays', icon: '🛡️', label: t('chutney.guardRelays', 'Guard Relays'), min: 1, max: 20 },
                  { name: 'num_middle_relays', icon: '🔀', label: t('chutney.middleRelays', 'Middle Relays'), min: 1, max: 20 },
                  { name: 'num_exit_relays', icon: '🚪', label: t('chutney.exitRelays', 'Exit Relays'), min: 1, max: 10 },
                  { name: 'num_clients', icon: '💻', label: t('chutney.clients', 'Clients (SOCKS)'), min: 1, max: 20 },
                  { name: 'num_hidden_services', icon: '🧅', label: t('chutney.hiddenServices', 'Hidden Services'), min: 0, max: 10 },
                ].map(field => (
                  <div key={field.name} className="p-4 rounded-lg bg-slate-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{field.icon}</span>
                      <label className="text-sm font-medium text-slate-300">{field.label}</label>
                    </div>
                    <input type="number" name={field.name} value={(formData as Record<string, unknown>)[field.name] as number} onChange={handleChange} min={field.min} max={field.max}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-primary-500 focus:outline-none" />
                    {field.hint && <p className="text-xs text-slate-500 mt-1">{field.hint}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Ports */}
          {activeTab === 'ports' && (
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">{t('chutney.portConfiguration', 'Port Configuration')}</h2>
              <p className="text-sm text-slate-400 mb-4">{t('chutney.portHint', 'Base ports - nodes use consecutive ports starting from these values.')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'base_control_port', label: t('chutney.controlPortBase', 'Control Port Base'), hint: '8000, 8001...' },
                  { name: 'base_socks_port', label: t('chutney.socksPortBase', 'SOCKS Port Base'), hint: t('chutney.forClients', 'For clients') },
                  { name: 'base_or_port', label: t('chutney.orPortBase', 'OR Port Base'), hint: t('chutney.onionRouter', 'Onion Router') },
                  { name: 'base_dir_port', label: t('chutney.dirPortBase', 'Dir Port Base'), hint: t('chutney.directoryDAs', 'Directory (DAs)') },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{field.label}</label>
                    <input type="number" name={field.name} value={(formData as Record<string, unknown>)[field.name] as number} onChange={handleChange} min={1024} max={60000}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:outline-none" />
                    <p className="text-xs text-slate-500 mt-1">{field.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Tor Options */}
          {activeTab === 'tor' && (
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">{t('chutney.torNetworkOptions', 'Tor Network Options')}</h2>
              <label className="flex items-center justify-between p-4 rounded-lg bg-slate-800 cursor-pointer">
                <div>
                  <span className="text-white font-medium">{t('chutney.testingTorNetwork', 'Testing Tor Network')}</span>
                  <p className="text-xs text-slate-500">{t('chutney.testingTorNetworkDesc', 'Enable TestingTorNetwork mode for faster bootstrap')}</p>
                </div>
                <input type="checkbox" name="testing_tor_network" checked={formData.testing_tor_network} onChange={handleChange}
                  className="w-5 h-5 rounded text-primary-600 bg-slate-700 border-slate-600" />
              </label>
              <label className="flex items-center justify-between p-4 rounded-lg bg-slate-800 cursor-pointer">
                <div>
                  <span className="text-white font-medium">{t('chutney.assumeReachable', 'Assume Reachable')}</span>
                  <p className="text-xs text-slate-500">{t('chutney.assumeReachableDesc', 'Skip reachability tests (faster startup)')}</p>
                </div>
                <input type="checkbox" name="assume_reachable" checked={formData.assume_reachable} onChange={handleChange}
                  className="w-5 h-5 rounded text-primary-600 bg-slate-700 border-slate-600" />
              </label>
              <div className="p-4 rounded-lg bg-slate-800">
                <label className="block text-sm font-medium text-slate-300 mb-1">{t('chutney.votingInterval', 'Voting Interval (seconds)')}</label>
                <input type="number" name="voting_interval" value={formData.voting_interval} onChange={handleChange} min={10} max={300}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:outline-none" />
                <p className="text-xs text-slate-500 mt-1">{t('chutney.votingIntervalHint', 'Lower = faster consensus')}</p>
              </div>
            </div>
          )}

          {/* TAB: Capture */}
          {activeTab === 'capture' && (
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">{t('chutney.trafficCaptureSettings', 'Traffic Capture Settings')}</h2>
              <label className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-pink-900/20 border border-red-800/50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📹</span>
                  <div>
                    <span className="text-white font-medium">{t('chutney.enableCapture', 'Enable Traffic Capture')}</span>
                    <p className="text-xs text-slate-400">{t('chutney.enableCaptureDesc', 'Record all traffic on every node via tcpdump')}</p>
                  </div>
                </div>
                <input type="checkbox" name="capture_enabled" checked={formData.capture_enabled} onChange={handleChange}
                  className="w-5 h-5 rounded text-red-600 bg-slate-700 border-slate-600" />
              </label>
              {formData.capture_enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('chutney.bpfFilter', 'BPF Filter Expression')}</label>
                    <input type="text" name="capture_filter" value={formData.capture_filter} onChange={handleChange} placeholder="tcp port 5000-5100"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-slate-500 focus:border-primary-500 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">{t('chutney.maxCaptureSize', 'Max Capture Size (MB)')}</label>
                      <input type="number" name="max_capture_size_mb" value={formData.max_capture_size_mb} onChange={handleChange} min={10} max={10000}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">{t('chutney.rotateInterval', 'Rotate Interval (seconds)')}</label>
                      <input type="number" name="capture_rotate_interval" value={formData.capture_rotate_interval} onChange={handleChange} min={60} max={86400}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:outline-none" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {saveError && (
            <div className="p-4 rounded-lg bg-red-900/30 border border-red-700">
              <p className="text-red-400 font-medium">{t('common.error', 'Error')}: {saveError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
            <Link to="/tor-networks" className="text-slate-400 hover:text-white transition-colors">← {t('common.back', 'Back')}</Link>
            <div className="flex space-x-3">
              <Link to="/tor-networks" className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-lg font-medium transition-colors">
                {t('common.cancel', 'Cancel')}
              </Link>
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors hover:opacity-90" style={{ backgroundColor: neonBlue, color: '#0f172a' }}>
                {saving ? t('common.saving', 'Saving...') : (isEdit ? t('common.saveChanges', 'Save Changes') : t('chutney.createNetwork', 'Create Network'))}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}