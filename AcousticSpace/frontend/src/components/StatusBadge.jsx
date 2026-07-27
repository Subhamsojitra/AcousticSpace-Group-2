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
      themeClass = 'bg-white/5 text-cyber-green border-white/10 shadow-sm';
      dotClass = 'bg-cyber-green';
      if (!customLabel) {
        text = normalizedStatus === 'real' ? 'REAL AUDIO' : statusStr.toUpperCase();
      }
      break;
    case 'offline':
    case 'fake':
    case 'suspicious':
    case 'failed':
    case 'error':
      themeClass = 'bg-white/5 text-cyber-rose border-white/10 shadow-sm';
      dotClass = 'bg-cyber-rose';
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
      themeClass = 'bg-white/5 text-cyber-cyan border-white/10 shadow-sm';
      dotClass = 'bg-cyber-cyan';
      if (!customLabel) {
        text = statusStr.toUpperCase();
      }
      break;
    default:
      themeClass = 'bg-white/5 text-zinc-400 border-white/5';
      dotClass = 'bg-zinc-600';
      if (!customLabel) {
        text = statusStr ? statusStr.toUpperCase() : 'STANDBY';
      }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-mono font-semibold tracking-wider transition-all duration-350 ${themeClass}`}>
      <span className={`w-1 h-1 rounded-full shrink-0 ${dotClass}`} />
      <span>{text}</span>
    </span>
  );
}
