import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '../../../supabase';
import { generateKhqrString, getKhqrQrImageUrl, getBakongDeepLink, getAbaDeepLink } from '../../../lib/khqr';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Missing orderId' }, { status: 400 });
    }

    // Check order status in database
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_id, status, total_amount, payment_method, customer_name')
      .or(`order_id.eq.${orderId},id.eq.${orderId}`)
      .maybeSingle();

    if (error) {
      console.warn('Supabase query error during KHQR check:', error.message);
    }

    const isPaid = order && (order.status === 'Completed' || order.status === 'Paid');

    return NextResponse.json({
      success: true,
      paid: !!isPaid,
      status: order?.status || 'Pending',
      orderId: order?.order_id || orderId,
      totalAmount: order?.total_amount || 0
    });
  } catch (err) {
    console.error('KHQR GET Check Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action = 'generate', orderId, amount, currency = 'USD', merchantName, bakongAccountId, billNumber, storeName, storePhone } = body;

    if (action === 'generate') {
      const khqrString = generateKhqrString({
        bakongAccountId: bakongAccountId || 'sengsoveasna@aba',
        merchantName: merchantName || storeName || 'SABAY LUK',
        amount: Number(amount) || 0,
        currency: currency || 'USD',
        billNumber: billNumber || orderId || `INV-${Date.now().toString().slice(-6)}`,
        storeLabel: storeName || 'SABAY LUK'
      });

      const md5Hash = crypto.createHash('md5').update(khqrString).digest('hex');
      const qrImageUrl = getKhqrQrImageUrl(khqrString, 360);
      const bakongDeepLink = getBakongDeepLink(khqrString);
      const abaDeepLink = getAbaDeepLink(khqrString);

      return NextResponse.json({
        success: true,
        khqrString,
        md5Hash,
        qrImageUrl,
        deepLinks: {
          bakong: bakongDeepLink,
          aba: abaDeepLink
        }
      });
    }

    if (action === 'verify') {
      // Mark order as paid / completed
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'Completed',
          payment_method: 'Bakong KHQR (Auto)'
        })
        .or(`order_id.eq.${orderId},id.eq.${orderId}`)
        .select()
        .maybeSingle();

      if (updateError) {
        console.warn('Could not update order in Supabase:', updateError.message);
      }

      // Send Telegram alert confirming automatic payment
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (botToken && chatId) {
          const msg = `⚡ <b>[KHQR AUTO-PAID] ការទូទាត់ស្វ័យប្រវត្តជោគជ័យ!</b>\n` +
            `🧾 <b>វិក្កយបត្រ:</b> <code>${orderId}</code>\n` +
            `💰 <b>ទឹកប្រាក់:</b> <b>$${Number(amount || 0).toFixed(2)}</b>\n` +
            `💳 <b>វិធីទូទាត់:</b> Bakong KHQR (Auto Confirmed)\n` +
            `⏱️ <b>ពេលវេលា:</b> ${new Date().toLocaleString('km-KH')}`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
          });
        }
      } catch (tgErr) {
        console.warn('Telegram notification error:', tgErr);
      }

      return NextResponse.json({
        success: true,
        paid: true,
        status: 'Completed',
        orderId,
        message: 'Payment confirmed automatically'
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('KHQR POST Error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
