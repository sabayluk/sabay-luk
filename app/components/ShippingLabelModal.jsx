'use client';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// Code128 B Character Set Patterns for Crisp Barcode Generation
const CODE128B_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

function generateCode128Svg(text, options = {}) {
  const clean = String(text || '000000').trim().toUpperCase();
  const height = options.height || 46;
  const barWidth = options.barWidth || 1.6;
  const quietZone = options.quietZone !== false ? 10 : 0;
  
  let checksum = 104;
  const indices = [104];
  
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      indices.push(code);
      checksum += code * (i + 1);
    }
  }
  
  indices.push(checksum % 103);
  indices.push(106); // Stop pattern
  
  let currentX = quietZone;
  let rects = [];
  
  for (const idx of indices) {
    const pattern = CODE128B_PATTERNS[idx];
    if (!pattern) continue;
    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10) * barWidth;
      if (isBar) {
        rects.push(`<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="#000000" />`);
      }
      currentX += width;
      isBar = !isBar;
    }
  }
  
  const totalWidth = currentX + quietZone;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}" preserveAspectRatio="none">${rects.join('')}</svg>`;
}

export default function ShippingLabelModal({
  isOpen,
  onClose,
  order,
  storeSettings = {},
  activeStore = {},
  exchangeRate = 4100
}) {
  const [labelSize, setLabelSize] = useState('100x150'); // '100x150', 'A6', '80mm'
  const [courier, setCourier] = useState('VET'); // 'VET', 'JT', 'GRAB', 'IN_HOUSE'
  const [codAmount, setCodAmount] = useState('');
  const [isPrepaid, setIsPrepaid] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('សូមទូរស័ព្ទមុនពេលដឹកជញ្ជូន 10-15 នាទី');
  const [packageWeight, setPackageWeight] = useState('0.5 kg');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const printAreaRef = useRef(null);

  // Initialize order details when modal opens
  useEffect(() => {
    if (!isOpen || !order) return;

    const total = parseFloat(order.total || order.total_amount || 0);
    const payMethod = (order.payment || order.payment_method || '').toLowerCase();
    const isPaidOnline = payMethod.includes('khqr') || payMethod.includes('aba') || payMethod.includes('transfer') || payMethod.includes('bank');

    if (isPaidOnline) {
      setIsPrepaid(true);
      setCodAmount('0');
    } else {
      setIsPrepaid(false);
      setCodAmount(total.toFixed(2));
    }

    // Generate QR Code for package tracking or recipient details
    const orderId = order.order_id || order.id || 'ORDER';
    const trackingInfo = `https://sabayluk.com/track?q=${orderId}`;
    
    QRCode.toDataURL(trackingInfo, {
      width: 130,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.warn('QR Code generation error:', err));

  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const orderId = order.order_id || order.id || `ORD-${Date.now().toString().slice(-6)}`;
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('km-KH') : new Date().toLocaleDateString('km-KH');
  const orderTime = order.created_at ? new Date(order.created_at).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' });
  
  const storeName = storeSettings.storeName || activeStore?.name || 'SABAY LUK SHOES STORE';
  const storePhone = storeSettings.phone || activeStore?.phone || '096 720 5522';
  const storeAddress = storeSettings.address || activeStore?.address || 'រាជធានីភ្នំពេញ, កម្ពុជា';

  const customerName = order.customer || order.customer_name || 'អតិថិជនទូទៅ';
  const customerPhone = order.phone || order.phone_number || 'គ្មានលេខទូរស័ព្ទ';
  const rawAddress = order.address || order.delivery_address || 'ភ្នំពេញ (ដឹកជញ្ជូនរហ័ស)';
  const cleanAddress = rawAddress
    .replace(/\[📍\s*Maps:[^\]]+\]/gi, '')
    .replace(/\[🏠\s*រូបផ្ទះ:[^\]]+\]/gi, '')
    .trim();

  // Extract province/city if mentioned
  const cityHighlight = cleanAddress.includes('សៀមរាប') ? 'សៀមរាប (Siem Reap)' :
    cleanAddress.includes('បាត់ដំបង') ? 'បាត់ដំបង (Battambang)' :
    cleanAddress.includes('កំពង់ចាម') ? 'កំពង់ចាម (Kampong Cham)' :
    cleanAddress.includes('ព្រះសីហនុ') || cleanAddress.includes('កំពង់សោម') ? 'ព្រះសីហនុ (Sihanoukville)' :
    cleanAddress.includes('កំពត') ? 'កំពត (Kampot)' :
    'ភ្នំពេញ (Phnom Penh)';

  const items = Array.isArray(order.items) ? order.items.filter(it => !it.is_tax_meta) : [];
  const totalItemCount = items.reduce((sum, it) => sum + (parseInt(it.qty, 10) || 1), 0);
  const codNum = parseFloat(codAmount) || 0;
  const codRiel = Math.round(codNum * exchangeRate);

  const barcodeSvg = generateCode128Svg(orderId, { height: 42, barWidth: 1.5 });

  // 1-Click Print Handler
  const handlePrint = () => {
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Shipping_Label_${orderId}</title>
        <style>
          @page {
            size: ${labelSize === '100x150' ? '100mm 150mm' : labelSize === 'A6' ? '105mm 148mm' : '80mm 130mm'};
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            margin: 0;
            padding: 8mm;
            font-family: 'Hanuman', 'Siemreap', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #000;
            background: #fff;
            width: ${labelSize === '100x150' ? '100mm' : labelSize === 'A6' ? '105mm' : '80mm'};
          }
          .label-container {
            border: 2px solid #000;
            border-radius: 4px;
            overflow: hidden;
          }
          .header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #000;
            padding: 6px 8px;
            background: #f8f8f8;
          }
          .courier-badge {
            background: #000;
            color: #fff;
            font-weight: 900;
            font-size: 13px;
            padding: 3px 8px;
            border-radius: 3px;
            letter-spacing: 0.5px;
          }
          .tracking-section {
            padding: 6px 8px;
            text-align: center;
            border-bottom: 2px solid #000;
          }
          .barcode-box {
            display: flex;
            justify-content: center;
            margin-bottom: 3px;
          }
          .order-id-text {
            font-family: monospace;
            font-weight: 900;
            font-size: 15px;
            letter-spacing: 1px;
          }
          .address-grid {
            display: flex;
            border-bottom: 2px solid #000;
          }
          .sender-col {
            width: 42%;
            border-right: 1.5px solid #000;
            padding: 6px 8px;
            font-size: 10px;
            line-height: 1.35;
          }
          .recipient-col {
            width: 58%;
            padding: 6px 8px;
            font-size: 11px;
            line-height: 1.4;
          }
          .section-tag {
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #555;
            margin-bottom: 2px;
          }
          .bold-title {
            font-weight: 900;
            font-size: 12px;
          }
          .phone-highlight {
            font-size: 14px;
            font-weight: 900;
            margin-top: 2px;
            letter-spacing: 0.5px;
          }
          .cod-banner {
            border-bottom: 2px solid #000;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: ${codNum > 0 ? '#000' : '#f0fdf4'};
            color: ${codNum > 0 ? '#fff' : '#166534'};
          }
          .cod-amount {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .items-summary {
            padding: 6px 8px;
            font-size: 10px;
            border-bottom: 1.5px solid #000;
            line-height: 1.4;
          }
          .footer-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 8px;
            font-size: 9px;
            background: #fafafa;
          }
          .qr-box {
            width: 44px;
            height: 44px;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .icons-row {
            display: flex;
            gap: 6px;
            font-size: 16px;
          }
        </style>
      </head>
      <body onload="window.focus(); window.print();" onafterprint="window.close();">
        <div class="label-container">
          <!-- Header Row -->
          <div class="header-row">
            <div>
              <div style="font-weight: 900; font-size: 14px;">${storeName}</div>
              <div style="font-size: 9px; color: #555;">ប័ណ្ណបញ្ជូនកញ្ចប់អីវ៉ាន់ (Waybill Shipping Label)</div>
            </div>
            <div class="courier-badge">
              ${courier === 'VET' ? '🚚 វីរៈប៊ុនថាំ' : courier === 'JT' ? '📦 J&T EXPRESS' : courier === 'GRAB' ? '⚡ GRAB EXPRESS' : '🛵 អ្នកដឹកហាង'}
            </div>
          </div>

          <!-- Tracking & Barcode Section -->
          <div class="tracking-section">
            <div class="barcode-box">
              ${barcodeSvg}
            </div>
            <div class="order-id-text">Tracking #: ${orderId}</div>
            <div style="font-size: 10px; color: #444; margin-top: 2px;">
              កាលបរិច្ឆេទ៖ ${orderDate} • ម៉ោង៖ ${orderTime} • ទម្ងន់៖ ${packageWeight}
            </div>
          </div>

          <!-- Address Grid: From & To -->
          <div class="address-grid">
            <!-- Sender (From) -->
            <div class="sender-col">
              <div class="section-tag">📤 អ្នកផ្ញើ (FROM):</div>
              <div class="bold-title">${storeName}</div>
              <div style="font-weight: bold; margin-top: 2px;">📞 ${storePhone}</div>
              <div style="margin-top: 2px; color: #333;">📍 ${storeAddress}</div>
            </div>

            <!-- Recipient (To) -->
            <div class="recipient-col">
              <div class="section-tag" style="display: flex; justify-content: space-between;">
                <span>📥 អ្នកទទួល (TO):</span>
                <span style="font-weight: 900; color: #000; background: #eee; padding: 1px 4px; border-radius: 2px;">${cityHighlight}</span>
              </div>
              <div class="bold-title" style="font-size: 14px;">${customerName}</div>
              <div class="phone-highlight">📞 ${customerPhone}</div>
              <div style="margin-top: 3px; font-weight: 600; font-size: 11px;">
                📍 ${cleanAddress}
              </div>
            </div>
          </div>

          <!-- COD Banner -->
          <div class="cod-banner">
            <div>
              <div style="font-size: 10px; font-weight: 900; text-transform: uppercase;">
                ${codNum > 0 ? '💵 ប្រាក់ត្រូវប្រមូលពីភ្ញៀវ (COD):' : '✅ ស្ថានភាពទូទាត់ប្រាក់ (PAYMENT):'}
              </div>
              <div style="font-size: 10px; opacity: 0.85;">
                ${codNum > 0 ? `ស្មើនឹងប្រាក់រៀល៖ ≈ ${codRiel.toLocaleString()} ៛` : 'អតិថិជនបានទូទាត់រួច ១០០% (កុំយកលុយ)'}
              </div>
            </div>
            <div class="cod-amount">
              ${codNum > 0 ? `$${codNum.toFixed(2)}` : 'PAID ($0.00)'}
            </div>
          </div>

          <!-- Items in Package Summary -->
          <div class="items-summary">
            <div style="font-weight: 900; display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>📦 មុខទំនិញក្នុងកញ្ចប់ (${totalItemCount} មុខ):</span>
              <span>វិក្កយបត្រ #${orderId}</span>
            </div>
            ${items.slice(0, 4).map((it, idx) => `
              <div style="display: flex; justify-content: space-between; border-bottom: 0.5px dotted #ddd; padding: 2px 0;">
                <span>${idx + 1}. ${it.name} ${it.size && it.size !== 'N/A' ? `[Size: ${it.size}]` : ''} ${it.color && it.color !== 'N/A' ? `(${it.color})` : ''}</span>
                <span style="font-weight: bold;">x${it.qty || 1}</span>
              </div>
            `).join('')}
            ${items.length > 4 ? `<div style="color: #666; font-size: 9px; margin-top: 2px;">+ មានទំនិញ ${items.length - 4} មុខផ្សេងទៀត...</div>` : ''}
            ${deliveryNote ? `<div style="margin-top: 4px; font-size: 9px; font-weight: bold; color: #000;">⚠️ ចំណាំ៖ ${deliveryNote}</div>` : ''}
          </div>

          <!-- Footer with QR & Icons -->
          <div class="footer-row">
            <div class="icons-row">
              <span title="Fragile">🍷</span>
              <span title="Keep Dry">☂️</span>
              <span title="Handle with care">📦</span>
              <span style="font-size: 10px; font-weight: 900; align-self: center;">ទំនិញងាយបែកបាក់</span>
            </div>
            ${qrCodeDataUrl ? `
              <div class="qr-box">
                <img src="${qrCodeDataUrl}" alt="QR" />
              </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'height=750,width=550');
    if (printWin) {
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl font-black">
              📦
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                បោះពុម្ពស្លាកផ្ញើអីវ៉ាន់ដឹកជញ្ជូន (Shipping Label / Waybill)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                សម្រាប់បកបិទលើកញ្ចប់ផ្ញើតាម វីរៈប៊ុនថាំ, J&T, Grab • វិក្កយបត្រ #{orderId}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-gray-800 text-xs">
          
          {/* Top Options Bar (Size, Courier, COD) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            {/* 1. Label Size */}
            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1.5 uppercase">
                📏 ទំហំក្រដាស (Label Size):
              </label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-xs outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="100x150">🏷️ Thermal 100x150mm (ស្តង់ដារ)</option>
                <option value="A6">📄 ក្រដាស A6 (105x148mm)</option>
                <option value="80mm">🧾 Thermal Roll 80mm</option>
              </select>
            </div>

            {/* 2. Courier Selection */}
            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1.5 uppercase">
                🚚 ក្រុមហ៊ុនដឹក (Courier):
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-xs outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="VET">🚚 វីរៈប៊ុនថាំ (Virak Buntham)</option>
                <option value="JT">📦 J&T Express</option>
                <option value="GRAB">⚡ Grab Express</option>
                <option value="IN_HOUSE">🛵 អ្នកដឹកផ្ទាល់របស់ហាង</option>
              </select>
            </div>

            {/* 3. Package Weight */}
            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1.5 uppercase">
                ⚖️ ទម្ងន់ប៉ាន់ស្មាន (Weight):
              </label>
              <input
                type="text"
                value={packageWeight}
                onChange={(e) => setPackageWeight(e.target.value)}
                placeholder="0.5 kg"
                className="w-full bg-white border border-gray-300 rounded-xl p-2 font-bold text-xs outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* COD & Payment Configuration */}
          <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="font-black text-xs text-blue-900 flex items-center gap-1.5">
                <span>💵</span> កំណត់ទឹកប្រាក់ដែលត្រូវប្រមូល (COD Amount)
              </span>
              <p className="text-[11px] text-blue-700 font-medium">
                {isPrepaid ? '✅ ភ្ញៀវបានទូទាត់ប្រាក់រួចហើយ (កុំយកលុយ)' : '⚠️ ត្រូវប្រគល់អីវ៉ាន់ និងប្រមូលលុយពេលទៅដល់'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPrepaid(!isPrepaid);
                  setCodAmount(!isPrepaid ? '0' : parseFloat(order.total || 0).toFixed(2));
                }}
                className={`px-3 py-1.5 rounded-xl font-black text-[11px] border transition cursor-pointer ${
                  isPrepaid 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {isPrepaid ? '✓ បានទូទាត់រួច (PAID)' : '❌ មិនទាន់ទូទាត់'}
              </button>

              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-xl px-2 py-1 shadow-inner">
                <span className="font-black text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={codAmount}
                  onChange={(e) => {
                    setCodAmount(e.target.value);
                    setIsPrepaid(parseFloat(e.target.value) === 0);
                  }}
                  className="w-20 font-black text-sm text-gray-900 outline-none text-right"
                />
              </div>
            </div>
          </div>

          {/* Delivery Note */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 block mb-1">
              📝 ចំណាំសម្រាប់អ្នកដឹកជញ្ជូន (Delivery Instruction / Note):
            </label>
            <input
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="ឧ. សូមទូរស័ព្ទមុនពេលដឹកជញ្ជូន 10 នាទី..."
              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500"
            />
          </div>

          {/* Live Preview Box */}
          <div>
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-wide block mb-2">
              👁️ ផ្ទាំងមើលគំរូមុនពេលបោះពុម្ព (Live Print Preview):
            </span>

            <div 
              ref={printAreaRef}
              className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-5 shadow-xs max-w-md mx-auto"
            >
              {/* Preview Content */}
              <div className="border-2 border-black rounded-lg overflow-hidden text-black font-sans text-xs">
                {/* Header */}
                <div className="p-2.5 bg-gray-50 border-b-2 border-black flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-sm text-black leading-tight">{storeName}</h4>
                    <p className="text-[9px] text-gray-600">ប័ណ្ណផ្ញើអីវ៉ាន់ (Shipping Label)</p>
                  </div>
                  <span className="bg-black text-white px-2 py-1 rounded text-[11px] font-black tracking-wide">
                    {courier === 'VET' ? 'វីរៈប៊ុនថាំ' : courier === 'JT' ? 'J&T EXPRESS' : courier === 'GRAB' ? 'GRAB EXPRESS' : 'អ្នកដឹកហាង'}
                  </span>
                </div>

                {/* Barcode */}
                <div className="p-3 text-center border-b-2 border-black bg-white">
                  <div className="flex justify-center mb-1 max-w-[260px] mx-auto" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                  <p className="font-mono font-black text-xs tracking-wider">Tracking #: {orderId}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">កាលបរិច្ឆេទ៖ {orderDate} • ទម្ងន់៖ {packageWeight}</p>
                </div>

                {/* Sender & Recipient Grid */}
                <div className="grid grid-cols-12 border-b-2 border-black text-[11px]">
                  {/* From */}
                  <div className="col-span-5 p-2.5 border-r border-black bg-gray-50/50 space-y-0.5">
                    <span className="text-[9px] font-black text-gray-500 uppercase block">📤 អ្នកផ្ញើ (FROM):</span>
                    <p className="font-black text-[11px] line-clamp-1">{storeName}</p>
                    <p className="font-bold text-[10px]">📞 {storePhone}</p>
                    <p className="text-[9px] text-gray-600 line-clamp-2">{storeAddress}</p>
                  </div>

                  {/* To */}
                  <div className="col-span-7 p-2.5 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-gray-500 uppercase">📥 អ្នកទទួល (TO):</span>
                      <span className="text-[9px] font-black bg-gray-200 px-1.5 py-0.5 rounded">{cityHighlight}</span>
                    </div>
                    <p className="font-black text-xs text-gray-900">{customerName}</p>
                    <p className="font-black text-xs text-blue-600">📞 {customerPhone}</p>
                    <p className="text-[10px] text-gray-800 font-medium leading-snug">{cleanAddress}</p>
                  </div>
                </div>

                {/* COD Banner */}
                <div className={`p-3 flex justify-between items-center border-b-2 border-black ${codNum > 0 ? 'bg-black text-white' : 'bg-emerald-50 text-emerald-900'}`}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block">
                      {codNum > 0 ? '💵 ប្រាក់ត្រូវប្រមូល (COD):' : '✅ ស្ថានភាពទូទាត់:'}
                    </span>
                    <span className="text-[9px] opacity-80">
                      {codNum > 0 ? `≈ ${codRiel.toLocaleString()} ៛` : 'បានទូទាត់រួច (PAID)'}
                    </span>
                  </div>
                  <span className="text-xl font-black">
                    {codNum > 0 ? `$${codNum.toFixed(2)}` : 'PAID ($0.00)'}
                  </span>
                </div>

                {/* Items in Package */}
                <div className="p-2.5 border-b border-black text-[10px] space-y-1 bg-white">
                  <div className="flex justify-between font-black border-b border-gray-200 pb-1">
                    <span>📦 មុខទំនិញក្នុងកញ្ចប់ ({totalItemCount} មុខ)</span>
                    <span>#{orderId}</span>
                  </div>
                  {items.slice(0, 3).map((it, idx) => (
                    <div key={idx} className="flex justify-between text-gray-700">
                      <span className="truncate max-w-[200px]">{idx + 1}. {it.name} {it.size && it.size !== 'N/A' ? `(${it.size})` : ''}</span>
                      <span className="font-bold">x{it.qty || 1}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[9px] text-gray-400">+ នៅមាន {items.length - 3} មុខទៀត...</p>
                  )}
                  {deliveryNote && (
                    <p className="font-bold text-[9px] text-amber-700 pt-1">⚠️ ចំណាំ៖ {deliveryNote}</p>
                  )}
                </div>

                {/* Footer Bar with QR Code */}
                <div className="p-2 bg-gray-50 flex justify-between items-center text-[9px]">
                  <div className="flex items-center gap-1.5 text-base">
                    <span>🍷</span>
                    <span>☂️</span>
                    <span>📦</span>
                    <span className="text-[9px] font-bold text-gray-600 ml-1">ទំនិញងាយបែក</span>
                  </div>
                  {qrCodeDataUrl && (
                    <img src={qrCodeDataUrl} alt="QR" className="w-8 h-8 rounded border border-gray-300" />
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold hidden sm:inline">
              ✨ គាំទ្រម៉ាស៊ីនព្រីនកម្ដៅ Sticker 100x150mm & A6 គ្រប់ប្រភេទ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-black text-xs hover:bg-gray-100 transition cursor-pointer"
            >
              បិទផ្ទាំង
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-blue-500/25 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span> បោះពុម្ពស្លាកផ្ញើ (Print Label)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
