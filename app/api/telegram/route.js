import { NextResponse } from 'next/server';
import { generateInvoicePdf } from '../../../lib/generateInvoicePdf';

export async function POST(request) {
  try {
    const body = await request.json();
    const { botToken, chatId, message, action, items, storeName, order } = body;

    const token = (botToken || process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '').trim();
    const chat = (chatId || process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '').trim();

    let finalMessage = message;
    let inlineKeyboard = null;

    if (action === 'new_store_registered') {
      const st = body.store || {};
      finalMessage = `🎉 <b>មានហាងថ្មីបានចុះឈ្មោះប្រើប្រាស់ប្រព័ន្ធ (NEW STORE REGISTERED)!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 <b>ឈ្មោះហាង:</b> <b>${st.name || 'ហាងថ្មី'}</b>\n` +
        `🔗 <b>Slug / Link:</b> <code>${st.slug || 'N/A'}</code>\n` +
        `📦 <b>កញ្ចប់សេវា (Plan):</b> <b>${st.plan || 'FREE'}</b>\n` +
        `👤 <b>ម្ចាស់ហាង:</b> <b>${st.owner_name || 'N/A'}</b>\n` +
        `📧 <b>Gmail:</b> <code>${st.owner_email || 'N/A'}</code>\n` +
        `📞 <b>លេខទូរស័ព្ទ:</b> <code>${st.phone || 'N/A'}</code>\n` +
        (st.telegram ? `✈️ <b>Telegram:</b> @${st.telegram.replace(/^@/, '')}\n` : '') +
        `📍 <b>ទីតាំង:</b> ${st.address || 'ភ្នំពេញ'}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `⚡ <i>គណនីហាងត្រូវបានបង្កើត និងដំណើរការក្នុងប្រព័ន្ធរួចរាល់!</i>`;

      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      inlineKeyboard = [
        [
          { text: '🌐 មើលមុខហាង (Storefront)', url: `${origin}/store/${st.slug || ''}` },
          { text: '📊 ផ្ទាំងគ្រប់គ្រងហាង', url: `${origin}/admin/dashboard` }
        ]
      ];
    } else if (action === 'plan_upgraded') {
      const st = body.store || {};
      const newPlan = body.newPlan || 'PRO';
      const planPrice = body.price || 0;
      finalMessage = `💎 <b>ការដំឡើងកញ្ចប់សេវាថ្មី (STORE PLAN UPGRADE)!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 <b>ហាង:</b> <b>${st.name || 'ហាង'}</b> (<code>${st.slug || 'N/A'}</code>)\n` +
        `🚀 <b>Plan ថ្មី:</b> <b>${newPlan}</b>\n` +
        `💰 <b>តម្លៃសេវា:</b> <b>$${planPrice}/ខែ</b>\n` +
        `👤 <b>ម្ចាស់ហាង:</b> ${st.owner_name || 'N/A'} (📞 <code>${st.phone || 'N/A'}</code>)\n` +
        `📧 <b>Gmail:</b> <code>${st.owner_email || 'N/A'}</code>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `✅ <i>ប្រព័ន្ធបានទទួលការស្នើសុំ Upgrade រួចរាល់!</i>`;
    } else if (action === 'test') {
      finalMessage = `🔔 <b>សាកល្បងការតភ្ជាប់ Telegram Bot (Test Connection)</b>\n\n` +
        `🏪 <b>ហាង:</b> ${storeName || 'SABAY LUK'}\n` +
        `✅ <b>ស្ថានភាព:</b> បានភ្ជាប់ប្រព័ន្ធ Telegram ជោគជ័យ ១០០%!\n` +
        `⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleString('km-KH')}\n\n` +
        `<i>ប្រព័ន្ធនឹងផ្ញើសារ និងវិក្កយបត្រ PDF ស្វ័យប្រវត្តិចូលទីនេះរាល់ពេលមានការបញ្ជាទិញ ឬទំនិញជិតអស់ស្តុក!</i>`;
    } else if (action === 'new_order' || action === 'send_invoice') {
      const ord = order || {};
      const orderItems = Array.isArray(ord.items) ? ord.items.filter(it => !it.is_tax_meta) : [];
      const itemsList = orderItems.map((it, idx) => {
        const itemTotal = ((it.price || 0) * (it.qty || 1)).toFixed(2);
        const variantInfo = [it.size ? `Size: ${it.size}` : '', it.color ? `ពណ៌: ${it.color}` : ''].filter(Boolean).join(', ');
        return `${idx + 1}. <b>${it.name || 'ទំនិញ'}</b> x${it.qty || 1} = $${itemTotal}` + (variantInfo ? `\n   <i>(${variantInfo})</i>` : '');
      }).join('\n');

      const exchangeRate = ord.exchange_rate || 4100;
      const totalNum = parseFloat(ord.total_amount || ord.total || 0);
      const totalRiel = Math.round(totalNum * exchangeRate);
      const isInvoice = action === 'send_invoice';

      const headerTitle = isInvoice
        ? `🧾 <b>វិក្កយបត្រផ្លូវការ (OFFICIAL TAX INVOICE)</b>`
        : `🛍️ <b>មានការបញ្ជាទិញថ្មី (NEW ORDER NOTIFICATION)!</b>`;

      finalMessage = `${headerTitle}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🧾 <b>លេខវិក្កយបត្រ:</b> <code>#${ord.order_id || 'N/A'}</code>\n` +
        `🏪 <b>ហាង:</b> <b>${storeName || 'SABAY LUK SHOES STORE 👟'}</b>\n` +
        `👤 <b>ឈ្មោះអតិថិជន:</b> <b>${ord.customer_name || ord.customer || 'អតិថិជន'}</b>\n` +
        `📞 <b>លេខទូរស័ព្ទ:</b> <code>${ord.phone || ord.phone_number || 'N/A'}</code>\n` +
        (ord.telegram ? `✈️ <b>Telegram:</b> @${ord.telegram.replace(/^@/, '')}\n` : '') +
        `📍 <b>អាសយដ្ឋានដឹក:</b> ${ord.delivery_address || ord.address || 'N/A'}\n` +
        (ord.google_map_url ? `🗺️ <b>Google Maps:</b> <a href="${ord.google_map_url}">ចុចមើលទីតាំងលើផែនទី Google Maps</a>\n` : '') +
        (ord.location_photo_url ? `🏠 <b>រូបថតទីតាំង:</b> <a href="${ord.location_photo_url}">ចុចមើលរូបភាពទីតាំង</a>\n` : '') +
        `💳 <b>វិធីទូទាត់:</b> <b>${ord.payment_method || 'Bakong KHQR / Cash'}</b>\n` +
        (ord.coupon_code ? `🎟️ <b>កូដបញ្ចុះតម្លៃ:</b> <code>${ord.coupon_code}</code> (-$${Number(ord.discount || 0).toFixed(2)})\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>បញ្ជីទំនិញ (${orderItems.length} មុខ):</b>\n` +
        `${itemsList || 'គ្មានបញ្ជីទំនិញ'}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>ទឹកប្រាក់សរុប:</b> <b>$${totalNum.toFixed(2)}</b> (≈ ${totalRiel.toLocaleString()} ៛)\n` +
        `✅ <b>ស្ថានភាព:</b> <b>PAID & CONFIRMED</b>\n\n` +
        `⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `📄 <i>ឯកសារវិក្កយបត្រ PDF ផ្លូវការត្រូវបានភ្ជាប់ជូនខាងក្រោម!</i>`;

      // Origin host for links
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      inlineKeyboard = [
        [
          { text: '📄 មើលវិក្កយបត្រពេញលេញ (View Invoice)', url: `${origin}/invoice?id=${ord.order_id || ''}` },
          { text: '🚚 តាមដានឥវ៉ាន់ (Track Order)', url: `${origin}/track?q=${ord.order_id || ''}` }
        ]
      ];

      // ⭐️ Generate and send the actual PDF Document directly to Telegram ⭐️
      try {
        const pdfBuffer = await generateInvoicePdf(ord, {
          storeName: storeName || 'SABAY LUK SHOES STORE',
          phone: body.storePhone || '096 720 5522',
          address: body.storeAddress || 'Street 271, Phnom Penh, Cambodia',
          telegram: body.storeTelegram || 'Sabayluk',
          vatTin: body.vatTin || 'K001-902345678',
          exchangeRate
        });

        const formData = new FormData();
        formData.append('chat_id', chat);
        const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
        formData.append('document', blob, `Invoice_${ord.order_id || 'SabayLuk'}.pdf`);
        formData.append('caption', `🧾 <b>វិក្កយបត្រផ្លូវការ #${ord.order_id || 'N/A'} - ${storeName || 'SABAY LUK 👟'}</b>\n💰 សរុប: <b>$${totalNum.toFixed(2)}</b> (~ ${totalRiel.toLocaleString()} ៛)`);
        formData.append('parse_mode', 'HTML');

        // Send PDF document via Telegram sendDocument API
        await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
          method: 'POST',
          body: formData
        }).catch(err => console.warn('Telegram sendDocument error:', err));
      } catch (pdfErr) {
        console.warn('PDF generation in Telegram route skipped:', pdfErr);
      }

    } else if (action === 'stock_change' && body.stockData) {
      const { type, productName, sku, category, variantInfo, qtyChange, previousQty, newQty, reason } = body.stockData;
      const isStockIn = type === 'IN';
      const actionTitle = isStockIn 
        ? '📥 <b>ការកត់ត្រា៖ បញ្ចូលស្តុកទំនិញថ្មី (STOCK IN)!</b>' 
        : '📤 <b>ការកត់ត្រា៖ កាត់ស្តុកទំនិញចេញ (STOCK OUT / DEDUCT)!</b>';
      const deltaSign = isStockIn ? `+${Math.abs(qtyChange)}` : `-${Math.abs(qtyChange)}`;
      const deltaBadge = isStockIn ? '🟢 <b>នាំចូលថែម:</b>' : '🔴 <b>កាត់ចេញ:</b>';

      finalMessage = `${actionTitle}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 <b>ហាង:</b> ${storeName || 'SABAY LUK'}\n` +
        `📦 <b>ទំនិញ:</b> <b>${productName || 'ទំនិញ'}</b>\n` +
        (sku ? `🏷️ <b>SKU:</b> <code>${sku}</code> | ` : '') + (category ? `ប្រភេទ: <b>${category}</b>\n` : '\n') +
        (variantInfo ? `🔢 <b>ពត៌មានលម្អិត:</b> ${variantInfo}\n` : '') +
        `${deltaBadge} <b>${deltaSign} មុខ/គូ</b>\n` +
        `📊 <b>ស្តុកជាក់ស្តែងថ្មី:</b> <b>${newQty}</b> (ពីមុន: ${previousQty})\n` +
        `📝 <b>មូលហេតុ/ចំណាំ:</b> <i>${reason || (isStockIn ? 'នាំចូលស្តុកបន្ថែម' : 'កាត់ស្តុកចេញ')}</i>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `⚡ <i>ព័ត៌មានស្តុកត្រូវបានធ្វើបច្ចុប្បន្នភាពក្នុងប្រព័ន្ធរួចរាល់!</i>`;
    } else if (action === 'low_stock' && Array.isArray(items) && items.length > 0) {
      const itemsList = items.map((item, idx) => {
        const stock = item.stock_qty ?? item.stock ?? 0;
        const alertThreshold = item.low_stock_alert ?? 5;
        const statusEmoji = stock <= 0 ? '🔴 <b>[អស់ពីស្តុក]</b>' : '⚠️ <b>[ជិតអស់ស្តុក]</b>';
        const price = parseFloat(item.price || 0).toFixed(2);
        return `${idx + 1}. ${statusEmoji} <b>${item.name || 'ទំនិញ'}</b>\n` +
               `   • SKU: <code>${item.sku || 'N/A'}</code> | ប្រភេទ: ${item.category || 'ទូទៅ'}\n` +
               `   • ស្តុកនៅសល់: <b>${stock}</b> (កម្រិតប្រកាស: ${alertThreshold})\n` +
               `   • តម្លៃលក់: $${price}`;
      }).join('\n\n');

      finalMessage = `🚨 <b>ការជូនដំណឹង៖ ទំនិញជិតអស់ស្តុក (Low Stock Alert)!</b>\n` +
        `🏪 <b>ហាង:</b> ${storeName || 'SABAY LUK'}\n` +
        `📅 <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `📊 <b>សរុបទំនិញត្រូវបំពេញ:</b> ${items.length} មុខ\n\n` +
        `───────────────\n` +
        `${itemsList}\n` +
        `───────────────\n\n` +
        `💡 <i>សូមរៀបចំកុម្ម៉ង់ទំនិញចូលបន្ថែម ដើម្បីកុំឱ្យខកខានការលក់!</i>`;
    }

    if (!finalMessage) {
      return NextResponse.json({ success: false, message: 'មិនមានអត្ថបទសារសម្រាប់ផ្ញើទេ' }, { status: 400 });
    }

    if (!token || !chat) {
      return NextResponse.json({
        success: true,
        message: 'Telegram Bot Token / Chat ID មិនទាន់កំណត់ក្នុង Setting (Simulated)',
        simulated: true,
        previewText: finalMessage
      });
    }

    const payload = {
      chat_id: chat,
      text: finalMessage,
      parse_mode: 'HTML'
    };

    if (inlineKeyboard) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({
        success: false,
        message: data.description || 'ការផ្ញើសារតាម Telegram បរាជ័យ'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'បានផ្ញើវិក្កយបត្រ និងសារជូនដំណឹងទៅ Telegram ជោគជ័យ!',
      data
    });
  } catch (err) {
    console.error('Telegram notification error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
