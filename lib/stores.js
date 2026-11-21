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
  telegram: 'sabay_luk',
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
    key: 'FREE',
    name: '🎁 គំរោង Free ($0/Free)',
    price: 0,
    priceMonthly: 0,
    priceYearly: 0,
    savingsYearly: 0,
    maxProducts: 15,
    maxStaff: 1,
    productsText: 'ទំនិញរហូតដល់ ១៥ មុខ',
    accountsLabel: 'គណនីគ្រប់គ្រង (1 Admin)',
    accountsText: 'គណនីគ្រប់គ្រង (1 Admin)',
    desc: 'អ្នកលក់ថ្មីថ្មោង ឬអ្នកចង់តេស្តសាកល្បង',
    features: [
      'ទំនិញរហូតដល់ ១៥ មុខ',
      'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
      'ការបញ្ជាទិញ(Orders)',
      'គ្រប់គ្រងស្តុកទំនិញ និងលក់ដុំ/រាយ',
      'គ្រប់គ្រងអតិថិជន',
      'កំណត់ហាង & Logo',
      'គណនីគ្រប់គ្រង (1 Admin)',
      'ចេញវិក្កយបត្រស្កេន',
      'គាំទ្រការប្រើលើទូរស័ព្ទដៃ និង កុំព្យូទ័រ',
      'អាចតំឡើងជាAPP ក្នុង telegram',
      'កំណត់និងកែប្រែ វិក្កយបត្រ',
      'នាំចេញទិន្នន័យ Excel & PDF វិក្កយបត្រពន្ធ',
      'វិភាគទិន្នន័យ(P&L)',
      'ដាស់តឿនទំនិញជិតអស់ពីស្តុក (Low Stock)',
      'វេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន',
      'វេបសាយ Storefront ទទួលកុម្ម៉ង់ទិញអនឡាញ',
      'អេក្រង់ភ្ញៀវ (Display)',
      'ភ្ជាប់ជាមួយ ឧបករណ៍ស្កេនកូដ',
      'ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ & គណនេយ្យស្តង់ដារ',
      'ជូនដំណឹងការបញ្ជាទិញតាម Telegram Bot'
    ]
  },
  STARTER: {
    id: 'STARTER',
    key: 'STARTER',
    name: '🌱 គំរោង 1$ (Starter $1/ខែ)',
    price: 1,
    priceMonthly: 1,
    priceYearly: 10,
    savingsYearly: 2,
    maxProducts: 25,
    maxStaff: 1,
    productsText: 'ទំនិញរហូតដល់ ២៥ មុខ',
    accountsLabel: 'គណនីគ្រប់គ្រង (1 Admin)',
    accountsText: 'គណនីគ្រប់គ្រង (1 Admin)',
    desc: 'តូបតូចៗ អ្នកលក់ Live តាមផ្ទះ',
    features: [
      'ទំនិញរហូតដល់ ២៥ មុខ',
      'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
      'ការបញ្ជាទិញ(Orders)',
      'គ្រប់គ្រងស្តុកទំនិញ និងលក់ដុំ/រាយ',
      'គ្រប់គ្រងអតិថិជន',
      'កំណត់ហាង & Logo',
      'គណនីគ្រប់គ្រង (1 Admin)',
      'ចេញវិក្កយបត្រស្កេន',
      'គាំទ្រការប្រើលើទូរស័ព្ទដៃ និង កុំព្យូទ័រ',
      'អាចតំឡើងជាAPP ក្នុង telegram',
      'កំណត់និងកែប្រែ វិក្កយបត្រ',
      'នាំចេញទិន្នន័យ Excel & PDF វិក្កយបត្រពន្ធ',
      'វិភាគទិន្នន័យ(P&L)',
      'ដាស់តឿនទំនិញជិតអស់ពីស្តុក (Low Stock)',
      'វេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន',
      'វេបសាយ Storefront ទទួលកុម្ម៉ង់ទិញអនឡាញ',
      'អេក្រង់ភ្ញៀវ (Display)',
      'ភ្ជាប់ជាមួយ ឧបករណ៍ស្កេនកូដ',
      'ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ & គណនេយ្យស្តង់ដារ',
      'ជូនដំណឹងការបញ្ជាទិញតាម Telegram Bot'
    ]
  },
  BASIC: {
    id: 'BASIC',
    key: 'BASIC',
    name: '⚡ គំរោង 2$ (Basic $2/ខែ)',
    price: 2,
    priceMonthly: 2,
    priceYearly: 20,
    savingsYearly: 4,
    maxProducts: 50,
    maxStaff: 2,
    productsText: 'ទំនិញរហូតដល់ ៥០ មុខ',
    accountsLabel: 'គណនីបុគ្គលិក ២ នាក់ (Admin + Staff)',
    accountsText: 'គណនីបុគ្គលិក ២ នាក់ (Admin + Staff)',
    desc: 'ហាងខោអាវ ស្បែកជើងខ្នាតតូច',
    features: [
      'ទំនិញរហូតដល់ ៥០ មុខ',
      'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
      'ការបញ្ជាទិញ(Orders)',
      'គ្រប់គ្រងស្តុកទំនិញ និងលក់ដុំ/រាយ',
      'គ្រប់គ្រងអតិថិជន',
      'កំណត់ហាង & Logo',
      'គណនីបុគ្គលិក ២ នាក់ (Admin + Staff)',
      'ចេញវិក្កយបត្រស្កេន',
      'គាំទ្រការប្រើលើទូរស័ព្ទដៃ និង កុំព្យូទ័រ',
      'អាចតំឡើងជាAPP ក្នុង telegram',
      'កំណត់និងកែប្រែ វិក្កយបត្រ',
      'នាំចេញទិន្នន័យ Excel & PDF វិក្កយបត្រពន្ធ',
      'វិភាគទិន្នន័យ(P&L)',
      'ដាស់តឿនទំនិញជិតអស់ពីស្តុក (Low Stock)',
      'វេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន',
      'វេបសាយ Storefront ទទួលកុម្ម៉ង់ទិញអនឡាញ',
      'អេក្រង់ភ្ញៀវ (Display)',
      'ភ្ជាប់ជាមួយ ឧបករណ៍ស្កេនកូដ',
      'ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ & គណនេយ្យស្តង់ដារ',
      'ជូនដំណឹងការបញ្ជាទិញតាម Telegram Bot'
    ]
  },
  PRO: {
    id: 'PRO',
    key: 'PRO',
    name: '🚀 គំរោង 3$ (Pro $3/ខែ)',
    price: 3,
    priceMonthly: 3,
    priceYearly: 30,
    savingsYearly: 6,
    maxProducts: 100,
    maxStaff: 2,
    productsText: 'ទំនិញរហូតដល់ ១០០ មុខ',
    accountsLabel: 'គណនីបុគ្គលិក 2 នាក់ (Admin + 1 Staff)',
    accountsText: 'គណនីបុគ្គលិក 2 នាក់ (Admin + 1 Staff)',
    desc: 'ហាងពេញនិយម មានបុគ្គលិកឆ្លាស់វេន',
    features: [
      'ទំនិញរហូតដល់ ១០០ មុខ',
      'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
      'ការបញ្ជាទិញ(Orders)',
      'គ្រប់គ្រងស្តុកទំនិញ និងលក់ដុំ/រាយ',
      'គ្រប់គ្រងអតិថិជន',
      'កំណត់ហាង & Logo',
      'គណនីបុគ្គលិក 2 នាក់ (Admin + 1 Staff)',
      'ចេញវិក្កយបត្រស្កេន',
      'គាំទ្រការប្រើលើទូរស័ព្ទដៃ និង កុំព្យូទ័រ',
      'អាចតំឡើងជាAPP ក្នុង telegram',
      'កំណត់និងកែប្រែ វិក្កយបត្រ',
      'នាំចេញទិន្នន័យ Excel & PDF វិក្កយបត្រពន្ធ',
      'វិភាគទិន្នន័យ(P&L)',
      'ដាស់តឿនទំនិញជិតអស់ពីស្តុក (Low Stock)',
      'វេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន',
      'វេបសាយ Storefront ទទួលកុម្ម៉ង់ទិញអនឡាញ',
      'អេក្រង់ភ្ញៀវ (Display)',
      'ភ្ជាប់ជាមួយ ឧបករណ៍ស្កេនកូដ',
      'ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ & គណនេយ្យស្តង់ដារ',
      'ជូនដំណឹងការបញ្ជាទិញតាម Telegram Bot'
    ]
  },
  BUSINESS: {
    id: 'BUSINESS',
    key: 'BUSINESS',
    name: '🔥 គំរោង 5$ (Business $5/ខែ)',
    price: 5,
    priceMonthly: 5,
    priceYearly: 50,
    savingsYearly: 10,
    maxProducts: 200,
    maxStaff: 3,
    productsText: 'ទំនិញរហូតដល់ ២០០ មុខ',
    accountsLabel: 'គណនីបុគ្គលិក 3 នាក់ (Admin + 2 Staff)',
    accountsText: 'គណនីបុគ្គលិក 3 នាក់ (Admin + 2 Staff)',
    desc: 'ហាងធំគួរសម មានស្តុកច្រើន Size/Color',
    features: [
      'ទំនិញរហូតដល់ ២០០ មុខ',
      'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
      'ការបញ្ជាទិញ(Orders)',
      'គ្រប់គ្រងស្តុកទំនិញ និងលក់ដុំ/រាយ',
      'គ្រប់គ្រងអតិថិជន',
      'កំណត់ហាង & Logo',
      'គណនីបុគ្គលិក 3 នាក់ (Admin + 2 Staff)',
      'ចេញវិក្កយបត្រស្កេន',
      'គាំទ្រការប្រើលើទូរស័ព្ទដៃ និង កុំព្យូទ័រ',
      'អាចតំឡើងជាAPP ក្នុង telegram',
      'កំណត់និងកែប្រែ វិក្កយបត្រ',
      'នាំចេញទិន្នន័យ Excel & PDF វិក្កយបត្រពន្ធ',
      'វិភាគទិន្នន័យ(P&L)',
      'ដាស់តឿនទំនិញជិតអស់ពីស្តុក (Low Stock)',
      'វេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន',
      'វេបសាយ Storefront ទទួលកុម្ម៉ង់ទិញអនឡាញ',
      'អេក្រង់ភ្ញៀវ (Display)',
      'ភ្ជាប់ជាមួយ ឧបករណ៍ស្កេនកូដ',
      'ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ & គណនេយ្យស្តង់ដារ',
      'ជូនដំណឹងការបញ្ជាទិញតាម Telegram Bot'
    ]
  },
  PREMIUM: {
    id: 'PREMIUM',
    key: 'PREMIUM',
    name: '💎 គំរោង 7$ (Premium $7/ខែ)',
    price: 7,
    priceMonthly: 7,
    priceYearly: 70,
    savingsYearly: 14,
    maxProducts: 500,
    maxStaff: 4,
    productsText: 'ទំនិញរហូតដល់ ៥០០ មុខ',
    accountsLabel: 'គណនីបុគ្គលិក 4 នាក់ (Admin + 3 Staff)',
    accountsText: 'គណនីបុគ្គលិក 4 នាក់ (Admin + 3 Staff)',
    desc: 'ហាងមានមុខទំនិញច្រើន និងបុគ្គលិកច្រើន',
    features: [
      'ទំនិញរហូតដល់ ៥០០ មុខ',
      'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
      'ការបញ្ជាទិញ(Orders)',
      'គ្រប់គ្រងស្តុកទំនិញ និងលក់ដុំ/រាយ',
      'គ្រប់គ្រងអតិថិជន',
      'កំណត់ហាង & Logo',
      'គណនីបុគ្គលិក 4 នាក់ (Admin + 3 Staff)',
      'ចេញវិក្កយបត្រស្កេន',
      'គាំទ្រការប្រើលើទូរស័ព្ទដៃ និង កុំព្យូទ័រ',
      'អាចតំឡើងជាAPP ក្នុង telegram',
      'កំណត់និងកែប្រែ វិក្កយបត្រ',
      'នាំចេញទិន្នន័យ Excel & PDF វិក្កយបត្រពន្ធ',
      'វិភាគទិន្នន័យ(P&L)',
      'ដាស់តឿនទំនិញជិតអស់ពីស្តុក (Low Stock)',
      'វេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន',
      'វេបសាយ Storefront ទទួលកុម្ម៉ង់ទិញអនឡាញ',
      'អេក្រង់ភ្ញៀវ (Display)',
      'ភ្ជាប់ជាមួយ ឧបករណ៍ស្កេនកូដ',
      'ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ & គណនេយ្យស្តង់ដារ',
      'ជូនដំណឹងការបញ្ជាទិញតាម Telegram Bot'
    ]
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    key: 'ENTERPRISE',
    name: '👑 គំរោង 10$ (Enterprise $10/ខែ)',
    price: 10,
    priceMonthly: 10,
    priceYearly: 100,
    savingsYearly: 20,
    maxProducts: 1000,
    maxStaff: 5,
    productsText: 'ទំនិញរហូតដល់ ១,០០០ មុខ',
    accountsLabel: 'គណនីបុគ្គលិក 5 នាក់ (Admin + 4 Staff)',
    accountsText: 'គណនីបុគ្គលិក 5 នាក់ (Admin + 4 Staff)',
    desc: 'ហាងធំៗ សាខា ឬឃ្លាំងស្តុកធំ',
    features: [
      'ទំនិញរហូតដល់ ១,០០០ មុខ',
      'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
      'ការបញ្ជាទិញ(Orders)',
      'គ្រប់គ្រងស្តុកទំនិញ និងលក់ដុំ/រាយ',
      'គ្រប់គ្រងអតិថិជន',
      'កំណត់ហាង & Logo',
      'គណនីបុគ្គលិក 5 នាក់ (Admin + 4 Staff)',
      'ចេញវិក្កយបត្រស្កេន',
      'គាំទ្រការប្រើលើទូរស័ព្ទដៃ និង កុំព្យូទ័រ',
      'អាចតំឡើងជាAPP ក្នុង telegram',
      'កំណត់និងកែប្រែ វិក្កយបត្រ',
      'នាំចេញទិន្នន័យ Excel & PDF វិក្កយបត្រពន្ធ',
      'វិភាគទិន្នន័យ(P&L)',
      'ដាស់តឿនទំនិញជិតអស់ពីស្តុក (Low Stock)',
      'វេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន',
      'វេបសាយ Storefront ទទួលកុម្ម៉ង់ទិញអនឡាញ',
      'អេក្រង់ភ្ញៀវ (Display)',
      'ភ្ជាប់ជាមួយ ឧបករណ៍ស្កេនកូដ',
      'ប្រព័ន្ធគ្រប់គ្រងហិរញ្ញវត្ថុ & គណនេយ្យស្តង់ដារ',
      'ជូនដំណឹងការបញ្ជាទិញតាម Telegram Bot'
    ]
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
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => {
          const cleanTg = (s.telegram || '').replace(/^@/, '').trim().toLowerCase();
          if ((s.id === 'store_default_sabayluk' || s.slug === 'sabay-luk') && cleanTg === 'sabayluk') {
            return {
              ...s,
              telegram: 'sabay_luk',
              settings: { ...(s.settings || {}), telegram: 'sabay_luk' }
            };
          }
          return s;
        });
      }
    }
  } catch (e) {}
  return [DEFAULT_FLAGSHIP_STORE];
};

