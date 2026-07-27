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
    <div className="flex flex-col md:flex-row items-start justify-between gap-4 p-5 bg-cyber-dark backdrop-blur-xl border border-cyber-rose/20 rounded-2xl text-text-primary animate-fadeIn shadow-lg">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-white/5 border border-cyber-rose/20 rounded-lg text-cyber-rose">
          <ShieldAlert size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-[11px] font-mono font-bold text-cyber-rose uppercase tracking-wider">
            {title}
          </h4>
          <p className="text-xs text-text-secondary leading-relaxed font-mono">
            {message || "An unexpected error occurred during audio classification."}
          </p>
        </div>
      </div>
      
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-mono text-[10px] font-semibold rounded-lg transition-all cursor-pointer uppercase tracking-wider shrink-0 w-full md:w-auto justify-center"
        >
          <RefreshCw size={12} />
          <span>Retry Analysis</span>
        </button>
      )}
    </div>
  );
}
