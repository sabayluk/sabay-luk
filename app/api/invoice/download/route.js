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

    const cleanId = (orderId || '').replace(/^#/, '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    // 1. Fetch order details from Supabase safely without UUID type error
    let order = null;
    try {
      let query = supabase.from('orders').select('*');
      if (isUuid) {
        query = query.or(`order_id.eq.${cleanId},id.eq.${cleanId}`);
      } else {
        query = query.or(`order_id.eq.${cleanId},order_id.eq.#${cleanId}`);
      }
      const { data, error } = await query.maybeSingle();
      
      if (!error && data) {
        order = data;
      }
    } catch (e) {
      console.warn('Supabase fetch order error in invoice download:', e);
    }

    // 2. Fetch Store Settings (from order's store_id or default)
    let storeSettings = {
      storeName: 'SABAY LUK SHOES STORE',
      address: 'Street 271, Sangkat Boeng Tumpun, Phnom Penh',
      phone: '096 720 5522',
      telegram: 'sabay_luk',
      vatTin: 'K001-902345678',
      exchangeRate: 4100
    };

    if (order?.store_id) {
      try {
        const { data: stData } = await supabase.from('stores').select('settings, name, phone, telegram, address').eq('id', order.store_id).maybeSingle();
        if (stData) {
          const sSettings = stData.settings || {};
          storeSettings = {
            ...storeSettings,
            ...sSettings,
            storeName: sSettings.storeName || stData.name || storeSettings.storeName,
            phone: sSettings.phone || stData.phone || storeSettings.phone,
            telegram: (() => {
              const tg = (sSettings.telegram || stData.telegram || storeSettings.telegram || 'sabay_luk').replace(/^@/, '').trim();
              return tg.toLowerCase() === 'sabayluk' ? 'sabay_luk' : tg;
            })(),
            address: sSettings.address || stData.address || storeSettings.address
          };
        }
      } catch (e) {}
    } else {
      try {
        const { data: defaultStore } = await supabase.from('stores').select('settings, name, phone, telegram, address').eq('id', 'store_default_sabayluk').maybeSingle();
        if (defaultStore) {
          const sSettings = defaultStore.settings || {};
          storeSettings = {
            ...storeSettings,
            ...sSettings,
            storeName: sSettings.storeName || defaultStore.name || storeSettings.storeName,
            phone: sSettings.phone || defaultStore.phone || storeSettings.phone,
            telegram: (sSettings.telegram || defaultStore.telegram || storeSettings.telegram || '').replace(/^@/, ''),
            address: sSettings.address || defaultStore.address || storeSettings.address
          };
        }
      } catch (e) {}
    }

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
      telegram: 'sabay_luk',
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
