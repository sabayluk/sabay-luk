import { NextResponse } from 'next/server';
import { generateInvoicePdf } from '../../../lib/generateInvoicePdf';
import { supabase } from '../../../supabase';

// Telegram Bot API strictly rejects inline keyboard button URLs pointing to localhost or private IPs.
// This validator ensures only valid public URLs are sent in inline_keyboard buttons to prevent 400 Bad Request.
function isValidTelegramUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = (parsed.hostname || '').toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { botToken, chatId, message, action, items, storeName, order } = body;
    const storeId = body.storeId || body.store_id || 'store_default_sabayluk';
    const storeSlug = body.storeSlug || body.store_slug;

    let token = (botToken || process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '').trim();
    let chat = (chatId || process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '').trim();

    // ⭐️ កំណត់សម្គាល់សកម្មភាពកម្រិត Platform Master Admin (ចុះឈ្មោះហាងថ្មី & បង់ប្រាក់ Slip)
    const isPlatformAction = [
      'new_store_registered',
      'new_store_registered_pending_approval',
      'store_plan_upgrade_requested',
      'plan_upgraded',
      'plan_renewed',
      'subscription_payment_received'
    ].includes(action);

    // ⭐️ វិធានការសុវត្ថិភាពខ្ពស់បំផុត៖ រាល់សកម្មភាពចុះឈ្មោះហាងថ្មី និងការផ្ញើ Slip បង់ប្រាក់កញ្ចប់សេវា ត្រូវផ្ញើជូនតែ SUPER ADMIN ម្នាក់គត់!
    // ហាមផ្ញើទៅកាន់បុគ្គលិករបស់ Admin និងហាមផ្ញើទៅកាន់ហាងរបស់អតិថិជនជាដាច់ខាត!
    if (isPlatformAction) {
      token = '';
      chat = '';
      try {
        const { data: defaultRow } = await supabase
          .from('stores')
          .select('settings, telegram')
          .eq('id', 'store_default_sabayluk')
          .maybeSingle();

        if (defaultRow?.settings) {
          token = (defaultRow.settings.telegramBotToken || '').trim();
          chat = (defaultRow.settings.telegramChatId || '').trim();
        }
      } catch (masterErr) {
        console.warn('Telegram master owner lookup error:', masterErr);
      }

      if (!token) token = (process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '').trim();
      if (!chat) chat = (process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '').trim();
    } else if (!token || !chat) {
      // ⭐️ ករណីធម្មតា (កុម្ម៉ង់ទំនិញ / POS Sale): ទាញយក Bot Token របស់ហាងសាខានោះ
      try {
        let query = supabase.from('stores').select('settings, telegram, phone, name');
        if (storeSlug) {
          query = query.ilike('slug', storeSlug);
        } else if (storeId) {
          query = query.eq('id', storeId);
        }
        const { data: storeRow } = await query.maybeSingle();
        if (storeRow?.settings) {
          if (!token && storeRow.settings.telegramBotToken) token = storeRow.settings.telegramBotToken.trim();
          if (!chat && storeRow.settings.telegramChatId) chat = storeRow.settings.telegramChatId.trim();
        }
      } catch (dbErr) {
        console.warn('Telegram store settings lookup error:', dbErr);
      }

      // ⭐️ Fallback ទៅ store_default_sabayluk ប្រសិនបើហាងសាខាមិនទាន់បានកំណត់ Bot Token ផ្ទាល់ខ្លួន ⭐️
      if (!token || !chat) {
        try {
          const { data: defaultRow } = await supabase.from('stores').select('settings').eq('id', 'store_default_sabayluk').maybeSingle();
          if (defaultRow?.settings) {
            if (!token && defaultRow.settings.telegramBotToken) token = defaultRow.settings.telegramBotToken.trim();
            if (!chat && defaultRow.settings.telegramChatId) chat = defaultRow.settings.telegramChatId.trim();
          }
        } catch (fbErr) {
          console.warn('Fallback telegram lookup error:', fbErr);
        }
      }
    }

    let finalMessage = message;
    let inlineKeyboard = null;

    if (action === 'new_store_registered_pending_approval') {
      const st = body.store || {};
      const planName = body.plan || st.plan || 'PRO';
      const planPrice = body.price || 'N/A';
      const slipUrl = body.slipUrl || '';
      const ref = body.ref || '';

      finalMessage = `🚨 <b>មានការចុះឈ្មោះហាងថ្មី & ផ្ញើបង្កាន់ដៃ (SLIP) រង់ចាំ APPROVE!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 <b>ឈ្មោះហាង:</b> <b>${st.name || 'ហាងថ្មី'}</b>\n` +
        `🔗 <b>Slug / គេហទំព័រ:</b> <code>${st.slug || 'N/A'}</code>\n` +
        `📦 <b>កញ្ចប់សេវា (Plan):</b> <b>${planName}</b> (${planPrice})\n` +
        `👤 <b>ម្ចាស់ហាង:</b> <b>${st.owner_name || 'N/A'}</b>\n` +
        `📧 <b>Gmail:</b> <code>${st.owner_email || 'N/A'}</code>\n` +
        `📞 <b>លេខទូរស័ព្ទ:</b> <code>${st.phone || 'N/A'}</code>\n` +
        (st.telegram ? `✈️ <b>Telegram:</b> @${st.telegram.replace(/^@/, '')}\n` : '') +
        `📍 <b>ទីតាំង:</b> ${st.address || 'ភ្នំពេញ'}\n` +
        (ref ? `🔢 <b>កូដប្រតិបត្តិការ (Ref):</b> <code>${ref}</code>\n` : '') +
        (slipUrl ? `🧾 <b>បង្កាន់ដៃវេរលុយ (Slip):</b> <a href="${slipUrl}">ចុចមើលរូបភាព Slip ↗</a>\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏳ <b>ស្ថានភាព:</b> 🟡 <b>រង់ចាំ Super Admin ពិនិត្យ Slip & ចុច Approve!</b>\n` +
        `⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n\n` +
        `🔒 <i>សារនេះផ្ញើជូនផ្ដាច់មុខតែ Super Admin ម្នាក់គត់ (Platform Master Owner)!</i>`;

      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      inlineKeyboard = [];
      const row = [];
      if (slipUrl && isValidTelegramUrl(slipUrl)) {
        row.push({ text: '🧾 មើលបង្កាន់ដៃ Slip', url: slipUrl });
      }
      if (isValidTelegramUrl(`${origin}/admin/dashboard`)) {
        row.push({ text: '⚡ ចូលពិនិត្យ & Approve', url: `${origin}/admin/dashboard` });
      }
      if (row.length > 0) inlineKeyboard.push(row);
    } else if (action === 'store_plan_upgrade_requested') {
      const st = body.store || {};
      const newPlan = body.newPlan || 'PRO';
      const cycle = body.cycle || '';
      const amount = body.amount || '';
      const slipUrl = body.slipUrl || '';
      const ref = body.ref || '';

      finalMessage = `💎 <b>មានហាងស្នើសុំដំឡើងគម្រោង (PLAN UPGRADE REQUEST)!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 <b>ហាង:</b> <b>${st.name || 'ហាង'}</b> (<code>${st.slug || 'N/A'}</code>)\n` +
        `🚀 <b>គម្រោងថ្មី:</b> <b>${newPlan}</b> (${cycle})\n` +
        `💰 <b>ទឹកប្រាក់:</b> <b>${amount}</b>\n` +
        `👤 <b>ម្ចាស់ហាង:</b> ${st.owner_name || 'N/A'} (📞 <code>${st.phone || 'N/A'}</code>)\n` +
        `📧 <b>Gmail:</b> <code>${st.owner_email || 'N/A'}</code>\n` +
        (ref ? `🔢 <b>Ref:</b> <code>${ref}</code>\n` : '') +
        (slipUrl ? `🧾 <b>បង្កាន់ដៃវេរលុយ (Slip):</b> <a href="${slipUrl}">ចុចមើលរូបភាព Slip ↗</a>\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏳ <b>ស្ថានភាព:</b> 🟡 <b>រង់ចាំ Super Admin ពិនិត្យ Slip & Approve!</b>\n` +
        `⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n\n` +
        `🔒 <i>សារនេះផ្ញើជូនផ្ដាច់មុខតែ Super Admin ម្នាក់គត់ (Platform Master Owner)!</i>`;

      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      inlineKeyboard = [];
      const row = [];
      if (slipUrl && isValidTelegramUrl(slipUrl)) {
        row.push({ text: '🧾 មើលបង្កាន់ដៃ Slip', url: slipUrl });
      }
      if (isValidTelegramUrl(`${origin}/admin/dashboard`)) {
        row.push({ text: '⚡ ចូលពិនិត្យ & Approve', url: `${origin}/admin/dashboard` });
      }
      if (row.length > 0) inlineKeyboard.push(row);
    } else if (action === 'new_store_registered') {
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
        `⚡ <i>គណនីហាងត្រូវបានបង្កើត និងដំណើរការក្នុងប្រព័ន្ធរួចរាល់!</i>\n\n` +
        `🔒 <i>សារនេះផ្ញើជូនផ្ដាច់មុខតែ Super Admin ម្នាក់គត់ (Platform Master Owner)!</i>`;

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
        `💰 <b>តម្លៃសេវា:</b> <b>${planPrice}</b>\n` +
        `👤 <b>ម្ចាស់ហាង:</b> ${st.owner_name || 'N/A'} (📞 <code>${st.phone || 'N/A'}</code>)\n` +
        `📧 <b>Gmail:</b> <code>${st.owner_email || 'N/A'}</code>\n` +
        (body.slipUrl ? `🧾 <b>បង្កាន់ដៃវេរលុយ (Slip):</b> <a href="${body.slipUrl}">ចុចមើលរូបភាព Slip ↗</a>\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `✅ <i>ប្រព័ន្ធបានទទួលការបង់ប្រាក់ & ស្នើសុំ Upgrade រួចរាល់!</i>`;
      if (body.slipUrl) {
        inlineKeyboard = [
          [
            { text: '🧾 មើលបង្កាន់ដៃ Slip', url: body.slipUrl },
            { text: '📊 ផ្ទាំងគ្រប់គ្រងហាង', url: `${request.headers.get('origin') || 'http://localhost:3000'}/admin/dashboard` }
          ]
        ];
      }
    } else if (action === 'plan_renewed') {
      const st = body.store || {};
      const duration = body.duration || '១ ឆ្នាំ';
      const newExpiry = body.newExpiryDate || 'N/A';
      finalMessage = `🎉 <b>ហាងបានបន្តសុពលភាពជោគជ័យ (STORE PLAN RENEWED)!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 <b>ហាង:</b> <b>${st.name || 'ហាង'}</b> (<code>${st.slug || 'N/A'}</code>)\n` +
        `📦 <b>កញ្ចប់សេវា:</b> <b>${st.plan || 'STARTER'}</b>\n` +
        `⏳ <b>រយៈពេលបន្ថែម:</b> <b>${duration}</b>\n` +
        `📅 <b>សុពលភាពថ្មីរហូតដល់:</b> <b>${newExpiry}</b>\n` +
        `👤 <b>ម្ចាស់ហាង:</b> ${st.owner_name || 'N/A'} (📞 <code>${st.phone || 'N/A'}</code>)\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏰ <b>កាលបរិច្ឆេទបន្ត:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `⚡ <i>គណនីហាងត្រូវបានបើក និងដំណើរការបន្តដោយរលូន!</i>`;
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
        (body.storePhone ? `📞 <b>ទូរស័ព្ទហាង:</b> <code>${body.storePhone}</code>\n` : '') +
        (body.storeTelegram ? `✈️ <b>Telegram ហាង:</b> @${body.storeTelegram.replace(/^@/, '')}\n` : '') +
        `👤 <b>ឈ្មោះអតិថិជន:</b> <b>${ord.customer_name || ord.customer || 'អតិថិជន'}</b>\n` +
        `📞 <b>លេខទូរស័ព្ទ:</b> <code>${ord.phone || ord.phone_number || 'N/A'}</code>\n` +
        (() => {
          const custTg = ord.telegram || ord.customer_telegram || (Array.isArray(ord.items) && ord.items[0]?.customer_telegram) || null;
          const custEmail = ord.email || ord.customer_email || (Array.isArray(ord.items) && ord.items[0]?.customer_email) || null;
          let contactInfo = '';
          if (custTg) contactInfo += `✈️ <b>Telegram អតិថិជន:</b> @${String(custTg).replace(/^@/, '')}\n`;
          if (custEmail) contactInfo += `✉️ <b>Gmail / Email:</b> <code>${custEmail}</code>\n`;
          return contactInfo;
        })() +
        `📍 <b>អាសយដ្ឋានដឹក:</b> ${ord.delivery_address || ord.address || 'N/A'}\n` +
        (() => {
          const gMap = ord.google_map_url || (Array.isArray(ord.items) && ord.items[0]?.google_map_url) || null;
          const hPhoto = ord.location_photo_url || (Array.isArray(ord.items) && ord.items[0]?.location_photo_url) || null;
          let extra = '';
          if (gMap) extra += `🗺️ <b>Google Maps:</b> <a href="${gMap}">ចុចមើលទីតាំងលើផែនទី Google Maps ↗</a>\n`;
          if (hPhoto) extra += `🏠 <b>រូបថតទីតាំង / ផ្ទះទទួល:</b> <a href="${hPhoto}">ចុចមើលរូបភាពទីតាំង ↗</a>\n`;
          return extra;
        })() +
        (ord.payment_slip_url ? `🧾 <b>បង្កាន់ដៃបង់ប្រាក់ KHQR:</b> <a href="${ord.payment_slip_url}">ចុចមើលរូបភាព Slip ↗</a>\n` : '') +
        `💳 <b>វិធីទូទាត់:</b> <b>${ord.payment_method || 'Bakong KHQR / Cash'}</b>\n` +
        (ord.coupon_code ? `🎟️ <b>កូដបញ្ចុះតម្លៃ:</b> <code>${ord.coupon_code}</code> (-$${Number(ord.discount || 0).toFixed(2)})\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>បញ្ជីទំនិញ (${orderItems.length} មុខ):</b>\n` +
        `${itemsList || 'គ្មានបញ្ជីទំនិញ'}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>ទឹកប្រាក់សរុប:</b> <b>$${totalNum.toFixed(2)}</b> (≈ ${totalRiel.toLocaleString()} ៛)\n` +
        `✅ <b>ស្ថានភាព:</b> <b>${ord.payment_method?.includes('KHQR') || ord.payment_slip_url ? 'PAID / PENDING CONFIRMATION' : 'CASH ON DELIVERY (COD)'}</b>\n\n` +
        `⏰ <b>ពេលវេលា:</b> ${new Date().toLocaleString('km-KH')}\n` +
        `📄 <i>ឯកសារវិក្កយបត្រ PDF ផ្លូវការត្រូវបានភ្ជាប់ជូនខាងក្រោម!</i>`;

      // Origin host for links
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const invoiceUrl = `${origin}/invoice?id=${ord.order_id || ''}`;
      const trackUrl = `${origin}/track?q=${ord.order_id || ''}`;

      inlineKeyboard = [
        [
          { text: '📄 មើលវិក្កយបត្រពេញលេញ (View Invoice)', url: invoiceUrl },
          { text: '🚚 តាមដានឥវ៉ាន់ (Track Order)', url: trackUrl }
        ]
      ];

      if (ord.payment_slip_url) {
        inlineKeyboard.push([
          { text: '🧾 មើលបង្កាន់ដៃបង់ប្រាក់ KHQR', url: ord.payment_slip_url }
        ]);
      }

      // If running on localhost, append the link as text in HTML since Telegram rejects localhost in inline_keyboard
      if (!isValidTelegramUrl(invoiceUrl)) {
        finalMessage += `\n🔗 <b>តំណភ្ជាប់វិក្កយបត្រ:</b> <a href="${invoiceUrl}">${invoiceUrl}</a>`;
      }

      // ⭐️ Send Slip Photo directly if uploaded by customer ⭐️
      if (ord.payment_slip_url && token && chat) {
        try {
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chat,
              photo: ord.payment_slip_url,
              caption: `🧾 <b>បង្កាន់ដៃផ្ទេរប្រាក់ KHQR សម្រាប់កុម្ម៉ង់ #${ord.order_id || ''}</b>\n👤 អតិថិជន: <b>${ord.customer_name || 'អតិថិជន'}</b>\n💰 ទឹកប្រាក់: <b>$${totalNum.toFixed(2)}</b> (~ ${totalRiel.toLocaleString()} ៛)`,
              parse_mode: 'HTML'
            })
          }).catch(pErr => console.warn('Telegram sendPhoto slip error:', pErr));
        } catch (slipErr) {
          console.warn('Slip photo send error:', slipErr);
        }
      }

      // ⭐️ Generate and send the actual PDF Document directly to Telegram ⭐️
      try {
        const pdfBuffer = await generateInvoicePdf(ord, {
          storeName: storeName || 'SABAY LUK SHOES STORE',
          phone: body.storePhone || '096 720 5522',
          address: body.storeAddress || 'Street 271, Phnom Penh, Cambodia',
          telegram: (() => {
            const tg = (body.storeTelegram || 'sabay_luk').replace(/^@/, '').trim();
            return tg.toLowerCase() === 'sabayluk' ? 'sabay_luk' : tg;
          })(),
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
    } else if (action === 'z_report' && body.zReport) {
      const z = body.zReport;
      const isMatch = Math.abs(z.cashDiff || 0) < 0.01;
      const diffSign = z.cashDiff > 0 ? `+${z.cashDiff.toFixed(2)} (លើស)` : `${z.cashDiff.toFixed(2)} (ខ្វះ)`;
      const diffBadge = isMatch ? '✅ ស្មើគ្នាត្រឹមត្រូវ (Perfect Match)' : `⚠️ ${diffSign}`;
      const rate = z.exchangeRate || 4100;

      finalMessage = `📊 <b>របាយការណ៍បិទបញ្ជីវេនលក់ប្រចាំថ្ងៃ (DAILY Z-REPORT)</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏪 <b>ហាង:</b> <b>${storeName || 'SABAY LUK'}</b>\n` +
        `📅 <b>កាលបរិច្ឆេទ:</b> ${z.todayStr || new Date().toISOString().slice(0, 10)}\n` +
        `⏰ <b>ម៉ោងបិទបញ្ជី:</b> ${z.closedAtTime || new Date().toLocaleTimeString('km-KH')}\n` +
        `👤 <b>បេឡាករ / អ្នកបិទវេន:</b> <b>${z.closedBy || 'បេឡាករ'}</b>\n` +
        `🧾 <b>សរុបវិក្កយបត្រលក់:</b> <b>${z.orderCount || 0} កុម្ម៉ង់</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💵 <b>សាច់ប្រាក់ដុល្លារ ($):</b> <b>$${Number(z.systemCashSalesUSD || z.systemCashSales || 0).toFixed(2)}</b>\n` +
        `🇰🇭 <b>សាច់ប្រាក់រៀល (៛):</b> <b>${Number(z.systemCashSalesKHR || Math.round((z.systemCashSales || 0) * rate)).toLocaleString()} ៛</b>\n` +
        `📱 <b>ស្កេន ABA KHQR ($/៛):</b> <b>$${Number(z.systemKhqrSales || 0).toFixed(2)}</b> (≈ ${Math.round((z.systemKhqrSales || 0) * rate).toLocaleString()} ៛)\n` +
        `💰 <b>ចំណូលលក់សរុបប្រចាំវេន:</b> <b>$${Number(z.systemTotalSales || 0).toFixed(2)}</b> (≈ ${Math.round((z.systemTotalSales || 0) * rate).toLocaleString()} ៛)\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🪙 <b>លុយអាប់ដើមវេន:</b> $${Number(z.startingCash || 0).toFixed(2)}\n` +
        `📥 <b>លុយត្រូវមានក្នុងកេស (ប្រព័ន្ធ):</b> $${Number(z.expectedDrawerCash || 0).toFixed(2)}\n` +
        `🔍 <b>លុយរាប់ជាក់ស្តែងក្នុងថត:</b>\n` +
        `   • សាច់ប្រាក់ USD: $${Number(z.actualCashUSD || 0).toFixed(2)}\n` +
        `   • សាច់ប្រាក់ KHR: ${Number(z.actualCashKHR || 0).toLocaleString()} ៛\n` +
        `   • សរុបរួម (USD): <b>$${Number(z.actualCashTotalUSD || z.actualCash || 0).toFixed(2)}</b>\n` +
        `⚖️ <b>ស្ថានភាពផ្ទៀងផ្ទាត់:</b> <b>${diffBadge}</b>\n` +
        (z.notes ? `📝 <b>កំណត់ហេតុបិទវេន:</b> <i>${z.notes}</i>\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⚡ <i>របាយការណ៍បិទបញ្ជីត្រូវបានកត់ត្រាចូលប្រព័ន្ធដោយជោគជ័យ!</i>`;
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

    if (Array.isArray(inlineKeyboard) && inlineKeyboard.length > 0) {
      // Filter out any buttons with invalid, empty, or localhost URLs to avoid Telegram API 400 rejection
      const sanitizedKeyboard = inlineKeyboard
        .map(row => (Array.isArray(row) ? row.filter(btn => btn?.url && isValidTelegramUrl(btn.url)) : []))
        .filter(row => row.length > 0);

      if (sanitizedKeyboard.length > 0) {
        payload.reply_markup = { inline_keyboard: sanitizedKeyboard };
      }
    }

    // ⭐️ ប្រសិនបើមាន Slip URL ជាប្រភេទរូបភាព Online ព្យាយាមផ្ញើជា SendPhoto ជាមុន ដើម្បីឱ្យ Admin ឃើញរូបភាពបង្កាន់ដៃផ្ទាល់លើ Telegram
    if (body.slipUrl && typeof body.slipUrl === 'string' && (body.slipUrl.startsWith('http://') || body.slipUrl.startsWith('https://')) && finalMessage.length <= 1024) {
      try {
        const photoPayload = {
          chat_id: chat,
          photo: body.slipUrl,
          caption: finalMessage,
          parse_mode: 'HTML'
        };
        if (payload.reply_markup) {
          photoPayload.reply_markup = payload.reply_markup;
        }

        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoPayload)
        });
        const photoData = await photoRes.json();
        if (photoData && photoData.ok) {
          return NextResponse.json({
            success: true,
            message: 'បានផ្ញើរូបភាព Slip និងសារជូនដំណឹងទៅ Telegram ជោគជ័យ!',
            data: photoData
          });
        }
      } catch (photoErr) {
        console.warn('Telegram sendPhoto fallback to sendMessage:', photoErr);
      }
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
