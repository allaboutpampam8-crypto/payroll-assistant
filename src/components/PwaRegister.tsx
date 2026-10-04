'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    // Registrasi Service Worker di latar belakang tanpa memunculkan banner pop-up
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA ServiceWorker active:', reg.scope);
          })
          .catch((err) => {
            console.warn('PWA ServiceWorker registration failed:', err);
          });
      });
    }
  }, []);

  return null;
}
