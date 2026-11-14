import { supabase } from '../supabase';

export const DEFAULT_FLAGSHIP_STORE = {
  id: 'store_default_sabayluk',
  slug: 'sabay-luk',
  name: 'SABAY LUK',
  business_type: 'shoes_fashion',
  phone: '096 720 5522',
  telegram: 'Sabayluk',
  address: 'ភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា',
  owner_name: 'វិចិត្រ (ម្ចាស់ហាង)',
  owner_username: 'admin',
  pin: '1234',
  plan: 'ENTERPRISE',
  max_products: 9999,
  max_staff: 10,
  status: 'ACTIVE',
  created_at: '2026-01-01T00:00:00.000Z'
};

export const STORE_PLANS = {
  FREE: {
    id: 'FREE',
    name: '🎁 ឥតគិតថ្លៃ (Free Lifetime)',
    price: 0,
    priceYearly: 0,
    maxProducts: 15,
    maxStaff: 1,
    desc: 'ស័ក្តិសមសម្រាប់អ្នកលក់ថ្មីថ្មោង ឬអ្នកចង់តេស្តសាកល្បង ប្រើបានរហូត'
  },
  STARTER: {
    id: 'STARTER',
    name: '🌱 Starter ($1/ខែ ឬ $10/ឆ្នាំ)',
    price: 1,
    priceYearly: 10,
    maxProducts: 50,
    maxStaff: 2,
    desc: 'សម្រាប់តូបតូចៗ ឬអ្នកលក់ Live តាមផ្ទះ'
  },
  BASIC: {
    id: 'BASIC',
    name: '⚡ Basic ($2/ខែ ឬ $20/ឆ្នាំ)',
    price: 2,
    priceYearly: 20,
    maxProducts: 100,
    maxStaff: 2,
    desc: 'សម្រាប់ហាងខ្នាតតូច មានបុគ្គលិកជួយលក់'
  },
  PRO: {
    id: 'PRO',
    name: '🚀 Pro ($3/ខែ ឬ $30/ឆ្នាំ)',
    price: 3,
    priceYearly: 30,
    maxProducts: 250,
    maxStaff: 3,
    desc: 'សម្រាប់ហាងពេញនិយម ស្តុកច្រើន Size/Color'
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: '🔥 Business ($5/ខែ ឬ $50/ឆ្នាំ)',
    price: 5,
    priceYearly: 50,
    maxProducts: 600,
    maxStaff: 5,
    desc: 'សម្រាប់ហាងធំគួរសម ឬមានសាខា'
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: '👑 Enterprise ($10/ខែ ឬ $99/ឆ្នាំ)',
    price: 10,
    priceYearly: 99,
    maxProducts: 2500,
    maxStaff: 10,
    desc: 'មុខងារពេញលេញ ស្តុកច្រើន និងបុគ្គលិកច្រើន'
  }
};

// Generate clean URL slug from store name (e.g. "Angkor Shoe Shop" -> "angkor-shoe-shop")
export const generateSlug = (text) => {
  if (!text) return `store-${Date.now().toString().slice(-4)}`;
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u1780-\u17FF\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || `store-${Date.now().toString().slice(-4)}`;
};

// Load all stores from LocalStorage + Supabase
export const getLocalStores = () => {
  if (typeof window === 'undefined') return [DEFAULT_FLAGSHIP_STORE];
  try {
    const saved = localStorage.getItem('sabay_registered_stores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [DEFAULT_FLAGSHIP_STORE];
};

export const saveLocalStores = (stores) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('sabay_registered_stores', JSON.stringify(stores));
  } catch (e) {}
};

// Fetch stores from Supabase (graceful fallback)
export const fetchAllStores = async () => {
  const localList = getLocalStores();
  try {
    const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      // Merge with local
      const mergedMap = new Map();
      localList.forEach(s => mergedMap.set(s.id, s));
      data.forEach(s => mergedMap.set(s.id, { ...mergedMap.get(s.id), ...s }));
      const merged = Array.from(mergedMap.values());
      saveLocalStores(merged);
      return merged;
    }
  } catch (e) {}
  return localList;
};

