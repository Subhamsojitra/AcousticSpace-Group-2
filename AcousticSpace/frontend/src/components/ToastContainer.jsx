import React from 'react';
import { CheckCircle, AlertCircle, Info, X, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-xs w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info size={16} className="text-cyber-cyan" />;
        let borderClass = 'border-cyber-border';
        let bgGlow = 'rgba(10, 132, 255, 0.05)';

        if (toast.type === 'success') {
          icon = <CheckCircle size={16} className="text-cyber-green" />;
          borderClass = 'border-cyber-green/30';
          bgGlow = 'rgba(48, 209, 88, 0.05)';
        } else if (toast.type === 'error' || toast.type === 'danger') {
          icon = <AlertCircle size={16} className="text-cyber-rose" />;
          borderClass = 'border-cyber-rose/30';
          bgGlow = 'rgba(255, 69, 58, 0.05)';
        } else if (toast.type === 'warning') {
          icon = <ShieldAlert size={16} className="text-amber-500" />;
          borderClass = 'border-amber-500/30';
          bgGlow = 'rgba(245, 158, 11, 0.05)';
        }

        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{ backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow)', borderImageSource: bgGlow }}
            className={`pointer-events-auto border rounded-xl p-4 flex gap-3 items-center justify-between transition-all duration-300 animate-fadeIn cursor-pointer hover:translate-y-[-1px] hover:shadow-md ${borderClass}`}
            role="alert"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0">{icon}</span>
              <p className="text-[11px] font-mono font-medium text-text-primary truncate">
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
