'use client';

import React, { useState, useEffect, useRef } from 'react';

// Cambodian province default coordinates for quick presets
const PROVINCE_COORDINATES = {
  'ភ្នំពេញ': { lat: 11.5564, lng: 104.9282, label: 'ភ្នំពេញ' },
  'កណ្តាល': { lat: 11.4550, lng: 105.0000, label: 'កណ្តាល' },
  'សៀមរាប': { lat: 13.3671, lng: 103.8448, label: 'សៀមរាប' },
  'បាត់ដំបង': { lat: 13.0957, lng: 103.2022, label: 'បាត់ដំបង' },
  'ព្រះសីហនុ': { lat: 10.6253, lng: 103.5234, label: 'ព្រះសីហនុ' },
  'កំពង់ចាម': { lat: 12.0000, lng: 105.4500, label: 'កំពង់ចាម' },
  'កំពត': { lat: 10.6104, lng: 104.1815, label: 'កំពត' },
  'កំពង់ស្ពឺ': { lat: 11.4533, lng: 104.5209, label: 'កំពង់ស្ពឺ' },
  'កែប': { lat: 10.4829, lng: 104.2949, label: 'កែប' },
  'កោះកុង': { lat: 11.6153, lng: 102.9838, label: 'កោះកុង' },
  'បន្ទាយមានជ័យ': { lat: 13.5859, lng: 102.9737, label: 'បន្ទាយមានជ័យ' },
  'ស្វាយរៀង': { lat: 11.0879, lng: 105.7993, label: 'ស្វាយរៀង' },
  'តាកែវ': { lat: 10.9908, lng: 104.7850, label: 'តាកែវ' },
  'ព្រៃវែង': { lat: 11.4851, lng: 105.3262, label: 'ព្រៃវែង' },
  'ពោធិ៍សាត់': { lat: 12.5388, lng: 103.9192, label: 'ពោធិ៍សាត់' },
  'កំពង់ធំ': { lat: 12.7111, lng: 104.8887, label: 'កំពង់ធំ' }
};

