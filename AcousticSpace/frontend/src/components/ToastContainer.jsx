import React from 'react';
import { CheckCircle, AlertCircle, Info, X, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const { resolvedTheme } = useTheme();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info size={16} className="text-cyber-cyan" />;
        let borderClass = 'border-cyber-border';
        let glowClass = 'glow-shadow-cyan';

        if (toast.type === 'success') {
          icon = <CheckCircle size={16} className="text-cyber-green" />;
          borderClass = 'border-cyber-green/40';
          glowClass = 'glow-shadow-green';
        } else if (toast.type === 'error' || toast.type === 'danger') {
          icon = <AlertCircle size={16} className="text-cyber-rose" />;
          borderClass = 'border-cyber-rose/40';
          glowClass = 'glow-shadow-rose';
        } else if (toast.type === 'warning') {
          icon = <ShieldAlert size={16} className="text-amber-500" />;
          borderClass = 'border-amber-500/40';
          glowClass = 'shadow-[0_8px_32px_rgba(245,158,11,0.2)]';
        }

        const bgStyle = resolvedTheme === 'light'
          ? { backgroundColor: 'rgba(255, 255, 255, 0.98)', boxShadow: 'var(--shadow)' }
          : { backgroundColor: 'rgba(18, 18, 20, 0.96)', boxShadow: 'var(--shadow)' };

        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={bgStyle}
            className={`pointer-events-auto border rounded-xl p-4 flex gap-3 items-center justify-between transition-all duration-300 animate-toast cursor-pointer hover:translate-y-[-1px] ${borderClass} ${glowClass}`}
            role="alert"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0">{icon}</span>
              <p className="text-xs font-mono font-medium text-text-primary truncate">
                {toast.message}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="text-text-secondary hover:text-text-primary p-0.5 rounded transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
