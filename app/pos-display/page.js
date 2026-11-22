'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabase';

function CustomerDisplayContent() {
  const searchParams = useSearchParams();
  const urlStoreParam = searchParams.get('store') || searchParams.get('storeId') || '';

  const getTargetStoreKey = () => {
    if (urlStoreParam) return urlStoreParam;
    if (typeof window !== 'undefined') {
      try {
        const adminStore = localStorage.getItem('sabay_admin_active_store');
        if (adminStore) {
          const parsed = JSON.parse(adminStore);
          if (parsed?.slug || parsed?.id) return parsed.slug || parsed.id;
        }
        const activeStore = localStorage.getItem('sabay_active_store');
        if (activeStore) {
          const parsed = JSON.parse(activeStore);
          if (parsed?.slug || parsed?.id) return parsed.slug || parsed.id;
        }
      } catch (_) {}
    }
    return 'default';
  };

  const targetStoreKey = getTargetStoreKey();
  const isTenant = targetStoreKey !== 'default' && targetStoreKey !== 'sabay-luk' && targetStoreKey !== 'store_default_sabayluk';

  const [displayState, setDisplayState] = useState({
    status: 'idle', // 'idle' | 'scanning' | 'checkout' | 'completed'
    items: [],
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    taxRate: 0,
    grandTotal: 0,
    exchangeRate: 4100,
    paymentMethod: 'KHQR',
    qrCodeUrl: isTenant ? '' : '/khqr-aba.jpg',
    cashReceived: 0,
    changeAmount: 0,
    receiptNo: '',
    customerName: '',
    storeName: isTenant ? 'ហាងរបស់ខ្ញុំ' : 'SABAY LUK',
    lastUpdated: 0
  });

  const [mounted, setMounted] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const lastUpdatedRef = useRef(0);
  const bcRef = useRef(null);

  // Featured promo shoes for Idle mode
  const featuredSlides = [
    {
      title: 'ស្បែកជើងប៉ាតាទាន់សម័យ Sneaker Pro',
      subtitle: 'ការរចនាបែប Sporty ទន់ស្រួលពាក់ និងធន់រឹងមាំ',
      badge: '🔥 ទំនិញលក់ដាច់បំផុត',
      price: '$28.00',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'ស្បែកជើងស្បែកបុរស Classic Oxford',
      subtitle: 'ស្បែកសុទ្ធ ១០០% ស័ក្តិសមសម្រាប់ការងារ និងកម្មវិធីធំៗ',
      badge: '✨ VIP Premium Style',
      price: '$45.00',
      image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&auto=format&fit=crop&q=80'
    },
    {
      title: 'ស្បែកជើងកែងនារី Elegant Heels',
      subtitle: 'ទន់ស្រួលជើង កែងរឹងមាំ បង្កើនភាពជឿជាក់គ្រប់ជំហាន',
      badge: '💖 New Collection',
      price: '$32.00',
      image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=80'
    }
  ];

  // Helper to safely apply new state (with strict multi-tenant validation)
  const applyState = (data) => {
    if (!data || typeof data !== 'object') return;
    // Strict isolation: if payload has store identity and this display has targetStoreKey, reject if mismatched
    if (isTenant && data.storeSlug && data.storeId) {
      if (data.storeSlug !== targetStoreKey && data.storeId !== targetStoreKey) {
        return; // Reject other store's payload!
      }
    }
    setDisplayState(prev => ({
      ...prev,
      ...data,
      items: Array.isArray(data.items) ? data.items : prev.items
    }));
    setIsConnected(true);
    if (data.lastUpdated) {
      lastUpdatedRef.current = data.lastUpdated;
    }
  };

  // 1. Digital clock & theme initial load
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('sabay_customer_display_theme');
      if (savedTheme === 'dark') setIsDarkTheme(true);
      else if (savedTheme === 'light') setIsDarkTheme(false);
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sabay_customer_display_theme', next ? 'dark' : 'light');
      }
      return next;
    });
  };

  // 2. Slide auto-change in Idle mode
  useEffect(() => {
    if (displayState.status !== 'idle' || displayState.items?.length > 0) return;
    const slideTimer = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % featuredSlides.length);
    }, 4500);
    return () => clearInterval(slideTimer);
  }, [displayState.status, displayState.items]);

  // 3. Multi-tier Realtime Synchronization Scoped per Store (BroadcastChannel + LocalStorage + Window Msg + Polling + Supabase)
  useEffect(() => {
    if (typeof window !== 'undefined') return;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const bcChannelName = targetStoreKey !== 'default' ? `sabay_pos_customer_display_${targetStoreKey}` : 'sabay_pos_customer_display';
    const storageKey = targetStoreKey !== 'default' ? `sabay_pos_customer_display_state_${targetStoreKey}` : 'sabay_pos_customer_display_state';
    const supabaseChannelName = targetStoreKey !== 'default' ? `pos_customer_display_realtime_${targetStoreKey}` : 'pos_customer_display_realtime';

    // A. Initial load from store-scoped LocalStorage immediately
    try {
      const saved = localStorage.getItem(storageKey) || (targetStoreKey === 'default' ? localStorage.getItem('sabay_pos_customer_display_state') : null);
      if (saved) {
        applyState(JSON.parse(saved));
      }
    } catch (e) {}

    // B. Persistent BroadcastChannel (0ms sync)
    let bc = null;
    try {
      bc = new BroadcastChannel(bcChannelName);
      bcRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data && typeof event.data === 'object' && event.data.type !== 'REQUEST_LATEST_STATE') {
          applyState(event.data);
        }
      };
      // Immediately request latest state from POS
      bc.postMessage({ type: 'REQUEST_LATEST_STATE', storeKey: targetStoreKey });
    } catch (e) {}

    // C. Window postMessage listener (for direct popup communication)
    const handleMessage = (e) => {
      if (e.data && (e.data.type === 'POS_STATE_UPDATE' || e.data.status)) {
        const payload = e.data.payload || e.data;
        applyState(payload);
      }
    };
    window.addEventListener('message', handleMessage);

    // D. Storage Event (backup across tabs/windows)
    const handleStorage = (e) => {
      if (!e || !e.key || e.key === storageKey || (targetStoreKey === 'default' && e.key === 'sabay_pos_customer_display_state')) {
        try {
          const raw = localStorage.getItem(storageKey) || (targetStoreKey === 'default' ? localStorage.getItem('sabay_pos_customer_display_state') : null);
          if (raw) applyState(JSON.parse(raw));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // E. ⭐️ Active 300ms Heartbeat Polling Loop (100% Guaranteed Fail-Safe Sync) ⭐️
    const pollTimer = setInterval(() => {
      try {
        const raw = localStorage.getItem(storageKey) || (targetStoreKey === 'default' ? localStorage.getItem('sabay_pos_customer_display_state') : null);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.lastUpdated && parsed.lastUpdated !== lastUpdatedRef.current) {
            applyState(parsed);
          }
        }
      } catch (err) {}
    }, 300);

    // F. Supabase Realtime broadcast (For wireless iPad on counter)
    const subChannel = supabase
      .channel(supabaseChannelName)
      .on('broadcast', { event: 'display_update' }, (payload) => {
        if (payload && payload.payload) {
          applyState(payload.payload);
        }
      })
      .subscribe();

    return () => {
      if (bc) {
        try { bc.close(); } catch(e) {}
        bcRef.current = null;
      }
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollTimer);
      supabase.removeChannel(subChannel);
    };
  }, [targetStoreKey]);

  // Fullscreen toggle helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const currentSlide = featuredSlides[featuredIndex];
  const hasItems = Array.isArray(displayState.items) && displayState.items.length > 0;
  const isScanningOrHasItems = displayState.status === 'scanning' || (displayState.status === 'idle' && hasItems);
  const itemsCount = displayState.items?.reduce((s, it) => s + (it.qty || 1), 0) || 0;
  const grandTotalUSD = Number(displayState.grandTotal || 0);
  const grandTotalKHR = Math.round(grandTotalUSD * (displayState.exchangeRate || 4100));

  return (
    <>
      {/* Fallback Font & Styling Header */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Kantumruy+Pro:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: `
        * { font-family: 'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}} />

      <div className={`min-h-screen flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-hidden transition-colors duration-300 ${
        isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        
        {/* Background Ambient Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl transition-opacity duration-500 ${
            isDarkTheme ? 'bg-orange-500/15 animate-pulse' : 'bg-orange-300/20'
          }`}></div>
          <div className={`absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full blur-3xl transition-opacity duration-500 ${
            isDarkTheme ? 'bg-blue-600/10' : 'bg-amber-200/25'
          }`}></div>
          <div className={`absolute -bottom-40 left-1/3 w-96 h-96 rounded-full blur-3xl transition-opacity duration-500 ${
            isDarkTheme ? 'bg-emerald-500/10' : 'bg-emerald-200/20'
          }`}></div>
        </div>

        {/* TOP HEADER BAR */}
        <header className={`relative z-20 backdrop-blur-md px-6 py-3.5 flex items-center justify-between transition-colors duration-300 ${
          isDarkTheme 
            ? 'border-b border-slate-800/80 bg-slate-950/85' 
            : 'border-b border-gray-200/90 bg-white/95 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/25">
              👟
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`font-black text-xl tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  {displayState.storeName || 'SABAY LUK'}
                </h1>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isDarkTheme 
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                    : 'bg-orange-100 text-orange-700 border-orange-300'
                }`}>
                  Customer Display
                </span>
              </div>
              <p className={`text-[11px] font-bold ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                ហាងលក់ស្បែកជើងទាន់សម័យ & គុណភាពខ្ពស់
              </p>
            </div>
          </div>

          {/* Center: Live Connection status */}
          <div className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
            isDarkTheme 
              ? 'bg-slate-900/90 border border-slate-800 text-slate-300 shadow-inner' 
              : 'bg-white border border-gray-200 text-slate-700 shadow-2xs'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
            <span>
              {displayState.status === 'idle' && !hasItems && '🟢 រង់ចាំការកុម្ម៉ង់ (Ready for Orders)'}
              {isScanningOrHasItems && '🛍️ កំពុងគិតលុយទំនិញ (Scanning Items...)'}
              {displayState.status === 'checkout' && '💳 កំពុងរង់ចាំការទូទាត់ (Awaiting Payment)'}
              {displayState.status === 'completed' && '🎉 ទូទាត់ជោគជ័យ (Payment Success)'}
            </span>
          </div>

          {/* Right: Clock & Theme Toggle & Fullscreen button */}
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden md:block" suppressHydrationWarning>
              <div className={`font-mono font-black text-base tracking-wider ${
                isDarkTheme ? 'text-amber-400' : 'text-orange-600'
              }`}>
                {mounted ? currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
              </div>
              <div className={`text-[10px] font-bold ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                {mounted ? currentTime.toLocaleDateString('km-KH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Sabay Luk POS'}
              </div>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base border transition cursor-pointer ${
                isDarkTheme
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-slate-700 border-gray-200 shadow-2xs'
              }`}
              title={isDarkTheme ? 'ប្តូរទៅផ្ទាំងពណ៌ស (Switch to Light Mode)' : 'ប្តូរទៅផ្ទាំងពណ៌ងងឹត (Switch to Dark Mode)'}
            >
              {isDarkTheme ? '☀️' : '🌙'}
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg border transition cursor-pointer ${
                isDarkTheme
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-slate-700 hover:text-slate-900 border-gray-200 shadow-2xs'
              }`}
              title="ពង្រីកពេញអេក្រង់ (Toggle Fullscreen)"
            >
              {isFullscreen ? '⤦' : '⤢'}
            </button>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="relative z-10 flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-center max-w-7xl mx-auto w-full">
          
          {/* ======================================================== */}
          {/* MODE 1: IDLE / WELCOME STATE (Cart is empty)              */}
          {/* ======================================================== */}
          {displayState.status === 'idle' && !hasItems && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in zoom-in-95 duration-300">
              
              {/* Left Column: Big Welcome Greetings & Store Brand */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className={`inline-flex items-center gap-2 border px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${
                  isDarkTheme 
                    ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/40 text-orange-400' 
                    : 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300 text-orange-800'
                }`}>
                  <span>👋</span>
                  <span>សូមស្វាគមន៍មកកាន់ហាងយើងខ្ញុំ!</span>
                </div>

                <div className="space-y-2">
                  <h2 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${
                    isDarkTheme ? 'text-white' : 'text-slate-950'
                  }`}>
                    {displayState.storeName || 'SABAY LUK'}
                  </h2>
                  <h3 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
                    ស្បែកជើងទាន់សម័យ & ផាសុកភាព
                  </h3>
                  <p className={`text-sm sm:text-base max-w-xl font-medium leading-relaxed pt-2 ${
                    isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    ស្បែកជើងគុណភាពខ្ពស់ បាតទន់ស្រួលពាក់ រចនាម៉ូដទាន់សម័យ និងមានការធានាគុណភាពត្រឹមត្រូវជូនលោកអ្នក។
                  </p>
                </div>

                {/* Service Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
                  <div className={`p-3.5 rounded-2xl flex items-center gap-3 border transition ${
                    isDarkTheme 
                      ? 'bg-slate-900/80 border-slate-800' 
                      : 'bg-white border-gray-200 shadow-sm'
                  }`}>
                    <span className="text-2xl">✨</span>
                    <div className="text-left">
                      <span className={`text-xs font-black block ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>គុណភាពខ្ពស់</span>
                      <span className={`text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>ស្បែកសុទ្ធ & បាតទន់</span>
                    </div>
                  </div>
                  <div className={`p-3.5 rounded-2xl flex items-center gap-3 border transition ${
                    isDarkTheme 
                      ? 'bg-slate-900/80 border-slate-800' 
                      : 'bg-white border-gray-200 shadow-sm'
                  }`}>
                    <span className="text-2xl">⚡</span>
                    <div className="text-left">
                      <span className={`text-xs font-black block ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>KHQR Pay</span>
                      <span className={`text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>ស្កេនគ្រប់ធនាគារ</span>
                    </div>
                  </div>
                  <div className={`p-3.5 rounded-2xl flex items-center gap-3 col-span-2 sm:col-span-1 border transition ${
                    isDarkTheme 
                      ? 'bg-slate-900/80 border-slate-800' 
                      : 'bg-white border-gray-200 shadow-sm'
                  }`}>
                    <span className="text-2xl">🤝</span>
                    <div className="text-left">
                      <span className={`text-xs font-black block ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>ប្តូរទំហំបាន</span>
                      <span className={`text-[10px] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>ក្នុងរយៈពេល ៣ ថ្ងៃ</span>
                    </div>
                  </div>
                </div>

                {/* Cashier status notice */}
                <div className={`p-4 rounded-2xl border border-dashed flex items-center gap-3 text-xs ${
                  isDarkTheme 
                    ? 'bg-slate-900/50 border-slate-800 text-slate-400' 
                    : 'bg-orange-50/70 border-orange-200 text-slate-700'
                }`}>
                  <span className="text-xl">💳</span>
                  <span>អ្នកគិតលុយកំពុងរៀបចំប្រព័ន្ធ... សូមរង់ចាំការស្កេនទំនិញរបស់អ្នក!</span>
                </div>
              </div>

              {/* Right Column: Featured Shoe Showcase Banner */}
              <div className="lg:col-span-5">
                <div className={`relative rounded-3xl overflow-hidden border-2 group shadow-2xl transition max-h-[460px] ${
                  isDarkTheme ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'
                }`}>
                  <div className="aspect-[4/3] w-full overflow-hidden relative max-h-[380px]">
                    <img 
                      src={currentSlide.image} 
                      alt={currentSlide.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                    
                    {/* Badge */}
                    <span className="absolute top-4 left-4 bg-orange-600/90 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
                      {currentSlide.badge}
                    </span>

                    {/* Price */}
                    <span className="absolute top-4 right-4 bg-slate-950/80 text-amber-300 border border-amber-400/40 font-mono font-black text-sm px-3.5 py-1 rounded-full shadow-lg backdrop-blur-md">
                      {currentSlide.price}
                    </span>

                    {/* Caption */}
                    <div className="absolute bottom-4 left-4 right-4 space-y-1">
                      <h4 className="text-lg sm:text-xl font-black text-white drop-shadow-md">{currentSlide.title}</h4>
                      <p className="text-xs text-slate-200 line-clamp-1">{currentSlide.subtitle}</p>
                    </div>
                  </div>

                  {/* Slider indicators */}
                  <div className={`p-3 flex items-center justify-center gap-2 border-t ${
                    isDarkTheme ? 'bg-slate-950/90 border-slate-800' : 'bg-white border-gray-200'
                  }`}>
                    {featuredSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setFeaturedIndex(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === featuredIndex ? 'w-8 bg-orange-500' : isDarkTheme ? 'w-2 bg-slate-700 hover:bg-slate-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                        }`}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2: ACTIVE SCANNING STATE (Live cart sync with Cashier) */}
          {/* ======================================================== */}
          {isScanningOrHasItems && displayState.status !== 'checkout' && displayState.status !== 'completed' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch animate-in fade-in duration-200">
              
              {/* Left: Scanned Items List */}
              <div className={`lg:col-span-7 flex flex-col rounded-3xl border p-5 shadow-xl backdrop-blur-md max-h-[72vh] transition ${
                isDarkTheme 
                  ? 'bg-slate-900/85 border-slate-800' 
                  : 'bg-white border-gray-200 shadow-md'
              }`}>
                <div className={`flex items-center justify-between pb-3.5 border-b mb-3 ${
                  isDarkTheme ? 'border-slate-800' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛍️</span>
                    <h3 className={`font-black text-lg ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                      ទំនិញដែលបានស្កេន (Scanned Items)
                    </h3>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                    isDarkTheme 
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                      : 'bg-orange-100 text-orange-700 border-orange-300'
                  }`}>
                    {itemsCount} មុខទំនិញ
                  </span>
                </div>

                {/* Items Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {displayState.items?.map((item, idx) => {
                    const rowTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
                    return (
                      <div 
                        key={item.cartItemId || idx}
                        className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 border transition ${
                          isDarkTheme 
                            ? 'bg-slate-950/70 border-slate-800/80 hover:border-orange-500/40' 
                            : 'bg-slate-50/90 border-gray-200/90 hover:border-orange-400 hover:bg-white shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center ${
                            isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-2xs'
                          }`}>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">👟</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className={`font-black text-sm truncate ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                              {item.name}
                            </h4>
                            <div className={`flex items-center gap-2 mt-0.5 text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                              {item.size && (
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                  isDarkTheme ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-slate-800'
                                }`}>
                                  Size: {item.size}
                                </span>
                              )}
                              {item.color && (
                                <span className="text-[10px] font-bold">
                                  • {item.color}
                                </span>
                              )}
                              <span className={`font-mono ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                                ${Number(item.price).toFixed(2)} × {item.qty}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`font-mono font-black text-base ${isDarkTheme ? 'text-amber-400' : 'text-orange-600'}`}>
                            ${rowTotal.toFixed(2)}
                          </div>
                          <div className={`text-[10px] font-bold ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                            {(rowTotal * (displayState.exchangeRate || 4100)).toLocaleString()} ៛
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Tip */}
                <div className={`pt-3 border-t mt-2 flex items-center justify-between text-xs ${
                  isDarkTheme ? 'border-slate-800/80 text-slate-500' : 'border-gray-200 text-slate-500'
                }`}>
                  <span>💡 សូមពិនិត្យមើលទំនិញ និងទំហំស្បែកជើងឱ្យបានត្រឹមត្រូវ</span>
                  <span className={`font-mono ${isDarkTheme ? 'text-slate-400' : 'text-slate-600'}`}>
                    1 USD = {(displayState.exchangeRate || 4100).toLocaleString()} KHR
                  </span>
                </div>
              </div>

              {/* Right: Big Price Board & Summary */}
              <div className={`lg:col-span-5 flex flex-col justify-between rounded-3xl border-2 p-6 shadow-2xl backdrop-blur-md transition ${
                isDarkTheme 
                  ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-orange-500/30' 
                  : 'bg-white border-orange-300 shadow-xl'
              }`}>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between pb-3 border-b ${
                    isDarkTheme ? 'border-slate-800' : 'border-gray-200'
                  }`}>
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      isDarkTheme ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      សង្ខេបការទូទាត់ (Payment Summary)
                    </span>
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      <span className="animate-ping">●</span> កំពុងគិតលុយ (Live)
                    </span>
                  </div>

                  {/* Subtotal */}
                  <div className={`flex justify-between items-center text-sm font-bold ${
                    isDarkTheme ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span>តម្លៃសរុប (Subtotal):</span>
                    <span className={`font-mono text-base ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                      ${Number(displayState.subtotal || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Discount (if any) */}
                  {Number(displayState.discountAmount || 0) > 0 && (
                    <div className={`flex justify-between items-center text-sm font-bold px-3 py-1.5 rounded-xl border ${
                      isDarkTheme 
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}>
                      <span>បញ្ចុះតម្លៃ (Discount):</span>
                      <span className="font-mono font-black text-base">
                        -${Number(displayState.discountAmount).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Tax (if any) */}
                  {Number(displayState.taxAmount || 0) > 0 && (
                    <div className={`flex justify-between items-center text-sm font-bold ${
                      isDarkTheme ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      <span>ពន្ធអាករ VAT ({displayState.taxRate || 10}%):</span>
                      <span className={`font-mono text-base ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                        +${Number(displayState.taxAmount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* GIANT GRAND TOTAL BOX */}
                <div className={`my-6 p-6 rounded-3xl border-2 text-center space-y-2 shadow-xl ${
                  isDarkTheme 
                    ? 'bg-gradient-to-tr from-orange-500/20 via-amber-500/15 to-orange-600/10 border-orange-500/40 shadow-orange-500/10' 
                    : 'bg-gradient-to-tr from-orange-50 via-amber-50 to-orange-100/70 border-orange-400 shadow-orange-500/10'
                }`}>
                  <span className={`text-xs font-black uppercase tracking-widest block ${
                    isDarkTheme ? 'text-orange-400' : 'text-orange-700'
                  }`}>
                    ទឹកប្រាក់ត្រូវទូទាត់សរុប (TOTAL DUE)
                  </span>
                  
                  <div className={`text-5xl sm:text-6xl font-black font-mono tracking-tight drop-shadow-sm ${
                    isDarkTheme ? 'text-amber-300' : 'text-orange-600'
                  }`}>
                    ${grandTotalUSD.toFixed(2)}
                  </div>

                  <div className={`text-xl sm:text-2xl font-black ${
                    isDarkTheme ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    ≈ {grandTotalKHR.toLocaleString()} រៀល (៛)
                  </div>
                </div>

                {/* Ready for Payment Notice */}
                <div className={`p-3.5 rounded-2xl border text-center text-xs flex items-center justify-center gap-2 ${
                  isDarkTheme 
                    ? 'bg-slate-950/80 border-slate-800 text-slate-400' 
                    : 'bg-slate-50 border-gray-200 text-slate-700 shadow-2xs'
                }`}>
                  <span>⚡</span>
                  <span>ទទួលការទូទាត់តាម <b>Bakong / ABA KHQR</b> និង <b>សាច់ប្រាក់សុទ្ធ (Cash)</b></span>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 3: CHECKOUT / PAYMENT (Prominent KHQR Code)          */}
          {/* ======================================================== */}
          {displayState.status === 'checkout' && (
            <div className={`max-w-4xl mx-auto w-full rounded-3xl border-2 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 transition ${
              isDarkTheme ? 'bg-slate-900 border-orange-500/50' : 'bg-white border-orange-400 shadow-2xl'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                
                {/* Left: Summary & Instruction */}
                <div className="space-y-5 text-center md:text-left">
                  <div className={`inline-flex items-center gap-2 border px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    isDarkTheme 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    <span>💳</span>
                    <span>ដំណាក់កាលទូទាត់ប្រាក់ (Payment Due)</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className={`text-2xl sm:text-3xl font-black ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                      សូមស្កេនទូទាត់ប្រាក់
                    </h3>
                    <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                      លោកអ្នកអាចប្រើប្រាស់ App ធនាគារណាមួយក៏បាន ដើម្បីស្កេនទូទាត់ (ABA, ACLEDA, Bakong, Wing, Canadia...)
                    </p>
                  </div>

                  {/* Big Due Box */}
                  <div className={`p-5 rounded-2xl border text-left space-y-1 ${
                    isDarkTheme 
                      ? 'bg-slate-950 border-slate-800' 
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <span className={`text-[11px] font-bold block uppercase tracking-wider ${
                      isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      ចំនួនទឹកប្រាក់សរុប:
                    </span>
                    <div className={`text-4xl font-black font-mono ${
                      isDarkTheme ? 'text-amber-300' : 'text-orange-600'
                    }`}>
                      ${grandTotalUSD.toFixed(2)}
                    </div>
                    <div className={`text-lg font-bold ${
                      isDarkTheme ? 'text-slate-300' : 'text-slate-800'
                    }`}>
                      ≈ {grandTotalKHR.toLocaleString()} ៛
                    </div>
                  </div>

                  {/* Bank Support Logos */}
                  <div className="pt-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${
                      isDarkTheme ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      ទ្រទ្រង់គ្រប់ធនាគារសមាជិកបាគង (KHQR Standard):
                    </span>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {['ABA PAY', 'BAKONG', 'ACLEDA', 'WING', 'CANADIA'].map(b => (
                        <span key={b} className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                          isDarkTheme 
                            ? 'bg-slate-800 text-slate-300 border-slate-700' 
                            : 'bg-gray-100 text-slate-700 border-gray-200'
                        }`}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Giant KHQR Code Card */}
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-2xl border-4 border-red-500">
                  <div className="bg-red-600 text-white font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-widest mb-3 shadow-md flex items-center gap-1.5">
                    <span>🇰🇭</span>
                    <span>KHQR BAKONG PAYMENT</span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-inner flex items-center justify-center">
                    <img 
                      src={displayState.qrCodeUrl || '/khqr-aba.jpg'} 
                      alt="KHQR Code" 
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                    />
                  </div>

                  <div className="mt-3 text-center">
                    <span className="text-xs font-black text-gray-900 block font-mono">
                      {displayState.storeName || 'SABAY LUK STORE'}
                    </span>
                    <span className="text-[11px] text-gray-500 font-bold block">
                      Scan & Pay with Any Banking App
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 4: PAYMENT COMPLETED STATE (Success Celebration)    */}
          {/* ======================================================== */}
          {displayState.status === 'completed' && (
            <div className={`max-w-xl mx-auto w-full text-center border-2 rounded-3xl p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300 space-y-6 transition ${
              isDarkTheme 
                ? 'bg-slate-900 border-emerald-500/50' 
                : 'bg-white border-emerald-400 shadow-xl'
            }`}>
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-500 flex items-center justify-center text-5xl mx-auto shadow-xl shadow-emerald-500/25 animate-bounce">
                ✓
              </div>

              <div className="space-y-2">
                <h3 className={`text-3xl sm:text-4xl font-black ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                  ការទូទាត់ទទួលបានជោគជ័យ!
                </h3>
                <p className={`text-sm font-bold ${isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Payment Received Successfully!
                </p>
              </div>

              {/* Receipt detail snippet */}
              <div className={`p-5 rounded-2xl border text-sm space-y-2 text-left ${
                isDarkTheme ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-gray-200'
              }`}>
                {displayState.receiptNo && (
                  <div className={`flex justify-between border-b pb-1.5 font-bold ${
                    isDarkTheme ? 'border-slate-800' : 'border-gray-200'
                  }`}>
                    <span className={isDarkTheme ? 'text-slate-400' : 'text-slate-500'}>លេខវិក្កយបត្រ (Receipt No):</span>
                    <span className={`font-mono ${isDarkTheme ? 'text-amber-400' : 'text-orange-600'}`}>
                      #{displayState.receiptNo}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span className={isDarkTheme ? 'text-slate-400' : 'text-slate-500'}>ទឹកប្រាក់សរុប (Total Paid):</span>
                  <span className="text-emerald-500 font-mono text-base font-black">
                    ${grandTotalUSD.toFixed(2)} ({grandTotalKHR.toLocaleString()} ៛)
                  </span>
                </div>
                {Number(displayState.changeAmount || 0) > 0 && (
                  <div className={`flex justify-between border-t pt-1.5 font-black ${
                    isDarkTheme ? 'border-slate-800 text-amber-300' : 'border-gray-200 text-orange-600'
                  }`}>
                    <span>ប្រាក់អាប់ជូនភ្ញៀវ (Change):</span>
                    <span className="font-mono text-base text-amber-400">
                      ${Number(displayState.changeAmount).toFixed(2)} ({(Number(displayState.changeAmount) * (displayState.exchangeRate || 4100)).toLocaleString()} ៛)
                    </span>
                  </div>
                )}
              </div>

              <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                សូមអរគុណសម្រាប់ការគាំទ្រហាងយើងខ្ញុំ! សូមជូនពរលោកអ្នកជួបតែសំណាងល្អ និងសុខភាពល្អ។
              </p>
            </div>
          )}

        </main>

        {/* BOTTOM FOOTER STATUS */}
        <footer className={`relative z-20 px-6 py-3 text-center text-xs font-bold border-t transition-colors duration-300 ${
          isDarkTheme ? 'border-slate-800/80 bg-slate-950/85 text-slate-500' : 'border-gray-200 bg-white text-slate-400'
        }`}>
          <span>SABAY LUK POS • អេក្រង់អតិថិជន Live Realtime Customer Display</span>
        </footer>

      </div>
    </>
  );
}

export default function CustomerDisplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm font-bold">
        កំពុងដំណើរការអេក្រង់អតិថិជន...
      </div>
    }>
      <CustomerDisplayContent />
    </Suspense>
  );
}
