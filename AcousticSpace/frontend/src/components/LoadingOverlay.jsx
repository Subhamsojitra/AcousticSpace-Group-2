import React from 'react';
import { ShieldAlert } from 'lucide-react';
import AnalysisProgress from './AnalysisProgress';

/**
 * Reusable LoadingOverlay component.
 * Blocks dashboard user interaction with a high-fidelity glassmorphism overlay.
 * Renders the step-by-step progress visual indicator.
 * 
 * @param {Object} props
 * @param {string} props.stage - The current stage ('idle' | 'uploading' | 'extracting' | 'predicting' | 'completed' | 'failed')
 * @param {boolean|string} [props.error] - Current error status of the running pipeline
 */
export default function LoadingOverlay({ stage, error = null }) {
  if (!stage || stage === 'completed' || stage === 'idle' || stage === 'failed') return null;

  return (
    <div className="fixed inset-0 bg-cyber-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300 animate-fadeIn">
      <div className="w-full max-w-md bg-cyber-dark border border-cyber-cyan/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all duration-300">
        
        {/* Header */}
        <div className="relative border-b border-cyber-border p-5 flex items-center gap-3">
          <div className="scanner-line"></div>
          
          <div className="p-2 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan animate-pulse">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-slate-100 uppercase tracking-widest">
              Forensic Scan In Progress
            </h3>
            <p className="text-[10px] text-cyber-cyan font-mono uppercase tracking-widest mt-0.5 animate-pulse">
              Running De-noising & Synthesis Classifier
            </p>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-6">
          <AnalysisProgress currentStage={stage} error={error} />
          
          <div className="p-3 bg-slate-950/60 border border-cyber-border rounded-lg text-slate-400 font-mono text-[10px] leading-relaxed text-center">
            Dashboard upload gateway & controls are locked during execution cycle.
          </div>
        </div>
      </div>
    </div>
  );
}
