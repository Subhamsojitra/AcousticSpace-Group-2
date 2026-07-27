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
    { id: 'predicting', label: 'Running Deepfake Detection', description: 'AST model classification inference' },
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

        let icon = <Circle size={16} className="text-zinc-700" />;
        let statusColor = 'text-text-secondary';
        let borderColor = 'border-cyber-border';
        let bgGlow = 'bg-white/[0.01]';

        if (isCompleted) {
          icon = <CheckCircle2 size={16} className="text-cyber-green" />;
          statusColor = 'text-text-primary';
          borderColor = 'border-cyber-border';
          bgGlow = 'bg-white/[0.01]';
        } else if (isActive) {
          icon = <Loader2 size={16} className="text-cyber-cyan animate-spin" />;
          statusColor = 'text-text-primary font-semibold';
          borderColor = 'border-cyber-border shadow-sm';
          bgGlow = 'bg-white/5';
        } else if (isFailed) {
          icon = <AlertCircle size={16} className="text-cyber-rose" />;
          statusColor = 'text-cyber-rose font-semibold';
          borderColor = 'border-cyber-rose/20';
          bgGlow = 'bg-white/[0.01]';
        }

        return (
          <div
            key={stage.id}
            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-500 ${borderColor} ${bgGlow}`}
          >
            <div className="mt-0.5 shrink-0">
              {icon}
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`text-[11px] font-mono tracking-wide uppercase ${statusColor}`}>
                  {stage.label}
                </h4>
                {isActive && (
                  <span className="text-[8px] font-mono text-cyber-cyan animate-pulse uppercase">
                    ACTIVE
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[8px] font-mono text-cyber-green uppercase">
                    DONE
                  </span>
                )}
                {isFailed && (
                  <span className="text-[8px] font-mono text-cyber-rose uppercase animate-pulse">
                    FAIL
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-secondary font-mono leading-normal truncate">
                {stage.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
