import { supabase } from '../supabase';

// ⭐️ Helper: ផ្ទៀងផ្ទាត់ថាតើទិន្នន័យ (Product, Order, Category, Expense) ជារបស់ហាងណា ធានាការបែងចែកទិន្នន័យដាច់ដោយឡែក ១០០%
export const isItemBelongsToStore = (item, storeId) => {
  if (!item) return false;
  const itemStoreId = item.store_id || 'store_default_sabayluk';
  const targetStoreId = storeId || 'store_default_sabayluk';
  return itemStoreId === targetStoreId;
};

export const DEFAULT_FLAGSHIP_STORE = {
  id: 'store_default_sabayluk',
  slug: 'sabay-luk',
  name: 'SABAY LUK',
  business_type: 'shoes_fashion',
  phone: '096 720 5522',
  telegram: 'Sabayluk',
  address: 'ភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា',
  owner_name: 'សេង សុវាសនា (Master Owner)',
  owner_email: 'sengsoveasna93@gmail.com',
  owner_username: 'sengsoveasna93@gmail.com',
  pin: '1234',
  plan: 'ENTERPRISE',
  max_products: 9999,
  max_staff: 10,
  status: 'ACTIVE',
  created_at: '2026-01-01T00:00:00.000Z',
  last_activity_at: '2026-01-01T00:00:00.000Z'
};

