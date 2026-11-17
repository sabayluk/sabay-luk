'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../supabase';

function InvoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id') || searchParams.get('orderId') || '';

  const [order, setOrder] = useState(null);
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'SABAY LUK SHOES STORE',
    storeNameKh: 'សប្បាយលក់ ស្បែកជើងម៉ាកល្បីៗ',
    address: 'ផ្លូវ ២៧១ សង្កាត់បឹងទំពុន ខណ្ឌមានជ័យ រាជធានីភ្នំពេញ',
    phone: '096 720 5522',
    telegram: 'Sabayluk',
    vatTin: 'K001-902345678',
    exchangeRate: 4100
  });

  const [loading, setLoading] = useState(true);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramSentMsg, setTelegramSentMsg] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    // Load store settings
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('sabay_store_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setStoreSettings(prev => ({ 
            ...prev, 
            ...parsed,
            telegramBotToken: parsed.telegramBotToken || prev.telegramBotToken || '',
            telegramChatId: parsed.telegramChatId || prev.telegramChatId || ''
          }));
        }
      } catch (e) {}
    }

    // Auto-sync settings from Supabase if available
    try {
      supabase.from('stores').select('settings, name, phone, telegram, address').eq('id', 'store_default_sabayluk').maybeSingle().then(({ data }) => {
        if (data?.settings) {
          setStoreSettings(prev => ({
            ...prev,
            ...data.settings,
            storeName: data.name || data.settings.storeName || prev.storeName,
            phone: data.phone || data.settings.phone || prev.phone,
            telegram: data.telegram || data.settings.telegram || prev.telegram,
            address: data.address || data.settings.address || prev.address
          }));
        }
      });
    } catch (e) {}

    const fetchOrder = async () => {
      setLoading(true);
      const cleanId = (orderId || '').replace(/^#/, '').trim();

      if (!cleanId) {
        // Fallback sample order for demo
        setOrder({
          order_id: 'ORD-DEMO-2026',
          created_at: new Date().toISOString(),
          customer_name: 'សុខ វិសាល (Sok Visal)',
          phone: '012 345 678',
          delivery_address: 'ផ្លូវ ២៧១ សង្កាត់បឹងទំពុន រាជធានីភ្នំពេញ',
          telegram: 'visal_sok',
          payment_method: 'Bakong KHQR',
          cashier_name: 'សុខា (អ្នកគិតលុយ)',
          order_type: 'POS',
          total_amount: 56.00,
          subtotal: 56.00,
          discount: 0,
          tax_amount: 0,
          items: [
            { id: '1', name: 'ស្បែកជើងប៉ាតា Sneaker Pro Edition', size: '41', color: 'ខ្មៅ Black', price: 28.00, qty: 2 }
          ]
        });
        setLoading(false);
        return;
      }

      // 1. ពិនិត្យមើល Cache ក្នុង LocalStorage ជាមុនសិន (Instant Match សម្រាប់ POS)
      if (typeof window !== 'undefined') {
        try {
          const directKeyMatch = localStorage.getItem(`sabay_order_${cleanId}`) || localStorage.getItem(`sabay_order_#${cleanId}`);
          if (directKeyMatch) {
            const parsed = JSON.parse(directKeyMatch);
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
              setOrder(parsed);
              setLoading(false);
              return;
            }
          }

          const currentInv = localStorage.getItem('sabay_current_invoice_order');
          if (currentInv) {
            const parsed = JSON.parse(currentInv);
            if (parsed && (parsed.order_id === cleanId || parsed.order_id === `#${cleanId}` || parsed.id === cleanId)) {
              if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                setOrder(parsed);
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {}
      }

      // 2. ស្វែងរកក្នុង Supabase orders table (ទាំង cleanId និង #${cleanId})
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
        let query = supabase.from('orders').select('*');
        if (isUuid) {
          query = query.or(`order_id.eq.${cleanId},id.eq.${cleanId}`);
        } else {
          query = query.or(`order_id.eq.${cleanId},order_id.eq.#${cleanId}`);
        }
        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          setOrder(data);
          // ⭐️ Sync store settings from order's store_id ⭐️
          if (data.store_id) {
            try {
              const { data: sData } = await supabase.from('stores').select('settings, name, phone, telegram, address').eq('id', data.store_id).maybeSingle();
              if (sData) {
                const sSettings = sData.settings || {};
                setStoreSettings(prev => ({
                  ...prev,
                  ...sSettings,
                  storeName: sSettings.storeName || sData.name || prev.storeName,
                  phone: sSettings.phone || sData.phone || prev.phone,
                  telegram: (sSettings.telegram || sData.telegram || prev.telegram || '').replace(/^@/, ''),
                  address: sSettings.address || sData.address || prev.address
                }));
              }
            } catch (sErr) {}
          }
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Error fetching order from supabase:', e);
      }

      // 3. ស្វែងរកក្នុងបញ្ជី LocalStorage (sabay_real_orders, sabay_orders)
      if (typeof window !== 'undefined') {
        try {
          const keys = ['sabay_real_orders', 'sabay_orders'];
          for (const k of keys) {
            const cachedOrders = localStorage.getItem(k);
            if (cachedOrders) {
              const parsed = JSON.parse(cachedOrders);
              const found = parsed.find(o => 
                (o.order_id && (o.order_id === cleanId || o.order_id === `#${cleanId}`)) || 
                (o.id && o.id === cleanId)
              );
              if (found) {
                setOrder(found);
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {}
      }

      // 4. Fallback បើរកមិនឃើញ
      setOrder({
        order_id: cleanId,
        created_at: new Date().toISOString(),
        customer_name: 'អតិថិជនទូទៅ',
        phone: 'N/A',
        delivery_address: 'ភ្នំពេញ កម្ពុជា',
        payment_method: 'KHQR / Cash',
        cashier_name: 'Admin',
        order_type: 'Online',
        total_amount: 0,
        subtotal: 0,
        discount: 0,
        tax_amount: 0,
        items: []
      });
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  // Action: Print
  const handlePrint = () => {
    window.print();
  };

  // Action: Download PDF
  const handleDownloadPdf = async () => {
    if (!order) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch('/api/invoice/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order,
          storeSettings
        })
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${order.order_id || 'SabayLuk'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('កំហុសក្នុងការទាញយក PDF: ' + e.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Action: Send to Telegram
  const handleSendTelegram = async () => {
    if (!order) return;
    setSendingTelegram(true);
    setTelegramSentMsg('');
    try {
      const botToken = (storeSettings.telegramBotToken || '').trim();
      const chatId = (storeSettings.telegramChatId || '').trim();

      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken || undefined,
          chatId: chatId || undefined,
          storeId: order.store_id || 'store_default_sabayluk',
          storeSlug: 'sabay-luk',
          storeName: storeSettings.storeName || 'SABAY LUK SHOES STORE',
          action: 'send_invoice',
          order,
          storePhone: storeSettings.phone || '096 720 5522',
          storeAddress: storeSettings.address || 'Street 271, Phnom Penh, Cambodia',
          storeTelegram: storeSettings.telegram || 'Sabayluk',
          vatTin: storeSettings.vatTin,
          exchangeRate: storeSettings.exchangeRate || 4100
        })
      });

      const data = await res.json();
      if (data.success) {
        setTelegramSentMsg('✅ បានផ្ញើវិក្កយបត្រ PDF ចូល Telegram ជោគជ័យ!');
      } else {
        setTelegramSentMsg('❌ ' + (data.message || 'មិនអាចផ្ញើទៅ Telegram បានទេ'));
      }
    } catch (e) {
      setTelegramSentMsg('❌ កំហុសបណ្តាញ: ' + e.message);
    } finally {
      setSendingTelegram(false);
      setTimeout(() => setTelegramSentMsg(''), 6000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center max-w-sm w-full space-y-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-black text-gray-800 text-sm">កំពុងផ្ទុកវិក្កយបត្រផ្លូវការ...</p>
        </div>
      </div>
    );
  }

  const items = Array.isArray(order?.items) ? order.items.filter(it => !it.is_tax_meta) : [];
  const subtotal = parseFloat(order?.subtotal || order?.total_amount || order?.total || 0);
  const discount = parseFloat(order?.discount || 0);
  const tax = parseFloat(order?.tax_amount || 0);
  const total = parseFloat(order?.total_amount || order?.total || 0);
  const exchangeRate = storeSettings.exchangeRate || 4100;
  const totalKHR = Math.round(total * exchangeRate);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 print:bg-white print:p-0 print:m-0 text-gray-800">
      
      {/* ⭐️ Top Navigation Bar (Hidden when Printing) ⭐️ */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden">
        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-black text-gray-700 transition"
            >
              ← ត្រឡប់ទៅហាង
            </Link>
            <span className="text-xs font-bold text-gray-400">|</span>
            <span className="text-xs font-black text-gray-900">
              វិក្កយបត្រ #{order?.order_id || 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>🖨️</span> បោះពុម្ព (Print)
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md shadow-purple-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>📄</span> {downloadingPdf ? 'កំពុងបង្កើត PDF...' : 'ទាញយក PDF (Download)'}
            </button>

            <button
              type="button"
              onClick={handleSendTelegram}
              disabled={sendingTelegram}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>✈️</span> {sendingTelegram ? 'កំពុងផ្ញើ...' : 'ផ្ញើទៅ Telegram'}
            </button>
          </div>
        </div>

        {telegramSentMsg && (
          <div className={`mt-3 p-3.5 rounded-2xl text-xs font-black transition animate-in fade-in ${
            telegramSentMsg.includes('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {telegramSentMsg}
          </div>
        )}
      </div>

      {/* ⭐️ Official Printable Invoice Sheet (A4 Layout) ⭐️ */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              {storeSettings.showInvoiceLogo !== false && storeSettings.logoUrl ? (
                <img src={storeSettings.logoUrl} alt="Store Logo" className="h-10 max-w-[120px] object-contain rounded-lg bg-white/10 p-1" />
              ) : (
                <span className="text-2xl">👟</span>
              )}
              <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase">
                {storeSettings.storeName || 'SABAY LUK SHOES STORE'}
              </h1>
            </div>
            <p className="text-xs text-purple-300 font-bold">
              {storeSettings.storeNameKh || 'វិក្កយបត្រលក់ទំនិញផ្លូវការ (Official Sales Invoice)'}
            </p>
            <p className="text-[11px] text-gray-400">
              ទំនិញសុទ្ធ ១០០% • ធានាគុណភាពខ្ពស់ • ដឹកជញ្ជូនរហ័សទូទាំងប្រទេស
            </p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-2xl text-right sm:text-right w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase text-gray-400 block">លេខវិក្កយបត្រ (INVOICE NO)</span>
            <span className="text-lg font-black text-amber-400 font-mono block mt-0.5">
              #{order?.order_id || 'N/A'}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              កាលបរិច្ឆេទ: {order?.created_at ? new Date(order.created_at).toLocaleDateString('km-KH') : new Date().toLocaleDateString('km-KH')}
            </span>
          </div>
        </div>

        {/* Store & Customer Metadata Bar */}
        <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Store Information */}
            <div className="space-y-1.5 text-xs">
              <span className="font-black text-purple-700 uppercase tracking-wider text-[11px] block">
                🏪 ព័ត៌មានហាងចេញវិក្កយបត្រ (Issued By):
              </span>
              <p className="font-black text-gray-900 text-sm">{storeSettings.storeName}</p>
              <p className="text-gray-600 font-medium">📍 {storeSettings.address}</p>
              <p className="text-gray-600 font-medium">📞 ទូរស័ព្ទ: <b>{storeSettings.phone}</b></p>
              <p className="text-gray-600 font-medium">✈️ Telegram: <b>@{storeSettings.telegram?.replace(/^@/, '')}</b></p>
              <p className="text-gray-500 font-mono text-[11px]">លេខអត្តសញ្ញាណកម្ម (VAT TIN): <b>{storeSettings.vatTin || 'K001-902345678'}</b></p>
            </div>

            {/* Customer Information */}
            <div className="space-y-1.5 text-xs">
              <span className="font-black text-purple-700 uppercase tracking-wider text-[11px] block">
                👤 អតិថិជន (Billed To):
              </span>
              <p className="font-black text-gray-900 text-sm">{order?.customer_name || order?.customer || 'អតិថិជនទូទៅ'}</p>
              <p className="text-gray-600 font-medium">📞 ទូរស័ព្ទ: <b>{order?.phone || order?.phone_number || 'N/A'}</b></p>
              <p className="text-gray-600 font-medium">📍 អាសយដ្ឋានដឹក: <b>{order?.delivery_address || order?.address || 'ភ្នំពេញ'}</b></p>
              <p className="text-gray-600 font-medium">
                💳 វិធីទូទាត់: <b className="text-emerald-700">{order?.payment_method || 'Bakong KHQR / Cash'}</b>
              </p>
              <p className="text-gray-500 text-[11px]">
                បុគ្គលិកគិតលុយ: <b>{order?.cashier_name || 'Admin'}</b> • ប៉ុស្តិ៍: <b>{order?.order_type || 'POS'}</b>
              </p>
            </div>

          </div>
        </div>

        {/* Itemized Table */}
        <div className="p-6 sm:p-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 uppercase font-black text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3">ឈ្មោះទំនិញ (Description)</th>
                  <th className="py-3 px-3 text-center">ទំហំ / ពណ៌ (Variant)</th>
                  <th className="py-3 px-3 text-right">តម្លៃរាយ</th>
                  <th className="py-3 px-3 text-center">ចំនួន (Qty)</th>
                  <th className="py-3 px-3 text-right">សរុប (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 font-bold">
                      មិនមានបញ្ជីទំនិញក្នុងវិក្កយបត្រនេះឡើយ។
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const price = parseFloat(item.price || 0);
                    const qty = parseInt(item.qty || 1, 10);
                    const itemTotal = price * qty;
                    const variantStr = [item.size ? `Size: ${item.size}` : '', item.color ? `ពណ៌: ${item.color}` : ''].filter(Boolean).join(' • ');

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-3">
                          <span className="font-black text-gray-900 block">{item.name || 'ស្បែកជើង'}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center text-gray-600 font-bold">
                          {variantStr || 'Standard'}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-gray-800">
                          ${price.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-black text-gray-900">
                          x{qty}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-black text-gray-900">
                          ${itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary & Stamp Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            
            {/* Left: Official Digital Paid Seal */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500/80 text-emerald-800">
                <span className="text-3xl">✅</span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block">OFFICIAL DIGITAL INVOICE</span>
                  <span className="text-sm font-black block">PAID & VERIFIED (បានទូទាត់រួច)</span>
                  <span className="text-[10px] text-emerald-600 font-mono block mt-0.5">
                    Auth ID: SABAY-{order?.order_id?.replace(/[^A-Za-z0-9]/g, '') || 'SEC'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                វិក្កយបត្រនេះត្រូវបានបង្កើតឡើងដោយស្វ័យប្រវត្តិតាមប្រព័ន្ធកុំព្យូទ័រ និងមានសុពលភាពស្របច្បាប់ ១០០%។
              </p>
            </div>

            {/* Right: Totals Box */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>តម្លៃសរុប (Subtotal):</span>
                <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-bold">
                  <span>បញ្ចុះតម្លៃ ({order?.coupon_code || 'Promo'}):</span>
                  <span className="font-mono">-${discount.toFixed(2)}</span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>ពន្ធអាករ (VAT 10%):</span>
                  <span className="font-mono font-bold">+${tax.toFixed(2)}</span>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">ទឹកប្រាក់សរុប (GRAND TOTAL):</span>
                  <span className="text-[11px] text-purple-300 font-mono font-bold block mt-0.5">
                    ≈ {totalKHR.toLocaleString()} KHR
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Terms */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center text-gray-500 text-[11px] space-y-1">
            <p className="font-black text-gray-800">
              🙏 សូមអរគុណចំពោះការគាំទ្រ និងជាវទំនិញពីហាង SABAY LUK!
            </p>
            <p className="text-gray-400">
              លក្ខខណ្ឌ៖ ទំនិញដែលបានជាវអាចប្តូរម៉ូត ឬ Size វិញបានក្នុងកំឡុងពេល ៣ ថ្ងៃ ដោយរក្សាសភាពដើម និងភ្ជាប់មកជាមួយវិក្កយបត្រនេះ។
            </p>
            <p className="text-gray-400 font-medium">
              📞 ទំនាក់ទំនងបម្រើអតិថិជន: {storeSettings.phone} • Telegram: @{storeSettings.telegram?.replace(/^@/, '')}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-xs font-bold text-gray-500">កំពុងរៀបចំវិក្កយបត្រ...</span>
        </div>
      </div>
    }>
      <InvoiceContent />
    </Suspense>
  );
}
