import { NextResponse } from 'next/server';
import { supabase } from '../../../supabase'; // Path ទៅកាន់ supabase client របស់អ្នក

// 🛡️ HTML Sanitizer to prevent Telegram HTML injection
function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// មុខងារផ្ញើសារទៅកាន់ Telegram (Admin Notification)
async function sendTelegramAlert(orderDetails) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // ដាក់ក្នុង .env.local
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // ដាក់ក្នុង .env.local

  const message = `
🚨 <b>មានការបញ្ជាទិញថ្មី (New Order)!</b>
👤 អតិថិជន: ${escapeHtml(orderDetails.customerName)}
📞 លេខទូរសព្ទ: ${escapeHtml(orderDetails.phone)}
📍 ទីតាំង: ${escapeHtml(orderDetails.province)}
💳 វិធីទូទាត់: ${escapeHtml(orderDetails.paymentMethod)}
📦 ថ្លៃដឹកជញ្ជូន: $${orderDetails.shippingFee}
💰 <b>សរុបត្រូវទូទាត់: $${orderDetails.grandTotal}</b>
  `;

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  }
}

export async function POST(request) {
  try {
    // ទទួលទិន្នន័យពីទំព័រ Checkout (Frontend)
    const body = await request.json();
    const { cartItems, customerName, phone, province, paymentMethod } = body;

    // ៣. ប្រព័ន្ធដឹកជញ្ជូន (Auto-calculated Shipping Fees)
    let shippingFee = 0;
    if (province === 'ភ្នំពេញ' || province === 'Phnom Penh') {
      shippingFee = 1.50; // ដឹកជញ្ជូនក្នុងក្រុង
    } else {
      shippingFee = 2.50; // ដឹកជញ្ជូនតាមខេត្ត (J&T, Vireak Buntham)
    }

    // គណនាតម្លៃសរុប (Subtotal + Shipping)
    const subTotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const grandTotal = subTotal + shippingFee;

    // ២. ប្រព័ន្ធទូទាត់ប្រាក់ (Payment Gateway Logic)
    let paymentStatus = 'Pending';
    let paymentDetails = null;

    if (paymentMethod === 'ABA_PAY') {
      // Logic បង្កើត KHQR Code (ភ្ជាប់ជាមួយ ABA Payway API)
      paymentStatus = 'Awaiting Payment';
      paymentDetails = { instruction: 'សូមស្កេន KHQR ដើម្បីទូទាត់ប្រាក់' };
    } else if (paymentMethod === 'STRIPE') {
      // Logic បង្កើត Stripe Checkout Session (សម្រាប់ Visa/Mastercard)
      paymentStatus = 'Awaiting Card Payment';
    } else if (paymentMethod === 'COD') {
      // Cash on Delivery
      paymentStatus = 'Preparing'; // រៀបចំអីវ៉ាន់យកទៅដឹកតែម្តង
    }

    // រក្សាទុកទិន្នន័យចូលទៅក្នុង Database (Supabase 'orders' table)
    const { data: orderData, error } = await supabase
      .from('orders')
      .insert([{
        customer_name: customerName,
        phone: phone,
        province: province,
        shipping_fee: shippingFee,
        total_amount: grandTotal,
        payment_method: paymentMethod,
        status: paymentStatus
      }])
      .select('*')
      .single();

    if (error) throw error;

    // ៤. ប្រព័ន្ធជូនដំណឹង (Admin Notification System)
    await sendTelegramAlert({
      customerName, phone, province, paymentMethod, shippingFee, grandTotal
    });

    // បញ្ជូនទិន្នន័យត្រឡប់ទៅ Frontend វិញ (ឧ. ជោគជ័យ ឬបញ្ជូនទៅទំព័រ QR Code)
    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      orderId: orderData.id,
      shippingFee,
      grandTotal,
      paymentDetails
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}