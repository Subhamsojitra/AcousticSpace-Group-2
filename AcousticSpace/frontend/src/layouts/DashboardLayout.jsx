import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  History, 
  Settings, 
  Terminal, 
  Database, 
  Radio,
  Cpu as CpuIcon,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function DashboardLayout({ children, apiStatus = 'checking', latency = null }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Analysis Logs', path: '/logs', icon: History, disabled: true },
    { name: 'RIR Simulator', path: '/simulator', icon: Terminal, disabled: true },
    { name: 'Model settings', path: '/settings', icon: Settings, disabled: true },
  ];

  const themes = ['system', 'light', 'dark'];
  const handleToggleTheme = () => {
    const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIdx]);
  };

  return (
    <div className="flex h-screen bg-cyber-black text-text-primary overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-cyber-dark backdrop-blur-xl border-r border-cyber-border flex flex-col z-20">
        {/* Brand Logo */}
        <div className="p-6 border-b border-cyber-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 border border-cyber-border text-text-primary">
            <ShieldAlert size={20} className="text-zinc-500" />
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
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-500 cursor-not-allowed rounded-lg transition-all group"
                  title="Under construction - Phase 2"
                >
                  <Icon size={16} className="text-zinc-600" />
                  <span>{item.name}</span>
                  <span className="ml-auto text-[8px] font-mono border border-cyber-border bg-white/5 px-1.5 py-0.5 rounded text-zinc-500">
                    LOCK
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 text-xs font-medium rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-white/5 text-text-primary border border-cyber-border shadow-sm' 
                    : 'text-zinc-400 hover:text-text-primary hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-cyber-cyan' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
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
                AST MODEL v2.4
              </span>
              <span className={`font-semibold ${apiStatus === 'online' ? 'text-cyber-green' : 'text-zinc-500'}`}>
                {apiStatus === 'online' ? 'READY' : 'OFFLINE'}
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
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Panel */}
        <header className="h-14 bg-cyber-dark backdrop-blur-xl border-b border-cyber-border flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse"></div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Secured Node Channel 09
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Animated Theme Toggle Button */}
            <button
              onClick={handleToggleTheme}
              className="theme-toggle-btn h-8 w-8 rounded-lg bg-white/5 border border-cyber-border hover:bg-white/10 text-text-primary cursor-pointer flex items-center justify-center relative overflow-hidden"
              style={{ padding: 0 }}
              title={`Theme: ${theme.toUpperCase()} (Click to cycle)`}
            >
              <Sun 
                size={14} 
                className="absolute transition-all duration-500 text-amber-500" 
                style={{
                  opacity: theme === 'light' ? 1 : 0,
                  transform: theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0)',
                }}
              />
              <Moon 
                size={14} 
                className="absolute transition-all duration-500 text-cyber-cyan" 
                style={{
                  opacity: theme === 'dark' ? 1 : 0,
                  transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)',
                }}
              />
              <Laptop 
                size={14} 
                className="absolute transition-all duration-500 text-zinc-400" 
                style={{
                  opacity: theme === 'system' ? 1 : 0,
                  transform: theme === 'system' ? 'scale(1)' : 'scale(0)',
                }}
              />
            </button>

            <div className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-white/5 border border-cyber-border">
              <span className="text-[10px] font-mono text-zinc-500">
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
