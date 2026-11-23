'use client';
import { useState, useEffect } from 'react';

export default function AppInstallModal({ isOpen, onClose }) {
  const [activeDeviceTab, setActiveDeviceTab] = useState('pc'); // 'pc' | 'android' | 'ios'
  const [isStandalone, setIsStandalone] = useState(false);
  const [canNativeInstall, setCanNativeInstall] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone app mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Detect native install readiness
    if (window.__sabay_deferred_prompt) {
      setCanNativeInstall(true);
    }

    const handleInstallable = () => setCanNativeInstall(true);
    const handleInstalled = () => {
      setInstallSuccess(true);
      setCanNativeInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener('sabay_pwa_installable', handleInstallable);
    window.addEventListener('sabay_pwa_installed', handleInstalled);

    // Auto-detect OS for default tab
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setActiveDeviceTab('ios');
    } else if (/Android/i.test(ua)) {
      setActiveDeviceTab('android');
    } else {
      setActiveDeviceTab('pc');
    }

    return () => {
      window.removeEventListener('sabay_pwa_installable', handleInstallable);
      window.removeEventListener('sabay_pwa_installed', handleInstalled);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (typeof window !== 'undefined' && typeof window.installSabayApp === 'function') {
      const outcome = await window.installSabayApp();
      if (outcome === 'accepted') {
        setInstallSuccess(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
            title="បិទ"
          >
            ✕
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff6a00] to-orange-600 p-0.5 shadow-lg shadow-orange-500/30 flex items-center justify-center shrink-0">
              <img src="/icon-192x192.png" alt="Sabay Luk App" className="w-full h-full rounded-2xl object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  ដោនឡូត APP ប្រើ Offline
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Offline Ready 100%
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                ដំឡើងកម្មវិធីលើ PC / Mac / ទូរស័ព្ទ ដើម្បីលក់ POS បានទោះអត់មាន Internet
              </p>
            </div>
          </div>

          {/* Quick Install Bar inside Header */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            {isStandalone || installSuccess ? (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                <span className="text-base">✅</span>
                <span>កម្មវិធីត្រូវបានដំឡើងរួចរាល់ហើយ! កំពុងដំណើរការជា Standalone App</span>
              </div>
            ) : canNativeInstall ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6a00] to-orange-500 hover:from-[#e55f00] hover:to-orange-600 text-white font-black text-xs shadow-lg shadow-orange-500/30 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="text-base">📥</span>
                <span>ចុចដំឡើងកម្មវិធីឥឡូវនេះ (Install App)</span>
              </button>
            ) : (
              <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                <span>💡</span>
                <span>សូមអនុវត្តតាមការណែនាំតាមប្រភេទឧបករណ៍ខាងក្រោម៖</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload();
              }}
              className="text-[11px] text-slate-300 hover:text-white underline font-bold cursor-pointer"
            >
              🔄 Refresh Cache ស្តុកទំនិញ
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Device Tabs */}
          <div>
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveDeviceTab('pc')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeDeviceTab === 'pc'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>💻</span>
                <span>កុំព្យូទ័រ PC / Mac</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDeviceTab('android')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeDeviceTab === 'android'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📱</span>
                <span>Android (Chrome)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDeviceTab('ios')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeDeviceTab === 'ios'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🍏</span>
                <span>iPhone / iPad (Safari)</span>
              </button>
            </div>
          </div>

          {/* Tab Content: PC / Mac */}
          {activeDeviceTab === 'pc' && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-150">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <span>🖥️</span> របៀបដំឡើងលើ Windows & Mac (Google Chrome ឬ Microsoft Edge)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">1</span>
                  <p className="text-xs font-black text-slate-900">មើលរបារ URL ខាងលើ</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    សង្កេតមើលចុងខាងស្តាំនៃរបារ Address Bar (កន្លែងវាយ URL) នឹងមានរូប <b>កុំព្យូទ័រព្រួញចុះ 📥 (Install Sabay Luk)</b>។
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">2</span>
                  <p className="text-xs font-black text-slate-900">ចុចប៊ូតុង Install</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    ចុចលើរូបនោះ ឬចុចត្រេបី <b>(⋮)</b> $\rightarrow$ <b>Save and share</b> $\rightarrow$ <b>Install Sabay Luk...</b>
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">3</span>
                  <p className="text-xs font-black text-slate-900">រួចរាល់ ១០០%</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    កម្មវិធីនឹងបង្កើត Icon លើ Desktop និង Taskbar អាចចុចបើកប្រើភ្លាមៗទោះគ្មាន Internet!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Android */}
          {activeDeviceTab === 'android' && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-150">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <span>🤖</span> របៀបដំឡើងលើទូរស័ព្ទ Android (Chrome Browser)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">1</span>
                  <p className="text-xs font-black text-slate-900">ចុចសញ្ញាចុចបី (⋮)</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    ចុចសញ្ញាចុចបី <b>(⋮)</b> នៅជ្រុងខាងលើស្តាំនៃ Browser Chrome។
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">2</span>
                  <p className="text-xs font-black text-slate-900">ជ្រើស Install App</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    ចុចជ្រើសរើស <b>«ដំឡើងកម្មវិធី (Install App)»</b> ឬ <b>«បន្ថែមទៅអេក្រង់ដើម (Add to Home screen)»</b>។
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">3</span>
                  <p className="text-xs font-black text-slate-900">រួចរាល់</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    App នឹងដំឡើងទៅលើអេក្រង់ដើមទូរស័ព្ទ ដំណើរការដូច App ទាញយកពី Play Store អញ្ចឹង!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: iOS */}
          {activeDeviceTab === 'ios' && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-150">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <span>🍏</span> របៀបដំឡើងលើ iPhone & iPad (Safari Browser)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center">1</span>
                  <p className="text-xs font-black text-slate-900">បើកលើ Safari</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    សូមប្រាកដថាបងកំពុងបើកលើកម្មវិធី <b>Safari</b> រួចចុចប៊ូតុង <b>Share (ព្រួញឡើងលើ 📤)</b> នៅខាងក្រោម។
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center">2</span>
                  <p className="text-xs font-black text-slate-900">Add to Home Screen</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    អូសចុះក្រោមបន្តិច រួចចុចលើ <b>«Add to Home Screen (បន្ថែមទៅទំព័រដើម ➕)»</b>។
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">3</span>
                  <p className="text-xs font-black text-slate-900">ចុច Add</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    ចុចប៊ូតុង <b>«Add»</b> នៅជ្រុងលើស្តាំដៃ $\rightarrow$ App នឹងលោតទៅលើ Home Screen ភ្លាម!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ⭐️ Offline POS Capabilities Section ⭐️ */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>របៀបដែលប្រព័ន្ធដំណើរការពេលអត់មាន Internet (Offline Mode)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-black text-emerald-900 flex items-center gap-1.5">
                  <span>⚡</span> លក់ POS គ្មានរអាក់រអួល
                </span>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  ទោះដាច់ Internet ក៏ដោយ បុគ្គលិកនៅតែអាចស្កេនបាកូដ រើសទំនិញ គិតលុយ និងព្រីនវិក្កយបត្របានធម្មតា។
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-black text-emerald-900 flex items-center gap-1.5">
                  <span>💾</span> កត់ត្រាក្នុងម៉ាស៊ីនសុវត្ថិភាព
                </span>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  វិក្កយបត្រលក់នីមួយៗត្រូវបានកត់ត្រាទុកក្នុងម៉ាស៊ីន (Local Storage) ដោយមិនបាត់បង់ទិន្នន័យឡើយ។
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-black text-emerald-900 flex items-center gap-1.5">
                  <span>🔄</span> Auto-Sync ពេលមាន Net វិញ
                </span>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  នៅពេល Internet ភ្ជាប់មកវិញ ប្រព័ន្ធនឹងរុញវិក្កយបត្រទាំងអស់ចូល Database និងកាត់ស្តុកស្វ័យប្រវត្តិ។
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">
            Sabay Luk Multi-Store PWA v2.5
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition active:scale-95 cursor-pointer"
          >
            យល់ព្រម / បិទ
          </button>
        </div>
      </div>
    </div>
  );
}
