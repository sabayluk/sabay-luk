import { supabase } from '../../../../supabase';
import { getPhnomPenhDateStr, sendStorePlanExpiryTelegramAlert } from '../../../../lib/planExpiryAlertEngine';
import { getStorePlanExpiryInfo } from '../../../../lib/stores';

// ⭐️ Daily Cron Job for Store Plan Expiry Telegram Alerts (សល់ <= ៧ ថ្ងៃ) ⭐️
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    const origin = url.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const todayStr = getPhnomPenhDateStr();

    // Fetch all active paid stores
    const { data: stores, error: storesErr } = await supabase
      .from('stores')
      .select('id, name, slug, telegram, phone, owner_name, plan, plan_expires_at, billing_cycle, created_at, settings, status')
      .neq('status', 'SUSPENDED');

    if (storesErr) throw storesErr;

    const results = [];

    for (const store of (stores || [])) {
      if (store.id === 'store_default_sabayluk' || store.plan === 'FREE') continue;

      const expiry = getStorePlanExpiryInfo(store);

      // Check if store is expiring soon (<= 7 days) or expired
      if (expiry.daysLeft <= 7) {
        const lastSent = store.settings?.lastExpiryAlertDate;
        if (!force && lastSent === todayStr) {
          results.push({ store: store.name, status: 'skipped_already_sent_today' });
          continue;
        }

        const res = await sendStorePlanExpiryTelegramAlert(store, { origin, force });
        results.push({ store: store.name, daysLeft: expiry.daysLeft, ...res });
      }
    }

    return Response.json({
      success: true,
      today: todayStr,
      totalChecked: (stores || []).length,
      alertsProcessed: results.length,
      results
    });
  } catch (err) {
    return Response.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