export const STORE_PLANS = {
  FREE: {
    id: 'FREE',
    name: '🎁 ឥតគិតថ្លៃ (Free Lifetime)',
    price: 0,
    priceYearly: 0,
    savingsYearly: 0,
    maxProducts: 15,
    maxStaff: 1,
    accountsLabel: '1 Admin',
    desc: 'អ្នកលក់ថ្មីថ្មោង ឬអ្នកចង់តេស្តសាកល្បង (គ្មានហានិភ័យ)'
  },
  STARTER: {
    id: 'STARTER',
    name: '🌱 Starter ($1/ខែ ឬ $10/ឆ្នាំ)',
    price: 1,
    priceYearly: 10,
    savingsYearly: 2,
    maxProducts: 25,
    maxStaff: 2,
    accountsLabel: '1 Admin + 1 បុគ្គលិក',
    desc: 'តូបតូចៗ អ្នកលក់ Live តាមផ្ទះ (ទំនិញ 25 មុខ)'
  },
  BASIC: {
    id: 'BASIC',
    name: '⚡ Basic ($2/ខែ ឬ $20/ឆ្នាំ)',
    price: 2,
    priceYearly: 20,
    savingsYearly: 4,
    maxProducts: 50,
    maxStaff: 2,
    accountsLabel: '1 Admin + 1 បុគ្គលិក',
    desc: 'ហាងខោអាវ ស្បែកជើងខ្នាតតូច (ទំនិញ 50 មុខ)'
  },
  PRO: {
    id: 'PRO',
    name: '🚀 Pro ($3/ខែ ឬ $30/ឆ្នាំ)',
    price: 3,
    priceYearly: 30,
    savingsYearly: 6,
    maxProducts: 100,
    maxStaff: 3,
    accountsLabel: '1 Admin + 2 បុគ្គលិក',
    desc: 'ហាងពេញនិយម (ទំនិញ 100 មុខ & 3 គណនី)'
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: '🔥 Business ($5/ខែ ឬ $50/ឆ្នាំ)',
    price: 5,
    priceYearly: 50,
    savingsYearly: 10,
    maxProducts: 200,
    maxStaff: 4,
    accountsLabel: '1 Admin + 3 បុគ្គលិក',
    desc: 'ហាងទំហំមធ្យម មានស្តុកច្រើន Size/Color (ទំនិញ 200 មុខ & 4 គណនី)'
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: '💎 Premium ($7/ខែ ឬ $70/ឆ្នាំ)',
    price: 7,
    priceYearly: 70,
    savingsYearly: 14,
    maxProducts: 500,
    maxStaff: 6,
    accountsLabel: '1 Admin + 5 បុគ្គលិក',
    desc: 'ហាងធំគួរសម មានបុគ្គលិកច្រើន (ទំនិញ 500 មុខ & 6 គណនី)'
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: '👑 Enterprise ($10/ខែ ឬ $100/ឆ្នាំ)',
    price: 10,
    priceYearly: 100,
    savingsYearly: 20,
    maxProducts: 1000,
    maxStaff: 11,
    accountsLabel: '1 Admin + 10 បុគ្គលិក',
    desc: 'ហាងធំៗ សាខា ឬឃ្លាំងស្តុកធំ (ទំនិញ 1,000 មុខ & 11 គណនី)'
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

// Reserved system slugs that merchants cannot take
export const RESERVED_SLUGS = [
  'admin', 'api', 'plans', 'register', 'track', 'invoice', 'pos-display', 
  'store', 'login', 'shop', 'dashboard', 'settings', 'user', 'users', 'auth'
];

// Check if store name or slug is already taken (Strict Uniqueness Check)
export const isStoreNameOrSlugTaken = (name, slug, excludeStoreId = null) => {
  const cleanName = (name || '').trim().toLowerCase();
  const cleanSlug = (slug || '').trim().toLowerCase();
  if (!cleanName && !cleanSlug) return { taken: false };

  // Check reserved system slugs
  if (cleanSlug && RESERVED_SLUGS.includes(cleanSlug)) {
    return { 
      taken: true, 
      reason: 'RESERVED_SLUG', 
      message: `❌ តំណភ្ជាប់ "${cleanSlug}" ជាឈ្មោះប្រព័ន្ធ (Reserved) មិនអាចប្រើបានឡើយ!` 
    };
  }

  const currentStores = getLocalStores();
  for (const s of currentStores) {
    if (excludeStoreId && s.id === excludeStoreId) continue;
    const sName = (s.name || '').trim().toLowerCase();
    const sSlug = (s.slug || '').trim().toLowerCase();
    
    if (cleanName && sName === cleanName) {
      return { 
        taken: true, 
        reason: 'NAME_EXISTS', 
        message: `❌ ឈ្មោះហាង "${name}" មានគេចុះឈ្មោះរួចហើយ! ហាមដាក់ឈ្មោះហាងជាន់គ្នាដាច់ខាត។` 
      };
    }
    if (cleanSlug && sSlug === cleanSlug) {
      return { 
        taken: true, 
        reason: 'SLUG_EXISTS', 
        message: `❌ តំណភ្ជាប់ "sabayluk.com/store/${cleanSlug}" មានម្ចាស់រួចហើយ! សូមប្តូរឈ្មោះ ឬ Link ផ្សេងដើម្បីកុំឱ្យច្រឡំហាងគ្នា។` 
      };
    }
  }

  return { taken: false };
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

// Fetch stores from Supabase (graceful fallback) & normalize owner_email from settings
// ⭐️ CLOUD IS AUTHORITATIVE: ហាងដែលលុបចេញពី Cloud Database ត្រូវតែលុបចេញពី LocalStorage ស្វ័យប្រវត្តិ ⭐️
export const fetchAllStores = async () => {
  const localList = getLocalStores();
  try {
    const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      // Map existing local items to preserve extra local-only UI settings
      const localMap = new Map();
      localList.forEach(s => {
        if (s && s.id) localMap.set(s.id, s);
      });

      // ⭐️ Cloud DB is authoritative: Only include stores from Cloud (or Default Flagship) ⭐️
      // Any deleted stores like Urbangrabs or Mario in local storage are automatically pruned!
      const mergedStores = data.map(dbStore => {
        const localExisting = localMap.get(dbStore.id) || {};
        const resolvedEmail = (
          dbStore.owner_email ||
          dbStore.settings?.owner_email ||
          localExisting.owner_email ||
          localExisting.settings?.owner_email ||
          (dbStore.owner_username && dbStore.owner_username.includes('@') ? dbStore.owner_username : '') ||
          (localExisting.owner_username && localExisting.owner_username.includes('@') ? localExisting.owner_username : '') ||
          ''
        ).trim().toLowerCase();

        const slip = dbStore.settings?.slip_url || dbStore.settings?.slipUrl || localExisting.slip_url || (dbStore.slug === 'urbangrabs' ? '/urbangrabs_slip.jpg' : '');
        const isApproved = dbStore.status === 'ACTIVE';
        const resolvedPaymentStatus = isApproved 
          ? 'APPROVED' 
          : (dbStore.settings?.payment_status || localExisting.payment_status || 'PENDING_APPROVAL');

        return {
          ...localExisting,
          ...dbStore,
          status: dbStore.status || 'ACTIVE',
          slip_url: slip,
          owner_email: resolvedEmail,
          payment_status: resolvedPaymentStatus,
          plan_expires_at: dbStore.settings?.plan_expires_at || localExisting.plan_expires_at || null,
          owner_username: (dbStore.owner_username || localExisting.owner_username || dbStore.settings?.owner_email || resolvedEmail || 'admin').trim().toLowerCase(),
          pin: dbStore.pin || localExisting.pin || '1234',
          settings: {
            ...(localExisting.settings || {}),
            ...(dbStore.settings || {}),
            payment_status: resolvedPaymentStatus,
            owner_email: resolvedEmail
          }
        };
      });

      // Guarantee Flagship Store is present
      const hasFlagship = mergedStores.some(s => s.id === 'store_default_sabayluk' || s.slug === 'sabay-luk');
      if (!hasFlagship) {
        mergedStores.push(DEFAULT_FLAGSHIP_STORE);
      }

      // ⭐️ Strict Slug Deduplication: 1 slug = 1 store only! ⭐️
      const bySlugMap = new Map();
      mergedStores.forEach(store => {
        const cleanSlug = (store.slug || store.id || '').trim().toLowerCase();
        if (!bySlugMap.has(cleanSlug)) {
          bySlugMap.set(cleanSlug, store);
        }
      });

      const uniqueStores = Array.from(bySlugMap.values());
      saveLocalStores(uniqueStores);
      return uniqueStores;
    }
  } catch (e) {
    console.warn('fetchAllStores fetch notice:', e);
  }

  // Local-only deduplication fallback (when offline)
  const uniqueLocalMap = new Map();
  localList.forEach(st => {
    const slugKey = (st.slug || st.id || '').trim().toLowerCase();
    uniqueLocalMap.set(slugKey, st);
  });
  const dedupedLocal = Array.from(uniqueLocalMap.values());
  saveLocalStores(dedupedLocal);
  return dedupedLocal;
};

// ⭐️ Delete store completely from LocalStorage, Cache & Cloud Supabase Database ⭐️
export const deleteStoreRecord = async (storeId) => {
  if (!storeId || storeId === 'store_default_sabayluk') return false;
  
  // 1. Find store to get both its ID and Slug before deleting
  const current = getLocalStores();
  const target = current.find(s => s.id === storeId || s.slug === storeId);
  const targetId = target?.id || storeId;
  const targetSlug = target?.slug || storeId;

  // 2. Remove from LocalStorage & clean up any related keys (Thorough Purge)
  const filtered = current.filter(s => s.id !== targetId && s.slug !== targetSlug);
  saveLocalStores(filtered);
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`sabay_active_staff_${targetId}`);
      localStorage.removeItem(`sabay_active_staff_${targetSlug}`);
      localStorage.removeItem(`sabay_staff_list_${targetId}`);
      localStorage.removeItem(`sabay_staff_list_${targetSlug}`);
      localStorage.removeItem(`sabay_offline_products_cache_${targetId}`);
      localStorage.removeItem(`sabay_offline_products_cache_${targetSlug}`);
      
      const activeRaw = localStorage.getItem('sabay_active_store');
      const adminActiveRaw = localStorage.getItem('sabay_admin_active_store');
      let shouldReset = false;
      if (activeRaw) {
        try {
          const parsed = JSON.parse(activeRaw);
          if (parsed?.id === targetId || parsed?.slug === targetSlug) shouldReset = true;
        } catch (_) {}
      }
      if (adminActiveRaw) {
        try {
          const parsed = JSON.parse(adminActiveRaw);
          if (parsed?.id === targetId || parsed?.slug === targetSlug) shouldReset = true;
        } catch (_) {}
      }
      if (shouldReset) {
        localStorage.setItem('sabay_active_store', JSON.stringify(DEFAULT_FLAGSHIP_STORE));
        localStorage.setItem('sabay_admin_active_store', JSON.stringify(DEFAULT_FLAGSHIP_STORE));
      }
      window.dispatchEvent(new Event('sabay_store_changed'));
    }
  } catch (e) {}

  // 3. Remove completely from Supabase Cloud DB (Stores, Products, Orders, Categories)
  try {
    // Delete store by ID and Slug
    await supabase.from('stores').delete().eq('id', targetId);
    await supabase.from('stores').delete().eq('slug', targetSlug);
    // Cascade delete any child items
    await supabase.from('products').delete().eq('store_id', targetId);
    await supabase.from('orders').delete().eq('store_id', targetId);
    await supabase.from('categories').delete().eq('store_id', targetId);
  } catch (err) {
    console.warn('Error deleting store from Supabase:', err);
  }

  return filtered;
};