export default function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialUrl = '',
  selectedProvince = 'ភ្នំពេញ'
}) {
  const iframeRef = useRef(null);

  // Parse initial coordinates if provided via Google Maps url
  const parseInitialCoords = () => {
    if (initialUrl) {
      const match = initialUrl.match(/q=(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
                    initialUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (match && match[1] && match[2]) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      }
    }
    const prov = PROVINCE_COORDINATES[selectedProvince] || PROVINCE_COORDINATES['ភ្នំពេញ'];
    return { lat: prov.lat, lng: prov.lng };
  };

  const initial = parseInitialCoords();
  const [coords, setCoords] = useState(initial);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [activePreset, setActivePreset] = useState(selectedProvince || 'ភ្នំពេញ');

  // Sync coords when modal opens
  useEffect(() => {
    if (isOpen) {
      const init = parseInitialCoords();
      setCoords(init);
      setGpsError('');
      setActivePreset(selectedProvince || 'ភ្នំពេញ');
    }
  }, [isOpen, initialUrl, selectedProvince]);

  // Listen to messages from Leaflet inside the iframe
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'MAP_PIN_MOVED') {
        const lat = Number(e.data.lat);
        const lng = Number(e.data.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          setCoords({ lat, lng });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Post new center to iframe map
  const sendLocationToIframe = (lat, lng, zoom = 16) => {
    setCoords({ lat, lng });
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SET_LOCATION',
        lat,
        lng,
        zoom
      }, '*');
    }
  };

  // Get current device GPS
  const handleGetGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('ឧបករណ៍របស់អ្នកមិនគាំទ្រប្រព័ន្ធ GPS ទេ');
      return;
    }
    setIsLocatingGps(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        sendLocationToIframe(lat, lng, 17);
        setIsLocatingGps(false);
        setActivePreset('GPS');
      },
      (err) => {
        setIsLocatingGps(false);
        setGpsError('មិនអាចចាប់ GPS បានទេ! សូមអនុញ្ញាត Location Permission លើទូរស័ព្ទ ឬកុំព្យូទ័ររបស់អ្នក។');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Quick preset jump
  const handlePresetClick = (provinceName) => {
    const p = PROVINCE_COORDINATES[provinceName];
    if (p) {
      setActivePreset(provinceName);
      sendLocationToIframe(p.lat, p.lng, 14);
    }
  };

  // Submit selected location
  const handleConfirmLocation = () => {
    const mapUrl = `https://maps.google.com/?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
    onConfirm({
      lat: coords.lat,
      lng: coords.lng,
      mapUrl
    });
    onClose();
  };

  if (!isOpen) return null;

  // Generate self-contained HTML for Leaflet OpenStreetMap
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .custom-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      line-height: 1;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));
      cursor: grab;
      user-select: none;
      transition: transform 0.15s ease;
    }
    .custom-pin:active {
      transform: scale(1.15) translateY(-6px);
      cursor: grabbing;
    }
    .leaflet-bar a {
      background-color: #ffffff;
      color: #333333;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    const startLat = ${coords.lat};
    const startLng = ${coords.lng};
    const map = L.map('map', { zoomControl: true }).setView([startLat, startLng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'custom-pin',
      html: '📍',
      iconSize: [40, 40],
      iconAnchor: [20, 36]
    });

    let marker = L.marker([startLat, startLng], {
      draggable: true,
      icon: pinIcon
    }).addTo(map);

    function reportCoordinates(lat, lng) {
      window.parent.postMessage({
        type: 'MAP_PIN_MOVED',
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6))
      }, '*');
    }

    marker.on('dragend', function(e) {
      const pos = e.target.getLatLng();
      reportCoordinates(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      reportCoordinates(e.latlng.lat, e.latlng.lng);
    });

    window.addEventListener('message', function(ev) {
      if (!ev.data) return;
      if (ev.data.type === 'SET_LOCATION') {
        const { lat, lng, zoom } = ev.data;
        if (lat && lng) {
          map.setView([lat, lng], zoom || 16);
          marker.setLatLng([lat, lng]);
          reportCoordinates(lat, lng);
        }
      }
    });

    setTimeout(() => {
      map.invalidateSize();
      reportCoordinates(startLat, startLng);
    }, 400);
  </script>
</body>
</html>`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-lg border border-orange-500/30">
              🗺️
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                ជ្រើសរើសទីតាំងលើផែនទី (Location Picker)
              </h3>
              <p className="text-[11px] text-slate-300">
                ចុចលើផែនទី ឬអូស Pin 📍 ទៅកាន់ទីតាំងផ្ទះ/កន្លែងដឹកជញ្ជូនរបស់អ្នក
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
            title="បិទ"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: GPS button & Quick presets */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* GPS Locate Button */}
            <button
              type="button"
              onClick={handleGetGps}
              disabled={isLocatingGps}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition disabled:opacity-60 cursor-pointer"
            >
              <span>{isLocatingGps ? '⏳' : '📍'}</span>
              <span>{isLocatingGps ? 'កំពុងចាប់ GPS...' : 'ទីតាំង GPS ខ្ញុំបច្ចុប្បន្ន'}</span>
            </button>

            {/* Live Coords Display */}
            <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-mono text-slate-700 shadow-2xs">
              <span className="text-emerald-600 font-black">● ទីតាំង:</span>
              <span className="font-semibold">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            </div>
          </div>

          {/* Quick Province presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-slate-500 font-bold shrink-0">រហ័ស:</span>
            {['ភ្នំពេញ', 'សៀមរាប', 'បាត់ដំបង', 'ព្រះសីហនុ', 'កំពង់ចាម', 'កំពត', 'កណ្តាល', 'បន្ទាយមានជ័យ'].map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => handlePresetClick(prov)}
                className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                  activePreset === prov
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          {gpsError && (
            <div className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              ⚠️ {gpsError}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative w-full h-[360px] sm:h-[420px] bg-slate-100">
          <iframe
            ref={iframeRef}
            title="Interactive Location Picker Map"
            srcDoc={srcDoc}
            className="w-full h-full border-0 block"
            sandbox="allow-scripts allow-same-origin"
          />

          {/* Floating Instructions Pill */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <div className="bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1.5">
              <span>👆</span>
              <span>ចុចលើផែនទី ឬអូស Pin 📍 ទៅទីតាំងដែលចង់ឱ្យដឹក</span>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 text-center sm:text-left">
            <span className="text-base">💡</span>
            <span>ប្រព័ន្ធនឹងបម្លែងទីតាំងនេះទៅជា Google Maps Link ស្វ័យប្រវត្តិជូនអ្នកដឹកជញ្ជូន</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-[#ff6a00] hover:from-orange-600 hover:to-[#e55f00] text-white text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>✅</span>
              <span>យល់ព្រមជ្រើសរើសទីតាំងនេះ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
