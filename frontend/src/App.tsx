import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import ServerDetail from './pages/ServerDetail';
import ServerForm from './pages/ServerForm';
import Tests from './pages/Tests';
import Events from './pages/Events';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import ClientForm from './pages/ClientForm';
import Categories from './pages/Categories';
import TestRunHistory from './pages/TestRunHistory';
import Music from './pages/Music';
import CacheForensics from './pages/CacheForensics';
import TorNetworks from './pages/TorNetworks';
import TorNetworkDetail from './pages/TorNetworkDetail';
import TorNetworkForm from './pages/TorNetworkForm';
import ChutneXAnalytics from './pages/ChutneXAnalytics';
import { VideoWidgetProvider } from './contexts/VideoWidgetContext';
import Docker from './pages/Docker';

// ============================================================================
// LAZY LOADED CHUTNEX ANALYTICS PAGES (44 Components)
// ============================================================================

// --- Overview Section (5) ---
const NetworkOverviewPage = lazy(() => import('./pages/chutney/overview/NetworkOverviewPage'));
const StatsCardsPage = lazy(() => import('./pages/chutney/overview/StatsCardsPage'));
const ConsensusInfoPage = lazy(() => import('./pages/chutney/overview/ConsensusInfoPage'));
const NetworkConfigPage = lazy(() => import('./pages/chutney/overview/NetworkConfigPage'));
const TimestampsPage = lazy(() => import('./pages/chutney/overview/TimestampsPage'));

// --- Nodes Section (6) ---
const NodeGridPage = lazy(() => import('./pages/chutney/nodes/NodeGridPage'));
const NodeDetailPage = lazy(() => import('./pages/chutney/nodes/NodeDetailPage'));
const NodeBandwidthPage = lazy(() => import('./pages/chutney/nodes/NodeBandwidthPage'));
const NodeFlagsPage = lazy(() => import('./pages/chutney/nodes/NodeFlagsPage'));
const NodeIdentityPage = lazy(() => import('./pages/chutney/nodes/NodeIdentityPage'));
const NodePortsPage = lazy(() => import('./pages/chutney/nodes/NodePortsPage'));

// --- Circuits Section (6) ---
const CircuitsListPage = lazy(() => import('./pages/chutney/circuits/CircuitsListPage'));
const TrafficOverviewPage = lazy(() => import('./pages/chutney/traffic/TrafficOverviewPage'));
const CircuitDetailPage = lazy(() => import('./pages/chutney/circuits/CircuitDetailPage'));
const CircuitPathPage = lazy(() => import('./pages/chutney/circuits/CircuitPathPage'));
const CircuitStatsPage = lazy(() => import('./pages/chutney/circuits/CircuitStatsPage'));
const CircuitFiltersPage = lazy(() => import('./pages/chutney/circuits/CircuitFiltersPage'));
const CircuitEventsPage = lazy(() => import('./pages/chutney/circuits/CircuitEventsPage'));

// --- Traffic Section (6) ---
const BandwidthChartPage = lazy(() => import('./pages/chutney/traffic/BandwidthChartPage'));
const CapturesListPage = lazy(() => import('./pages/chutney/traffic/CapturesListPage'));
const CaptureDetailPage = lazy(() => import('./pages/chutney/traffic/CaptureDetailPage'));
const PacketAnalysisPage = lazy(() => import('./pages/chutney/traffic/PacketAnalysisPage'));
const FlowAnalysisPage = lazy(() => import('./pages/chutney/traffic/FlowAnalysisPage'));

// --- Forensics Section (4) ---
const ForensicsOverviewPage = lazy(() => import('./pages/chutney/forensics/ForensicsOverviewPage'));
const TimingCorrelationPage = lazy(() => import('./pages/chutney/forensics/TimingCorrelationPage'));
const TrafficPatternsPage = lazy(() => import('./pages/chutney/forensics/TrafficPatternsPage'));
const CellAnalysisPage = lazy(() => import('./pages/chutney/forensics/CellAnalysisPage'));

// --- Visualization Section (3) ---
const NetworkTopologyPage = lazy(() => import('./pages/chutney/viz/NetworkTopologyPage'));
const CircuitFlowPage = lazy(() => import('./pages/chutney/viz/CircuitFlowPage'));
const HeatmapPage = lazy(() => import('./pages/chutney/viz/HeatmapPage'));

