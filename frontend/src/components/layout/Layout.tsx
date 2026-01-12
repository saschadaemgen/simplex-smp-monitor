import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import MiniPlayer from '../music/MiniPlayer';
import FloatingVideoWidget from '../music/FloatingVideoWidget';
import { useVideoWidget } from '../../contexts/VideoWidgetContext';

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { widget, closeVideo } = useVideoWidget();
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Footer Animation State
  const [footerIndex, setFooterIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const footerItems = [
    t('footer.copyright'),
    'i(N) cod(E) w(E) trus(T)',
    `Version ${t('footer.version')}`,
  ];

  // Neon Blue
  const neonBlue = '#88CED0';

  // Footer Rotation alle 10 Sekunden
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setFooterIndex((prev) => (prev + 1) % footerItems.length);
        setIsAnimating(false);
      }, 300);
    }, 10000);

    return () => clearInterval(interval);
  }, [footerItems.length]);

  // Dark Mode Effect
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // GitHub Link Handler
  const handleFooterClick = () => {
    window.open('https://github.com/cannatoshi/simplex-smp-monitor', '_blank', 'noopener,noreferrer');
  };

  // Top Navigation Items
  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/servers', label: t('nav.servers') },
    { to: '/clients', label: t('nav.clients') },
    { to: '/tor-networks', label: t('nav.chutney') },
    { to: '/diagnostics', label: t('nav.diagnostics') },
    { to: '/traffic', label: t('nav.traffic') },
    { to: '/forensics', label: t('nav.forensics') },
    { to: '/metrics', label: t('nav.metrics') },
    { to: '/events', label: t('nav.events') },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Left Sidebar */}
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />

      {/* Main Area */}
      <div className="ml-16 flex flex-col h-screen">
        {/* Top Toolbar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Left: Logo & Live Status - NEON BLUE */}
            <div className="flex items-center gap-3">
              {/* Logo Text - NEON BLUE */}
              <span 
                className="text-lg font-bold"
                style={{ color: neonBlue }}
              >
                SimpleX SMP Monitor
              </span>
              
              {/* LIVE Badge - NEON BLUE */}
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="relative w-10 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ 
                      width: '100%',
                      backgroundColor: neonBlue,
                      boxShadow: `0 0 6px ${neonBlue}`
                    }}
                  />
                  <div 
                    className="absolute inset-y-0 w-3 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full"
                    style={{
                      animation: 'scan 1.5s ease-in-out infinite'
                    }}
                  />
                </div>
                <span 
                  className="text-xs font-semibold tracking-wider"
                  style={{ 
                    color: neonBlue,
                    textShadow: `0 0 6px rgba(136, 206, 208, 0.6)`
                  }}
                >
                  LIVE
                </span>
              </div>
            </div>

            {/* Right: Navigation Menu - NEON BLUE */}
            <nav className="flex items-center">
              {navItems.map((item, index) => {
                const active = isActive(item.to);
                const isLast = index === navItems.length - 1;
                return (
                  <div key={item.to} className="flex items-center">
                    <NavLink
                      to={item.to}
                      className="relative group px-3 py-2"
                    >
                      <span 
                        className="text-sm font-medium transition-colors"
                        style={{ 
                          color: active ? neonBlue : undefined,
                          opacity: active ? 1 : 0.6
                        }}
                      >
                        <span className={active ? '' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}>
                          {!active && item.label}
                        </span>
                        {active && item.label}
                      </span>
                      
                      {/* Unterstrich-Effekt - NEON BLUE */}
                      <div 
                        className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full transition-all duration-300 ${
                          active 
                            ? 'opacity-100 scale-x-100' 
                            : 'opacity-0 scale-x-0 group-hover:opacity-50 group-hover:scale-x-100'
                        }`} 
                        style={{ 
                          backgroundColor: neonBlue,
                          transformOrigin: 'center' 
                        }} 
                      />
                    </NavLink>
                    
                    {/* Horizontaler Trennstrich */}
                    {!isLast && (
                      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main Content - Fixed height, scrollable */}
        <main className="flex-1 p-6 overflow-auto min-h-0">
          <Outlet />
        </main>

        {/* Footer - NEON BLUE */}
        <footer className="h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 overflow-hidden">
          {/* MiniPlayer (left side) */}
          <div className="flex-1">
            <MiniPlayer />
          </div>
          
          {/* Rotating Text (right side) - CLICKABLE */}
          <div 
            onClick={handleFooterClick}
            className={`text-xs font-mono transition-all duration-300 ease-in-out flex-shrink-0 ml-4 cursor-pointer hover:opacity-80 ${
              isAnimating 
                ? 'translate-x-8 opacity-0' 
                : 'translate-x-0 opacity-100'
            }`}
            style={{ color: neonBlue }}
            title="View on GitHub"
          >
            {footerItems[footerIndex]}
          </div>
        </footer>
      </div>

      {/* Floating Video Widget - Persistent across navigation */}
      <FloatingVideoWidget
        isOpen={widget.isOpen}
        onClose={closeVideo}
        videoId={widget.videoId}
        title={widget.title}
      />

      {/* Global Styles */}
      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}