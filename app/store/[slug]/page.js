'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../supabase';
import { getLocalStores, DEFAULT_FLAGSHIP_STORE } from '../../../lib/stores';

export default function StoreFrontBySlug() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug || '';

  const [currentStore, setCurrentStore] = useState(DEFAULT_FLAGSHIP_STORE);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Customer order checkout states
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Load store details by slug
  useEffect(() => {
    async function loadStore() {
      setLoading(true);
      const allLocal = getLocalStores();
      let matched = allLocal.find(s => s.slug === slug || s.id === slug);

      if (!matched) {
        try {
          const { data } = await supabase.from('stores').select('*').eq('slug', slug).single();
          if (data) matched = data;
        } catch (e) {}
      }

      const active = matched || DEFAULT_FLAGSHIP_STORE;
      setCurrentStore(active);

      // Load products for this store
      try {
        let { data: prods } = await supabase.from('products').select('*');
        if (Array.isArray(prods)) {
          // If store has store_id, filter by store_id
          const filtered = prods.filter(p => !p.store_id || p.store_id === active.id || active.id === 'store_default_sabayluk');
          setProducts(filtered);
        }
      } catch (e) {}

      setLoading(false);
    }

    if (slug) loadStore();
  }, [slug]);

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const p = parseFloat(item.retail_discount ? (item.price - item.retail_discount) : item.price) || 0;
    return sum + (p * item.qty);
  }, 0);

  const exchangeRate = currentStore.settings?.exchangeRate || 4100;
  const cartTotalKHR = Math.round(cartTotal * exchangeRate);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory || p.category_name === selectedCategory;
    return matchSearch && matchCat;
  });

  const categories = ['ALL', ...new Set(products.map(p => p.category_name || p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#ff6a00] selection:text-white">
      
      {/* Store Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentStore.settings?.logoUrl ? (
              <img src={currentStore.settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff6a00] to-orange-600 flex items-center justify-center text-white text-lg font-black shadow-md">
                🛍️
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {currentStore.name}
              </h1>
              <p className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>📞 {currentStore.phone || '096 720 5522'}</span>
                <span>•</span>
                <span>📍 {currentStore.address || 'ភ្នំពេញ'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              href={`/admin/dashboard?store=${currentStore.slug}`}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition hidden sm:inline-block"
            >
              🔒 ចូលគ្រប់គ្រង (Admin)
            </Link>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>🛒 កន្រ្តក</span>
              {cart.length > 0 && (
                <span className="bg-[#ff6a00] text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Store Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            Official Storefront
          </span>
          <h2 className="text-2xl sm:text-3xl font-black">{currentStore.name}</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            ស្វាគមន៍មកកាន់ទំព័រទំនិញផ្លូវការ! ជ្រើសរើសទំនិញដែលអ្នកពេញចិត្ត និងកុម្ម៉ង់ទិញយ៉ាងងាយស្រួល។
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'ទាំងអស់ (All)' : cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ស្វែងរកទំនិញ..."
              className="w-full bg-white border border-slate-200 focus:border-[#ff6a00] rounded-xl px-3.5 py-2 text-xs font-bold outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center py-16">
            <span className="text-3xl animate-spin block mb-2">⏳</span>
            <p className="text-xs font-bold text-slate-400">កំពុងទាញយកទិន្នន័យទំនិញ...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-6">
            <span className="text-4xl block mb-2">👟</span>
            <h3 className="font-black text-sm text-slate-800">មិនទាន់មានទំនិញនៅក្នុងប្រភេទនេះទេ</h3>
            <p className="text-xs text-slate-400 mt-1">សូមជ្រើសរើសប្រភេទផ្សេង ឬទស្សនាទំនិញទាំងអស់</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map(p => {
              const numPrice = parseFloat(p.price) || 0;
              const numDiscount = parseFloat(p.retail_discount) || 0;
              const finalPrice = Math.max(0, numPrice - numDiscount);

              return (
                <div key={p.id} className="bg-white rounded-3xl border border-slate-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
                  <div>
                    <div className="relative aspect-square rounded-2xl bg-slate-100 overflow-hidden mb-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-3xl">👟</div>
                      )}
                      {numDiscount > 0 && (
                        <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs">
                          SALE -${numDiscount.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-2 leading-snug">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.category_name || p.category}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm sm:text-base font-black text-[#ff6a00]">
                        ${finalPrice.toFixed(2)}
                      </span>
                      {numDiscount > 0 && (
                        <span className="block text-[10px] text-slate-400 line-through">
                          ${numPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      className="bg-slate-900 hover:bg-[#ff6a00] text-white p-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95"
                      title="ដាក់ចូលកន្រ្តក"
                    >
                      🛒
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl p-6 animate-in slide-in-from-right duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛒</span>
                <h3 className="font-black text-base text-slate-900">កន្រ្តកទំនិញ ({cart.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <span className="text-4xl block mb-2">🛍️</span>
                  <p className="text-xs font-bold">កន្រ្តករបស់អ្នកនៅទទេ</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">👟</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs font-black text-[#ff6a00]">${(item.price - (item.retail_discount || 0)).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-white border border-slate-300 font-bold text-xs">-</button>
                      <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-300 font-bold text-xs">+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-rose-500 text-xs font-bold hover:underline">✕</button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-500">សរុប (Total USD):</span>
                  <span className="text-lg font-black text-slate-900">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs font-bold text-slate-500">
                  <span>សរុបប្រាក់រៀល:</span>
                  <span>{cartTotalKHR.toLocaleString()} ៛</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutModalOpen(true);
                  }}
                  className="w-full bg-[#ff6a00] hover:bg-[#e65c00] text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-orange-500/25 transition cursor-pointer"
                >
                  🚀 បន្តទៅការគិតលុយ (Checkout)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">📦 បញ្ជាក់ការកុម្ម៉ង់ទិញ</h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="text-xs font-bold text-slate-400">✕</button>
            </div>

            {orderSuccess ? (
              <div className="text-center py-6 space-y-2">
                <span className="text-4xl block">🎉</span>
                <h4 className="font-black text-emerald-600 text-base">កុម្ម៉ង់ទិញបានជោគជ័យ!</h4>
                <p className="text-xs text-slate-500">ខាងហាង {currentStore.name} នឹងទាក់ទងមកអ្នកឆាប់ៗនេះ។</p>
                <button
                  onClick={() => {
                    setOrderSuccess(null);
                    setCheckoutModalOpen(false);
                    setCart([]);
                  }}
                  className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black"
                >
                  យល់ព្រម
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">ឈ្មោះរបស់អ្នក *</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="ឧ. សុខ សាន្ត"
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">លេខទូរស័ព្ទ *</label>
                  <input
                    type="tel"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="ឧ. 012 345 678"
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">អាសយដ្ឋានដឹកជញ្ជូន *</label>
                  <textarea
                    rows={2}
                    required
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="ផ្ទះលេខ, ផ្លូវ, ខណ្ឌ..."
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-medium outline-none"
                  />
                </div>

                {/* KHQR Payment Preview */}
                {currentStore.settings?.khqrImageUrl && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                    <p className="font-black text-slate-800 text-[11px]">ស្កេនទូទាត់តាម KHQR ទៅកាន់ {currentStore.name}</p>
                    <img src={currentStore.settings.khqrImageUrl} alt="KHQR" className="w-24 h-24 mx-auto object-contain" />
                    <p className="text-[10px] text-slate-500 font-bold">ទឹកប្រាក់សរុប: ${cartTotal.toFixed(2)} ({cartTotalKHR.toLocaleString()} ៛)</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    if (!custName || !custPhone) {
                      alert('សូមបំពេញឈ្មោះ និងលេខទូរស័ព្ទ!');
                      return;
                    }
                    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
                    const newOrder = {
                      order_id: orderId,
                      store_id: currentStore.id,
                      customer_name: custName,
                      phone: custPhone,
                      delivery_address: custAddress,
                      total: cartTotal,
                      items: cart,
                      payment_method: 'Bakong KHQR',
                      status: 'PENDING',
                      created_at: new Date().toISOString()
                    };

                    try {
                      fetch('/api/telegram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'new_order',
                          order: newOrder,
                          storeName: currentStore.name,
                          storePhone: currentStore.phone,
                          storeAddress: currentStore.address,
                          storeTelegram: currentStore.telegram
                        })
                      }).catch(e => console.warn('Telegram store order notice skipped:', e));
                    } catch (e) {}

                    setOrderSuccess(true);
                  }}
                  className="w-full bg-[#ff6a00] hover:bg-[#e65c00] text-white py-3.5 rounded-2xl font-black text-xs shadow-md transition cursor-pointer"
                >
                  ✓ បញ្ជាក់ការកុម្ម៉ង់ (${cartTotal.toFixed(2)})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-12">
        <p>© 2026 {currentStore.name} — ដំណើរការដោយ Sabay Luk POS Platform</p>
      </footer>

    </div>
  );
}
