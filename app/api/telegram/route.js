import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { botToken, chatId, message, action, items, storeName } = body;

    const token = (botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chat = (chatId || process.env.TELEGRAM_CHAT_ID || '').trim();

    if (!token || !chat) {
      return NextResponse.json({
        success: false,
        message: 'សូមកំណត់ Telegram Bot Token និង Chat ID ឱ្យបានត្រឹមត្រូវជាមុនសិន!'
      }, { status: 400 });
    }

    let finalMessage = message;

    if (action === 'test') {
      finalMessage = `🔔 <b>សាកល្បងការតភ្ជាប់ Telegram Bot (Test Connection)</b>\n\n` +
        `🏪 <b>ហាង:</b> ${storeName || 'SABAY LUK'}\n` +
        `✅ <b>ស្ថានភាព:</b> បានភ្ជាប់ប្រព័ន្ធ Telegram ជោគជ័យ ១០០%!\n` +
        `⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleString('km-KH')}\n\n` +
        `<i>ប្រព័ន្ធនឹងផ្ញើសារស្វ័យប្រវត្តិចូលទីនេះរាល់ពេលមានទំនិញជិតអស់ស្តុក (Low Stock Alert)!</i>`;
    } else if (action === 'new_order') {
      const order = body.order || {};
      const orderItems = Array.isArray(order.items) ? order.items : [];
      const itemsList = orderItems.map((it, idx) => {
        const itemTotal = ((it.price || 0) * (it.qty || 1)).toFixed(2);
        const variantInfo = [it.size ? `Size: ${it.size}` : '', it.color ? `ពណ៌: ${it.color}` : ''].filter(Boolean).join(', ');
        return `${idx + 1}. <b>${it.name || 'ទំនិញ'}</b> x${it.qty || 1} = $${itemTotal}` + (variantInfo ? `\n   <i>(${variantInfo})</i>` : '');
      }).join('\n');

      const exchangeRate = order.exchange_rate || 4100;
      const totalNum = parseFloat(order.total_amount || order.total || 0);
      const totalRiel = Math.round(totalNum * exchangeRate);

      finalMessage = `🛍️ <b>មានការបញ្ជាទិញថ្មីពី WEBSITE (NEW ORDER)!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🧾 <b>លេខវិក្កយបត្រ:</b> <code>#${order.order_id || 'N/A'}</code>\n` +
        `👤 <b>ឈ្មោះអតិថិជន:</b> <b>${order.customer_name || 'អតិថិជន'}</b>\n` +
        `📞 <b>លេខទូរស័ព្ទ:</b> <code>${order.phone || order.phone_number || 'N/A'}</code>\n` +
        `📍 <b>អាសយដ្ឋានដឹក:</b> ${order.delivery_address || order.address || 'N/A'}\n` +
        (order.google_map_url ? `🗺️ <b>Google Maps:</b> <a href="${order.google_map_url}">ចុចមើលទីតាំងលើផែនទី Google Maps</a>\n` : '') +
        (order.location_photo_url ? `🏠 <b>រូបថតទីតាំងផ្ទះ/កន្លែងធ្វើការ:</b> <a href="${order.location_photo_url}">ចុចមើលរូបភាពទីតាំង</a>\n` : '') +
        `💳 <b>វិធីទូទាត់:</b> <b>${order.payment_method || 'COD'}</b>\n` +
        (order.coupon_code ? `🎟️ <b>កូដបញ្ចុះតម្លៃ:</b> <code>${order.coupon_code}</code> (-$${Number(order.discount || 0).toFixed(2)})\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>បញ្ជីទំនិញ (${orderItems.length} មុខ):</b>\n` +
        `${itemsList || 'គ្មានបញ្ជីទំនិញ'}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>ទឹកប្រាក់សរុប:</b> <b>$${totalNum.toFixed(2)}</b> (≈ ${totalRiel.toLocaleString()} ៛)\n\n` +
        `⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `⚡ <i>សូមក្រុមការងារផ្នែក Admin & ផ្នែកលក់ រៀបចំវេចខ្ចប់ និងទាក់ទងភ្ញៀវ!</i>`;
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

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: finalMessage,
        parse_mode: 'HTML'
      })
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
      message: 'បានផ្ញើសារជូនដំណឹងទៅ Telegram ជោគជ័យ!',
      data
    });
  } catch (err) {
    console.error('Telegram notification error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
