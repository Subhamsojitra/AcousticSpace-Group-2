import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // Array contains at most 1 item
  const [queue, setQueue] = useState([]);
  const timerRef = useRef(null);

  const removeToast = useCallback((_id) => {
    setToasts([]);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setQueue(prev => [...prev, { id, message, type }]);
  }, []);

  // Queue scheduler loop
  useEffect(() => {
    if (toasts.length === 0 && queue.length > 0) {
      const nextToast = queue[0];
      // Delay slightly for exit transitions
      const processTimer = setTimeout(() => {
        setQueue(prev => prev.slice(1));
        setToasts([nextToast]);

        timerRef.current = setTimeout(() => {
          setToasts([]);
          timerRef.current = null;
        }, 3000);
      }, 150);

      return () => clearTimeout(processTimer);
    }
  }, [toasts, queue]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
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