// Create a new store record
export const registerNewStore = async (storeInput) => {
  const cleanName = (storeInput.name || 'ហាងថ្មី').trim();
  const slug = generateSlug(storeInput.slug || cleanName);
  const storeId = `store_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`;
  const planKey = storeInput.plan || 'FREE';
  const planInfo = STORE_PLANS[planKey] || STORE_PLANS.FREE;

  const newStore = {
    id: storeId,
    slug: slug,
    name: cleanName,
    business_type: storeInput.business_type || 'retail',
    phone: storeInput.phone || '',
    telegram: storeInput.telegram || '',
    address: storeInput.address || 'រាជធានីភ្នំពេញ',
    owner_name: storeInput.owner_name || 'ម្ចាស់ហាង',
    owner_username: (storeInput.owner_username || 'admin').trim().toLowerCase(),
    pin: storeInput.pin || '1234',
    plan: planKey,
    max_products: planInfo.maxProducts,
    max_staff: planInfo.maxStaff,
    status: 'ACTIVE',
    settings: {
      storeName: cleanName,
      phone: storeInput.phone || '',
      telegram: storeInput.telegram || '',
      address: storeInput.address || '',
      logoUrl: '',
      khqrImageUrl: '/khqr-aba.jpg',
      bankAccountName: cleanName,
      bankAccountUsd: storeInput.phone || '010 723 080',
      bankAccountKhr: '004 500 394',
      exchangeRate: 4100,
      showReceiptQr: true,
      showInvoiceLogo: true,
      themeColor: '#ff6a00'
    },
    created_at: new Date().toISOString()
  };

  // 1. Save to LocalStorage immediately
  const currentStores = getLocalStores();
  const updatedStores = [newStore, ...currentStores.filter(s => s.id !== newStore.id && s.slug !== newStore.slug)];
  saveLocalStores(updatedStores);

  // 2. Set as active store
  setActiveStore(newStore);

  // 3. Attempt to save to Supabase (if table exists)
  try {
    await supabase.from('stores').insert([newStore]);
  } catch (e) {
    console.log('Stores table not yet migrated on Supabase, saved locally', e);
  }

  return newStore;
};

// Get current active store
export const getActiveStore = () => {
  if (typeof window === 'undefined') return DEFAULT_FLAGSHIP_STORE;

  // Check URL search parameter first (?store=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const storeParam = params.get('store');
    if (storeParam) {
      const stores = getLocalStores();
      const matched = stores.find(s => s.slug === storeParam || s.id === storeParam);
      if (matched) {
        localStorage.setItem('sabay_active_store', JSON.stringify(matched));
        return matched;
      }
    }
  } catch (e) {}

  // Check LocalStorage
  try {
    const saved = localStorage.getItem('sabay_active_store');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {}

  return DEFAULT_FLAGSHIP_STORE;
};

// Set active store
export const setActiveStore = (store) => {
  if (typeof window === 'undefined' || !store) return;
  try {
    localStorage.setItem('sabay_active_store', JSON.stringify(store));
    window.dispatchEvent(new Event('sabay_store_changed'));
  } catch (e) {}
};

// Check if store product count is at limit
export const checkStorePlanLimit = (store, productCount) => {
  const currentStore = store || DEFAULT_FLAGSHIP_STORE;
  const planInfo = STORE_PLANS[currentStore.plan] || STORE_PLANS.FREE;
  const maxAllowed = currentStore.max_products || planInfo.maxProducts || 15;
  const isReached = productCount >= maxAllowed;

  return {
    isReached,
    currentCount: productCount,
    maxAllowed,
    plan: planInfo,
    nextPlan: planInfo.id === 'FREE' ? STORE_PLANS.STARTER : STORE_PLANS.BASIC
  };
};
