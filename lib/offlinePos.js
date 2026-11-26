// ⭐️ Offline POS Manager: Local Cache & Automatic Sync Queue ⭐️
import { supabase } from '../supabase';

const OFFLINE_PRODUCTS_KEY = 'sabay_offline_products_cache';
const OFFLINE_ORDERS_QUEUE_KEY = 'sabay_offline_orders_queue';

// Save products locally so POS can sell without Internet
export const cacheProductsOffline = (storeId, products) => {
  if (typeof window === 'undefined' || !Array.isArray(products)) return;
  try {
    const key = `${OFFLINE_PRODUCTS_KEY}_${storeId || 'store_default_sabayluk'}`;
    localStorage.setItem(key, JSON.stringify(products));
  } catch (e) {
    console.warn('Failed to cache products offline:', e);
  }
};

// Retrieve cached products if offline
export const getCachedProductsOffline = (storeId) => {
  if (typeof window === 'undefined') return [];
  try {
    const key = `${OFFLINE_PRODUCTS_KEY}_${storeId || 'store_default_sabayluk'}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

// Queue order locally when offline
export const queueOfflineOrder = (orderPayload, stockAdjustments = []) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getOfflineOrdersQueue();
    const newQueueItem = {
      id: `OFFLINE-${Date.now()}`,
      orderPayload,
      stockAdjustments,
      queued_at: new Date().toISOString()
    };
    existing.push(newQueueItem);
    localStorage.setItem(OFFLINE_ORDERS_QUEUE_KEY, JSON.stringify(existing));
    return newQueueItem;
  } catch (e) {
    console.error('Failed to queue offline order:', e);
  }
};

// Get queued orders waiting to sync
export const getOfflineOrdersQueue = () => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(OFFLINE_ORDERS_QUEUE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

// Clear or update the offline queue
export const setOfflineOrdersQueue = (queue) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_ORDERS_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {}
};

// ⭐️ Automatic Sync to Supabase when Internet returns ⭐️
export const syncOfflineOrdersToCloud = async () => {
  if (typeof window === 'undefined' || !navigator.onLine) return { synced: 0, failed: 0 };
  const queue = getOfflineOrdersQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let remaining = [];

  const VALID_ORDER_COLUMNS = [
    'order_id', 'store_id', 'customer_name', 'phone', 'phone_number',
    'address', 'delivery_address', 'total_amount', 'subtotal', 'discount',
    'payment_method', 'status', 'order_type', 'items', 'created_at', 'payment_slip_url'
  ];

  for (const item of queue) {
    try {
      // 1. Insert order with sanitized columns
      const rawPayload = item.orderPayload || {};
      const cloudPayload = {};
      VALID_ORDER_COLUMNS.forEach(k => {
        if (rawPayload[k] !== undefined) cloudPayload[k] = rawPayload[k];
      });
      if (!cloudPayload.created_at) {
        cloudPayload.created_at = item.queued_at || new Date().toISOString();
      }

      let { error: ordErr } = await supabase.from('orders').insert([cloudPayload]);

      // Resilient schema column error retry
      if (ordErr && ordErr.message && ordErr.message.includes('Could not find the') && ordErr.message.includes('column')) {
        const match = ordErr.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          delete cloudPayload[match[1]];
          const retry = await supabase.from('orders').insert([cloudPayload]);
          ordErr = retry.error;
        }
      }

      if (ordErr && !ordErr.message?.includes('duplicate key')) {
        throw ordErr;
      }

      // 2. Adjust stock in database if adjustments were recorded
      if (Array.isArray(item.stockAdjustments) && item.stockAdjustments.length > 0) {
        for (const adj of item.stockAdjustments) {
          try {
            const { data: pData } = await supabase.from('products').select('stock_qty').eq('id', adj.productId).single();
            if (pData) {
              const newQty = Math.max(0, (pData.stock_qty || 0) - adj.qty);
              await supabase.from('products').update({
                stock_qty: newQty,
                status: newQty > 0 ? 'In Stock' : 'Out of Stock'
              }).eq('id', adj.productId);
            }
          } catch (pErr) {}
        }
      }

      synced++;
    } catch (err) {
      console.warn('Sync failed for item:', item.id, err);
      remaining.push(item);
    }
  }

  setOfflineOrdersQueue(remaining);
  return { synced, failed: remaining.length };
};
