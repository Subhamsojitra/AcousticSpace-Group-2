import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="p-4 rounded-full bg-cyber-rose-glow border border-cyber-rose/30 text-cyber-rose mb-6 animate-bounce glow-shadow-rose">
        <ShieldAlert size={48} />
      </div>
      
      <h1 className="font-display text-6xl font-black text-slate-100 mb-2">404</h1>
      <h2 className="text-xl font-mono text-cyber-rose uppercase tracking-widest mb-6">
        ROUTE ACCESS RESTRICTED / INVALID SIGNATURE
      </h2>
      
      <p className="text-slate-400 max-w-md text-sm mb-8 leading-relaxed font-mono">
        The requested path does not exist on this node. The address has been logged and reported to the system administrator.
      </p>

      <Link
        to="/"
        className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-cyber-black bg-cyber-cyan hover:bg-cyan-400 active:scale-95 transition-all rounded-lg font-mono font-bold shadow-lg shadow-cyber-cyan/20"
      >
        <ArrowLeft size={16} />
        RETURN TO DASHBOARD NODE
      </Link>
    </div>
  );
}
