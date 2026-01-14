/**
 * ChutneX Mega Menu - Professional, Centered, Responsive
 * ======================================================
 * - Always centered
 * - Responsive grid (auto-fit columns)
 * - All existing components + placeholders for future
 */
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NEON = '#88CED0';

// ============================================================================
// SVG ICONS - Alle in Neon Blue
// ============================================================================
const Icon = {
  Dashboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Stats: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
  Health: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Activity: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Topology: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>,
  Consensus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Config: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Server: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill={NEON}/><circle cx="6" cy="18" r="1" fill={NEON}/></svg>,
  Shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Shuffle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>,
  Exit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Monitor: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  GitBranch: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>,
  History: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>,
  Route: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Target: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Bandwidth: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Video: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>,
  Layers: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Database: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Heatmap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Clock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Waves: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>,
  Fingerprint: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/></svg>,
  Crosshair: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
  TrendingUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  BarChart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  AlertTriangle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Box: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Calendar: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Key: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  Grid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  List: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Flag: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Share: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  ChevronUp: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  Network: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>,
};

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 56,
    left: 64,
    right: 0,
    bottom: 56,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 40,
  },
  menuContainer: {
    position: 'fixed' as const,
    top: 56,
    left: 64,
    right: 0,
    zIndex: 50,
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #334155',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    maxHeight: 'calc(100vh - 112px)',
    overflowY: 'auto' as const,
    animation: 'slideDown 0.25s ease-out forwards',
    transformOrigin: 'top center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '16px 24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    marginBottom: '20px',
    borderBottom: '1px solid #1e293b',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerTextContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  headerText: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'white',
    letterSpacing: '-0.025em',
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 400,
  },
  liveBadge: {
    fontSize: '9px',
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: '4px',
    backgroundColor: 'rgba(136, 206, 208, 0.2)',
    color: '#88CED0',
    letterSpacing: '0.05em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 250px))',
    maxWidth: '1400px',
    margin: '0 auto',
    gap: '24px',
    justifyContent: 'center',
  },
  category: {
    minWidth: '180px',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '8px',
    marginBottom: '8px',
    borderBottom: '1px solid #334155',
  },
  categoryTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: NEON,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '6px',
    textDecoration: 'none',
    color: '#e2e8f0',
    fontSize: '12px',
    transition: 'all 0.15s',
    border: 'none',
    outline: 'none',
    background: 'transparent',
  },
  menuItemHover: {
    backgroundColor: 'rgba(136, 206, 208, 0.1)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(136, 206, 208, 0.15)',
    color: NEON,
  },
  menuItemDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  badge: {
    fontSize: '8px',
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: '3px',
    marginLeft: 'auto',
  },
  badgeLive: {
    backgroundColor: 'rgba(136, 206, 208, 0.3)',
    color: '#88CED0',
  },
  badgeBeta: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    color: '#c084fc',
  },
  badgePro: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    color: '#fbbf24',
  },
  badgeSoon: {
    backgroundColor: 'rgba(71, 85, 105, 0.5)',
    color: '#94a3b8',
  },
};

// ============================================================================
// MENU DATA
// ============================================================================
interface MenuItemData {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: 'LIVE' | 'BETA' | 'PRO' | 'SOON';
  disabled?: boolean;
}

interface CategoryData {
  title: string;
  icon: React.ReactNode;
  items: MenuItemData[];
}