// Create a new store record
export const registerNewStore = async (storeInput) => {
  const cleanName = (storeInput.name || 'ហាងថ្មី').trim();
  const slug = generateSlug(storeInput.slug || cleanName);

  // ⭐️ Strict Validation: Disallow duplicate store names and duplicate slugs ⭐️
  const duplicateCheck = isStoreNameOrSlugTaken(cleanName, slug);
  if (duplicateCheck.taken) {
    throw new Error(duplicateCheck.message);
  }

  const storeId = `store_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`;
  const planKey = storeInput.plan || 'FREE';
  const planInfo = STORE_PLANS[planKey] || STORE_PLANS.FREE;

  const planExpiresAt = planKey === 'FREE' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const newStore = {
    id: storeId,
    slug: slug,
    name: cleanName,
    business_type: storeInput.business_type || 'retail',
    phone: storeInput.phone || '',
    telegram: storeInput.telegram || '',
    address: storeInput.address || 'រាជធានីភ្នំពេញ',
    owner_name: storeInput.owner_name || 'ម្ចាស់ហាង',
    owner_email: (storeInput.owner_email || storeInput.email || '').trim().toLowerCase(),
    owner_username: (storeInput.owner_username || storeInput.owner_email || 'admin').trim().toLowerCase(),
    pin: storeInput.pin || storeInput.password || '1234',
    password: storeInput.password || storeInput.pin || '1234',
    plan: planKey,
    plan_expires_at: planExpiresAt,
    max_products: planInfo.maxProducts,
    max_staff: planInfo.maxStaff,
    status: storeInput.status || 'ACTIVE',
    email_verified: Boolean(storeInput.email_verified),
    payment_status: storeInput.payment_status || (planKey === 'FREE' ? 'FREE' : 'PENDING_APPROVAL'),
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
      themeColor: '#ff6a00',
      owner_email: (storeInput.owner_email || storeInput.email || '').trim().toLowerCase(),
      owner_password: storeInput.password || storeInput.pin || '1234',
      pin: storeInput.pin || storeInput.password || '1234',
      plan_expires_at: planExpiresAt,
      payment_status: storeInput.payment_status || (planKey === 'FREE' ? 'FREE' : 'PENDING_APPROVAL'),
      slip_url: storeInput.slip_url || storeInput.slipUrl || ''
    },
    created_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString()
  };

  // 1. Save to LocalStorage immediately (Append safely, never overwrite another store)
  const currentStores = getLocalStores();
  const updatedStores = [newStore, ...currentStores.filter(s => s.id !== newStore.id && s.slug !== newStore.slug)];
  saveLocalStores(updatedStores);

  // 2. Set as active store
  setActiveStore(newStore);

  // 3. Attempt to save to Supabase (if table exists)
  try {
    const dbPayload = {
      id: newStore.id,
      slug: newStore.slug,
      name: newStore.name,
      business_type: newStore.business_type || 'retail',
      phone: newStore.phone || '',
      telegram: newStore.telegram || '',
      address: newStore.address || 'រាជធានីភ្នំពេញ',
      owner_name: newStore.owner_name || 'ម្ចាស់ហាង',
      owner_username: newStore.owner_username || 'admin',
      pin: newStore.pin || '1234',
      plan: newStore.plan || 'FREE',
      max_products: newStore.max_products || 15,
      max_staff: newStore.max_staff || 1,
      status: newStore.status || 'ACTIVE',
      settings: {
        ...newStore.settings,
        owner_email: newStore.owner_email || '',
        plan_expires_at: newStore.plan_expires_at || null
      }
    };
    await supabase.from('stores').upsert([dbPayload], { onConflict: 'slug' });
  } catch (e) {
    console.log('Stores table sync notice:', e);
  }

  return newStore;
};

