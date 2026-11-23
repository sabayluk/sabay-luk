'use client';
import { useEffect, useState } from 'react';

export default function PWAInstaller() {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatusToast, setShowStatusToast] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

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

    // ⭐️ Register Service Worker for Offline PWA Support ⭐️
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('✅ Sabay Luk ServiceWorker registered:', registration.scope);
          })
          .catch((error) => {
            console.warn('⚠️ ServiceWorker registration note:', error);
          });
      });
    }

    // ⭐️ Capture beforeinstallprompt so any Download/Install button can trigger native install ⭐️
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.__sabay_deferred_prompt = e;
      setIsInstallable(true);
      window.dispatchEvent(new CustomEvent('sabay_pwa_installable', { detail: { installable: true } }));
    };

    const handleAppInstalled = () => {
      window.__sabay_deferred_prompt = null;
      setIsInstallable(false);
      window.dispatchEvent(new CustomEvent('sabay_pwa_installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Expose global installer function
    window.installSabayApp = async () => {
      if (window.__sabay_deferred_prompt) {
        window.__sabay_deferred_prompt.prompt();
        const { outcome } = await window.__sabay_deferred_prompt.userChoice;
        if (outcome === 'accepted') {
          window.__sabay_deferred_prompt = null;
          setIsInstallable(false);
        }
        return outcome;
      }
      return null;
    };

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
