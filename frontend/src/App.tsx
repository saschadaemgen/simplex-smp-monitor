import { Routes, Route, Navigate } from 'react-router-dom';
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
import { VideoWidgetProvider } from './contexts/VideoWidgetContext';
import Docker from './pages/Docker';

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
        {/* Chutney - Private Tor Networks */}
        <Route path="tor-networks" element={<TorNetworks />} />
        <Route path="tor-networks/new" element={<TorNetworkForm />} />
        <Route path="tor-networks/:id" element={<TorNetworkDetail />} />
        <Route path="tor-networks/:id/edit" element={<TorNetworkForm />} />
        <Route path="/docker" element={<Docker />} />
      </Route>
    </Routes>
    </VideoWidgetProvider>
  );
}

export default App;