const getMenuData = (basePath: string, networkId?: string): CategoryData[] => [
  {
    title: 'Overview',
    icon: <Icon.Dashboard />,
    items: [
      { label: 'Netzwerkliste', to: '/tor-networks', icon: <Icon.Topology />, badge: 'LIVE' },
      { label: 'Netzwerk Details', to: networkId ? `/tor-networks/${networkId}` : '/tor-networks', icon: <Icon.Server />, badge: 'LIVE' },
      { label: 'Analytics Dashboard', to: networkId ? `/tor-networks/${networkId}/analytics` : '/tor-networks', icon: <Icon.Stats />, badge: 'LIVE' },
      { label: 'Neues Netzwerk', to: '/tor-networks/new', icon: <Icon.Config />, badge: 'LIVE' },
      { label: 'Netzwerk bearbeiten', to: networkId ? `/tor-networks/${networkId}/edit` : '/tor-networks', icon: <Icon.Config />, badge: 'LIVE' },
      { label: 'Health Monitor', to: '/coming-soon', icon: <Icon.Health />, badge: 'SOON', disabled: true },
      { label: 'Activity Feed', to: '/coming-soon', icon: <Icon.Activity />, badge: 'SOON', disabled: true },
      { label: 'System Status', to: '/coming-soon', icon: <Icon.Server />, badge: 'SOON', disabled: true },
      { label: 'Quick Actions', to: '/coming-soon', icon: <Icon.Zap />, badge: 'SOON', disabled: true },
      { label: 'Getting Started', to: '/coming-soon', icon: <Icon.Flag />, badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Nodes',
    icon: <Icon.Server />,
    items: [
      { label: 'Node Grid', to: `${basePath}/nodes`, icon: <Icon.Grid />, badge: 'SOON', disabled: true },
      { label: 'Node Detail Card', to: `${basePath}/nodes/detail`, icon: <Icon.Server />, badge: 'SOON', disabled: true },
      { label: 'Node Bandwidth', to: `${basePath}/nodes/bandwidth`, icon: <Icon.Bandwidth />, badge: 'SOON', disabled: true },
      { label: 'Node Flags', to: `${basePath}/nodes/flags`, icon: <Icon.Flag />, badge: 'SOON', disabled: true },
      { label: 'Node Identity', to: `${basePath}/nodes/identity`, icon: <Icon.Key />, badge: 'SOON', disabled: true },
      { label: 'Node Ports', to: `${basePath}/nodes/ports`, icon: <Icon.Share />, badge: 'SOON', disabled: true },
      { label: 'Node Comparison', to: `${basePath}/nodes/compare`, icon: <Icon.BarChart />, badge: 'SOON', disabled: true },
      { label: 'Node History', to: `${basePath}/nodes/history`, icon: <Icon.History />, badge: 'SOON', disabled: true },
      { label: 'Node Search', to: `${basePath}/nodes/search`, icon: <Icon.Search />, badge: 'SOON', disabled: true },
      { label: 'Node Export', to: `${basePath}/nodes/export`, icon: <Icon.Download />, badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Circuits',
    icon: <Icon.GitBranch />,
    items: [
      { label: 'Circuits List', to: `${basePath}/circuits`, icon: <Icon.List />, badge: 'SOON', disabled: true },
      { label: 'Circuit Card', to: `${basePath}/circuits/card`, icon: <Icon.GitBranch />, badge: 'SOON', disabled: true },
      { label: 'Circuit Path Viz', to: `${basePath}/circuits/path`, icon: <Icon.Route />, badge: 'SOON', disabled: true },
      { label: 'Circuit Stats', to: `${basePath}/circuits/stats`, icon: <Icon.Stats />, badge: 'SOON', disabled: true },
      { label: 'Circuit Filters', to: `${basePath}/circuits/filters`, icon: <Icon.Filter />, badge: 'SOON', disabled: true },
      { label: 'Circuit Event Log', to: `${basePath}/circuits/events`, icon: <Icon.Zap />, badge: 'SOON', disabled: true },
      { label: 'Circuit Builder', to: `${basePath}/circuits/builder`, icon: <Icon.Target />, badge: 'SOON', disabled: true },
      { label: 'Circuit Timeline', to: `${basePath}/circuits/timeline`, icon: <Icon.Clock />, badge: 'SOON', disabled: true },
      { label: 'Circuit Compare', to: `${basePath}/circuits/compare`, icon: <Icon.BarChart />, badge: 'SOON', disabled: true },
      { label: 'Circuit Export', to: `${basePath}/circuits/export`, icon: <Icon.Download />, badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Traffic',
    icon: <Icon.Bandwidth />,
    items: [
      { label: 'Traffic Overview', to: `${basePath}/traffic`, icon: <Icon.TrendingUp />, badge: 'SOON', disabled: true },
      { label: 'Bandwidth Chart', to: `${basePath}/traffic/bandwidth`, icon: <Icon.BarChart />, badge: 'SOON', disabled: true },
      { label: 'Captures List', to: `${basePath}/traffic/captures`, icon: <Icon.Video />, badge: 'SOON', disabled: true },
      { label: 'Capture Card', to: `${basePath}/traffic/capture`, icon: <Icon.Video />, badge: 'SOON', disabled: true },
      { label: 'Packet Analysis', to: `${basePath}/traffic/packets`, icon: <Icon.Database />, badge: 'SOON', disabled: true },
      { label: 'Flow Analysis', to: `${basePath}/traffic/flows`, icon: <Icon.Layers />, badge: 'SOON', disabled: true },
      { label: 'Live Capture', to: `${basePath}/traffic/live`, icon: <Icon.Play />, badge: 'SOON', disabled: true },
      { label: 'Traffic Heatmap', to: `${basePath}/traffic/heatmap`, icon: <Icon.Heatmap />, badge: 'SOON', disabled: true },
      { label: 'Protocol Stats', to: `${basePath}/traffic/protocols`, icon: <Icon.Layers />, badge: 'SOON', disabled: true },
      { label: 'Traffic Export', to: `${basePath}/traffic/export`, icon: <Icon.Download />, badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Forensics',
    icon: <Icon.Search />,
    items: [
      { label: 'Forensics Overview', to: `${basePath}/forensics`, icon: <Icon.Eye />, badge: 'SOON', disabled: true },
      { label: 'Timing Correlation', to: `${basePath}/forensics/timing`, icon: <Icon.Clock />, badge: 'SOON', disabled: true },
      { label: 'Traffic Patterns', to: `${basePath}/forensics/patterns`, icon: <Icon.Waves />, badge: 'SOON', disabled: true },
      { label: 'Cell Analysis', to: `${basePath}/forensics/cells`, icon: <Icon.Layers />, badge: 'SOON', disabled: true },
      { label: 'Fingerprinting', to: `${basePath}/forensics/fingerprint`, icon: <Icon.Fingerprint />, badge: 'SOON', disabled: true },
      { label: 'Attack Detection', to: `${basePath}/forensics/attacks`, icon: <Icon.Crosshair />, badge: 'PRO', disabled: true },
      { label: 'Anomaly Scanner', to: `${basePath}/forensics/anomaly`, icon: <Icon.AlertTriangle />, badge: 'SOON', disabled: true },
      { label: 'Deep Inspection', to: `${basePath}/forensics/deep`, icon: <Icon.Search />, badge: 'PRO', disabled: true },
      { label: 'Correlation Engine', to: `${basePath}/forensics/correlation`, icon: <Icon.GitBranch />, badge: 'PRO', disabled: true },
      { label: 'Forensics Report', to: `${basePath}/forensics/report`, icon: <Icon.FileText />, badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Visualization',
    icon: <Icon.Eye />,
    items: [
      { label: 'Network Topology', to: `${basePath}/viz/topology`, icon: <Icon.Topology />, badge: 'SOON', disabled: true },
      { label: 'Circuit Flow Diagram', to: `${basePath}/viz/circuit-flow`, icon: <Icon.GitBranch />, badge: 'SOON', disabled: true },
      { label: 'Bandwidth Heatmap', to: `${basePath}/viz/heatmap`, icon: <Icon.Heatmap />, badge: 'SOON', disabled: true },
      { label: '3D Network Globe', to: `${basePath}/viz/3d`, icon: <Icon.Globe />, badge: 'SOON', disabled: true },
      { label: 'Traffic Animation', to: `${basePath}/viz/animation`, icon: <Icon.Play />, badge: 'SOON', disabled: true },
      { label: 'Timeline View', to: `${basePath}/viz/timeline`, icon: <Icon.History />, badge: 'SOON', disabled: true },
      { label: 'Geo Map', to: `${basePath}/viz/geomap`, icon: <Icon.Globe />, badge: 'SOON', disabled: true },
      { label: 'Sankey Diagram', to: `${basePath}/viz/sankey`, icon: <Icon.Layers />, badge: 'SOON', disabled: true },
      { label: 'Force Graph', to: `${basePath}/viz/force`, icon: <Icon.Share />, badge: 'SOON', disabled: true },
      { label: 'Real-time Canvas', to: `${basePath}/viz/canvas`, icon: <Icon.Play />, badge: 'PRO', disabled: true },
    ],
  },
  {
    title: 'Integration',
    icon: <Icon.Box />,
    items: [
      { label: 'Integration Hub', to: `${basePath}/integration`, icon: <Icon.Box />, badge: 'SOON', disabled: true },
      { label: 'Zeek Logs', to: `${basePath}/integration/zeek`, icon: <Icon.Search />, badge: 'SOON', disabled: true },
      { label: 'Suricata Alerts', to: `${basePath}/integration/suricata`, icon: <Icon.AlertTriangle />, badge: 'SOON', disabled: true },
      { label: 'Arkime PCAP', to: `${basePath}/integration/arkime`, icon: <Icon.Database />, badge: 'SOON', disabled: true },
      { label: 'Neo4j Graph DB', to: `${basePath}/integration/neo4j`, icon: <Icon.Share />, badge: 'SOON', disabled: true },
      { label: 'MISP Threat Intel', to: `${basePath}/integration/misp`, icon: <Icon.Shield />, badge: 'SOON', disabled: true },
      { label: 'Elasticsearch', to: `${basePath}/integration/elastic`, icon: <Icon.Search />, badge: 'SOON', disabled: true },
      { label: 'Grafana Dashboards', to: `${basePath}/integration/grafana`, icon: <Icon.BarChart />, badge: 'SOON', disabled: true },
      { label: 'Splunk SIEM', to: `${basePath}/integration/splunk`, icon: <Icon.Database />, badge: 'PRO', disabled: true },
      { label: 'Webhook API', to: `${basePath}/integration/webhooks`, icon: <Icon.Zap />, badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Reports',
    icon: <Icon.FileText />,
    items: [
      { label: 'Report Generator', to: `${basePath}/reports`, icon: <Icon.FileText />, badge: 'SOON', disabled: true },
      { label: 'Export PDF', to: `${basePath}/reports/pdf`, icon: <Icon.Download />, badge: 'SOON', disabled: true },
      { label: 'Export CSV', to: `${basePath}/reports/csv`, icon: <Icon.Download />, badge: 'SOON', disabled: true },
      { label: 'Export JSON', to: `${basePath}/reports/json`, icon: <Icon.Download />, badge: 'SOON', disabled: true },
      { label: 'Report Templates', to: `${basePath}/reports/templates`, icon: <Icon.Grid />, badge: 'SOON', disabled: true },
      { label: 'Scheduled Reports', to: `${basePath}/reports/schedule`, icon: <Icon.Calendar />, badge: 'PRO', disabled: true },
      { label: 'Email Delivery', to: `${basePath}/reports/email`, icon: <Icon.Bell />, badge: 'PRO', disabled: true },
      { label: 'Report History', to: `${basePath}/reports/history`, icon: <Icon.History />, badge: 'SOON', disabled: true },
      { label: 'Custom Branding', to: `${basePath}/reports/branding`, icon: <Icon.Flag />, badge: 'PRO', disabled: true },
      { label: 'Compliance Reports', to: `${basePath}/reports/compliance`, icon: <Icon.Shield />, badge: 'PRO', disabled: true },
    ],
  },
  {
    title: 'Analytics',
    icon: <Icon.TrendingUp />,
    items: [
      { label: 'Analytics Dashboard', to: networkId ? `/tor-networks/${networkId}/analytics` : '/tor-networks', icon: <Icon.Dashboard />, badge: 'LIVE' },
      { label: 'Real-time Metrics', to: `${basePath}/analytics/realtime`, icon: <Icon.Play />, badge: 'SOON', disabled: true },
      { label: 'Historical Data', to: `${basePath}/analytics/history`, icon: <Icon.History />, badge: 'SOON', disabled: true },
      { label: 'Trend Analysis', to: `${basePath}/analytics/trends`, icon: <Icon.TrendingUp />, badge: 'SOON', disabled: true },
      { label: 'Custom Dashboards', to: `${basePath}/analytics/custom`, icon: <Icon.Grid />, badge: 'PRO', disabled: true },
      { label: 'KPI Tracking', to: `${basePath}/analytics/kpi`, icon: <Icon.Target />, badge: 'SOON', disabled: true },
      { label: 'Predictive Analytics', to: `${basePath}/analytics/predict`, icon: <Icon.TrendingUp />, badge: 'PRO', disabled: true },
      { label: 'Data Explorer', to: `${basePath}/analytics/explorer`, icon: <Icon.Search />, badge: 'SOON', disabled: true },
      { label: 'Performance Metrics', to: `${basePath}/analytics/performance`, icon: <Icon.Activity />, badge: 'SOON', disabled: true },
      { label: 'Usage Statistics', to: `${basePath}/analytics/usage`, icon: <Icon.Stats />, badge: 'SOON', disabled: true },
    ],
  },
  {
    title: 'Settings',
    icon: <Icon.Config />,
    items: [
      { label: 'Network Settings', to: `${basePath}/settings/network`, icon: <Icon.Topology />, badge: 'SOON', disabled: true },
      { label: 'Capture Config', to: `${basePath}/settings/capture`, icon: <Icon.Video />, badge: 'SOON', disabled: true },
      { label: 'Alert Rules', to: `${basePath}/settings/alerts`, icon: <Icon.Bell />, badge: 'SOON', disabled: true },
      { label: 'API Configuration', to: `${basePath}/settings/api`, icon: <Icon.Key />, badge: 'SOON', disabled: true },
      { label: 'User Preferences', to: `${basePath}/settings/preferences`, icon: <Icon.Config />, badge: 'SOON', disabled: true },
      { label: 'Notifications', to: `${basePath}/settings/notifications`, icon: <Icon.Bell />, badge: 'SOON', disabled: true },
      { label: 'Backup & Restore', to: `${basePath}/settings/backup`, icon: <Icon.Download />, badge: 'PRO', disabled: true },
      { label: 'Access Control', to: `${basePath}/settings/access`, icon: <Icon.Shield />, badge: 'PRO', disabled: true },
      { label: 'Audit Logs', to: `${basePath}/settings/audit`, icon: <Icon.FileText />, badge: 'PRO', disabled: true },
      { label: 'System Info', to: `${basePath}/settings/system`, icon: <Icon.Server />, badge: 'SOON', disabled: true },
    ],
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

const MenuItem: React.FC<{
  item: MenuItemData;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === item.to;
  const [isHovered, setIsHovered] = React.useState(false);

  const getBadgeStyle = (badge?: string) => {
    switch (badge) {
      case 'LIVE': return { ...styles.badge, ...styles.badgeLive };
      case 'BETA': return { ...styles.badge, ...styles.badgeBeta };
      case 'PRO': return { ...styles.badge, ...styles.badgePro };
      case 'SOON': return { ...styles.badge, ...styles.badgeSoon };
      default: return styles.badge;
    }
  };

  const itemStyle = {
    ...styles.menuItem,
    ...(isActive ? styles.menuItemActive : {}),
    ...(isHovered && !isActive && !item.disabled ? styles.menuItemHover : {}),
    ...(item.disabled ? styles.menuItemDisabled : {}),
  };

  if (item.disabled) {
    return (
      <div style={itemStyle}>
        {item.icon}
        <span>{item.label}</span>
        {item.badge && <span style={getBadgeStyle(item.badge)}>{item.badge}</span>}
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onClick}
      style={itemStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {item.icon}
      <span>{item.label}</span>
      {item.badge && <span style={getBadgeStyle(item.badge)}>{item.badge}</span>}
    </Link>
  );
};

const Category: React.FC<{
  category: CategoryData;
  onItemClick: () => void;
}> = ({ category, onItemClick }) => (
  <div style={styles.category}>
    <div style={styles.categoryHeader}>
      {category.icon}
      <span style={styles.categoryTitle}>{category.title}</span>
    </div>
    <div>
      {category.items.map((item, idx) => (
        <MenuItem key={idx} item={item} onClick={onItemClick} />
      ))}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ChutneXMegaMenu: React.FC = () => {
  const { id: networkId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [networks, setNetworks] = useState<Array<{id: string, name: string}>>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>(networkId || '');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // Netzwerke laden und erstes auswählen wenn keins in URL
  useEffect(() => {
    fetch('/api/v1/chutney/networks/')
      .then(res => res.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          const networkList = data.results.map((n: any) => ({ id: n.id, name: n.name }));
          setNetworks(networkList);
          // Automatisch erstes Netzwerk auswählen wenn keins aktiv
          if (!networkId && networkList.length > 0) {
            setSelectedNetwork(networkList[0].id);
          }
        }
      })
      .catch(err => console.error('Failed to load networks:', err));
  }, [networkId]);

  // Sync selectedNetwork mit URL
  useEffect(() => {
    if (networkId) {
      setSelectedNetwork(networkId);
    }
  }, [networkId]);

  // Dropdown Animation wenn Menu öffnet
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setDropdownVisible(true), 100);
    } else {
      setDropdownVisible(false);
    }
  }, [isOpen]);

  const closeMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      setIsOpen(true);
    }
  };

  // Netzwerk wechseln - OHNE Menü zu schließen
  const handleNetworkChange = (newNetworkId: string) => {
    setSelectedNetwork(newNetworkId);
    // Navigate ohne page reload, Menü bleibt offen
    navigate(`/tor-networks/${newNetworkId}/analytics`);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeMenu();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const activeNetworkId = selectedNetwork || networkId;
  const basePath = activeNetworkId ? `/tor-networks/${activeNetworkId}/analytics` : '/tor-networks';
  const menuData = getMenuData(basePath, activeNetworkId);

  const selectedNetworkName = networks.find(n => n.id === activeNetworkId)?.name || 'Netzwerk wählen...';

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: 500,
          color: isOpen ? NEON : '#94a3b8',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
      >
        {t('nav.chutney', 'ChutneX')}
        {isOpen ? <Icon.ChevronUp /> : <Icon.ChevronDown />}
      </button>

      {isOpen && (
        <>
          <div 
            style={{
              ...styles.overlay,
              animation: isClosing ? 'fadeOut 0.2s ease-in forwards' : 'fadeIn 0.25s ease-out forwards',
            }} 
            onClick={closeMenu} 
          />

          <div 
            ref={menuRef} 
            style={{
              ...styles.menuContainer,
              animation: isClosing ? 'slideUp 0.2s ease-in forwards' : 'slideDown 0.25s ease-out forwards',
            }}
          >
            <div style={styles.innerContainer}>
              <div style={styles.header}>
                <div style={styles.headerTitle}>
                  <Icon.Topology />
                  <div style={styles.headerTextContainer}>
                    <span style={styles.headerText}>ChutneX Analytics Suite</span>
                    <span style={styles.headerSubtitle}>Echtzeit-Forensik und Datenanalyse für private Tor-Netzwerke</span>
                  </div>
                  <span style={styles.liveBadge}>LIVE</span>
                </div>
                
                {/* Network Selector mit Animation */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    opacity: dropdownVisible ? 1 : 0,
                    transform: dropdownVisible ? 'translateX(0)' : 'translateX(20px)',
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon.Network />
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Aktives Netzwerk:</span>
                  </div>
                  <select
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: NEON,
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      minWidth: '220px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    value={activeNetworkId || ''}
                    onChange={(e) => handleNetworkChange(e.target.value)}
                    onFocus={(e) => {
                      e.target.style.borderColor = NEON;
                      e.target.style.boxShadow = `0 0 0 2px ${NEON}33`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#334155';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {networks.length === 0 && <option value="">Laden...</option>}
                    {networks.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={styles.grid}>
                {menuData.map((category, idx) => (
                  <Category
                    key={idx}
                    category={category}
                    onItemClick={closeMenu}
                  />
                ))}
              </div>
            </div>
          </div>

          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideUp {
              from { opacity: 1; transform: translateY(0); }
              to { opacity: 0; transform: translateY(-20px); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
          `}</style>
        </>
      )}
    </div>
  );
};

export default ChutneXMegaMenu;