// Find store by slug with case-insensitive and fallback
export const fetchStoreBySlug = async (slug) => {
  if (!slug) return DEFAULT_FLAGSHIP_STORE;
  const clean = decodeURIComponent(slug).toLowerCase().trim();
  const localList = getLocalStores();
  let found = localList.find(s => 
    (s.slug && s.slug.toLowerCase() === clean) || 
    (s.name && s.name.toLowerCase() === clean) || 
    (s.id && s.id.toLowerCase() === clean)
  );
  if (found) return found;

  try {
    const { data } = await supabase.from('stores').select('*').ilike('slug', clean).maybeSingle();
    if (data) {
      // Save locally for future use
      saveLocalStores([...localList.filter(s => s.id !== data.id), data]);
      return data;
    }
    const { data: dataByName } = await supabase.from('stores').select('*').ilike('name', clean).maybeSingle();
    if (dataByName) {
      saveLocalStores([...localList.filter(s => s.id !== dataByName.id), dataByName]);
      return dataByName;
    }
  } catch (e) {}

  return null;
};

// Get current active store (Used by Admin Dashboard)
export const getActiveStore = () => {
  if (typeof window === 'undefined') return DEFAULT_FLAGSHIP_STORE;

  const validStores = getLocalStores();

  // Check URL search parameter first (?store=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const storeParam = params.get('store');
    if (storeParam) {
      if (storeParam === 'sabay-luk' || storeParam === 'store_default_sabayluk' || storeParam === 'default') {
        return DEFAULT_FLAGSHIP_STORE;
      }
      const matched = validStores.find(s => s.slug === storeParam || s.id === storeParam);
      if (matched) {
        return matched;
      }
      // If storeParam does not exist in valid stores (was deleted), clean it from URL
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('store');
        window.history.replaceState({}, '', cleanUrl.toString());
      } catch (_) {}
    }
  } catch (e) {}

  // Check LocalStorage for admin dashboard
  try {
    const saved = localStorage.getItem('sabay_admin_active_store') || localStorage.getItem('sabay_active_store');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id) {
        if (parsed.id === 'store_default_sabayluk' || parsed.slug === 'sabay-luk') {
          return DEFAULT_FLAGSHIP_STORE;
        }
        // 🚨 Validate that this store still actually exists!
        const matched = validStores.find(s => s.id === parsed.id || s.slug === parsed.slug);
        if (matched) return matched;

        // If it was deleted, purge ghost records immediately!
        try {
          localStorage.removeItem('sabay_admin_active_store');
          localStorage.setItem('sabay_active_store', JSON.stringify(DEFAULT_FLAGSHIP_STORE));
        } catch (_) {}
      }
    }
  } catch (e) {}

  return DEFAULT_FLAGSHIP_STORE;
};

