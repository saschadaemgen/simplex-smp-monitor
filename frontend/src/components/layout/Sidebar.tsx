import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LanguageCode } from '../../i18n/config';

interface SidebarProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export default function Sidebar({ darkMode, setDarkMode }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [langOpen, setLangOpen] = useState(false);

  const navItems = [
    { 
      to: '/dashboard', 
      label: t('nav.dashboard'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    { 
      to: '/music', 
      label: t('nav.music'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
    },
    { 
      to: '/cache-forensics', 
      label: t('nav.cacheForensics'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
    },
    {
      to: '/docker',
      label: t('nav.docker'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const currentLang = LANGUAGES[i18n.language as LanguageCode] || LANGUAGES.en;

  const neonBlue = '#88CED0';
  const neonGlow = '0 0 8px rgba(136, 206, 208, 0.6)';

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50">
      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b border-slate-200 dark:border-slate-800">
        <span className="text-2xl">🔍</span>
      </div>

      {/* Navigation - KEIN SCROLLBAR */}
      <nav 
        className="flex-1 py-3 flex flex-col items-center gap-0.5 overflow-y-auto"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative group w-12 h-11 flex items-center justify-center"
              title={item.label}
            >
              {active && (
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ backgroundColor: neonBlue, boxShadow: neonGlow }}
                />
              )}
              
              <div 
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  active ? 'bg-accent/20' : 'hover:bg-slate-800/50'
                }`}
                style={{ 
                  color: neonBlue,
                  filter: active ? `drop-shadow(${neonGlow})` : 'none'
                }}
              >
                {item.icon}
              </div>
              
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Hide Scrollbar CSS */}
      <style>{`
        nav::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      {/* Bottom Controls - OHNE Border */}
      <div className="py-3 flex flex-col items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="relative group w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-accent/50"
          style={{ color: neonBlue }}
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {darkMode ? (
            <svg className="w-4 h-4 transition-transform group-hover:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 transition-transform group-hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          
          <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </div>
        </button>

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="relative group w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-accent/50"
            title={currentLang.name}
          >
            {/* Flag: 2px links + 2px oben */}
            <span 
              className="text-sm font-bold absolute"
              style={{ 
                color: neonBlue,
                top: '50%',
                left: '50%',
                transform: 'translate(calc(-50% - 0px), calc(-50% - 2px))'
              }}
            >
              {currentLang.flag}
            </span>
            
            {!langOpen && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                {currentLang.name}
              </div>
            )}
          </button>
          
          {langOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setLangOpen(false)} 
              />
              <div className="absolute left-full bottom-0 ml-3 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
                {Object.entries(LANGUAGES).map(([code, meta]) => (
                  <button
                    key={code}
                    onClick={() => {
                      i18n.changeLanguage(code);
                      setLangOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                      i18n.language === code 
                        ? 'bg-accent/10 text-accent' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-base">{meta.flag}</span>
                    <span>{meta.name}</span>
                    {i18n.language === code && (
                      <svg className="w-4 h-4 ml-auto" style={{ color: neonBlue }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}