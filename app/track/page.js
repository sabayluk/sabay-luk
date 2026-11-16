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
      // 1. Try exact order_id match
      let { data: orderById, error: err1 } = await supabase
        .from('orders')
        .select('*')
        .or(`order_id.ilike.%${q}%,order_id.ilike.%#${q}%,id.ilike.%${q}%`)
        .order('created_at', { ascending: false });

      // 2. Try phone number match
      let { data: orderByPhone, error: err2 } = await supabase
        .from('orders')
        .select('*')
        .or(`phone.ilike.%${q}%,phone_number.ilike.%${q}%,customer_name.ilike.%${q}%`)
        .order('created_at', { ascending: false });

      let combined = [...(orderById || []), ...(orderByPhone || [])];

      // 3. Fallback to localStorage if offline or local order
      if (combined.length === 0 && typeof window !== 'undefined') {
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
                combined = [...combined, ...matched];
              }
            }
          }
        } catch (localErr) {}
      }
      // Deduplicate by id or order_id
      const unique = [];
      const seen = new Set();
      for (const item of combined) {
        const key = item.id || item.order_id;
        if (!seen.has(key)) {
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
    if (s === 'shipping' || s === 'dispatched' || s === 'delivering' || s === 'កំពុងដឹក') return 3;
    if (s === 'processing' || s === 'packed' || s === 'កំពុងរៀបចំ') return 2;
    return 1; // Pending / Received
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500 selection:text-white flex flex-col justify-between">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl"></div>
      </div>

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-orange-500/25 group-hover:scale-105 transition">
              🛍️
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-white flex items-center gap-1.5">
                SABAY LUK
                <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded-md font-mono">
                  TRACK
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">ប្រព័ន្ធតាមដានការដឹកជញ្ជូនឥវ៉ាន់</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800 transition flex items-center gap-1.5 shadow-xs"
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            🚚 តាមដានឥវ៉ាន់របស់អ្នក (Order Tracking)
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ពិនិត្យមើលស្ថានភាពឥវ៉ាន់
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            វាយបញ្ចូលលេខទូរស័ព្ទ ឬលេខកូដវិក្កយបត្រ (Order ID) ដើម្បីពិនិត្យមើលដំណើរការដឹកជញ្ជូនភ្លាមៗ
          </p>
        </div>

        {/* Search Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="bg-slate-900/90 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row gap-2 mb-8"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="វាយលេខទូរស័ព្ទ ឧ. 0967205522 ឬ ORD-xxxxxx..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl sm:rounded-2xl pl-10 pr-4 py-3.5 text-xs sm:text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base">
              🔍
            </span>
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl sm:rounded-2xl transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Results Area */}
        {searched && !loading && (
          <div>
            {foundOrders.length === 0 ? (
              <div className="bg-slate-900/60 rounded-3xl p-8 border border-slate-800 text-center space-y-3">
                <div className="text-5xl opacity-40">📦</div>
                <h3 className="text-base font-black text-white">រកមិនឃើញការកុម្ម៉ង់ទាក់ទងនឹង &ldquo;{searchInput}&rdquo; ឡើយ</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  សូមពិនិត្យមើលលេខទូរស័ព្ទ ឬលេខកូដកុម្ម៉ង់ឱ្យបានត្រឹមត្រូវ ឬទាក់ទងមកកាន់ក្រុមការងារយើងខ្ញុំតាមរយៈ Telegram។
                </p>
                <a
                  href="https://t.me/Sabayluk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#24A1DE] hover:bg-[#1f8ec4] text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/20"
                >
                  <span>💬</span>
                  <span>ឆាតសួរក្នុង Telegram</span>
                </a>
              </div>
            ) : (
              <div className="space-y-6">
                {/* If multiple orders found, show selector tabs */}
                {foundOrders.length > 1 && (
                  <div className="bg-slate-900/80 p-2 rounded-2xl border border-slate-800 flex gap-2 overflow-x-auto">
                    {foundOrders.map((ord, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                          selectedOrder?.id === ord.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>📦</span>
                        <span>{ord.order_id || `Order #${idx + 1}`}</span>
                        <span className="text-[10px] opacity-70">
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
                  const orderDate = selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'ថ្មីៗនេះ';

                  return (
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
                      {/* Order Header Info */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold">លេខកូដកុម្ម៉ង់:</span>
                            <span className="text-base font-black text-orange-400 font-mono">
                              {selectedOrder.order_id || selectedOrder.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            កាលបរិច្ឆេទ: <b className="text-slate-200">{orderDate}</b>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                            step === 4
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : step === 3
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {step === 4 ? '✓ ដឹកដល់ជោគជ័យ' : step === 3 ? '🚚 កំពុងដឹកជញ្ជូន' : step === 2 ? '📦 កំពុងរៀបចំឥវ៉ាន់' : '📝 បានទទួលការកុម្ម៉ង់'}
                          </span>
                        </div>
                      </div>

                      {/* ⭐️ VISUAL DELIVERY PROGRESS TRACKER (STEPPER) ⭐️ */}
                      <div className="py-4">
                        <div className="grid grid-cols-4 relative">
                          {/* Connecting Progress Line */}
                          <div className="absolute top-5 left-[12%] right-[12%] h-1 bg-slate-800 -z-0">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${((step - 1) / 3) * 100}%` }}
                            />
                          </div>

                          {/* Step 1 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition ${
                              step >= 1 ? 'bg-orange-500 text-white shadow-orange-500/25 ring-4 ring-orange-500/20' : 'bg-slate-800 text-slate-500'
                            }`}>
                              📝
                            </div>
                            <span className="text-[11px] font-black text-slate-200 mt-2">បានកុម្ម៉ង់</span>
                            <span className="text-[9px] text-slate-500">Order Placed</span>
                          </div>

                          {/* Step 2 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition ${
                              step >= 2 ? 'bg-amber-500 text-white shadow-amber-500/25 ring-4 ring-amber-500/20' : 'bg-slate-800 text-slate-500'
                            }`}>
                              📦
                            </div>
                            <span className="text-[11px] font-black text-slate-200 mt-2">កំពុងរៀបចំ</span>
                            <span className="text-[9px] text-slate-500">Processing</span>
                          </div>

                          {/* Step 3 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition ${
                              step >= 3 ? 'bg-blue-500 text-white shadow-blue-500/25 ring-4 ring-blue-500/20' : 'bg-slate-800 text-slate-500'
                            }`}>
                              🚚
                            </div>
                            <span className="text-[11px] font-black text-slate-200 mt-2">កំពុងដឹក</span>
                            <span className="text-[9px] text-slate-500">On The Way</span>
                          </div>

                          {/* Step 4 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition ${
                              step >= 4 ? 'bg-emerald-500 text-white shadow-emerald-500/25 ring-4 ring-emerald-500/20' : 'bg-slate-800 text-slate-500'
                            }`}>
                              ✅
                            </div>
                            <span className="text-[11px] font-black text-slate-200 mt-2">បានទទួល</span>
                            <span className="text-[9px] text-slate-500">Delivered</span>
                          </div>
                        </div>
                      </div>

                      {/* Recipient & Shipping Information */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">ព័ត៌មានអ្នកទទួល (Recipient):</span>
                          <p className="font-black text-white text-sm">
                            {selectedOrder.customer_name || 'អតិថិជន'}
                          </p>
                          <p className="text-slate-300 font-bold">
                            📞 {selectedOrder.phone || selectedOrder.phone_number || 'មិនមានលេខ'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">អាសយដ្ឋានដឹកជញ្ជូន (Delivery Address):</span>
                          <p className="text-slate-200 font-medium">
                            📍 {selectedOrder.address || selectedOrder.delivery_address || 'មិនមានអាសយដ្ឋាន'}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            វិធីទូទាត់: <b className="text-orange-400">{selectedOrder.payment_method || selectedOrder.payment || 'Cash'}</b>
                          </p>
                        </div>
                      </div>

                      {/* Ordered Items List */}
                      <div className="space-y-3">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                          ទំនិញដែលបានកុម្ម៉ង់ ({items.length} មុខ)
                        </span>
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                              <div className="flex items-center gap-3">
                                {it.image_url ? (
                                  <img src={it.image_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-slate-700 shrink-0" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-xl shrink-0">
                                    👟
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-black text-white line-clamp-1">{it.name}</h4>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-bold">
                                    {it.size && it.size !== 'N/A' && <span className="bg-slate-800 text-orange-400 px-1.5 py-0.2 rounded">Size: {it.size}</span>}
                                    {it.color && it.color !== 'N/A' && <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">{it.color}</span>}
                                    <span>x{it.qty || 1}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm font-black text-white">
                                ${((Number(it.price) || 0) * (it.qty || 1)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial Totals */}
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>តម្លៃសរុប (Subtotal):</span>
                          <span>${(selectedOrder.subtotal || selectedOrder.total_amount || selectedOrder.total || 0).toFixed(2)}</span>
                        </div>
                        {selectedOrder.discount > 0 && (
                          <div className="flex justify-between text-red-400">
                            <span>បញ្ចុះតម្លៃ (Discount):</span>
                            <span>-${Number(selectedOrder.discount).toFixed(2)}</span>
                          </div>
                        )}
                        {selectedOrder.tax_amount > 0 && (
                          <div className="flex justify-between text-blue-400">
                            <span>ពន្ធអាករ VAT (10%):</span>
                            <span>+${Number(selectedOrder.tax_amount).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
                          <span className="font-black text-sm text-white uppercase">ទឹកប្រាក់សរុប (Grand Total):</span>
                          <span className="text-xl font-black text-orange-400">
                            ${Number(selectedOrder.total_amount || selectedOrder.total || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Need Help Action */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <a
                          href={`https://t.me/Sabayluk?text=សួស្តីបង! ខ្ញុំចង់សួរពីការកុម្ម៉ង់លេខ ${selectedOrder.order_id || selectedOrder.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#24A1DE] hover:bg-[#1f8ec4] text-white py-3 rounded-2xl font-black text-xs text-center transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                        >
                          <span>💬</span>
                          <span>ទាក់ទងមកហាងតាម Telegram</span>
                        </a>
                        <Link
                          href="/"
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-black text-xs text-center transition border border-slate-700"
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
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 SABAY LUK • ហាងលក់ស្បែកជើង និងម៉ូដទាន់សម័យគុណភាពខ្ពស់</p>
      </footer>
    </div>
  );
}
