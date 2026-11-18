import { supabase } from '../../../../supabase';
import { filterLowAndOutOfStock, getPhnomPenhNow } from '../../../../lib/stockAlertEngine';

// Daily Cron Job for 8:00 AM Cambodia Stock Alert
// Can be triggered by external cron, Vercel cron, or server automation
export async function GET(request) {
  try {
    const { hour, dateStr } = getPhnomPenhNow();
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    // Must be 8:00 AM or later in Cambodia (unless forced)
    if (!force && hour < 8) {
      return Response.json({
        skipped: true,
        reason: 'Current Cambodia hour is ' + hour + ', stock alert runs at or after 08:00 AM.',
        hour,
        dateStr
      });
    }

    // Fetch all active stores
    const { data: stores, error: storesErr } = await supabase
      .from('stores')
      .select('id, name, slug, telegram, settings, status')
      .neq('status', 'suspended');

    if (storesErr) throw storesErr;

    const results = [];

    for (const store of (stores || [])) {
      // Fetch store's products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sku, price, stock_qty, low_stock_alert, category, store_id')
        .eq('store_id', store.id);

      if (!products || products.length === 0) continue;

      const { allAlertItems } = filterLowAndOutOfStock(products);
      if (allAlertItems.length === 0) continue;

      // Check if store settings has already marked sent for today
      const lastSent = store.settings?.lastStockAlertDate;
      if (!force && lastSent === dateStr) {
        results.push({ store: store.name, skipped: 'already_sent_today' });
        continue;
      }

      // Send telegram alert
      const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
      const tgRes = await fetch(`${origin}/api/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'low_stock',
          storeId: store.id,
          storeSlug: store.slug,
          storeName: store.name,
          items: allAlertItems
        })
      });

      const tgData = await tgRes.json().catch(() => ({}));
      if (tgData.success) {
        // Record lastStockAlertDate in store settings
        const updatedSettings = { ...(store.settings || {}), lastStockAlertDate: dateStr };
        await supabase.from('stores').update({ settings: updatedSettings }).eq('id', store.id);
        results.push({ store: store.name, sent: true, count: allAlertItems.length });
      } else {
        results.push({ store: store.name, error: tgData.error });
      }
    }

    return Response.json({
      success: true,
      hour,
      dateStr,
      processedStores: results.length,
      details: results
    });
  } catch (err) {
    return Response.json({ success: false, error: err?.message }, { status: 500 });
  }
}
