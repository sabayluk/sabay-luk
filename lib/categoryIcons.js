import React from 'react';

/**
 * ⭐️ បញ្ជី Icon SVG ស្តង់ដារបែងចែកតាមផ្នែក (General Store Department Categories) ⭐️
 * សម្រាប់ហាងគ្រប់មុខ (General Store / Department Store / Multi-Category Shop)
 */

export const CATEGORY_DEPARTMENTS = [
  { id: 'ALL', label: 'ទាំងអស់ (All Icons)', icon: '🌟' },
  { id: 'fashion', label: '👗 ម៉ូដ & សម្លៀកបំពាក់', icon: '👗' },
  { id: 'footwear', label: '👟 ស្បែកជើងគ្រប់ប្រភេទ', icon: '👟' },
  { id: 'accessories', label: '👜 កាបូប & គ្រឿងតុបតែង', icon: '👜' },
  { id: 'beauty', label: '💄 សម្រស់ & គ្រឿងសម្អាង', icon: '💄' },
  { id: 'electronics', label: '📱 អេឡិចត្រូនិក & IT', icon: '📱' },
  { id: 'home', label: '🏠 ផ្ទះបាយ & របស់របរប្រើប្រាស់', icon: '🏠' },
  { id: 'food', label: '🍔 ចំណីអាហារ & ភេសជ្ជៈ', icon: '🍔' },
  { id: 'sports', label: '⚽ កីឡា & ឧបករណ៍ហាត់ប្រាណ', icon: '⚽' },
  { id: 'medical', label: '💊 ឱសថ & ថែទាំសុខភាព', icon: '💊' },
  { id: 'stationery', label: '📚 សៀវភៅ & សម្ភារៈសិក្សា', icon: '📚' },
  { id: 'auto_tools', label: '🚗 យានយន្ត & ឧបករណ៍ជួសជុល', icon: '🚗' },
  { id: 'general', label: '🎁 កាដូ & ប្រូម៉ូសិនទូទៅ', icon: '🎁' }
];

