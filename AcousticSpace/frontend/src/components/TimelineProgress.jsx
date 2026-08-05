import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const HORIZONTAL_STAGES = [
  { id: 'upload', label: 'Upload' },
  { id: 'validation', label: 'Validation' },
  { id: 'preprocessing', label: 'Pre-processing' },
  { id: 'rir', label: 'RIR Extraction' },
  { id: 'breathing', label: 'Breathing' },
  { id: 'prediction', label: 'Prediction' },
  { id: 'completed', label: 'Completed' }
];

function TimelineProgress({ stage, error = null }) {
  // Map current execute stage to horizontal node index
  // stage: 'idle' | 'uploading' | 'extracting' | 'predicting' | 'completed' | 'failed'
  const getStageStates = () => {
    let activeIdx = -1;
    let failedIdx = -1;
    
    if (stage === 'idle') {
      activeIdx = 1; // Validation is pending/active
    } else if (stage === 'uploading') {
      activeIdx = 0; // Upload is active
    } else if (stage === 'extracting') {
      activeIdx = 3; // RIR Extraction active. Upload (0), Validation (1), Pre-processing (2) done.
    } else if (stage === 'predicting') {
      activeIdx = 5; // Prediction active. Pre-processing, RIR, Breathing (4) done.
    } else if (stage === 'completed') {
      activeIdx = 6; // All completed
    } else if (stage === 'failed') {
      failedIdx = 3; // Default failed point
      if (error) {
        const errLower = error.toLowerCase();
        if (errLower.includes('upload')) failedIdx = 0;
        else if (errLower.includes('validation') || errLower.includes('size')) failedIdx = 1;
        else if (errLower.includes('extract') || errLower.includes('librosa')) failedIdx = 2;
        else if (errLower.includes('rir')) failedIdx = 3;
        else if (errLower.includes('breath')) failedIdx = 4;
        else if (errLower.includes('predict') || errLower.includes('ast')) failedIdx = 5;
      }
    }

    return { activeIdx, failedIdx };
  };

  const { activeIdx, failedIdx } = getStageStates();

  const getProgressLineWidth = (actIdx, failIdx) => {
    const totalSegments = HORIZONTAL_STAGES.length - 1;
    let targetIdx = 0;
    if (failIdx !== -1) {
      targetIdx = failIdx;
    } else if (actIdx !== -1) {
      targetIdx = actIdx;
    }
    return (targetIdx / totalSegments) * 100;
  };

  const lineWidthPct = getProgressLineWidth(activeIdx, failedIdx);

  return (
    <div className="w-full py-4 select-none overflow-x-auto no-scrollbar">
      <div className="flex items-center justify-between min-w-[680px] relative px-6">
        
        {/* Background Line */}
        <div className="absolute top-[16px] left-[55px] right-[55px] h-[2px] bg-cyber-border/30 z-0"></div>

        {/* Active Progress Line */}
        <div 
          className="absolute top-[16px] left-[55px] h-[2px] bg-gradient-to-r from-cyber-cyan to-cyber-cyan transition-all duration-700 ease-out z-0"
          style={{ width: `calc(${lineWidthPct}% - 10px)` }}
        ></div>

        {HORIZONTAL_STAGES.map((item, index) => {
          let state = 'pending'; // pending | active | completed | failed
          
          if (failedIdx !== -1) {
            if (index < failedIdx) state = 'completed';
            else if (index === failedIdx) state = 'failed';
            else state = 'pending';
          } else if (activeIdx !== -1) {
            if (index < activeIdx) state = 'completed';
            else if (index === activeIdx) state = 'active';
            else state = 'pending';
          }

          // Render proper circle styles based on state
          let circleContent = null;
          let labelColor = 'text-text-secondary';
          let borderGlow = 'border-cyber-border/40 bg-cyber-dark';

          if (state === 'completed') {
            circleContent = <CheckCircle2 size={12} className="text-cyber-green" />;
            labelColor = 'text-cyber-green';
            borderGlow = 'border-cyber-green bg-cyber-green/5 shadow-[0_0_10px_rgba(48,209,88,0.15)]';
          } else if (state === 'active') {
            circleContent = <div className="h-2 w-2 rounded-full bg-cyber-cyan animate-pulse"></div>;
            labelColor = 'text-cyber-cyan font-semibold';
            borderGlow = 'border-cyber-cyan bg-cyber-cyan/10 shadow-[0_0_15px_rgba(0,194,255,0.35)] animate-pulse';
          } else if (state === 'failed') {
            circleContent = <AlertCircle size={12} className="text-cyber-rose animate-bounce" />;
            labelColor = 'text-cyber-rose font-semibold';
            borderGlow = 'border-cyber-rose bg-cyber-rose/5 shadow-[0_0_15px_rgba(255,69,58,0.25)]';
          } else {
            // Pending State
            circleContent = <div className="h-1.5 w-1.5 rounded-full bg-zinc-700"></div>;
            borderGlow = 'border-zinc-800 bg-cyber-dark';
          }

          return (
            <div key={item.id} className="flex flex-col items-center space-y-3 z-10 w-20 text-center relative">
              {/* Step circle node */}
              <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all duration-500 ${borderGlow}`}>
                {circleContent}
              </div>

              {/* Step node label */}
              <span className={`text-[9px] font-mono tracking-wider uppercase leading-tight block select-none ${labelColor}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(TimelineProgress);
