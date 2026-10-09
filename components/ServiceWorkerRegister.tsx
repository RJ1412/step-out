'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial online status
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker in production or local browser
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // SW registered cleanly
        })
        .catch((err) => {
          console.warn('SW registration skipped:', err);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <aside aria-label="Connectivity status" className="no-print bg-[#fdf0e6] border-b border-[#e5c5b2] px-4 py-2 text-center text-xs text-[#8c3e1c] font-mono">
      Offline mode active • Pocket card and notes running from device storage
    </aside>
  );
}
