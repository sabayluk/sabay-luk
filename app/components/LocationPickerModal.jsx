'use client';

import React, { useState, useEffect, useRef } from 'react';

// Cambodian 25 province default coordinates
export const PROVINCE_COORDINATES = {
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

  // ⭐️ ជំហាន Modal: 'MAP' (រើសលើផែនទី) ឬ 'CONFIRM_DETAILS' (បញ្ជាក់ផ្លូវ, សង្កាត់, ភូមិ, ឃុំ, ខណ្ឌ, ក្រុង) ⭐️
  const [modalStep, setModalStep] = useState('MAP');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [addressDetails, setAddressDetails] = useState({
    street: '',
    village: '',
    sangkat: '',
    district: '',
    province: selectedProvince || 'ភ្នំពេញ',
    landmark: ''
  });

  // Sync coords when modal opens
  useEffect(() => {
    if (isOpen) {
      const init = parseInitialCoords();
      setCoords(init);
      setActiveProvince(selectedProvince || 'ភ្នំពេញ');
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');
      setModalStep('MAP');
      setAddressDetails({
        street: '',
        village: '',
        sangkat: '',
        district: '',
        province: selectedProvince || 'ភ្នំពេញ',
        landmark: ''
      });
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

  // ⭐️ ស្វ័យប្រវត្តិទាញយកព័ត៌មានទីតាំង (Reverse Geocode: ផ្លូវ, សង្កាត់, ភូមិ, ខណ្ឌ, ក្រុង) ពេល Pin ផ្លាស់ប្តូរ ⭐️
  useEffect(() => {
    if (!coords || !isOpen) return;
    const timer = setTimeout(async () => {
      setIsReverseGeocoding(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'km,en' } });
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const street = a.road || a.pedestrian || a.street || '';
          const village = a.hamlet || a.subdistrict || '';
          const sangkat = a.suburb || a.quarter || a.neighbourhood || (a.village && !village ? a.village : '') || '';
          const district = a.town || a.city_district || a.county || a.district || '';
          const provRaw = a.state || a.city || activeProvince || 'ភ្នំពេញ';

          let matchedProv = activeProvince || 'ភ្នំពេញ';
          for (const p of Object.keys(PROVINCE_COORDINATES)) {
            if (provRaw.includes(p)) {
              matchedProv = p;
              break;
            }
          }

          setAddressDetails(prev => ({
            ...prev,
            street: street || prev.street,
            village: village || prev.village,
            sangkat: sangkat || prev.sangkat,
            district: district || prev.district,
            province: matchedProv
          }));
        }
      } catch (err) {
        console.warn('Reverse geocoding error:', err);
      } finally {
        setIsReverseGeocoding(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [coords.lat, coords.lng, isOpen, activeProvince]);

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
    setAddressDetails(prev => ({ ...prev, province: provName }));
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

  // ⭐️ ជំហានទី ១៖ បញ្ជាក់លើផែនទី រួចបន្តទៅបញ្ជាក់ ផ្លូវ, សង្កាត់, ភូមិ, ឃុំ, ខណ្ឌ ⭐️
  const handleProceedToConfirmDetails = () => {
    setModalStep('CONFIRM_DETAILS');
  };

  // ⭐️ ជំហានទី ២៖ រក្សាទុក និងបញ្ចប់ការកំណត់ទីតាំង ⭐️
  const handleFinalConfirmLocation = () => {
    const mapUrl = `https://maps.google.com/?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
    
    // បង្កើតអាសយដ្ឋានពេញលេញតាមលំដាប់លំដោយស្តង់ដារកម្ពុជា
    const parts = [];
    if (addressDetails.street) parts.push(addressDetails.street);
    if (addressDetails.village) parts.push(`ភូមិ${addressDetails.village.replace(/^ភូមិ/, '')}`);
    if (addressDetails.sangkat) parts.push(`សង្កាត់${addressDetails.sangkat.replace(/^សង្កាត់/, '')}`);
    if (addressDetails.district) parts.push(`ខណ្ឌ${addressDetails.district.replace(/^ខណ្ឌ/, '')}`);
    if (addressDetails.province) parts.push(addressDetails.province);
    if (addressDetails.landmark) parts.push(`(ចំណាំ: ${addressDetails.landmark})`);

    const fullFormattedAddress = parts.join(', ');

    onConfirm({
      lat: coords.lat,
      lng: coords.lng,
      mapUrl,
      addressDetails,
      fullFormattedAddress,
      province: addressDetails.province || activeProvince
    });
    setModalStep('MAP');
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
      onClick={() => { setModalStep('MAP'); onClose(); }}
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
                {modalStep === 'MAP' 
                  ? 'ជ្រើសរើសទីតាំងដឹកជញ្ជូនលើផែនទី (Pick Location)'
                  : '📍 បញ្ជាក់ទីតាំងឱ្យច្បាស់ (ផ្លូវ, សង្កាត់, ភូមិ, ឃុំ, ខណ្ឌ, ក្រុង)'
                }
              </h3>
              <p className="text-[11px] text-slate-300">
                {modalStep === 'MAP' 
                  ? 'ចុច ឬអូស Pin លើផែនទីដើម្បីកំណត់ទីតាំង GPS ជាក់ស្តែង'
                  : 'សូមពិនិត្យ ឬបំពេញបន្ថែមឈ្មោះផ្លូវ សង្កាត់ ខណ្ឌ ដើម្បីអ្នកដឹកងាយស្រួលរក'
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setModalStep('MAP'); onClose(); }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
            title="បិទ"
          >
            ✕
          </button>
        </div>

        {/* 🌟 VIEW 1: MAP SELECTION SCREEN 🌟 */}
        {modalStep === 'MAP' ? (
          <>
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
            <div className="relative w-full h-[340px] sm:h-[400px] bg-slate-100">
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
                  <span>ចុចលើផែនទី ឬអូស Pin ទៅកាន់ទីតាំងផ្ទះដែលចង់ឱ្យដឹក</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex items-center gap-2 w-full sm:w-auto">
                <span className="text-emerald-600 font-black">● GPS:</span>
                <span className="font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 text-[11px]">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
                {isReverseGeocoding && (
                  <span className="text-[10px] text-orange-500 animate-pulse font-bold">កំពុងទាញឈ្មោះទីតាំង...</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => { setModalStep('MAP'); onClose(); }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={handleProceedToConfirmDetails}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-[#ff6a00] hover:from-orange-600 hover:to-[#e55f00] text-white text-xs font-black shadow-md shadow-orange-500/25 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>👉</span>
                  <span>បន្តទៅបញ្ជាក់ទីតាំងលម្អិត</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* 🌟 VIEW 2: DETAILED ADDRESS CONFIRMATION (ផ្លូវ, សង្កាត់, ភូមិ, ឃុំ, ខណ្ឌ, ក្រុង) 🌟 */
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            
            {/* GPS Badge & Map Mini Banner */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3.5 rounded-2xl border border-orange-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🗺️</span>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    កូអរដោនេ GPS លើផែនទី (Google Maps)
                  </h4>
                  <p className="text-[11px] font-mono font-bold text-slate-600 mt-0.5">
                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalStep('MAP')}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-800 bg-white px-3 py-1.5 rounded-xl border border-orange-300 shadow-2xs hover:bg-orange-50 transition cursor-pointer"
              >
                ✏️ ប្តូរទីតាំងលើ Map
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              ប្រព័ន្ធបានស្វែងរកទីតាំងស្វ័យប្រវត្តិតាម GPS ជូនអ្នក។ សូមពិនិត្យ ឬវាយបន្ថែមផ្ទះលេខ ផ្លូវ សង្កាត់ ខណ្ឌ ឱ្យបានត្រឹមត្រូវ៖
            </p>

            {/* Detailed Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* 1. ផ្ទះលេខ & ផ្លូវ */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1.5">
                  <span>🏠</span> <span>ផ្ទះលេខ / ផ្លូវ (Street & House No.) *</span>
                </label>
                <input
                  type="text"
                  placeholder="ឧ. ផ្ទះលេខ ១២A, ផ្លូវ ២៧១ ឬ ផ្លូវបេតុង..."
                  value={addressDetails.street}
                  onChange={(e) => setAddressDetails({ ...addressDetails, street: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none transition"
                />
              </div>

              {/* 2. ភូមិ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <span>🏡</span> <span>ភូមិ (Village / Phum)</span>
                </label>
                <input
                  type="text"
                  placeholder="ឧ. ភូមិ ១, ភូមិក្បាលទំនប់..."
                  value={addressDetails.village}
                  onChange={(e) => setAddressDetails({ ...addressDetails, village: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition"
                />
              </div>

              {/* 3. សង្កាត់ / ឃុំ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <span>📍</span> <span>សង្កាត់ / ឃុំ (Sangkat / Commune) *</span>
                </label>
                <input
                  type="text"
                  placeholder="ឧ. សង្កាត់បឹងទំពុន, សង្កាត់ផ្សារដើមគរ..."
                  value={addressDetails.sangkat}
                  onChange={(e) => setAddressDetails({ ...addressDetails, sangkat: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition"
                />
              </div>

              {/* 4. ខណ្ឌ / ស្រុក / ក្រុង */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <span>🏙️</span> <span>ខណ្ឌ / ស្រុក / ក្រុង (Khan / District) *</span>
                </label>
                <input
                  type="text"
                  placeholder="ឧ. ខណ្ឌមានជ័យ, ខណ្ឌទួលគោក, ក្រុងសៀមរាប..."
                  value={addressDetails.district}
                  onChange={(e) => setAddressDetails({ ...addressDetails, district: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition"
                />
              </div>

              {/* 5. រាជធានី / ខេត្ត */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <span>🏛️</span> <span>រាជធានី / ខេត្ត (Province / City) *</span>
                </label>
                <select
                  value={addressDetails.province}
                  onChange={(e) => {
                    const prov = e.target.value;
                    setAddressDetails({ ...addressDetails, province: prov });
                    setActiveProvince(prov);
                  }}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition cursor-pointer"
                >
                  {Object.keys(PROVINCE_COORDINATES).map((prov) => (
                    <option key={prov} value={prov}>
                      {PROVINCE_COORDINATES[prov].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. ចំណាំទីតាំងបន្ថែម (Landmark / Note) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>🚩</span> <span>ចំណាំទីតាំងបន្ថែម (Landmark / Direction)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">ស្រេចចិត្ត</span>
                </label>
                <input
                  type="text"
                  placeholder="ឧ. ទល់មុខផ្សារ..., ជិតស្តុប..., ផ្ទះវីឡាពណ៌ស, ហាងកាហ្វេ..."
                  value={addressDetails.landmark}
                  onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400"
                />
              </div>

            </div>

            {/* Bottom Action Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalStep('MAP')}
                className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                ← ថយទៅផែនទី
              </button>
              <button
                type="button"
                onClick={handleFinalConfirmLocation}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/25 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <span>✅</span>
                <span>បញ្ជាក់ទីតាំង និងដាក់ក្នុងវិក្កយបត្រ</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