// --- Integration Section (3) ---
const IntegrationHubPage = lazy(() => import('./pages/chutney/integration/IntegrationHubPage'));
const ZeekLogsPage = lazy(() => import('./pages/chutney/integration/ZeekLogsPage'));
const SuricataAlertsPage = lazy(() => import('./pages/chutney/integration/SuricataAlertsPage'));

// --- Reports Section (1) ---
const ReportGeneratorPage = lazy(() => import('./pages/chutney/reports/ReportGeneratorPage'));

// --- Analytics Section (3) ---
const AnalyticsDashboardPage = lazy(() => import('./pages/chutney/analytics/AnalyticsDashboardPage'));
const AnalyticsHeaderPage = lazy(() => import('./pages/chutney/analytics/AnalyticsHeaderPage'));
const AnalyticsTabsPage = lazy(() => import('./pages/chutney/analytics/AnalyticsTabsPage'));

// --- UI Components Showcase (7) ---
const UIComponentsPage = lazy(() => import('./pages/chutney/ui/UIComponentsPage'));

// ============================================================================
// LOADING SPINNER
// ============================================================================
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-[#88CED0] border-t-transparent rounded-full animate-spin" />
  </div>
);

// ============================================================================
// COMING SOON PAGE
// ============================================================================
const ComingSoonPage = () => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <div className="w-16 h-16 mb-4 rounded-full bg-[#88CED0]/20 flex items-center justify-center">
      <svg className="w-8 h-8 text-[#88CED0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 className="text-xl font-bold text-white mb-2">Coming Soon</h2>
    <p className="text-slate-400 max-w-md">
      This feature is currently under development and will be available in a future release.
    </p>
  </div>
);

