import React from 'react';

/**
 * Reusable InfoRow component for showing label-value pairs.
 * Supports standard inline flex row styling and grid-card styling.
 * 
 * @param {Object} props
 * @param {string} props.label - Label to display
 * @param {string|number} props.value - Value to display
 * @param {string} [props.variant='row'] - Visual variant: 'row' (default inline flex) or 'card' (grid-item box)
 * @param {string} [props.labelClassName=''] - Custom styling for label
 * @param {string} [props.valueClassName=''] - Custom styling for value
 * @param {string} [props.className=''] - Custom styling for container
 */
export default function InfoRow({
  label,
  value,
  variant = 'row',
  labelClassName = '',
  valueClassName = '',
  className = '',
}) {
  if (variant === 'card') {
    return (
      <div className={`p-3 bg-slate-950/40 border border-cyber-border/50 rounded-lg font-mono ${className}`}>
        <span className={`text-[10px] text-slate-500 uppercase block mb-1 tracking-wider ${labelClassName}`}>
          {label}
        </span>
        <span className={`text-slate-200 font-semibold text-xs ${valueClassName}`}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between font-mono text-xs ${className}`}>
      <span className={`text-slate-500 ${labelClassName}`}>{label}</span>
      <span className={`text-slate-400 font-medium ${valueClassName}`}>{value}</span>
    </div>
  );
}
