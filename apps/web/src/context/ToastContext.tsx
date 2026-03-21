'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Memoize removeToast callback to prevent re-renders of toast items
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className="pointer-events-auto"
            >
              <div className="relative overflow-hidden rounded-2xl border border-[var(--fs-linen)]/30 bg-[var(--fs-surface)]/40 backdrop-blur-xl p-4 shadow-2xl flex items-center gap-4">
                {/* Accent line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  toast.type === 'success' ? 'bg-emerald-500' : 
                  toast.type === 'error' ? 'bg-rose-500' : 'bg-sky-500'
                }`} />
                
                <div className="flex-shrink-0">
                  {toast.type === 'success' && <CheckCircle className="text-emerald-500" size={20} />}
                  {toast.type === 'error' && <AlertCircle className="text-rose-500" size={20} />}
                  {toast.type === 'info' && <Info className="text-sky-500" size={20} />}
                </div>

                <p className="flex-1 font-sans text-sm font-medium text-[var(--fs-ivory)] leading-relaxed">
                  {toast.message}
                </p>

                <button 
                  onClick={() => removeToast(toast.id)}
                  className="text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