export const saveLocalStores = (stores) => {
  if (typeof window === 'undefined') return;
  try {
    // ⭐️ ការពារកុំឱ្យលើស Quota LocalStorage (5MB Limit) ដោយមិនបំផ្លាញរូបភាព (No corrupt .slice)
    const sanitizedStores = (stores || []).map(s => {
      let slip = s?.settings?.slip_url || s?.slip_url || '';
      if (slip && slip.length > 250000 && slip.startsWith('data:')) {
        slip = s.slug === 'mario' ? '/mario_slip.jpg' : (s.slug === 'urbangrabs' ? '/urbangrabs_slip.jpg' : '');
      }
      return {
        ...s,
        slip_url: slip,
        settings: {
          ...(s.settings || {}),
          slip_url: slip
        }
      };
    });
    localStorage.setItem('sabay_registered_stores', JSON.stringify(sanitizedStores));
  } catch (e) {
    console.warn('saveLocalStores warning:', e);
  }
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

// ⭐️ Smart Store Performance & Popularity Ranking Algorithm ⭐️
// - Stores with the most products and highest sales/orders rank at the very top (#1, #2, ...)
// - Newly created stores (or stores without products/sales yet) are placed at the bottom and last
// ("ហាងណាដែលមានទំនិញច្រើនជាងគេ និងមានការលក់ច្រើនជាងគេ យកវាមកដាក់ទី1 ដាក់បន្តបន្ទាប់គ្នាមក
//  ហាងទើបតែបង្កើតថ្មីត្រូវនៅក្រោមគេ និងក្រោយគេ")
export const sortStoresByPerformance = (stores) => {
  if (!Array.isArray(stores)) return [];
  return [...stores].sort((a, b) => {
    const prodA = Number(a.productCount ?? a.product_count ?? 0);
    const prodB = Number(b.productCount ?? b.product_count ?? 0);
    const orderA = Number(a.orderCount ?? a.order_count ?? 0);
    const orderB = Number(b.orderCount ?? b.order_count ?? 0);
    const salesA = Number(a.totalSales ?? a.total_sales ?? 0);
    const salesB = Number(b.totalSales ?? b.total_sales ?? 0);

    // Performance ranking score
    const scoreA = (prodA * 100) + (orderA * 20) + salesA;
    const scoreB = (prodB * 100) + (orderB * 20) + salesB;

    // 1. Highest performance score first
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // 2. Stores with more products come first
    if (prodB !== prodA) {
      return prodB - prodA;
    }

    // 3. Stores with more orders come first
    if (orderB !== orderA) {
      return orderB - orderA;
    }

    // 4. Newly created stores must be placed at the bottom / last
    // Older stores first, newest stores last (ascending created_at timestamp)
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });
};

// ⭐️ Fetch Partner Stores with Live Product & Sales Stats for Landing Page Showcase ⭐️
export const fetchPartnerStoresWithStats = async () => {
  try {
    const [storesList, prodsRes, ordersRes] = await Promise.allSettled([
      fetchAllStores(),
      supabase.from('products').select('id, store_id'),
      supabase.from('orders').select('id, store_id, total_amount, status')
    ]);

    const stores = storesList.status === 'fulfilled' && Array.isArray(storesList.value) 
      ? storesList.value 
      : getLocalStores();

    const prods = prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value?.data)
      ? prodsRes.value.data
      : [];

    const orders = ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value?.data)
      ? ordersRes.value.data
      : [];

    const prodCountMap = {};
    prods.forEach(p => {
      const sId = p.store_id || 'store_default_sabayluk';
      prodCountMap[sId] = (prodCountMap[sId] || 0) + 1;
    });

    const orderCountMap = {};
    const salesMap = {};
    orders.forEach(o => {
      const sId = o.store_id || 'store_default_sabayluk';
      orderCountMap[sId] = (orderCountMap[sId] || 0) + 1;
      salesMap[sId] = (salesMap[sId] || 0) + (parseFloat(o.total_amount) || 0);
    });

    // Also check local products/orders fallback if offline
    let localProds = [];
    let localOrders = [];
    if (typeof window !== 'undefined') {
      try {
        const lp = localStorage.getItem('sabay_local_products');
        if (lp) localProds = JSON.parse(lp);
      } catch (_) {}
      try {
        const lo = localStorage.getItem('pos_orders_history');
        if (lo) localOrders = JSON.parse(lo);
      } catch (_) {}
    }

    if (localProds.length > 0 && prods.length === 0) {
      localProds.forEach(p => {
        const sId = p.store_id || 'store_default_sabayluk';
        prodCountMap[sId] = (prodCountMap[sId] || 0) + 1;
      });
    }

    if (localOrders.length > 0 && orders.length === 0) {
      localOrders.forEach(o => {
        const sId = o.store_id || 'store_default_sabayluk';
        orderCountMap[sId] = (orderCountMap[sId] || 0) + 1;
        salesMap[sId] = (salesMap[sId] || 0) + (parseFloat(o.total_amount || o.total) || 0);
      });
    }

    // Flagship fallback guarantee
    if (!prodCountMap['store_default_sabayluk'] && prods.length > 0) {
      prodCountMap['store_default_sabayluk'] = prods.length;
    }

    const enriched = (stores || []).map(st => {
      const pCount = prodCountMap[st.id] ?? (st.slug === 'sabay-luk' ? prodCountMap['store_default_sabayluk'] || 31 : 0);
      const oCount = orderCountMap[st.id] ?? (st.slug === 'sabay-luk' ? orderCountMap['store_default_sabayluk'] || 23 : 0);
      const sTotal = salesMap[st.id] ?? (st.slug === 'sabay-luk' ? salesMap['store_default_sabayluk'] || 536.55 : 0);
      return {
        ...st,
        productCount: pCount,
        orderCount: oCount,
        totalSales: sTotal
      };
    });

    return sortStoresByPerformance(enriched);
  } catch (err) {
    console.warn('fetchPartnerStoresWithStats error fallback:', err);
    return sortStoresByPerformance(getLocalStores());
  }
};