// Set active store & automatically synchronize browser address bar URL
export const setActiveStore = (store) => {
  if (typeof window === 'undefined' || !store) return;
  try {
    localStorage.setItem('sabay_admin_active_store', JSON.stringify(store));
    localStorage.setItem('sabay_active_store', JSON.stringify(store));

    // ⭐️ Sync browser URL address bar immediately (No full page reload)
    try {
      const url = new URL(window.location.href);
      if (store.id === 'store_default_sabayluk' || store.slug === 'sabay-luk') {
        url.searchParams.delete('store');
      } else if (store.slug) {
        url.searchParams.set('store', store.slug);
      }
      const newRelativePathQuery = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState(null, '', newRelativePathQuery);
    } catch (e) {}

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

// ⭐️ Check if store staff account count is at plan limit
export const checkStoreStaffLimit = (store, staffCount) => {
  const currentStore = store || DEFAULT_FLAGSHIP_STORE;
  const planInfo = STORE_PLANS[currentStore.plan] || STORE_PLANS.PRO;
  const maxAllowed = currentStore.max_staff || planInfo.maxStaff || 3;
  const isReached = staffCount >= maxAllowed;

  return {
    isReached,
    currentCount: staffCount,
    maxAllowed,
    plan: planInfo,
    accountsLabel: planInfo.accountsLabel || `${maxAllowed} គណនី`
  };
};

// ⭐️ Helper ពិនិត្យមើលកាលបរិច្ឆេទផុតកំណត់ Plan & ស្ថានភាពបន្តសេវា ⭐️
export const getStorePlanExpiryInfo = (store) => {
  if (!store || store.id === 'store_default_sabayluk' || store.plan === 'FREE') {
    return {
      isLifetime: true,
      expiresAt: null,
      daysLeft: 9999,
      status: 'LIFETIME',
      badgeText: '🎁 ប្រើឥតគិតថ្លៃរហូត',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }

  // If no expires_at set yet, default to 30 days from store creation
  const createdDate = store.created_at ? new Date(store.created_at) : new Date();
  const expiryDate = store.plan_expires_at ? new Date(store.plan_expires_at) : new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      isLifetime: false,
      expiresAt: expiryDate.toISOString(),
      daysLeft,
      status: 'EXPIRED',
      badgeText: `🔴 ផុតកំណត់ ${Math.abs(daysLeft)} ថ្ងៃមុន`,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
    };
  }

  if (daysLeft <= 3) {
    return {
      isLifetime: false,
      expiresAt: expiryDate.toISOString(),
      daysLeft,
      status: 'EXPIRING_SOON',
      badgeText: `⚠️ ជិតផុតកំណត់ (សល់ ${daysLeft} ថ្ងៃ)`,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }

  return {
    isLifetime: false,
    expiresAt: expiryDate.toISOString(),
    daysLeft,
    status: 'ACTIVE',
    badgeText: `🟢 សល់ ${daysLeft} ថ្ងៃ`,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  };
};

// ⭐️ គណនាចំនួនថ្ងៃអសកម្មរបស់ហាង (Days of Inactivity) ⭐️
// រាប់ចាប់ពីសកម្មភាពចុងក្រោយ (last_activity_at) ឬថ្ងៃបង្កើតហាង (created_at)
export const getStoreInactivityDays = (store) => {
  if (!store || store.id === 'store_default_sabayluk' || store.slug === 'sabay-luk') return 0;
  const lastActiveStr = store.last_activity_at || store.created_at;
  if (!lastActiveStr) return 0;
  const lastActiveTime = new Date(lastActiveStr).getTime();
  if (isNaN(lastActiveTime)) return 0;
  const diffMs = Date.now() - lastActiveTime;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

// ⭐️ ពិនិត្យមើលថាតើហាងអសកម្មលើសពី ៣០ ថ្ងៃ (១ ខែ) ដែរឬទេ ⭐️
export const isStoreInactive = (store, daysThreshold = 30) => {
  if (!store || store.id === 'store_default_sabayluk' || store.slug === 'sabay-luk') return false;
  return getStoreInactivityDays(store) >= daysThreshold;
};

// ⭐️ កត់ត្រា និង Update សកម្មភាពថ្មីរបស់ហាង (ពេល Login, លក់ចេញ POS, បន្ថែមទំនិញ) ⭐️
export const updateStoreActivity = (storeId) => {
  if (!storeId || typeof window === 'undefined') return;
  try {
    const nowIso = new Date().toISOString();
    const currentStores = getLocalStores();
    let found = false;
    const updated = currentStores.map(s => {
      if (s.id === storeId) {
        found = true;
        return { ...s, last_activity_at: nowIso };
      }
      return s;
    });

    if (found) {
      saveLocalStores(updated);
      const active = getActiveStore();
      if (active && active.id === storeId) {
        const nextActive = { ...active, last_activity_at: nowIso };
        localStorage.setItem('sabay_admin_active_store', JSON.stringify(nextActive));
        localStorage.setItem('sabay_active_store', JSON.stringify(nextActive));
      }
      try {
        supabase.from('stores').update({ updated_at: nowIso }).eq('id', storeId).then();
      } catch (e) {}
    }
  } catch (e) {}
};

// ⭐️ ផ្អាកដំណើរការហាង (Suspend Store) ដោយសារអសកម្ម ឬល្មើសគោលការណ៍ ⭐️
export const suspendStore = async (storeId, reason = 'អសកម្មលើសពី ៣០ ថ្ងៃ') => {
  if (!storeId || storeId === 'store_default_sabayluk') return null;
  const nowIso = new Date().toISOString();
  const stores = getLocalStores();
  const idx = stores.findIndex(s => s.id === storeId);
  if (idx === -1) return null;

  const updatedStore = {
    ...stores[idx],
    status: 'SUSPENDED',
    suspended_at: nowIso,
    suspend_reason: reason
  };
  stores[idx] = updatedStore;
  saveLocalStores(stores);

  const active = getActiveStore();
  if (active && active.id === storeId) {
    setActiveStore(updatedStore);
  }

  try {
    await supabase.from('stores').update({ status: 'SUSPENDED' }).eq('id', storeId);
  } catch (e) {}

  // 🔔 ជូនដំណឹងទៅ Telegram របស់ Master Owner
  try {
    fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store_suspended',
        store: updatedStore,
        reason: reason,
        suspendedAt: new Date(nowIso).toLocaleDateString('km-KH')
      })
    }).catch(e => console.warn('Telegram notice error:', e));
  } catch (e) {}

  return updatedStore;
};

// ⭐️ បើកដំណើរការហាងឡើងវិញ (Reactivate Store) ⭐️
export const reactivateStore = async (storeId) => {
  if (!storeId) return null;
  const nowIso = new Date().toISOString();
  const stores = getLocalStores();
  const idx = stores.findIndex(s => s.id === storeId);
  if (idx === -1) return null;

  const updatedStore = {
    ...stores[idx],
    status: 'ACTIVE',
    last_activity_at: nowIso,
    suspended_at: null,
    suspend_reason: null
  };
  stores[idx] = updatedStore;
  saveLocalStores(stores);

  const active = getActiveStore();
  if (active && active.id === storeId) {
    setActiveStore(updatedStore);
  }

  try {
    await supabase.from('stores').update({ status: 'ACTIVE' }).eq('id', storeId);
  } catch (e) {}

  return updatedStore;
};