// ============================================================================
// APP COMPONENT
// ============================================================================
function App() {
  return (
    <VideoWidgetProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="servers" element={<Servers />} />
          <Route path="servers/new" element={<ServerForm />} />
          <Route path="servers/:id" element={<ServerDetail />} />
          <Route path="servers/:id/edit" element={<ServerForm />} />
          <Route path="servers/categories" element={<Categories />} />
          <Route path="tests" element={<Tests />} />
          <Route path="test-runs" element={<TestRunHistory />} />
          <Route path="events" element={<Events />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/new" element={<ClientForm />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="clients/:id/edit" element={<ClientForm />} />
          <Route path="music" element={<Music />} />
          <Route path="cache-forensics" element={<CacheForensics />} />
          <Route path="docker" element={<Docker />} />
          
          {/* ============================================ */}
          {/* CHUTNEX - PRIVATE TOR NETWORKS               */}
          {/* ============================================ */}
          <Route path="tor-networks" element={<TorNetworks />} />
          <Route path="tor-networks/new" element={<TorNetworkForm />} />
          <Route path="tor-networks/:id" element={<TorNetworkDetail />} />
          <Route path="tor-networks/:id/edit" element={<TorNetworkForm />} />
          
          {/* ChutneX Analytics Dashboard (Main Entry) */}
          <Route path="tor-networks/:id/analytics" element={<ChutneXAnalytics />} />
          
          {/* ============================================ */}
          {/* CHUTNEX ANALYTICS SUB-ROUTES (44 Components) */}
          {/* ============================================ */}
          
          {/* --- OVERVIEW SECTION (5) --- */}
          <Route path="tor-networks/:id/analytics/overview" element={
            <Suspense fallback={<LoadingSpinner />}><NetworkOverviewPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/overview/stats" element={
            <Suspense fallback={<LoadingSpinner />}><StatsCardsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/overview/consensus" element={
            <Suspense fallback={<LoadingSpinner />}><ConsensusInfoPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/overview/config" element={
            <Suspense fallback={<LoadingSpinner />}><NetworkConfigPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/overview/timestamps" element={
            <Suspense fallback={<LoadingSpinner />}><TimestampsPage /></Suspense>
          } />
          
          {/* --- NODES SECTION (6) --- */}
          <Route path="tor-networks/:id/analytics/nodes" element={
            <Suspense fallback={<LoadingSpinner />}><NodeGridPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/nodes/detail" element={
            <Suspense fallback={<LoadingSpinner />}><NodeDetailPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/nodes/detail/:nodeId" element={
            <Suspense fallback={<LoadingSpinner />}><NodeDetailPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/nodes/bandwidth" element={
            <Suspense fallback={<LoadingSpinner />}><NodeBandwidthPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/nodes/flags" element={
            <Suspense fallback={<LoadingSpinner />}><NodeFlagsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/nodes/identity" element={
            <Suspense fallback={<LoadingSpinner />}><NodeIdentityPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/nodes/ports" element={
            <Suspense fallback={<LoadingSpinner />}><NodePortsPage /></Suspense>
          } />
          
          <Route path="tor-networks/:id/analytics/circuits" element={<Suspense fallback={<LoadingSpinner />}><CircuitsListPage /></Suspense>} />
          <Route path="tor-networks/:id/analytics/circuits/card" element={<Suspense fallback={<LoadingSpinner />}><CircuitDetailPage /></Suspense>} />
          <Route path="tor-networks/:id/analytics/circuits/card/:circuitId" element={
            <Suspense fallback={<LoadingSpinner />}><CircuitDetailPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/circuits/path" element={
            <Suspense fallback={<LoadingSpinner />}><CircuitPathPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/circuits/stats" element={
            <Suspense fallback={<LoadingSpinner />}><CircuitStatsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/circuits/filters" element={
            <Suspense fallback={<LoadingSpinner />}><CircuitFiltersPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/circuits/events" element={
            <Suspense fallback={<LoadingSpinner />}><CircuitEventsPage /></Suspense>
          } />
          
          {/* --- TRAFFIC SECTION (6) --- */}
          <Route path="tor-networks/:id/analytics/traffic" element={
            <Suspense fallback={<LoadingSpinner />}><TrafficOverviewPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/traffic/bandwidth" element={
            <Suspense fallback={<LoadingSpinner />}><BandwidthChartPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/traffic/captures" element={
            <Suspense fallback={<LoadingSpinner />}><CapturesListPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/traffic/capture" element={
            <Suspense fallback={<LoadingSpinner />}><CaptureDetailPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/traffic/capture/:captureId" element={
            <Suspense fallback={<LoadingSpinner />}><CaptureDetailPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/traffic/packets" element={
            <Suspense fallback={<LoadingSpinner />}><PacketAnalysisPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/traffic/flows" element={
            <Suspense fallback={<LoadingSpinner />}><FlowAnalysisPage /></Suspense>
          } />
          
          {/* --- FORENSICS SECTION (4) --- */}
          <Route path="tor-networks/:id/analytics/forensics" element={
            <Suspense fallback={<LoadingSpinner />}><ForensicsOverviewPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/forensics/timing" element={
            <Suspense fallback={<LoadingSpinner />}><TimingCorrelationPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/forensics/patterns" element={
            <Suspense fallback={<LoadingSpinner />}><TrafficPatternsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/forensics/cells" element={
            <Suspense fallback={<LoadingSpinner />}><CellAnalysisPage /></Suspense>
          } />
          
          {/* --- VISUALIZATION SECTION (3) --- */}
          <Route path="tor-networks/:id/analytics/viz/topology" element={
            <Suspense fallback={<LoadingSpinner />}><NetworkTopologyPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/viz/circuit-flow" element={
            <Suspense fallback={<LoadingSpinner />}><CircuitFlowPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/viz/heatmap" element={
            <Suspense fallback={<LoadingSpinner />}><HeatmapPage /></Suspense>
          } />
          
          {/* --- INTEGRATION SECTION (3) --- */}
          <Route path="tor-networks/:id/analytics/integration" element={
            <Suspense fallback={<LoadingSpinner />}><IntegrationHubPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/integration/zeek" element={
            <Suspense fallback={<LoadingSpinner />}><ZeekLogsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/integration/suricata" element={
            <Suspense fallback={<LoadingSpinner />}><SuricataAlertsPage /></Suspense>
          } />
          
          {/* --- REPORTS SECTION (1) --- */}
          <Route path="tor-networks/:id/analytics/reports" element={
            <Suspense fallback={<LoadingSpinner />}><ReportGeneratorPage /></Suspense>
          } />
          
          {/* --- ANALYTICS SECTION (3) --- */}
          <Route path="tor-networks/:id/analytics/analytics" element={
            <Suspense fallback={<LoadingSpinner />}><AnalyticsDashboardPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/analytics/header" element={
            <Suspense fallback={<LoadingSpinner />}><AnalyticsHeaderPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/analytics/tabs" element={
            <Suspense fallback={<LoadingSpinner />}><AnalyticsTabsPage /></Suspense>
          } />
          
          {/* --- UI COMPONENTS SECTION (7) --- */}
          <Route path="tor-networks/:id/analytics/ui/status-badge" element={
            <Suspense fallback={<LoadingSpinner />}><UIComponentsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/ui/node-icon" element={
            <Suspense fallback={<LoadingSpinner />}><UIComponentsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/ui/bytes" element={
            <Suspense fallback={<LoadingSpinner />}><UIComponentsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/ui/progress" element={
            <Suspense fallback={<LoadingSpinner />}><UIComponentsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/ui/time-ago" element={
            <Suspense fallback={<LoadingSpinner />}><UIComponentsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/ui/spinner" element={
            <Suspense fallback={<LoadingSpinner />}><UIComponentsPage /></Suspense>
          } />
          <Route path="tor-networks/:id/analytics/ui/table" element={
            <Suspense fallback={<LoadingSpinner />}><UIComponentsPage /></Suspense>
          } />
          
          {/* --- COMING SOON ROUTES (Future Features) --- */}
          {/* Overview */}
          <Route path="tor-networks/:id/analytics/overview/health" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/overview/activity" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/overview/system" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/overview/actions" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/overview/guide" element={<ComingSoonPage />} />
          
          {/* Nodes */}
          <Route path="tor-networks/:id/analytics/nodes/compare" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/nodes/history" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/nodes/search" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/nodes/export" element={<ComingSoonPage />} />
          
          {/* Node Types */}
          <Route path="tor-networks/:id/analytics/nodes/type/*" element={<ComingSoonPage />} />
          
          {/* Circuits */}
          <Route path="tor-networks/:id/analytics/circuits/builder" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/circuits/timeline" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/circuits/compare" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/circuits/export" element={<ComingSoonPage />} />
          
          {/* Traffic */}
          <Route path="tor-networks/:id/analytics/traffic/live" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/traffic/heatmap" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/traffic/protocols" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/traffic/export" element={<ComingSoonPage />} />
          
          {/* Forensics */}
          <Route path="tor-networks/:id/analytics/forensics/fingerprint" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/forensics/attacks" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/forensics/anomaly" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/forensics/deep" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/forensics/correlation" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/forensics/report" element={<ComingSoonPage />} />
          
          {/* Visualization */}
          <Route path="tor-networks/:id/analytics/viz/3d" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/viz/animation" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/viz/timeline" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/viz/geomap" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/viz/sankey" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/viz/force" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/viz/canvas" element={<ComingSoonPage />} />
          
          {/* Integration */}
          <Route path="tor-networks/:id/analytics/integration/arkime" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/integration/neo4j" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/integration/misp" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/integration/elastic" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/integration/grafana" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/integration/splunk" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/integration/webhooks" element={<ComingSoonPage />} />
          
          {/* Reports */}
          <Route path="tor-networks/:id/analytics/reports/pdf" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/reports/csv" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/reports/json" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/reports/templates" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/reports/schedule" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/reports/email" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/reports/history" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/reports/branding" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/reports/compliance" element={<ComingSoonPage />} />
          
          {/* Analytics */}
          <Route path="tor-networks/:id/analytics/analytics/realtime" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/analytics/history" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/analytics/trends" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/analytics/custom" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/analytics/kpi" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/analytics/predict" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/analytics/explorer" element={<ComingSoonPage />} />
          
          {/* UI Components */}
          <Route path="tor-networks/:id/analytics/ui/charts" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/ui/forms" element={<ComingSoonPage />} />
          <Route path="tor-networks/:id/analytics/ui/modals" element={<ComingSoonPage />} />
          
          {/* Settings */}
          <Route path="tor-networks/:id/analytics/settings/*" element={<ComingSoonPage />} />
          
        </Route>
      </Routes>
    </VideoWidgetProvider>
  );
}

export default App;