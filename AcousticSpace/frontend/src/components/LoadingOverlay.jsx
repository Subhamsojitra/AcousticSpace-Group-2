import React from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';

const STAGE_LABELS = {
  uploading: 'Uploading Audio Payload...',
  extracting: 'Decoding Spatial Indicators...',
  predicting: 'Evaluating Neural AST Weights...',
};

function LoadingOverlay({ stage }) {
  if (!stage || stage === 'completed' || stage === 'idle' || stage === 'failed') return null;

  const currentLabel = STAGE_LABELS[stage] || 'Processing Audio Sample...';

  return (
    <div className="fixed inset-0 bg-cyber-black/25 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300 animate-fadeIn">
      <div className="w-full max-w-[280px] bg-cyber-dark/95 backdrop-blur-xl border border-cyber-border rounded-2xl overflow-hidden shadow-2xl p-6 text-center flex flex-col items-center justify-center space-y-4">
        
        {/* Shield Indicator */}
        <div className="p-3.5 rounded-full bg-cyber-cyan/5 border border-cyber-cyan/35 text-cyber-cyan shadow-sm relative">
          <ShieldAlert size={20} className="animate-pulse" />
          <span className="absolute inset-0 rounded-full border border-cyber-cyan/35 animate-ping opacity-45"></span>
        </div>

        <div>
          <h3 className="font-display font-bold text-xs text-text-primary uppercase tracking-wider">
            Forensic Scan
          </h3>
          <p className="text-[9px] text-text-secondary font-mono uppercase tracking-widest mt-0.5 animate-pulse">
            Active Inference
          </p>
        </div>

        {/* Current Stage Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-cyber-border/40 rounded-xl w-full justify-center">
          <Loader2 size={12} className="text-cyber-cyan animate-spin" />
          <span className="text-[10px] font-mono text-text-primary font-medium truncate">
            {currentLabel}
          </span>
        </div>

        <p className="text-[8px] text-text-secondary font-mono uppercase tracking-widest leading-none">
          Portal Gateway Locked
        </p>
      </div>
    </div>
  );
}

export default React.memo(LoadingOverlay);
