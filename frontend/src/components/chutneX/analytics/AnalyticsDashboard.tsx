/**
 * AnalyticsDashboard - Main Analytics Entry Point
 */
import React, { useState, useEffect, useCallback } from 'react';
import { NetworkAnalytics, AnalyticsTab, TorNetwork } from '../types';
import { AnalyticsHeader } from './AnalyticsHeader';
import { AnalyticsTabs } from './AnalyticsTabs';
import { NetworkOverview } from '../overview';
import { NodeGrid } from '../nodes';
import { CircuitsList } from '../circuits';
import { TrafficOverview } from '../traffic';
import { ForensicsOverview } from '../forensics';
import { NetworkTopology } from '../visualization';
import { IntegrationHub } from '../integration';
import { LoadingOverlay } from '../shared';

interface AnalyticsDashboardProps {
  networkId: string;
  network?: TorNetwork;
  initialTab?: AnalyticsTab;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  networkId,
  network,
  initialTab = 'overview',
  autoRefresh = true,
  refreshInterval = 10000,
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(autoRefresh);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/chutney/networks/${networkId}/analytics/`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [networkId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, fetchAnalytics]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchAnalytics();
  };

  if (isLoading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingOverlay text="Loading Analytics..." />
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-[#88CED0] text-gray-900 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <AnalyticsHeader
        networkName={analytics?.network_name || network?.name || 'Unknown'}
        networkStatus={analytics?.network_status || 'unknown'}
        lastUpdated={lastUpdated}
        isAutoRefresh={isAutoRefresh}
        onToggleAutoRefresh={() => setIsAutoRefresh(!isAutoRefresh)}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Tabs */}
      <AnalyticsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        circuitCount={analytics?.circuits.total_circuits}
        nodeCount={analytics?.nodes.total}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {activeTab === 'overview' && analytics && (
          <NetworkOverview
            analytics={analytics}
            network={network ? {
              id: network.id,
              name: network.name,
              description: network.description,
              template: network.template,
              created_at: network.created_at,
              started_at: network.started_at,
              capture_enabled: network.capture_enabled,
            } : undefined}
          />
        )}

        {activeTab === 'nodes' && analytics && (
          <NodeGrid
            nodes={analytics.nodes.stats}
            layout="grid"
          />
        )}

        {activeTab === 'circuits' && analytics && (
          <CircuitsList
            circuits={analytics.circuits.circuits}
            stats={{
              total_circuits: analytics.circuits.total_circuits,
              built_circuits: analytics.circuits.built_circuits,
              by_status: analytics.circuits.by_status,
              by_purpose: analytics.circuits.by_purpose,
            }}
          />
        )}

        {activeTab === 'traffic' && analytics && (
          <TrafficOverview
            bandwidth={analytics.bandwidth}
            nodeStats={analytics.nodes.stats}
          />
        )}

        {activeTab === 'forensics' && (
          <ForensicsOverview
            networkId={networkId}
            networkName={analytics?.network_name || 'Unknown'}
            analysisAvailable={false}
          />
        )}

        {activeTab === 'topology' && analytics && (
          <NetworkTopology
            nodes={analytics.nodes.stats.map(n => ({
              id: n.node_id,
              label: n.node_name,
              type: n.node_type as any,
              icon: '',
              status: n.bootstrap_progress >= 100 ? 'running' : 'bootstrapping',
              group: n.node_type,
            }))}
            edges={[]}
          />
        )}

        {activeTab === 'integration' && (
          <IntegrationHub />
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
