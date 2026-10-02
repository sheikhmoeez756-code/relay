'use client';
import { SessionProvider } from 'next-auth/react';
import { createContext, useContext, useEffect, useState } from 'react';
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export function Providers({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState('');
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const preference = localStorage.getItem('relay-theme');
    document.documentElement.classList.toggle(
      'dark',
      preference === 'dark' ||
        (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches),
    );
    const on = () => setOffline(false),
      off = () => setOffline(true);
    addEventListener('online', on);
    addEventListener('offline', off);
    setOffline(!navigator.onLine);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <SessionProvider>
      <ToastContext.Provider value={setToast}>
        {offline && (
          <div role="alert" className="alert" style={{ position: 'sticky', top: 0, zIndex: 99 }}>
            You’re offline. Changes cannot be saved until your connection returns.
          </div>
        )}
        {children}
        {toast && (
          <div
            role="status"
            className="panel"
            style={{
              position: 'fixed',
              bottom: 25,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '14px 22px',
              zIndex: 100,
              maxWidth: '90vw',
              boxShadow: '0 8px 35px #0002',
            }}
          >
            {toast}
          </div>
        )}
      </ToastContext.Provider>
    </SessionProvider>
  );
}
