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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300 animate-fadeIn">
      <div className="w-full max-w-md bg-cyber-dark backdrop-blur-xl border border-cyber-border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="relative border-b border-cyber-border p-5 flex items-center gap-3">
          <div className="scanner-line"></div>
          
          <div className="p-2 rounded-lg bg-white/5 border border-cyber-border text-text-primary animate-pulse">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs text-text-primary uppercase tracking-widest">
              Forensic Scan In Progress
            </h3>
            <p className="text-[9px] text-text-secondary font-mono uppercase tracking-wider mt-0.5 animate-pulse">
              Running De-noising & Synthesis Classifier
            </p>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-6">
          <AnalysisProgress currentStage={stage} error={error} />
          
          <div className="p-3 bg-white/[0.01] border border-cyber-border rounded-xl text-text-secondary font-mono text-[9px] leading-relaxed text-center">
            Dashboard upload gateway & controls are locked during execution cycle.
          </div>
        </div>
      </div>
    </div>
  );
}
