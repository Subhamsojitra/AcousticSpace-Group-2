import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

/**
 * Reusable AnalysisProgress component.
 * Renders a high-fidelity visual tracker representing the analysis workflow stages.
 * 
 * @param {Object} props
 * @param {string} props.currentStage - The current stage ('uploading', 'extracting', 'detecting', 'generating', 'completed', 'failed')
 * @param {boolean|string} [props.error] - If the pipeline encountered an error
 */
export default function AnalysisProgress({ currentStage, error = null }) {
  const stages = [
    { id: 'uploading', label: 'Uploading Audio', description: 'Transmitting payload to secure gateway' },
    { id: 'extracting', label: 'Extracting Acoustic Features', description: 'Calculating Room Impulse Response metrics' },
    { id: 'detecting', label: 'Running Deepfake Detection', description: 'AST model classification inference' },
    { id: 'generating', label: 'Generating Final Report', description: 'Compiling spectral anomaly signatures' },
  ];

  const getStageIndex = (stageId) => {
    return stages.findIndex(s => s.id === stageId);
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="space-y-4 py-2">
      {stages.map((stage, index) => {
        const isCompleted = currentIndex > index && !error;
        const isActive = currentIndex === index && !error;
        const isFailed = currentIndex === index && error;

        let icon = <Circle size={18} className="text-slate-700" />;
        let statusColor = 'text-slate-500';
        let borderColor = 'border-slate-800';
        let bgGlow = 'bg-slate-950/20';

        if (isCompleted) {
          icon = <CheckCircle2 size={18} className="text-cyber-green" />;
          statusColor = 'text-slate-300';
          borderColor = 'border-cyber-green/20';
          bgGlow = 'bg-cyber-green/5';
        } else if (isActive) {
          icon = <Loader2 size={18} className="text-cyber-cyan animate-spin" />;
          statusColor = 'text-slate-100 font-semibold';
          borderColor = 'border-cyber-cyan/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]';
          bgGlow = 'bg-cyber-cyan/5';
        } else if (isFailed) {
          icon = <AlertCircle size={18} className="text-cyber-rose" />;
          statusColor = 'text-cyber-rose font-semibold';
          borderColor = 'border-cyber-rose/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]';
          bgGlow = 'bg-cyber-rose/5';
        }

        return (
          <div
            key={stage.id}
            className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-500 ${borderColor} ${bgGlow}`}
          >
            <div className="mt-0.5 shrink-0">
              {icon}
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-mono tracking-wide uppercase ${statusColor}`}>
                  {stage.label}
                </h4>
                {isActive && (
                  <span className="text-[9px] font-mono text-cyber-cyan animate-pulse uppercase">
                    ACTIVE
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[9px] font-mono text-cyber-green uppercase">
                    DONE
                  </span>
                )}
                {isFailed && (
                  <span className="text-[9px] font-mono text-cyber-rose uppercase animate-pulse">
                    FAIL
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed truncate">
                {stage.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
