import React from 'react';

/**
 * Reusable StatusBadge component.
 * Renders a cyberpunk themed badge for various statuses.
 * 
 * @param {Object} props
 * @param {string} props.status - The status value (e.g. 'online', 'offline', 'Real', 'Fake', etc.)
 * @param {string} [props.customLabel] - Optional custom display label
 */
export default function StatusBadge({ status, customLabel }) {
  const statusStr = status !== null && status !== undefined ? String(status).trim() : '';
  let text = customLabel || statusStr || '';
  let themeClass = '';
  let dotClass = '';

  const normalizedStatus = statusStr.toLowerCase();

  switch (normalizedStatus) {
    case 'online':
    case 'real':
    case 'authentic':
    case 'completed':
    case 'success':
      themeClass = 'bg-cyber-green/10 text-cyber-green border-cyber-green/30';
      dotClass = 'bg-cyber-green animate-pulse';
      if (!customLabel) {
        text = normalizedStatus === 'real' ? 'REAL AUDIO' : statusStr.toUpperCase();
      }
      break;
    case 'offline':
    case 'fake':
    case 'suspicious':
    case 'failed':
    case 'error':
      themeClass = 'bg-cyber-rose/10 text-cyber-rose border-cyber-rose/30';
      dotClass = 'bg-cyber-rose animate-pulse';
      if (!customLabel) {
        text = normalizedStatus === 'fake' ? 'DEEPFAKE' : statusStr.toUpperCase();
      }
      break;
    case 'probing':
    case 'checking':
    case 'uploading':
    case 'extracting':
    case 'predicting':
    case 'analyzing':
      themeClass = 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30';
      dotClass = 'bg-cyber-cyan animate-pulse';
      if (!customLabel) {
        text = statusStr.toUpperCase();
      }
      break;
    default:
      themeClass = 'bg-slate-900 text-slate-400 border-slate-800';
      dotClass = 'bg-slate-600';
      if (!customLabel) {
        text = statusStr ? statusStr.toUpperCase() : 'STANDBY';
      }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono font-bold tracking-wider transition-all duration-300 ${themeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{text}</span>
    </span>
  );
}
