'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabase';

export default function OrderTrackingPage() {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [foundOrders, setFoundOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto search if query param ?q=, ?order=, ?id=, or ?phone= is provided
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const orderParam = params.get('q') || params.get('order') || params.get('id') || params.get('orderId');
      const phoneParam = params.get('phone');
      const q = (orderParam || phoneParam || '').replace(/^#/, '').trim();
      if (q) {
        setSearchInput(q);
        handleSearch(q);
      }
    }
  }, []);

  const handleSearch = async (queryToSearch) => {
    const rawQ = (queryToSearch || searchInput).trim();
    const q = rawQ.replace(/^#/, '').trim();
    if (!q) {
      setErrorMsg('សូមបញ្ចូលលេខទូរស័ព្ទ ឬលេខកូដកុម្ម៉ង់ (Order ID)!');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    setSearched(true);
    setFoundOrders([]);
    setSelectedOrder(null);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
      let orders = [];

      // 1. Search by order_id (text column)
      const { data: orderById, error: err1 } = await supabase
        .from('orders')
        .select('*')
        .or(`order_id.ilike.%${q}%,order_id.ilike.%#${q}%`)
        .order('created_at', { ascending: false });

      if (orderById && Array.isArray(orderById)) {
        orders.push(...orderById);
      }

      // 2. Search by id only if valid UUID format (prevents PostgreSQL 42883 error)
      if (isUuid) {
        const { data: byUuid } = await supabase
          .from('orders')
          .select('*')
          .eq('id', q);
        if (byUuid && Array.isArray(byUuid)) {
          orders.push(...byUuid);
        }
      }

      // 3. Search by phone number or customer name
      const { data: orderByPhone, error: err2 } = await supabase
        .from('orders')
        .select('*')
        .or(`phone.ilike.%${q}%,phone_number.ilike.%${q}%,customer_name.ilike.%${q}%`)
        .order('created_at', { ascending: false });

      if (orderByPhone && Array.isArray(orderByPhone)) {
        orders.push(...orderByPhone);
      }

      // 4. Fallback to localStorage if offline or local order
      if (orders.length === 0 && typeof window !== 'undefined') {
        try {
          const keys = ['sabay_real_orders', 'sabay_orders'];
          for (const k of keys) {
            const cached = localStorage.getItem(k);
            if (cached) {
              const list = JSON.parse(cached);
              const matched = list.filter(o => {
                const oid = (o.order_id || o.id || '').replace(/^#/, '').toLowerCase();
                const ph = (o.phone || o.phone_number || '').toLowerCase();
                const cust = (o.customer_name || o.customer || '').toLowerCase();
                const target = q.toLowerCase();
                return oid.includes(target) || ph.includes(target) || cust.includes(target);
              });
              if (matched.length > 0) {
                orders.push(...matched);
              }
            }
          }
        } catch (localErr) {
          console.error('LocalStorage search fallback error:', localErr);
        }
      }

      // 5. Deduplicate orders by id or order_id
      const unique = [];
      const seen = new Set();
      for (const item of orders) {
        const key = item.order_id || item.id;
        if (key && !seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      setFoundOrders(unique);
      if (unique.length > 0) {
        setSelectedOrder(unique[0]);
      }
    } catch (err) {
      console.error('Tracking search error:', err);
      setErrorMsg('មានបញ្ហាក្នុងការស្វែងរក សូមព្យាយាមម្តងទៀត។');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Determine delivery status step (1 to 4)
  const getStatusStep = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed' || s === 'ជោគជ័យ' || s === 'បានទទួល') return 4;
    if (s === 'shipping' || s === 'shipped' || s === 'dispatched' || s === 'delivering' || s === 'កំពុងដឹក') return 3;
    if (s === 'processing' || s === 'preparing' || s === 'packed' || s === 'កំពុងរៀបចំ') return 2;
    return 1; // Pending / Received
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#ff6a00] selection:text-white flex flex-col justify-between">
      
      {/* Background Decorative Accents (Soft & Subtle for White/Light Theme) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-100/60 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl"></div>
      </div>

      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff6a00] to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
              🛍️
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                SABAY LUK
                <span className="text-[10px] bg-orange-100 text-[#ff6a00] border border-orange-200 font-black px-1.5 py-0.2 rounded-md font-mono">
                  TRACK
                </span>
              </span>
              <p className="text-[10px] text-slate-500 font-medium">ប្រព័ន្ធតាមដានការដឹកជញ្ជូនឥវ៉ាន់</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-bold text-slate-700 hover:text-black bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-200 transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>←</span>
              <span>ទៅកាន់មុខហាង</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-8 relative z-10 w-full flex-1">
        {/* Hero Section */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-[#ff6a00] border border-orange-200 uppercase tracking-wider shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#ff6a00] animate-pulse"></span>
            🚚 តាមដានឥវ៉ាន់របស់អ្នក (ORDER TRACKING)
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            ពិនិត្យមើលស្ថានភាពឥវ៉ាន់
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            វាយបញ្ចូលលេខទូរស័ព្ទ ឬលេខកូដវិក្កយបត្រ (Order ID) ដើម្បីពិនិត្យមើលដំណើរការដឹកជញ្ជូនភ្លាមៗ
          </p>
        </div>

        {/* Search Input Box (Clean White / Light Shadow Card) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row gap-2 mb-8"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="វាយលេខទូរស័ព្ទ ឧ. 0967205522 ឬ ONL-xxxxxx..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl pl-10 pr-4 py-3.5 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/20 transition"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
              🔍
            </span>
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-[#ff6a00] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl sm:rounded-2xl transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>កំពុងស្វែងរក...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>តាមដានឥវ៉ាន់</span>
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Results Area */}
        {searched && !loading && (
          <div>
            {foundOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/40 text-center space-y-3">
                <div className="text-5xl opacity-80">📦</div>
                <h3 className="text-base font-black text-slate-900">
                  រកមិនឃើញការកុម្ម៉ង់ទាក់ទងនឹង &ldquo;{searchInput}&rdquo; ឡើយ
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  សូមពិនិត្យមើលលេខទូរស័ព្ទ ឬលេខកូដកុម្ម៉ង់ឱ្យបានត្រឹមត្រូវ ឬទាក់ទងមកកាន់ក្រុមការងារយើងខ្ញុំតាមរយៈ Telegram។
                </p>
                <div className="pt-2">
                  <a
                    href="https://t.me/Sabayluk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-[#24A1DE] hover:bg-[#1f8ec4] text-white text-xs font-black px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
                  >
                    <span>💬</span>
                    <span>ឆាតសួរក្នុង Telegram</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* If multiple orders found, show selector tabs */}
                {foundOrders.length > 1 && (
                  <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2 overflow-x-auto">
                    {foundOrders.map((ord, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                          (selectedOrder?.order_id || selectedOrder?.id) === (ord.order_id || ord.id)
                            ? 'bg-[#ff6a00] text-white shadow-md shadow-orange-500/25'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        <span>📦</span>
                        <span>{ord.order_id || `Order #${idx + 1}`}</span>
                        <span className="text-[10px] opacity-80">
                          (${Number(ord.total_amount || ord.total || 0).toFixed(2)})
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Order Full Details Card */}
                {selectedOrder && (() => {
                  const step = getStatusStep(selectedOrder.status);
                  const items = (selectedOrder.items && Array.isArray(selectedOrder.items) ? selectedOrder.items : []).filter(it => !it.is_tax_meta);
                  const orderDate = selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('km-KH') : 'ថ្មីៗនេះ';

                  const rawAddress = selectedOrder.address || selectedOrder.delivery_address || '';
                  const mapMatch = rawAddress.match(/Maps:\s*(https?:\/\/[^\s\]]+)/i) || 
                                   rawAddress.match(/(https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s\]]+)/i);
                  const gMapUrl = selectedOrder.google_map_url || items[0]?.google_map_url || (mapMatch ? mapMatch[1] : null);

                  const photoMatch = rawAddress.match(/រូបផ្ទះ:\s*(https?:\/\/[^\s\]]+)/i);
                  const locPhotoUrl = selectedOrder.location_photo_url || items[0]?.location_photo_url || (photoMatch ? photoMatch[1] : null);

                  const cleanAddress = rawAddress.replace(/\[📍 Maps:.*?\]/gi, '').replace(/\[🏠 រូបផ្ទះ:.*?\]/gi, '').trim();

                  const slipUrl = selectedOrder.payment_slip_url || items[0]?.payment_slip_url || null;

                  return (
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-200/50">
                      
                      {/* Order Header Info */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold">លេខកូដកុម្ម៉ង់:</span>
                            <span className="text-lg font-black text-[#ff6a00] font-mono">
                              #{selectedOrder.order_id || selectedOrder.id}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                              {selectedOrder.order_type || 'ONLINE'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            កាលបរិច្ឆេទ: <b className="text-slate-700">{orderDate}</b>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                            step === 4
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : step === 3
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : step === 2
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {step === 4 ? '✓ ដឹកដល់ជោគជ័យ' : step === 3 ? '🚚 កំពុងដឹកជញ្ជូន' : step === 2 ? '📦 កំពុងរៀបចំឥវ៉ាន់' : '📝 បានទទួលការកុម្ម៉ង់'}
                          </span>
                        </div>
                      </div>

                      {/* ⭐️ VISUAL DELIVERY PROGRESS TRACKER (STEPPER) ⭐️ */}
                      <div className="py-4">
                        <div className="grid grid-cols-4 relative">
                          {/* Connecting Progress Line */}
                          <div className="absolute top-5 left-[12%] right-[12%] h-1.5 bg-slate-100 rounded-full -z-0">
                            <div
                              className="h-full bg-gradient-to-r from-[#ff6a00] via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${((step - 1) / 3) * 100}%` }}
                            />
                          </div>

                          {/* Step 1 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition ${
                              step >= 1 ? 'bg-[#ff6a00] text-white shadow-orange-500/25 ring-4 ring-orange-100' : 'bg-slate-100 text-slate-400'
                            }`}>
                              📝
                            </div>
                            <span className="text-[11px] font-black text-slate-900 mt-2">បានកុម្ម៉ង់</span>
                            <span className="text-[9px] text-slate-400">Order Placed</span>
                          </div>

                          {/* Step 2 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition ${
                              step >= 2 ? 'bg-amber-500 text-white shadow-amber-500/25 ring-4 ring-amber-100' : 'bg-slate-100 text-slate-400'
                            }`}>
                              📦
                            </div>
                            <span className="text-[11px] font-black text-slate-900 mt-2">កំពុងរៀបចំ</span>
                            <span className="text-[9px] text-slate-400">Processing</span>
                          </div>

                          {/* Step 3 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition ${
                              step >= 3 ? 'bg-blue-600 text-white shadow-blue-500/25 ring-4 ring-blue-100' : 'bg-slate-100 text-slate-400'
                            }`}>
                              🚚
                            </div>
                            <span className="text-[11px] font-black text-slate-900 mt-2">កំពុងដឹក</span>
                            <span className="text-[9px] text-slate-400">On The Way</span>
                          </div>

                          {/* Step 4 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition ${
                              step >= 4 ? 'bg-emerald-500 text-white shadow-emerald-500/25 ring-4 ring-emerald-100' : 'bg-slate-100 text-slate-400'
                            }`}>
                              ✅
                            </div>
                            <span className="text-[11px] font-black text-slate-900 mt-2">បានទទួល</span>
                            <span className="text-[9px] text-slate-400">Delivered</span>
                          </div>
                        </div>
                      </div>

                      {/* Recipient & Shipping Information Card */}
                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 text-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                          <span className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <span>👤</span> ព័ត៌មានអ្នកទទួល & ទីតាំងដឹកជញ្ជូន
                          </span>
                          <span className="text-[11px] text-slate-500">
                            វិធីទូទាត់: <b className="text-slate-900 uppercase">{selectedOrder.payment_method || selectedOrder.payment || 'Cash'}</b>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-slate-400 block text-[10px]">ឈ្មោះអ្នកទទួល:</span>
                            <span className="font-black text-slate-900 text-sm">{selectedOrder.customer_name || 'អតិថិជន'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">លេខទូរស័ព្ទ:</span>
                            <a href={`tel:${selectedOrder.phone || selectedOrder.phone_number || ''}`} className="font-black text-blue-600 hover:underline text-sm">
                              📞 {selectedOrder.phone || selectedOrder.phone_number || 'មិនមានលេខ'}
                            </a>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px]">អាសយដ្ឋានដឹកជញ្ជូន:</span>
                          <p className="font-bold text-slate-800 mt-0.5 leading-relaxed">
                            📍 {cleanAddress || 'មិនបានបញ្ជាក់'}
                          </p>
                        </div>

                        {/* Google Maps Button */}
                        {gMapUrl && (
                          <div className="pt-1">
                            <a 
                              href={gMapUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer"
                            >
                              <span>🗺️</span>
                              <span>បើកមើលទីតាំងលើ Google Maps ↗</span>
                            </a>
                          </div>
                        )}

                        {/* House Location Photo */}
                        {locPhotoUrl && (
                          <div className="pt-2 border-t border-slate-200/80">
                            <span className="text-[10px] font-black text-slate-700 block mb-1.5">
                              🏠 រូបថតទីតាំង / ផ្ទះទទួលទំនិញ:
                            </span>
                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                              <img 
                                src={locPhotoUrl} 
                                alt="Location" 
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-2xs"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800">រូបថតបញ្ជាក់ទីតាំងផ្ទះ</p>
                                <a 
                                  href={locPhotoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline font-bold text-[10px] mt-1 inline-block"
                                >
                                  🔍 ពង្រីកមើលរូបភាព ↗
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ordered Items List */}
                      <div className="space-y-3">
                        <span className="text-xs font-black uppercase text-slate-900 tracking-wider block flex items-center gap-1.5">
                          <span>📦</span> ទំនិញដែលបានកុម្ម៉ង់ ({items.length} មុខ)
                        </span>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                                  <img 
                                    src={it.image_url || it.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80'} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80';
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-slate-900 truncate">{it.name}</h4>
                                  <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-500 mt-0.5 font-bold">
                                    {it.size && it.size !== 'N/A' && <span className="bg-white text-[#ff6a00] border border-slate-200 px-1.5 py-0.2 rounded">Size: {it.size}</span>}
                                    {it.color && it.color !== 'N/A' && <span className="bg-white text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded">{it.color}</span>}
                                    <span className="text-slate-400 font-mono">x{it.qty || 1}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-black text-slate-900 font-mono block">
                                  ${((Number(it.price) || 0) * (it.qty || 1)).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">@${Number(it.price || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Slip Preview in Tracking */}
                      {slipUrl && (
                        <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                              <span>🧾</span> វិក្កយបត្រផ្ទេរប្រាក់ KHQR (Payment Slip):
                            </span>
                            <a 
                              href={slipUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[11px] font-black text-blue-600 hover:text-blue-800 underline"
                            >
                              ពង្រីកមើលធំ ↗
                            </a>
                          </div>
                          <div className="overflow-hidden rounded-xl border border-blue-200/80 bg-white flex justify-center p-1.5">
                            <img 
                              src={slipUrl} 
                              alt="Payment Slip" 
                              className="h-44 w-auto object-contain rounded-lg shadow-2xs" 
                            />
                          </div>
                        </div>
                      )}

                      {/* Financial Totals */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>តម្លៃសរុប (Subtotal):</span>
                          <span className="font-mono text-slate-900">${(selectedOrder.subtotal || selectedOrder.total_amount || selectedOrder.total || 0).toFixed(2)}</span>
                        </div>
                        {selectedOrder.discount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span>បញ្ចុះតម្លៃ (Discount):</span>
                            <span className="font-mono">-${Number(selectedOrder.discount).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedOrder.tax_amount > 0 && (
                          <div className="flex justify-between text-blue-600 font-bold">
                            <span>ពន្ធអាករ VAT (10%):</span>
                            <span className="font-mono">+${Number(selectedOrder.tax_amount).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-slate-200 pt-2 flex items-baseline justify-between">
                          <span className="font-black text-sm text-slate-900 uppercase">ទឹកប្រាក់សរុប (Grand Total):</span>
                          <div className="text-right">
                            <span className="text-xl font-black text-[#ff6a00] font-mono block">
                              ${Number(selectedOrder.total_amount || selectedOrder.total || 0).toFixed(2)}
                            </span>
                            <span className="text-[11px] text-slate-500 font-bold">
                              ({Math.round(Number(selectedOrder.total_amount || selectedOrder.total || 0) * 4100).toLocaleString()} ៛)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: PDF Invoice, Telegram, Shop More */}
                      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                        <a
                          href={`/invoice?id=${encodeURIComponent(selectedOrder.order_id || selectedOrder.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 py-3 rounded-2xl font-black text-xs text-center transition flex items-center justify-center gap-1.5 border border-purple-200 shadow-2xs"
                        >
                          <span>📄</span>
                          <span>វិក្កយបត្រ PDF ផ្លូវការ</span>
                        </a>

                        <a
                          href={`https://t.me/Sabayluk?text=${encodeURIComponent(`សួស្តីបង! ខ្ញុំចង់សួរពីការកុម្ម៉ង់លេខ #${selectedOrder.order_id || selectedOrder.id}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#24A1DE] hover:bg-[#1f8ec4] text-white py-3 rounded-2xl font-black text-xs text-center transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                        >
                          <span>💬</span>
                          <span>ឆាតសួរក្នុង Telegram</span>
                        </a>

                        <Link
                          href="/"
                          className="flex-1 bg-slate-900 hover:bg-black text-white py-3 rounded-2xl font-black text-xs text-center transition border border-slate-900 shadow-2xs"
                        >
                          🛍️ ទិញទំនិញបន្ថែម
                        </Link>
                      </div>

                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 SABAY LUK • ហាងលក់ស្បែកជើង និងម៉ូដទាន់សម័យគុណភាពខ្ពស់</p>
      </footer>
    </div>
  );
}