// ⭐️ បន្តសុពលភាព Plan របស់ហាង (+១ ខែ ឬ +១ ឆ្នាំ) ⭐️
export const renewStoreSubscription = async (storeId, months = 1) => {
  const stores = getLocalStores();
  const targetIndex = stores.findIndex(s => s.id === storeId);
  if (targetIndex === -1) return null;

  const currentStore = stores[targetIndex];
  const currentExpiry = currentStore.plan_expires_at ? new Date(currentStore.plan_expires_at) : new Date();
  const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
  
  // គណនាថ្ងៃបន្ត៖ បើ months === 12 គឺ ៣៦៥ ថ្ងៃ (១ ឆ្នាំពេញ), បើផ្សេងទៀតគណនាគុណ ៣០ ថ្ងៃ
  const daysToAdd = months === 12 ? 365 : (months * 30);
  const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  const updatedStore = {
    ...currentStore,
    plan_expires_at: newExpiry,
    status: 'ACTIVE'
  };

  stores[targetIndex] = updatedStore;
  saveLocalStores(stores);

  const activeStore = getActiveStore();
  if (activeStore && activeStore.id === storeId) {
    setActiveStore(updatedStore);
  }

  try {
    const renewSettings = {
      ...(stores[targetIndex].settings || {}),
      plan_expires_at: newExpiry,
      payment_status: 'APPROVED'
    };
    await supabase.from('stores').update({
      status: 'ACTIVE',
      settings: renewSettings
    }).eq('id', storeId);
  } catch (e) {}

  // 🔔 ផ្ញើដំណឹងស្វ័យប្រវត្តិចូល Telegram របស់ Master Owner
  try {
    fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'plan_renewed',
        store: updatedStore,
        duration: months === 12 ? '១ ឆ្នាំ (+៣៦៥ ថ្ងៃ)' : `${months} ខែ (+${daysToAdd} ថ្ងៃ)`,
        newExpiryDate: new Date(newExpiry).toLocaleDateString('km-KH')
      })
    }).catch(e => console.warn('Telegram notice error:', e));
  } catch (e) {}

  return updatedStore;
};

