/**
 * SimpleX SMP Monitor - ChutneX Analytics Dashboard
 * =================================================
 * Copyright (c) 2025-2026 cannatoshi
 * 
 * COMPLETE REDESIGN - Neon Blue Theme
 * Futuristic forensic analysis dashboard for private Tor networks.
 * 
 * Design System:
 * - Primary: #88CED0 (Neon Blue)
 * - All UI elements use blue spectrum only
 * - Cyberpunk-inspired aesthetics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { torNetworksApi, TorNetwork } from '../api/chutney';
import { analyticsApi } from '../api/chutney_analytics';
import type { NetworkAnalytics, CircuitInfo, NodeStats } from '../api/chutney_analytics';

// =============================================================================
// NEON BLUE DESIGN SYSTEM - NO OTHER COLORS!
// =============================================================================

const COLORS = {
  // Primary Neon Blue Spectrum
  neon: '#88CED0',
  neonBright: '#A5E4E6',
  neonDim: '#5BA3A5',
  neonDark: '#3D7A7C',
  neonGlow: '#88CED040',
  
  // Blue Variations for Data
  circuit: '#7EC8E3',
  node: '#5FB3B3',
  traffic: '#4AA8C7',
  consensus: '#6BCBD6',
  
  // Background Blues
  bgDark: '#0A1929',
  bgCard: '#0D2137',
  bgHover: '#132F4C',
  bgBorder: '#1E4976',
  
  // Text Blues
  textPrimary: '#E3F2FD',
  textSecondary: '#90CAF9',
  textMuted: '#5C8BC4',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

const NODE_ICONS: Record<string, string> = {
  da: '◈',
  guard: '◉',
  middle: '◎',
  exit: '◇',
  client: '▣',
  hs: '◆',
};

// =============================================================================
// GLOWING CARD COMPONENT
// =============================================================================

function GlowCard({ 
  children, 
  className = '',
  glow = false,
  hover = true,
}: { 
  children: React.ReactNode; 
  className?: string;
  glow?: boolean;
  hover?: boolean;
}) {
  return (
    <div 
      className={`
        relative rounded-xl border backdrop-blur-sm
        ${hover ? 'hover:border-[#88CED0]/60 transition-all duration-300' : ''}
        ${glow ? 'shadow-[0_0_30px_rgba(136,206,208,0.15)]' : ''}
        ${className}
      `}
      style={{
        background: `linear-gradient(135deg, ${COLORS.bgCard} 0%, ${COLORS.bgDark} 100%)`,
        borderColor: glow ? COLORS.neon + '40' : COLORS.bgBorder,
      }}
    >
      {glow && (
        <div 
          className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top, ${COLORS.neon}20 0%, transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

// =============================================================================
// ANIMATED STAT DISPLAY
// =============================================================================

function AnimatedStat({ 
  label, 
  value, 
  unit = '',
  icon,
  subtext,
  size = 'normal',
}: { 
  label: string; 
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  subtext?: string;
  size?: 'small' | 'normal' | 'large';
}) {
  const sizeClasses = {
    small: 'text-xl',
    normal: 'text-3xl',
    large: 'text-4xl',
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span style={{ color: COLORS.neon }}>{icon}</span>}
        <span style={{ color: COLORS.textMuted }} className="text-xs uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span 
          className={`font-bold font-mono ${sizeClasses[size]}`}
          style={{ 
            color: COLORS.neon,
            textShadow: `0 0 20px ${COLORS.neonGlow}`,
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ color: COLORS.textSecondary }} className="text-sm">
            {unit}
          </span>
        )}
      </div>
      {subtext && (
        <p style={{ color: COLORS.textMuted }} className="text-xs mt-1">
          {subtext}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// PROGRESS RING COMPONENT
// =============================================================================

function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 6,
  label,
}: { 
  progress: number; 
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.bgBorder}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.neon}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${COLORS.neon})`,
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="text-lg font-bold font-mono"
          style={{ color: COLORS.neon }}
        >
          {progress}%
        </span>
        {label && (
          <span style={{ color: COLORS.textMuted }} className="text-[10px] uppercase">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CIRCUIT PATH VISUALIZATION
// =============================================================================

function CircuitPath({ path, circuitId }: { path: { fingerprint: string; nickname: string }[]; circuitId: string }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      <span style={{ color: COLORS.textMuted }} className="text-xs font-mono mr-1">
        #{circuitId}
      </span>
      {path.map((hop, i) => (
        <div key={i} className="flex items-center">
          <div
            className="px-2 py-1 rounded text-xs font-mono whitespace-nowrap"
            style={{
              background: `${COLORS.neon}15`,
              color: COLORS.neon,
              border: `1px solid ${COLORS.neon}30`,
            }}
            title={hop.fingerprint}
          >
            {hop.nickname}
          </div>
          {i < path.length - 1 && (
            <div 
              className="mx-1 text-sm"
              style={{ color: COLORS.neonDim }}
            >
              →
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// BANDWIDTH BAR (HORIZONTAL)
// =============================================================================

function BandwidthBar({ 
  label, 
  bytesRead, 
  bytesWritten, 
  maxBytes,
  nodeCount,
}: { 
  label: string;
  bytesRead: number;
  bytesWritten: number;
  maxBytes: number;
  nodeCount: number;
}) {
  const total = bytesRead + bytesWritten;
  const percentage = maxBytes > 0 ? (total / maxBytes) * 100 : 0;
  const readPercent = total > 0 ? (bytesRead / total) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: COLORS.neon }} className="text-lg">
            {NODE_ICONS[label] || '○'}
          </span>
          <span style={{ color: COLORS.textPrimary }} className="font-medium uppercase text-sm">
            {label}
          </span>
          <span style={{ color: COLORS.textMuted }} className="text-xs">
            ({nodeCount})
          </span>
        </div>
        <span style={{ color: COLORS.neon }} className="font-mono text-sm">
          {formatBytes(total)}
        </span>
      </div>
      
      <div 
        className="h-3 rounded-full overflow-hidden flex"
        style={{ background: COLORS.bgDark }}
      >
        <div 
          className="h-full transition-all duration-500 rounded-l-full"
          style={{ 
            width: `${percentage * (readPercent / 100)}%`,
            background: `linear-gradient(90deg, ${COLORS.neon} 0%, ${COLORS.neonBright} 100%)`,
            boxShadow: `0 0 10px ${COLORS.neonGlow}`,
          }}
        />
        <div 
          className="h-full transition-all duration-500 rounded-r-full"
          style={{ 
            width: `${percentage * ((100 - readPercent) / 100)}%`,
            background: `linear-gradient(90deg, ${COLORS.neonDim} 0%, ${COLORS.neon} 100%)`,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// NODE MINI CARD
// =============================================================================

function NodeMiniCard({ node }: { node: NodeStats }) {
  const isFullyBootstrapped = node.bootstrap_progress >= 100;
  
  return (
    <div 
      className="p-3 rounded-lg border transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: COLORS.bgCard,
        borderColor: isFullyBootstrapped ? COLORS.neon + '40' : COLORS.bgBorder,
        boxShadow: isFullyBootstrapped ? `0 0 15px ${COLORS.neonGlow}` : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ color: COLORS.neon }} className="text-lg">
            {NODE_ICONS[node.node_type] || '○'}
          </span>
          <span style={{ color: COLORS.textPrimary }} className="font-medium text-sm truncate max-w-[100px]">
            {node.node_name}
          </span>
        </div>
        <span style={{ color: COLORS.textMuted }} className="text-xs">
          {formatUptime(node.uptime)}
        </span>
      </div>
      
      {/* Bootstrap Progress */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: COLORS.textMuted }}>Bootstrap</span>
          <span style={{ color: COLORS.neon }}>{node.bootstrap_progress}%</span>
        </div>
        <div 
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: COLORS.bgDark }}
        >
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${node.bootstrap_progress}%`,
              background: COLORS.neon,
              boxShadow: isFullyBootstrapped ? `0 0 8px ${COLORS.neon}` : 'none',
            }}
          />
        </div>
      </div>
      
      {/* Traffic Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span style={{ color: COLORS.textMuted }}>↓ Read</span>
          <p style={{ color: COLORS.textSecondary }} className="font-mono">
            {formatBytes(node.bytes_read)}
          </p>
        </div>
        <div>
          <span style={{ color: COLORS.textMuted }}>↑ Write</span>
          <p style={{ color: COLORS.textSecondary }} className="font-mono">
            {formatBytes(node.bytes_written)}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LIVE INDICATOR
// =============================================================================

function LiveIndicator({ isLive }: { isLive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className={`w-2 h-2 rounded-full ${isLive ? 'animate-pulse' : ''}`}
        style={{ 
          background: COLORS.neon,
          boxShadow: isLive ? `0 0 8px ${COLORS.neon}` : 'none',
        }}
      />
      <span style={{ color: COLORS.neon }} className="text-xs uppercase tracking-wider">
        {isLive ? 'Live' : 'Paused'}
      </span>
    </div>
  );
}

// =============================================================================
// CONSENSUS STATUS DISPLAY
// =============================================================================

function ConsensusDisplay({ consensus }: { consensus: NetworkAnalytics['consensus'] }) {
  if (!consensus) {
    return (
      <div className="text-center py-6" style={{ color: COLORS.textMuted }}>
        No consensus data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Consensus Valid Indicator */}
      <div className="flex items-center justify-center">
        <div 
          className="px-4 py-2 rounded-full flex items-center gap-2"
          style={{
            background: consensus.valid ? `${COLORS.neon}20` : `${COLORS.bgBorder}`,
            border: `1px solid ${consensus.valid ? COLORS.neon : COLORS.bgBorder}`,
          }}
        >
          <div 
            className="w-2 h-2 rounded-full"
            style={{ 
              background: COLORS.neon,
              boxShadow: consensus.valid ? `0 0 8px ${COLORS.neon}` : 'none',
            }}
          />
          <span style={{ color: COLORS.neon }} className="font-medium">
            {consensus.valid ? 'Consensus Valid' : 'Consensus Invalid'}
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span style={{ color: COLORS.textMuted }} className="text-xs uppercase">
            Tor Version
          </span>
          <p style={{ color: COLORS.textSecondary }} className="font-mono">
            {consensus.tor_version}
          </p>
        </div>
        <div>
          <span style={{ color: COLORS.textMuted }} className="text-xs uppercase">
            Source DA
          </span>
          <p style={{ color: COLORS.textSecondary }}>
            {consensus.source_da}
          </p>
        </div>
        {consensus.valid_after && (
          <div>
            <span style={{ color: COLORS.textMuted }} className="text-xs uppercase">
              Valid After
            </span>
            <p style={{ color: COLORS.textSecondary }} className="text-xs">
              {new Date(consensus.valid_after).toLocaleString()}
            </p>
          </div>
        )}
        {consensus.fresh_until && (
          <div>
            <span style={{ color: COLORS.textMuted }} className="text-xs uppercase">
              Fresh Until
            </span>
            <p style={{ color: COLORS.textSecondary }} className="text-xs">
              {new Date(consensus.fresh_until).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function ChutneXAnalytics() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  
  const [network, setNetwork] = useState<TorNetwork | null>(null);
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const fetchNetwork = useCallback(async () => {
    if (!id) return;
    try {
      const data = await torNetworksApi.get(id);
      setNetwork(data);
    } catch (err) {
      console.error('Failed to fetch network:', err);
    }
  }, [id]);
  
  const fetchAnalytics = useCallback(async () => {
    if (!id) return;
    
    try {
      const data = await analyticsApi.getNetworkAnalytics(id);
      setAnalytics(data);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchNetwork();
    fetchAnalytics();
  }, [fetchNetwork, fetchAnalytics]);
  
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  // Compute max bandwidth for scaling
  const maxBandwidth = useMemo(() => {
    if (!analytics?.bandwidth?.by_type) return 1;
    return Math.max(
      ...Object.values(analytics.bandwidth.by_type).map(
        d => d.bytes_read + d.bytes_written
      ),
      1
    );
  }, [analytics]);

  // Group nodes by type
  const nodesByType = useMemo(() => {
    if (!analytics?.nodes?.stats) return {};
    return analytics.nodes.stats.reduce((acc, node) => {
      const type = node.node_type as string;
      if (!acc[type]) acc[type] = [];
      acc[type].push(node);
      return acc;
    }, {} as Record<string, NodeStats[]>);
  }, [analytics]);
  
  // Loading State
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.bgDark }}
      >
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: `${COLORS.neon} transparent ${COLORS.neon} ${COLORS.neon}` }}
          />
          <p style={{ color: COLORS.neon }} className="animate-pulse">
            {t('analytics.loading', 'Loading Analytics...')}
          </p>
        </div>
      </div>
    );
  }
  
  // Error State
  if (error) {
    return (
      <div 
        className="min-h-screen p-6"
        style={{ background: COLORS.bgDark }}
      >
        <div className="max-w-2xl mx-auto">
          <Link 
            to="/chutney" 
            className="inline-flex items-center gap-2 mb-6 hover:opacity-80"
            style={{ color: COLORS.neon }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            {t('analytics.backToNetworks', 'Back to Networks')}
          </Link>
          
          <GlowCard className="p-8 text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${COLORS.neon}20` }}
            >
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 style={{ color: COLORS.neon }} className="text-xl font-bold mb-2">
              {t('analytics.error', 'Analytics Unavailable')}
            </h2>
            <p style={{ color: COLORS.textMuted }} className="mb-6">
              {error}
            </p>
            <Link
              to={`/chutney/${id}`}
              className="inline-block px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
              style={{ 
                background: COLORS.neon,
                color: COLORS.bgDark,
              }}
            >
              {t('analytics.goToNetwork', 'Go to Network Details')}
            </Link>
          </GlowCard>
        </div>
      </div>
    );
  }
  
  if (!analytics) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.bgDark }}
      >
        <p style={{ color: COLORS.textMuted }}>
          {t('analytics.noData', 'No analytics data available')}
        </p>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen p-6"
      style={{ background: COLORS.bgDark }}
    >
      {/* ================================================================== */}
      {/* HEADER SECTION */}
      {/* ================================================================== */}
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: Navigation & Title */}
          <div>
            <Link 
              to="/chutney" 
              className="inline-flex items-center gap-2 text-sm mb-3 hover:opacity-80 transition-opacity"
              style={{ color: COLORS.textMuted }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              ChutneX Networks
            </Link>
            
            <h1 
              className="text-3xl font-bold mb-1"
              style={{ 
                color: COLORS.neon,
                textShadow: `0 0 30px ${COLORS.neonGlow}`,
              }}
            >
              ◈ {analytics.network_name}
            </h1>
            <p style={{ color: COLORS.textMuted }} className="text-sm">
              {t('analytics.subtitle', 'Private Tor Network Forensic Analysis')}
            </p>
          </div>
          
          {/* Right: Controls */}
          <div className="flex items-center gap-4">
            <LiveIndicator isLive={autoRefresh} />
            
            <div style={{ color: COLORS.textMuted }} className="text-xs">
              {t('analytics.lastUpdate', 'Updated')}: {' '}
              <span style={{ color: COLORS.neon }}>
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: autoRefresh ? `${COLORS.neon}20` : COLORS.bgCard,
                border: `1px solid ${autoRefresh ? COLORS.neon : COLORS.bgBorder}`,
                color: COLORS.neon,
              }}
            >
              {autoRefresh ? '⏸ Pause' : '▶ Resume'}
            </button>
            
            <button
              onClick={fetchAnalytics}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.bgBorder}`,
                color: COLORS.neon,
              }}
              title={t('analytics.refresh', 'Refresh')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            
            <Link
              to={`/chutney/${id}`}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{
                background: COLORS.neon,
                color: COLORS.bgDark,
              }}
            >
              ← {t('analytics.networkDetails', 'Network')}
            </Link>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* HERO STATS ROW */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GlowCard glow className="p-5">
          <AnimatedStat
            label={t('analytics.totalTraffic', 'Total Traffic')}
            value={formatBytes(analytics.summary.total_bytes)}
            icon="◈"
            subtext={`${analytics.bandwidth.nodes_reporting} ${t('analytics.nodesReporting', 'nodes reporting')}`}
          />
        </GlowCard>
        
        <GlowCard glow className="p-5">
          <AnimatedStat
            label={t('analytics.activeCircuits', 'Active Circuits')}
            value={analytics.summary.active_circuits}
            icon="⚡"
            subtext={`${analytics.circuits.total_circuits} ${t('analytics.total', 'total')}`}
          />
        </GlowCard>
        
        <GlowCard glow className="p-5">
          <AnimatedStat
            label={t('analytics.nodesRunning', 'Nodes Running')}
            value={`${analytics.nodes.running}/${analytics.nodes.total}`}
            icon="◉"
            subtext={`${Math.round((analytics.nodes.running / analytics.nodes.total) * 100)}% ${t('analytics.online', 'online')}`}
          />
        </GlowCard>
        
        <GlowCard glow className="p-5">
          <div className="flex items-center justify-between">
            <AnimatedStat
              label={t('analytics.consensus', 'Consensus')}
              value={analytics.summary.consensus_valid ? 'Valid' : 'Invalid'}
              icon="◇"
              subtext={analytics.consensus?.source_da || 'N/A'}
            />
            <ProgressRing 
              progress={analytics.summary.consensus_valid ? 100 : 0}
              size={60}
              strokeWidth={4}
            />
          </div>
        </GlowCard>
      </div>

      {/* ================================================================== */}
      {/* MAIN CONTENT GRID */}
      {/* ================================================================== */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Bandwidth by Node Type - 2 columns */}
        <GlowCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ color: COLORS.neon }} className="font-bold text-lg flex items-center gap-2">
              <span>◈</span>
              {t('analytics.bandwidthByType', 'Bandwidth by Node Type')}
            </h2>
            <span style={{ color: COLORS.textMuted }} className="text-sm font-mono">
              {formatBytes(analytics.bandwidth.total_bytes)} total
            </span>
          </div>
          
          <div className="space-y-5">
            {Object.entries(analytics.bandwidth.by_type).map(([nodeType, stats]) => (
              <BandwidthBar
                key={nodeType}
                label={nodeType}
                bytesRead={stats.bytes_read}
                bytesWritten={stats.bytes_written}
                maxBytes={maxBandwidth}
                nodeCount={stats.node_count}
              />
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-8 mt-6 pt-4 border-t" style={{ borderColor: COLORS.bgBorder }}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded" style={{ background: COLORS.neon }} />
              <span style={{ color: COLORS.textMuted }} className="text-xs">
                {t('analytics.read', 'Read')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded opacity-60" style={{ background: COLORS.neonDim }} />
              <span style={{ color: COLORS.textMuted }} className="text-xs">
                {t('analytics.write', 'Write')}
              </span>
            </div>
          </div>
        </GlowCard>

        {/* Consensus Panel - 1 column */}
        <GlowCard className="p-5">
          <h2 style={{ color: COLORS.neon }} className="font-bold text-lg flex items-center gap-2 mb-4">
            <span>◇</span>
            {t('analytics.consensusStatus', 'Consensus Status')}
          </h2>
          <ConsensusDisplay consensus={analytics.consensus} />
        </GlowCard>
      </div>

      {/* ================================================================== */}
      {/* CIRCUITS SECTION */}
      {/* ================================================================== */}
      <GlowCard className="p-5 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ color: COLORS.neon }} className="font-bold text-lg flex items-center gap-2">
            <span>⚡</span>
            {t('analytics.activeCircuits', 'Active Circuits')}
          </h2>
          <div className="flex items-center gap-4">
            {Object.entries(analytics.circuits.by_status).map(([status, count]) => (
              <div 
                key={status} 
                className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
                style={{
                  background: `${COLORS.neon}15`,
                  border: `1px solid ${COLORS.neon}30`,
                  color: COLORS.neon,
                }}
              >
                <span>{status.replace('CircStatus.', '')}</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Circuits List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {analytics.circuits.circuits.slice(0, 15).map((circuit, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-lg border transition-all hover:scale-[1.01]"
              style={{
                background: COLORS.bgCard,
                borderColor: COLORS.bgBorder,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-mono"
                    style={{
                      background: `${COLORS.neon}20`,
                      color: COLORS.neon,
                    }}
                  >
                    {circuit.status.replace('CircStatus.', '')}
                  </span>
                  <span style={{ color: COLORS.textSecondary }} className="text-sm">
                    {circuit.purpose}
                  </span>
                </div>
                {circuit.source_node && (
                  <span style={{ color: COLORS.textMuted }} className="text-xs">
                    from {circuit.source_node}
                  </span>
                )}
              </div>
              <CircuitPath path={circuit.path} circuitId={circuit.circuit_id} />
            </div>
          ))}
        </div>
        
        {analytics.circuits.circuits.length > 15 && (
          <p style={{ color: COLORS.textMuted }} className="text-center text-sm mt-4">
            {t('analytics.showingCircuits', 'Showing 15 of')} {analytics.circuits.circuits.length} {t('analytics.circuits', 'circuits')}
          </p>
        )}
      </GlowCard>

      {/* ================================================================== */}
      {/* NODES GRID */}
      {/* ================================================================== */}
      <GlowCard className="p-5 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ color: COLORS.neon }} className="font-bold text-lg flex items-center gap-2">
            <span>◉</span>
            {t('analytics.nodeStatistics', 'Node Statistics')}
          </h2>
          <span style={{ color: COLORS.textMuted }} className="text-sm">
            {t('analytics.avgUptime', 'Avg uptime')}: {' '}
            <span style={{ color: COLORS.neon }} className="font-mono">
              {formatUptime(analytics.summary.avg_node_uptime)}
            </span>
          </span>
        </div>
        
        <div className="space-y-6">
          {Object.entries(nodesByType).map(([type, nodes]) => (
            <div key={type}>
              <h3 
                className="text-sm font-medium mb-3 flex items-center gap-2"
                style={{ color: COLORS.textSecondary }}
              >
                <span style={{ color: COLORS.neon }}>{NODE_ICONS[type] || '○'}</span>
                <span className="uppercase">{type}</span>
                <span style={{ color: COLORS.textMuted }}>({nodes.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {nodes.map(node => (
                  <NodeMiniCard key={node.node_id} node={node} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* ================================================================== */}
      {/* FOOTER INFO */}
      {/* ================================================================== */}
      <GlowCard glow className="p-5">
        <div className="flex items-start gap-4">
          <div 
            className="p-3 rounded-xl"
            style={{ background: `${COLORS.neon}20` }}
          >
            <span className="text-2xl">🔬</span>
          </div>
          <div>
            <h3 style={{ color: COLORS.neon }} className="font-bold mb-1">
              ChutneX Forensic Analysis
            </h3>
            <p style={{ color: COLORS.textMuted }} className="text-sm">
              {t('analytics.forensicInfo', 'All data collected via Tor Control Port (stem library). Traffic stays 100% within your private network - no external connections. This dashboard provides real-time forensic visibility into your isolated Tor infrastructure.')}
            </p>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}