// ⭐️ Delete store completely from LocalStorage, Cache & Cloud Supabase Database (Thorough Cascading Wipe) ⭐️
export const deleteStoreRecord = async (storeId) => {
  if (!storeId || storeId === 'store_default_sabayluk') return false;
  
  // 1. Find store to get both its ID and Slug before deleting
  const current = getLocalStores();
  const target = current.find(s => s.id === storeId || s.slug === storeId);
  const targetId = target?.id || storeId;
  const targetSlug = target?.slug || storeId;
  const targetName = target?.name || '';

  // 2. Remove from LocalStorage & clean up ALL related store keys & caches
  const filtered = current.filter(s => s.id !== targetId && s.slug !== targetSlug);
  saveLocalStores(filtered);
  try {
    if (typeof window !== 'undefined') {
      // Purge staff & auth caches
      localStorage.removeItem(`sabay_active_staff_${targetId}`);
      localStorage.removeItem(`sabay_active_staff_${targetSlug}`);
      localStorage.removeItem(`sabay_staff_list_${targetId}`);
      localStorage.removeItem(`sabay_staff_list_${targetSlug}`);
      
      // Purge categories & bank balance & settings caches
      localStorage.removeItem(`sabay_categories_cache_${targetId}`);
      localStorage.removeItem(`sabay_categories_cache_${targetSlug}`);
      localStorage.removeItem(`sabay_bank_balances_${targetId}`);
      localStorage.removeItem(`sabay_bank_balances_${targetSlug}`);
      localStorage.removeItem(`sabay_store_settings_${targetId}`);
      localStorage.removeItem(`sabay_store_settings_${targetSlug}`);
      localStorage.removeItem(`sabay_offline_products_cache_${targetId}`);
      localStorage.removeItem(`sabay_offline_products_cache_${targetSlug}`);
      localStorage.removeItem(`sabay_inv_view_mode_${targetId}`);
      localStorage.removeItem(`sabay_last_saved_sku_${targetId}`);
      
      // ⭐️ Purge old subscription payments and slips for this store ⭐️
      const rawPayments = localStorage.getItem('sabay_subscription_payments');
      if (rawPayments) {
        try {
          const paymentsList = JSON.parse(rawPayments);
          if (Array.isArray(paymentsList)) {
            const cleanList = paymentsList.filter(p => 
              p.store_id !== targetId && 
              p.store_id !== targetSlug && 
              p.store_name?.toLowerCase() !== targetSlug.toLowerCase() &&
              (!targetName || p.store_name?.toLowerCase() !== targetName.toLowerCase())
            );
            localStorage.setItem('sabay_subscription_payments', JSON.stringify(cleanList));
            window.dispatchEvent(new Event('sabay_payments_changed'));
          }
        } catch (_) {}
      }

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

  // 3. Remove completely from Supabase Cloud DB (Stores, Products, Orders, Categories, Expenses, Feedbacks, Subscription Payments)
  try {
    // Delete store by ID and Slug
    await supabase.from('stores').delete().or(`id.eq.${targetId},slug.eq.${targetSlug}`);
    // Cascade delete any child items by targetId or targetSlug
    await supabase.from('products').delete().or(`store_id.eq.${targetId},store_id.eq.${targetSlug}`);
    await supabase.from('orders').delete().or(`store_id.eq.${targetId},store_id.eq.${targetSlug}`);
    await supabase.from('categories').delete().or(`store_id.eq.${targetId},store_id.eq.${targetSlug}`);
    await supabase.from('expenses').delete().or(`store_id.eq.${targetId},store_id.eq.${targetSlug}`);
    await supabase.from('feedbacks').delete().or(`store_id.eq.${targetId},store_id.eq.${targetSlug}`);
    await supabase.from('subscription_payments').delete().or(`store_id.eq.${targetId},store_id.eq.${targetSlug}`);
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
      khqrImageUrl: '', // ⭐️ 100% STRICT STORE ISOLATION: ហាងថ្មីទុកទំនេរ មិនឱ្យទាញ QR Sabay Luk ឡើយ
      bankAccountName: storeInput.owner_name || cleanName,
      bankAccountUsd: storeInput.phone || '', // មិនឱ្យមាន 010 723 080 ឡើយ
      bankAccountKhr: '', // មិនឱ្យមាន 004 500 394 ឡើយ
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

// ⭐️ Helper ពិនិត្យមើលកាលបរិច្ឆេទផុតកំណត់ Plan & ស្ថានភាពបន្តសេវា (Plan Expiry & Usage Tracker) ⭐️
export const getStorePlanExpiryInfo = (store) => {
  if (!store || store.id === 'store_default_sabayluk' || store.plan === 'FREE') {
    return {
      isLifetime: true,
      expiresAt: null,
      daysLeft: 9999,
      daysUsed: 0,
      totalCycleDays: 0,
      usedPercent: 0,
      remainingPercent: 100,
      isExpiringSoon: false,
      isExpired: false,
      status: 'LIFETIME',
      badgeText: '🎁 ប្រើឥតគិតថ្លៃរហូត',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      usedText: 'ប្រើឥតគិតថ្លៃ',
      remainingText: 'ឥតកំណត់',
      formattedExpiry: 'ឥតកំណត់'
    };
  }

  // Determine cycle
  const isYearly = store?.billing_cycle === 'yearly' || store?.settings?.billing_cycle === 'yearly';
  const totalCycleDays = isYearly ? 365 : 30;

  const createdDate = store.created_at ? new Date(store.created_at) : new Date();
  const expiryDate = store.plan_expires_at ? new Date(store.plan_expires_at) : new Date(createdDate.getTime() + totalCycleDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  // Days left
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  // Days used (calculated from cycle start)
  const startDate = store.settings?.plan_start_date ? new Date(store.settings.plan_start_date) : new Date(expiryDate.getTime() - totalCycleDays * 24 * 60 * 60 * 1000);
  const usedMs = Math.max(0, now.getTime() - startDate.getTime());
  const rawUsedDays = Math.floor(usedMs / (1000 * 60 * 60 * 24));
  const daysUsed = Math.min(totalCycleDays, Math.max(0, rawUsedDays));
  const usedPercent = Math.min(100, Math.max(0, Math.round((daysUsed / totalCycleDays) * 100)));
  const remainingPercent = Math.max(0, 100 - usedPercent);

  const formattedExpiry = !isNaN(expiryDate.getTime()) ? expiryDate.toLocaleDateString('km-KH') : '—';
  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft <= 7 && !isExpired;

  if (isExpired) {
    return {
      isLifetime: false,
      expiresAt: expiryDate.toISOString(),
      daysLeft,
      daysUsed: totalCycleDays,
      totalCycleDays,
      usedPercent: 100,
      remainingPercent: 0,
      isExpiringSoon: false,
      isExpired: true,
      status: 'EXPIRED',
      badgeText: `🔴 ផុតកំណត់ ${Math.abs(daysLeft)} ថ្ងៃមុន`,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-300 font-black',
      usedText: `ប្រើអស់ ${totalCycleDays} ថ្ងៃ (១០០%)`,
      remainingText: `ផុតកំណត់ ${Math.abs(daysLeft)} ថ្ងៃមុន`,
      formattedExpiry
    };
  }

  if (isExpiringSoon) {
    return {
      isLifetime: false,
      expiresAt: expiryDate.toISOString(),
      daysLeft,
      daysUsed,
      totalCycleDays,
      usedPercent,
      remainingPercent,
      isExpiringSoon: true,
      isExpired: false,
      status: 'EXPIRING_SOON',
      badgeText: `⚠️ សល់ ${daysLeft} ថ្ងៃ (ជិតផុត)`,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-black ring-1 ring-amber-400',
      usedText: `ប្រើអស់ ${daysUsed} ថ្ងៃ (${usedPercent}%)`,
      remainingText: `នៅសល់ ${daysLeft} ថ្ងៃ`,
      formattedExpiry
    };
  }

  return {
    isLifetime: false,
    expiresAt: expiryDate.toISOString(),
    daysLeft,
    daysUsed,
    totalCycleDays,
    usedPercent,
    remainingPercent,
    isExpiringSoon: false,
    isExpired: false,
    status: 'ACTIVE',
    badgeText: `🟢 សល់ ${daysLeft} ថ្ងៃ`,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
    usedText: `ប្រើអស់ ${daysUsed} ថ្ងៃ (${usedPercent}%)`,
    remainingText: `នៅសល់ ${daysLeft} ថ្ងៃ`,
    formattedExpiry
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

    // Ensure valid slips for known stores
    list = list.map(p => {
      let slip = p.slip_url;
      const sName = (p.store_name || '').toLowerCase();
      if ((!slip || slip.length < 150) && (sName.includes('mario') || p.store_id?.includes('mario'))) {
        slip = '/mario_slip.jpg';
      } else if ((!slip || slip.length < 150) && (sName.includes('urban') || p.store_id?.includes('urban'))) {
        slip = '/urbangrabs_slip.jpg';
      }
      return { ...p, slip_url: slip };
    });

    // ⭐️ ធ្វើសមកាលកម្ម Slip & Payment ពិតប្រាកដពី Stores (រួមទាំង Supabase store.settings) ⭐️
    try {
      const allStores = getLocalStores();
      let hasChanges = false;

      allStores.forEach(st => {
        if (!st || !st.id || st.id === 'store_default_sabayluk') return;
        
        // 1. Check if store has a pending upgrade payment stored in settings
        const pendingPayment = st.settings?.pending_payment;
        // ⭐️ ប្រសិនបើហាងមាន status ACTIVE & APPROVED រួចហើយ ហើយ pending_payment ជាការចុះឈ្មោះដំបូង មិនត្រូវចាត់ទុកថា Pending ឡើយ
        const isInitialRegistrationPending = (st.status === 'ACTIVE' && (st.payment_status === 'APPROVED' || !st.payment_status)) && 
                                              (!st.settings?.pending_plan || st.settings?.pending_plan === st.plan);
        if (pendingPayment && !isInitialRegistrationPending && (pendingPayment.status === 'PENDING' || !pendingPayment.status)) {
          const exIdx = list.findIndex(p => p.id === pendingPayment.id || (p.store_id === st.id && p.status === 'PENDING'));
          if (exIdx === -1) {
            list.unshift({ ...pendingPayment, status: 'PENDING' });
            hasChanges = true;
          } else {
            list[exIdx] = { ...list[exIdx], ...pendingPayment, status: 'PENDING' };
          }
        }

        // 2. Check store.settings.subscription_payments array
        const storePaymentsHistory = Array.isArray(st.settings?.subscription_payments) ? st.settings.subscription_payments : [];
        storePaymentsHistory.forEach(sp => {
          if (!sp || !sp.id) return;
          const exIdx = list.findIndex(p => p.id === sp.id);
          if (exIdx === -1) {
            list.push(sp);
            hasChanges = true;
          }
        });

        // 3. Check if store itself is PENDING_APPROVAL on initial registration
        if (st.status === 'PENDING_APPROVAL' || st.payment_status === 'PENDING_APPROVAL') {
          const realSlip = st.settings?.slip_url || st.settings?.slipUrl || st.slip_url || '';
          const existingIdx = list.findIndex(p => p.store_id === st.id && p.status === 'PENDING');
          if (existingIdx === -1) {
            const planInfo = STORE_PLANS[st.plan] || STORE_PLANS.STARTER;
            list.unshift({
              id: `SUB_${st.id.replace('store_', '')}`,
              store_id: st.id,
              store_name: st.name || st.slug || 'ហាងថ្មី',
              plan_key: st.plan || 'STARTER',
              plan_name: planInfo.name || '🌱 Starter ($1/ខែ)',
              amount: planInfo.price || 1.00,
              billing_cycle: st.billing_cycle || 'monthly',
              payment_method: 'Bakong KHQR / ABA Pay',
              slip_url: realSlip,
              status: 'PENDING',
              notes: 'បានផ្ទេរបង់ប្រាក់តាម ABA Mobile រួចរាល់ សូមពិនិត្យ និង Approve',
              phone: st.phone || '',
              created_at: st.created_at || new Date().toISOString(),
              expires_target: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            hasChanges = true;
          }
        }

        // 4. Ensure store with slip_url has at least one payment record in history
        const anyStorePayment = list.some(p => p.store_id === st.id);
        const storeSlip = st.settings?.slip_url || st.settings?.slipUrl || st.slip_url;
        if (!anyStorePayment && storeSlip) {
          const planInfo = STORE_PLANS[st.plan] || STORE_PLANS.STARTER;
          list.push({
            id: `SUB_INIT_${st.id.replace('store_', '')}`,
            store_id: st.id,
            store_name: st.name || st.slug || 'ហាង',
            plan_key: st.plan || 'STARTER',
            plan_name: planInfo.name || '🌱 Starter ($1/ខែ)',
            amount: planInfo.price || 1.00,
            billing_cycle: st.billing_cycle || 'monthly',
            payment_method: 'Bakong KHQR / ABA Pay',
            slip_url: storeSlip,
            status: st.status === 'ACTIVE' ? 'APPROVED' : 'PENDING',
            approved_at: st.approved_at || st.created_at || new Date().toISOString(),
            approved_by: st.approved_by || 'Master Owner',
            notes: 'បង្កាន់ដៃបង់ប្រាក់ចុះឈ្មោះហាង',
            phone: st.phone || '',
            created_at: st.created_at || new Date().toISOString()
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
    // ⭐️ ការពារកុំឱ្យលើស Quota LocalStorage (5MB Limit) ដោយមិនកាត់ខ្លីខូច Base64
    const sanitizedPayments = (payments || []).map(p => {
      let slip = p?.slip_url || '';
      if (slip && slip.length > 250000 && slip.startsWith('data:')) {
        const sName = (p.store_name || '').toLowerCase();
        if (sName.includes('mario') || p.store_id?.includes('mario')) {
          slip = '/mario_slip.jpg';
        } else if (sName.includes('urban') || p.store_id?.includes('urban')) {
          slip = '/urbangrabs_slip.jpg';
        } else {
          slip = '';
        }
      }
      return {
        ...p,
        slip_url: slip
      };
    });
    localStorage.setItem('sabay_subscription_payments', JSON.stringify(sanitizedPayments));
    window.dispatchEvent(new Event('sabay_payments_changed'));
  } catch (e) {
    console.warn('saveSubscriptionPayments warning:', e);
  }
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
  const updatedList = [newRecord, ...currentList.filter(p => p.id !== paymentId)];
  saveSubscriptionPayments(updatedList);

  // ⭐️ Sync directly to Supabase stores table (settings.pending_payment & subscription_payments) ⭐️
  try {
    const { data: storeRow } = await supabase.from('stores').select('settings').eq('id', storeId).maybeSingle();
    const curSettings = storeRow?.settings || {};
    const existingPayments = Array.isArray(curSettings.subscription_payments) ? curSettings.subscription_payments : [];
    
    const updatedSettings = {
      ...curSettings,
      slip_url: slipUrl || curSettings.slip_url || '',
      pending_payment: newRecord,
      pending_plan: planKey,
      pending_cycle: billingCycle,
      pending_amount: parseFloat(amount) || 0,
      subscription_payments: [newRecord, ...existingPayments.filter(p => p.id !== paymentId)]
    };

    await supabase.from('stores').update({
      settings: updatedSettings
    }).eq('id', storeId);

    // Also update local stores cache
    const stores = getLocalStores().map(s => {
      if (s.id === storeId) {
        return {
          ...s,
          settings: updatedSettings
        };
      }
      return s;
    });
    saveLocalStores(stores);
  } catch (e) {
    console.warn('Could not sync pending payment to stores settings in Supabase:', e);
  }

  // 🔔 ជូនដំណឹង Realtime ឆ្លង Tab ទៅកាន់ Admin Dashboard (Platform Store Approvals)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sabay_subscription_alert', JSON.stringify({
        payment: newRecord,
        timestamp: Date.now()
      }));
      window.dispatchEvent(new Event('storage'));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('sabay_subscription_sync');
        bc.postMessage({ type: 'NEW_SUBSCRIPTION_PAYMENT', payment: newRecord });
        bc.close();
      }
    } catch (_) {}
  }

  // 🔔 Send Telegram Alert to Master Owner
  try {
    fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store_plan_upgrade_requested',
        store: { id: storeId, name: storeName, phone: customerPhone },
        newPlan: planName || planInfo.name,
        cycle: isYearly ? 'ប្រចាំឆ្នាំ (Yearly)' : 'ប្រចាំខែ (Monthly)',
        amount: `$${amount}`,
        slipUrl: slipUrl || '',
        paymentId: paymentId
      })
    }).catch(e => console.warn('Telegram notice error:', e));
  } catch (e) {}

  return newRecord;
};

export const approveSubscriptionPayment = async (paymentId, approvedBy = 'Master Owner', directItem = null) => {
  const currentList = getSubscriptionPayments();
  let idx = currentList.findIndex(p => p.id === paymentId);

  // If not found in currentList, try matching by directItem
  let p = idx !== -1 ? currentList[idx] : directItem;

  // If paymentId starts with SUB_REG_ (Registration Slip)
  const isRegSlip = String(paymentId).startsWith('SUB_REG_');
  const targetStoreId = p?.store_id || (isRegSlip ? String(paymentId).replace('SUB_REG_', '') : null);

  if (!p && targetStoreId) {
    p = {
      id: paymentId,
      store_id: targetStoreId,
      plan_key: 'STARTER',
      amount: 1,
      billing_cycle: 'monthly',
      status: 'PENDING'
    };
  }

  if (!p && !targetStoreId) return { success: false, error: 'Payment not found' };

  // 1. First ensure store itself is fully approved
  if (targetStoreId) {
    await approveStoreDirectly(targetStoreId, approvedBy);
  }

  const planInfo = STORE_PLANS[p?.plan_key] || STORE_PLANS.FREE;
  const isYearly = p?.billing_cycle === 'yearly';
  const daysToAdd = isYearly ? 365 : 30;

  let stores = getLocalStores();
  let stIndex = stores.findIndex(s => s.id === p?.store_id || s.slug === p?.store_id);
  if (stIndex !== -1) {
    const currentExpiry = stores[stIndex].plan_expires_at ? new Date(stores[stIndex].plan_expires_at) : new Date();
    const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    const upgradedStore = {
      ...stores[stIndex],
      plan: p.plan_key || stores[stIndex].plan,
      billing_cycle: p.billing_cycle || 'monthly',
      plan_started_at: new Date().toISOString(),
      plan_expires_at: newExpiry,
      max_products: planInfo.maxProducts || stores[stIndex].max_products,
      max_staff: planInfo.maxStaff || stores[stIndex].max_staff,
      status: 'ACTIVE',
      payment_status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy
    };
    stores[stIndex] = upgradedStore;
    saveLocalStores(stores);

    const active = getActiveStore();
    if (active && (active.id === p.store_id || active.slug === p.store_id)) {
      setActiveStore(upgradedStore);
    }
  }

  if (p) {
    p.status = 'APPROVED';
    p.approved_at = new Date().toISOString();
    p.approved_by = approvedBy;

    if (idx !== -1) {
      currentList[idx] = p;
    } else {
      currentList.unshift(p);
    }
    saveSubscriptionPayments(currentList);

    try {
      await supabase.from('subscription_payments').update({
        status: 'APPROVED',
        approved_at: p.approved_at,
        approved_by: approvedBy
      }).eq('id', paymentId);
    } catch (e) {}
  }

  return { success: true, ...p, payment: p };
};

export const rejectSubscriptionPayment = async (paymentId, reason = 'បង្កាន់ដៃមិនត្រឹមត្រូវ', directItem = null) => {
  const currentList = getSubscriptionPayments();
  let idx = currentList.findIndex(p => p.id === paymentId);
  let p = idx !== -1 ? currentList[idx] : directItem;
  const isRegSlip = String(paymentId).startsWith('SUB_REG_');
  const targetStoreId = p?.store_id || (isRegSlip ? String(paymentId).replace('SUB_REG_', '') : null);

  if (!p && targetStoreId) {
    p = { id: paymentId, store_id: targetStoreId, status: 'PENDING' };
  }

  if (!p && !targetStoreId) return { success: false, error: 'Payment not found' };

  if (p) {
    p.status = 'REJECTED';
    p.rejected_at = new Date().toISOString();
    p.reject_reason = reason;

    if (idx !== -1) {
      currentList[idx] = p;
    } else {
      currentList.unshift(p);
    }
    saveSubscriptionPayments(currentList);
  }

  // Clear pending_payment from store.settings in Supabase
  if (targetStoreId) {
    try {
      const { data: storeRow } = await supabase.from('stores').select('settings').or(`id.eq.${targetStoreId},slug.eq.${targetStoreId}`).maybeSingle();
      const curSettings = storeRow?.settings || {};
      const updatedHistory = (Array.isArray(curSettings.subscription_payments) ? curSettings.subscription_payments : []).map(item => {
        if (item.id === paymentId) return { ...item, status: 'REJECTED', reject_reason: reason };
        return item;
      });

      await supabase.from('stores').update({
        settings: {
          ...curSettings,
          pending_payment: null,
          pending_plan: null,
          pending_amount: null,
          payment_status: 'REJECTED',
          subscription_payments: updatedHistory
        }
      }).or(`id.eq.${targetStoreId},slug.eq.${targetStoreId}`);
    } catch (e) {}
  }

  return { success: true, ...p, payment: p };
};

// ⭐️ Helper: អនុម័ត (Approve) ហាងដោយផ្ទាល់ពី Platform Stores Manager
export const approveStoreDirectly = async (storeId, approvedBy = 'Master Owner') => {
  let stores = getLocalStores();
  let stIndex = stores.findIndex(s => s.id === storeId || s.slug === storeId);
  let store = stIndex !== -1 ? stores[stIndex] : null;

  // 1. If not found in local stores, lookup from Supabase Cloud directly
  if (!store) {
    try {
      const { data: dbStore } = await supabase
        .from('stores')
        .select('*')
        .or(`id.eq.${storeId},slug.eq.${storeId}`)
        .maybeSingle();
      if (dbStore) {
        store = dbStore;
      }
    } catch (fetchErr) {
      console.warn('approveStoreDirectly cloud lookup error:', fetchErr);
    }
  }

  if (!store) {
    return { success: false, error: 'រកមិនឃើញហាងនេះទេ' };
  }

  const daysToAdd = 365; // លំនាំដើម ១ ឆ្នាំ
  const currentExpiry = store.plan_expires_at ? new Date(store.plan_expires_at) : new Date();
  const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
  const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  const nowIso = new Date().toISOString();
  const curSettings = store.settings || {};
  const currentPending = curSettings.pending_payment;
  const currentHistory = Array.isArray(curSettings.subscription_payments)
    ? [...curSettings.subscription_payments]
    : [];
    
  if (currentPending) {
    const pIdx = currentHistory.findIndex(h => h.id === currentPending.id);
    const approvedP = {
      ...currentPending,
      slip_url: currentPending.slip_url || (store.slug === 'mario' ? '/mario_slip.jpg' : (store.slug === 'urbangrabs' ? '/urbangrabs_slip.jpg' : '')),
      status: 'APPROVED',
      approved_at: nowIso,
      approved_by: approvedBy
    };
    if (pIdx !== -1) {
      currentHistory[pIdx] = approvedP;
    } else {
      currentHistory.unshift(approvedP);
    }
  }

  const sanitizedHistory = currentHistory.map(h => {
    if (h.status === 'PENDING') {
      return { 
        ...h, 
        slip_url: h.slip_url || (store.slug === 'mario' ? '/mario_slip.jpg' : ''),
        status: 'APPROVED', 
        approved_at: nowIso, 
        approved_by: approvedBy 
      };
    }
    return h;
  });

  const cleanSlipUrl = curSettings.slip_url || (store.slug === 'mario' ? '/mario_slip.jpg' : '');

  const resolvedPlan = curSettings.pending_plan || currentPending?.plan_key || store.plan || 'STARTER';
  const resolvedBillingCycle = curSettings.pending_cycle || currentPending?.billing_cycle || store.billing_cycle || 'monthly';
  const planInfo = STORE_PLANS[resolvedPlan] || STORE_PLANS.STARTER;

  const directSettings = {
    ...curSettings,
    slip_url: cleanSlipUrl,
    payment_status: 'APPROVED',
    plan_expires_at: newExpiry,
    approved_at: nowIso,
    approved_by: approvedBy,
    plan: resolvedPlan,
    billing_cycle: resolvedBillingCycle,
    pending_payment: null, // ⭐️ CLEAR PENDING TO PREVENT GHOST PENDING
    pending_plan: null,
    pending_amount: null,
    pending_cycle: null,
    subscription_payments: sanitizedHistory
  };

  const upgradedStore = {
    ...store,
    plan: resolvedPlan,
    billing_cycle: resolvedBillingCycle,
    max_products: planInfo.maxProducts || store.max_products || 25,
    max_staff: planInfo.maxStaff || store.max_staff || 2,
    status: 'ACTIVE',
    payment_status: 'APPROVED',
    plan_expires_at: newExpiry,
    approved_at: nowIso,
    approved_by: approvedBy,
    settings: directSettings
  };

  // 2. Authoritative: Update directly in Supabase Cloud
  try {
    const { error: upError } = await supabase.from('stores').update({
      status: 'ACTIVE',
      plan: resolvedPlan,
      billing_cycle: resolvedBillingCycle,
      plan_expires_at: newExpiry,
      payment_status: 'APPROVED',
      settings: directSettings
    }).or(`id.eq.${store.id},slug.eq.${store.slug || store.id}`);
    if (upError) {
      console.error('Supabase update store active error:', upError);
    }
  } catch (cloudErr) {
    console.error('Cloud exception approving store:', cloudErr);
  }

  // 3. Update local stores cache
  stores = getLocalStores();
  const updateIdx = stores.findIndex(s => s.id === store.id || s.slug === store.slug);
  if (updateIdx !== -1) {
    stores[updateIdx] = upgradedStore;
  } else {
    stores.unshift(upgradedStore);
  }
  saveLocalStores(stores);

  const active = getActiveStore();
  if (active && (active.id === store.id || active.slug === store.slug)) {
    setActiveStore(upgradedStore);
  }

  // 4. Approve all pending subscription payments of this store
  const payments = getSubscriptionPayments();
  let paymentsChanged = false;
  payments.forEach(p => {
    const isTarget = p.store_id === store.id || 
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


// ⭐️ Helper: កែប្រែកាលបរិច្ឆេទផុតកំណត់នៃកញ្ចប់ហាងដោយផ្ទាល់ (MANUALLY UPDATE STORE PLAN EXPIRY DATE) ⭐️
export const updateStorePlanExpiryDate = async (storeId, newExpiryDateIso) => {
  let stores = getLocalStores();
  let idx = stores.findIndex(s => s.id === storeId || s.slug === storeId);
  if (idx === -1) return { success: false, error: 'Store not found' };

  const store = stores[idx];
  const updatedSettings = {
    ...(store.settings || {}),
    plan_expires_at: newExpiryDateIso
  };

  const updatedStore = {
    ...store,
    plan_expires_at: newExpiryDateIso,
    settings: updatedSettings
  };

  stores[idx] = updatedStore;
  saveLocalStores(stores);

  const active = getActiveStore();
  if (active && (active.id === store.id || active.slug === store.slug)) {
    setActiveStore(updatedStore);
  }

  // Update in Supabase cloud
  try {
    await supabase.from('stores').update({
      plan_expires_at: newExpiryDateIso,
      settings: updatedSettings
    }).or(`id.eq.${store.id},slug.eq.${store.slug || store.id}`);
  } catch (err) {
    console.warn('Could not update expiry in cloud:', err);
  }

  return { success: true, store: updatedStore };
};
