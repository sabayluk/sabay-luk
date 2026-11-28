'use client';
import { useState, useEffect, useRef } from 'react';

export default function BarcodeCameraModal({ isOpen, onClose, onScan, playBeep }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [continuousMode, setContinuousMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [recentScans, setRecentScans] = useState([]);

  // Hardware capability states (Torch & Zoom)
  const [torchSupported, setTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 5, step: 0.1 });
  const [currentZoom, setCurrentZoom] = useState(1);

  const html5QrCodeRef = useRef(null);
  const cooldownRef = useRef(false);

  // Fallback sound generator using Web Audio API if playBeep isn't provided
  const triggerBeepSound = () => {
    if (!soundEnabled) return;
    try {
      if (typeof playBeep === 'function') {
        playBeep();
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch {
      // Ignore audio failure
    }
  };

  // Helper to get active MediaStreamTrack
  const getActiveVideoTrack = () => {
    try {
      const videoElem = document.querySelector('#barcode-reader-viewport video');
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject;
        const tracks = stream.getVideoTracks();
        if (tracks && tracks.length > 0) return tracks[0];
      }
    } catch (e) {
      console.warn('Could not retrieve active video track:', e);
    }
    return null;
  };

  // Check hardware capabilities after camera starts
  const inspectTrackCapabilities = () => {
    setTimeout(() => {
      const track = getActiveVideoTrack();
      if (!track) return;

      try {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        // Check Torch support
        if ('torch' in capabilities) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }

        // Check Zoom support
        if ('zoom' in capabilities && capabilities.zoom) {
          setZoomSupported(true);
          setZoomRange({
            min: capabilities.zoom.min || 1,
            max: capabilities.zoom.max || 5,
            step: capabilities.zoom.step || 0.1
          });
          const settings = track.getSettings ? track.getSettings() : {};
          setCurrentZoom(settings.zoom || capabilities.zoom.min || 1);
        } else {
          setZoomSupported(false);
        }
      } catch (e) {
        console.warn('Capabilities error:', e);
      }
    }, 500);
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    const track = getActiveVideoTrack();
    if (!track) return;
    try {
      const nextState = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
    }
  };

  // Change Zoom Level
  const handleZoomChange = async (newZoom) => {
    const track = getActiveVideoTrack();
    if (!track) return;
    try {
      const val = parseFloat(newZoom);
      await track.applyConstraints({
        advanced: [{ zoom: val }]
      });
      setCurrentZoom(val);
    } catch (err) {
      console.warn('Failed to apply zoom:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setIsTorchOn(false);
      setScanCount(0);
      setRecentScans([]);
      setLastScanned('');
      return;
    }

    let isMounted = true;

    const initScanner = async () => {
      try {
        setCameraError('');
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!isMounted) return;

        // Query available camera devices
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          const camId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(camId);
          startCamera(camId, Html5Qrcode);
        } else {
          // Fallback facingMode
          startCamera({ facingMode: 'environment' }, Html5Qrcode);
        }
      } catch (err) {
        console.error('Camera init error:', err);
        setCameraError('មិនអាចបើកកាមេរ៉ាបានទេ! សូមចុច Allow / អនុញ្ញាត Camera Permission លើ Browser ឬវាយលេខបាកូដដោយដៃខាងក្រោម។');
      }
    };

    const timer = setTimeout(() => {
      initScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async (cameraConfig, Html5QrcodeClass) => {
    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const qrcode = new Html5QrcodeClass('barcode-reader-viewport');
      html5QrCodeRef.current = qrcode;

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.85),
            height: Math.floor(minEdge * 0.6)
          };
        },
        aspectRatio: 1.333334,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      await qrcode.start(
        cameraConfig,
        scanConfig,
        (decodedText) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;

          setLastScanned(decodedText);
          setScanCount(prev => prev + 1);
          setRecentScans(prev => [
            { code: decodedText, time: new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
            ...prev.slice(0, 4)
          ]);

          triggerBeepSound();
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(80);

          onScan(decodedText);

          if (!continuousMode) {
            stopCamera();
            onClose();
          } else {
            setTimeout(() => {
              cooldownRef.current = false;
            }, 1200);
          }
        },
        () => {} // silent frame error
      );

      setIsScanning(true);
      setCameraError('');
      setIsTorchOn(false);
      inspectTrackCapabilities();
    } catch (err) {
      console.error('Failed to start camera:', err);
      setIsScanning(false);
      setCameraError('កាមេរ៉ាមិនអាចចាប់ផ្តើមបានទេ (សូមពិនិត្យមើលសិទ្ធិ Camera លើ Browser): ' + (err.message || ''));
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.warn('Stop camera notice:', err);
    } finally {
      html5QrCodeRef.current = null;
      setIsScanning(false);
      setIsTorchOn(false);
    }
  };

  // Flip Camera 1-Click
  const handleFlipCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCam = cameras[nextIndex];
      setSelectedCameraId(nextCam.id);
      import('html5-qrcode').then(({ Html5Qrcode }) => startCamera(nextCam.id, Html5Qrcode));
    } else {
      const nextMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextMode);
      import('html5-qrcode').then(({ Html5Qrcode }) => startCamera({ facingMode: nextMode }, Html5Qrcode));
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    triggerBeepSound();
    const code = manualCode.trim();
    setLastScanned(code);
    setScanCount(prev => prev + 1);
    setRecentScans(prev => [
      { code, time: new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
      ...prev.slice(0, 4)
    ]);
    onScan(code);
    setManualCode('');
    if (!continuousMode) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-xl shadow-xs">
              📷
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base tracking-tight flex items-center gap-2">
                <span>ម៉ាស៊ីនស្កេនកាមេរ៉ា (Camera Scanner)</span>
                {isScanning && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                )}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
                <span>ស្កេនបាកូដតាមទូរស័ព្ទ, iPad ឬកាមេរ៉ាកុំព្យូទ័រ</span>
                {scanCount > 0 && (
                  <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ស្កេនបាន {scanCount} មុខ
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sound Mute/Unmute */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'បិទសំឡេង' : 'បើកសំឡេង'}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition cursor-pointer ${
                soundEnabled ? 'bg-white/10 hover:bg-white/20 text-slate-200' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Camera Viewport Body */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Viewport Box */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 min-h-[250px] sm:min-h-[290px] flex items-center justify-center shadow-inner">
            <div id="barcode-reader-viewport" className="w-full h-full overflow-hidden" />

            {/* Scanning Overlay Guideline */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-64 sm:w-72 h-36 border-2 border-dashed border-emerald-400/80 rounded-2xl relative shadow-lg">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />
                  {/* Laser line animation */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-bounce top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] font-black text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-xs">
                  ដាក់បាកូដ ឬ QR ក្នុងប្រអប់ដើម្បីស្កេន
                </p>
              </div>
            )}

            {/* Hardware Quick Action Controls (Overlaid on Camera) */}
            {isScanning && (
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                {/* Torch / Flashlight Toggle */}
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    title="បើក/បិទ ពិលបំភ្លឺ"
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition cursor-pointer backdrop-blur-md ${
                      isTorchOn 
                        ? 'bg-amber-400 text-slate-950 font-black shadow-amber-400/40 ring-2 ring-amber-300' 
                        : 'bg-black/60 text-white hover:bg-black/80 border border-white/20'
                    }`}
                  >
                    <span>{isTorchOn ? '🔦 ពិល ON' : '💡 ពិល OFF'}</span>
                  </button>
                )}

                {/* Flip Camera Button */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  title="ប្តូរកាមេរ៉ា (មុខ/ក្រោយ)"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-black/60 hover:bg-black/80 text-white border border-white/20 flex items-center gap-1 shadow-md transition cursor-pointer backdrop-blur-md active:scale-95"
                >
                  <span>🔄 ប្តូរកាមេរ៉ា</span>
                </button>
              </div>
            )}

            {/* Error Message */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <span className="text-3xl">⚠️</span>
                <p className="text-xs font-bold text-rose-400 max-w-sm leading-relaxed">
                  {cameraError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    import('html5-qrcode').then(({ Html5Qrcode }) => {
                      startCamera({ facingMode: 'environment' }, Html5Qrcode);
                    });
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shadow-md"
                >
                  🔄 ព្យាយាមបើកម្តងទៀត
                </button>
              </div>
            )}
          </div>

          {/* Zoom Slider Control (If Hardware Supports) */}
          {zoomSupported && isScanning && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-600 shrink-0 flex items-center gap-1">
                🔍 Zoom:
              </span>
              <input
                type="range"
                min={zoomRange.min}
                max={zoomRange.max}
                step={zoomRange.step}
                value={currentZoom}
                onChange={(e) => handleZoomChange(e.target.value)}
                className="flex-1 accent-orange-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-slate-700 w-10 text-right">
                {currentZoom.toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={() => handleZoomChange(1)}
                className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-600 hover:bg-slate-100"
              >
                1x
              </button>
            </div>
          )}

          {/* Camera Selection & Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {cameras.length > 1 && (
              <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                <label className="text-[11px] font-bold text-slate-500 shrink-0">កាមេរ៉ា:</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedCameraId(id);
                    import('html5-qrcode').then(({ Html5Qrcode }) => startCamera(id, Html5Qrcode));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {cameras.map(c => (
                    <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.slice(0, 6)}`}</option>
                  ))}
                </select>
              </div>
            )}

            <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
              />
              <span className="font-bold text-slate-700 text-xs">ស្កេនបន្តបន្ទាប់ (Continuous)</span>
            </label>
          </div>

          {/* Last Scanned Feedback & History */}
          {lastScanned && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 animate-in slide-in-from-top-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">🎯</span>
                <div className="truncate">
                  <span className="text-[10px] text-emerald-600 uppercase font-black tracking-wider block">ស្កេនបានជោគជ័យ</span>
                  <p className="text-xs font-mono font-black text-emerald-900 truncate">{lastScanned}</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                បានចូលកន្ត្រក ✓
              </span>
            </div>
          )}

          {/* Recent Scans Badges (Continuous Mode) */}
          {recentScans.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-400 font-bold text-[10px] shrink-0">ទើបស្កេន:</span>
              {recentScans.slice(1).map((s, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold shrink-0">
                  {s.code}
                </span>
              ))}
            </div>
          )}

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="វាយបញ្ចូល SKU ឬលេខបាកូដដោយដៃ..."
              className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shrink-0"
            >
              បញ្ចូល (Enter)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
