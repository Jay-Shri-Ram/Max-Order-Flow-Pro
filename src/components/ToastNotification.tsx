import React from 'react';
import { NotificationItem } from '../types';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

interface ToastProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ notifications, onDismiss }) => {
  if (!notifications.length) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => {
        const icon =
          n.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : n.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : n.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-sky-400 shrink-0" />
          );

        const borderColor =
          n.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-950/80'
            : n.type === 'warning'
            ? 'border-amber-500/30 bg-amber-950/80'
            : n.type === 'error'
            ? 'border-rose-500/30 bg-rose-950/80'
            : 'border-sky-500/30 bg-slate-900/90';

        return (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${borderColor} backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-y-0`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-100">{n.title}</div>
              <div className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">{n.message}</div>
            </div>
            <button
              onClick={() => onDismiss(n.id)}
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
