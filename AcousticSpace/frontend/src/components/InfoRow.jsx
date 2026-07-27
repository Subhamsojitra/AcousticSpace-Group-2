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
  const displayValue = (value !== null && value !== undefined && value !== '') ? value : '—';

  if (variant === 'card') {
    return (
      <div className={`p-3 bg-white/[0.01] border border-cyber-border rounded-xl font-mono ${className}`}>
        <span className={`text-[9px] text-text-secondary uppercase block mb-0.5 tracking-wider ${labelClassName}`}>
          {label}
        </span>
        <span className={`text-text-primary font-semibold text-xs ${valueClassName}`}>
          {displayValue}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between font-mono text-[11px] ${className}`}>
      <span className={`text-text-secondary ${labelClassName}`}>{label}</span>
      <span className={`text-text-secondary font-medium ${valueClassName}`}>{displayValue}</span>
    </div>
  );
}
