'use client';
import { useEffect, useState } from 'react';

export default function PWAInstaller() {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatusToast, setShowStatusToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowStatusToast(true);
      setTimeout(() => setShowStatusToast(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatusToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ⭐️ Unregister any PWA service worker so browser treats everything as normal web tabs ⭐️
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().catch(() => {});
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatusToast && isOnline) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-[9999] px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-black transition-all duration-300 animate-in slide-in-from-bottom-5 border ${
        isOnline
          ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/25'
          : 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
      }`}
    >
      <span className="text-base">{isOnline ? '🟢' : '📡'}</span>
      <div>
        <p className="leading-tight">
          {isOnline
            ? 'អ៊ីនធឺណិតបានភ្ជាប់ឡើងវិញ (Online Mode) • ទិន្នន័យបាន Sync រួចរាល់'
            : 'កំពុងប្រើប្រាស់ក្រៅបណ្តាញ (Offline Mode) • អាចលក់ POS បានធម្មតា!'}
        </p>
        {!isOnline && (
          <p className="text-[10px] font-bold text-slate-900/80 mt-0.5">
            វិក្កយបត្រនឹងត្រូវ Sync ចូល Database ស្វ័យប្រវត្តិនៅពេលមាន Internet ឡើងវិញ
          </p>
        )}
      </div>
      {isOnline && (
        <button
          type="button"
          onClick={() => setShowStatusToast(false)}
          className="ml-2 text-white/80 hover:text-white cursor-pointer font-bold"
        >
          ✕
        </button>
      )}
    </div>
  );
}
