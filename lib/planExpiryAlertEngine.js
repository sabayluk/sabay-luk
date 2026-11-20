// ⭐️ Engine គ្រប់គ្រងការជូនដំណឹងពេលហាងជិតផុតកំណត់ (Plan Expiry Alert Engine) ⭐️
// Requirements:
// 1. បង្ហាញពេលវេលាប្រើអស់ និងពេលវេលានៅសល់របស់ហាងនីមួយៗ
// 2. ពេលហាងជិតដល់ថ្ងៃផុតកំណត់ (សល់ <= ៧ ថ្ងៃ)៖ Alert ឱ្យ Admin ដឹង, Alert ឱ្យម្ចាស់ហាងដឹង
// 3. ផ្ញើការជូនដំណឹងតាម Telegram ទៅម្ចាស់ហាង និង Telegram Owner ព្រមទាំងភ្ជាប់ Button Link ទៅកាន់កន្លែងបន្តបង់ប្រាក់ & គម្រោងសេវាកម្ម

import { getStorePlanExpiryInfo, STORE_PLANS } from './stores';
import { supabase } from '../supabase';

// ទទួលបានកាលបរិច្ឆេទភ្នំពេញបច្ចុប្បន្ន (YYYY-MM-DD)
export function getPhnomPenhDateStr() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const phnomPenhNow = new Date(utcMs + (7 * 3600000));
  const year = phnomPenhNow.getFullYear();
  const month = String(phnomPenhNow.getMonth() + 1).padStart(2, '0');
  const day = String(phnomPenhNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ត្រងយកហាងទាំងអស់ដែលជិតផុតកំណត់ (សល់ <= ៧ ថ្ងៃ ឬផុតកំណត់)
export function filterExpiringStores(stores) {
  if (!Array.isArray(stores)) return [];
  return stores
    .filter(st => st.id !== 'store_default_sabayluk' && st.plan !== 'FREE' && st.status !== 'SUSPENDED')
    .map(st => ({
      store: st,
      expiry: getStorePlanExpiryInfo(st)
    }))
    .filter(item => item.expiry.daysLeft <= 7);
}

// ពិនិត្យមើលថាតើហាងនេះបានផ្ញើ Alert ថ្ងៃនេះរួចហើយឬនៅ
export function isExpiryAlertSentToday(store) {
  const todayStr = getPhnomPenhDateStr();
  const lastAlert = store?.settings?.lastExpiryAlertDate || (typeof window !== 'undefined' ? localStorage.getItem(`sabay_expiry_alert_sent_${store?.id}`) : null);
  return lastAlert === todayStr;
}

// កត់ត្រាថាបានផ្ញើ Alert រួចហើយថ្ងៃនេះ
export function markExpiryAlertSentToday(storeId) {
  if (!storeId) return;
  const todayStr = getPhnomPenhDateStr();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`sabay_expiry_alert_sent_${storeId}`, todayStr);
    } catch (_) {}
  }
}

// ផ្ញើ Telegram Alert សម្រាប់ហាងមួយ (ទៅម្ចាស់ហាង និង Platform Owner)
export async function sendStorePlanExpiryTelegramAlert(store, { origin, force = false } = {}) {
  if (!store) return { success: false, reason: 'no_store' };

  const expiry = getStorePlanExpiryInfo(store);
  if (!force && expiry.daysLeft > 7 && !expiry.isExpired) {
    return { success: false, reason: 'not_expiring_soon', daysLeft: expiry.daysLeft };
  }

  const todayStr = getPhnomPenhDateStr();
  if (!force && isExpiryAlertSentToday(store)) {
    return { success: false, reason: 'already_sent_today', todayStr };
  }

  const planInfo = STORE_PLANS[store.plan] || { name: store.plan || 'PAID' };
  const siteOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  const renewalUrl = `${siteOrigin}/plans?store=${store.slug || store.id}`;

  try {
    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store_plan_expiring_alert',
        storeId: store.id,
        storeSlug: store.slug,
        storeName: store.name,
        ownerName: store.owner_name || 'ម្ចាស់ហាង',
        phone: store.phone || '',
        telegram: store.telegram || '',
        planKey: store.plan,
        planName: planInfo.name,
        daysUsed: expiry.daysUsed,
        daysLeft: expiry.daysLeft,
        isExpired: expiry.isExpired,
        formattedExpiry: expiry.formattedExpiry,
        renewalUrl
      })
    });

    const data = await res.json();
    if (data && data.success) {
      markExpiryAlertSentToday(store.id);

      // Record to store settings in cloud
      try {
        const updatedSettings = {
          ...(store.settings || {}),
          lastExpiryAlertDate: todayStr
        };
        await supabase
          .from('stores')
          .update({
            settings: updatedSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', store.id);
      } catch (dbErr) {
        console.warn('Could not record lastExpiryAlertDate to stores table:', dbErr);
      }

      return { success: true, storeName: store.name, data };
    }
    return { success: false, error: data?.error || 'Failed to send Telegram alert' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ផ្ញើ Telegram Alert ទៅកាន់គ្រប់ហាងទាំងអស់ដែលជិតផុតកំណត់ (<= 7 ថ្ងៃ)
export async function sendAllExpiringStoresTelegramAlerts(stores, { origin, force = false } = {}) {
  const expiring = filterExpiringStores(stores);
  if (expiring.length === 0) {
    return { success: true, count: 0, results: [] };
  }

  const results = [];
  for (const item of expiring) {
    const res = await sendStorePlanExpiryTelegramAlert(item.store, { origin, force });
    results.push({ storeName: item.store.name, ...res });
  }

  return {
    success: true,
    totalExpiring: expiring.length,
    sentCount: results.filter(r => r.success).length,
    results
  };
}
