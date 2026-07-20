import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

/**
 * Reusable ErrorAlert component.
 * Renders a cyberpunk-themed error warning card.
 * 
 * @param {Object} props
 * @param {string} props.message - Detailed error message to show
 * @param {function} [props.onRetry] - Optional retry handler callback
 * @param {string} [props.title] - Optional header title
 */
export default function ErrorAlert({ message, onRetry, title = "SYSTEM ERROR" }) {
  return (
    <div className="flex flex-col md:flex-row items-start justify-between gap-4 p-5 bg-cyber-rose/10 border border-cyber-rose/30 rounded-xl text-slate-200 animate-fadeIn glow-shadow-rose">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-cyber-rose/10 border border-cyber-rose/30 rounded-lg text-cyber-rose">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-mono font-bold text-cyber-rose uppercase tracking-widest">
            {title}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            {message || "An unexpected error occurred during audio classification."}
          </p>
        </div>
      </div>
      
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-cyber-rose/25 hover:bg-cyber-rose/35 border border-cyber-rose/40 hover:border-cyber-rose/60 text-slate-200 hover:text-slate-100 font-mono text-xs font-bold rounded-lg transition-all cursor-pointer uppercase tracking-wider shrink-0 w-full md:w-auto justify-center"
        >
          <RefreshCw size={14} />
          <span>Retry Analysis</span>
        </button>
      )}
    </div>
  );
}
