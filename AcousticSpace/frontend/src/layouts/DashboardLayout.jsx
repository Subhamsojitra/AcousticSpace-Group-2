import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  History, 
  Terminal, 
  Database, 
  Radio,
  Cpu as CpuIcon,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const NAV_GROUPS = [
  {
    title: 'Console Gateways',
    items: [
      { name: 'Acoustic Console', path: '/', icon: Activity },
      { name: 'Analysis History', path: '/history', icon: History }
    ]
  },
  {
    title: 'Documentation',
    items: [
      { name: 'Model Specifications', path: '/model-info', icon: CpuIcon },
      { name: 'Inference Pipeline', path: '/pipeline-info', icon: Terminal }
    ]
  }
];

const THEMES = ['system', 'light', 'dark'];

export default function DashboardLayout({ children, apiStatus = 'checking', latency = null, backendVersion = null }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  const handleToggleTheme = () => {
    const nextIdx = (THEMES.indexOf(theme) + 1) % THEMES.length;
    const nextTheme = THEMES[nextIdx];
    setTheme(nextTheme);
    addToast(`Theme switched to ${nextTheme.toUpperCase()}`, 'success');
  };

  return (
    <div className="flex h-screen bg-cyber-black text-text-primary overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-cyber-dark backdrop-blur-xl border-r border-cyber-border flex flex-col z-20">
        {/* Brand Logo */}
        <div className="p-6 border-b border-cyber-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 border border-cyber-border text-text-primary">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyber-cyan">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M8 11v2" />
              <path d="M10 9v6" />
              <path d="M12 7v10" />
              <path d="M14 9v6" />
              <path d="M16 11v2" />
            </svg>
          </div>
          <div>
            <h1 className="font-display font-bold text-[14px] leading-tight tracking-tight text-text-primary uppercase">
              ACOUSTIC<span className="text-zinc-500 font-medium">SPACE</span>
            </h1>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
              RIR Forensic Console
            </p>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <h3 className="px-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-medium rounded-lg transition-all duration-300 relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyber-cyan/50 ${
                        isActive 
                          ? 'bg-white/5 text-text-primary border border-cyber-border shadow-sm font-semibold' 
                          : 'text-zinc-400 hover:text-text-primary hover:bg-white/[0.015] border border-transparent'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-cyber-cyan"></span>
                      )}
                      <Icon size={14} className={isActive ? 'text-cyber-cyan' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors duration-300'} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* System Diagnostics Box */}
        <div className="p-4 border-t border-cyber-border bg-white/[0.01]">
          <h3 className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-3">
            SYSTEM DIAGNOSTICS
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Radio 
                  size={11} 
                  className={
                    apiStatus === 'online' 
                      ? 'text-cyber-green animate-pulse' 
                      : apiStatus === 'checking' 
                        ? 'text-cyber-cyan animate-pulse' 
                        : 'text-cyber-rose animate-pulse'
                  } 
                />
                API GATEWAY
              </span>
              <span className={`font-semibold ${
                apiStatus === 'online' 
                  ? 'text-cyber-green' 
                  : apiStatus === 'checking' 
                    ? 'text-cyber-cyan' 
                    : 'text-cyber-rose'
              }`}>
                {apiStatus === 'online' 
                  ? 'ONLINE' 
                  : apiStatus === 'checking' 
                    ? 'PROBING' 
                    : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <CpuIcon 
                  size={11} 
                  className={apiStatus === 'online' ? 'text-cyber-green' : 'text-zinc-700'} 
                />
                SYSTEM VERSION
              </span>
              <span className={`font-semibold ${apiStatus === 'online' ? 'text-cyber-green' : 'text-zinc-500'}`}>
                {apiStatus === 'online' ? (backendVersion || '1.0.0') : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Database size={11} className={apiStatus === 'online' ? 'text-cyber-cyan' : 'text-zinc-700'} />
                LATENCY
              </span>
              <span className={`font-semibold ${apiStatus === 'online' ? 'text-cyber-cyan' : 'text-zinc-500'}`}>
                {latency !== null ? `${latency} ms` : '— ms'}
              </span>
            </div>
          </div>
        </div>

        {/* Console Mode / Theme Settings */}
        <div className="p-4 border-t border-cyber-border bg-white/[0.01] flex items-center justify-between">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
            CONSOLE MODE
          </span>
          <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-white/5 border border-cyber-border/40 hover:border-cyber-border/80 transition-all duration-300">
            <button
              onClick={handleToggleTheme}
              className="theme-toggle-btn h-7 px-3 rounded-md text-text-primary cursor-pointer flex items-center gap-2 relative overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyber-cyan/50 hover:bg-white/5 active:scale-95 transition-all duration-200"
              title={`Theme: ${theme.toUpperCase()} (Click to cycle)`}
              aria-label={`Switch theme (current: ${theme})`}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center relative shrink-0">
                <Sun 
                  size={13} 
                  className="absolute transition-all duration-500 text-amber-500" 
                  style={{
                    opacity: theme === 'light' ? 1 : 0,
                    transform: theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0)',
                  }}
                />
                <Moon 
                  size={13} 
                  className="absolute transition-all duration-500 text-cyber-cyan" 
                  style={{
                    opacity: theme === 'dark' ? 1 : 0,
                    transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)',
                  }}
                />
                <Laptop 
                  size={13} 
                  className="absolute transition-all duration-500 text-zinc-400" 
                  style={{
                    opacity: theme === 'system' ? 1 : 0,
                    transform: theme === 'system' ? 'scale(1)' : 'scale(0)',
                  }}
                />
              </div>
              <span className="text-[10px] font-mono font-medium text-text-secondary uppercase tracking-wider select-none">
                {theme}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Panel */}
        <header className="h-14 bg-cyber-dark backdrop-blur-xl border-b border-cyber-border flex items-center justify-between px-8 z-10">
          <div></div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-white/5 border border-cyber-border">
              <span className="text-[10px] font-mono text-text-secondary font-normal">
                Threat Level:
              </span>
              <span className="text-[10px] font-mono font-bold text-cyber-rose uppercase tracking-wider">
                Elevated
              </span>
            </div>
          </div>
        </header>

        {/* Router Render Outlet */}
        <main className="flex-1 overflow-y-auto bg-cyber-black p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

