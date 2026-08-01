import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

const STAGES = [
  { id: 'upload', label: 'Audio Payload Upload', desc: 'Transmitting sample to forensic gateway' },
  { id: 'validation', label: 'Audio Integrity Validation', desc: 'Verifying sample rate, channels, & size' },
  { id: 'extraction', label: 'Feature Extraction', desc: 'Librosa spectrogram extraction' },
  { id: 'rir', label: 'RIR Reflection Isolation', desc: 'Measuring Room Impulse Response' },
  { id: 'breathing', label: 'Breathing Cadence Alignment', desc: 'Analyzing voice pause boundaries' },
  { id: 'ast', label: 'AST Transformer Inference', desc: 'Spectral Transformer classification weights' },
  { id: 'confidence', label: 'Confidence Score Computation', desc: 'Synthesizing probability boundaries' },
  { id: 'verdict', label: 'Generate Integrity Verdict', desc: 'Signing final authenticity verdict' }
];

function TimelineProgress({ stage, error = null }) {
  // Map current execute stage to current index
  // stage: 'idle' | 'uploading' | 'extracting' | 'predicting' | 'completed' | 'failed'
  const getStageStates = () => {
    let activeIdx = -1;
    let failedIdx = -1;
    
    if (stage === 'uploading') {
      activeIdx = 0; // Upload
    } else if (stage === 'extracting') {
      activeIdx = 2; // Feature Extraction is active. Upload (0) & Validation (1) are done.
    } else if (stage === 'predicting') {
      activeIdx = 5; // AST Transformer is active. Extraction (2), RIR (3), Breathing (4) are done.
    } else if (stage === 'completed') {
      activeIdx = STAGES.length; // all done
    } else if (stage === 'failed') {
      failedIdx = 0;
      if (error) {
        // Estimate failure points based on error messages or basic guess
        if (error.toLowerCase().includes('upload')) failedIdx = 0;
        else if (error.toLowerCase().includes('validation') || error.toLowerCase().includes('size')) failedIdx = 1;
        else if (error.toLowerCase().includes('extract') || error.toLowerCase().includes('librosa')) failedIdx = 2;
        else if (error.toLowerCase().includes('predict') || error.toLowerCase().includes('ast')) failedIdx = 5;
        else failedIdx = 0;
      }
    }

    return { activeIdx, failedIdx };
  };

  const { activeIdx, failedIdx } = getStageStates();

  return (
    <div className="space-y-5 py-3">
      <div className="relative pl-6 space-y-6">
        {/* Vertical tracking line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-[1px] bg-cyber-border/40"></div>

        {STAGES.map((item, index) => {
          let state = 'pending'; // pending | active | completed | failed
          
          if (failedIdx !== -1) {
            if (index < failedIdx) state = 'completed';
            else if (index === failedIdx) state = 'failed';
            else state = 'pending';
          } else if (activeIdx !== -1) {
            if (index < activeIdx) state = 'completed';
            else if (index === activeIdx) state = 'active';
            // Custom detail: when activeIdx is 2 (extracting), stages 2, 3, and 4 are shown in progress sequentially.
            // When activeIdx is 5 (predicting), stages 5 and 6 are active sequentially.
            else if (activeIdx === 2 && (index === 3 || index === 4)) state = 'active';
            else if (activeIdx === 5 && index === 6) state = 'active';
            else state = 'pending';
          }

          let icon = <Circle size={14} className="text-zinc-700 bg-cyber-black shrink-0 z-10" />;
          let textClass = 'text-text-secondary';
          let bgClass = 'bg-transparent border-transparent';

          if (state === 'completed') {
            icon = <CheckCircle2 size={14} className="text-cyber-green bg-cyber-black shrink-0 z-10" />;
            textClass = 'text-text-primary';
          } else if (state === 'active') {
            icon = <Loader2 size={14} className="text-cyber-cyan animate-spin bg-cyber-black shrink-0 z-10" />;
            textClass = 'text-text-primary font-medium';
            bgClass = 'bg-white/5 border-cyber-border/60 shadow-sm';
          } else if (state === 'failed') {
            icon = <AlertCircle size={14} className="text-cyber-rose bg-cyber-black shrink-0 z-10" />;
            textClass = 'text-cyber-rose font-medium';
            bgClass = 'bg-cyber-rose/5 border-cyber-rose/25';
          }

          return (
            <div
              key={item.id}
              className={`flex items-start gap-4 p-4 px-5 rounded-2xl border transition-all duration-300 ${bgClass}`}
            >
              <div className="mt-0.5 relative flex items-center justify-center">
                {icon}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-[10px] font-mono tracking-wider uppercase leading-none ${textClass}`}>
                    {item.label}
                  </h4>
                  {state === 'active' && (
                    <span className="text-[7px] font-mono text-cyber-cyan animate-pulse uppercase font-semibold">
                      PROCESSING
                    </span>
                  )}
                  {state === 'completed' && (
                    <span className="text-[7px] font-mono text-cyber-green uppercase font-semibold">
                      DONE
                    </span>
                  )}
                  {state === 'failed' && (
                    <span className="text-[7px] font-mono text-cyber-rose uppercase animate-pulse font-semibold">
                      FAIL
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-text-secondary font-mono leading-normal truncate mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(TimelineProgress);
