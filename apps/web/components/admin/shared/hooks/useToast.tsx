'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Toast } from '../feedback/Toast';

/**
 * Hook to manage and display toast notifications.
 */
export function useToast() {
  const [toast, setToast] = useState<{ message: string | any; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string | any, type: 'success' | 'error' | 'info' = 'success') => {
    // Clear any existing timer
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  const ToastComponent = useMemo(() => toast
    ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
    : null, [toast]);

  return useMemo(() => ({ showToast, ToastComponent }), [showToast, ToastComponent]);
}
