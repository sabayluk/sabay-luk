'use client';
import { useState, useEffect, useRef } from 'react';

export default function BarcodeScannerSettingsModal({
  isOpen,
  onClose,
  scannerSoundEnabled,
  setScannerSoundEnabled,
  autoAddVariant,
  setAutoAddVariant,
  playBeep,
  playErrorBeep
}) {
  const [testScannedData, setTestScannedData] = useState(null);
  const [testInputValue, setTestInputValue] = useState('');
  const testInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && testInputRef.current) {
      setTimeout(() => {
        testInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleTestKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = testInputValue.trim();
      if (!val) return;

      const result = {
        code: val,
        length: val.length,
        time: new Date().toLocaleTimeString(),
        type: /^\d+$/.test(val) ? 'Numeric (EAN / UPC / Code)' : 'Alphanumeric (SKU / Code-128)'
      };

      setTestScannedData(result);
      if (playBeep) playBeep();
      setTestInputValue('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shadow-xs">
              ⚡
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight flex items-center gap-2">
                មជ្ឈមណ្ឌលឧបករណ៍ស្កេនទំនិញ (Barcode Hub)
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                គ្រប់គ្រងការភ្ជាប់ USB, Wireless 2.4G, Bluetooth & កាមេរ៉ា
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Active Status Badge */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🟢</span>
              <div>
                <h4 className="font-black text-xs text-emerald-900">
                  ប្រព័ន្ធស្កេនទូទៅកំពុងបើកដំណើរការ (Global Scanner Active)
                </h4>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  បងអាចប្រើកាំភ្លើងស្កេនបាញ់គ្រប់ពេល ទោះបីមិនបានចុចលើប្រអប់ Search ក៏ដោយ!
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs shrink-0">
              Ready
            </span>
          </div>

          {/* Test Scanner Live Box */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <span>🎯</span>
                <span>ប្រអប់តេស្តស្កេនសាកល្បង (Test Scanner Live)</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (playBeep) playBeep();
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200"
              >
                🔊 តេស្តសម្លេង Beep
              </button>
            </div>

            <p className="text-[11px] text-gray-500">
              សូមចុចលើប្រអប់ខាងក្រោម រួចយកកាំភ្លើងស្កេនមកបាញ់សាកល្បង៖
            </p>

            <input
              ref={testInputRef}
              type="text"
              value={testInputValue}
              onChange={(e) => setTestInputValue(e.target.value)}
              onKeyDown={handleTestKeyDown}
              placeholder="👉 ចុចទីនេះ រួចបាញ់បាកូដតេស្ត..."
              className="w-full bg-white border-2 border-dashed border-gray-300 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm font-mono font-bold outline-none transition"
            />

            {/* Test Results Display */}
            {testScannedData && (
              <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-500">លេខកូដដែលចាប់បាន:</span>
                  <span className="font-mono font-black text-emerald-600 text-sm">{testScannedData.code}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">ប្រវែងតួអក្សរ:</span>
                  <span className="font-bold text-gray-700">{testScannedData.length} ខ្ទង់ ({testScannedData.type})</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">ម៉ោងស្កេន:</span>
                  <span className="font-mono text-gray-600">{testScannedData.time}</span>
                </div>
              </div>
            )}
          </div>

          {/* Scanner Options */}
          <div className="space-y-3">
            <h4 className="font-black text-xs text-gray-800 uppercase tracking-wide">
              ⚙️ ការកំណត់មុខងារស្កេន (Preferences)
            </h4>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🔊</span>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">សម្លេង Beep ពេលស្កេនជោគជ័យ</span>
                    <span className="text-[10px] text-gray-500">បន្លឺសម្លេង «ប៊ីប» បញ្ជាក់ថាបានទទួលបាកូដ</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={scannerSoundEnabled}
                  onChange={(e) => setScannerSoundEnabled(e.target.checked)}
                  className="w-5 h-5 rounded text-orange-600 accent-orange-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 cursor-pointer transition">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">⚡</span>
                  <div>
                    <span className="font-bold text-xs text-gray-800 block">បញ្ចូលចូលកន្រ្តកស្វ័យប្រវត្តិ (Auto Add to Cart)</span>
                    <span className="text-[10px] text-gray-500">ពេលស្កេនចំ Variant SKU នឹងបញ្ចូលទៅកន្ត្រកភ្លាមៗ</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoAddVariant}
                  onChange={(e) => setAutoAddVariant(e.target.checked)}
                  className="w-5 h-5 rounded text-orange-600 accent-orange-600 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Hardware Connection Guides */}
          <div className="space-y-3">
            <h4 className="font-black text-xs text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>📖</span>
              <span>ការណែនាំអំពីការភ្ជាប់ឧបករណ៍ស្កេន (Connection Guide)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-1">
                <div className="flex items-center gap-2 font-black text-gray-900">
                  <span>🔌</span>
                  <span>កាំភ្លើងស្កេន USB ខ្សែ</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  ដោតឌុយ USB ចូលកុំព្យូទ័រ វានឹងស្គាល់ភ្លាមៗ (Plug & Play) មិនបាច់ដំឡើង Driver ឬកម្មវិធីបន្ថែមទេ។
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-1">
                <div className="flex items-center gap-2 font-black text-gray-900">
                  <span>📡</span>
                  <span>កាំភ្លើងស្កេន Wireless 2.4G</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  ដោតកូន USB Dongle ចូលកុំព្យូទ័រ បើកកុងតាក់កាំភ្លើងស្កេន វានឹងភ្ជាប់ដោយស្វ័យប្រវត្តិតាមរលកធាតុអាកាស។
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-1">
                <div className="flex items-center gap-2 font-black text-gray-900">
                  <span>📶</span>
                  <span>ឧបករណ៍ស្កេន Bluetooth</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  បើក Bluetooth លើ iPad/ទូរស័ព្ទ ស្វែងរកឈ្មោះ Barcode Scanner រួចចុច Pair ជាការស្រេច។
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-1">
                <div className="flex items-center gap-2 font-black text-gray-900">
                  <span>📷</span>
                  <span>កាមេរ៉ាទូរស័ព្ទ / Webcam</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  ចុចប៊ូតុង «📷 ស្កេនកាមេរ៉ា» នៅលើផ្ទាំង POS ដើម្បីប្រើប្រាស់កាមេរ៉ាស្កេនដោយឥតគិតថ្លៃ។
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-black text-white text-xs font-black px-6 py-2.5 rounded-xl transition cursor-pointer"
          >
            រួចរាល់ (Done)
          </button>
        </div>
      </div>
    </div>
  );
}
