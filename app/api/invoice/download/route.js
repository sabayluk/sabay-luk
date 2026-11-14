import { NextResponse } from 'next/server';
import { supabase } from '../../../../supabase';
import { generateInvoicePdf } from '../../../../lib/generateInvoicePdf';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || searchParams.get('id');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch order details from Supabase
    let order = null;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`order_id.eq.${orderId},id.eq.${orderId}`)
        .single();
      
      if (!error && data) {
        order = data;
      }
    } catch (e) {
      console.warn('Supabase fetch order error in invoice download:', e);
    }

    // 2. Fetch Store Settings
    let storeSettings = {
      storeName: 'SABAY LUK SHOES STORE',
      address: 'Street 271, Sangkat Boeng Tumpun, Phnom Penh',
      phone: '096 720 5522',
      telegram: 'Sabayluk',
      vatTin: 'K001-902345678',
      exchangeRate: 4100
    };

    try {
      const { data: sData } = await supabase.from('settings').select('*').limit(1).single();
      if (sData) {
        storeSettings = { ...storeSettings, ...sData };
      }
    } catch (e) {}

    // Fallback if not found in DB (e.g. newly created client-side order or demo)
    if (!order) {
      order = {
        order_id: orderId,
        customer_name: searchParams.get('customer') || 'General Customer',
        phone: searchParams.get('phone') || 'N/A',
        delivery_address: searchParams.get('address') || 'Phnom Penh, Cambodia',
        payment_method: searchParams.get('payment') || 'KHQR / Cash',
        total_amount: parseFloat(searchParams.get('total') || '0'),
        items: []
      };
    }

    const pdfBuffer = await generateInvoicePdf(order, storeSettings);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice_${order.order_id || orderId}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    console.error('Invoice generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { order, storeSettings } = body;

    if (!order) {
      return NextResponse.json({ error: 'Order data is required' }, { status: 400 });
    }

    const effectiveSettings = storeSettings || {
      storeName: 'SABAY LUK SHOES STORE',
      address: 'Street 271, Phnom Penh, Cambodia',
      phone: '096 720 5522',
      telegram: 'Sabayluk',
      vatTin: 'K001-902345678',
      exchangeRate: 4100
    };

    const pdfBuffer = await generateInvoicePdf(order, effectiveSettings);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice_${order.order_id || 'invoice'}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    console.error('Direct invoice PDF error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