export const CATEGORY_ICONS_LIST = [
  // ================= 👗 ១. ម៉ូដ & សម្លៀកបំពាក់ (Fashion & Apparel) =================
  {
    id: 'shirt',
    department: 'fashion',
    label: 'សម្លៀកបំពាក់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 1.89v1.15a2 2 0 001.62 1.96l1.38.23V20a2 2 0 002 2h11a2 2 0 002-2V8.69l1.38-.23a2 2 0 001.62-1.96V5.35a2 2 0 00-1.34-1.89z" />
    )
  },
  {
    id: 'tshirt',
    department: 'fashion',
    label: 'អាវយឺត (T-Shirt)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2a4 4 0 01-8 0L3 5l2 4 3-1v12h8V8l3 1 2-4-5-3z" />
    )
  },
  {
    id: 'dress',
    department: 'fashion',
    label: 'រ៉ូប / សំពត់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6l1 4-2 3 4 11H6l4-11-2-3 1-4z" />
    )
  },
  {
    id: 'pants',
    department: 'fashion',
    label: 'ខោវែង / ជើងវែង',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v4l-1 14h-4l-1-9-1 9H7L6 7V3z" />
    )
  },
  {
    id: 'coat',
    department: 'fashion',
    label: 'អាវធំ / អាវរងា',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l4-2h8l4 2v17a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm8 0v18M8 2l4 6 4-6" />
    )
  },
  {
    id: 'baby_clothes',
    department: 'fashion',
    label: 'ខោអាវកុមារ / ទារក',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a3 3 0 00-3 3v2H6L4 12l2 2v6h12v-6l2-2-2-3h-3V7a3 3 0 00-3-3z" />
    )
  },
  {
    id: 'swimsuit',
    department: 'fashion',
    label: 'ឈុតហែលទឹក',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3a2 2 0 104 0 2 2 0 104 0v4a4 4 0 01-8 0V3zm0 11l-3 4a2 2 0 002 3h10a2 2 0 002-3l-3-4H8z" />
    )
  },
  {
    id: 'underwear',
    department: 'fashion',
    label: 'សម្លៀកបំពាក់ក្នុង',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16l-2 9a6 6 0 01-6 5 6 6 0 01-6-5L4 6z" />
    )
  },

  // ================= 👟 ២. ស្បែកជើងគ្រប់ប្រភេទ (Footwear) =================
  {
    id: 'shoe',
    department: 'footwear',
    label: 'ស្បែកជើងប៉ាតា',
    path: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.2 14.3l-2.6-6.5a2 2 0 00-1.9-1.3H11l-3 3-4.5 1A2 2 0 002 12.5v3A2.5 2.5 0 004.5 18h13a2.5 2.5 0 002.5-2.5 2.5 2.5 0 00.2-1.2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 14.5h18.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5l-4-1.5" />
      </>
    )
  },
  {
    id: 'heel',
    department: 'footwear',
    label: 'ស្បែកជើងកែង',
    path: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-3-7a2 2 0 00-1.8-1.2H12l-4 3-3 1.5A2 2 0 003.5 14L4 18h16.5a1 1 0 00.5-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 8l2 8M6 18v3" />
      </>
    )
  },
  {
    id: 'boot',
    department: 'footwear',
    label: 'ស្បែកជើងកវែង (Boots)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8v9l4 2a2 2 0 011 1.7V18a2 2 0 01-2 2H7a2 2 0 01-2-2v-3l3-2V3zM8 7h8" />
    )
  },
  {
    id: 'sandal',
    department: 'footwear',
    label: 'ស្បែកជើងផ្ទាត់ / សង្រែក',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 17a3 3 0 003 3h10a3 3 0 003-3v-2H4v2zm2-2l6-7 6 7M12 8v5" />
    )
  },
  {
    id: 'sports_shoe',
    department: 'footwear',
    label: 'ស្បែកជើងកីឡា / រត់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15l2-6 5-1 4 3 6 1v4a2 2 0 01-2 2H5a2 2 0 01-2-2zm4-3l4 1m-2-4l3 2" />
    )
  },

  // ================= 👜 ៣. កាបូប & គ្រឿងតុបតែង (Bags & Accessories) =================
  {
    id: 'bag',
    department: 'accessories',
    label: 'កាបូបយួរដៃ',
    path: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h.01M15 14h.01" />
      </>
    )
  },
  {
    id: 'backpack',
    department: 'accessories',
    label: 'កាតាបស្ពាយ (Backpack)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 6a5 5 0 0110 0v14a2 2 0 01-2 2H9a2 2 0 01-2-2V6zm2-4h6M9 12h6M9 16h6" />
    )
  },
  {
    id: 'wallet',
    department: 'accessories',
    label: 'កាបូបលុយ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm13 5h2v2h-2v-2z" />
    )
  },
  {
    id: 'luggage',
    department: 'accessories',
    label: 'វ៉ាលីធ្វើដំណើរ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2zm4-4h4v4h-4V3zM9 12v5m6-5v5" />
    )
  },
  {
    id: 'belt',
    department: 'accessories',
    label: 'ខ្សែក្រវ៉ាត់',
    path: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10c-1-3-4-4-7-4S5 7 5 10c0 2.5 2 4 5 4s5-1.5 5-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v4c0 3 3 4 7 4s7-1 7-4v-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10a2 2 0 100-4 2 2 0 000 4z" />
      </>
    )
  },
  {
    id: 'watch',
    department: 'accessories',
    label: 'នាឡិកាដៃ',
    path: (
      <>
        <rect x="7" y="5" width="10" height="14" rx="3" ry="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6M9 22h6M17 12h1.5M12 9v3l1.5 1.5" />
      </>
    )
  },
  {
    id: 'glasses',
    department: 'accessories',
    label: 'វ៉ែនតា',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 14h3a3 3 0 003-3V9m6 5h3a3 3 0 003-3V9m-6 3a3 3 0 100-6 3 3 0 000 6zm-9 0a3 3 0 100-6 3 3 0 000 6z" />
    )
  },
  {
    id: 'hat',
    department: 'accessories',
    label: 'មួក',
    path: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a7 7 0 00-7 7c0 2 1 3.5 2 4.5h10c1-1 2-2.5 2-4.5a7 7 0 00-7-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16h18a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </>
    )
  },
  {
    id: 'ring',
    department: 'accessories',
    label: 'ចិញ្ចៀន / ត្បូង',
    path: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8a6 6 0 100 12 6 6 0 000-12z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4l2.5 3h-5L12 4z" />
      </>
    )
  },
  {
    id: 'necklace',
    department: 'accessories',
    label: 'ខ្សែ-ក / បន្តោង',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4c0 7 3.5 12 8 12s8-5 8-12m-8 12v4m-2 0h4" />
    )
  },
  {
    id: 'tie',
    department: 'accessories',
    label: 'ក្រវ៉ាត់ក (Necktie)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2h4l-1 3 3 9-4 8-4-8 3-9-1-3z" />
    )
  },

  // ================= 💄 ៤. សម្រស់ & គ្រឿងសម្អាង (Beauty & Personal Care) =================
  {
    id: 'perfume',
    department: 'beauty',
    label: 'ទឹកអប់ (Perfume)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2h4M12 2v4m-5 4h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2z" />
    )
  },
  {
    id: 'lipstick',
    department: 'beauty',
    label: 'ក្រែម / គ្រឿង Make-up',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6v11H9V10zm1-7a2 2 0 012-2v9h-4V5a2 2 0 012-2z" />
    )
  },
  {
    id: 'skincare',
    department: 'beauty',
    label: 'ឡេ / ក្រែមថែស្បែក',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8v12a2 2 0 01-2 2H10a2 2 0 01-2-2V8zm2-4h4v4h-4V4zm-1 0h6" />
    )
  },
  {
    id: 'soap',
    department: 'beauty',
    label: 'សាប៊ូ / បន្ទប់ទឹក',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11a5 5 0 0110 0v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8zm5-7a2 2 0 00-2 2v2h4V6a2 2 0 00-2-2z" />
    )
  },
  {
    id: 'hair_care',
    department: 'beauty',
    label: 'ថែរក្សាសក់ / សិតសក់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v3H4V5zm2 3v11m4-11v11m4-11v11m4-11v11" />
    )
  },
  {
    id: 'spa',
    department: 'beauty',
    label: 'ម៉ាស្សា & ស្ប៉ា (Spa)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4 5-7 7-7 11a7 7 0 0014 0c0-4-3-6-7-11zm0 9a2 2 0 100 4 2 2 0 000-4z" />
    )
  },

  // ================= 📱 ៥. អេឡិចត្រូនិក & IT (Electronics & Gadgets) =================
  {
    id: 'phone',
    department: 'electronics',
    label: 'ទូរស័ព្ទដៃ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4a2 2 0 012-2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4zm5 14h.01" />
    )
  },
  {
    id: 'laptop',
    department: 'electronics',
    label: 'កុំព្យូទ័រ (Laptop)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9H4V6zm-2 12h20l-1 2H3l-1-2z" />
    )
  },
  {
    id: 'tablet',
    department: 'electronics',
    label: 'ថេប្លេត (Tablet / iPad)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4a2 2 0 012-2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm7 15h.01" />
    )
  },
  {
    id: 'headphone',
    department: 'electronics',
    label: 'កាសត្រចៀក',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 14a4 4 0 014-4h8a4 4 0 014 4v5a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3M5 14v-2a7 7 0 0114 0v2m-14 0h3a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z" />
    )
  },
  {
    id: 'camera',
    department: 'electronics',
    label: 'កាមេរ៉ាថតរូប',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h2.5l1.5-2h6l1.5 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm9 8a4 4 0 100-8 4 4 0 000 8z" />
    )
  },
  {
    id: 'smartwatch',
    department: 'electronics',
    label: 'នាឡិកាឆ្លាតវៃ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v3H9V3zm0 15h6v3H9v-3zm-2-9a3 3 0 013-3h4a3 3 0 013 3v6a3 3 0 01-3 3h-4a3 3 0 01-3-3V9z" />
    )
  },
  {
    id: 'tv',
    department: 'electronics',
    label: 'ទូរទស្សន៍ / អេក្រង់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm5 15l4-3 4 3" />
    )
  },
  {
    id: 'speaker',
    department: 'electronics',
    label: 'ធុងបាស / Speaker',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4a2 2 0 012-2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4zm6 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 7a3 3 0 100 6 3 3 0 000-6z" />
    )
  },
  {
    id: 'gaming',
    department: 'electronics',
    label: 'ហ្គេម (Game Console)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 11h4m-2-2v4m7-2h.01M17 9h.01M5 7h14a3 3 0 013 3v6a3 3 0 01-3 3l-3-2H8l-3 2a3 3 0 01-3-3v-6a3 3 0 013-3z" />
    )
  },
  {
    id: 'cable',
    department: 'electronics',
    label: 'ខ្សែសាក & គ្រឿងបន្លាស់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4m8-4v4m-9 4h10v2a5 5 0 01-5 5v3m-2 0h4" />
    )
  },

  // ================= 🏠 ៦. ផ្ទះបាយ & របស់របរប្រើប្រាស់ (Home & Kitchen) =================
  {
    id: 'home',
    department: 'home',
    label: 'របស់របរក្នុងផ្ទះ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
    )
  },
  {
    id: 'furniture',
    department: 'home',
    label: 'គ្រឿងសង្ហារិម / កៅអី',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 11V5a2 2 0 012-2h10a2 2 0 012 2v6m-16 0h18v6H3v-6zm3 6v4m12-4v4" />
    )
  },
  {
    id: 'kitchen',
    department: 'home',
    label: 'ឧបករណ៍ចង្ក្រានបាយ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11h16a1 1 0 011 1v2a6 6 0 01-6 6H9a6 6 0 01-6-6v-2a1 1 0 011-1zm4-6v3m4-3v3m4-3v3" />
    )
  },
  {
    id: 'cup',
    department: 'home',
    label: 'កែវ / ពែងកាហ្វេ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h12v9a4 4 0 01-4 4H9a4 4 0 01-4-4V6zm12 2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2V8zM3 21h16" />
    )
  },
  {
    id: 'bed',
    department: 'home',
    label: 'កម្រាលពូក / ខ្នើយ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v13m18-13v13M3 13h18M5 13V9a2 2 0 012-2h10a2 2 0 012 2v4" />
    )
  },
  {
    id: 'lamp',
    department: 'home',
    label: 'អំពូលភ្លើង / តុបតែង',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6l3 7H6l3-7zm3 7v10m-3 0h6" />
    )
  },
  {
    id: 'cleaning',
    department: 'home',
    label: 'សម្ភារៈសម្អាតផ្ទះ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3l7 7-3 3-7-7 3-3zm-4 6l-6 6a2 2 0 000 2.8l2.4 2.4a2 2 0 002.8 0l6-6-5.2-5.2z" />
    )
  },

  // ================= 🍔 ៧. ចំណីអាហារ & ភេសជ្ជៈ (Food & Beverages) =================
  {
    id: 'food',
    department: 'food',
    label: 'ម្ហូបអាហារ / អាហារសម្រន់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a7 7 0 00-7 7v1h14v-1a7 7 0 00-7-7zM4 16h16a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
    )
  },
  {
    id: 'drink',
    department: 'food',
    label: 'ភេសជ្ជៈ / ទឹកផ្លែឈើ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12l-2 17a2 2 0 01-2 2H10a2 2 0 01-2-2L6 3zm0 4h12M15 3l2-2" />
    )
  },
  {
    id: 'coffee',
    department: 'food',
    label: 'កាហ្វេ / តែ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h12v7a4 4 0 01-4 4H8a4 4 0 01-4-4V8zm12 2h2a2 2 0 012 2v1a2 2 0 01-2 2h-2v-5zM7 3v2m4-2v2m4-2v2" />
    )
  },
  {
    id: 'cake',
    department: 'food',
    label: 'នំខេក / នំបុ័ង (Bakery)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 14h16v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm2-5h12v5H6V9zm6-6a1 1 0 011 1v2h-2V4a1 1 0 011-1z" />
    )
  },
  {
    id: 'fruit',
    department: 'food',
    label: 'ផ្លែឈើស្រស់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a6 6 0 106 6c0-3.3-2.7-6-6-6zm0-4c0 2-1 3-3 3" />
    )
  },
  {
    id: 'vegetable',
    department: 'food',
    label: 'បន្លែបង្ការ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21l-7-7a5 5 0 017-7l7 7a5 5 0 01-7 7zM12 7l4 4" />
    )
  },
  {
    id: 'groceries',
    department: 'food',
    label: 'ទំនិញចាប់ហួយ / Minimart',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2 12h11l2-8H6M9 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm8 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    )
  },

  // ================= ⚽ ៨. កីឡា & ឧបករណ៍ហាត់ប្រាណ (Sports & Fitness) =================
  {
    id: 'football',
    department: 'sports',
    label: 'បាល់ទាត់ / បាល់បោះ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 4l3 3-1 4h-4l-1-4 3-3z" />
    )
  },
  {
    id: 'gym',
    department: 'sports',
    label: 'លើកទម្ងន់ / Gym',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10v4m3-6v8m0-4h12m0 0v-4m0 8v-8m3 2v4" />
    )
  },
  {
    id: 'bicycle',
    department: 'sports',
    label: 'កង់ / ជិះកង់',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 18a3 3 0 100-6 3 3 0 000 6zm14 0a3 3 0 100-6 3 3 0 000 6zm-14-3h4l3-5h4l2 5m-5-5l-2 5M12 8V6h3" />
    )
  },
  {
    id: 'camping',
    department: 'sports',
    label: 'បោះតង់ / ដើរព្រៃ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20l9-16 9 16H3zm9-16v16" />
    )
  },
  {
    id: 'yoga',
    department: 'sports',
    label: 'យូហ្គា & សុខភាព',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a2 2 0 100 4 2 2 0 000-4zm-5 7h10l-2 9H9l-2-9zM4 11l4 2m12-2l-4 2" />
    )
  },

  // ================= 💊 ៩. ឱសថ & ថែទាំសុខភាព (Pharmacy & Medical) =================
  {
    id: 'pill',
    department: 'medical',
    label: 'ថ្នាំពេទ្យ / វីតាមីន',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5l9 9a4.24 4.24 0 01-6 6l-9-9a4.24 4.24 0 016-6zm-3 9l6-6" />
    )
  },
  {
    id: 'firstaid',
    department: 'medical',
    label: 'ប្រអប់សង្គ្រោះបឋម',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm5-3h6v3H9V3zm3 7v6m-3-3h6" />
    )
  },
  {
    id: 'medical',
    department: 'medical',
    label: 'ឧបករណ៍វេជ្ជសាស្ត្រ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-9-9h18M6 6l12 12M6 18L18 6" />
    )
  },

  // ================= 📚 ១០. សៀវភៅ & សម្ភារៈសិក្សា (Books & Stationery) =================
  {
    id: 'book',
    department: 'stationery',
    label: 'សៀវភៅ / ប្រលោមលោក',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    )
  },
  {
    id: 'stationery',
    department: 'stationery',
    label: 'ប៊ិច & សម្ភារៈការិយាល័យ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    )
  },
  {
    id: 'toy',
    department: 'stationery',
    label: 'ប្រដាប់ក្មេងលេង',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    )
  },
  {
    id: 'music',
    department: 'stationery',
    label: 'ឧបករណ៍តន្ត្រី / សិល្បៈ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-2v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" />
    )
  },

  // ================= 🚗 ១១. យានយន្ត & ឧបករណ៍ជួសជុល (Automotive & Hardware) =================
  {
    id: 'car',
    department: 'auto_tools',
    label: 'គ្រឿងបន្លាស់រថយន្ត',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l2-5h10l2 5M4 11h16a1 1 0 011 1v5a1 1 0 01-1 1h-1a2 2 0 01-4 0H9a2 2 0 01-4 0H4a1 1 0 01-1-1v-5a1 1 0 011-1zm3 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    )
  },
  {
    id: 'motorcycle',
    department: 'auto_tools',
    label: 'ម៉ូតូ / មួកការពារ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17a3 3 0 100-6 3 3 0 000 6zm14 0a3 3 0 100-6 3 3 0 000 6zm-14-3l4-4h4l3 4m-3-4l-2-3h-3" />
    )
  },
  {
    id: 'tool',
    department: 'auto_tools',
    label: 'ឧបករណ៍ជួសជុល / ជាង',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    )
  },

  // ================= 🎁 ១២. កាដូ & ប្រូម៉ូសិនទូទៅ (Gifts, Promos & General) =================
  {
    id: 'gift',
    department: 'general',
    label: 'កាដូ / អំណោយ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V4a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2zm-8 4h16v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9zm-1-4h18a1 1 0 011 1v3H2V9a1 1 0 011-1z" />
    )
  },
  {
    id: 'tag',
    department: 'general',
    label: 'បញ្ចុះតម្លៃ / Sale',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M4.93 4.93a10 10 0 0114.14 0l1.41 1.41a2 2 0 010 2.83L11 18.66a2 2 0 01-2.83 0L3.52 14.01a2 2 0 010-2.83l1.41-1.41a10 10 0 010-4.84z" />
    )
  },
  {
    id: 'star',
    department: 'general',
    label: 'ពេញនិយម (Best Seller)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    )
  },
  {
    id: 'fire',
    department: 'general',
    label: 'ទំនិញក្តៅៗ (Hot Trending)',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    )
  },
  {
    id: 'box',
    department: 'general',
    label: 'ប្រអប់ទំនិញទូទៅ',
    path: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    )
  }
];

/**
 * ⭐️ Render SVG Icon តាមរយៈ Icon ID ⭐️
 */
export const renderCategorySvg = (iconId, className = 'w-5 h-5') => {
  const targetId = (iconId || 'shoe').toLowerCase().trim();
  const found = CATEGORY_ICONS_LIST.find(i => i.id === targetId);

  return (
    <svg 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      viewBox="0 0 24 24" 
      className={className}
    >
      {found ? found.path : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      )}
    </svg>
  );
};
