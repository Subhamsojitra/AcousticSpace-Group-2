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
  Cpu as CpuIcon
} from 'lucide-react';

export default function DashboardLayout({ children, apiStatus = 'checking', latency = null }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Analysis Logs', path: '/logs', icon: History, disabled: true },
    { name: 'RIR Simulator', path: '/simulator', icon: Terminal, disabled: true },
    { name: 'Model settings', path: '/settings', icon: Settings, disabled: true },
  ];

  return (
    <div className="flex h-screen bg-cyber-black text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-cyber-dark border-r border-cyber-border flex flex-col z-20">
        {/* Brand Logo */}
        <div className="p-6 border-b border-cyber-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyber-cyan-glow border border-cyber-cyan/30 text-cyber-cyan glow-shadow-cyan">
            <ShieldAlert size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight tracking-wider text-slate-100">
              ACOUSTIC<span className="text-cyber-cyan">SPACE</span>
            </h1>
            <p className="text-[10px] text-cyber-cyan font-mono uppercase tracking-widest">
              RIR Deepfake Scanner
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
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 cursor-not-allowed rounded-lg transition-all group"
                  title="Under construction - Phase 2"
                >
                  <Icon size={18} className="text-slate-700" />
                  <span>{item.name}</span>
                  <span className="ml-auto text-[9px] font-mono border border-slate-800 bg-slate-950 px-1 py-0.5 rounded text-slate-600">
                    LOCK
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-cyber-cyan-glow text-cyber-cyan border border-cyber-cyan/20 glow-shadow-cyan' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/55 border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-cyber-cyan' : 'text-slate-400 group-hover:text-cyber-cyan transition-colors'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* System Diagnostics Box */}
        <div className="p-4 border-t border-cyber-border bg-slate-950/40">
          <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3">
            SYSTEM DIAGNOSTICS
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Radio 
                  size={12} 
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
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 flex items-center gap-1.5">
                <CpuIcon 
                  size={12} 
                  className={apiStatus === 'online' ? 'text-cyber-green' : 'text-slate-600'} 
                />
                AST MODEL v2.4
              </span>
              <span className={`font-semibold ${apiStatus === 'online' ? 'text-cyber-green' : 'text-slate-500'}`}>
                {apiStatus === 'online' ? 'READY' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Database size={12} className={apiStatus === 'online' ? 'text-cyber-cyan' : 'text-slate-600'} />
                LATENCY
              </span>
              <span className={`font-semibold ${apiStatus === 'online' ? 'text-cyber-cyan' : 'text-slate-500'}`}>
                {latency !== null ? `${latency} ms` : '— ms'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Panel */}
        <header className="h-16 bg-cyber-dark border-b border-cyber-border flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-ping"></div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              Secured Node Channel 09
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-cyber-border">
              <span className="text-xs font-mono text-slate-400">
                Threat Level:
              </span>
              <span className="text-xs font-mono font-bold text-cyber-rose uppercase tracking-wide">
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
