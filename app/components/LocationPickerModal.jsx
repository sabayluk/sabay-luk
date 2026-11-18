'use client';

import React, { useState, useEffect, useRef } from 'react';

// Cambodian 25 province default coordinates
const PROVINCE_COORDINATES = {
  'ភ្នំពេញ': { lat: 11.5564, lng: 104.9282, label: 'ភ្នំពេញ (Phnom Penh)' },
  'កណ្តាល': { lat: 11.4550, lng: 105.0000, label: 'កណ្តាល (Kandal)' },
  'សៀមរាប': { lat: 13.3671, lng: 103.8448, label: 'សៀមរាប (Siem Reap)' },
  'បាត់ដំបង': { lat: 13.0957, lng: 103.2022, label: 'បាត់ដំបង (Battambang)' },
  'ព្រះសីហនុ': { lat: 10.6253, lng: 103.5234, label: 'ព្រះសីហនុ (Preah Sihanouk)' },
  'កំពង់ចាម': { lat: 12.0000, lng: 105.4500, label: 'កំពង់ចាម (Kampong Cham)' },
  'កំពត': { lat: 10.6104, lng: 104.1815, label: 'កំពត (Kampot)' },
  'កំពង់ស្ពឺ': { lat: 11.4533, lng: 104.5209, label: 'កំពង់ស្ពឺ (Kampong Speu)' },
  'បន្ទាយមានជ័យ': { lat: 13.5859, lng: 102.9737, label: 'បន្ទាយមានជ័យ (Banteay Meanchey)' },
  'ស្វាយរៀង': { lat: 11.0879, lng: 105.7993, label: 'ស្វាយរៀង (Svay Rieng)' },
  'តាកែវ': { lat: 10.9908, lng: 104.7850, label: 'តាកែវ (Takeo)' },
  'ព្រៃវែង': { lat: 11.4851, lng: 105.3262, label: 'ព្រៃវែង (Prey Veng)' },
  'ពោធិ៍សាត់': { lat: 12.5388, lng: 103.9192, label: 'ពោធិ៍សាត់ (Pursat)' },
  'កំពង់ធំ': { lat: 12.7111, lng: 104.8887, label: 'កំពង់ធំ (Kampong Thom)' },
  'កំពង់ឆ្នាំង': { lat: 12.2500, lng: 104.6667, label: 'កំពង់ឆ្នាំង (Kampong Chhnang)' },
  'កែប': { lat: 10.4829, lng: 104.2949, label: 'កែប (Kep)' },
  'កោះកុង': { lat: 11.6153, lng: 102.9838, label: 'កោះកុង (Koh Kong)' },
  'ក្រចេះ': { lat: 12.4881, lng: 106.0188, label: 'ក្រចេះ (Kratie)' },
  'ស្ទឹងត្រែង': { lat: 13.5259, lng: 105.9683, label: 'ស្ទឹងត្រែង (Stung Treng)' },
  'រតនគិរី': { lat: 13.7394, lng: 106.9873, label: 'រតនគិរី (Ratanakiri)' },
  'មណ្ឌលគិរី': { lat: 12.4558, lng: 107.1881, label: 'មណ្ឌលគិរី (Mondulkiri)' },
  'ព្រះវិហារ': { lat: 13.8073, lng: 104.9811, label: 'ព្រះវិហារ (Preah Vihear)' },
  'ឧត្តរមានជ័យ': { lat: 14.1818, lng: 103.5176, label: 'ឧត្តរមានជ័យ (Oddar Meanchey)' },
  'ប៉ៃលិន': { lat: 12.8489, lng: 102.6093, label: 'ប៉ៃលិន (Pailin)' },
  'ត្បូងឃ្មុំ': { lat: 11.9000, lng: 105.6500, label: 'ត្បូងឃ្មុំ (Tboung Khmum)' }
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
  const [activeProvince, setActiveProvince] = useState(selectedProvince || 'ភ្នំពេញ');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  // Sync coords when modal opens
  useEffect(() => {
    if (isOpen) {
      const init = parseInitialCoords();
      setCoords(init);
      setActiveProvince(selectedProvince || 'ភ្នំពេញ');
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');
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

  // Jump to province
  const handleSelectProvince = (provName) => {
    setActiveProvince(provName);
    const p = PROVINCE_COORDINATES[provName];
    if (p) {
      sendLocationToIframe(p.lat, p.lng, 14);
    }
  };

  // Search places using OpenStreetMap Nominatim
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Cambodia')}&countrycodes=kh&limit=5`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'km,en' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSearchResults(data);
        const top = data[0];
        sendLocationToIframe(parseFloat(top.lat), parseFloat(top.lon), 16);
      } else {
        setSearchError('រកមិនឃើញទីតាំងនេះទេ! សូមសាកល្បងវាយឈ្មោះផ្សេង ឬចុចអូស Pin លើផែនទីដោយផ្ទាល់។');
      }
    } catch (err) {
      setSearchError('មិនអាចស្វែងរកបានទេ! សូមចុចរើសទីតាំងលើផែនទីដោយផ្ទាល់។');
    } finally {
      setIsSearching(false);
    }
  };

  // Select search result
  const handlePickSearchResult = (item) => {
    sendLocationToIframe(parseFloat(item.lat), parseFloat(item.lon), 16);
    setSearchResults([]);
  };

  // Optional: device GPS
  const handleUseCurrentGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('ឧបករណ៍របស់អ្នកមិនគាំទ្រប្រព័ន្ធ GPS ទេ');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocationToIframe(pos.coords.latitude, pos.coords.longitude, 17);
      },
      () => {
        alert('មិនអាចចាប់ GPS បានទេ! សូមអនុញ្ញាត Location Permission។');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Confirm selection
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
      font-size: 34px;
      line-height: 1;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
      cursor: grab;
      user-select: none;
      transition: transform 0.15s ease;
    }
    .custom-pin:active {
      transform: scale(1.2) translateY(-8px);
      cursor: grabbing;
    }
    .leaflet-bar a {
      background-color: #ffffff;
      color: #1e293b;
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
      iconSize: [42, 42],
      iconAnchor: [21, 38]
    });

    let marker = L.marker([startLat, startLng], {
      draggable: true,
      icon: pinIcon
    }).addTo(map);

    function notify(lat, lng) {
      window.parent.postMessage({
        type: 'MAP_PIN_MOVED',
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6))
      }, '*');
    }

    marker.on('dragend', function(e) {
      const pos = e.target.getLatLng();
      notify(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      notify(e.latlng.lat, e.latlng.lng);
    });

    window.addEventListener('message', function(ev) {
      if (!ev.data) return;
      if (ev.data.type === 'SET_LOCATION') {
        const { lat, lng, zoom } = ev.data;
        if (lat && lng) {
          map.setView([lat, lng], zoom || 15);
          marker.setLatLng([lat, lng]);
          notify(lat, lng);
        }
      }
    });

    setTimeout(() => {
      map.invalidateSize();
      notify(startLat, startLng);
    }, 400);
  </script>
</body>
</html>`;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn cursor-pointer"
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-scaleUp cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-xl border border-orange-500/30">
              🗺️
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                ជ្រើសរើសទីតាំងដឹកជញ្ជូនលើផែនទី (Pick Delivery Location)
              </h3>
              <p className="text-[11px] text-slate-300">
                អាចរើសទីតាំងផ្ទះខ្លួនឯង ឬទីតាំងអ្នកផ្សេងដែលចង់ទិញផ្ញើជូន (ទូទាំងប្រទេសកម្ពុជា)
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

        {/* Toolbar: Search & Province Jump */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="🔎 វាយស្វែងរកទីតាំង/ផ្សារ/ផ្លូវ (ឧ. វត្តភ្នំ, អុីអន, ទួលគោក...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSearching ? 'កំពុងរក...' : 'ស្វែងរក'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-lg space-y-1 max-h-40 overflow-y-auto text-xs">
              <div className="text-[10px] font-bold text-slate-400 px-2">លទ្ធផលស្វែងរក (ចុចដើម្បីកំណត់ទីតាំង)៖</div>
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePickSearchResult(item)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-orange-50 rounded-lg text-slate-700 transition flex items-center gap-2 cursor-pointer"
                >
                  <span>📍</span>
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {searchError && (
            <div className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              ⚠️ {searchError}
            </div>
          )}

          {/* Quick 25 Provinces Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-slate-500 font-bold shrink-0">រើសខេត្ត/ក្រុង:</span>
            {Object.keys(PROVINCE_COORDINATES).map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => handleSelectProvince(prov)}
                className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                  activeProvince === prov
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full h-[360px] sm:h-[420px] bg-slate-100">
          <iframe
            ref={iframeRef}
            title="Interactive Delivery Location Picker Map"
            srcDoc={srcDoc}
            className="w-full h-full border-0 block"
            sandbox="allow-scripts allow-same-origin"
          />

          {/* Instructions Floating Pill */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10 w-[90%] sm:w-auto text-center">
            <div className="bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-lg border border-white/20 inline-flex items-center gap-2">
              <span>📍</span>
              <span>ចុចលើផែនទី ឬអូស Pin ទៅកាន់ទីតាំងផ្ទះ/កន្លែងដែលចង់ឱ្យដឹក</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2 w-full sm:w-auto">
            <span className="text-emerald-600 font-black">● ទីតាំងជ្រើសរើស:</span>
            <span className="font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 text-[11px]">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
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
              <span>យល់ព្រមយកទីតាំងនេះ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
