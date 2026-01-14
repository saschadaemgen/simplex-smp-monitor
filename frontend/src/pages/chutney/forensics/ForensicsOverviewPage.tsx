import  { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search, Shield, Activity, Database, Loader2 } from 'lucide-react';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';

export default function ForensicsOverviewPage() {
  const { id: networkId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 overflow-auto">
      <div className="bg-gray-800/30 border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center gap-2 text-sm mb-4">
          <Link to="/tor-networks" className="text-gray-500 hover:text-[#88CED0] flex items-center gap-1">
            <ArrowLeft size={14} />Networks
          </Link>
          <ChevronRight size={14} className="text-gray-600" />
          <Link to={`/tor-networks/${networkId}/analytics`} className="text-gray-500 hover:text-[#88CED0]">Analytics</Link>
          <ChevronRight size={14} className="text-gray-600" />
          <span style={{ color: NEON }}>Forensics</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: NEON_DIM }}>
            <Search size={24} style={{ color: NEON }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Forensics Overview</h1>
            <p className="text-gray-500 text-sm">Tor traffic analysis and investigation tools</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to={`/tor-networks/${networkId}/analytics/forensics/timing`} 
                className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6 hover:border-[#88CED0]/30 transition-all">
            <Activity size={32} style={{ color: NEON }} className="mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Timing Correlation</h3>
            <p className="text-gray-500 text-sm">Analyze timing patterns to detect traffic correlation attacks</p>
          </Link>
          
          <Link to={`/tor-networks/${networkId}/analytics/forensics/cells`}
                className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6 hover:border-[#88CED0]/30 transition-all">
            <Database size={32} style={{ color: NEON }} className="mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Cell Analysis</h3>
            <p className="text-gray-500 text-sm">Deep packet inspection of Tor cells and protocols</p>
          </Link>
          
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6">
            <Shield size={32} style={{ color: NEON }} className="mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Security Audit</h3>
            <p className="text-gray-500 text-sm">Comprehensive security analysis (Coming Soon)</p>
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: NEON }}>0</p>
              <p className="text-gray-500 text-sm">Anomalies Detected</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: NEON }}>0%</p>
              <p className="text-gray-500 text-sm">Correlation Risk</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: NEON }}>100%</p>
              <p className="text-gray-500 text-sm">Network Health</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: NEON }}>0</p>
              <p className="text-gray-500 text-sm">Active Alerts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
