// lib/i18n.js
// Multi-language system (Khmer 🇰🇭 & English 🇬🇧) for Sabay Luk Admin Dashboard

export const SUPPORTED_LANGUAGES = [
  { code: 'km', name: 'ភាសាខ្មែរ', label: '🇰🇭 ភាសាខ្មែរ (Khmer)', flag: '🇰🇭' },
  { code: 'en', name: 'English', label: '🇬🇧 English (English)', flag: '🇬🇧' }
];

export const getStoredLanguage = () => {
  if (typeof window === 'undefined') return 'km';
  try {
    const saved = localStorage.getItem('sabay_admin_language');
    if (saved === 'en' || saved === 'km') return saved;
  } catch (e) {}
  return 'km';
};

export const setStoredLanguage = (lang) => {
  if (typeof window === 'undefined') return;
  const valid = lang === 'en' ? 'en' : 'km';
  try {
    localStorage.setItem('sabay_admin_language', valid);
    window.dispatchEvent(new CustomEvent('sabay_language_changed', { detail: valid }));
  } catch (e) {}
};

export const DICTIONARY = {
  km: {
    // Top & Brand
    admin_workspace: 'Admin Workspace',
    open_menu: 'បើកម៉ឺនុយ',
    collapse_menu: 'រុញបិទរបារម៉ឺនុយ',
    view_storefront: 'មើលមុខហាង',
    view_live_storefront: 'មើលមុខហាងផ្ទាល់',
    switch_store: 'ប្តូរហាង',
    new_store: 'ហាងថ្មី',
    upgrade_plan: 'ដំឡើង',
    upgrade_plan_btn: 'ដំឡើងកញ្ចប់ (Upgrade)',
    items_count: 'មុខ',
    products_label: 'ទំនិញ',
    current_products: 'ទំនិញបច្ចុប្បន្ន',
    switch_staff: 'ប្តូរបុគ្គលិក',
    logout: 'ចាកចេញពីប្រព័ន្ធ',
    save_settings: 'រក្សាទុកការកំណត់',
    saved_success: 'បានរក្សាទុកជោគជ័យ!',

    // Tab Groups
    group_sales_stock: 'លក់ & គ្រប់គ្រងស្តុក',
    group_finance_crm: 'ហិរញ្ញវត្ថុ & អតិថិជន',
    group_store_settings: 'ប្រព័ន្ធ & ការកំណត់',
    group_staff_platform: 'បុគ្គលិក & ប្រព័ន្ធ',
    features_count: 'មុខងារ',

    // Tabs
    tab_pos: 'ប្រព័ន្ធលក់ (POS)',
    tab_orders: 'ការបញ្ជាទិញ (Orders)',
    tab_inventory: 'គ្រប់គ្រងស្តុកទំនិញ',
    tab_upload: 'បញ្ចូលទំនិញថ្មី',
    tab_analytics: 'វិភាគទិន្នន័យ (P&L)',
    tab_finance: 'ហិរញ្ញវត្ថុ & IFRS (Finance Suite)',
    tab_expenses: 'ចំណាយ & ចំណេញសុទ្ធ',
    tab_customers: 'អតិថិជន (CRM)',
    tab_feedbacks: 'មតិយោបល់ (Feedbacks)',
    tab_categories: 'ប្រភេទផលិតផល',
    tab_cover: 'គ្រប់គ្រង Cover ហាង',
    tab_settings: 'ព័ត៌មានហាង និង Logo',
    tab_invoice: 'កំណត់វិក្កយបត្រ',
    tab_api: 'ការតភ្ជាប់ (API & Bot)',
    tab_staff: 'គ្រប់គ្រងបុគ្គលិក',
    tab_stores: 'គ្រប់គ្រងហាងទាំងអស់',

    // Settings Sub-tabs
    subtab_branding: '🎨 ព័ត៌មានហាង & Logo',
    subtab_theme: '🌈 ពណ៌ Brand & Theme',
    subtab_contact: '📞 ទំនាក់ទំនង & អាសយដ្ឋាន',
    subtab_announcement: '📢 សាររត់លើគេ',
    subtab_payment: '💳 គណនី KHQR / ABA',
    subtab_delivery: '🚚 ដឹកជញ្ជូន & អត្រាប្តូរប្រាក់',
    subtab_data: '🧹 សម្អាតទិន្នន័យ & Export',

    // Settings Content
    store_settings_header: 'ការកំណត់ហាង & ម៉ាកយីហោ',
    store_settings_desc: 'កែប្រែ Logo, ឈ្មោះហាង, ភាសាប្រព័ន្ធ, ព័ត៌មានទំនាក់ទំនង, គណនី KHQR និងការបង្ហាញទាំងអស់ដោយងាយស្រួល',
    system_language_title: '🌐 ភាសាប្រព័ន្ធ (System Language)',
    system_language_desc: 'ជ្រើសរើសភាសាសម្រាប់ផ្ទាំងគ្រប់គ្រង Admin (Khmer ឬ English)',
    lang_km_label: 'ភាសាខ្មែរ (Khmer)',
    lang_km_sub: 'ភាសាខ្មែរពេញលេញសម្រាប់ Dashboard',
    lang_en_label: 'English (អង់គ្លេស)',
    lang_en_sub: 'English language for Admin Dashboard',
    brand_identity_title: '១. ម៉ាកយីហោ & រូបភាព Logo (Brand Identity)',
    brand_identity_desc: 'រូបភាព Logo នឹងបង្ហាញលើ Header ខាងលើគេ, ផ្នែកខាងក្រោម (Footer) និងវិក្កយបត្រ',
    logo_has_custom: 'បានកំណត់រូបភាព Logo ផ្ទាល់ខ្លួនរួចរាល់',
    logo_empty: 'មិនទាន់មាន Logo (កំពុងប្រើ Logo អក្សរកាត់គំរូ)',
    logo_hint: 'ទំហំដែលណែនាំ៖ 400x120px ឬ 512x512px (PNG, SVG, JPG, WebP ផ្ទៃថ្លា Transparent កាន់តែស្អាត)',
    logo_invoice_checkbox: '🧾 បង្ហាញ Logo លើសន្លឹកវិក្កយបត្រ និងបង្កាន់ដៃព្រីន (Show Logo on Invoice/Receipt)',
    upload_logo_btn: 'Upload Logo ថ្មី',
    remove_logo_btn: 'លុប Logo ចេញ',
    store_name_label: 'ឈ្មោះហាង (Store Name)',
    store_slogan_label: 'ពាក្យស្លោកហាង (Slogan / Subtitle)',
    store_desc_label: 'ការពិពណ៌នាអំពីហាង (About Store / Description)',

    // Common Actions & Badges
    btn_search: 'ស្វែងរក',
    btn_filter: 'Filter',
    btn_edit: 'កែសម្រួល',
    btn_delete: 'លុប',
    btn_save: 'រក្សាទុក',
    btn_cancel: 'បោះបង់',
    btn_confirm: 'យល់ព្រម',
    btn_print: 'បោះពុម្ព',
    btn_export: 'នាំចេញ',
    btn_in_stock: 'មានក្នុងស្តុក',
    btn_low_stock: 'ស្តុកជិតអស់',
    btn_out_of_stock: 'អស់ពីស្តុក',
    action_quick_switch: 'ប្តូរភាសារហ័ស'
  },
  en: {
    // Top & Brand
    admin_workspace: 'Admin Workspace',
    open_menu: 'Open Menu',
    collapse_menu: 'Collapse Sidebar',
    view_storefront: 'View Storefront',
    view_live_storefront: 'View Live Storefront',
    switch_store: 'Switch Store',
    new_store: 'New Store',
    upgrade_plan: 'Upgrade',
    upgrade_plan_btn: 'Upgrade Plan',
    items_count: 'items',
    products_label: 'Products',
    current_products: 'Current Products',
    switch_staff: 'Switch Staff',
    logout: 'Logout & Lock',
    save_settings: 'Save Settings',
    saved_success: 'Settings saved successfully!',

    // Tab Groups
    group_sales_stock: 'Sales & Inventory',
    group_finance_crm: 'Finance & Customers',
    group_store_settings: 'System & Settings',
    group_staff_platform: 'Staff & System',
    features_count: 'features',

    // Tabs
    tab_pos: 'Point of Sale (POS)',
    tab_orders: 'Orders Management',
    tab_inventory: 'Inventory Stock',
    tab_upload: 'Upload New Product',
    tab_analytics: 'Analytics & Reports',
    tab_finance: 'Finance & IFRS Accounting',
    tab_expenses: 'Expenses & Profit',
    tab_customers: 'Customers (CRM)',
    tab_feedbacks: 'Customer Feedbacks',
    tab_categories: 'Categories',
    tab_cover: 'Cover Banners',
    tab_settings: 'Store Info & Logo',
    tab_invoice: 'Invoice & Receipt',
    tab_api: 'Integrations & API',
    tab_staff: 'Staff Management',
    tab_stores: 'All Stores Management',

    // Settings Sub-tabs
    subtab_branding: '🎨 Store Info & Logo',
    subtab_theme: '🌈 Brand Colors & Theme',
    subtab_contact: '📞 Contact & Address',
    subtab_announcement: '📢 Announcement Bar',
    subtab_payment: '💳 KHQR / ABA Accounts',
    subtab_delivery: '🚚 Delivery & Currency Rate',
    subtab_data: '🧹 Clean Data & Export',

    // Settings Content
    store_settings_header: 'Store Settings & Brand Identity',
    store_settings_desc: 'Customize Logo, Store Name, System Language, Contact Info, KHQR account and website storefront easily',
    system_language_title: '🌐 System Language',
    system_language_desc: 'Choose dashboard language for Admin interface (Khmer or English)',
    lang_km_label: 'ភាសាខ្មែរ (Khmer)',
    lang_km_sub: 'Full Khmer language for Admin Dashboard',
    lang_en_label: 'English (English)',
    lang_en_sub: 'Full English language for Admin Dashboard',
    brand_identity_title: '1. Brand Identity & Store Logo',
    brand_identity_desc: 'Store logo will appear on the top header, website footer, and printed invoices/receipts',
    logo_has_custom: 'Custom logo image has been configured',
    logo_empty: 'No logo yet (using fallback letter avatar)',
    logo_hint: 'Recommended size: 400x120px or 512x512px (PNG, SVG, JPG, WebP transparent background preferred)',
    logo_invoice_checkbox: '🧾 Show Logo on printed invoices and receipts',
    upload_logo_btn: 'Upload New Logo',
    remove_logo_btn: 'Remove Logo',
    store_name_label: 'Store Name',
    store_slogan_label: 'Store Slogan / Subtitle',
    store_desc_label: 'About Store / Description',

    // Common Actions & Badges
    btn_search: 'Search',
    btn_filter: 'Filter',
    btn_edit: 'Edit',
    btn_delete: 'Delete',
    btn_save: 'Save',
    btn_cancel: 'Cancel',
    btn_confirm: 'Confirm',
    btn_print: 'Print',
    btn_export: 'Export',
    btn_in_stock: 'In Stock',
    btn_low_stock: 'Low Stock',
    btn_out_of_stock: 'Out of Stock',
    action_quick_switch: 'Quick Language Switch'
  }
};

export const getTranslation = (key, lang = 'km') => {
  const currentLang = lang === 'en' ? 'en' : 'km';
  const dict = DICTIONARY[currentLang] || DICTIONARY.km;
  if (dict[key] !== undefined) return dict[key];
  if (DICTIONARY.km[key] !== undefined) return DICTIONARY.km[key];
  return key;
};
