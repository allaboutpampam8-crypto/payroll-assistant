'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType, duration = 3500) => {
      toastCounter += 1;
      const id = `toast-${Date.now()}-${toastCounter}`;
      const newToast: ToastItem = { id, message, type, duration };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Maksimal 4 toast bersamaan

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toastMethods = {
    success: (msg: string, d?: number) => addToast(msg, 'success', d),
    error: (msg: string, d?: number) => addToast(msg, 'error', d),
    info: (msg: string, d?: number) => addToast(msg, 'info', d),
    warning: (msg: string, d?: number) => addToast(msg, 'warning', d),
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods, dismissToast }}>
      {children}

      {/* Floating Toasts Container */}
      <aside
        aria-live="polite"
        className="fixed top-4 right-4 z-70 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto rounded-2xl p-3.5 sm:p-4 shadow-xl border backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-top-3 duration-200 ${
                isSuccess
                  ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
                  : isError
                  ? 'bg-rose-50/95 border-rose-300 text-rose-950'
                  : isWarning
                  ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                  : 'bg-indigo-50/95 border-indigo-300 text-indigo-950'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {!isSuccess && !isError && !isWarning && (
                  <Info className="w-5 h-5 text-indigo-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold leading-snug break-words">
                  {t.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer"
                title="Tutup pemberitahuan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
