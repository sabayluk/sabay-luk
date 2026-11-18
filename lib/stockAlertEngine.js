// Stock Alert Engine for Sabay Luk (Telegram 8:00 AM Cambodia time + Admin Dashboard Bouncing Alert)

export function getPhnomPenhNow() {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type)?.value;
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = parseInt(getPart('hour') || '0', 10);
    const minute = parseInt(getPart('minute') || '0', 10);
    const dateStr = `${year}-${month}-${day}`;

    return { hour, minute, dateStr, raw: now };
  } catch (_) {
    // Fallback if timezone formatting fails
    const utcHours = now.getUTCHours();
    const khmerHours = (utcHours + 7) % 24;
    const dateStr = now.toISOString().slice(0, 10);
    return { hour: khmerHours, minute: now.getUTCMinutes(), dateStr, raw: now };
  }
}

export function filterLowAndOutOfStock(products = []) {
  if (!Array.isArray(products)) return { outOfStock: [], lowStock: [], total: 0 };

  const outOfStock = products.filter(p => {
    const qty = Number(p.stock_qty ?? p.stock ?? 0);
    return qty <= 0;
  });

  const lowStock = products.filter(p => {
    const qty = Number(p.stock_qty ?? p.stock ?? 0);
    const threshold = Number(p.low_stock_alert ?? 5);
    return qty > 0 && qty <= threshold;
  });

  return {
    outOfStock,
    lowStock,
    allAlertItems: [...outOfStock, ...lowStock],
    total: outOfStock.length + lowStock.length
  };
}

export function isStockAlertSnoozedToday(storeId) {
  if (typeof window === 'undefined') return false;
  const { dateStr } = getPhnomPenhNow();
  const key = `sabay_stock_snoozed_${storeId || 'default'}`;
  return localStorage.getItem(key) === dateStr;
}

export function snoozeStockAlertForToday(storeId) {
  if (typeof window === 'undefined') return;
  const { dateStr } = getPhnomPenhNow();
  const key = `sabay_stock_snoozed_${storeId || 'default'}`;
  localStorage.setItem(key, dateStr);
}

export function isTelegramStockAlertSentToday(storeId) {
  if (typeof window === 'undefined') return false;
  const { dateStr } = getPhnomPenhNow();
  const key = `sabay_stock_tg_sent_${storeId || 'default'}`;
  return localStorage.getItem(key) === dateStr;
}

export function markTelegramStockAlertSentToday(storeId) {
  if (typeof window === 'undefined') return;
  const { dateStr } = getPhnomPenhNow();
  const key = `sabay_stock_tg_sent_${storeId || 'default'}`;
  localStorage.setItem(key, dateStr);
}

export async function sendDailyTelegramStockAlert(store, products, { force = false } = {}) {
  const storeId = store?.id || 'store_default_sabayluk';
  const { hour, dateStr } = getPhnomPenhNow();

  // Condition: Must be 8:00 AM or later in Cambodia (hour >= 8) unless forced manually
  if (!force) {
    if (hour < 8) return { sent: false, reason: 'too_early', currentHour: hour };
    if (isTelegramStockAlertSentToday(storeId)) return { sent: false, reason: 'already_sent_today' };
  }

  const { allAlertItems } = filterLowAndOutOfStock(products);
  if (allAlertItems.length === 0) {
    return { sent: false, reason: 'no_low_stock_items' };
  }

  try {
    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'low_stock',
        storeId: store?.id,
        storeSlug: store?.slug,
        storeName: store?.name || 'SABAY LUK',
        items: allAlertItems
      })
    });
    const result = await res.json();
    if (result && result.success) {
      markTelegramStockAlertSentToday(storeId);
      return { sent: true, count: allAlertItems.length, result };
    }
    return { sent: false, reason: 'api_error', error: result?.error };
  } catch (err) {
    return { sent: false, reason: 'network_error', error: err?.message };
  }
}

export function jumpToProductInInventory(product, {
  setActiveTab,
  setInventorySubTab,
  setFilterStatus,
  setInvSearch,
  handleOpenQuickEdit
}) {
  if (!product) return;

  // 1. Switch to inventory tab and items view
  if (setActiveTab) setActiveTab('inventory');
  if (setInventorySubTab) setInventorySubTab('items');

  // 2. Clear searches so the item isn't filtered out
  if (setInvSearch) setInvSearch('');

  // 3. Set filter status appropriately
  const qty = Number(product.stock_qty ?? product.stock ?? 0);
  if (setFilterStatus) {
    if (qty <= 0) {
      setFilterStatus('out');
    } else {
      setFilterStatus('low');
    }
  }

  // 4. Scroll smoothly to product row or card and highlight with animated pulse ring
  // (NO popup modal per user request 163: "កុំអោយវាលោតផ្ទាំងមកអី អោយវាទាញអេក្រង់ទៅរកទំនិញអស់ស្តុកបានហើយ")
  setTimeout(() => {
    const rowEl = document.getElementById(`product-row-${product.id}`);
    const cardEl = document.getElementById(`product-card-${product.id}`);
    const target = rowEl || cardEl;

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-4', 'ring-rose-500', 'bg-rose-100', 'shadow-xl', 'transition-all', 'duration-300');
      setTimeout(() => {
        target.classList.remove('ring-4', 'ring-rose-500', 'bg-rose-100', 'shadow-xl');
      }, 5000);
    }
  }, 250);
}