// ⭐️ គ្រប់គ្រងប្រព័ន្ធទូទាត់ និងបង្កាន់ដៃបង់ប្រាក់ Subscription (SaaS Payment System) ⭐️
export const getSubscriptionPayments = (storeId = null) => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('sabay_subscription_payments');
    let list = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(list)) list = [];

    // Ensure sample flagship slip exists
    if (!list.some(p => p.store_id === 'store_default_sabayluk')) {
      list.push({
        id: 'SUB_092144',
        store_id: 'store_default_sabayluk',
        store_name: 'Sabay Luk Flagship Store',
        plan_key: 'PRO',
        plan_name: '🚀 Pro ($3/ខែ)',
        amount: 3.00,
        billing_cycle: 'monthly',
        payment_method: 'Bakong KHQR / ABA Pay',
        slip_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        status: 'PENDING',
        notes: 'បានបង់ប្រាក់តាម ABA KHQR រួចរាល់ សូមជួយពិនិត្យផង',
        phone: '098 765 432',
        created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        expires_target: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // ⭐️ ធ្វើសមកាលកម្ម Slip & Payment សម្រាប់ហាងដែលកំពុងរង់ចាំ Approve (ដូចជា urbangrabs) ⭐️
    try {
      const allStores = getLocalStores();
      let hasChanges = false;
      allStores.forEach(st => {
        if (!st || !st.id || st.id === 'store_default_sabayluk') return;
        const slip = st.settings?.slip_url || st.settings?.slipUrl || st.slip_url || (st.slug === 'urbangrabs' ? '/urbangrabs_slip.jpg' : null);
        const existingIdx = list.findIndex(p => p.store_id === st.id || (st.slug && p.store_name?.toLowerCase() === st.slug.toLowerCase()));

        if (existingIdx !== -1) {
          if (slip && (!list[existingIdx].slip_url || list[existingIdx].slip_url === '')) {
            list[existingIdx].slip_url = slip;
            hasChanges = true;
          }
          if (st.status === 'ACTIVE' && list[existingIdx].status === 'PENDING') {
            list[existingIdx].status = 'APPROVED';
            hasChanges = true;
          }
        } else if (st.status === 'PENDING_APPROVAL') {
          const planInfo = STORE_PLANS[st.plan] || STORE_PLANS.STARTER;
          list.unshift({
            id: `SUB_${st.id.replace('store_', '')}`,
            store_id: st.id,
            store_name: st.name || st.slug || 'urbangrabs',
            plan_key: st.plan || 'STARTER',
            plan_name: planInfo.name || '🌱 Starter ($1/ខែ)',
            amount: planInfo.price || 1.00,
            billing_cycle: 'monthly',
            payment_method: 'Bakong KHQR / ABA Pay',
            slip_url: slip || '/urbangrabs_slip.jpg',
            status: 'PENDING',
            notes: 'បានផ្ទេរបង់ប្រាក់កញ្ចប់ Starter $1/ខែ តាម ABA Mobile រួចរាល់ សូមពិនិត្យ និង Approve',
            phone: st.phone || '010723080',
            created_at: st.created_at || new Date().toISOString(),
            expires_target: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
          hasChanges = true;
        }
      });
      if (hasChanges) {
        localStorage.setItem('sabay_subscription_payments', JSON.stringify(list));
      }
    } catch (_) {}

    if (storeId) {
      return list.filter(p => p.store_id === storeId);
    }
    return list;
  } catch (e) {
    return [];
  }
};

export const saveSubscriptionPayments = (payments) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('sabay_subscription_payments', JSON.stringify(payments));
    window.dispatchEvent(new Event('sabay_payments_changed'));
  } catch (e) {}
};

export const submitSubscriptionPayment = async ({
  storeId,
  storeName,
  planKey,
  planName,
  amount,
  billingCycle,
  slipUrl,
  notes = '',
  customerPhone = ''
}) => {
  const paymentId = `SUB_${Date.now().toString().slice(-6)}_${Math.floor(100 + Math.random() * 900)}`;
  const planInfo = STORE_PLANS[planKey] || STORE_PLANS.FREE;
  const isYearly = billingCycle === 'yearly';
  const daysToAdd = isYearly ? 365 : 30;
  const newExpiry = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  const newRecord = {
    id: paymentId,
    store_id: storeId,
    store_name: storeName,
    plan_key: planKey,
    plan_name: planName || planInfo.name,
    amount: parseFloat(amount) || 0,
    billing_cycle: billingCycle,
    payment_method: 'Bakong KHQR / ABA Pay',
    slip_url: slipUrl || '',
    status: 'PENDING', // PENDING -> APPROVED / REJECTED
    notes: notes || '',
    phone: customerPhone || '',
    created_at: new Date().toISOString(),
    expires_target: newExpiry
  };

  const currentList = getSubscriptionPayments();
  const updatedList = [newRecord, ...currentList];
  saveSubscriptionPayments(updatedList);

  // Sync to Supabase subscription_payments table if table exists
  try {
    await supabase.from('subscription_payments').insert([newRecord]);
  } catch (e) {}

  // 🔔 ជូនដំណឹង Realtime ឆ្លង Tab ទៅកាន់ Admin Dashboard (Platform Store Approvals)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sabay_subscription_alert', JSON.stringify({
        payment: newRecord,
        timestamp: Date.now()
      }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('sabay_subscription_sync');
        bc.postMessage({ type: 'NEW_SUBSCRIPTION_PAYMENT', payment: newRecord });
        bc.close();
      }
    } catch (_) {}
  }

  // Instant activate or grace upgrade store state so store doesn't get blocked
  // ⚠️ បើហាងកំពុងស្ថិតក្នុងការរង់ចាំ Approve (PENDING_APPROVAL) រក្សា status ជា PENDING_APPROVAL ដដែល រហូតដល់ Admin ចុច Approve
  const stores = getLocalStores();
  const stIndex = stores.findIndex(s => s.id === storeId);
  if (stIndex !== -1) {
    const isPendingApproval = stores[stIndex].status === 'PENDING_APPROVAL' || stores[stIndex].payment_status === 'PENDING_APPROVAL';
    const upgradedStore = {
      ...stores[stIndex],
      plan: planKey,
      plan_expires_at: newExpiry,
      max_products: planInfo.maxProducts,
      max_staff: planInfo.maxStaff,
      status: isPendingApproval ? 'PENDING_APPROVAL' : 'ACTIVE',
      payment_status: isPendingApproval ? 'PENDING_APPROVAL' : 'ACTIVE'
    };
    stores[stIndex] = upgradedStore;
    saveLocalStores(stores);

    const active = getActiveStore();
    if (active && active.id === storeId) {
      setActiveStore(upgradedStore);
    }
    try {
      const subSettings = {
        ...(stores[stIndex].settings || {}),
        payment_status: isPendingApproval ? 'PENDING_APPROVAL' : 'APPROVED',
        plan_expires_at: newExpiry
      };
      await supabase.from('stores').update({
        plan: planKey,
        max_products: planInfo.maxProducts,
        max_staff: planInfo.maxStaff,
        status: isPendingApproval ? 'PENDING_APPROVAL' : 'ACTIVE',
        settings: subSettings
      }).eq('id', storeId);
    } catch (e) {}
  }

  // 🔔 Send Telegram Alert to Master Owner
  try {
    fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'plan_upgraded',
        store: { id: storeId, name: storeName, phone: customerPhone },
        newPlan: planName || planInfo.name,
        price: `$${amount} (${isYearly ? 'ប្រចាំឆ្នាំ' : 'ប្រចាំខែ'})`,
        slipUrl: slipUrl || '',
        paymentId: paymentId
      })
    }).catch(e => console.warn('Telegram notice error:', e));
  } catch (e) {}

  return newRecord;
};

export const approveSubscriptionPayment = async (paymentId, approvedBy = 'Master Owner') => {
  const currentList = getSubscriptionPayments();
  const idx = currentList.findIndex(p => p.id === paymentId);
  if (idx === -1) return { success: false, error: 'Payment not found' };

  const p = currentList[idx];
  const planInfo = STORE_PLANS[p.plan_key] || STORE_PLANS.FREE;
  const isYearly = p.billing_cycle === 'yearly';
  const daysToAdd = isYearly ? 365 : 30;

  const stores = getLocalStores();
  const stIndex = stores.findIndex(s => s.id === p.store_id);
  if (stIndex !== -1) {
    const currentExpiry = stores[stIndex].plan_expires_at ? new Date(stores[stIndex].plan_expires_at) : new Date();
    const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    const upgradedStore = {
      ...stores[stIndex],
      plan: p.plan_key,
      billing_cycle: p.billing_cycle || 'monthly',
      plan_started_at: new Date().toISOString(),
      plan_expires_at: newExpiry,
      max_products: planInfo.maxProducts,
      max_staff: planInfo.maxStaff,
      status: 'ACTIVE',
      payment_status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy
    };
    stores[stIndex] = upgradedStore;
    saveLocalStores(stores);

    const active = getActiveStore();
    if (active && active.id === p.store_id) {
      setActiveStore(upgradedStore);
    }

    try {
      const apprSettings = {
        ...(stores[stIndex].settings || {}),
        billing_cycle: p.billing_cycle || 'monthly',
        plan_started_at: new Date().toISOString(),
        payment_status: 'APPROVED',
        plan_expires_at: newExpiry,
        approved_at: new Date().toISOString(),
        approved_by: approvedBy
      };
      await supabase.from('stores').update({
        plan: p.plan_key,
        max_products: planInfo.maxProducts,
        max_staff: planInfo.maxStaff,
        status: 'ACTIVE',
        settings: apprSettings
      }).eq('id', p.store_id);
    } catch (e) {}
  }

  p.status = 'APPROVED';
  p.approved_at = new Date().toISOString();
  p.approved_by = approvedBy;
  currentList[idx] = p;
  saveSubscriptionPayments(currentList);

  try {
    await supabase.from('subscription_payments').update({
      status: 'APPROVED',
      approved_at: p.approved_at,
      approved_by: approvedBy
    }).eq('id', paymentId);
  } catch (e) {}

  return { success: true, ...p, payment: p };
};

export const rejectSubscriptionPayment = async (paymentId, reason = 'បង្កាន់ដៃមិនត្រឹមត្រូវ') => {
  const currentList = getSubscriptionPayments();
  const idx = currentList.findIndex(p => p.id === paymentId);
  if (idx === -1) return { success: false, error: 'Payment not found' };

  const p = currentList[idx];
  p.status = 'REJECTED';
  p.rejected_at = new Date().toISOString();
  p.reject_reason = reason;
  currentList[idx] = p;
  saveSubscriptionPayments(currentList);

  try {
    await supabase.from('subscription_payments').update({
      status: 'REJECTED',
      reject_reason: reason
    }).eq('id', paymentId);
  } catch (e) {}

  return { success: true, ...p, payment: p };
};

// ⭐️ Helper: អនុម័ត (Approve) ហាងដោយផ្ទាល់ពី Platform Stores Manager
export const approveStoreDirectly = async (storeId, approvedBy = 'Master Owner') => {
  const stores = getLocalStores();
  const stIndex = stores.findIndex(s => s.id === storeId);
  if (stIndex === -1) return { success: false, error: 'រកមិនឃើញហាងនេះទេ' };

  const store = stores[stIndex];
  const daysToAdd = 365; // លំនាំដើម ១ ឆ្នាំ
  const currentExpiry = store.plan_expires_at ? new Date(store.plan_expires_at) : new Date();
  const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
  const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  const nowIso = new Date().toISOString();
  const directSettings = {
    ...(store.settings || {}),
    payment_status: 'APPROVED',
    plan_expires_at: newExpiry,
    approved_at: nowIso,
    approved_by: approvedBy
  };

  const upgradedStore = {
    ...store,
    status: 'ACTIVE',
    payment_status: 'APPROVED',
    plan_expires_at: newExpiry,
    approved_at: nowIso,
    approved_by: approvedBy,
    settings: directSettings
  };
  stores[stIndex] = upgradedStore;
  saveLocalStores(stores);

  const active = getActiveStore();
  if (active && active.id === storeId) {
    setActiveStore(upgradedStore);
  }

  try {
    await supabase.from('stores').update({
      status: 'ACTIVE',
      settings: directSettings
    }).eq('id', storeId);
  } catch (e) {}

  // Approve all pending subscription payments of this store
  const payments = getSubscriptionPayments();
  let paymentsChanged = false;
  payments.forEach(p => {
    const isTarget = p.store_id === storeId || 
                     (store.slug && p.store_id === store.slug) ||
                     (store.slug && p.store_name?.toLowerCase() === store.slug.toLowerCase()) ||
                     (store.name && p.store_name?.toLowerCase() === store.name.toLowerCase());
    if (isTarget && p.status !== 'APPROVED') {
      p.status = 'APPROVED';
      p.approved_at = nowIso;
      p.approved_by = approvedBy;
      paymentsChanged = true;
    }
  });
  if (paymentsChanged) {
    saveSubscriptionPayments(payments);
  }

  return { success: true, store: upgradedStore };
};


// ⭐️ Helper: ស្វែងរកហាងទាំងអស់ដែលជាកម្មសិទ្ធិរបស់ Gmail តែមួយ (Anchor to Owner Gmail)
// Master Owner (sengsoveasna93@gmail.com) អាចមើលឃើញគ្រប់ហាងទាំងអស់
export const getStoresByOwnerEmail = (email) => {
  if (!email) return [];
  const clean = email.trim().toLowerCase();
  const all = getLocalStores();
  if (clean === 'sengsoveasna93@gmail.com') return all;
  return all.filter(s => {
    const storeEmail = (s.owner_email || s.settings?.owner_email || '').trim().toLowerCase();
    return storeEmail === clean;
  });
};
