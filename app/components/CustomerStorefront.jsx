'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabase';
import { renderCategorySvg } from '../../lib/categoryIcons';
import { getActiveStore, isItemBelongsToStore, fetchStoreBySlug, DEFAULT_FLAGSHIP_STORE } from '../../lib/stores';
import { getInvoiceUrl, openInvoiceInBrowser } from '../../lib/openInvoice';
import LocationPickerModal from './LocationPickerModal';
import { compressImage, compressImageToDataUrl, compressMediaFile } from '../../lib/imageOptimizer';

// ⭐️ Helper: បំប្លែងទិន្នន័យរូបភាពច្រើនសន្លឹក បញ្ចុះតម្លៃ & វីដេអូ YouTube ធានាមិនបាត់ ១០០%
const parseProductMeta = (p) => {
  if (!p) return p;
  let images = Array.isArray(p.images) && p.images.length > 0 ? p.images : [];
  if (typeof p.images === 'string' && p.images.startsWith('[')) {
    try {
      const parsed = JSON.parse(p.images);
      if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
    } catch (e) {}
  }
  let detail_images = Array.isArray(p.detail_images) && p.detail_images.length > 0 ? p.detail_images : [];
  if (typeof p.detail_images === 'string' && p.detail_images.startsWith('[')) {
    try {
      const parsed = JSON.parse(p.detail_images);
      if (Array.isArray(parsed) && parsed.length > 0) detail_images = parsed;
    } catch (e) {}
  }
  let retail_discount = p.retail_discount != null ? parseFloat(p.retail_discount) : 0;
  let wholesale_discount = p.wholesale_discount != null ? parseFloat(p.wholesale_discount) : 0;
  let video_url = p.video_url || '';

  if (p.category_name) {
    try {
      if (typeof p.category_name === 'string' && p.category_name.startsWith('{')) {
        const meta = JSON.parse(p.category_name);
        if (Array.isArray(meta.images) && meta.images.length > 0 && images.length === 0) {
          images = meta.images;
        }
        if (Array.isArray(meta.detail_images) && meta.detail_images.length > 0 && detail_images.length === 0) {
          detail_images = meta.detail_images;
        }
        if (meta.retail_discount != null && !retail_discount) retail_discount = parseFloat(meta.retail_discount);
        if (meta.wholesale_discount != null && !wholesale_discount) wholesale_discount = parseFloat(meta.wholesale_discount);
        if (meta.video_url && !video_url) video_url = meta.video_url;
      } else if (typeof p.category_name === 'string' && p.category_name.startsWith('[') && images.length === 0) {
        const parsed = JSON.parse(p.category_name);
        if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
      }
    } catch (e) {}
  }
  if (images.length === 0 && p.image_url) {
    images = [p.image_url];
  }
  return {
    ...p,
    images,
    detail_images,
    retail_discount: retail_discount || 0,
    wholesale_discount: wholesale_discount || 0,
    video_url: video_url || ''
  };
};

// ⭐️ Helper: ទាញយក YouTube Embed URL ចេញពី Link គ្រប់ទម្រង់ (Watch, Shorts, youtu.be, embed)
const getYouTubeEmbedUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}?rel=0&modestbranding=1`;
  }
  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed;
  }
  return null;
};

// (compressMediaFile, compressImage, compressImageToDataUrl are imported from lib/imageOptimizer)

// ⭐️ វចនានុក្រម ២ ភាសា (ខ្មែរ & English Dictionary) ⭐️
const DICTIONARY = {
  km: {
    announcement: '🔥 ដឹកជញ្ជូនឥតគិតថ្លៃ ២៥ ខេត្ត/ក្រុង • ធានាប្តូរ Size ក្នុងរយៈពេល ៧ ថ្ងៃ • ទំនិញម៉ាកសុទ្ធ ១០០%',
    hotSale: 'HOT SALE',
    hours: 'ម៉ោងធ្វើការ',
    searchPlaceholder: 'ស្វែងរកទំនិញ ម៉ាកយីហោ...',
    trackOrder: 'តាមដានការកុម្ម៉ង់',
    cart: 'កន្ត្រកទំនិញ',
    categories: 'ប្រភេទផលិតផល',
    allProducts: 'ទំនិញទាំងអស់',
    price: 'តម្លៃ',
    retail: 'រាយ',
    wholesale: 'ដុំ',
    wholesalePriceTitle: 'តម្លៃបោះដុំ (Wholesale Price):',
    wholesaleSubtitle: 'សម្រាប់អតិថិជនទិញបោះដុំ ឬលក់បន្ត',
    stock: 'ស្តុក',
    inStock: 'មានក្នុងស្តុក',
    lowStock: 'ជិតអស់',
    outOfStock: 'ដាច់ស្តុក',
    newBadge: 'New',
    sizes: 'ទំហំ',
    colors: 'ពណ៌',
    quantity: 'ចំនួនកុម្ម៉ង់',
    totalPrice: 'ទឹកប្រាក់សរុប',
    addToCart: 'បញ្ចូលក្នុងកន្ត្រក',
    buyNow: 'ទិញឥឡូវនេះ',
    viewDetails: 'មើលលម្អិត & រូបថត',
    sortBy: 'តម្រៀបតាម',
    sortNewest: 'ទើបមកដល់ថ្មីៗ',
    sortPriceLow: 'តម្លៃ៖ ទាប ➔ ខ្ពស់',
    sortPriceHigh: 'តម្លៃ៖ ខ្ពស់ ➔ ទាប',
    sortPopular: 'ទំនិញពេញនិយម',
    inStockOnly: 'បង្ហាញតែទំនិញមានស្តុក',
    fastDelivery: 'ដឹកជញ្ជូនរហ័សទូទាំងប្រទេស',
    fastDeliveryDesc: 'ផ្ញើជូនរហ័សទាន់ចិត្ត ២៥ ខេត្ត-ក្រុង',
    exchangePolicy: 'ធានាប្តូរ Size ក្នុង ៧ ថ្ងៃ',
    exchangePolicyDesc: 'មិនត្រូវទំហំអាចប្តូរបានដោយឥតគិតថ្លៃ',
    genuineWarranty: 'គុណភាពពិត ១០០%',
    genuineWarrantyDesc: 'ធានាគុណភាពទំនិញសុទ្ធពិតប្រាកដ',
    support247: 'សេវាកម្ម ២៤/៧ រួសរាយ',
    support247Desc: 'ប្រឹក្សាយោបល់ និងឆ្លើយតបរហ័ស',
    soldCount: 'លក់បាន',
    feedback: 'Feedback',
    customerFeedback: 'មតិយោបល់អតិថិជន',
    verifiedBuyer: 'បានទិញពិតប្រាកដ',
    verifiedOnlyRule: '1 Order = 1 Feedback',
    writeFeedback: 'សរសេរ Feedback',
    overallRating: 'ពិន្ទុសរុប',
    allReviews: 'មតិយោបល់ទាំងអស់',
    writeNewReview: 'សរសេរ Feedback ថ្មី',
    stepVerify: 'ជំហានទី ១៖ ផ្ទៀងផ្ទាត់ការបញ្ជាទិញ (Order ID / Phone)',
    enterOrderIdPlaceholder: 'វាយ Order ID (ឧ. ONL-874752) ឬលេខទូរស័ព្ទ...',
    verifyBtn: 'ផ្ទៀងផ្ទាត់',
    ratingLabel: 'ផ្តល់ពិន្ទុផ្កាយ',
    reviewerNameLabel: 'ឈ្មោះអ្នកសរសេរ',
    quickImpressionLabel: 'ចំណាប់អារម្មណ៍រហ័ស',
    commentLabel: 'មតិយោបល់លម្អិតរបស់អ្នក',
    commentPlaceholder: 'សូមចែករំលែកបទពិសោធន៍របស់អ្នកអំពីគុណភាពទំនិញ ទំហំ ពណ៌ និងសេវាកម្ម...',
    submitFeedbackBtn: 'បញ្ជូន Feedback',
    myCart: 'កន្ត្រកទំនិញរបស់ខ្ញុំ',
    emptyCart: 'កន្ត្រករបស់អ្នកទទេរ',
    emptyCartDesc: 'មិនទាន់មានទំនិញក្នុងកន្ត្រកនៅឡើយទេ',
    proceedCheckout: 'បន្តទៅកាន់ការទូទាត់ប្រាក់',
    checkoutTitle: 'ទូទាត់ប្រាក់ & ទីតាំងដឹកជញ្ជូន',
    customerName: 'ឈ្មោះអ្នកទទួល',
    customerPhone: 'លេខទូរស័ព្ទ',
    customerProvince: 'រាជធានី / ខេត្ត',
    customerAddress: 'អាសយដ្ឋានដឹកជញ្ជូនលម្អិត',
    paymentMethod: 'វិធីសាស្ត្រទូទាត់ប្រាក់',
    cod: 'ទូទាត់ពេលទំនិញទៅដល់ (COD)',
    khqr: 'ស្កេនទូទាត់តាម ABA / Bakong KHQR',
    uploadSlip: 'បញ្ចូលរូបភាពវិក្កយបត្រ (Payment Slip)',
    submitOrder: 'បញ្ជាក់ការកុម្ម៉ង់ទិញ',
    processing: 'កំពុងដំណើរការ...',
    trackOrderTitle: 'តាមដានស្ថានភាពការកុម្ម៉ង់',
    trackOrderDesc: 'វាយបញ្ចូលលេខកូដ Order ID ឬលេខទូរស័ព្ទដើម្បីពិនិត្យស្ថានភាពដឹកជញ្ជូន',
    orderPlaced: 'ទទួលបានការកុម្ម៉ង់',
    orderPreparing: 'កំពុងរៀបចំទំនិញ',
    orderShipping: 'កំពុងដឹកជញ្ជូន',
    orderDelivered: 'ដឹកជញ្ជូនជោគជ័យ',
    home: 'ទំព័រដើម',
    search: 'ស្វែងរក',
    lightMode: 'ថ្ងៃ',
    darkMode: 'យប់',
    langKhmer: 'ខ្មែរ',
    langEnglish: 'English'
  },
  en: {
    announcement: '🔥 Free Delivery Nationwide • 7-Day Size Exchange Guarantee • 100% Genuine Products',
    hotSale: 'HOT SALE',
    hours: 'Business Hours',
    searchPlaceholder: 'Search products, brands, styles...',
    trackOrder: 'Track Order',
    cart: 'Cart',
    categories: 'Categories',
    allProducts: 'All Products',
    price: 'Price',
    retail: 'Retail',
    wholesale: 'Wholesale',
    wholesalePriceTitle: 'Wholesale Price:',
    wholesaleSubtitle: 'For wholesale buyers and resellers',
    stock: 'Stock',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    newBadge: 'New',
    sizes: 'Sizes',
    colors: 'Colors',
    quantity: 'Quantity',
    totalPrice: 'Total Price',
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    viewDetails: 'View Details & Photos',
    sortBy: 'Sort by',
    sortNewest: 'New Arrivals',
    sortPriceLow: 'Price: Low to High',
    sortPriceHigh: 'Price: High to Low',
    sortPopular: 'Most Popular',
    inStockOnly: 'In Stock Only',
    fastDelivery: 'Fast Nationwide Delivery',
    fastDeliveryDesc: 'Quick delivery across 25 provinces',
    exchangePolicy: '7-Day Size Exchange',
    exchangePolicyDesc: 'Free exchange if the size does not fit',
    genuineWarranty: '100% Genuine Quality',
    genuineWarrantyDesc: 'Guaranteed authentic brand quality',
    support247: '24/7 Friendly Support',
    support247Desc: 'Fast response and expert assistance',
    soldCount: 'Sold',
    feedback: 'Feedback',
    customerFeedback: 'Customer Reviews',
    verifiedBuyer: 'Verified Buyer',
    verifiedOnlyRule: '1 Order = 1 Review',
    writeFeedback: 'Write Review',
    overallRating: 'Overall Rating',
    allReviews: 'All Reviews',
    writeNewReview: 'Write New Review',
    stepVerify: 'Step 1: Verify Order (Order ID / Phone)',
    enterOrderIdPlaceholder: 'Enter Order ID (e.g. ONL-874752) or Phone...',
    verifyBtn: 'Verify Order',
    ratingLabel: 'Star Rating',
    reviewerNameLabel: 'Your Name',
    quickImpressionLabel: 'Quick Impressions',
    commentLabel: 'Your Detailed Review',
    commentPlaceholder: 'Share your experience about product quality, sizing, color, and delivery...',
    submitFeedbackBtn: 'Submit Feedback',
    myCart: 'My Shopping Cart',
    emptyCart: 'Your Cart is Empty',
    emptyCartDesc: 'No items in your cart yet',
    proceedCheckout: 'Proceed to Checkout',
    checkoutTitle: 'Checkout & Delivery Information',
    customerName: 'Full Name',
    customerPhone: 'Phone Number',
    customerProvince: 'City / Province',
    customerAddress: 'Detailed Delivery Address',
    paymentMethod: 'Payment Method',
    cod: 'Cash on Delivery (COD)',
    khqr: 'Scan to Pay with ABA / Bakong KHQR',
    uploadSlip: 'Upload Payment Receipt Slip',
    submitOrder: 'Confirm Order Now',
    processing: 'Processing Order...',
    trackOrderTitle: 'Track Your Order Status',
    trackOrderDesc: 'Enter your Order ID or phone number to check delivery progress',
    orderPlaced: 'Order Placed',
    orderPreparing: 'Preparing Items',
    orderShipping: 'Out for Delivery',
    orderDelivered: 'Delivered',
    home: 'Home',
    search: 'Search',
    lightMode: 'Light',
    darkMode: 'Dark',
    langKhmer: 'Khmer',
    langEnglish: 'English'
  }
};

// ⭐️ Default Store Settings & Branding ⭐️
const DEFAULT_STORE_SETTINGS = {
  storeName: 'SABAY LUK',
  storeSlogan: 'Premium Store',
  storeDescription: 'ហាងលក់ស្បែកជើង និងម៉ូដទាន់សម័យគុណភាពខ្ពស់ ផ្ដល់ទំនុកចិត្ត និងភាពស៊ីវិល័យសម្រាប់អ្នក។',
  logoUrl: '',
  phone: '096 720 5522',
  phone2: '012 345 678',
  telegram: 'sabay_luk',
  facebook: 'https://facebook.com',
  tiktok: 'https://tiktok.com',
  address: 'ភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា',
  businessHours: '8:00 AM - 9:00 PM',
  announcementText: '🔥 ដឹកជញ្ជូនឥតគិតថ្លៃ ២៥ ខេត្ត/ក្រុង • ធានាប្តូរ Size ក្នុងរយៈពេល ៧ ថ្ងៃ • ទំនិញម៉ាកសុទ្ធ ១០០%',
  showAnnouncement: true,
  bankAccountName: 'SENG SOVEASNA',
  bankAccountNumber: '010 723 080',
  bankAccountKhr: '004 500 394',
  bankAccountUsd: '010 723 080',
  khqrImageUrl: '/khqr-aba.jpg',
  deliveryPhnomPenh: '1.50',
  deliveryProvince: '2.00',
  policyNote: 'ទំនិញដែលទិញរួចមិនអាចប្តូរជាប្រាក់វិញបានទេ (អាចប្តូរ Size បានក្នុងរង្វង់ ៧ ថ្ងៃ)',
  exchangeRate: 4100,
  themeColor: '#ff6a00',
  themePreset: 'orange',
  enableTax: true,
  taxRate: 10,
  taxMode: 'exclusive',
  vatTin: '',
  taxLabel: 'អាករលើតម្លៃបន្ថែម (VAT 10%)'
};

export default function CustomerStorefront({ storeSlug: propStoreSlug } = {}) {
  // ⭐️ Store States & Multi-Tenant Isolation ⭐️
  const [storeSettings, setStoreSettings] = useState(() => ({
    ...DEFAULT_STORE_SETTINGS,
    telegram: 'sabay_luk'
  }));
  const [currentStore, setCurrentStore] = useState(() => {
    if (propStoreSlug && propStoreSlug !== 'sabay-luk') {
      const clean = decodeURIComponent(propStoreSlug).trim();
      return {
        ...DEFAULT_FLAGSHIP_STORE,
        id: `store_${clean.toLowerCase()}`,
        slug: clean.toLowerCase(),
        name: clean
      };
    }
    return DEFAULT_FLAGSHIP_STORE;
  });

  // ⭐️ ភាសា (Bilingual: 'km' | 'en') & ពន្លឺថ្ងៃ/យប់ (Theme: 'light' | 'dark')
  const [language, setLanguage] = useState('km');
  const [themeMode, setThemeMode] = useState('light');
  const [isMounted, setIsMounted] = useState(false);
  const [isDemoStore, setIsDemoStore] = useState(false);

  // Load store settings, language & theme from localStorage after mount to prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sabay_store_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          let tg = (parsed.telegram || 'sabay_luk').replace(/^@/, '').trim();
          if (tg.toLowerCase() === 'sabayluk') tg = 'sabay_luk';
          setStoreSettings(prev => ({ ...prev, ...parsed, telegram: tg }));
        }
      } catch (_) {}

      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true') {
          setIsDemoStore(true);
        }
        const savedLang = localStorage.getItem('sabay_luk_lang');
        if (savedLang) setLanguage(savedLang);
        const savedTheme = localStorage.getItem('sabay_luk_theme_mode');
        if (savedTheme) setThemeMode(savedTheme);
      } catch (e) {}
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', themeMode === 'dark');
      document.documentElement.lang = language;
    }
  }, [themeMode, language]);

  const toggleLanguage = (targetLang) => {
    const next = targetLang || (language === 'km' ? 'en' : 'km');
    setLanguage(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_luk_lang', next);
      window.dispatchEvent(new Event('storage'));
    }
  };

  const toggleThemeMode = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_luk_theme_mode', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Helper Translation Function
  const t = (key, fallback = '') => {
    return DICTIONARY[language]?.[key] ?? DICTIONARY['km']?.[key] ?? fallback ?? key;
  };

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [coverData, setCoverData] = useState({
    badge: 'NEW COLLECTION 2026',
    title: 'ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់សម្រាប់អ្នក',
    desc: 'ស្វែងរកទំនិញម៉ាកយីហោលំដាប់ប្រណិត ធានាទាំងតម្លៃ និងគុណភាពពិតប្រាកដ។',
    btnText: 'បញ្ជាទិញឥឡូវនេះ',
    image: ''
  });
  const [isPaused, setIsPaused] = useState(false);

  // States សម្រាប់ Filter & Sort (កម្រិតខ្ពស់)
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price_low' | 'price_high' | 'popular'
  const [inStockOnly, setInStockOnly] = useState(false);

  // States សម្រាប់ Auto-Slide Hero Banner (5 Slides)
  const [slides, setSlides] = useState([
    { badge: 'NEW COLLECTION 2026', title: 'ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់សម្រាប់អ្នក', desc: 'ស្វែងរកទំនិញម៉ាកយីហោលំដាប់ប្រណិត ធានាទាំងតម្លៃ និងគុណភាពពិតប្រាកដ។', btnText: 'បញ្ជាទិញឥឡូវនេះ', image: '' }
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // ⭐️ States សម្រាប់ Modal ជ្រើសរើស Size & Color នៅមុខហាង (Variant Modal)
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const hasAutoOpenedProductRef = useRef(false);

  const handleCloseVariantModal = () => {
    setVariantModalOpen(false);
    setSelectedProductForVariant(null);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('product')) {
          url.searchParams.delete('product');
          const cleanQuery = url.searchParams.toString();
          const cleanUrl = url.pathname + (cleanQuery ? '?' + cleanQuery : '') + url.hash;
          window.history.replaceState({}, '', cleanUrl);
        }
      } catch (e) {}
    }
  };
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [currentProductVariants, setCurrentProductVariants] = useState([]);
  const [modalSelectedSize, setModalSelectedSize] = useState('');
  const [modalSelectedColor, setModalSelectedColor] = useState('');
  const [modalQty, setModalQty] = useState(1);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [editingVideoForProdId, setEditingVideoForProdId] = useState(null);
  const [videoInputUrl, setVideoInputUrl] = useState('');

  // ⭐️ ផ្ទាំងទំនិញដែលអតិថិជនបានទិញថ្ងៃនេះ & ម្សិលមិញ (Live Social Proof Feed) ⭐️
  const [recentPurchases, setRecentPurchases] = useState([]);

  const fetchRecentPurchases = async (targetStoreId) => {
    try {
      const sId = targetStoreId || currentStore?.id || 'store_default_sabayluk';
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

      let { data: orderList } = await supabase
        .from('orders')
        .select('*')
        .or(`store_id.eq.${sId},store_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(25);

      let extractedItems = [];
      if (orderList && orderList.length > 0) {
        orderList.forEach(order => {
          let orderItems = [];
          if (Array.isArray(order.items)) {
            orderItems = order.items;
          } else if (typeof order.items === 'string') {
            try { orderItems = JSON.parse(order.items); } catch (e) {}
          }
          
          const orderTime = new Date(order.created_at || Date.now()).getTime();
          const isToday = orderTime >= startOfToday;
          const isYesterday = orderTime >= startOfYesterday && !isToday;

          // Format address / province
          let loc = 'រាជធានីភ្នំពេញ';
          const addr = String(order.address || order.delivery_address || '');
          if (addr.includes('សៀមរាប')) loc = 'សៀមរាប';
          else if (addr.includes('បាត់ដំបង')) loc = 'បាត់ដំបង';
          else if (addr.includes('កណ្តាល')) loc = 'កណ្តាល';
          else if (addr.includes('ព្រះសីហនុ') || addr.includes('កំពង់សោម')) loc = 'ព្រះសីហនុ';
          else if (addr.includes('កំពង់ចាម')) loc = 'កំពង់ចាម';
          else if (addr.includes('កំពង់ស្ពឺ')) loc = 'កំពង់ស្ពឺ';
          else if (addr.includes('តាកែវ')) loc = 'តាកែវ';
          else if (addr.includes('ភ្នំពេញ')) loc = 'ភ្នំពេញ';

          const buyer = order.customer_name 
            ? (order.customer_name.trim().split(' ')[0] + '***')
            : 'អតិថិជន';

          orderItems.forEach((it, idx) => {
            if (it && (it.name || it.product_name)) {
              extractedItems.push({
                id: `purch_${order.order_id || order.id}_${idx}`,
                product_id: it.id,
                product_name: it.name || it.product_name,
                price: parseFloat(it.price) || 0,
                image_url: it.image_url || it.image || '',
                size: it.size || '',
                color: it.color || '',
                quantity: it.quantity || 1,
                customer: buyer,
                location: loc,
                timeTag: isToday ? 'ថ្ងៃនេះ' : (isYesterday ? 'ម្សិលមិញ' : 'ថ្មីៗនេះ'),
                isToday: isToday,
                isYesterday: isYesterday
              });
            }
          });
        });
      }

      // Prioritize today's orders
      let finalPurchases = extractedItems.filter(i => i.isToday);

      // បើថ្ងៃនេះមិនទាន់មានលក់ដាច់គ្រប់គ្រាន់ យកទិន្នន័យម្សិលមិញមកប្រើ
      if (finalPurchases.length < 5) {
        const yesterdayItems = extractedItems.filter(i => i.isYesterday);
        finalPurchases = [...finalPurchases, ...yesterdayItems];
      }

      if (finalPurchases.length < 5) {
        finalPurchases = [...finalPurchases, ...extractedItems.slice(0, 10)];
      }

      // If still fewer than 5 (new store or fresh database), generate dynamic active purchases from the store's own catalog
      const storeProds = products.length > 0 ? products : [];
      if (finalPurchases.length < 6 && storeProds.length > 0) {
        const sampleLocations = ['រាជធានីភ្នំពេញ', 'ខេត្តកណ្តាល', 'ខេត្តសៀមរាប', 'ខេត្តបាត់ដំបង', 'ខេត្តកំពង់ចាម', 'ខេត្តព្រះសីហនុ', 'ខេត្តកំពង់ស្ពឺ', 'ខេត្តតាកែវ'];
        const sampleBuyers = ['សុខ***', 'ចាន់***', 'រតនា***', 'ធារី***', 'ដារ៉ា***', 'ពិសិដ្ឋ***', 'លីណា***', 'សិលា***'];
        const sampleMins = [4, 11, 18, 27, 42, 58, 85, 120];

        const generated = storeProds.slice(0, 8).map((prod, idx) => {
          const parsedMeta = parseProductMeta(prod);
          const pImg = (parsedMeta.images && parsedMeta.images[0]) || prod.image_url || '/placeholder.png';
          const mins = sampleMins[idx % sampleMins.length];
          const isTodayItem = mins < 70;
          return {
            id: `gen_purch_${prod.id}_${idx}`,
            product_id: prod.id,
            product_name: prod.name,
            price: parseFloat(prod.price) || 0,
            image_url: pImg,
            size: prod.size && prod.size !== 'N/A' ? prod.size.split(',')[0].trim() : '',
            color: prod.color ? prod.color.split(',')[0].trim() : '',
            quantity: 1,
            customer: sampleBuyers[idx % sampleBuyers.length],
            location: sampleLocations[idx % sampleLocations.length],
            timeTag: isTodayItem ? 'ថ្ងៃនេះ' : 'ម្សិលមិញ',
            timeText: isTodayItem ? `មុននេះ ${mins} នាទី` : 'ម្សិលមិញ'
          };
        });
        finalPurchases = [...finalPurchases, ...generated];
      }

      setRecentPurchases(finalPurchases);
    } catch (e) {
      console.error('Error fetching recent purchases:', e);
    }
  };

  // ⭐️ ស្ថិតិចំនួនដែលបានលក់ចេញតាមទំនិញ (Sold Count per Product) ⭐️
  const [productSalesMap, setProductSalesMap] = useState({});

  const fetchProductSalesMap = async (targetStoreId) => {
    try {
      const sId = targetStoreId || currentStore?.id || 'store_default_sabayluk';
      const map = {};

      // ១. គណនាពី stock_movements (ប្រភេទ SALE)
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('product_id, qty_change')
        .eq('type', 'SALE');

      if (movements && movements.length > 0) {
        movements.forEach(m => {
          if (m.product_id) {
            const pid = String(m.product_id);
            map[pid] = (map[pid] || 0) + Math.abs(Number(m.qty_change) || 1);
          }
        });
      }

      // ២. គណនាបន្ថែមពី orders
      const { data: orderList } = await supabase
        .from('orders')
        .select('items')
        .or(`store_id.eq.${sId},store_id.is.null`);

      if (orderList && orderList.length > 0) {
        orderList.forEach(ord => {
          let items = [];
          if (Array.isArray(ord.items)) items = ord.items;
          else if (typeof ord.items === 'string') {
            try { items = JSON.parse(ord.items); } catch (e) {}
          }
          items.forEach(it => {
            const qty = Number(it.qty) || 1;
            if (it.id) {
              const pid = String(it.id);
              map[pid] = Math.max(map[pid] || 0, (map[pid] || 0) + qty);
            }
            if (it.name) {
              const nameKey = it.name.trim().toLowerCase();
              map[nameKey] = (map[nameKey] || 0) + qty;
            }
          });
        });
      }

      setProductSalesMap(map);
    } catch (e) {
      console.warn('Error fetching product sales map:', e);
    }
  };

  const getProductSoldCount = (prod) => {
    if (!prod) return 0;
    const byId = prod.id && productSalesMap[String(prod.id)];
    const byName = prod.name && productSalesMap[prod.name.trim().toLowerCase()];
    return Math.max(Number(byId) || 0, Number(byName) || 0);
  };

  // ⭐️ States សម្រាប់ Checkout (កុម្ម៉ង់ទិញទំនិញស្ដង់ដារ)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerTelegram, setCustomerTelegram] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [showMapPickerModal, setShowMapPickerModal] = useState(false);
  const [customerProvince, setCustomerProvince] = useState('ភ្នំពេញ');
  const [customerAddress, setCustomerAddress] = useState('');
  const [confirmedLocationDetails, setConfirmedLocationDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'ABA KHQR'
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // 🤖 Telegram Mini App (TMA): Auto-fill customer details from Telegram Account
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyTgUser = (tgUser) => {
      if (!tgUser) return;
      if (tgUser.fullName) {
        setCustomerName(prev => prev || tgUser.fullName);
      }
      if (tgUser.username) {
        setCustomerTelegram(prev => prev || `@${tgUser.username}`);
      }
    };

    try {
      const raw = localStorage.getItem('sabay_tg_user');
      if (raw) {
        applyTgUser(JSON.parse(raw));
      }
    } catch (_) {}

    const handleTgReady = (e) => {
      if (e.detail) applyTgUser(e.detail);
    };

    window.addEventListener('sabay_tg_user_ready', handleTgReady);
    return () => window.removeEventListener('sabay_tg_user_ready', handleTgReady);
  }, []);

  // ⭐️ States សម្រាប់ Order Success Modal (ជោគជ័យ)
  const [orderSuccessModalOpen, setOrderSuccessModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // ⭐️ States សម្រាប់ Multi-Image Gallery ក្នុង Modal
  const [modalActiveImage, setModalActiveImage] = useState('');
  const [modalAllImages, setModalAllImages] = useState([]);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState('');

  // ⭐️ មុខងារទាញយករូបភាព ១ សន្លឹក (គាំទ្រទាំង Mobile iOS/Android និង Desktop) ⭐️
  const downloadSingleImage = async (imgUrl, filename) => {
    if (!imgUrl) return;
    const cleanFilename = (filename || 'product-image.jpg').replace(/[/\\?%*:|"<>]/g, '_');
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
      setDownloadSuccessMsg('⏳ កំពុងដំណើរការទាញយក...');
      const response = await fetch(imgUrl, { mode: 'cors' });
      const blob = await response.blob();
      const mimeType = blob.type || (cleanFilename.endsWith('.png') ? 'image/png' : 'image/jpeg');
      const file = new File([blob], cleanFilename, { type: mimeType });

      // 📱 1. សម្រាប់ Mobile (iOS Safari / Android): ប្រើ Web Share API រក្សាទុកផ្ទាល់ចូលក្នុង Photos / Camera Roll
      if (isMobile && typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: cleanFilename
          });
          setDownloadSuccessMsg('✅ បានបើកផ្ទាំងរូបភាព! សូមចុច «Save Image (រក្សាទុករូបថត)»');
          setTimeout(() => setDownloadSuccessMsg(''), 4500);
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            setDownloadSuccessMsg('');
            return;
          }
          console.warn('Navigator share dismissed or failed, falling back to download:', shareErr);
        }
      }

      // 💻 2. សម្រាប់ Desktop ឬ Mobile Browser ផ្សេងទៀត: ប្រើ Blob Anchor Click
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanFilename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        } catch (_) {}
      }, 1500);

      setDownloadSuccessMsg('✅ បានទាញយករូបភាពដោយជោគជ័យ!');
      setTimeout(() => setDownloadSuccessMsg(''), 3500);
    } catch (e) {
      console.warn('Direct blob download failed, opening direct image:', e);
      // 📱 3. Fallback: បើករូបភាពផ្ទាល់ក្នុង Tab ថ្មីដើម្បីឱ្យ user សង្កត់លើរូប Save Image បាន
      window.open(imgUrl, '_blank');
      setDownloadSuccessMsg('💡 លើទូរសព្ទ៖ សូមចុចសង្កត់លើរូបភាព រួចជ្រើសរើស «Save to Photos»');
      setTimeout(() => setDownloadSuccessMsg(''), 5000);
    }
  };

  // ⭐️ មុខងារទាញយករូបភាពទាំងអស់ក្នុងពេលតែមួយ (Download All Photos for Mobile & Desktop) ⭐️
  const downloadAllProductImages = async (imagesList, prodName) => {
    if (!imagesList || imagesList.length === 0) return;
    setIsDownloadingAll(true);
    setDownloadSuccessMsg(`⏳ កំពុងរៀបចំទាញយករូបភាពទាំង ${imagesList.length} សន្លឹក...`);

    const cleanName = (prodName || 'sabay_product')
      .replace(/[^a-zA-Z0-9_\-\u1780-\u17FF]/g, '_')
      .slice(0, 30);
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    try {
      // 1. Fetch all images as blobs & convert to File array
      const files = [];
      for (let i = 0; i < imagesList.length; i++) {
        const url = imagesList[i];
        try {
          const res = await fetch(url, { mode: 'cors' });
          const blob = await res.blob();
          const ext = url.split('.').pop()?.split(/[#?]/)[0] || 'jpg';
          const filename = `${cleanName}_pic_${i + 1}.${ext}`;
          files.push(new File([blob], filename, { type: blob.type || 'image/jpeg' }));
        } catch (fetchErr) {
          console.warn(`Failed to fetch image ${i + 1}:`, fetchErr);
        }
      }

      // 📱 2. លើ Mobile (iOS / Android): ប្រើ Web Share API បញ្ជូនរូបភាពទាំងអស់ទៅ Native Share Sheet (Save All Images)
      if (isMobile && typeof navigator.share === 'function' && navigator.canShare && files.length > 0 && navigator.canShare({ files })) {
        try {
          await navigator.share({
            files: files,
            title: `${prodName} - រូបភាពទាំងអស់`
          });
          setDownloadSuccessMsg(`🎉 បានបើកផ្ទាំងរូបភាពទាំង ${files.length} សន្លឹក! សូមចុច «Save Images»`);
          setTimeout(() => setDownloadSuccessMsg(''), 5000);
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            setDownloadSuccessMsg('');
            return;
          }
          console.warn('Multi-file share error, falling back:', shareErr);
        }
      }

      // 💻 3. សម្រាប់ Desktop ឬ Fallback: Download Sequential
      for (let i = 0; i < imagesList.length; i++) {
        const ext = imagesList[i].split('.').pop()?.split(/[#?]/)[0] || 'jpg';
        const filename = `${cleanName}_pic_${i + 1}.${ext}`;
        await downloadSingleImage(imagesList[i], filename);
        if (i < imagesList.length - 1) {
          await new Promise(res => setTimeout(res, 500));
        }
      }

      setDownloadSuccessMsg(`🎉 បានទាញយករូបភាពទាំងអស់ (${imagesList.length} សន្លឹក) ជោគជ័យ!`);
      setTimeout(() => setDownloadSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error downloading all images:', err);
      setDownloadSuccessMsg('❌ មានបញ្ហាបន្តិចបន្តួចពេលទាញយក សូមសាកល្បងម្តងទៀត');
      setTimeout(() => setDownloadSuccessMsg(''), 4000);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // ⭐️ States សម្រាប់ ABA KHQR & Slip Upload
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState(null);
  const [isCopiedAccount, setIsCopiedAccount] = useState(false);
  const [isCopiedAccountKhr, setIsCopiedAccountKhr] = useState(false);
  const [isCopiedAccountUsd, setIsCopiedAccountUsd] = useState(false);

  // ⭐️ States & Handlers សម្រាប់ទីតាំង Google Maps & រូបថតទីតាំងផ្ទះ/កន្លែងធ្វើការ
  const [googleMapUrl, setGoogleMapUrl] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationPhotoFile, setLocationPhotoFile] = useState(null);
  const [locationPhotoPreview, setLocationPhotoPreview] = useState(null);

  const handleGetCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('ឧបករណ៍ ឬកម្មវិធីរុករករបស់អ្នកមិនគាំទ្រប្រព័ន្ធ GPS Geolocation ទេ');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const url = `https://maps.google.com/?q=${lat},${lng}`;
        setGoogleMapUrl(url);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('មិនអាចចាប់យកទីតាំងបានទេ៖ សូមប្រាកដថាអ្នកបានចុច "Allow" អនុញ្ញាត Location Permission លើ Browser ឬបិទភ្ជាប់ (Paste) Link ពី Google Maps ដោយផ្ទាល់!');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLocationPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file, 'location');
      setLocationPhotoFile(compressed);
      setLocationPhotoPreview(URL.createObjectURL(compressed));
    }
  };

  // ⭐️ States សម្រាប់ Track Order (តាមដានការកុម្ម៉ង់)
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [isSocialMenuOpen, setIsSocialMenuOpen] = useState(false);
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResults, setTrackResults] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [hasSearchedTrack, setHasSearchedTrack] = useState(false);

  // ⭐️ States សម្រាប់ប្រព័ន្ធ Feedback & Customer Reviews (1 ការកុម្ម៉ង់ = 1 Feedback)
  const DEFAULT_SEED_FEEDBACKS = [
    {
      id: 'fb-seed-1',
      order_id: 'ONL-874752',
      product_id: '069c3069-6ba4-400b-a78a-4e61bc685fac',
      product_name: 'ស្បែកជ់ើងបុរស',
      customer_name: 'veasna',
      rating: 5,
      comment: 'ស្បែកជើងពាក់ស្រួលណាស់ បាតទន់ គុណភាពល្អឥតខ្ចោះ ស្អាតដូចក្នុងរូបថត ១០០%!',
      photo_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80',
      tags: ['✨ ស្អាតដូចក្នុងរូប', '👍 គុណភាពល្អឥតខ្ចោះ', '🚚 ដឹកលឿនទាន់ចិត្ត'],
      created_at: '2026-11-10T14:20:00Z',
      is_verified: true
    },
    {
      id: 'fb-seed-2',
      order_id: 'ORD-847371',
      product_id: 'bbd3541b-dde6-441b-a02c-80ab5c21b546',
      product_name: 'ស្បែកជើងនារី',
      customer_name: 'សុខ ធីតា',
      rating: 5,
      comment: 'ទំនិញល្អណាស់ ទំហំពាក់ត្រូវល្មម អ្នកលក់រួសរាយ វេចខ្ចប់បានស្អាត និងដឹកជញ្ជូនរហ័ស។',
      photo_url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=700&auto=format&fit=crop&q=80',
      tags: ['👌 ទំហំពាក់ត្រូវល្អ', '💯 ណែនាំឱ្យទិញ', '✨ ស្អាតដូចក្នុងរូប'],
      created_at: '2026-11-11T09:15:00Z',
      is_verified: true
    }
  ];

  const [feedbacks, setFeedbacks] = useState(DEFAULT_SEED_FEEDBACKS);

  // Load feedbacks from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sabay_luk_product_feedbacks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setFeedbacks(parsed);
        }
      } catch (e) {}
    }
  }, []);

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackProduct, setFeedbackProduct] = useState(null);
  const [feedbackActiveTab, setFeedbackActiveTab] = useState('list'); // 'list' | 'write'
  const [verifyOrderQuery, setVerifyOrderQuery] = useState('');
  const [isVerifyingOrder, setIsVerifyingOrder] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');
  const [verifiedOrder, setVerifiedOrder] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackReviewerName, setFeedbackReviewerName] = useState('');
  const [feedbackSelectedTags, setFeedbackSelectedTags] = useState([]);
  const [feedbackSubmitSuccess, setFeedbackSubmitSuccess] = useState('');
  const [feedbackPhoto, setFeedbackPhoto] = useState(null);
  const [feedbackPhotoName, setFeedbackPhotoName] = useState('');
  const [feedbackPhotoLoading, setFeedbackPhotoLoading] = useState(false);
  const [reviewZoomPhoto, setReviewZoomPhoto] = useState(null);

  // Helper compress & select customer review photo
  const handleFeedbackPhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('សូមជ្រើសរើសឯកសារជារូបភាព!');
      return;
    }
    setFeedbackPhotoLoading(true);
    setFeedbackPhotoName(file.name);
    try {
      const dataUrl = await compressImageToDataUrl(file, 'product');
      setFeedbackPhoto(dataUrl);
    } catch (_) {
      const reader = new FileReader();
      reader.onload = (event) => setFeedbackPhoto(event.target.result);
      reader.readAsDataURL(file);
    } finally {
      setFeedbackPhotoLoading(false);
    }
  };

  // Helper retrieve all active coupons (Default + Admin Custom)
  const getDisplayCoupons = () => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('sabay_coupons') : null;
      const custom = saved ? JSON.parse(saved) : [];
      const activeCustom = Array.isArray(custom) ? custom.filter(c => c.active !== false) : [];
      const map = new Map();
      activeCustom.forEach(c => map.set(c.code.toUpperCase(), c));
      AVAILABLE_COUPONS.forEach(c => {
        if (!map.has(c.code.toUpperCase())) map.set(c.code.toUpperCase(), c);
      });
      return Array.from(map.values());
    } catch (e) {
      return AVAILABLE_COUPONS;
    }
  };

  // ⭐️ 1. States សម្រាប់ប្រព័ន្ធ Promo Code & Coupon ⭐️
  const AVAILABLE_COUPONS = [
    { code: 'SABAY10', type: 'percent', value: 10, minOrder: 0, label: 'បញ្ចុះតម្លៃ ១០% លើកន្ត្រក' },
    { code: 'KHMERNEWYEAR', type: 'percent', value: 15, minOrder: 20, label: 'អបអរចូលឆ្នាំថ្មី ចុះ ១៥%' },
    { code: 'WELCOME2', type: 'fixed', value: 2, minOrder: 15, label: 'កាដូស្វាគមន៍ ចុះ $2.00' },
    { code: 'VIP5', type: 'fixed', value: 5, minOrder: 35, label: 'VIP Member ចុះ $5.00' },
    { code: 'FREESHIP', type: 'shipping', value: 2, minOrder: 0, label: 'ដឹកជញ្ជូនឥតគិតថ្លៃ ១០០%' }
  ];
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);

  // ⭐️ 2. States សម្រាប់ Social Share (Telegram / Facebook) ⭐️
  const [shareToast, setShareToast] = useState('');

  // ⭐️ Helper: ទាញយក Store ID បច្ចុប្បន្នសម្រាប់បែងចែក Recently Viewed ដាច់ដោយឡែកពីគ្នា ១០០%
  const getActiveStoreId = () => {
    if (typeof propStoreSlug === 'string' && propStoreSlug) {
      const clean = decodeURIComponent(propStoreSlug).toLowerCase().trim();
      return `store_${clean}`;
    }
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const sParam = params.get('store');
        if (sParam) return `store_${sParam.toLowerCase().trim()}`;
        const saved = localStorage.getItem('sabay_active_store');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) return parsed.id;
        }
      } catch (e) {}
    }
    return 'store_default_sabayluk';
  };

  // ⭐️ 3. States សម្រាប់ Recently Viewed Products (ទំនិញដែលបានមើលថ្មីៗ តាមហាងនីមួយៗ) ⭐️
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load recently viewed for this specific store (ធានាមិនឆ្លងហាងគ្នាដាច់ខាត)
  useEffect(() => {
    try {
      const storeId = currentStore?.id || getActiveStoreId();
      const storageKey = `sabay_recently_viewed_${storeId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const scoped = parsed.filter(p => isItemBelongsToStore(p, storeId));
          setRecentlyViewed(scoped);
          return;
        }
      }
      setRecentlyViewed([]);
    } catch (e) {
      setRecentlyViewed([]);
    }
  }, [currentStore?.id]);

  // មុខងារកត់ត្រាទំនិញដែលបានចុចមើល (Record Recently Viewed per Store)
  const recordRecentlyViewedProduct = (product) => {
    if (!product || !product.id) return;
    try {
      const storeId = currentStore?.id || getActiveStoreId();
      // ផ្ទៀងផ្ទាត់មិនកត់ត្រាទំនិញដែលមិនមែនជារបស់ហាងនេះ
      if (!isItemBelongsToStore(product, storeId)) return;

      const storageKey = `sabay_recently_viewed_${storeId}`;
      const stored = localStorage.getItem(storageKey);
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter(p => String(p.id) !== String(product.id) && isItemBelongsToStore(p, storeId));
      list.unshift({
        id: product.id,
        store_id: product.store_id || storeId,
        name: product.name,
        price: product.price,
        retail_discount: product.retail_discount,
        image_url: product.image_url || product.image || product.photo_url || '',
        image: product.image_url || product.image || product.photo_url || '',
        stock_qty: product.stock_qty,
        category: product.category,
        sku: product.sku
      });
      list = list.slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(list));
      setRecentlyViewed(list);
    } catch (e) {}
  };

  const clearRecentlyViewed = () => {
    try {
      const storeId = currentStore?.id || getActiveStoreId();
      localStorage.removeItem(`sabay_recently_viewed_${storeId}`);
      if (storeId === 'store_default_sabayluk') {
        localStorage.removeItem('sabay_recently_viewed');
      }
      setRecentlyViewed([]);
    } catch (e) {}
  };

  // មុខងារ Share ទំនិញទៅ Telegram, Facebook ឬចម្លង Link (ភ្ជាប់ជាមួយរូបភាពពិត & OpenGraph Rich Preview)
  const handleShareProduct = async (e, product, platform = 'native') => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!product) return;

    // ប្រើ Domain សំខាន់ sabayluk.com ដើម្បីឱ្យ Telegram Bot & Facebook Crawlers អាចទាញយករូបភាពបានជានិច្ច
    const origin = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
      ? window.location.origin
      : 'https://sabayluk.com';

    const storeSlug = currentStore?.slug || 'sabay-luk';
    const directProductUrl = `${origin}${storeSlug !== 'sabay-luk' ? `/store/${storeSlug}` : ''}?product=${product.id}`;
    // Dynamic OpenGraph Link ដែលផ្ទុករូបភាពទំនិញ og:image សម្រាប់ Telegram, Facebook, WhatsApp...
    const richShareUrl = `${origin}/api/share?id=${product.id}&store=${storeSlug}`;

    const hasDiscount = Boolean(product.retail_discount && parseFloat(product.retail_discount) > 0);
    const finalPrice = hasDiscount 
      ? (parseFloat(product.price) - parseFloat(product.retail_discount)).toFixed(2)
      : parseFloat(product.price || 0).toFixed(2);
    const priceText = hasDiscount
      ? `$${finalPrice} (ចុះពី $${parseFloat(product.price).toFixed(2)})`
      : `$${finalPrice}`;

    const shareTitle = `✨ ${product.name} - SABAY LUK`;
    const shareText = `🔥 មើលទំនិញនេះ៖ ${product.name}\n💰 តម្លៃត្រឹមតែ៖ ${priceText}\n📦 ដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត/ក្រុង!\n🔗 មើលលម្អិត & កុម្ម៉ង់ទិញ៖ ${directProductUrl}`;
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (platform === 'telegram') {
      // ✈️ សម្រាប់ Telegram: បញ្ជូន richShareUrl ដើម្បីឱ្យ Telegram បង្ហាញផ្ទាំងរូបភាពធំ (Photo Preview Card) ភ្លាមៗ
      const tgSummary = `🔥 ${product.name}\n💰 តម្លៃ៖ ${priceText}\n📦 ដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត/ក្រុង!`;
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(richShareUrl)}&text=${encodeURIComponent(tgSummary)}`;
      window.open(tgUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'facebook') {
      // 📘 សម្រាប់ Facebook: បញ្ជូន richShareUrl ដើម្បីទាញ og:image មកបង្ហាញពេញលេញ
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(richShareUrl)}&quote=${encodeURIComponent(shareText)}`;
      window.open(fbUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'copy') {
      // 📋 ចម្លង Link និងព័ត៌មានទំនិញ
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${directProductUrl}`);
        setShareToast('✅ បានចម្លង Link និងព័ត៌មានទំនិញជោគជ័យ!');
        setTimeout(() => setShareToast(''), 3000);
      }
    } else if (platform === 'image_file' || (platform === 'native' && isMobile)) {
      // 📱 មុខងារ Native File Share ភ្ជាប់រូបភាពពិត (Image Attachment) សម្រាប់ទូរស័ព្ទដៃ
      if (navigator.canShare && product.image_url) {
        try {
          const res = await fetch(product.image_url, { mode: 'cors' });
          const blob = await res.blob();
          const ext = product.image_url.split('.').pop()?.split(/[#?]/)[0] || 'jpg';
          const file = new File([blob], `${(product.name || 'product').replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_')}.${ext}`, { type: blob.type || 'image/jpeg' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: shareTitle,
              text: shareText
            });
            return;
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Native image share fallback:', shareErr);
        }
      }

      // Fallback ប្រសិនបើ Browser មិន Support File Share
      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: shareText,
          url: richShareUrl
        }).catch(() => {});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${directProductUrl}`);
        setShareToast('✅ បានចម្លង Link និងព័ត៌មានទំនិញជោគជ័យ!');
        setTimeout(() => setShareToast(''), 3000);
      }
    }
  };

  // មុខងារដាក់ ឬកែប្រែ Video YouTube សម្រាប់ផលិតផល (Instant Save & Real-Time Sync)
  const handleUpdateProductVideo = async (productId, newVideoUrl) => {
    try {
      const prod = products.find(p => p.id === productId);
      if (!prod) return;
      const cleanUrl = (newVideoUrl || '').trim();
      let meta = {};
      if (prod.category_name) {
        try {
          if (typeof prod.category_name === 'string' && prod.category_name.startsWith('{')) {
            meta = JSON.parse(prod.category_name);
          }
        } catch (e) {}
      }
      meta.video_url = cleanUrl;
      const updatedMetaJson = JSON.stringify(meta);
      const updatedProd = {
        ...prod,
        video_url: cleanUrl,
        category_name: updatedMetaJson
      };

      setProducts(prev => prev.map(p => p.id === productId ? updatedProd : p));
      if (selectedProductForVariant?.id === productId) {
        setSelectedProductForVariant(updatedProd);
      }

      await supabase.from('products').update({
        category_name: updatedMetaJson
      }).eq('id', productId);
    } catch (err) {
      console.error('Error updating product video:', err);
    }
  };

  // មុខងារពិនិត្យ និងប្រើ Coupon Code
  const handleApplyCoupon = (codeToApply) => {
    const code = (codeToApply || couponInput || '').trim().toUpperCase();
    if (!code) {
      setCouponMsg({ type: 'error', text: 'សូមបញ្ចូលកូដប្រូម៉ូសិន!' });
      return;
    }

    const currentSubtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

    const customCoupons = (() => {
      try {
        const saved = localStorage.getItem('sabay_coupons');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
    })();

    const allCoupons = [...AVAILABLE_COUPONS, ...customCoupons];
    const matched = allCoupons.find(c => c.code.toUpperCase() === code);

    if (!matched) {
      setCouponMsg({ type: 'error', text: `❌ កូដ "${code}" មិនត្រឹមត្រូវ ឬផុតកំណត់ហើយ!` });
      return;
    }

    if (matched.minOrder && currentSubtotal < matched.minOrder) {
      setCouponMsg({ 
        type: 'error', 
        text: `⚠️ កូដនេះប្រើបានសម្រាប់តែការបញ្ជាទិញចាប់ពី $${matched.minOrder.toFixed(2)} ឡើងទៅប៉ុណ្ណោះ!` 
      });
      return;
    }

    setAppliedCoupon(matched);
    setCouponInput('');
    setCouponMsg({ 
      type: 'success', 
      text: `🎉 បានប្រើកូដ [${matched.code}] ជោគជ័យ! (${matched.label})` 
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMsg(null);
  };

  // Storage listener for feedbacks
  useEffect(() => {
    const handleStorageFb = (e) => {
      if (!e || !e.key || e.key === 'sabay_luk_product_feedbacks') {
        try {
          const saved = localStorage.getItem('sabay_luk_product_feedbacks');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setFeedbacks(parsed);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageFb);
    return () => window.removeEventListener('storage', handleStorageFb);
  }, []);

  // Helper គណនាស្ថិតិ Feedback លើទំនិញនីមួយៗ
  const getProductFeedbackStats = (productId, productName) => {
    const list = feedbacks.filter(fb => {
      if (productId && fb.product_id && String(fb.product_id) === String(productId)) return true;
      if (productName && fb.product_name && fb.product_name.trim().toLowerCase() === productName.trim().toLowerCase()) return true;
      return false;
    });
    if (list.length === 0) {
      return { list: [], count: 0, avg: '5.0', hasReviews: false };
    }
    const sum = list.reduce((acc, cur) => acc + (Number(cur.rating) || 5), 0);
    const avg = (sum / list.length).toFixed(1);
    return { list, count: list.length, avg, hasReviews: true };
  };

  // មុខងារបើក Feedback Modal
  const openFeedbackModal = (product, openToWrite = false, prefillOrderId = '') => {
    setFeedbackProduct(product);
    setFeedbackModalOpen(true);
    setVerifyError('');
    setVerifySuccess('');
    setFeedbackSubmitSuccess('');
    setVerifiedOrder(null);
    setFeedbackComment('');
    setFeedbackSelectedTags([]);
    setFeedbackRating(5);
    setFeedbackPhoto(null);
    setFeedbackPhotoName('');
    setFeedbackPhotoLoading(false);

    if (prefillOrderId) {
      setVerifyOrderQuery(prefillOrderId);
    }
    if (openToWrite) {
      setFeedbackActiveTab('write');
      if (prefillOrderId) {
        setTimeout(() => {
          triggerAutoVerify(prefillOrderId, product);
        }, 150);
      }
    } else {
      setFeedbackActiveTab('list');
    }
  };

  // Helper Auto Verify if order ID is prefilled
  const triggerAutoVerify = async (orderId, targetProduct) => {
    if (!orderId || !targetProduct) return;
    setIsVerifyingOrder(true);
    setVerifyError('');
    setVerifySuccess('');
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId.trim())
        .limit(1);

      if (data && data.length > 0) {
        const ord = data[0];
        const items = Array.isArray(ord.items) ? ord.items : [];
        const hasItem = items.some(it => 
          (it.id && String(it.id) === String(targetProduct.id)) ||
          (it.name && it.name.trim().toLowerCase() === (targetProduct.name || '').trim().toLowerCase())
        );

        if (!hasItem) {
          setVerifyError(`❌ ការបញ្ជាទិញ #${ord.order_id} មិនមានទំនិញ «${targetProduct.name}» ទេ។ លោកអ្នកអាចសរសេរ Feedback បានតែលើទំនិញដែលបានកុម្ម៉ង់ទិញប៉ុណ្ណោះ!`);
          return;
        }

        const existing = feedbacks.find(fb => 
          fb.order_id === ord.order_id && 
          (String(fb.product_id) === String(targetProduct.id) || (fb.product_name && fb.product_name.trim().toLowerCase() === (targetProduct.name || '').trim().toLowerCase()))
        );

        if (existing) {
          setVerifyError(`⚠️ ការបញ្ជាទិញ #${ord.order_id} នេះបានសរសេរ Feedback លើទំនិញនេះរួចហើយ! (លក្ខខណ្ឌកំណត់៖ ១ ការបញ្ជាទិញ = ១ Feedback)`);
          return;
        }

        setVerifiedOrder(ord);
        setFeedbackReviewerName(ord.customer_name || '');
        setVerifySuccess(`✅ ផ្ទៀងផ្ទាត់ជោគជ័យ! អតិថិជន ${ord.customer_name || 'អតិថិជន'} (Order #${ord.order_id}) បានបញ្ជាទិញទំនិញនេះពិតប្រាកដ 🎉`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifyingOrder(false);
    }
  };

  // មុខងារផ្ទៀងផ្ទាត់ការបញ្ជាទិញ (Verify Order for Feedback)
  const handleVerifyOrderForFeedback = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const q = verifyOrderQuery.trim();
    if (!q) {
      setVerifyError('សូមបញ្ចូលលេខកូដកុម្ម៉ង់ (Order ID) ឬលេខទូរស័ព្ទ!');
      return;
    }

    setIsVerifyingOrder(true);
    setVerifyError('');
    setVerifySuccess('');
    setVerifiedOrder(null);

    try {
      // 1. Search in Supabase orders
      let ordersList = [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`order_id.ilike.%${q}%,phone.ilike.%${q}%,phone_number.ilike.%${q}%`)
        .order('id', { ascending: false });

      if (data && data.length > 0) {
        ordersList = data;
      }

      if (ordersList.length === 0) {
        setVerifyError(`❌ រកមិនឃើញការបញ្ជាទិញជាមួយ "${q}" នេះទេ! សូមពិនិត្យមើល Order ID ឬលេខទូរស័ព្ទរបស់អ្នកឡើងវិញ។`);
        setIsVerifyingOrder(false);
        return;
      }

      // 2. Check if any order contains this specific product
      const targetProdId = String(feedbackProduct?.id || '');
      const targetProdName = (feedbackProduct?.name || '').trim().toLowerCase();

      let eligibleOrder = null;
      for (const ord of ordersList) {
        const items = Array.isArray(ord.items) ? ord.items : [];
        const hasItem = items.some(it => {
          if (it.id && String(it.id) === targetProdId) return true;
          if (it.name && it.name.trim().toLowerCase() === targetProdName) return true;
          return false;
        });
        if (hasItem) {
          eligibleOrder = ord;
          break;
        }
      }

      if (!eligibleOrder) {
        setVerifyError(`❌ ការបញ្ជាទិញរបស់អ្នក (${ordersList[0].order_id}) មិនមានទំនិញ «${feedbackProduct?.name}» នេះទេ។ លោកអ្នកអាចសរសេរ Feedback បានតែលើទំនិញដែលបានកុម្ម៉ង់ទិញប៉ុណ្ណោះ!`);
        setIsVerifyingOrder(false);
        return;
      }

      // 3. Check if this order has ALREADY submitted feedback for this product (1 order = 1 feedback)
      const existing = feedbacks.find(fb => 
        fb.order_id === eligibleOrder.order_id && 
        (String(fb.product_id) === targetProdId || (fb.product_name && fb.product_name.trim().toLowerCase() === targetProdName))
      );

      if (existing) {
        setVerifyError(`⚠️ ការបញ្ជាទិញ #${eligibleOrder.order_id} នេះបានសរសេរ Feedback លើទំនិញនេះរួចហើយ! (លក្ខខណ្ឌកំណត់៖ ១ ការបញ្ជាទិញ = ១ Feedback)`);
        setIsVerifyingOrder(false);
        return;
      }

      // 4. Verification SUCCESS!
      setVerifiedOrder(eligibleOrder);
      setFeedbackReviewerName(eligibleOrder.customer_name || '');
      setVerifySuccess(`✅ ផ្ទៀងផ្ទាត់ជោគជ័យ! អតិថិជន ${eligibleOrder.customer_name || 'អតិថិជន'} (Order #${eligibleOrder.order_id}) បានបញ្ជាទិញទំនិញនេះពិតប្រាកដ 🎉`);
    } catch (err) {
      setVerifyError('មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់: ' + err.message);
    } finally {
      setIsVerifyingOrder(false);
    }
  };

  // មុខងារបញ្ជូន Feedback
  const handleSubmitFeedback = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!verifiedOrder) {
      setVerifyError('សូមផ្ទៀងផ្ទាត់ការបញ្ជាទិញរបស់អ្នកជាមុនសិន!');
      return;
    }
    if (!feedbackComment.trim()) {
      alert('សូមសរសេរមតិយោបល់របស់អ្នក!');
      return;
    }

    const newFeedback = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      order_id: verifiedOrder.order_id,
      product_id: feedbackProduct.id,
      product_name: feedbackProduct.name,
      customer_name: feedbackReviewerName.trim() || verifiedOrder.customer_name || 'អតិថិជន',
      rating: feedbackRating || 5,
      comment: feedbackComment.trim(),
      tags: feedbackSelectedTags,
      photo_url: feedbackPhoto || null,
      created_at: new Date().toISOString(),
      is_verified: true
    };

    const updated = [newFeedback, ...feedbacks];
    setFeedbacks(updated);
    localStorage.setItem('sabay_luk_product_feedbacks', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }

    setFeedbackSubmitSuccess('🎉 អរគុណច្រើន! មតិយោបល់របស់អ្នកត្រូវបានបញ្ជូន និងបង្ហាញជាសាធារណៈដោយជោគជ័យ!');
    setFeedbackComment('');
    setFeedbackSelectedTags([]);
    setFeedbackPhoto(null);
    setFeedbackPhotoName('');
    setVerifiedOrder(null);
    setVerifyOrderQuery('');
    setVerifySuccess('');
    setTimeout(() => {
      setFeedbackSubmitSuccess('');
      setFeedbackActiveTab('list');
    }, 2000);
  };

  // ⭐️ ធ្វើបច្ចុប្បន្នភាពពណ៌ Brand Theme លើ Storefront ស្វ័យប្រវត្តិ ⭐️
  const brandColor = storeSettings.themeColor || '#ff6a00';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-primary', brandColor);
    }
  }, [brandColor]);

  // Scoped product & category fetchers
  const fetchProductsForStore = async (storeId) => {
    const targetStoreId = storeId || currentStore?.id || 'store_default_sabayluk';
    try {
      const { data: prodData } = await supabase.from('products').select('*').order('id', { ascending: false });
      if (prodData) {
        const scoped = prodData.filter(p => isItemBelongsToStore(p, targetStoreId));
        setProducts(scoped.map(parseProductMeta));
      } else {
        setProducts([]);
      }
    } catch (e) {
      setProducts([]);
    }
  };

  const fetchCategoriesForStore = async (storeId) => {
    const targetStoreId = storeId || currentStore?.id || 'store_default_sabayluk';
    try {
      const { data: catData, error: catError } = await supabase.from('categories').select('*');
      if (!catError && catData && catData.length > 0) {
        const scoped = catData.filter(c => isItemBelongsToStore(c, targetStoreId));
        if (scoped.length > 0) {
          setCategories(scoped);
        } else if (targetStoreId === 'store_default_sabayluk') {
          setCategories(catData);
        } else {
          setCategories([]);
        }
      } else {
        if (targetStoreId === 'store_default_sabayluk') {
          setCategories([
            { id: '1', name: 'ស្បែកជើង', icon: 'shoe' },
            { id: '2', name: 'នាឡិកា', icon: 'watch' },
            { id: '3', name: 'កាបូប', icon: 'bag' },
            { id: '4', name: 'ខ្សែក្រវ៉ាត់', icon: 'belt' },
          ]);
        } else {
          setCategories([]);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (products.length > 0) {
      fetchRecentPurchases(currentStore?.id);
      fetchProductSalesMap(currentStore?.id);
    }
  }, [products]);

  const fetchProducts = async () => {
    await fetchProductsForStore(currentStore?.id);
  };

  // ⭐️ ដំណើរការ Store Detection (propStoreSlug ឬ ?store=slug ឬ Active Store ពី Dashboard) ⭐️
  useEffect(() => {
    const initStoreAndSettings = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const storeSlug = propStoreSlug || params.get('store');
      let target = null;
      if (storeSlug) {
        target = await fetchStoreBySlug(storeSlug);
      }
      // ⭐️ FIX: URL គឺជា Source of Truth ១០០% ធានារាល់ពេល Refresh មិនច្រឡំឆ្លងហាងគ្នា
      // បើគ្មាន storeSlug (ដូចជាលើទំព័រដើម http://localhost:3000) គឺរក្សាជា DEFAULT_FLAGSHIP_STORE (SABAY LUK) ជានិច្ច
      const active = target || DEFAULT_FLAGSHIP_STORE;
      setCurrentStore(active);

      // Load settings specific to this store
      let scopedSettings = active.settings || {};
      const savedKey = `sabay_store_settings_${active.id}`;
      const savedStoreSpecific = localStorage.getItem(savedKey) || (active.id === 'store_default_sabayluk' ? localStorage.getItem('sabay_store_settings') : null);
      if (savedStoreSpecific) {
        try {
          scopedSettings = { ...scopedSettings, ...JSON.parse(savedStoreSpecific) };
        } catch (e) {}
      }

      setStoreSettings(prev => ({
        ...prev,
        ...scopedSettings,
        storeName: scopedSettings.storeName || active.name || prev.storeName,
        phone: scopedSettings.phone || active.phone || prev.phone,
        phone2: scopedSettings.phone2 || prev.phone2,
        telegram: (() => {
          let tg = (scopedSettings.telegram || active.telegram || prev.telegram || (active.id === 'store_default_sabayluk' ? 'sabay_luk' : '')).replace(/^@/, '').trim();
          if (tg.toLowerCase() === 'sabayluk') tg = 'sabay_luk';
          return tg;
        })(),
        facebook: scopedSettings.facebook || active.facebook || prev.facebook,
        tiktok: scopedSettings.tiktok || active.tiktok || prev.tiktok,
        address: scopedSettings.address || active.address || prev.address,
        themeColor: scopedSettings.themeColor || active.settings?.themeColor || prev.themeColor,
        logoUrl: scopedSettings.logoUrl || active.settings?.logoUrl || prev.logoUrl,
        bankAccountName: scopedSettings.bankAccountName || (active.id === 'store_default_sabayluk' ? 'SENG SOVEASNA' : (active.owner_name || active.name)),
        bankAccountKhr: scopedSettings.bankAccountKhr || (active.id === 'store_default_sabayluk' ? '004 500 394' : '004 500 394'),
        bankAccountUsd: scopedSettings.bankAccountUsd || (active.id === 'store_default_sabayluk' ? '010 723 080' : (active.phone || '010 723 080')),
        khqrImageUrl: scopedSettings.khqrImageUrl || '/khqr-aba.jpg'
      }));

      // Fetch products and categories strictly for this store
      await fetchProductsForStore(active.id);
      await fetchCategoriesForStore(active.id);
      await fetchRecentPurchases(active.id);
    };

    initStoreAndSettings();
    window.addEventListener('storage', initStoreAndSettings);
    window.addEventListener('sabay_store_changed', initStoreAndSettings);
    return () => {
      window.removeEventListener('storage', initStoreAndSettings);
      window.removeEventListener('sabay_store_changed', initStoreAndSettings);
    };
  }, []);

  useEffect(() => {
    const savedCover = localStorage.getItem('sabay_luk_cover');
    if (savedCover) {
      setCoverData(JSON.parse(savedCover));
    }
  }, []);

  // ⭐️ ទាញយក Slides ពី Database ផ្ទាល់ (Table: sliders) និង Sync LocalStorage ⭐️
  useEffect(() => {
    const loadStorefrontSlides = async () => {
      let localData = null;
      try {
        const cached = localStorage.getItem('sabay_luk_covers_data');
        if (cached) localData = JSON.parse(cached);
      } catch (e) {}

      const { data, error } = await supabase.from('sliders').select('*').order('id', { ascending: true });
      if (data && data.length > 0) {
        const loadedSlides = data.map((slide, i) => {
          const localItem = Array.isArray(localData) ? (localData.find(l => l.id === slide.id) || localData[i]) : null;
          return {
            id: slide.id,
            badge: slide.badge || localItem?.badge || '',
            title: slide.title || localItem?.title || '',
            desc: slide.description || localItem?.desc || '',
            btnText: slide.btn_text || localItem?.btnText || '',
            image: slide.image_url || localItem?.image || '',
            isActive: localItem?.isActive !== undefined ? localItem.isActive : Boolean(slide.image_url || slide.title),
            align: localItem?.align || 'left',
            overlay: localItem?.overlay || 'medium',
            btnAction: localItem?.btnAction || 'products',
            btnLink: localItem?.btnLink || '',
          };
        });
        setSlides(loadedSlides);
      } else if (localData && Array.isArray(localData) && localData.length > 0) {
        setSlides(localData);
      }
    };

    loadStorefrontSlides();

    // Listen for storage events across tabs (e.g. from Admin Dashboard)
    const handleStorageChange = (e) => {
      if (!e || !e.key || e.key === 'sabay_luk_covers_data' || e.key === 'sabay_luk_cover') {
        try {
          const cached = localStorage.getItem('sabay_luk_covers_data');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) setSlides(parsed);
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter visible slides: only show slides that are active and have content
  const activeSlidesList = slides.filter(s => s.isActive !== false && (s.image || s.title || s.badge));
  const isCustomStore = currentStore?.id && currentStore.id !== 'store_default_sabayluk';

  // ⭐️ ជញ្ជាំង / Cover Wall ប្រណិតស្វ័យប្រវត្តសម្រាប់ហាងថ្មីៗ (Custom Store Luxury Wall Slides) ⭐️
  const defaultCustomSlides = [
    {
      id: 9001,
      badge: '✨ ហាងផ្លូវការ • OFFICIAL STORE',
      title: `ស្វាគមន៍មកកាន់ហាង ${currentStore?.name || 'Mario'}`,
      desc: `ទំនិញគុណភាពខ្ពស់ ផ្ដល់ទំនុកចិត្ត និងសេវាកម្មរហ័សទាន់ចិត្តជូនអតិថិជន!`,
      btnText: '🛍️ ទស្សនាទំនិញទាំងអស់',
      image: currentStore?.settings?.coverImageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
      isActive: true,
      align: 'left',
      overlay: 'dark',
      btnAction: 'products'
    },
    {
      id: 9002,
      badge: '🔥 HOT PROMOTION 2026',
      title: `ការបញ្ចុះតម្លៃពិសេស & គុណភាពពិត ១០០%`,
      desc: `ជ្រើសរើសទំនិញពេញនិយមជាមួយនឹងតម្លៃសមរម្យបំផុត ធានាការពេញចិត្ត!`,
      btnText: '⚡ មើលប្រូម៉ូសិនពិសេស',
      image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80',
      isActive: true,
      align: 'center',
      overlay: 'medium',
      btnAction: 'products'
    },
    {
      id: 9003,
      badge: '🚚 ដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត/ក្រុង',
      title: `សេវាកម្មកុម្ម៉ង់ទិញរហ័សទាន់ចិត្ត`,
      desc: `ទូទាត់ប្រាក់ងាយស្រួលតាម KHQR (ABA) និងសេវាដឹកជញ្ជូនដល់គេហដ្ឋាន!`,
      btnText: '📞 ទំនាក់ទំនងហាងឥឡូវនេះ',
      image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1600&q=80',
      isActive: true,
      align: 'left',
      overlay: 'dark',
      btnAction: 'telegram'
    }
  ];

  // Check if this specific store has custom slides saved
  let customStoreSlides = null;
  if (isCustomStore && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`sabay_luk_covers_data_${currentStore.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          customStoreSlides = parsed.filter(s => s.isActive !== false);
        }
      }
    } catch (e) {}
  }

  const displaySlides = isCustomStore
    ? (customStoreSlides && customStoreSlides.length > 0 ? customStoreSlides : defaultCustomSlides)
    : (activeSlidesList.length > 0 ? activeSlidesList : slides.slice(0, 1));

  // Auto-slide countdown
  useEffect(() => {
    if (displaySlides.length > 1 && !isPaused) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % displaySlides.length);
      }, 4500);
      return () => clearInterval(timer);
    }
  }, [displaySlides.length, isPaused]);

  // CTA Click handler for hero banner
  const handleHeroBannerCta = (slide) => {
    if (!slide) return;
    if (slide.btnAction === 'telegram') {
      const tg = storeSettings?.telegram || '0967205522';
      const cleanTg = tg.startsWith('http') ? tg : `https://t.me/${tg.replace('@', '')}`;
      window.open(cleanTg, '_blank');
    } else if (slide.btnAction === 'phone') {
      window.location.href = `tel:${storeSettings?.phone || '0967205522'}`;
    } else if (slide.btnAction === 'custom' && slide.btnLink) {
      window.open(slide.btnLink, '_blank');
    } else {
      const el = document.getElementById('products-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const nextHeroSlide = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setCurrentSlide(prev => (prev + 1) % displaySlides.length);
  };

  const prevHeroSlide = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setCurrentSlide(prev => (prev === 0 ? displaySlides.length - 1 : prev - 1));
  };

  // ⭐️ មុខងារស្វែងរកតាមដានការកុម្ម៉ង់ (Smart Multi-Format Order & Phone Tracking)
  const handleSearchTrackOrder = async (queryToSearch) => {
    const raw = (typeof queryToSearch === 'string' ? queryToSearch : trackQuery).trim();
    if (!raw) {
      alert('សូមបញ្ចូលលេខទូរស័ព្ទ ឬលេខកូដ Order ID!');
      return;
    }

    setIsTracking(true);
    setHasSearchedTrack(true);

    try {
      // ស្វែងរកទាំងលេខសុទ្ធ គ្មានចន្លោះ ឬមានលេខកូដប្រទេស 855 / 0
      const cleanDigits = raw.replace(/[^0-9]/g, '');
      const cleanDigitsNoZero = cleanDigits.startsWith('0') ? cleanDigits.slice(1) : cleanDigits;
      const cleanDigitsWithZero = cleanDigits.startsWith('0') ? cleanDigits : ('0' + cleanDigits);

      let orClauses = [`order_id.ilike.%${raw}%`, `phone.ilike.%${raw}%`, `phone_number.ilike.%${raw}%`];
      if (cleanDigits.length >= 6) {
        orClauses.push(`phone.ilike.%${cleanDigits}%`, `phone_number.ilike.%${cleanDigits}%`);
        orClauses.push(`phone.ilike.%${cleanDigitsNoZero}%`, `phone_number.ilike.%${cleanDigitsNoZero}%`);
        orClauses.push(`phone.ilike.%${cleanDigitsWithZero}%`, `phone_number.ilike.%${cleanDigitsWithZero}%`);
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(orClauses.join(','))
        .order('id', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTrackResults(data || []);
    } catch (err) {
      console.error('Track order error:', err);
      alert('មានបញ្ហាក្នុងការស្វែងរក៖ ' + err.message);
    } finally {
      setIsTracking(false);
    }
  };

  // ⭐️ ៤ ដំណាក់កាលស្តង់ដារនៃការដឹកជញ្ជូន ⭐️
  const getStatusStep = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('cancel') || s.includes('បោះបង់')) return -1;
    if (s.includes('complete') || s.includes('deliver') || s.includes('ជោគជ័យ')) return 3;
    if (s.includes('ship') || s.includes('out') || s.includes('ដឹក')) return 2;
    if (s.includes('prep') || s.includes('process') || s.includes('pack') || s.includes('រៀបចំ') || s.includes('វេច')) return 1;
    return 0; // Pending (រង់ចាំការបញ្ជាក់)
  };

  const getStatusBadge = (status) => {
    const step = getStatusStep(status);
    if (step === -1) return { text: '❌ បានបោះបង់ (Cancelled)', bg: 'bg-red-50 text-red-600 border-red-200' };
    if (step === 3) return { text: '🟢 បានទទួលជោគជ័យ (Delivered)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100' };
    if (step === 2) return { text: '🚚 កំពុងដឹកជញ្ជូន (Out for Delivery)', bg: 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100 animate-pulse' };
    if (step === 1) return { text: '🔵 កំពុងរៀបចំវេចខ្ចប់ (Processing)', bg: 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-100' };
    return { text: '🟡 កំពុងរង់ចាំការបញ្ជាក់ (Pending)', bg: 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-100' };
  };

  // ⭐️ Realtime Order Status Tracking (Live updates when customer watches modal) ⭐️
  useEffect(() => {
    if (!trackModalOpen || trackResults.length === 0) return;
    const orderIds = trackResults.map(o => o.id);
    const channel = supabase
      .channel('live-customer-tracking')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
        if (payload.new && orderIds.includes(payload.new.id)) {
          setTrackResults(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackModalOpen, trackResults]);

  // Helper សម្រាប់ទាញយក Size List បង្ហាញលើ Product Card
  const getProductSizeList = (sizeStr) => {
    if (!sizeStr || sizeStr === 'N/A') return [];
    if (sizeStr.includes(':')) {
      return sizeStr.split(',').map(s => s.trim().split(':')[0]).filter(Boolean).slice(0, 5);
    }
    return sizeStr.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
  };

  // ⭐️ Auto-open product modal ONCE if ?product=ID is present in URL (1-Click Shared Link & Draft Preview) ⭐️
  useEffect(() => {
    if (typeof window === 'undefined' || hasAutoOpenedProductRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const sharedProdId = params.get('product');
    if (!sharedProdId) return;

    if (sharedProdId === 'preview' || sharedProdId === 'draft') {
      try {
        const rawDraft = localStorage.getItem('sabay_draft_preview_product');
        if (rawDraft) {
          const draftObj = JSON.parse(rawDraft);
          hasAutoOpenedProductRef.current = true;
          handleAddToCartClick(draftObj);
          return;
        }
      } catch(e) {}
    }
    if (products.length > 0) {
      const found = products.find(p => String(p.id) === String(sharedProdId));
      if (found) {
        hasAutoOpenedProductRef.current = true;
        handleAddToCartClick(found);
      }
    }
  }, [products]);

  // ⭐️ បើកផ្ទាំងលម្អិតទំនិញស្តង់ដារ (Open Standard Product Details & Gallery Modal)
  const handleAddToCartClick = async (product) => {
    setSelectedProductForVariant(product);
    recordRecentlyViewedProduct(product);
    const parsedProd = parseProductMeta(product);
    const allImgs = parsedProd.images && parsedProd.images.length > 0
      ? parsedProd.images 
      : (product.image_url ? [product.image_url] : []);
    setModalAllImages(allImgs);
    setModalActiveImage(allImgs[0] || product.image_url || '/placeholder.png');
    setModalQty(1);
    setModalSelectedColor(product.color || '');
    setLoadingVariants(true);
    setVariantModalOpen(true);

    try {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .order('size', { ascending: true });

      if (variants && variants.length > 0) {
        setCurrentProductVariants(variants);
        const firstInStock = variants.find(v => v.stock_qty > 0) || variants[0];
        setModalSelectedSize(firstInStock.size);
        if (firstInStock.color) setModalSelectedColor(firstInStock.color);
      } else {
        let parsedVariants = [];
        if (product.size && product.size !== 'N/A') {
          if (product.size.includes(':')) {
            parsedVariants = product.size.split(',').map((pair, idx) => {
              const [sz, qty] = pair.trim().split(':');
              return {
                id: `legacy_${idx}`,
                size: sz,
                color: product.color || '',
                stock_qty: parseInt(qty) || product.stock_qty,
                isLegacy: true
              };
            });
          } else {
            parsedVariants = product.size.split(',').map((sz, idx) => ({
              id: `legacy_${idx}`,
              size: sz.trim(),
              color: product.color || '',
              stock_qty: product.stock_qty,
              isLegacy: true
            }));
          }
        } else {
          parsedVariants = [{
            id: 'legacy_0',
            size: 'Free Size',
            color: product.color || '',
            stock_qty: product.stock_qty,
            isLegacy: true
          }];
        }
        setCurrentProductVariants(parsedVariants);
        const firstAvailable = parsedVariants.find(v => v.stock_qty > 0) || parsedVariants[0];
        setModalSelectedSize(firstAvailable ? firstAvailable.size : 'Free Size');
        if (firstAvailable && firstAvailable.color) setModalSelectedColor(firstAvailable.color);
      }
    } catch (err) {
      console.error('Error loading variants:', err);
    } finally {
      setLoadingVariants(false);
    }
  };

  // មុខងារទិញភ្លាមៗ (Buy Now)
  const handleBuyNowFromModal = () => {
    handleConfirmVariantToCart();
    setIsCartOpen(false);
    setCheckoutModalOpen(true);
  };

  const directAddToCart = (product) => {
    if (product.stock_qty <= 0) {
      alert('សូមអភ័យទោស ទំនិញនេះដាច់ស្តុកហើយ!');
      return;
    }
    const cartItemId = `${product.id}-default`;
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        if (existing.qty >= product.stock_qty) {
          alert('ចំនួនក្នុងកន្ត្រកដល់កម្រិតស្តុកអតិបរមាហើយ!');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, {
        cartItemId,
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url || product.image || product.photo_url || '',
        image: product.image_url || product.image || product.photo_url || '',
        size: 'ស្តង់ដារ',
        color: product.color || '',
        variantId: null,
        maxStock: product.stock_qty,
        qty: 1
      }];
    });
    try { window.sabayHaptic?.medium?.(); } catch (_) {}
    setIsCartOpen(true);
  };

  const handleConfirmVariantToCart = () => {
    if (!selectedProductForVariant) return;

    const selectedVariant = currentProductVariants.find(v => 
      v.size === modalSelectedSize && (modalSelectedColor ? v.color === modalSelectedColor : true)
    ) || currentProductVariants.find(v => v.size === modalSelectedSize) || currentProductVariants.find(v => v.color === modalSelectedColor);

    const availableStock = selectedVariant ? selectedVariant.stock_qty : selectedProductForVariant.stock_qty;

    if (availableStock <= 0) {
      alert(`ទំហំ [${modalSelectedSize}] នេះបានអស់ពីស្តុកហើយ! សូមជ្រើសរើសទំហំផ្សេង។`);
      return;
    }

    if (modalQty > availableStock) {
      alert(`ស្តុកទំហំ [${modalSelectedSize}] មានត្រឹមតែ ${availableStock} ប៉ុណ្ណោះ!`);
      return;
    }

    const isLegacy = selectedVariant ? selectedVariant.isLegacy : true;
    const variantId = isLegacy ? null : selectedVariant.id;
    const cartItemId = `${selectedProductForVariant.id}-${modalSelectedSize}-${modalSelectedColor || 'default'}`;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        const newQty = existing.qty + modalQty;
        if (newQty > availableStock) {
          alert(`ចំនួនទំនិញក្នុងកន្ត្រកលើសពីស្តុកដែលមាន (${availableStock})!`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.cartItemId === cartItemId ? { ...item, qty: newQty } : item
        );
      }

      return [
        ...prevCart,
        {
          cartItemId,
          id: selectedProductForVariant.id,
          name: selectedProductForVariant.name,
          price: selectedProductForVariant.price,
          image_url: selectedVariant?.image_url || selectedProductForVariant.image_url || selectedProductForVariant.image || selectedProductForVariant.photo_url || '',
          image: selectedVariant?.image_url || selectedProductForVariant.image_url || selectedProductForVariant.image || selectedProductForVariant.photo_url || '',
          size: modalSelectedSize,
          color: modalSelectedColor || selectedProductForVariant.color || '',
          variantId: variantId,
          maxStock: availableStock,
          qty: modalQty
        }
      ];
    });

    try { window.sabayHaptic?.medium?.(); } catch (_) {}
    setVariantModalOpen(false);
    setIsCartOpen(true);
  };

  const updateCartQty = (cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > item.maxStock) {
          alert(`ស្តុកមានត្រឹមតែ ${item.maxStock} ប៉ុណ្ណោះ!`);
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  // ត្រង និងតម្រៀបផលិតផល (Smart Filtering & Sorting)
  const filteredProducts = products.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const itemCat = (item.category || '').trim().toLowerCase();
    const selectedCat = selectedCategory.trim().toLowerCase();
    const matchesCategory = selectedCategory === 'all' || itemCat.includes(selectedCat) || selectedCat.includes(itemCat);
    const matchesStock = !inStockOnly || item.stock_qty > 0;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_low') return Number(a.price) - Number(b.price);
    if (sortBy === 'price_high') return Number(b.price) - Number(a.price);
    if (sortBy === 'popular') return (b.stock_qty < 5 ? 1 : 0) - (a.stock_qty < 5 ? 1 : 0);
    return (b.id || 0) > (a.id || 0) ? 1 : -1;
  });

  const subtotalPrice = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      couponDiscountAmount = subtotalPrice * (appliedCoupon.value / 100);
    } else if (appliedCoupon.type === 'fixed') {
      couponDiscountAmount = Math.min(subtotalPrice, appliedCoupon.value);
    }
  }

  // ⭐️ គណនាពន្ធ VAT (បើហាងបានបើកដំណើរការក្នុង Settings) ⭐️
  const isTaxEnabled = storeSettings.enableTax !== false;
  const taxRatePercent = Number(storeSettings.taxRate) || 10;
  const taxMode = storeSettings.taxMode || 'exclusive'; // 'exclusive' | 'inclusive'

  const netBeforeTax = Math.max(0, subtotalPrice - couponDiscountAmount);
  let taxAmount = 0;
  let totalPrice = netBeforeTax;

  if (isTaxEnabled && taxRatePercent > 0) {
    if (taxMode === 'exclusive') {
      taxAmount = Math.round((netBeforeTax * (taxRatePercent / 100)) * 100) / 100;
      totalPrice = netBeforeTax + taxAmount;
    } else {
      taxAmount = Math.round((netBeforeTax - (netBeforeTax / (1 + (taxRatePercent / 100)))) * 100) / 100;
      totalPrice = netBeforeTax;
    }
  }

  const totalRiel = Math.round(totalPrice * (storeSettings.exchangeRate || 4100));

  // ⭐️ បញ្ជាក់ការបញ្ជាទិញ (Submit Online Checkout to Supabase) ⭐️
  const handleProcessOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('កន្ត្រកទំនិញរបស់អ្នកទទេរ!');
    if (!customerName.trim()) return alert('សូមបញ្ចូលឈ្មោះរបស់អ្នក!');
    if (!customerPhone.trim() || customerPhone.trim().length < 8) return alert('សូមបញ្ចូលលេខទូរសព្ទទំនាក់ទំនងឱ្យបានត្រឹមត្រូវ!');
    if (!customerAddress.trim()) return alert('សូមបញ្ចូលអាសយដ្ឋានដឹកជញ្ជូនលម្អិត!');

    setCheckoutLoading(true);

    try {
      const generatedOrderId = `ONL-${Date.now().toString().slice(-6)}`;

      // ១. កាត់ស្តុកចេញពី product_variants និង products
      const affectedLowStockItems = [];
      for (const item of cart) {
        if (item.variantId) {
          const { data: vData } = await supabase
            .from('product_variants')
            .select('stock_qty')
            .eq('id', item.variantId)
            .single();

          const prevVQty = vData ? vData.stock_qty : item.maxStock;
          const newVQty = Math.max(0, prevVQty - item.qty);

          await supabase
            .from('product_variants')
            .update({ stock_qty: newVQty })
            .eq('id', item.variantId);
        }

        const { data: pData } = await supabase
          .from('products')
          .select('stock_qty, low_stock_alert, name, sku, category, price')
          .eq('id', item.id)
          .single();

        const prevPQty = pData ? pData.stock_qty : 0;
        const newPQty = Math.max(0, prevPQty - item.qty);

        await supabase
          .from('products')
          .update({ 
            stock_qty: newPQty,
            status: newPQty > 0 ? 'In Stock' : 'Out of Stock'
          })
          .eq('id', item.id);

        // ត្រួតពិនិត្យស្តុកទាប
        const alertThreshold = pData?.low_stock_alert || 5;
        if (newPQty <= alertThreshold) {
          affectedLowStockItems.push({
            name: item.name,
            sku: item.sku,
            category: item.category,
            stock_qty: newPQty,
            low_stock_alert: alertThreshold,
            price: item.price
          });
        }

        await supabase.from('stock_movements').insert([{
          product_id: item.id,
          variant_id: item.variantId,
          type: 'SALE',
          qty_change: -item.qty,
          previous_qty: prevPQty,
          new_qty: newPQty,
          reason: `កុម្ម៉ង់អនឡាញមុខហាង វិក្កយបត្រ ${generatedOrderId} (Size: ${item.size || 'ទូទៅ'})`
        }]);
      }

      // ២. Upload Payment Slip បើភ្ញៀវជ្រើសរើស ABA KHQR
      let uploadedSlipUrl = '';
      if (paymentMethod === 'ABA KHQR' && slipFile) {
        try {
          const slipExt = slipFile.name.split('.').pop() || 'jpg';
          const slipFileName = `slip_${generatedOrderId}_${Date.now()}.${slipExt}`;
          const { error: slipErr } = await supabase.storage.from('products').upload(slipFileName, slipFile);
          if (!slipErr) {
            const { data: slipData } = supabase.storage.from('products').getPublicUrl(slipFileName);
            uploadedSlipUrl = slipData.publicUrl;
          } else {
            console.warn('Storage upload error, falling back to compressed base64 slip:', slipErr);
            uploadedSlipUrl = await compressImageToDataUrl(slipFile, 'slip');
          }
        } catch (sErr) {
          console.error('Slip upload error:', sErr);
          uploadedSlipUrl = await compressImageToDataUrl(slipFile, 'slip');
        }
      }

      // ២.១ Upload រូបថតទីតាំងផ្ទះ ឬកន្លែងធ្វើការ (House / Workplace Location Photo)
      let uploadedLocationPhotoUrl = '';
      if (locationPhotoFile) {
        try {
          const locExt = locationPhotoFile.name.split('.').pop() || 'jpg';
          const locFileName = `loc_${generatedOrderId}_${Date.now()}.${locExt}`;
          const { error: locErr } = await supabase.storage.from('products').upload(locFileName, locationPhotoFile);
          if (!locErr) {
            const { data: locData } = supabase.storage.from('products').getPublicUrl(locFileName);
            uploadedLocationPhotoUrl = locData.publicUrl;
          } else {
            uploadedLocationPhotoUrl = await compressImageToDataUrl(locationPhotoFile, 'location');
          }
        } catch (pErr) {
          console.error('Location photo upload error:', pErr);
          uploadedLocationPhotoUrl = await compressImageToDataUrl(locationPhotoFile, 'location');
        }
      }

      // ៣. រក្សាទុកចូលតារាង orders ក្នុង Supabase
      let fullAddress = `${customerProvince} - ${customerAddress.trim()}`;
      if (googleMapUrl && googleMapUrl.trim()) {
        fullAddress += ` [📍 Maps: ${googleMapUrl.trim()}]`;
      }
      if (uploadedLocationPhotoUrl) {
        fullAddress += ` [🏠 រូបផ្ទះ: ${uploadedLocationPhotoUrl}]`;
      }
      if (customerTelegram && customerTelegram.trim()) {
        fullAddress += ` [✈️ Telegram: ${customerTelegram.trim()}]`;
      }
      if (customerEmail && customerEmail.trim()) {
        fullAddress += ` [✉️ Email: ${customerEmail.trim()}]`;
      }
      const customerContact = customerPhone.trim();

      const orderPayload = {
        order_id: generatedOrderId,
        customer_name: customerName.trim(),
        phone: customerContact,
        phone_number: customerContact,
        telegram: customerTelegram.trim().replace(/^@/, '') || null,
        email: customerEmail.trim() || null,
        customer_telegram: customerTelegram.trim() || null,
        customer_email: customerEmail.trim() || null,
        address: fullAddress,
        delivery_address: fullAddress,
        total_amount: totalPrice,
        subtotal: subtotalPrice,
        discount: couponDiscountAmount || 0,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        google_map_url: googleMapUrl || null,
        location_photo_url: uploadedLocationPhotoUrl || null,
        payment_method: paymentMethod,
        payment_slip_url: uploadedSlipUrl || null,
        status: 'Pending',
        order_type: 'ONLINE',
        items: [
          ...cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            size: item.size || '',
            color: item.color || '',
            variantId: item.variantId || null,
            image_url: item.image_url || '',
            payment_slip_url: uploadedSlipUrl || null,
            google_map_url: googleMapUrl || null,
            location_photo_url: uploadedLocationPhotoUrl || null,
            coupon_code: null,
            customer_telegram: customerTelegram.trim() || null,
            customer_email: customerEmail.trim() || null
          })),
          ...(isTaxEnabled && taxAmount > 0 ? [{
            is_tax_meta: true,
            tax_rate: taxRatePercent,
            tax_amount: taxAmount,
            tax_mode: taxMode,
            tax_label: storeSettings.taxLabel || `អាករលើតម្លៃបន្ថែម (VAT ${taxRatePercent}%)`
          }] : [])
        ]
      };

      // ⚠️ សំខាន់៖ បញ្ចូលតែ Columns ដែលមានពិតប្រាកដក្នុង DB Supabase ដើម្បីកុំឱ្យជាប់ error schema cache
      let insertPayload = {
        store_id: currentStore?.id || 'store_default_sabayluk',
        order_id: generatedOrderId,
        customer_name: customerName.trim(),
        phone: customerContact,
        phone_number: customerContact,
        address: fullAddress,
        delivery_address: fullAddress,
        total_amount: totalPrice,
        subtotal: subtotalPrice,
        discount: couponDiscountAmount || 0,
        payment_method: paymentMethod,
        payment_slip_url: uploadedSlipUrl || null,
        status: 'Pending',
        order_type: 'ONLINE',
        items: orderPayload.items
      };

      let { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert([insertPayload])
        .select()
        .single();

      // Auto-cleanup resilient retry ប្រសិនបើ Supabase schema មិនទាន់ cache ជួរឈរណាមួយ
      if (orderError && orderError.message && orderError.message.includes('Could not find the') && orderError.message.includes('column')) {
        const match = orderError.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          delete insertPayload[match[1]];
          const retry = await supabase
            .from('orders')
            .insert([insertPayload])
            .select()
            .single();
          createdOrder = retry.data;
          orderError = retry.error;
        }
      }

      if (orderError && (orderError.message?.includes('payment_slip_url') || orderError.code === 'PGRST204')) {
        delete insertPayload.payment_slip_url;
        const retry = await supabase
          .from('orders')
          .insert([insertPayload])
          .select()
          .single();
        createdOrder = retry.data;
        orderError = retry.error;
      }

      if (orderError) {
        if (orderError.code === '42501' || orderError.message?.includes('row-level security')) {
          throw new Error('តារាង orders ក្នុង Supabase មិនទាន់បានបើកសិទ្ធិ RLS Policy នៅឡើយទេ។ សូម Run SQL Policy ក្នុង Supabase SQL Editor!');
        }
        throw orderError;
      }

      const completedOrderData = {
        ...orderPayload,
        customer: customerName.trim(),
        total: totalPrice,
        payment: paymentMethod,
        payment_slip_url: uploadedSlipUrl || null,
        created_at: new Date().toISOString()
      };
      setCompletedOrder(completedOrderData);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`sabay_order_${generatedOrderId}`, JSON.stringify(completedOrderData));
          localStorage.setItem('sabay_current_invoice_order', JSON.stringify(completedOrderData));
          const existingReal = JSON.parse(localStorage.getItem('sabay_real_orders') || '[]');
          localStorage.setItem('sabay_real_orders', JSON.stringify([completedOrderData, ...existingReal.slice(0, 50)]));
        } catch (e) {}
      }

      setCart([]);
      setSlipFile(null);
      setSlipPreviewUrl(null);
      setLocationPhotoFile(null);
      setLocationPhotoPreview(null);
      setGoogleMapUrl('');
      setCheckoutModalOpen(false);
      setIsCartOpen(false);
      setOrderSuccessModalOpen(true);
      try { window.sabayHaptic?.success?.(); } catch (_) {}

      fetchProducts();

      // 🚨 ៤. ជូនដំណឹងស្វ័យប្រវត្តិតាម Telegram ពេលមានការបញ្ជាទិញថ្មី (New Order Alert)
      try {
        const isDefault = (!currentStore?.id || currentStore.id === 'store_default_sabayluk');
        const storeKey = currentStore?.id ? `sabay_store_settings_${currentStore.id}` : 'sabay_store_settings';
        const savedSettings = typeof window !== 'undefined' 
          ? (localStorage.getItem(storeKey) || (isDefault ? localStorage.getItem('sabay_store_settings') : null)) 
          : null;
        const parsedSettings = savedSettings ? JSON.parse(savedSettings) : (currentStore?.settings || {});
        // ⭐️ STRICT MULTI-TENANT ISOLATION: ហាមដាច់ខាតមិនឱ្យទាញ Bot Token របស់ហាងដទៃមកប្រើឡើយ
        const botToken = (parsedSettings.telegramBotToken || currentStore?.settings?.telegramBotToken || (isDefault ? storeSettings.telegramBotToken : '') || '').trim();
        const chatId = (parsedSettings.telegramChatId || currentStore?.settings?.telegramChatId || (isDefault ? storeSettings.telegramChatId : '') || '').trim();

        // ⭐️ ផ្ញើ Request ទៅ /api/telegram ជានិច្ច (Server នឹងស្វែងរក Bot Token ពី Supabase / Stores table បើ Client គ្មាន)
        fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken: botToken || undefined,
            chatId: chatId || undefined,
            storeId: currentStore?.id || 'store_default_sabayluk',
            storeSlug: currentStore?.slug || 'sabay-luk',
            storeName: parsedSettings.storeName || storeSettings.storeName || currentStore?.name || 'SABAY LUK',
            storePhone: parsedSettings.phone || storeSettings.phone || currentStore?.phone || '096 720 5522',
            storeAddress: parsedSettings.address || storeSettings.address || currentStore?.address || 'Street 271, Phnom Penh, Cambodia',
            storeTelegram: (() => {
              const tg = (parsedSettings.telegram || storeSettings.telegram || currentStore?.telegram || 'sabay_luk').replace(/^@/, '').trim();
              return tg.toLowerCase() === 'sabayluk' ? 'sabay_luk' : tg;
            })(),
            action: 'new_order',
            slipUrl: uploadedSlipUrl || null,
            order: {
              order_id: generatedOrderId,
              customer_name: customerName.trim(),
              phone: customerContact,
              customer_telegram: customerTelegram.trim() || null,
              customer_email: customerEmail.trim() || null,
              address: customerAddress.trim(),
              province: customerProvince,
              delivery_address: fullAddress,
              google_map_url: googleMapUrl || null,
              location_photo_url: uploadedLocationPhotoUrl || null,
              payment_slip_url: uploadedSlipUrl || null,
              total_amount: totalPrice,
              subtotal: subtotalPrice,
              discount: couponDiscountAmount || 0,
              coupon_code: appliedCoupon ? appliedCoupon.code : null,
              payment_method: paymentMethod,
              items: cart,
              exchange_rate: parsedSettings.exchangeRate || storeSettings.exchangeRate || 4100
            }
          })
        }).catch(tErr => console.warn('Telegram notify error:', tErr));

        // 🚨 ជូនដំណឹងបន្ថែមបើស្តុកធ្លាក់ដល់កម្រិតទាប (Low Stock Alert)
        if (affectedLowStockItems.length > 0 && parsedSettings.enableLowStockAlert !== false) {
          fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botToken: botToken || undefined,
              chatId: chatId || undefined,
              storeId: currentStore?.id || 'store_default_sabayluk',
              storeSlug: currentStore?.slug || 'sabay-luk',
              storeName: parsedSettings.storeName || storeSettings.storeName || currentStore?.name || 'SABAY LUK',
              action: 'low_stock',
              items: affectedLowStockItems
            })
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Telegram alert exception:', e);
      }

      // 🔔 ៥. ជូនដំណឹងដល់គ្រប់ផ្ទាំង Admin & ផ្នែកលក់ ភ្លាមៗ (Realtime Broadcast & Sound)
      try {
        const adminOrderAlert = {
          type: 'NEW_ORDER',
          id: createdOrder?.id || generatedOrderId,
          order_id: generatedOrderId,
          customer_name: customerName.trim(),
          phone: customerContact,
          total: totalPrice,
          itemsCount: cart.length,
          payment: paymentMethod,
          store_id: currentStore?.id || 'store_default_sabayluk',
          store_name: currentStore?.name || parsedSettings.storeName || 'SABAY LUK',
          timestamp: Date.now()
        };
        localStorage.setItem('sabay_new_order_alert', JSON.stringify(adminOrderAlert));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('sabay_orders_sync');
          bc.postMessage(adminOrderAlert);
          bc.close();
        }
      } catch (e) {}

    } catch (err) {
      console.error('Checkout error:', err);
      alert('❌ មានបញ្ហាក្នុងការបញ្ជាទិញ: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ⭐️ Helper: បង្ហាញរូបសញ្ញា SVG Icon ស្តង់ដារតាមរយៈ categoryIcons helper (60+ Icons) ⭐️
  const getCategorySvgIcon = (cat, isSelected = false) => {
    return renderCategorySvg(cat?.icon || 'shoe', "w-5 h-5 shrink-0");
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${themeMode === 'dark' ? 'bg-[#0b0f19] text-gray-100 dark' : 'bg-[#fafafa] text-gray-900'} selection:bg-orange-500 selection:text-white pb-16 md:pb-0`}>
      
      {/* ⚠️ SUSPENDED STORE NOTICE (ហាងត្រូវបានផ្អាកដំណើរការជាបណ្តោះអាសន្ន) ⚠️ */}
      {currentStore?.status === 'SUSPENDED' && (
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 text-white text-xs sm:text-sm py-3 px-4 text-center font-bold sticky top-0 z-[110] shadow-lg flex flex-wrap items-center justify-center gap-2">
          <span className="text-lg">🛑</span>
          <span>
            ហាង <b>"{currentStore?.name}"</b> ត្រូវបានផ្អាកដំណើរការជាបណ្តោះអាសន្ន ដោយសារមិនមានសកម្មភាពលើសពី ៣០ ថ្ងៃ (Store Temporarily Suspended)
          </span>
          <span className="text-[11px] opacity-90 hidden sm:inline">• សូមអភ័យទោសចំពោះការរំខាន</span>
        </div>
      )}

      {/* ⭐️ DEMO STOREFRONT NOTICE BANNER ⭐️ */}
      {isDemoStore && (
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white text-xs py-2.5 px-4 text-center font-bold sticky top-0 z-[100] shadow-md flex flex-wrap items-center justify-center gap-2">
          <span>🛍️ នេះជាហាងគំរូ Demo (Demo Storefront) — បងអាចសាកល្បងចុចមើលទំនិញ ស្វែងរក និងពិនិត្យមុខងារបានដោយសេរី</span>
          <a
            href="/register?plan=FREE"
            className="ml-2 bg-white text-orange-600 px-3 py-1 rounded-full font-black text-[11px] hover:bg-orange-50 transition shadow-xs active:scale-95"
          >
            🚀 បង្កើតហាងផ្ទាល់ខ្លួន (Free)
          </a>
        </div>
      )}

      {/* ⭐️ 1. LUXURY TOP ANNOUNCEMENT TICKER BAR ⭐️ */}
      {storeSettings.showAnnouncement && (
        <div className="bg-gradient-to-r from-[#18181b] via-[#27272a] to-[#18181b] text-white text-[11px] sm:text-xs py-2 px-4 shadow-sm border-b border-white/5">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <span style={{ backgroundColor: brandColor }} className="text-white px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider">
                HOT SALE
              </span>
              <span className="font-medium text-gray-200">
                {storeSettings.announcementText || '🔥 ដឹកជញ្ជូនឥតគិតថ្លៃ ២៥ ខេត្ត/ក្រុង • ធានាប្តូរ Size ក្នុងរយៈពេល ៧ ថ្ងៃ'}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-4 text-gray-300 font-semibold text-[11px]">
              <span>⏰ {storeSettings.businessHours || '8:00 AM - 9:00 PM'}</span>
              <span>•</span>
              <a href={`tel:${(storeSettings.phone || '0967205522').replace(/\s+/g, '')}`} className="hover:text-orange-400 transition flex items-center gap-1 font-bold text-white">
                📞 {storeSettings.phone || '096 720 5522'}
              </a>
            </div>
          </div>
        </div>
      )}



      {/* ⭐️ 2. STICKY GLASSMORPHISM HEADER ⭐️ */}
      <header className={`${themeMode === 'dark' ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-gray-100 text-gray-900'} backdrop-blur-md sticky top-0 z-40 border-b shadow-xs transition-colors`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          
          {/* Brand Logo with Luxury Slogan */}
          <div 
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0 flex-1 sm:flex-initial"
          >
            {isMounted && storeSettings.logoUrl ? (
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white dark:bg-slate-800 p-1 flex items-center justify-center shadow-xs border border-gray-100 dark:border-slate-700/60 shrink-0 group-hover:scale-105 transition">
                <img src={storeSettings.logoUrl} alt={storeSettings.storeName} className="h-full w-full object-contain rounded-xl" />
              </div>
            ) : (
              <div suppressHydrationWarning style={{ backgroundColor: brandColor }} className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shrink-0 group-hover:scale-105 transition ring-2 ring-orange-500/20">
                {(storeSettings.storeName || 'S').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div suppressHydrationWarning className="text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-[#ff6a00] transition truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                {storeSettings.storeName || 'SABAY LUK'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <p suppressHydrationWarning className="text-[9px] sm:text-[10px] font-extrabold text-gray-400 dark:text-gray-400 tracking-wider uppercase truncate leading-none">
                  {storeSettings.storeSlogan || 'Premium Store'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Search Bar with Quick Hashtags */}
          <div className="flex-1 max-w-xl hidden md:flex flex-col">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-gray-400 text-sm">🔍</span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ស្វែងរកស្បែកជើង ម៉ាកយីហោ ទំហំ ឬប្រភេទ..." 
                className="w-full bg-gray-50 border border-gray-200 focus:border-[#ff6a00] focus:bg-white rounded-full pl-9 pr-10 py-2.5 text-xs font-medium focus:outline-none transition shadow-2xs"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 text-xs font-bold w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* User & Cart Actions (Language, Day/Night Theme, Track, Cart) */}
          <div className="flex items-center space-x-1 sm:space-x-2 text-sm font-semibold shrink-0">
            
            {/* 🌐 Bilingual Switcher (ភាសាខ្មែរ / English) */}
            <button 
              type="button"
              onClick={() => toggleLanguage()}
              className={`cursor-pointer flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl transition text-xs font-black border shadow-2xs ${
                themeMode === 'dark' 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
              title={language === 'km' ? 'Switch to English' : 'ប្តូរជាភាសាខ្មែរ'}
            >
              <span className="text-sm">{language === 'km' ? '🇰🇭' : '🇺🇸'}</span>
              <span className="text-[11px] sm:text-xs">{language === 'km' ? 'ខ្មែរ' : 'EN'}</span>
            </button>

            {/* ☀️ Day / Night Theme Switcher (ពន្លឺថ្ងៃ និងយប់) */}
            <button 
              type="button"
              onClick={toggleThemeMode}
              className={`cursor-pointer flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl transition text-xs font-black border shadow-2xs ${
                themeMode === 'dark' 
                  ? 'bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border-amber-400/30' 
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
              }`}
              title={themeMode === 'dark' ? 'ប្តូរទៅពន្លឺថ្ងៃ (Day Light)' : 'ប្តូរទៅពន្លឺយប់ (Night Mode)'}
            >
              <span className="text-sm">{themeMode === 'dark' ? '🌙' : '☀️'}</span>
              <span className="hidden sm:inline">
                {themeMode === 'dark' ? (language === 'km' ? 'យប់' : 'Dark') : (language === 'km' ? 'ថ្ងៃ' : 'Light')}
              </span>
            </button>

            {/* ប៊ូតុង តាមដានការកុម្ម៉ង់ */}
            <button 
              onClick={() => setTrackModalOpen(true)}
              className={`cursor-pointer flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl transition text-xs font-bold border shadow-2xs ${
                themeMode === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-gray-50 hover:bg-orange-50 text-gray-700 hover:text-[#ff6a00] border-gray-200 hover:border-orange-200'
              }`}
            >
              <span className="text-sm">🔍</span>
              <span className="hidden sm:inline">{t('trackOrder', 'តាមដានការកុម្ម៉ង់')}</span>
            </button>

            {/* 🔑 ប៊ូតុង ចូលគ្រប់គ្រងហាង (Store Admin Login) */}
            <a 
              href="/login"
              className={`cursor-pointer hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl transition text-xs font-bold border shadow-2xs ${
                themeMode === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-gray-50 hover:bg-orange-50 text-gray-700 hover:text-[#ff6a00] border-gray-200 hover:border-orange-200'
              }`}
              title="ចូលផ្ទាំងគ្រប់គ្រង Admin របស់ហាងនេះ"
            >
              <span>🔑</span>
              <span>{language === 'km' ? 'ចូលគ្រប់គ្រង' : 'Admin Login'}</span>
            </a>

            {/* Cart Button with Total Preview (Hidden on Mobile because Bottom Nav has Cart) */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="cursor-pointer hidden md:flex bg-gradient-to-r from-[#312c5b] to-[#c85f2d] hover:from-[#252248] hover:to-[#b65426] text-white items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl transition shadow-md group active:scale-95 text-xs font-black"
            >
              <span>🛒</span>
              <span className="hidden sm:inline">${totalPrice.toFixed(2)}</span>
              <span style={{ backgroundColor: brandColor }} className="text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-xs">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-gray-400 text-sm">🔍</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder", "ស្វែងរកស្បែកជើង ម៉ាកយីហោ...")} 
              className="w-full bg-gray-50 border border-gray-200 focus:border-[#ff6a00] focus:bg-white rounded-full pl-9 pr-9 py-2 text-xs font-medium focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-gray-400 hover:text-gray-600 text-xs font-bold w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ⭐️ 3. HERO BANNER & CATEGORIES (MODERN BALANCED LAYOUT) ⭐️ */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-5 pb-3">
        {/* 📱 ផ្នែកប្រភេទផលិតផលរៀបចំមួយជួរស្អាតសម្រាប់ Mobile App (Shopee / Lazada Standard Single Row) ⭐️ */}
        <div className="block lg:hidden mb-4">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1.5 px-0.5">
            {/* ប៊ូតុងទំនិញទាំងអស់ (All Items) - ពង្រីកធំស្រួលចុច (Enlarged Touch Target) */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-black transition whitespace-nowrap shrink-0 shadow-sm cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-[#18181b] to-[#27272a] text-white shadow-md'
                  : `${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-gray-200 text-gray-800'} border-2 hover:bg-gray-50`
              }`}
            >
              <span className={`p-1.5 rounded-xl ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                <svg fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
              </span>
              <span>ទំនិញទាំងអស់</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {products.length}
              </span>
            </button>

            {/* បញ្ជីប្រភេទផលិតផលនីមួយៗក្នុងមួយជួរ (Categories in 1 Single Row) - ពង្រីកធំស្រួលចុច */}
            {categories.map((cat) => {
              const count = products.filter(p => {
                const pCat = (p.category || '').trim().toLowerCase();
                const catName = (cat.name || '').trim().toLowerCase();
                return pCat.includes(catName) || catName.includes(pCat);
              }).length;
              const isSelected = selectedCategory === cat.name;

              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  style={isSelected ? { backgroundColor: brandColor } : {}}
                  className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-black transition whitespace-nowrap shrink-0 shadow-sm cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-md'
                      : `${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-gray-200 text-gray-800'} border-2 hover:bg-gray-50`
                  }`}
                >
                  <span className={`p-1.5 rounded-xl ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-50 text-[#ff6a00]'}`}>
                    {getCategorySvgIcon(cat, isSelected)}
                  </span>
                  <span>{cat.name}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Categories Sidebar (លាក់លើ Mobile / Phone App, បង្ហាញតែលើ Desktop Website តាមតម្រូវការ) */}
          <div className={`hidden lg:flex lg:col-span-3 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'} rounded-3xl p-5 border shadow-xs flex-col justify-start transition-colors`}>
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff6a00] to-amber-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/25">
                    <svg fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-black text-sm text-gray-900 tracking-tight leading-tight">
                      ប្រភេទផលិតផល
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold">Categories</p>
                  </div>
                </div>
                <span className="bg-orange-50 text-[#ff6a00] text-xs font-black px-2.5 py-0.5 rounded-full border border-orange-100/80">
                  {products.length}
                </span>
              </div>
              
              <ul className="space-y-1.5 text-xs font-bold">
                <li>
                  <button 
                    onClick={() => setSelectedCategory('all')} 
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 group cursor-pointer ${
                      selectedCategory === 'all' 
                        ? 'bg-gradient-to-r from-[#18181b] to-[#27272a] text-white shadow-md' 
                        : 'text-gray-700 bg-gray-50/70 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`p-1.5 rounded-xl transition ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-700 group-hover:text-orange-600'}`}>
                        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                        </svg>
                      </span>
                      <span>ទំនិញទាំងអស់ (All Items)</span>
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {products.length}
                    </span>
                  </button>
                </li>

                {categories.map((cat) => {
                  const count = products.filter(p => {
                    const pCat = (p.category || '').trim().toLowerCase();
                    const catName = (cat.name || '').trim().toLowerCase();
                    return pCat.includes(catName) || catName.includes(pCat);
                  }).length;

                  const isSelected = selectedCategory === cat.name;

                  return (
                    <li key={cat.id || cat.name}>
                      <button 
                        onClick={() => setSelectedCategory(cat.name)} 
                        style={isSelected ? { backgroundColor: brandColor } : {}}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 group cursor-pointer ${
                          isSelected 
                            ? 'text-white shadow-md' 
                            : 'text-gray-700 bg-gray-50/70 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <span className={`p-1.5 rounded-xl transition ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : 'bg-orange-50 text-[#ff6a00] group-hover:bg-orange-100'
                          }`}>
                            {getCategorySvgIcon(cat, isSelected)}
                          </span>
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-black shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            

          </div>

          {/* ⭐️ Hero Banner Auto-Slide (Ultra-Modern Cinematic Cover) ⭐️ */}
          <div 
            className="lg:col-span-9 rounded-2xl sm:rounded-3xl relative overflow-hidden h-[180px] xs:h-[210px] sm:h-[280px] md:h-[340px] lg:h-[390px] shadow-lg sm:shadow-xl bg-gray-950 flex items-center group select-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {displaySlides.map((slide, index) => {
              const isCurrent = index === (currentSlide % displaySlides.length);
              
              // Gradient Overlay helper
              const getHeroOverlay = (overlayType, alignType) => {
                let dark = '0.85';
                let mid = '0.45';
                let edge = '0.12';
                if (overlayType === 'light') {
                  dark = '0.65'; mid = '0.25'; edge = '0.05';
                } else if (overlayType === 'dark') {
                  dark = '0.92'; mid = '0.7'; edge = '0.35';
                }

                if (alignType === 'center') {
                  return `linear-gradient(to top, rgba(0,0,0,${dark}) 0%, rgba(0,0,0,${mid}) 50%, rgba(0,0,0,${edge}) 100%)`;
                } else if (alignType === 'right') {
                  return `linear-gradient(to left, rgba(0,0,0,${dark}) 0%, rgba(0,0,0,${mid}) 60%, rgba(0,0,0,${edge}) 100%)`;
                }
                return `linear-gradient(to right, rgba(0,0,0,${dark}) 0%, rgba(0,0,0,${mid}) 60%, rgba(0,0,0,${edge}) 100%)`;
              };

              const overlayStyle = getHeroOverlay(slide.overlay, slide.align);
              const bgImg = slide.image ? `${overlayStyle}, url("${slide.image}")` : overlayStyle;

              const alignClasses = slide.align === 'center' 
                ? 'items-center text-center' 
                : slide.align === 'right' 
                  ? 'items-end text-right' 
                  : 'items-start text-left';

              return (
                <div
                  key={slide.id || index}
                  className={`absolute inset-0 transition-all duration-1000 ease-in-out bg-cover bg-center flex flex-col justify-center p-4 xs:p-6 sm:p-8 md:p-12 text-white ${
                    isCurrent ? 'opacity-100 scale-100 z-10 pointer-events-auto' : 'opacity-0 scale-105 z-0 pointer-events-none'
                  }`}
                  style={{ backgroundImage: bgImg }}
                >
                  <div className={`max-w-2xl flex flex-col ${alignClasses} ${slide.align === 'center' ? 'mx-auto' : ''}`}>
                    
                    {/* Glassmorphic Badge Tag */}
                    {slide.badge && (
                      <span 
                        style={{ backgroundColor: brandColor }} 
                        className="inline-flex items-center gap-1.5 text-white text-[9px] sm:text-xs font-black px-2.5 sm:px-4 py-0.5 sm:py-1.5 rounded-full uppercase tracking-wider mb-1.5 sm:mb-3 shadow-md backdrop-blur-md border border-white/20 transform transition duration-500 hover:scale-105"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        {slide.badge}
                      </span>
                    )}
                    
                    {/* Main Title */}
                    {slide.title && (
                      <h1 className="text-base xs:text-lg sm:text-3xl md:text-4xl lg:text-[40px] font-black mb-1 sm:mb-2 leading-tight text-white drop-shadow-md tracking-tight line-clamp-2">
                        {slide.title}
                      </h1>
                    )}
                    
                    {/* Description (Hidden on mobile to keep banner compact, visible on sm+) */}
                    {slide.desc && (
                      <p className="hidden sm:block text-gray-100/90 text-xs sm:text-sm md:text-base mb-3 sm:mb-5 leading-relaxed font-medium line-clamp-2 drop-shadow-md max-w-xl">
                        {slide.desc}
                      </p>
                    )}
                    
                    {/* CTA Button */}
                    {slide.btnText && (
                      <button 
                        type="button"
                        onClick={() => handleHeroBannerCta(slide)}
                        className="bg-white hover:bg-orange-50 text-gray-900 px-3.5 sm:px-6 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs w-max transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5 sm:gap-2.5 cursor-pointer border border-white/40 mt-0.5 sm:mt-0"
                      >
                        <span>{slide.btnText}</span>
                        <span className="text-xs sm:text-base transition-transform group-hover:translate-x-1">→</span>
                      </button>
                    )}

                  </div>
                </div>
              );
            })}

            {/* Interactive Left & Right Floating Arrows (Hidden on mobile) */}
            {displaySlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevHeroSlide}
                  className="hidden md:flex absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-black/40 hover:bg-black/80 backdrop-blur-md text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-90 border border-white/20 shadow-xl cursor-pointer"
                  title="Slide មុន"
                  aria-label="Previous Slide"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  type="button"
                  onClick={nextHeroSlide}
                  className="hidden md:flex absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-black/40 hover:bg-black/80 backdrop-blur-md text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-90 border border-white/20 shadow-xl cursor-pointer"
                  title="Slide បន្ទាប់"
                  aria-label="Next Slide"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            )}

            {/* Dots Indicators */}
            {displaySlides.length > 1 && (
              <div className="absolute bottom-2.5 right-3 sm:bottom-4 sm:right-6 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/35 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/10 shadow-lg">
                {displaySlides.map((_, idx) => {
                  const isCurrent = (currentSlide % displaySlides.length) === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      aria-label={`Slide ${idx + 1}`}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        isCurrent 
                          ? 'w-5 sm:w-8 h-2 sm:h-2.5 shadow-md' 
                          : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/50 hover:bg-white hover:scale-110'
                      }`}
                      style={{ backgroundColor: isCurrent ? brandColor : undefined }}
                    />
                  );
                })}
              </div>
            )}

            {/* Slide Progress Line Indicator */}
            {displaySlides.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20 overflow-hidden">
                <div 
                  key={currentSlide}
                  className={`h-full transition-all duration-200 ${isPaused ? 'opacity-40' : ''}`}
                  style={{
                    backgroundColor: brandColor,
                    width: isPaused ? '50%' : '100%',
                    transition: isPaused ? 'width 0.3s ease' : 'width 4.5s linear'
                  }}
                />
              </div>
            )}

          </div>

        </div>
      </section>

            {/* ⭐️ 4. LIVE RECENT ORDERS TICKER: ទំនិញដែលអតិថិជនទិញថ្ងៃនេះ & ម្សិលមិញ (រំកិលយឺតៗមកឆ្វេង) ⭐️ */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5">
        <div className={`rounded-3xl border shadow-sm p-3 sm:p-4 transition-all duration-300 relative overflow-hidden ${
          themeMode === 'dark'
            ? 'bg-slate-900/95 border-slate-800 text-white shadow-black/20'
            : 'bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white border-orange-200/70 text-slate-900 shadow-orange-500/5'
        }`}>
          
          {/* Header Bar: Status & Title */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 px-1">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                  <span className="text-sm">🛍️</span>
                  <span>ទំនិញដែលអតិថិជនទិញថ្ងៃនេះ</span>
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black normal-case shadow-xs">
                    Live Orders
                  </span>
                </h3>
                <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
                  • ថ្ងៃនេះ & ម្សិលមិញ (ចុចលើរូបដើម្បីមើល ឬបញ្ជាទិញ)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-orange-600 bg-orange-100/90 dark:bg-orange-950/70 dark:text-orange-300 px-2.5 py-1 rounded-xl border border-orange-200/70 dark:border-orange-900/60 flex items-center gap-1 shadow-2xs">
                <span className="animate-pulse text-[10px]">🔥</span>
                <span>រំកិលបន្តផ្ទាល់ (Live Stream)</span>
              </span>
            </div>
          </div>

          {/* Infinite Marquee Left Track */}
          <div className="relative overflow-hidden group">
            {/* Left & Right gradient fade masks for ultra-luxury look */}
            <div className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 z-10 bg-gradient-to-r ${
              themeMode === 'dark' ? 'from-slate-900 to-transparent' : 'from-orange-50/90 to-transparent'
            }`} />
            <div className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 z-10 bg-gradient-to-l ${
              themeMode === 'dark' ? 'from-slate-900 to-transparent' : 'from-white to-transparent'
            }`} />

            {/* Inline keyframe style fallback to ensure 100% working marquee */}
            <style>{`
              @keyframes marqueeSlowLeft {
                0% { transform: translateX(0%); }
                100% { transform: translateX(-50%); }
              }
              .ticker-scroll-left {
                display: flex;
                width: max-content;
                animation: marqueeSlowLeft 36s linear infinite;
                will-change: transform;
              }
              .ticker-scroll-left:hover {
                animation-play-state: paused;
              }
            `}</style>

            <div className="ticker-scroll-left flex items-center gap-3 py-1">
              {(recentPurchases.length > 0 ? [...recentPurchases, ...recentPurchases] : []).map((item, idx) => {
                const matchedProd = products.find(p => String(p.id) === String(item.product_id) || p.name === item.product_name);

                return (
                  <div
                    key={`${item.id}_${idx}`}
                    onClick={() => {
                      if (matchedProd) {
                        handleAddToCartClick(matchedProd);
                      } else if (products.length > 0) {
                        handleAddToCartClick(products[0]);
                      }
                    }}
                    title="ចុចដើម្បីមើលព័ត៌មានលម្អិត & បញ្ជាទិញ"
                    className={`min-w-[275px] sm:min-w-[315px] max-w-[335px] p-2.5 pr-4 rounded-3xl border transition-all duration-300 flex items-center gap-3 cursor-pointer shrink-0 select-none group/card active:scale-95 ${
                      themeMode === 'dark'
                        ? 'bg-slate-850/90 hover:bg-slate-800 border-slate-700/80 hover:border-orange-500/50 shadow-md shadow-black/20 hover:shadow-orange-500/10'
                        : 'bg-white hover:bg-orange-50/40 border-slate-200/90 hover:border-orange-400 shadow-2xs hover:shadow-md hover:shadow-orange-500/10'
                    }`}
                  >
                    {/* ⭕ Circular Product Image with Glow Ring */}
                    <div className="relative shrink-0">
                      <div className="w-13 h-13 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#ff6a00] via-amber-400 to-orange-500 shadow-md group-hover/card:scale-105 transition-transform duration-300">
                        <img
                          src={item.image_url || '/placeholder.png'}
                          alt={item.product_name}
                          className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-900"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80';
                          }}
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 ring-2 ring-white dark:ring-slate-900 shadow-xs" title="បញ្ជាទិញជោគជ័យ">
                        <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" className="w-2.5 h-2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </div>

                    {/* Product & Buyer Info */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: Location & Timing */}
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <span>📍 {item.location || 'ភ្នំពេញ'}</span>
                          <span className="text-[9px]">• {item.timeText || item.timeFormatted || (item.timeTag === 'ថ្ងៃនេះ' ? 'ទើបទិញថ្មីៗ' : 'ម្សិលមិញ')}</span>
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                          item.timeTag === 'ថ្ងៃនេះ'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}>
                          {item.timeTag}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover/card:text-orange-500 transition-colors">
                        {item.product_name}
                      </h4>

                      {/* Bottom row: Price, Size & Action */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-black text-[#ff6a00]">
                            ${parseFloat(item.price || 0).toFixed(2)}
                          </span>
                          {item.size && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                              {item.size}
                            </span>
                          )}
                        </div>

                        <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 group-hover/card:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          <span>ទិញ</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* ⭐️ 5. PRODUCT CATALOG WITH SMART FILTER & SORT BAR ⭐️ */}
      <section id="products-section" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        
        {/* ⭐️ Standard Luxury E-Commerce Catalog Control Bar (Sleek Single-Row Toolbar) ⭐️ */}
        <div className={`${themeMode === 'dark' ? 'bg-slate-900/95 border-slate-800/90 text-white' : 'bg-white/95 border-slate-200/80 text-slate-900'} backdrop-blur-sm px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border shadow-[0_2px_10px_rgba(0,0,0,0.03)] mb-4 sm:mb-6 flex items-center justify-between gap-2 transition-all`}>
          
          {/* Left: Section Title + Item Count Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 text-[#ff6a00] flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-2xs">
              🏷️
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white truncate tracking-tight">
                {selectedCategory === 'all' 
                  ? (language === 'km' ? 'ទំនិញពេញនិយម' : 'Popular Items') 
                  : selectedCategory}
              </h2>
              <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-[#ff6a00] dark:text-orange-400 border border-orange-500/20 shrink-0">
                {sortedProducts.length}
              </span>
            </div>
          </div>

          {/* Right: Modern Luxury Pill Filter & Sort Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Luxury In-Stock Toggle Pill Chip */}
            <button
              type="button"
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs border ${
                inStockOnly 
                  ? 'bg-gradient-to-r from-orange-500 to-[#ff6a00] text-white border-orange-500 shadow-orange-500/20' 
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/90 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80'
              }`}
              title={language === 'km' ? 'បង្ហាញតែទំនិញមានស្តុក' : 'Filter In-Stock Only'}
            >
              <span className="text-[11px] sm:text-xs">{inStockOnly ? '✓' : '📦'}</span>
              <span className="hidden xs:inline">{language === 'km' ? 'មានស្តុក' : 'In Stock'}</span>
              <span className="xs:hidden">{language === 'km' ? 'ស្តុក' : 'Stock'}</span>
            </button>

            {/* Luxury Sort Select Pill Chip */}
            <div className="relative inline-flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-black text-slate-700 dark:text-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer appearance-none pr-3.5 text-[11px] sm:text-xs font-black text-slate-800 dark:text-white"
              >
                <option value="newest" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">✨ ថ្មីៗ</option>
                <option value="popular" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">🔥 លក់ដាច់</option>
                <option value="price_low" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">📉 តម្លៃទាប</option>
                <option value="price_high" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">📈 តម្លៃខ្ពស់</option>
              </select>
              <span className="pointer-events-none absolute right-2 text-[10px] text-slate-400">▾</span>
            </div>
          </div>

        </div>

        {/* Product Grid */}
        {sortedProducts.length === 0 ? (
          <div className="bg-white p-12 sm:p-16 text-center rounded-3xl border border-dashed border-gray-200 text-gray-400 font-bold max-w-xl mx-auto shadow-xs">
            <div className="text-5xl mb-3">🛍️</div>
            <p className="text-base text-gray-800 font-black">
              {currentStore?.id !== 'store_default_sabayluk'
                ? `ហាង «${currentStore.name}» កំពុងរៀបចំទំនិញ`
                : 'រកមិនឃើញផលិតផលដែលអ្នកចង់បានទេ។'}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              {currentStore?.id !== 'store_default_sabayluk'
                ? 'មិនទាន់មានទំនិញដាក់លក់នៅឡើយទេ។ សូមរង់ចាំការដាក់លក់ក្នុងពេលឆាប់ៗនេះ!'
                : 'សូមសាកល្បងស្វែងរកពាក្យផ្សេង ឬដោះការច្រោះប្រភេទចេញ!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {sortedProducts.map((product) => {
              const isOutOfStock = product.stock_qty <= 0;
              const isLowStock = product.stock_qty > 0 && product.stock_qty < 5;
              const badgeText = isOutOfStock ? 'ដាច់ស្តុក' : (isLowStock ? 'ជិតអស់' : 'New');
              const badgeBg = isOutOfStock ? 'bg-red-500' : (isLowStock ? 'bg-[#ff6a00]' : 'bg-[#18181b]');

              return (
                <div 
                  key={product.id} 
                  className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white hover:border-slate-700 shadow-slate-950/40' : 'bg-white border-gray-100 text-gray-900 hover:shadow-xl'} rounded-3xl border p-3.5 hover:-translate-y-1 transition-all duration-300 flex flex-col group relative`}
                >
                  {/* Image & Badges Container (ចុចដើម្បីមើលលម្អិត & Download រូបភាព) */}
                  <div 
                    onClick={() => handleAddToCartClick(product)}
                    className="aspect-square bg-gray-50 rounded-2xl mb-3 overflow-hidden relative border border-gray-100/70 cursor-pointer group/img"
                    title="ចុចដើម្បីមើលព័ត៌មានលម្អិត និងទាញយករូបភាព"
                  >
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover/img:scale-108 transition duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold">
                        គ្មានរូបភាព
                      </div>
                    )}
                    
                    {/* Hover Overlay Hint */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition duration-300 flex items-center justify-center gap-2">
                      <span className="bg-white/95 text-gray-900 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg transform -translate-y-2 group-hover/img:translate-y-0 transition duration-300 flex items-center gap-1.5">
                        <span>🔍</span> មើលលម្អិត & រូបថត
                      </span>
                    </div>

                    {/* Top Badges & 1-Click Share */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span className={`${badgeBg} text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm uppercase tracking-wider`}>
                        {badgeText}
                      </span>
                      {Array.isArray(product.images) && product.images.length > 1 && (
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm pointer-events-auto">
                          <span>📸</span> {product.images.length}
                        </span>
                      )}
                    </div>

                    {/* Stock Tag Bottom */}
                    <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] px-2 py-0.5 rounded-md font-bold pointer-events-none">
                      {isOutOfStock ? 'អស់ស្តុក' : `ស្តុក: ${product.stock_qty}`}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="flex flex-col flex-1 justify-between">
                    <div>
                      {/* Category Tag */}
                      <span className="text-[10px] font-extrabold text-[#ff6a00] uppercase tracking-wider block mb-0.5">
                        {product.category || 'ម៉ូតស្បែកជើង'}
                      </span>

                      {/* Title */}
                      <h3 
                        onClick={() => handleAddToCartClick(product)}
                        className="font-black text-xs sm:text-sm text-gray-900 line-clamp-1 mb-1.5 group-hover:text-[#ff6a00] transition cursor-pointer"
                        title={product.name}
                      >
                        {product.name}
                      </h3>

                      {/* Rating & Sold Count Row */}
                      {(() => {
                        const fbStats = getProductFeedbackStats(product.id, product.name);
                        const soldNum = getProductSoldCount(product);
                        const ratingRound = Math.round(Number(fbStats.avg) || 5);
                        return (
                          <div className="flex items-center justify-between gap-1 mb-2.5">
                            <div 
                              onClick={(e) => { e.stopPropagation(); openFeedbackModal(product); }}
                              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition group/rating"
                              title="ចុចដើម្បីមើល ឬសរសេរ Feedback"
                            >
                              {/* ⭐️ Standard 5-Star Rating ⭐️ */}
                              <div className="flex items-center text-amber-400 text-[11px] sm:text-xs tracking-tighter">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span 
                                    key={star} 
                                    className={star <= ratingRound ? "text-amber-400 drop-shadow-[0_1px_1px_rgba(245,158,11,0.2)]" : "text-gray-200"}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-[11px] sm:text-xs font-black text-gray-800">{fbStats.avg}</span>
                              <span className="text-[10px] text-gray-400 font-bold">({fbStats.count} មតិ)</span>
                            </div>

                            {/* ⭐️ ចំនួនដែលបានលក់ចេញ (Sold Count) ⭐️ */}
                            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 whitespace-nowrap">
                              {t.soldCount || 'លក់បាន'} <span className="font-black text-gray-800">{soldNum}</span>
                            </span>
                          </div>
                        );
                      })()}

                      {/* Price (Retail & Wholesale with Discount Badges) */}
                      <div className="space-y-1.5 mb-3">
                        {/* Retail Price Row */}
                        {(() => {
                          const hasRetailDiscount = Boolean(product.retail_discount && parseFloat(product.retail_discount) > 0);
                          const finalRetail = hasRetailDiscount 
                            ? Math.max(0, (parseFloat(product.price) || 0) - parseFloat(product.retail_discount)) 
                            : (parseFloat(product.price) || 0);

                          return (
                            <div className="flex items-baseline justify-between gap-1">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-gray-400 text-[10px] font-bold">រាយ:</span>
                                <span className="text-[#ff6a00] font-black text-base sm:text-lg">
                                  ${finalRetail.toFixed(2)}
                                </span>
                                {hasRetailDiscount ? (
                                  <span className="text-gray-400 text-[11px] line-through font-bold">
                                    ${parseFloat(product.price).toFixed(2)}
                                  </span>
                                ) : null}
                              </div>
                              {hasRetailDiscount ? (
                                <span className="bg-red-50 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-red-200">
                                  ចុះ -${parseFloat(product.retail_discount).toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}

                        {/* Wholesale Price Row */}
                        {Boolean(product.wholesale_price && parseFloat(product.wholesale_price) > 0) ? (() => {
                          const hasWsDiscount = Boolean(product.wholesale_discount && parseFloat(product.wholesale_discount) > 0);
                          const finalWs = hasWsDiscount 
                            ? Math.max(0, parseFloat(product.wholesale_price) - parseFloat(product.wholesale_discount)) 
                            : parseFloat(product.wholesale_price);

                          return (
                            <div className="flex items-center justify-between bg-blue-50 border border-blue-200/80 px-2 py-1 rounded-xl text-blue-900">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[10px] font-black flex items-center gap-1">
                                  <span>📦</span> បោះដុំ:
                                </span>
                                <span className="text-xs font-black text-blue-700">
                                  ${finalWs.toFixed(2)}
                                </span>
                                {hasWsDiscount ? (
                                  <span className="text-[9px] text-gray-400 line-through font-bold">
                                    ${parseFloat(product.wholesale_price).toFixed(2)}
                                  </span>
                                ) : null}
                              </div>
                              {hasWsDiscount ? (
                                <span className="text-[9px] font-black text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                                  -${parseFloat(product.wholesale_discount).toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          );
                        })() : null}
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <button 
                      type="button"
                      onClick={() => handleAddToCartClick(product)}
                      disabled={isOutOfStock}
                      className={`w-full py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        isOutOfStock 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-[#312c5b] to-[#c85f2d] hover:from-[#252248] hover:to-[#b65426] text-white shadow-md shadow-purple-950/20 hover:shadow-lg hover:shadow-orange-500/25 active:scale-95'
                      }`}
                    >
                      <span>{isOutOfStock ? t('outOfStock', 'ដាច់ស្តុក') : t('addToCart', 'បញ្ចូលក្នុងកន្ត្រក')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ⭐️ 6. REAL CUSTOMER REVIEWS & TESTIMONIALS (ទំនុកចិត្តអតិថិជនពិត) ⭐️ */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
        <div className="bg-gradient-to-br from-white via-orange-50/20 to-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-black text-[#ff6a00] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">
              TESTIMONIALS
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-2">
              អតិថិជនពេញចិត្ត និងជឿជាក់លើ Sabay Luk
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              ជាង ១០,០០០+ ការកុម្ម៉ង់ត្រូវបានដឹកជញ្ជូនដល់ដៃអតិថិជនយ៉ាងរលូន
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs hover:border-orange-200 transition">
              <div className="flex items-center gap-1 text-amber-400 text-sm mb-3">★★★★★</div>
              <p className="text-xs text-gray-600 leading-relaxed font-medium mb-4">
                "ស្បែកជើងស្អាតដូចក្នុងរូបបេះបិទ! បាតទន់ពាក់ស្រួលជើងខ្លាំងណាស់។ កុម្ម៉ង់ថ្ងៃមុន ថ្ងៃនេះអ្នកដឹកយកមកដល់ផ្ទះលឿនមែនទែន!"
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff6a00] font-black text-xs flex items-center justify-center">
                  ស
                </div>
                <div>
                  <h5 className="font-black text-xs text-gray-900">សុខ វីរៈ (ភ្នំពេញ)</h5>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ បានទិញពិតប្រាកដ</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs hover:border-orange-200 transition">
              <div className="flex items-center gap-1 text-amber-400 text-sm mb-3">★★★★★</div>
              <p className="text-xs text-gray-600 leading-relaxed font-medium mb-4">
                "សេវាកម្មល្អណាស់! ពេលទិញមកខុស Size បន្តិច ឆាតទៅ Page ខាងហាងជួយប្តូរទំហំឱ្យភ្លាមដោយឥតគិតថ្លៃ ពេញចិត្តខ្លាំង!"
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-black text-xs flex items-center justify-center">
                  ច
                </div>
                <div>
                  <h5 className="font-black text-xs text-gray-900">ចាន់ណា (សៀមរាប)</h5>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ បានទិញពិតប្រាកដ</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs hover:border-orange-200 transition">
              <div className="flex items-center gap-1 text-amber-400 text-sm mb-3">★★★★★</div>
              <p className="text-xs text-gray-600 leading-relaxed font-medium mb-4">
                "ទំនិញតម្លៃសមរម្យ គុណភាពលើសពីការរំពឹងទុក។ អាចស្កេន KHQR ទូទាត់បានយ៉ាងស្រួល នឹងបន្តគាំទ្រទៀត!"
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-black text-xs flex items-center justify-center">
                  រ
                </div>
                <div>
                  <h5 className="font-black text-xs text-gray-900">រតនា (បាត់ដំបង)</h5>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ បានទិញពិតប្រាកដ</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ⭐️ 6.5. RECENTLY VIEWED PRODUCTS (ទំនិញដែលបានមើលថ្មីៗ - ធានាមិនឆ្លងហាងគ្នាដាច់ខាត) ⭐️ */}
      {(() => {
        const activeStoreId = currentStore?.id || getActiveStoreId();
        const scopedRecentlyViewed = (recentlyViewed || []).filter(p => isItemBelongsToStore(p, activeStoreId));
        if (scopedRecentlyViewed.length === 0) return null;

        return (
          <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-xs">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg">
                    👀
                  </span>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-gray-900 leading-tight">
                      ទំនិញដែលអ្នកបានមើលថ្មីៗ (Recently Viewed)
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      ទំនិញដែលអ្នកធ្លាប់បានចុចមើលមុននេះ ងាយស្រួលស្វែងរក និងទិញឡើងវិញ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearRecentlyViewed}
                  className="text-xs font-bold text-gray-400 hover:text-red-500 transition cursor-pointer flex items-center gap-1 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl"
                >
                  <span>🗑️</span> សម្អាត
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-gray-200">
                {scopedRecentlyViewed.map((prod) => {
                  const isOut = prod.stock_qty <= 0;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        const fullProd = products.find(p => p.id === prod.id) || prod;
                        handleAddToCartClick(fullProd);
                      }}
                      className="shrink-0 w-36 sm:w-44 bg-gray-50/70 hover:bg-white border border-gray-200 hover:border-orange-300 rounded-2xl p-2.5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-square bg-white rounded-xl overflow-hidden mb-2 relative border border-gray-100">
                          {prod.image_url ? (
                            <img 
                              src={prod.image_url} 
                              alt={prod.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                              គ្មានរូបភាព
                            </div>
                          )}
                          {isOut && (
                            <span className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                              ដាច់ស្តុក
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block truncate">
                          {prod.category || 'ទូទៅ'}
                        </span>
                        <h4 className="font-black text-xs text-gray-900 truncate group-hover:text-orange-600 transition" title={prod.name}>
                          {prod.name}
                        </h4>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="font-black text-xs text-orange-600">
                          ${parseFloat(prod.price || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-lg group-hover:bg-[#ff6a00] group-hover:text-white transition">
                          មើល ➔
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ⭐️ 7. FLOATING QUICK CONTACT (TELEGRAM, MESSENGER, TIKTOK & CALL) ⭐️ */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2 select-none">
        
        {/* Expanded Social Channels Menu */}
        {isSocialMenuOpen && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Telegram Button */}
            {storeSettings.telegram && (
              <a 
                href={(() => {
                  const rawTg = (storeSettings.telegram || '').replace(/^@/, '').trim();
                  const cleanTg = rawTg.toLowerCase() === 'sabayluk' ? 'sabay_luk' : rawTg;
                  return cleanTg.startsWith('http') ? cleanTg : `https://t.me/${cleanTg}`;
                })()}
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#229ED9] hover:bg-[#1d8bc0] text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition text-xs font-black"
                title="ឆាតតាម Telegram"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.3-.6.3l.2-3.05 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.87 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.46c.536-.194 1.006.131.837.932z"/>
                </svg>
                <span>ឆាត Telegram</span>
              </a>
            )}

            {/* Facebook Messenger Button */}
            {storeSettings.facebook && (
              <a 
                href={storeSettings.facebook.startsWith('http') ? storeSettings.facebook : `https://facebook.com/${storeSettings.facebook}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#1877F2] hover:bg-[#166fe5] text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition text-xs font-black"
                title="Messenger / Facebook"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.303 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.259 5.888-3.259-6.559 6.963z"/>
                </svg>
                <span>Facebook / Chat</span>
              </a>
            )}

            {/* TikTok Button */}
            {storeSettings.tiktok && (
              <a 
                href={storeSettings.tiktok.startsWith('http') ? storeSettings.tiktok : `https://tiktok.com/@${storeSettings.tiktok.replace(/^@/, '')}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-black hover:bg-gray-800 text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition text-xs font-black border border-gray-700"
                title="TikTok Store"
              >
                <span className="text-sm">🎵</span>
                <span>TikTok ហាង</span>
              </a>
            )}

            {/* Phone Call Button */}
            {storeSettings.phone && (
              <a 
                href={`tel:${(storeSettings.phone || '').replace(/\s+/g, '')}`} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition text-xs font-black"
                title="ខលមកកាន់ហាង"
              >
                <span className="text-sm">📞</span>
                <span>ហៅទូរស័ព្ទ: {storeSettings.phone}</span>
              </a>
            )}
          </div>
        )}

        {/* Master Floating Toggle Button */}
        <button
          type="button"
          onClick={() => setIsSocialMenuOpen(prev => !prev)}
          style={{ backgroundColor: brandColor }}
          className="text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition cursor-pointer group"
          title="ទាក់ទងមកកាន់ហាង"
        >
          <div className="relative">
            <span className="text-lg">💬</span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white animate-pulse"></span>
          </div>
          <span className="text-xs font-black tracking-wide hidden sm:inline">
            {isSocialMenuOpen ? 'បិទម៉ឺនុយ' : 'ទាក់ទងហាង'}
          </span>
          <span className="text-xs opacity-75">{isSocialMenuOpen ? '✕' : '▲'}</span>
        </button>
      </div>

      {/* ⭐️ 8. ផ្ទាំងបង្ហាញព័ត៌មានលម្អិតទំនិញស្តង់ដារ & ទាញយករូបភាព (STANDARD PRODUCT DETAILS & DOWNLOAD MODAL) ⭐️ */}
      {variantModalOpen && selectedProductForVariant && (
        <div 
          onClick={handleCloseVariantModal}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95"
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-[#ff6a00] text-xs font-black px-2.5 py-1 rounded-xl uppercase">
                  {selectedProductForVariant.category || 'ម៉ូតស្បែកជើង'}
                </span>
                <span className="text-gray-400 text-xs font-bold">
                  SKU: <span className="text-gray-800">{selectedProductForVariant.sku || 'N/A'}</span>
                </span>
              </div>
              <button 
                type="button"
                onClick={handleCloseVariantModal}
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center font-bold text-sm shadow-xs transition cursor-pointer"
                title="បិទ (Close)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 2 Columns Layout */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* 📷 LEFT COLUMN: Interactive Photo Gallery & Download Suite */}
              <div className="md:col-span-6 flex flex-col">
                
                {/* Main Large Image Container */}
                <div className="relative aspect-square w-full bg-gray-50 rounded-3xl overflow-hidden border border-gray-200 group flex items-center justify-center shadow-inner">
                  <img 
                    src={modalActiveImage || selectedProductForVariant.image_url || '/placeholder.png'} 
                    alt={selectedProductForVariant.name}
                    decoding="async"
                    className="w-full h-full object-contain p-2 transition duration-300"
                  />

                  {/* Previous / Next Controls */}
                  {modalAllImages.length > 1 && (
                    <>
                      <button 
                        type="button"
                        onClick={() => {
                          const currIdx = modalAllImages.indexOf(modalActiveImage);
                          const prevIdx = (currIdx - 1 + modalAllImages.length) % modalAllImages.length;
                          setModalActiveImage(modalAllImages[prevIdx]);
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-lg font-bold shadow-lg transition"
                      >
                        ‹
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const currIdx = modalAllImages.indexOf(modalActiveImage);
                          const nextIdx = (currIdx + 1) % modalAllImages.length;
                          setModalActiveImage(modalAllImages[nextIdx]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-lg font-bold shadow-lg transition"
                      >
                        ›
                      </button>
                      <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
                        {modalAllImages.indexOf(modalActiveImage) + 1} / {modalAllImages.length}
                      </span>
                    </>
                  )}
                </div>

                {/* ⬇️ DOWNLOAD ACTION BAR (ទាញយករូបភាព) ⭐️ */}
                <div className="mt-3.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Download Current Image */}
                    <button
                      type="button"
                      onClick={() => {
                        const currImg = modalActiveImage || selectedProductForVariant.image_url;
                        const idx = modalAllImages.indexOf(modalActiveImage);
                        const ext = currImg ? currImg.split('.').pop()?.split('?')[0] || 'jpg' : 'jpg';
                        downloadSingleImage(currImg, `${selectedProductForVariant.name}_photo_${idx >= 0 ? idx + 1 : 1}.${ext}`);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-2.5 px-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                    >
                      <span>📥</span>
                      <span>ទាញយករូបនេះ</span>
                    </button>

                    {/* Download All Images */}
                    <button
                      type="button"
                      disabled={isDownloadingAll || modalAllImages.length === 0}
                      onClick={() => downloadAllProductImages(modalAllImages, selectedProductForVariant.name)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <span>📦</span>
                      <span>{isDownloadingAll ? 'កំពុងទាញយក...' : `ទាញយកទាំងអស់ (${modalAllImages.length})`}</span>
                    </button>
                  </div>

                  {downloadSuccessMsg && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center animate-in fade-in">
                      {downloadSuccessMsg}
                    </div>
                  )}
                </div>

                {/* Thumbnails Row */}
                {modalAllImages.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto py-1">
                    {modalAllImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative group/thumb shrink-0">
                        <button
                          type="button"
                          onClick={() => setModalActiveImage(imgUrl)}
                          className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 transition block ${
                            modalActiveImage === imgUrl ? 'border-[#ff6a00] ring-3 ring-orange-200 scale-105 shadow-md' : 'border-gray-200 hover:border-gray-400 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingleImage(imgUrl, `${selectedProductForVariant.name}_thumb_${idx + 1}.jpg`);
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-[10px] shadow opacity-0 group-hover/thumb:opacity-100 transition duration-200"
                          title="ទាញយករូបនេះ"
                        >
                          ↓
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 📋 RIGHT COLUMN: Full Product Information, Specs & Actions (md:col-span-6) */}
              <div className="md:col-span-6 flex flex-col justify-between space-y-5">
                
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                      {selectedProductForVariant.name}
                    </h2>
                  </div>

                  {/* 💰 PRICING DISPLAY (RETAIL & WHOLESALE WITH REAL DISCOUNTS) */}
                  {(() => {
                    const hasRetailDisc = Boolean(selectedProductForVariant.retail_discount && parseFloat(selectedProductForVariant.retail_discount) > 0);
                    const finalRetailPrice = hasRetailDisc 
                      ? Math.max(0, (parseFloat(selectedProductForVariant.price) || 0) - parseFloat(selectedProductForVariant.retail_discount)) 
                      : (parseFloat(selectedProductForVariant.price) || 0);

                    const hasWsDisc = Boolean(selectedProductForVariant.wholesale_discount && parseFloat(selectedProductForVariant.wholesale_discount) > 0);
                    const finalWsPrice = hasWsDisc 
                      ? Math.max(0, parseFloat(selectedProductForVariant.wholesale_price) - parseFloat(selectedProductForVariant.wholesale_discount)) 
                      : (parseFloat(selectedProductForVariant.wholesale_price) || 0);

                    return (
                      <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-3">
                        {/* Retail Price */}
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-bold text-gray-500 block">តម្លៃលក់រាយ (Retail):</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span className="text-[#ff6a00] font-black text-3xl">
                                ${finalRetailPrice.toFixed(2)}
                              </span>
                              {hasRetailDisc ? (
                                <span className="text-gray-400 text-sm line-through font-bold">
                                  ${parseFloat(selectedProductForVariant.price).toFixed(2)}
                                </span>
                              ) : null}
                              {hasRetailDisc ? (
                                <span className="bg-red-50 text-red-600 text-xs font-black px-2 py-0.5 rounded-lg border border-red-200">
                                  ចុះតម្លៃ -${parseFloat(selectedProductForVariant.retail_discount).toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <span className="text-xs font-black text-gray-500 bg-white px-2.5 py-1 rounded-xl border border-orange-200">
                            ≈ {(finalRetailPrice * 4100).toLocaleString()} ៛
                          </span>
                        </div>

                        {/* Wholesale Price (តម្លៃបោះដុំ) */}
                        {selectedProductForVariant.wholesale_price && parseFloat(selectedProductForVariant.wholesale_price) > 0 && (
                          <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between text-blue-950">
                            <div>
                              <span className="text-xs font-black uppercase flex items-center gap-1.5 text-blue-900">
                                <span>📦</span> តម្លៃបោះដុំ (Wholesale Price):
                              </span>
                              <span className="text-[10px] text-blue-600 block">សម្រាប់អតិថិជនទិញបោះដុំ ឬលក់បន្ត</span>
                            </div>
                            <div className="text-right">
                              <div className="flex items-baseline gap-2 justify-end">
                                <span className="text-xl font-black text-blue-700">
                                  ${finalWsPrice.toFixed(2)}
                                </span>
                                {hasWsDisc ? (
                                  <span className="text-xs text-gray-400 line-through font-bold">
                                    ${parseFloat(selectedProductForVariant.wholesale_price).toFixed(2)}
                                  </span>
                                ) : null}
                              </div>
                              {hasWsDisc ? (
                                <span className="text-[10px] font-black text-blue-600">
                                  ចុះពិសេស -${parseFloat(selectedProductForVariant.wholesale_discount).toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 📦 Stock Status Badge (ដាក់នៅលើ 🎨 ពណ៌ Color) */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl border ${
                      selectedProductForVariant.stock_qty > 0 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${selectedProductForVariant.stock_qty > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                      <span>{selectedProductForVariant.stock_qty > 0 ? `• មានក្នុងស្តុក (${selectedProductForVariant.stock_qty})` : '• ដាច់ស្តុក'}</span>
                    </span>
                  </div>

                  {/* Color Selector */}
                  {selectedProductForVariant.color && (
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 mb-2 uppercase tracking-wider">
                        🎨 ពណ៌ (Color): <span className="text-orange-600 font-black">{modalSelectedColor || 'ធម្មតា'}</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedProductForVariant.color.split(',').map((clr, idx) => {
                          const trimmedClr = clr.trim();
                          const isSelected = modalSelectedColor === trimmedClr;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setModalSelectedColor(trimmedClr);
                                const variantsForClr = currentProductVariants.filter(v => !v.color || v.color.trim().toLowerCase() === trimmedClr.toLowerCase());
                                const stillHasSize = variantsForClr.some(v => v.size === modalSelectedSize);
                                if (!stillHasSize && variantsForClr.length > 0) {
                                  const firstInStock = variantsForClr.find(v => v.stock_qty > 0) || variantsForClr[0];
                                  setModalSelectedSize(firstInStock.size);
                                }
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#ff6a00] text-white border-[#ff6a00] shadow-sm scale-105' 
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {trimmedClr}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Size Selector - ត្រងតាមពណ៌ មិនឱ្យចេញ Size ស្ទួនឡើយ */}
                  {(() => {
                    const filteredVariants = modalSelectedColor
                      ? currentProductVariants.filter(v => !v.color || v.color.trim().toLowerCase() === modalSelectedColor.trim().toLowerCase())
                      : currentProductVariants;

                    const displayVariants = filteredVariants.length > 0 ? filteredVariants : currentProductVariants;

                    return (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                            👟 ទំហំ (Select Size): <span className="text-orange-600 font-black">{modalSelectedSize || 'មិនទាន់រើស'}</span>
                          </label>
                          <span className="text-[11px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                            {displayVariants.length > 0 ? `មាន ${displayVariants.length} ទំហំ` : 'ជ្រើសរើសទំហំដែលត្រូវ'}
                          </span>
                        </div>

                        {displayVariants.length === 0 ? (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 text-center">
                            ទំនិញនេះជា Free Size (ទំហំស្តង់ដារ)
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {displayVariants.map((v, idx) => {
                              const isSelected = modalSelectedSize === v.size;
                              const isOut = v.stock_qty <= 0;

                              return (
                                <button
                                  key={v.id || idx}
                                  type="button"
                                  disabled={isOut}
                                  onClick={() => setModalSelectedSize(v.size)}
                                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                                    isSelected
                                      ? 'border-[#ff6a00] bg-orange-50/80 text-[#ff6a00] font-black ring-2 ring-[#ff6a00] shadow-xs'
                                      : isOut
                                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                      : 'border-gray-200 bg-white hover:border-orange-300 text-gray-800 font-bold'
                                  }`}
                                >
                                  <span className="text-sm font-black">{v.size}</span>
                                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-[#ff6a00] font-bold' : isOut ? 'text-red-500' : 'text-gray-400'}`}>
                                    {isOut ? 'អស់ស្តុក' : `នៅសល់: ${v.stock_qty}`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  

                  {/* Quantity Counter */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                    <div>
                      <span className="block text-xs font-extrabold text-gray-800">ចំនួនកុម្ម៉ង់ (Quantity)</span>
                      <span className="text-[11px] text-gray-500">ទឹកប្រាក់សរុប: <span className="font-bold text-orange-600">${(selectedProductForVariant.price * modalQty).toFixed(2)}</span></span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-gray-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setModalQty(prev => Math.max(1, prev - 1))}
                        className="w-7 h-7 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 rounded-lg text-base"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black text-sm text-gray-800">{modalQty}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const sel = currentProductVariants.find(v => v.size === modalSelectedSize);
                          const max = sel ? sel.stock_qty : selectedProductForVariant.stock_qty;
                          if (modalQty < max) setModalQty(prev => prev + 1);
                          else alert(`ស្តុក Size នេះមានត្រឹមតែ ${max} ប៉ុណ្ណោះ!`);
                        }}
                        className="w-7 h-7 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 rounded-lg text-base"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 🛒 ACTION BUTTONS (ADD TO CART & BUY NOW) */}
                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmVariantToCart}
                    className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-[#312c5b] to-[#c85f2d] hover:from-[#252248] hover:to-[#b65426] text-white shadow-md shadow-purple-950/20 hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{t('addToCart', 'បញ្ចូលក្នុងកន្ត្រក')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBuyNowFromModal}
                    className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-[#ff6a00] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white shadow-lg shadow-orange-500/25 active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <span>⚡</span>
                    <span>បញ្ជាទិញឥឡូវនេះ</span>
                  </button>
                </div>

                {/* ⭐️ CUSTOMER FEEDBACK RATING (ពង្រីកធំៗ & ដាក់នៅក្រោម Button បញ្ជាទិញ) ⭐️ */}
                <div className="pt-3 border-t border-gray-100 flex items-center gap-3">
                  <span className="text-amber-400 text-lg sm:text-xl tracking-wider">★★★★★</span>
                  {(() => {
                    const fbStats = getProductFeedbackStats(selectedProductForVariant.id, selectedProductForVariant.name);
                    return (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-black text-gray-900">{fbStats.avg}</span>
                        <button
                          type="button"
                          onClick={() => openFeedbackModal(selectedProductForVariant)}
                          className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-black underline cursor-pointer"
                        >
                          ({fbStats.count} មតិយោបល់អតិថិជន)
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* 📤 Social Share Bar (Telegram, Facebook, Copy Link & Image Share) */}
                <div className="bg-gray-50 border border-gray-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                    <span>📤</span> ចែករំលែកទំនិញ៖
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleShareProduct(e, selectedProductForVariant, 'telegram')}
                      className="bg-[#24A1DE] hover:bg-[#1f8ec4] text-white px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                      title="ផ្ញើទៅកាន់ Telegram (ភ្ជាប់រូបភាព & Link ស្វ័យប្រវត្តិ)"
                    >
                      <span>✈️</span> Telegram
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShareProduct(e, selectedProductForVariant, 'image_file')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                      title="Share រូបភាពពិត (Mobile & Telegram/Chat Apps)"
                    >
                      <span>🖼️</span> Share រូប
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShareProduct(e, selectedProductForVariant, 'facebook')}
                      className="bg-[#1877F2] hover:bg-[#166fe5] text-white px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                      title="ចែករំលែកលើ Facebook"
                    >
                      <span>📘</span> Facebook
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShareProduct(e, selectedProductForVariant, 'copy')}
                      className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                      title="ចម្លង Link"
                    >
                      <span>📋</span> ចម្លង Link
                    </button>
                  </div>
                </div>

              </div>

              {/* 📝 DETAILS: ALIBABA 1688 STYLE FULL DETAIL SECTION ⭐️ */}
              {(() => {
                const embedUrl = getYouTubeEmbedUrl(selectedProductForVariant.video_url);
                const detailImgs = (selectedProductForVariant.detail_images && selectedProductForVariant.detail_images.length > 0)
                  ? selectedProductForVariant.detail_images
                  : [];

                // បើគ្មាន Video ហើយក៏គ្មាន Detail Images មិនបាច់បង្ហាញទេ (មិនទាញរូបភាពពីខាងលើមកទៀតឡើយ តាមការស្នើសុំរបស់បង)
                if (!embedUrl && detailImgs.length === 0) return null;

                return (
                  <div className="col-span-1 md:col-span-12 pt-8 mt-6 border-t-2 border-slate-200/90 space-y-6">
                    
                    {/* 1. Header: Details: (ទំហំតូចជាងមុន 20% max-w-[560px] mx-auto) */}
                    <div className="w-full max-w-[560px] mx-auto flex items-center justify-between pb-3 border-b-2 border-slate-900">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-6 bg-[#ff6a00] rounded-full inline-block"></span>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                          Details:
                        </h3>
                        <span className="text-xs sm:text-sm font-bold text-slate-500">
                          ពត៌មានលម្អិត & រូបភាពជាក់ស្តែង (1688 Style)
                        </span>
                      </div>

                      {detailImgs.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isDownloadingAll}
                            onClick={() => downloadAllProductImages(detailImgs, `${selectedProductForVariant.name}_details`)}
                            className="bg-white hover:bg-orange-50 text-slate-800 hover:text-[#ff6a00] border border-slate-300 hover:border-orange-300 px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <span>📥</span>
                            <span>{isDownloadingAll ? 'ទាញយក...' : `ទាញយកទាំងអស់ (${detailImgs.length})`}</span>
                          </button>
                          <span className="text-xs font-black text-white bg-[#ff6a00] px-2.5 py-1 rounded-full shadow-xs">
                            {detailImgs.length} សន្លឹក
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 2. Centered Body: YouTube Video + 1 Photo Per Row (20% Smaller: max-w-[560px] mx-auto) */}
                    <div className="w-full max-w-[560px] mx-auto space-y-5">
                      
                      {/* 🎬 វីដេអូ YouTube ចំកណ្តាល (បង្ហាញនៅខាងក្រោម Details:) */}
                      {embedUrl && (
                        <div className="w-full space-y-2">
                          <div className="flex items-center justify-center gap-2 text-xs font-black text-slate-700 bg-red-50 py-1.5 px-3 rounded-xl border border-red-100 w-fit mx-auto shadow-2xs">
                            <span className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center text-[10px] shadow-xs">▶</span>
                            <span>វីដេអូបង្ហាញផលិតផលជាក់ស្តែង (Product Video)</span>
                          </div>
                          <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-xl border-2 border-slate-200 bg-black">
                            <iframe
                              src={embedUrl}
                              title={`YouTube Video - ${selectedProductForVariant.name}`}
                              className="absolute inset-0 w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}

                      {/* 📸 រូបភាពផលិតផល Detail Images (1 ជួរ 1 សន្លឹក មិនទាញរូបខាងលើ តូចជាងមុន 20%) */}
                      {detailImgs.length > 0 && (
                        <div className="w-full space-y-4 pt-1">
                          {detailImgs.map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="group relative w-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-md transition-all duration-300 hover:shadow-2xl flex flex-col"
                            >
                              {/* Image 1 per row */}
                              <div
                                onClick={() => setReviewZoomPhoto(imgUrl)}
                                className="relative w-full cursor-zoom-in bg-white flex items-center justify-center overflow-hidden"
                              >
                                <img
                                  src={imgUrl}
                                  alt={`${selectedProductForVariant.name} - Details photo ${idx + 1}`}
                                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                                  loading="lazy"
                                />
                                {/* Zoom overlay on hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center pointer-events-none">
                                  <span className="opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 bg-black/85 backdrop-blur-sm text-white text-xs font-black px-4 py-2 rounded-2xl flex items-center gap-2 shadow-2xl">
                                    <span>🔍</span>
                                    <span>ចុចពង្រីកមើលរូបធំ HD (#{idx + 1})</span>
                                  </span>
                                </div>
                              </div>

                              {/* Float Badges & Single Image Download */}
                              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                <span className="bg-black/75 backdrop-blur-sm text-white text-xs font-mono font-black px-3 py-1.5 rounded-xl shadow-md">
                                  #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const ext = imgUrl.split('.').pop()?.split(/\#|\?/)[0] || 'jpg';
                                    downloadSingleImage(imgUrl, `${selectedProductForVariant.name}_detail_${idx + 1}.${ext}`);
                                  }}
                                  className="h-8 px-3 rounded-xl bg-white/95 hover:bg-white text-slate-900 shadow-md flex items-center gap-1.5 text-xs font-bold transition hover:scale-105 active:scale-95 cursor-pointer border border-slate-200"
                                  title="ទាញយករូបនេះ"
                                >
                                  <span>📥</span>
                                  <span>ទាញយក</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                );
              })()}

            </div>

          </div>
        </div>
      )}

      {/* ⭐️ 9. CART DRAWER (កន្រ្តកទំនិញស្តង់ដារ) ⭐️ */}
      {isCartOpen && (
        <div 
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 cursor-default"
          >
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛒</span>
                <h2 className="text-lg font-black text-gray-900">កន្រ្តកទំនិញ ({cart.reduce((s, i) => s + i.qty, 0)})</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-24 text-gray-400">
                  <div className="text-4xl mb-3">🛍️</div>
                  <p className="text-sm font-bold">កន្រ្តកទំនិញរបស់អ្នកទទេរ។</p>
                  <p className="text-xs text-gray-400 mt-1">សូមជ្រើសរើសទំនិញដែលអ្នកពេញចិត្ត!</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartItemId} className="flex items-center gap-3.5 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                    <img 
                      src={item.image_url || '/placeholder.png'} 
                      alt={item.name} 
                      className="w-16 h-16 object-cover rounded-xl bg-white border border-gray-200 flex-shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-gray-900 truncate">{item.name}</h4>
                      
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.size && (
                          <span className="text-[10px] bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-bold">
                            Size: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="text-[10px] bg-orange-100/70 text-orange-700 px-1.5 py-0.5 rounded font-bold">
                            {item.color}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-black text-[#ff6a00]">${item.price}</span>
                        <div className="flex items-center gap-2 bg-white px-2 py-0.5 rounded-lg border border-gray-200">
                          <button 
                            onClick={() => updateCartQty(item.cartItemId, -1)} 
                            className="w-5 h-5 flex items-center justify-center text-gray-500 font-bold hover:bg-gray-100 rounded text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                          <button 
                            onClick={() => updateCartQty(item.cartItemId, 1)} 
                            className="w-5 h-5 flex items-center justify-center text-gray-500 font-bold hover:bg-gray-100 rounded text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between self-stretch">
                      <button 
                        onClick={() => removeFromCart(item.cartItemId)} 
                        className="text-gray-300 hover:text-red-500 font-bold text-xs p-1"
                      >
                        ✕
                      </button>
                      <span className="font-black text-xs text-gray-900">
                        ${(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-gray-100 mt-3 space-y-3">
                <div className="bg-emerald-50 text-emerald-700 text-[11px] p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                  <span>🚚</span>
                  <span>ប្រូម៉ូសិនពិសេស៖ ដឹកជញ្ជូនឥតគិតថ្លៃគ្រប់ទីកន្លែង!</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>សរុបទំនិញ (Subtotal):</span>
                    <span className="font-bold text-gray-800">${subtotalPrice.toFixed(2)}</span>
                  </div>
                  {appliedCoupon && couponDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
                      <span>បញ្ចុះតម្លៃ Promo Code ({appliedCoupon.code}):</span>
                      <span>-${couponDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {isTaxEnabled && taxAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-blue-600 font-bold">
                      <span>ពន្ធអាករ (VAT {taxRatePercent}%):</span>
                      <span>{taxMode === 'inclusive' ? '(រួមបញ្ចូល) ' : '+'}${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>សរុបប្រាក់រៀល:</span>
                    <span className="font-bold text-gray-800">{totalRiel.toLocaleString()} ៛</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-gray-200">
                    <span className="font-black text-sm text-gray-900">ទឹកប្រាក់ត្រូវទូទាត់:</span>
                    <span className="text-xl text-[#ff6a00] font-black">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutModalOpen(true);
                  }}
                  className="w-full bg-[#ff6a00] hover:bg-[#ea580c] text-white py-3.5 rounded-2xl font-black text-sm active:scale-98 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <span>💳</span>
                  <span>បន្តទៅការកុម្ម៉ង់ (Proceed to Checkout)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

            {/* 🗺️ Location Picker Modal (Interactive OpenStreetMap) */}
      <LocationPickerModal
        isOpen={showMapPickerModal}
        onClose={() => setShowMapPickerModal(false)}
        onConfirm={({ mapUrl, addressDetails, fullFormattedAddress, province }) => {
          setGoogleMapUrl(mapUrl);
          if (province) setCustomerProvince(province);
          if (fullFormattedAddress) setCustomerAddress(fullFormattedAddress);
          if (addressDetails) setConfirmedLocationDetails(addressDetails);
        }}
        initialUrl={googleMapUrl}
        selectedProvince={customerProvince}
      />

{/* ⭐️ 10. FULL-OPTION CHECKOUT MODAL (REDESIGNED LUXURY E-COMMERCE STANDARD) ⭐️ */}
      {checkoutModalOpen && (
        <div 
          onClick={() => setCheckoutModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative max-h-[94vh] flex flex-col overflow-hidden border border-slate-150 animate-in zoom-in-95 duration-200 cursor-default"
          >
            
            {/* 🌟 1. MODAL HEADER WITH PROGRESS BAR */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl shadow-inner">
                  🛍️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                      បញ្ជាក់ការបញ្ជាទិញ (Checkout Order)
                    </h3>
                    <span className="hidden sm:inline-flex text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      ជំហានចុងក្រោយ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    សូមបំពេញព័ត៌មានដឹកជញ្ជូន និងជ្រើសរើសវិធីសងប្រាក់
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-rose-500 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
                title="បិទផ្ទាំង"
              >
                ✕
              </button>
            </div>

            {/* 🌟 2. MODAL BODY (MODERN 2-COLUMN RESPONSIVE GRID) */}
            <form onSubmit={handleProcessOrder} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 👈 LEFT COLUMN: 📍 DELIVERY INFO & 💳 PAYMENT METHOD (Cols: 7) */}
                <div className="lg:col-span-7 space-y-5">
                  
                  {/* CARD 1: 📍 ព័ត៌មានអ្នកទទួល និងទីតាំងដឹកជញ្ជូន */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 font-black text-xs flex items-center justify-center">1</span>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          ព័ត៌មានអ្នកទទួល & ទីតាំងដឹកជញ្ជូន
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">* ចាំបាច់បំពេញ</span>
                    </div>

                    {/* Full Name & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                          <span>👤</span> ឈ្មោះអ្នកទទួល <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text"
                          required
                          placeholder="ឧ. សេង សុខា..."
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/15 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition shadow-2xs placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                          <span>📞</span> លេខទូរស័ព្ទទំនាក់ទំនង <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="tel"
                          required
                          placeholder="ឧ. 012 345 678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/15 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition shadow-2xs placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Contact: Telegram & Gmail (Distinct inputs) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sky-500">✈️</span> <span>គណនី Telegram</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">ស្រេចចិត្ត</span>
                        </label>
                        <input 
                          type="text"
                          placeholder="ឧ. @username ឬ លេខទូរស័ព្ទ Telegram"
                          value={customerTelegram}
                          onChange={(e) => setCustomerTelegram(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/15 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition shadow-2xs placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="text-rose-500">✉️</span> <span>Gmail / Email</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">ស្រេចចិត្ត</span>
                        </label>
                        <input 
                          type="email"
                          placeholder="ឧ. customer@gmail.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/15 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition shadow-2xs placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Province & Detailed Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                          <span>🏛️</span> រាជធានី / ខេត្ត <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={customerProvince}
                          onChange={(e) => setCustomerProvince(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/15 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition shadow-2xs cursor-pointer"
                        >
                          <option value="ភ្នំពេញ">ភ្នំពេញ (Phnom Penh)</option>
                          <option value="កណ្តាល">កណ្តាល (Kandal)</option>
                          <option value="សៀមរាប">សៀមរាប (Siem Reap)</option>
                          <option value="បាត់ដំបង">បាត់ដំបង (Battambang)</option>
                          <option value="ព្រះសីហនុ">ព្រះសីហនុ (Preah Sihanouk)</option>
                          <option value="កំពង់ចាម">កំពង់ចាម (Kampong Cham)</option>
                          <option value="កំពង់ឆ្នាំង">កំពង់ឆ្នាំង (Kampong Chhnang)</option>
                          <option value="កំពង់ស្ពឺ">កំពង់ស្ពឺ (Kampong Speu)</option>
                          <option value="កំពង់ធំ">កំពង់ធំ (Kampong Thom)</option>
                          <option value="កំពត">កំពត (Kampot)</option>
                          <option value="កែប">កែប (Kep)</option>
                          <option value="កោះកុង">កោះកុង (Koh Kong)</option>
                          <option value="ក្រចេះ">ក្រចេះ (Kratie)</option>
                          <option value="មណ្ឌលគិរី">មណ្ឌលគិរី (Mondulkiri)</option>
                          <option value="ឧត្តរមានជ័យ">ឧត្តរមានជ័យ (Oddar Meanchey)</option>
                          <option value="ប៉ៃលិន">ប៉ៃលិន (Pailin)</option>
                          <option value="ព្រះវិហារ">ព្រះវិហារ (Preah Vihear)</option>
                          <option value="ព្រៃវែង">ព្រៃវែង (Prey Veng)</option>
                          <option value="ពោធិ៍សាត់">ពោធិ៍សាត់ (Pursat)</option>
                          <option value="រតនគិរី">រតនគិរី (Ratanakiri)</option>
                          <option value="ស្ទឹងត្រែង">ស្ទឹងត្រែង (Stung Treng)</option>
                          <option value="ស្វាយរៀង">ស្វាយរៀង (Svay Rieng)</option>
                          <option value="តាកែវ">តាកែវ (Takeo)</option>
                          <option value="ត្បូងឃ្មុំ">ត្បូងឃ្មុំ (Tboung Khmum)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                          <span>🏠</span> អាសយដ្ឋានលម្អិត / ផ្ទះលេខ / ផ្លូវ <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text"
                          required
                          placeholder="ផ្ទះលេខ, ផ្លូវ, សង្កាត់/ឃុំ, ខណ្ឌ/ស្រុក..."
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-[#ff6a00] focus:ring-2 focus:ring-orange-500/15 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none transition shadow-2xs placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* SMART DELIVERY ASSIST: GOOGLE MAPS & HOUSE PHOTO */}
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          🚀 ជំនួយការដឹកជញ្ជូនរហ័ស (Smart Delivery Assist)
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">ស្រេចចិត្ត</span>
                      </div>

                      {/* Google Maps Pin Link */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>🗺️</span> <span>ទីតាំងផែនទី Google Maps (សម្រាប់អ្នកដឹកជញ្ជូន)</span>
                          </label>
                          <div>
                            <button
                              type="button"
                              onClick={() => setShowMapPickerModal(true)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                            >
                              <span>🗺️</span>
                              <span>រើសទីតាំងលើផែនទី</span>
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type="url"
                            placeholder="ចុចប៊ូតុង «រើសទីតាំងលើផែនទី» ខាងលើ ឬបិទភ្ជាប់ (Paste) Link នៅទីនេះ..."
                            value={googleMapUrl}
                            onChange={(e) => setGoogleMapUrl(e.target.value)}
                            className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 pr-16 transition"
                          />
                          {googleMapUrl && (
                            <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                              <a
                                href={googleMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-lg hover:bg-emerald-200 transition"
                              >
                                មើល
                              </a>
                              <button
                                type="button"
                                onClick={() => setGoogleMapUrl('')}
                                className="text-slate-400 hover:text-rose-500 text-xs px-1 cursor-pointer font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        {googleMapUrl && (
                          <div className="space-y-2 pt-1">
                            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <span>✅</span> បានកំណត់ Link ទីតាំង Google Maps រួចរាល់!
                            </p>

                            {/* ⭐️ ការបញ្ជាក់ទីតាំងច្បាស់លាស់ (ផ្លូវ, ភូមិ, សង្កាត់, ឃុំ, ខណ្ឌ, ក្រុង) ⭐️ */}
                            {confirmedLocationDetails && (
                              <div className="p-3 bg-emerald-50/90 rounded-2xl border border-emerald-200 text-xs space-y-1.5 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-emerald-900 text-[11px] flex items-center gap-1.5">
                                    <span>📍</span> ព័ត៌មានទីតាំងបញ្ជាក់លម្អិត៖
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowMapPickerModal(true)}
                                    className="text-[10px] text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer"
                                  >
                                    ✏️ កែប្រែ
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                                  <div>
                                    <span className="text-gray-500 font-bold">ផ្លូវ/ផ្ទះលេខ:</span>{' '}
                                    <span className="font-black text-gray-800">{confirmedLocationDetails.street || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 font-bold">ភូមិ:</span>{' '}
                                    <span className="font-black text-gray-800">{confirmedLocationDetails.village || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 font-bold">សង្កាត់/ឃុំ:</span>{' '}
                                    <span className="font-black text-gray-800">{confirmedLocationDetails.sangkat || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 font-bold">ខណ្ឌ/ស្រុក:</span>{' '}
                                    <span className="font-black text-gray-800">{confirmedLocationDetails.district || 'N/A'}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-500 font-bold">រាជធានី/ខេត្ត:</span>{' '}
                                    <span className="font-black text-emerald-800">{confirmedLocationDetails.province || customerProvince}</span>
                                  </div>
                                  {confirmedLocationDetails.landmark && (
                                    <div className="col-span-2 text-[10px] text-gray-600 bg-white/70 p-1.5 rounded-lg border border-emerald-100">
                                      <span className="font-bold">ចំណាំ:</span> {confirmedLocationDetails.landmark}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* House Photo Upload */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span>🏠</span> <span>រូបថតផ្ទះ ឬកន្លែងទទួល (ជួយអ្នកដឹកស្គាល់ច្រកចូល)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">ស្រេចចិត្ត</span>
                        </label>

                        {locationPhotoPreview ? (
                          <div className="flex items-center gap-3 p-2 bg-emerald-50/60 rounded-xl border border-emerald-200">
                            <img
                              src={locationPhotoPreview}
                              alt="House / Workplace"
                              className="w-14 h-14 object-cover rounded-lg border border-emerald-300 shrink-0 bg-white"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {locationPhotoFile ? locationPhotoFile.name : 'រូបថតទីតាំង'}
                              </p>
                              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✅ បានជ្រើសរើសរូបថតទីតាំង</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setLocationPhotoFile(null);
                                  setLocationPhotoPreview(null);
                                }}
                                className="text-rose-500 hover:text-rose-700 text-[10px] font-bold mt-0.5 underline cursor-pointer"
                              >
                                លុបរូបថតចេញ
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-orange-50/50 border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-xl cursor-pointer transition text-xs font-bold text-slate-600 hover:text-orange-600 group">
                            <span className="text-base group-hover:scale-110 transition">📸</span>
                            <span>ចុចទីនេះ ដើម្បីថត ឬ Upload រូបថតមុខផ្ទះ / ស្លាកសញ្ញា</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLocationPhotoChange}
                              className="hidden"
                            />
                          </label>
                        )}
                        <p className="text-[10px] text-slate-400">
                          ជួយឱ្យអ្នកដឹកជញ្ជូនស្គាល់ច្រកចូល ពណ៌ផ្ទះ ឬស្លាកសញ្ញាបានរហ័ស មិនបាច់ខលសួរច្រើនដង។
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: 💳 ជ្រើសរើសវិធីសាស្ត្រទូទាត់ប្រាក់ */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
                      <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 font-black text-xs flex items-center justify-center">2</span>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        ជ្រើសរើសវិធីសាស្ត្រទូទាត់ប្រាក់
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Option 1: COD */}
                      <label 
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 relative overflow-hidden ${
                          paymentMethod === 'COD' 
                            ? 'border-orange-500 bg-white ring-4 ring-orange-500/10 shadow-md text-orange-950' 
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                          className="accent-[#ff6a00] w-4 h-4 mt-0.5"
                        />
                        <div className="space-y-1">
                          <div className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                            <span>💵</span>
                            <span>បង់ប្រាក់ពេលទទួល (COD)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            ពិនិត្យទំនិញរួចរាល់ ទើបប្រគល់ប្រាក់ជូនអ្នកដឹកជញ្ជូន
                          </p>
                          <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ ពេញនិយម និងសុវត្ថិភាព
                          </span>
                        </div>
                      </label>

                      {/* Option 2: ABA KHQR */}
                      <label 
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 relative overflow-hidden ${
                          paymentMethod === 'ABA KHQR' 
                            ? 'border-[#E1251B] bg-white ring-4 ring-red-500/10 shadow-md text-slate-900' 
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          checked={paymentMethod === 'ABA KHQR'}
                          onChange={() => setPaymentMethod('ABA KHQR')}
                          className="accent-[#E1251B] w-4 h-4 mt-0.5"
                        />
                        <div className="space-y-1">
                          <div className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                            <span className="bg-[#E1251B] text-white px-1.5 py-0.2 rounded text-[10px] font-black">KHQR</span>
                            <span>ស្កេនទូទាត់ ABA KHQR</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            ស្កេនតាម Bakong, ABA ឬគ្រប់ធនាគារក្នុងប្រទេសកម្ពុជា
                          </p>
                          <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            ⚡ ឆាប់រហ័ស Multi-Currency
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* INTERACTIVE BAKONG / ABA KHQR CARD & SLIP UPLOAD */}
                    {paymentMethod === 'ABA KHQR' && (
                      <div className="bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5 rounded-2xl border-2 border-red-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                        
                        {/* KHQR Card Box */}
                        <div className="bg-white rounded-2xl border border-slate-250 overflow-hidden shadow-md max-w-sm mx-auto">
                          {/* KHQR Official Red Header */}
                          <div className="bg-[#E1251B] text-white px-4 py-2.5 flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-1.5 font-black text-sm tracking-wider">
                              <span className="bg-white text-[#E1251B] px-1.5 py-0.5 rounded text-[10px] font-black shadow-2xs">KH</span>
                              <span>QR</span>
                            </div>
                            <span className="text-[11px] font-bold tracking-wide">BAKONG / ABA PAY</span>
                          </div>

                          {/* Store Name & Amount */}
                          <div className="p-4 text-center border-b border-slate-100 bg-slate-50/40">
                            <p className="text-xs font-black text-slate-900 tracking-wide uppercase">
                              {storeSettings.bankAccountName || storeSettings.storeName || 'SABAY LUK STORE'}
                            </p>
                            <div className="mt-1">
                              <span className="text-2xl font-black text-[#ff6a00]">${totalPrice.toFixed(2)}</span>
                              <span className="block text-xs font-bold text-slate-500 mt-0.5">≈ {totalRiel.toLocaleString()} ៛</span>
                            </div>
                          </div>

                          {/* Dynamic Real QR Code Image */}
                          <div className="p-4 flex flex-col items-center justify-center bg-slate-50/50">
                            <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-inner">
                              <img 
                                src={storeSettings.khqrImageUrl || '/khqr-aba.jpg'} 
                                alt="KHQR Code" 
                                className="w-48 h-auto max-h-64 object-contain rounded-lg"
                              />
                            </div>
                            <p className="text-[10px] text-slate-600 font-bold mt-2.5 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                              <span>✨</span> <span>ស្កេនបានទាំង <b className="text-emerald-700">ប្រាក់រៀល (KHR)</b> & <b className="text-blue-700">ប្រាក់ដុល្លារ (USD)</b></span>
                            </p>
                          </div>

                          {/* Bank Details & Copy Buttons */}
                          <div className="px-4 py-3.5 bg-slate-50 text-xs border-t border-slate-150 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-bold">ធនាគារ៖</span>
                              <span className="font-black text-slate-900">ABA Bank (KHQR Multi-Currency)</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-bold">ឈ្មោះគណនី៖</span>
                              <span className="font-black text-slate-900 uppercase">
                                {storeSettings.bankAccountName || storeSettings.storeName || 'SABAY LUK'}
                              </span>
                            </div>

                            {/* KHR Account */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                              <span className="text-slate-700 font-bold flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center justify-center shrink-0">៛</span>
                                <span>គណនី KHR:</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                  {storeSettings.bankAccountKhr || '004 500 394'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText((storeSettings.bankAccountKhr || '004500394').replace(/\s+/g, ''));
                                    setIsCopiedAccountKhr(true);
                                    setTimeout(() => setIsCopiedAccountKhr(false), 2000);
                                  }}
                                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer"
                                >
                                  {isCopiedAccountKhr ? '✓ បានចម្លង' : '📋 ចម្លង KHR'}
                                </button>
                              </div>
                            </div>

                            {/* USD Account */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-slate-700 font-bold flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black inline-flex items-center justify-center shrink-0">$</span>
                                <span>គណនី USD:</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                                  {storeSettings.bankAccountUsd || storeSettings.bankAccountNumber || '010 723 080'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText((storeSettings.bankAccountUsd || storeSettings.bankAccountNumber || '010723080').replace(/\s+/g, ''));
                                    setIsCopiedAccountUsd(true);
                                    setTimeout(() => setIsCopiedAccountUsd(false), 2000);
                                  }}
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer"
                                >
                                  {isCopiedAccountUsd ? '✓ បានចម្លង' : '📋 ចម្លង USD'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 📎 Payment Slip Upload Section */}
                        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-250 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              <span>📎</span> ភ្ជាប់វិក្កយបត្រផ្ទេរប្រាក់ (Payment Slip / Screenshot)
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">ស្រេចចិត្ត ឬចាំបាច់</span>
                          </div>

                          {slipPreviewUrl ? (
                            <div className="flex items-center gap-3 bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl">
                              <img 
                                src={slipPreviewUrl} 
                                alt="Slip Preview" 
                                className="w-14 h-14 object-cover rounded-lg border border-emerald-300 bg-white"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-emerald-800 truncate">
                                  {slipFile ? slipFile.name : 'វិក្កយបត្របានភ្ជាប់'}
                                </p>
                                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                                  ✓ បានភ្ជាប់វិក្កយបត្ររួចរាល់
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSlipFile(null);
                                  setSlipPreviewUrl(null);
                                }}
                                className="text-slate-400 hover:text-rose-500 font-black text-sm p-1 cursor-pointer"
                                title="ដកចេញ"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <label className="border border-dashed border-slate-300 hover:border-orange-400 bg-slate-50/70 hover:bg-orange-50/50 p-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition text-center group">
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    const compressed = await compressImage(f, 'slip');
                                    setSlipFile(compressed);
                                    setSlipPreviewUrl(URL.createObjectURL(compressed));
                                  }
                                }} 
                                className="hidden" 
                              />
                              <span className="text-base group-hover:scale-110 transition">📸</span>
                              <span className="text-xs font-bold text-slate-600 group-hover:text-orange-600">
                                ចុចទីនេះ ដើម្បីភ្ជាប់រូបភាពវិក្កយបត្រផ្ទេរប្រាក់ (Slip)
                              </span>
                            </label>
                          )}
                          <p className="text-[10px] text-slate-400 text-center">
                            💡 បន្ទាប់ពីផ្ទេរប្រាក់រួច សូមភ្ជាប់រូបភាព Slip ដើម្បីឱ្យហាងឆាប់បញ្ជាក់ការដឹកជញ្ជូន។
                          </p>
                        </div>

                      </div>
                    )}
                  </div>

                </div>

                {/* 👉 RIGHT COLUMN: 🛒 CART PREVIEW, 🏷️ PROMO & 🧾 TOTAL SUMMARY (Cols: 5) */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* CARD 3: 🛒 បញ្ជីទំនិញក្នុងកន្ត្រក (Cart Items Preview) */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 uppercase tracking-wider">
                        <span>🛒</span>
                        <span>ទំនិញកុម្ម៉ង់ ({cart.length} មុខ)</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        សរុប {cart.reduce((sum, item) => sum + item.qty, 0)} គូ/ដុំ
                      </span>
                    </div>

                    {/* Scrollable Cart Items List */}
                    <div className="max-h-52 overflow-y-auto space-y-2.5 divide-y divide-slate-100 pr-1">
                      {cart.map((item, idx) => (
                        <div key={`${item.id}_${item.variantId || idx}`} className="flex items-center gap-3 pt-2 first:pt-0">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                            <img 
                              src={item.image_url || item.image || item.photo_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80'} 
                              alt={item.name} 
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80';
                              }}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-slate-900 truncate">
                              {item.name}
                            </h5>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.size && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                                  Size: {item.size}
                                </span>
                              )}
                              {item.color && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                                  {item.color}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                x{item.qty}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-xs text-slate-900">
                              ${((item.price || 0) * item.qty).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CARD 5: 🧾 សង្ខេបវិក្កយបត្រ (Invoice Summary Breakdown) */}
                  <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-orange-50/20 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>ទំនិញសរុប ({cart.length} មុខ):</span>
                      <span className="font-mono text-slate-900">${subtotalPrice.toFixed(2)}</span>
                    </div>
                    {appliedCoupon && couponDiscountAmount > 0 && (
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                        <span>បញ្ចុះតម្លៃ Promo Code ({appliedCoupon.code}):</span>
                        <span className="font-mono">-${couponDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {isTaxEnabled && taxAmount > 0 && (
                      <div className="flex justify-between items-center text-xs font-bold text-blue-600">
                        <span>ពន្ធអាករ (VAT {taxRatePercent}%):</span>
                        <span className="font-mono">{taxMode === 'inclusive' ? '(រួមបញ្ចូល) ' : '+'}${taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>ថ្លៃដឹកជញ្ជូន:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        ✓ ឥតគិតថ្លៃ (Free)
                      </span>
                    </div>

                    {/* Grand Total */}
                    <div className="flex justify-between items-baseline pt-3 border-t border-slate-200/80">
                      <div>
                        <span className="font-black text-sm text-slate-900 block leading-tight">ទឹកប្រាក់សរុប (Total):</span>
                        <span className="text-[10px] text-slate-400 font-medium">រួមបញ្ចូលពន្ធ និងថ្លៃដឹក</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-2xl text-[#ff6a00] font-mono leading-none">${totalPrice.toFixed(2)}</span>
                        <span className="block text-xs font-bold text-slate-500 mt-1">({totalRiel.toLocaleString()} ៛)</span>
                      </div>
                    </div>
                  </div>

                  {/* CARD 6: 🟧 CONFIRM ORDER BUTTON & TRUST BADGES */}
                  <div className="space-y-3 pt-1">
                    <button
                      type="submit"
                      disabled={checkoutLoading}
                      className="w-full bg-gradient-to-r from-[#ff6a00] via-[#ea580c] to-[#ff6a00] hover:from-[#ea580c] hover:to-[#c2410c] text-white py-4 rounded-2xl font-black text-sm sm:text-base active:scale-98 transition shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {checkoutLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>កំពុងដំណើរការកុម្ម៉ង់...</span>
                        </>
                      ) : (
                        <>
                          <span>✔️</span>
                          <span>បញ្ជាក់ការកុម្ម៉ង់ឥឡូវនេះ (Confirm Order)</span>
                        </>
                      )}
                    </button>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 font-bold pt-1">
                      <div className="flex items-center justify-center gap-1 bg-slate-50 py-1.5 px-1 rounded-xl border border-slate-200/60">
                        <span>🔒</span>
                        <span>សុវត្ថិភាព ១០០%</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 bg-slate-50 py-1.5 px-1 rounded-xl border border-slate-200/60">
                        <span>⚡</span>
                        <span>ដឹកលឿន ២៤-៤៨ម៉</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 bg-slate-50 py-1.5 px-1 rounded-xl border border-slate-200/60">
                        <span>🔄</span>
                        <span>ធានាប្តូរទំហំ</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⭐️ 11. ORDER SUCCESS MODAL (ENHANCED WITH DETAILED PRODUCT LIST & MAP) ⭐️ */}
      {orderSuccessModalOpen && completedOrder && (
        <div 
          onClick={() => {
            setOrderSuccessModalOpen(false);
            setCompletedOrder(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 cursor-default"
          >
            {/* Direct Close Button at Top Right */}
            <button
              type="button"
              onClick={() => {
                setOrderSuccessModalOpen(false);
                setCompletedOrder(null);
              }}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition z-20 cursor-pointer shadow-xs"
              title="បិទផ្ទាំង (Close)"
            >
              ✕
            </button>
            
            {/* Header Banner */}
            <div className="text-center pb-4 shrink-0 border-b border-slate-100">
              <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2.5 shadow-lg shadow-emerald-500/25">
                🎉
              </div>
              <h3 className="font-black text-lg sm:text-xl text-slate-900 leading-tight">
                ការបញ្ជាទិញទទួលបានជោគជ័យ!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                អរគុណសម្រាប់ការគាំទ្រ Sabay Luk! យើងខ្ញុំបានកត់ត្រាការកុម្ម៉ង់របស់អ្នករួចរាល់ហើយ។
              </p>
            </div>

            {/* Scrollable Order Details Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              
              {/* Order Meta Card */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold">លេខកូដកុម្ម៉ង់ (Order ID):</span>
                  <span className="text-orange-600 font-mono font-black text-sm bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                    #{completedOrder.order_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">អ្នកទទួល:</span>
                  <span className="font-black text-slate-900">{completedOrder.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">លេខទូរស័ព្ទ:</span>
                  <a href={`tel:${completedOrder.phone}`} className="font-bold text-blue-600 hover:underline">
                    📞 {completedOrder.phone}
                  </a>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 font-bold shrink-0">អាសយដ្ឋានដឹក:</span>
                  <span className="font-bold text-slate-900 text-right leading-relaxed">
                    {completedOrder.address || completedOrder.delivery_address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">វិធីសាស្ត្រទូទាត់:</span>
                  <span className="font-black text-slate-900 uppercase bg-slate-200/70 px-2 py-0.5 rounded text-[11px]">
                    {completedOrder.payment || completedOrder.payment_method || 'COD'}
                  </span>
                </div>

                {/* Google Maps Location Button if provided */}
                {(completedOrder.google_map_url || (completedOrder.items && completedOrder.items[0]?.google_map_url)) && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <span>🗺️</span> ទីតាំងផែនទី Google Maps:
                    </span>
                    <a
                      href={completedOrder.google_map_url || completedOrder.items[0]?.google_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-[11px] px-2.5 py-1 rounded-lg border border-blue-200 transition"
                    >
                      <span>📍</span> បើកមើល Maps ↗
                    </a>
                  </div>
                )}

                {/* House Photo Preview if provided */}
                {(completedOrder.location_photo_url || (completedOrder.items && completedOrder.items[0]?.location_photo_url)) && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <span>🏠</span> រូបថតទីតាំង ឬផ្ទះទទួលឥវ៉ាន់:
                    </span>
                    <div className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200">
                      <img
                        src={completedOrder.location_photo_url || completedOrder.items[0]?.location_photo_url}
                        alt="Location"
                        className="w-16 h-16 object-cover rounded-lg border shrink-0 bg-slate-100"
                      />
                      <div className="text-[11px]">
                        <p className="font-black text-slate-900">បានភ្ជាប់រូបថតទីតាំងទទួល</p>
                        <p className="text-slate-400 mt-0.5">ជួយឱ្យអ្នកដឹកជញ្ជូនស្គាល់ច្រកចូលផ្ទះបានត្រឹមត្រូវ</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Slip Preview if provided */}
                {completedOrder.payment_slip_url && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <span>🧾</span> បង្កាន់ដៃផ្ទេរប្រាក់ (Slip):
                    </span>
                    <a 
                      href={completedOrder.payment_slip_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-orange-600 hover:text-orange-700 font-bold text-[11px] underline flex items-center gap-1"
                    >
                      <span>🔍</span> មើល Slip ផ្ទេរប្រាក់ ↗
                    </a>
                  </div>
                )}
              </div>

              {/* ⭐️ DETAILED ORDERED ITEMS LIST (ពត័មានទំនិញលម្អិត) ⭐️ */}
              {completedOrder.items && Array.isArray(completedOrder.items) && completedOrder.items.length > 0 && (
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📦</span> បញ្ជីមុខទំនិញដែលបានកុម្ម៉ង់ ({completedOrder.items.filter(it => !it.is_tax_meta).length} មុខ)
                    </h4>
                  </div>
                  
                  <div className="space-y-2.5 divide-y divide-slate-200/60">
                    {completedOrder.items.filter(it => !it.is_tax_meta).map((it, idx) => (
                      <div key={idx} className="flex items-center gap-3 pt-2.5 first:pt-0">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                          <img
                            src={it.image_url || it.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80'}
                            alt={it.name}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-black text-xs text-slate-900 truncate">
                            {it.name}
                          </h5>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {it.size && (
                              <span className="text-[10px] font-bold bg-white text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                Size: {it.size}
                              </span>
                            )}
                            {it.color && (
                              <span className="text-[10px] font-bold bg-white text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                {it.color}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono">
                              x{it.qty || 1}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-xs text-slate-900 font-mono">
                            ${((it.price || 0) * (it.qty || 1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown Summary */}
                  <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>តម្លៃទំនិញសរុប:</span>
                      <span className="font-mono text-slate-900">${(completedOrder.subtotal || completedOrder.total).toFixed(2)}</span>
                    </div>
                    {completedOrder.discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>បញ្ចុះតម្លៃ ({completedOrder.coupon_code || 'Promo'}):</span>
                        <span className="font-mono">-${Number(completedOrder.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>ថ្លៃដឹកជញ្ជូន:</span>
                      <span className="text-emerald-700 font-bold">✓ ឥតគិតថ្លៃ (Free)</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 font-black text-sm">
                      <span className="text-slate-900">សរុបទឹកប្រាក់ (Grand Total):</span>
                      <div className="text-right">
                        <span className="text-[#ff6a00] font-mono text-lg block">${completedOrder.total.toFixed(2)}</span>
                        <span className="text-[11px] text-slate-500 font-bold">({Math.round(completedOrder.total * 4100).toLocaleString()} ៛)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🌟 PROMINENT INVOICE DOWNLOAD & SAVE NOTICE (LARGE TEXT AS REQUESTED) */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-400/90 rounded-3xl text-left shadow-md space-y-3 relative overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                    📥
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        សំខាន់ចាំបាច់ (Important)
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-800">
                        លេខវិក្កយបត្រ៖ #{completedOrder.order_id}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1 leading-snug">
                      សូមទាញយក និងរក្សាទុកវិក្កយបត្រ (Invoice PDF) របស់អ្នកទុក!
                    </h4>
                    <p className="text-xs sm:text-sm font-bold text-emerald-950 mt-1.5 leading-relaxed bg-white/80 p-3 rounded-2xl border border-emerald-200">
                      💡 ដើម្បីងាយស្រួលយកលេខកូដវិក្កយបត្រ (<span className="text-emerald-700 font-mono font-black underline">#{completedOrder.order_id}</span>) ទៅតាមដានដំណើរការដឹកជញ្ជូនទំនិញ (Track Order) និងផ្ទៀងផ្ទាត់ពេលអ្នកដឹកទំនិញយកឥវ៉ាន់ទៅដល់!
                    </p>
                  </div>
                </div>

                {/* Big Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <a
                    href={`/api/invoice/download?orderId=${encodeURIComponent(completedOrder.order_id)}`}
                    download={`Invoice_${completedOrder.order_id}.pdf`}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer text-center"
                  >
                    <span className="text-base">📥</span>
                    <span>ទាញយកវិក្កយបត្រ PDF ទុក</span>
                  </a>
                  <a
                    href={getInvoiceUrl(completedOrder.order_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      openInvoiceInBrowser(completedOrder.order_id);
                    }}
                    className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 font-black text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-2xs transition active:scale-95 cursor-pointer text-center"
                    title="បើកមើលលើ Web Browser (Google Chrome / Edge)"
                  >
                    <span className="text-base">📄</span>
                    <span>បើកមើលវិក្កយបត្រ (Web Browser) ↗</span>
                  </a>
                </div>

                {/* Direct Browser Link Copy Button */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const url = getInvoiceUrl(completedOrder.order_id);
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(url);
                        alert('✅ បានចម្លង Link វិក្កយបត្ររួចរាល់!\nអ្នកអាច Paste ចូលក្នុង Browser ណាមួយបាន: ' + url);
                      }
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1.5 transition underline cursor-pointer"
                  >
                    <span>📋</span>
                    <span>ចម្លង Link វិក្កយបត្រ (សម្រាប់ Paste ក្នុង Chrome/Edge)</span>
                  </button>
                </div>
              </div>

              {/* Direct Feedback Buttons for Ordered Items */}
              {completedOrder.items && completedOrder.items.length > 0 && (
                <div className="text-left p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-amber-900 flex items-center gap-1.5">
                      <span>⭐</span> ផ្តល់ Feedback លើទំនិញដែលបានកុម្ម៉ង់:
                    </span>
                    <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full font-bold">1 Order = 1 Feedback</span>
                  </div>
                  <div className="space-y-1.5">
                    {completedOrder.items.filter(it => !it.is_tax_meta).map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img 
                            src={it.image_url || it.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80'} 
                            alt={it.name} 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80';
                            }}
                            className="w-8 h-8 rounded-lg object-cover" 
                          />
                          <span className="text-xs font-bold text-slate-800 truncate">{it.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOrderSuccessModalOpen(false);
                            openFeedbackModal(it, true, completedOrder.order_id);
                          }}
                          className="text-[11px] font-black text-white bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded-xl transition shadow-2xs whitespace-nowrap cursor-pointer"
                        >
                          ✍️ Feedback
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer CTAs */}
            <div className="pt-3 border-t border-slate-100 space-y-2 shrink-0">
              <Link
                href={`/track?order=${encodeURIComponent(completedOrder.order_id)}`}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 active:scale-98"
              >
                <span>🚚</span>
                <span>តាមដានការដឹកជញ្ជូនបន្តផ្ទាល់ (Live Tracking /track) ➔</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setOrderSuccessModalOpen(false);
                  setCompletedOrder(null);
                }}
                className="w-full bg-slate-900 hover:bg-black text-white py-2.5 rounded-2xl font-black text-xs transition cursor-pointer"
              >
                ទិញទំនិញបន្ត (Continue Shopping)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ⭐️ 12. TRACK ORDER MODAL ⭐️ */}
      {trackModalOpen && (
        <div 
          onClick={() => setTrackModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col cursor-default"
          >
            
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-orange-50 text-[#ff6a00] rounded-2xl flex items-center justify-center text-xl font-bold">
                  🔍
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900 leading-tight">តាមដានការបញ្ជាទិញ (Track Order)</h3>
                  <p className="text-xs text-gray-400">ពិនិត្យមើលស្ថានភាពនៃការដឹកជញ្ជូនទំនិញរបស់អ្នក</p>
                </div>
              </div>
              <button 
                onClick={() => setTrackModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between pb-3 text-xs border-b border-gray-100 mb-3">
              <span className="text-gray-400">ចង់ពិនិត្យមើលផ្ទាំងតាមដានធំទូលាយ?</span>
              <Link 
                href="/track"
                className="text-[#ff6a00] font-black hover:underline flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-xl"
              >
                <span>បើកទំព័រ /track ពេញលេញ</span>
                <span>↗️</span>
              </Link>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSearchTrackOrder(); }} className="mb-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    placeholder="បញ្ចូលលេខទូរស័ព្ទ (ឧ. 010723080) ឬ Order ID (ឧ. ONL-123456)..."
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#ff6a00] focus:bg-white rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium focus:outline-none transition pl-10"
                  />
                  <span className="absolute left-3.5 top-3.5 text-gray-400 text-sm">🔎</span>
                </div>
                <button
                  type="submit"
                  disabled={isTracking}
                  className="bg-[#ff6a00] hover:bg-[#ea580c] active:scale-95 text-white px-5 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTracking ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>ស្វែងរក</span>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 px-1">
                💡 គន្លឹះ៖ លោកអ្នកអាចប្រើលេខទូរស័ព្ទដែលបានបញ្ជាទិញ ដើម្បីមើលរាល់ប្រវត្តិកុម្ម៉ង់ទាំងអស់!
              </p>
            </form>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {isTracking && (
                <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold">កំពុងស្វែងរកទិន្នន័យការកុម្ម៉ង់...</span>
                </div>
              )}

              {!isTracking && hasSearchedTrack && trackResults.length === 0 && (
                <div className="py-14 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
                  <div className="text-4xl mb-2">📦</div>
                  <h4 className="font-bold text-sm text-gray-800">រកមិនឃើញការកុម្ម៉ង់ឡើយ!</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    សូមពិនិត្យមើលលេខទូរស័ព្ទ ឬលេខកូដ Order ID ឡើងវិញ ឬទំនាក់ទំនងមកកាន់ផ្នែកបម្រើអតិថិជន។
                  </p>
                  <a 
                    href="tel:0967205522" 
                    className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-[#ff6a00] bg-orange-50 px-4 py-2 rounded-xl hover:bg-orange-100 transition"
                  >
                    📞 ហៅទូរស័ព្ទមកហាង: 096 720 5522
                  </a>
                </div>
              )}

              {!isTracking && !hasSearchedTrack && (
                <div className="py-16 text-center text-gray-400">
                  <div className="text-4xl mb-3">🚚</div>
                  <p className="text-sm font-bold text-gray-600">សូមវាយបញ្ចូលលេខទូរស័ព្ទ ឬលេខកូដកុម្ម៉ង់ខាងលើ</p>
                  <p className="text-xs text-gray-400 mt-1">ប្រព័ន្ធនឹងបង្ហាញដំណើរការនៃការដឹកជញ្ជូនទំនិញជូនអ្នកភ្លាមៗ</p>
                </div>
              )}

              {!isTracking && trackResults.length > 0 && (
                trackResults.map((order) => {
                  const currentStep = getStatusStep(order.status);
                  const badge = getStatusBadge(order.status);
                  const isCancelled = currentStep === -1;
                  const mapUrl = order.google_map_url || (Array.isArray(order.items) && order.items[0]?.google_map_url);
                  const locationPhoto = order.location_photo_url || (Array.isArray(order.items) && order.items[0]?.location_photo_url);
                  const slipUrl = order.payment_slip_url || (Array.isArray(order.items) && order.items[0]?.payment_slip_url);

                  const steps = [
                    { title: 'រង់ចាំបញ្ជាក់', desc: 'Pending', icon: '🟡', detail: 'ហាងបានទទួលកុម្ម៉ង់' },
                    { title: 'កំពុងវេចខ្ចប់', desc: 'Processing', icon: '🔵', detail: 'កំពុងរៀបចំដាក់ប្រអប់' },
                    { title: 'កំពុងដឹកជញ្ជូន', desc: 'Out for Delivery', icon: '🚚', detail: 'អ្នកដឹកកំពុងធ្វើដំណើរ' },
                    { title: 'បានទទួលជោគជ័យ', desc: 'Delivered', icon: '🟢', detail: 'ប្រគល់ជូនរួចរាល់' },
                  ];

                  return (
                    <div key={order.id} className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-xs space-y-4 hover:border-orange-200 transition">
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-[#ff6a00]">{order.order_id}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(order.order_id);
                                alert(`📋 បានចម្លងលេខកូដកុម្ម៉ង់ ${order.order_id} រួចរាល់!`);
                              }}
                              className="text-[10px] font-bold text-gray-400 hover:text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md cursor-pointer transition active:scale-95"
                              title="ចម្លងលេខកូដកុម្ម៉ង់"
                            >
                              📋 ចម្លង
                            </button>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                              {badge.text}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 font-medium">
                            កាលបរិច្ឆេទ: {order.created_at ? new Date(order.created_at).toLocaleString('km-KH') : 'ថ្មីៗ'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-[#ff6a00]">
                            ${parseFloat(order.total_amount || 0).toFixed(2)}
                          </span>
                          <span className="block text-[10px] font-bold text-gray-400">
                            ({(parseFloat(order.total_amount || 0) * 4100).toLocaleString()} ៛)
                          </span>
                        </div>
                      </div>

                      {!isCancelled ? (
                        <div className="py-3 px-1 bg-gradient-to-b from-gray-50/70 to-white rounded-2xl border border-gray-100">
                          <div className="grid grid-cols-4 relative gap-1">
                            <div className="absolute top-4 left-6 right-6 h-1.5 bg-gray-100 rounded-full -z-0">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-500 rounded-full transition-all duration-700 shadow-xs"
                                style={{ 
                                  width: currentStep === 0 ? '12%' : currentStep === 1 ? '38%' : currentStep === 2 ? '72%' : '100%' 
                                }}
                              />
                            </div>

                            {steps.map((st, idx) => {
                              const isPassed = idx <= currentStep;
                              const isCurrent = idx === currentStep;

                              return (
                                <div key={idx} className="flex flex-col items-center text-center z-10 px-0.5">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 shadow-xs ${
                                    isCurrent 
                                      ? 'bg-white ring-4 ring-orange-200 border-2 border-orange-500 scale-110 shadow-md animate-bounce'
                                      : isPassed
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-white border-2 border-gray-200 text-gray-400'
                                  }`}>
                                    {isCurrent ? st.icon : (isPassed ? '✓' : st.icon)}
                                  </div>
                                  <span className={`text-[11px] font-black mt-2 leading-tight ${
                                    isCurrent ? 'text-[#ff6a00]' : isPassed ? 'text-gray-800' : 'text-gray-400'
                                  }`}>
                                    {st.title}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-medium hidden sm:block">
                                    {st.desc}
                                  </span>
                                  <span className={`text-[8.5px] mt-0.5 hidden md:block ${isCurrent ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>
                                    {st.detail}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100">
                          <span>❌</span>
                          <span>ការបញ្ជាទិញនេះត្រូវបានបោះបង់ (Cancelled)។ សូមទាក់ទងមកហាងប្រសិនបើមានចម្ងល់។</span>
                        </div>
                      )}

                      <div className="bg-gray-50/80 rounded-2xl p-3.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600">
                        <div>
                          <span className="text-gray-400 block text-[10px] font-bold">អ្នកទទួល:</span>
                          <span className="font-bold text-gray-900">{order.customer_name}</span> ({order.phone_number || order.phone})
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] font-bold">វិធីសាស្ត្រទូទាត់:</span>
                          <span className="font-bold text-gray-900">{order.payment_method || 'COD'}</span>
                          {slipUrl && (
                            <a 
                              href={slipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-bold text-[10px] inline-flex items-center gap-1 mt-0.5 ml-2"
                            >
                              🧾 មើលវិក្កយបត្រ Slip ↗
                            </a>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-400 block text-[10px] font-bold">អាសយដ្ឋានដឹកជញ្ជូន:</span>
                          <span className="font-bold text-gray-800">{order.delivery_address || order.address}</span>
                          
                          {/* Location Links */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {mapUrl && (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition"
                              >
                                <span>📍</span>
                                <span>មើលទីតាំងលើ Google Maps ↗</span>
                              </a>
                            )}
                            {locationPhoto && (
                              <a
                                href={locationPhoto}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition"
                              >
                                <span>📸</span>
                                <span>មើលរូបថតផ្ទះ/កន្លែងធ្វើការ ↗</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ⭐️ Quick Contact & Support Buttons ⭐️ */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                        <a 
                          href={(() => {
                            const raw = (storeSettings?.telegram || currentStore?.telegram || 'sabay_luk').replace(/^@/, '').trim();
                            const clean = raw.toLowerCase() === 'sabayluk' ? 'sabay_luk' : raw;
                            return `https://t.me/${clean}?text=${encodeURIComponent(`សួស្តីបង! ខ្ញុំចង់សួរនាំពីការកុម្ម៉ង់លេខ #${order.order_id} របស់ខ្ញុំ`)}`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition"
                        >
                          <span>💬</span>
                          <span>ឆាតតាម Telegram (@{(() => {
                            const raw = (storeSettings?.telegram || currentStore?.telegram || 'sabay_luk').replace(/^@/, '').trim();
                            return raw.toLowerCase() === 'sabayluk' ? 'sabay_luk' : raw;
                          })()})</span>
                        </a>
                        <a 
                          href={`tel:${(storeSettings?.phone || currentStore?.phone || '0967205522').replace(/\s+/g, '')}`} 
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition"
                        >
                          <span>📞</span>
                          <span>ទូរស័ព្ទហាង: {storeSettings?.phone || currentStore?.phone || '096 720 5522'}</span>
                        </a>
                      </div>

                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-extrabold text-gray-700 block uppercase tracking-wider">
                            🛍️ ទំនិញដែលបានកុម្ម៉ង់ ({order.items.length}):
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {order.items.map((it, i) => (
                              <div key={i} className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-xl text-xs">
                                <div className="flex items-center gap-2.5">
                                  {it.image_url ? (
                                    <img src={it.image_url} alt={it.name} className="w-9 h-9 object-cover rounded-lg bg-gray-50 border border-gray-200" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs">👟</div>
                                  )}
                                  <div>
                                    <h5 className="font-bold text-gray-800 line-clamp-1">{it.name}</h5>
                                    <div className="flex gap-1.5 text-[10px] text-gray-400 font-semibold">
                                      {it.size && <span>Size: {it.size}</span>}
                                      {it.color && <span>• Color: {it.color}</span>}
                                      <span>• ចំនួន: x{it.qty}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="font-bold text-gray-800 text-xs">${(it.price * it.qty).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>សេវាកម្មដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត/ក្រុង</span>
              <a href="tel:0967205522" className="text-[#ff6a00] font-bold hover:underline">
                📞 Hotline: 096 720 5522
              </a>
            </div>

          </div>
        </div>
      )}

      {/* ⭐️ 13. LUXURY FOOTER WITH LOGISTICS & PAYMENT PARTNERS ⭐️ */}
      <footer className="bg-white border-t border-gray-200 mt-16 text-sm text-gray-500">
        
        {/* Payment & Logistics Badges Bar */}
        <div className="border-b border-gray-100 py-6 px-4 sm:px-6">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-black text-gray-900 uppercase">ដៃគូទូទាត់ប្រាក់៖</span>
              <div className="flex flex-wrap gap-2 text-[10px] font-black">
                <span className="bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-lg">ABA KHQR</span>
                <span className="bg-red-50 text-red-900 border border-red-200 px-3 py-1 rounded-lg">Bakong</span>
                <span className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-lg">Wing Bank</span>
                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-lg">ACLEDA</span>
                <span className="bg-gray-100 text-gray-800 border border-gray-200 px-3 py-1 rounded-lg">💵 COD</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-black text-gray-900 uppercase">ដៃគូដឹកជញ្ជូន៖</span>
              <div className="flex flex-wrap gap-2 text-[10px] font-black">
                <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-lg">J&T Express</span>
                <span className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-lg">Vireak Buntham</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg">Grab Express</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Main Links */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {storeSettings.logoUrl ? (
                <img src={storeSettings.logoUrl} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-[#ff6a00] text-white flex items-center justify-center font-black text-sm">
                  {(storeSettings.storeName || 'S').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xl font-black text-gray-900 tracking-tight">{storeSettings.storeName || 'SABAY LUK'}</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-500 mb-4">
              {storeSettings.storeDescription || 'ហាងលក់ស្បែកជើង និងម៉ូដទាន់សម័យគុណភាពខ្ពស់ ផ្ដល់ទំនុកចិត្ត និងភាពស៊ីវិល័យសម្រាប់អ្នក។'}
            </p>
            <p className="text-xs font-bold text-gray-900">📍 {storeSettings.address || 'ភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា'}</p>
            <p className="text-xs font-bold text-gray-900 mt-1">📞 {storeSettings.phone || '096 720 5522'}</p>
          </div>

          <div>
            <h4 className="font-black text-gray-900 mb-3 text-xs uppercase tracking-wider">សេវាកម្ម និងជំនួយ</h4>
            <ul className="space-y-2 text-xs">
              <li onClick={() => setTrackModalOpen(true)} className="hover:text-[#ff6a00] cursor-pointer">🔍 តាមដានការកុម្ម៉ង់</li>
              <li className="hover:text-[#ff6a00] cursor-pointer">🔄 គោលការណ៍ប្តូរទំនិញក្នុង ៧ ថ្ងៃ</li>
              <li className="hover:text-[#ff6a00] cursor-pointer">🚚 ព័ត៌មានដឹកជញ្ជូន ២៥ ខេត្ត/ក្រុង</li>
              <li className="hover:text-[#ff6a00] cursor-pointer">❓ សំណួរដែលសួរញឹកញាប់ (FAQ)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-gray-900 mb-3 text-xs uppercase tracking-wider">អំពីហាង {storeSettings.storeName || 'Sabay Luk'}</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-[#ff6a00] cursor-pointer">អំពីយើង (About Us)</li>
              <li className="hover:text-[#ff6a00] cursor-pointer">ការធានាគុណភាព ១០០%</li>
              <li className="hover:text-[#ff6a00] cursor-pointer">ទំនាក់ទំនងមកកាន់ហាង</li>
              <li className="hover:text-[#ff6a00] cursor-pointer">លក្ខខណ្ឌប្រើប្រាស់</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-gray-900 mb-3 text-xs uppercase tracking-wider">ម៉ោងបម្រើការងារ</h4>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>ចន្ទ - អាទិត្យ៖</span>
                <span className="font-black text-gray-900">{storeSettings.businessHours || '8:00 AM - 9:00 PM'}</span>
              </div>
              <div className="flex justify-between">
                <span>ដឹកជញ្ជូន៖</span>
                <span className="font-black text-emerald-600">រាល់ថ្ងៃ (Daily)</span>
              </div>
              {storeSettings.telegram && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[11px] text-gray-400">Telegram Channel:</span>
                  <a 
                    href={`https://t.me/${storeSettings.telegram.replace(/^@/, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block font-black text-[#ff6a00] mt-0.5"
                  >
                    @{storeSettings.telegram.replace(/^@/, '')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
          © 2026 {storeSettings.storeName || 'Sabay Luk'}. រក្សាសិទ្ធិគ្រប់យ៉ាង។ ផលិតឡើងដោយបច្ចេកវិទ្យា Next.js & Supabase។
        </div>
      </footer>

      {/* ⭐️ 13. MOBILE BOTTOM NAVIGATION BAR (របារម៉ឺនុយជាប់បាតក្រោមទូរស័ព្ទដៃ) ⭐️ */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${themeMode === 'dark' ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-gray-200/90 text-gray-800'} backdrop-blur-lg border-t shadow-[0_-4px_20px_rgba(0,0,0,0.2)] px-2 py-1 flex items-center justify-around select-none transition-colors pb-safe`}>
        
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('all');
            setSearchQuery('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[54px] py-1 text-center cursor-pointer transition active:scale-95"
        >
          <span className="text-lg leading-none">🏠</span>
          <span className={`text-[10px] font-black leading-none ${selectedCategory === 'all' && !searchQuery ? (themeMode === 'dark' ? 'text-orange-400 font-black' : 'text-gray-900 font-black') : 'text-gray-400 font-bold'}`}>{t('home', 'ទំព័រដើម')}</span>
        </button>

        {/* 2. Categories */}
        <button
          type="button"
          onClick={() => {
            const el = document.querySelector('.overflow-x-auto');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[54px] py-1 text-center cursor-pointer transition active:scale-95 text-gray-500 hover:text-gray-900"
        >
          <span className="text-lg leading-none">🏷️</span>
          <span className="text-[10px] font-bold text-gray-400 leading-none">{t('categories', 'ប្រភេទ')}</span>
        </button>

        {/* 3. Search */}
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const searchInput = document.querySelector('input[placeholder*="ស្វែងរក"]');
            if (searchInput) searchInput.focus();
          }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[54px] py-1 text-center cursor-pointer transition active:scale-95 text-gray-500 hover:text-gray-900"
        >
          <span className="text-lg leading-none">🔍</span>
          <span className="text-[10px] font-bold text-gray-400 leading-none">{t('search', 'ស្វែងរក')}</span>
        </button>

        {/* 4. Track Order */}
        <button
          type="button"
          onClick={() => setTrackModalOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[54px] py-1 text-center cursor-pointer transition active:scale-95 text-gray-500 hover:text-gray-900"
        >
          <span className="text-lg leading-none">📦</span>
          <span className="text-[10px] font-bold text-gray-400 leading-none">{t('trackOrder', 'តាមដាន')}</span>
        </button>

        {/* 5. Cart */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[54px] py-1 text-center cursor-pointer transition active:scale-95 relative"
        >
          <div className="relative">
            <span className="text-lg leading-none">🛒</span>
            {cart.length > 0 && (
              <span 
                style={{ backgroundColor: brandColor }}
                className="absolute -top-1.5 -right-2 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse"
              >
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold leading-none ${themeMode === 'dark' ? 'text-slate-300' : 'text-gray-900'}`}>
            {t('cart', 'កន្ត្រក')}
          </span>
        </button>
      </nav>

    
{/* ⭐️ 11. VERIFIED CUSTOMER FEEDBACK & REVIEWS MODAL (1 Order = 1 Feedback) ⭐️ */}
      {feedbackModalOpen && feedbackProduct && (
        <div 
          onClick={() => setFeedbackModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[92vh] overflow-hidden flex flex-col border animate-in zoom-in-95 transition-colors cursor-default ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'}`}
          >
            
            {/* Modal Header */}
            <div className={`p-5 sm:p-6 border-b flex items-center justify-between gap-4 transition-colors ${themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50/70 border-gray-100'}`}>
              <div className="flex items-center gap-3.5 overflow-hidden">
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xs">
                  {feedbackProduct.image_url ? (
                    <img src={feedbackProduct.image_url} alt={feedbackProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🛍️</span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] font-black text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {feedbackProduct.category || 'ទំនិញ'}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 truncate mt-0.5">
                    {feedbackProduct.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(() => {
                      const stats = getProductFeedbackStats(feedbackProduct.id, feedbackProduct.name);
                      const ratingRound = Math.round(Number(stats.avg) || 5);
                      return (
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="flex items-center text-amber-400 text-xs tracking-tighter">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span 
                                key={star} 
                                className={star <= ratingRound ? "text-amber-400" : "text-gray-200"}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-amber-600 font-black">{stats.avg}</span>
                          <span className="text-gray-400 font-bold">({stats.count} Feedback ផ្ទៀងផ្ទាត់រួច)</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center font-bold text-sm shadow-xs transition flex-shrink-0 cursor-pointer"
                title="បិទ (Close)"
              >
                ✕
              </button>
            </div>

            {/* Tabs Selector (View All vs Write New) */}
            <div className={`flex border-b px-5 sm:px-6 pt-3 gap-2 transition-colors ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
              <button
                type="button"
                onClick={() => { setFeedbackActiveTab('list'); setVerifyError(''); }}
                className={`pb-3 px-4 text-xs font-black border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  feedbackActiveTab === 'list'
                    ? 'border-[#ff6a00] text-[#ff6a00]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>💬</span> មតិយោបល់ទាំងអស់ ({getProductFeedbackStats(feedbackProduct.id, feedbackProduct.name).count})
              </button>
              <button
                type="button"
                onClick={() => setFeedbackActiveTab('write')}
                className={`pb-3 px-4 text-xs font-black border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  feedbackActiveTab === 'write'
                    ? 'border-[#ff6a00] text-[#ff6a00]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>✍️</span> សរសេរ Feedback ថ្មី
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              
              {/* TAB 1: LIST OF FEEDBACKS */}
              {feedbackActiveTab === 'list' && (
                <div className="space-y-4">
                  {/* Rating Score Banner */}
                  {(() => {
                    const stats = getProductFeedbackStats(feedbackProduct.id, feedbackProduct.name);
                    return (
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl sm:text-4xl font-black text-gray-900 flex items-baseline gap-1">
                            {stats.avg}
                            <span className="text-xs text-gray-400 font-normal">/ 5.0</span>
                          </div>
                          <div>
                            <div className="text-amber-400 text-sm">★★★★★</div>
                            <span className="text-xs font-bold text-gray-600">ផ្អែកលើការវាយតម្លៃពិត {stats.count} នាក់</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFeedbackActiveTab('write')}
                          className="bg-[#ff6a00] hover:bg-[#e55f00] text-white px-4 py-2 rounded-xl text-xs font-black shadow-md transition transform hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>✍️</span> សរសេរ Feedback លើទំនិញនេះ
                        </button>
                      </div>
                    );
                  })()}

                  

                  {/* List of reviews */}
                  {(() => {
                    const stats = getProductFeedbackStats(feedbackProduct.id, feedbackProduct.name);
                    if (stats.list.length === 0) {
                      return (
                        <div className="text-center py-12 px-4 bg-gray-50/60 rounded-3xl border border-dashed border-gray-200">
                          <span className="text-4xl block mb-2">💬</span>
                          <h4 className="text-sm font-black text-gray-800">មិនទាន់មាន Feedback នៅឡើយទេ</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                            តើអ្នកបានកុម្ម៉ង់ទិញទំនិញនេះហើយឬនៅ? សូមចែករំលែកមតិយោបល់របស់អ្នកដើម្បីទទួលបានការកោតសរសើរ!
                          </p>
                          <button
                            type="button"
                            onClick={() => setFeedbackActiveTab('write')}
                            className="mt-4 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer"
                          >
                            ✍️ សរសេរ Feedback ដំបូងគេ
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {stats.list.map((fb, idx) => (
                          <div key={fb.id || idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2 hover:border-orange-200 transition">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-amber-400 text-white font-black text-xs flex items-center justify-center shadow-xs">
                                  {(fb.customer_name || 'អ')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-black text-gray-900">{fb.customer_name || 'អតិថិជន'}</span>
                                    <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                      <span>✅</span> បានទិញពិតប្រាកដ
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    Order #{fb.order_id} • {fb.created_at ? new Date(fb.created_at).toLocaleDateString('km-KH') : 'ថ្មីៗ'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center text-amber-400 text-xs">
                                {'★'.repeat(Number(fb.rating) || 5)}
                                {'☆'.repeat(Math.max(0, 5 - (Number(fb.rating) || 5)))}
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                              {fb.comment}
                            </p>

                            {fb.photo_url && (
                              <div className="pt-1.5">
                                <div 
                                  onClick={() => setReviewZoomPhoto(fb.photo_url)}
                                  className="inline-block relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-orange-200/80 hover:border-orange-500 shadow-xs transition"
                                >
                                  <img 
                                    src={fb.photo_url} 
                                    alt="Customer Review Photo" 
                                    className="w-24 h-24 sm:w-28 sm:h-28 object-cover group-hover:scale-105 transition duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition">
                                    <span>🔍 ពង្រីក</span>
                                  </div>
                                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-0.5">
                                    📸 រូបពិត
                                  </span>
                                </div>
                              </div>
                            )}

                            {Array.isArray(fb.tags) && fb.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {fb.tags.map((tg, tIdx) => (
                                  <span key={tIdx} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                    {tg}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  
                </div>
              )}

              {/* TAB 2: WRITE FEEDBACK FORM */}
              {feedbackActiveTab === 'write' && (
                <div className="space-y-5">
                  
                  {/* Verified Rule Explanation Alert */}
                  <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
                    <span className="text-xl">🛡️</span>
                    <div className="text-xs text-blue-900 leading-relaxed">
                      <p className="font-black mb-0.5">លក្ខខណ្ឌ Feedback ផ្ទៀងផ្ទាត់ (Verified Purchase):</p>
                      <p className="text-blue-800">
                        ដើម្បីធានាភាពសុក្រឹត និងគុណភាពពិតប្រាកដ <strong>ការបញ្ជាទិញ ១ អាចសរសេរ Feedback បាន ១ ដង</strong> ហើយសរសេរបានតែលើទំនិញដែលលោកអ្នកបានកុម្ម៉ង់ទិញប៉ុណ្ណោះ។
                      </p>
                    </div>
                  </div>

                  {feedbackSubmitSuccess && (
                    <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs flex items-center gap-2 animate-in fade-in">
                      <span>🎉</span> {feedbackSubmitSuccess}
                    </div>
                  )}

                  {/* Step 1: Verify Order ID / Phone */}
                  {!verifiedOrder ? (
                    <div className="bg-gray-50/80 p-5 rounded-3xl border border-gray-200 space-y-4">
                      <div>
                        <label className="text-xs font-black text-gray-800 uppercase tracking-wider block mb-1">
                          🔍 ជំហានទី ១៖ ផ្ទៀងផ្ទាត់ការបញ្ជាទិញ (Verify Order ID / Phone)
                        </label>
                        <p className="text-[11px] text-gray-500">
                          សូមបញ្ចូលលេខកូដ Order ID (ឧ. <strong>ONL-874752</strong>) ឬលេខទូរស័ព្ទដែលបានប្រើពេលកុម្ម៉ង់ទិញ៖
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="វាយ Order ID (ឧ. ONL-874752) ឬលេខទូរស័ព្ទ..."
                          value={verifyOrderQuery}
                          onChange={(e) => setVerifyOrderQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyOrderForFeedback(e); }}
                          className="flex-1 bg-white border-2 border-gray-200 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOrderForFeedback}
                          disabled={isVerifyingOrder}
                          className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl font-black text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          {isVerifyingOrder ? (
                            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> ផ្ទៀងផ្ទាត់...</>
                          ) : (
                            <><span>🔍</span> ផ្ទៀងផ្ទាត់</>
                          )}
                        </button>
                      </div>

                      {/* Demo Quick Order Chips for Instant Testing */}
                      <div className="pt-1">
                        <span className="text-[11px] font-bold text-gray-400 block mb-1.5">💡 ឬចុចជ្រើសរើស Order គំរូក្នុងប្រព័ន្ធដើម្បីតេស្តភ្លាមៗ៖</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['ONL-874752', 'ORD-847371', 'ONL-777528', '010723080'].map(code => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => { setVerifyOrderQuery(code); }}
                              className="text-[10px] font-mono font-bold bg-white hover:bg-orange-50 hover:text-orange-600 text-gray-700 px-2.5 py-1 rounded-xl border border-gray-200 transition cursor-pointer"
                            >
                              #{code}
                            </button>
                          ))}
                        </div>
                      </div>

                      {verifyError && (
                        <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-2 animate-in fade-in">
                          <span>⚠️</span> {verifyError}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Step 2: Unlocked Feedback Writing Form */
                    <form onSubmit={handleSubmitFeedback} className="space-y-5 animate-in fade-in duration-200">
                      
                      {/* Success Banner */}
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                          <span>✅</span>
                          <div>
                            <div>ផ្ទៀងផ្ទាត់ជោគជ័យ! អតិថិជន: <strong>{verifiedOrder.customer_name || 'អតិថិជន'}</strong></div>
                            <div className="text-[11px] text-emerald-600 font-normal">Order #{verifiedOrder.order_id} • ទំនិញត្រូវគ្នា ១០០%</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setVerifiedOrder(null); setVerifySuccess(''); }}
                          className="text-[10px] text-gray-500 hover:text-gray-800 underline font-bold cursor-pointer"
                        >
                          ប្តូរ Order
                        </button>
                      </div>

                      {/* 1. Star Rating Selector */}
                      <div>
                        <label className="text-xs font-black text-gray-800 uppercase tracking-wider block mb-2">
                          ⭐ ១. ផ្តល់ពិន្ទុផ្កាយ (Rating)
                        </label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = (feedbackHoverRating || feedbackRating) >= star;
                            return (
                              <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setFeedbackHoverRating(star)}
                                onMouseLeave={() => setFeedbackHoverRating(0)}
                                onClick={() => setFeedbackRating(star)}
                                className="text-3xl transition transform hover:scale-125 cursor-pointer text-amber-400 focus:outline-none"
                              >
                                {isFilled ? '★' : '☆'}
                              </button>
                            );
                          })}
                          <span className="text-xs font-black text-gray-600 ml-2">
                            {feedbackRating === 5 && '🤩 ល្អឥតខ្ចោះ (5/5)'}
                            {feedbackRating === 4 && '😊 ល្អណាស់ (4/5)'}
                            {feedbackRating === 3 && '🙂 ល្អបង្គួរ (3/5)'}
                            {feedbackRating === 2 && '😐 មធ្យម (2/5)'}
                            {feedbackRating === 1 && '😞 មិនសូវពេញចិត្ត (1/5)'}
                          </span>
                        </div>
                      </div>

                      {/* 2. Customer Name */}
                      <div>
                        <label className="text-xs font-black text-gray-800 uppercase tracking-wider block mb-1">
                          👤 ២. ឈ្មោះអ្នកសរសេរ Feedback
                        </label>
                        <input
                          type="text"
                          value={feedbackReviewerName}
                          onChange={(e) => setFeedbackReviewerName(e.target.value)}
                          placeholder="ឈ្មោះរបស់អ្នក..."
                          className="w-full bg-white border-2 border-gray-200 p-3 rounded-2xl text-xs sm:text-sm font-bold text-gray-800 outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* 3. Quick Sentiment Impression Chips */}
                      <div>
                        <label className="text-xs font-black text-gray-800 uppercase tracking-wider block mb-1.5">
                          🏷️ ៣. ចំណាប់អារម្មណ៍រហ័ស (Quick Impression)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            '✨ ស្អាតដូចក្នុងរូប',
                            '👍 គុណភាពល្អឥតខ្ចោះ',
                            '🚚 ដឹកលឿនទាន់ចិត្ត',
                            '👌 ទំហំពាក់ត្រូវល្អ',
                            '💯 ណែនាំឱ្យទិញ',
                            '📦 វេចខ្ចប់មានសុវត្ថិភាព'
                          ].map(tag => {
                            const isSelected = feedbackSelectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  if (isSelected) setFeedbackSelectedTags(feedbackSelectedTags.filter(t => t !== tag));
                                  else setFeedbackSelectedTags([...feedbackSelectedTags, tag]);
                                }}
                                className={`text-xs font-black px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                                  isSelected 
                                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. Feedback Comment Textarea */}
                      <div>
                        <label className="text-xs font-black text-gray-800 uppercase tracking-wider block mb-1">
                          📝 ៤. មតិយោបល់លម្អិតរបស់អ្នក (Feedback Comment)
                        </label>
                        <textarea
                          rows="4"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="សូមចែករំលែកបទពិសោធន៍របស់អ្នកអំពីគុណភាពទំនិញ ទំហំ ពណ៌ និងសេវាកម្មដឹកជញ្ជូន..."
                          className="w-full bg-white border-2 border-gray-200 p-3.5 rounded-2xl text-xs sm:text-sm font-medium text-gray-800 outline-none focus:border-orange-500 leading-relaxed"
                        />
                      </div>

                      {/* ៥. ភ្ជាប់រូបភាពជាក់ស្តែង (Customer Photo Upload) */}
                      <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>📸</span> ៥. ភ្ជាប់រូបថតជាក់ស្តែងពេលពាក់ស្បែកជើង (Customer Photo)
                          </label>
                          <span className="text-[10px] text-orange-600 font-bold bg-orange-100/70 px-2 py-0.5 rounded-full">
                            ផ្កាយ ៥ + រូបថត
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          ការបង្ហោះរូបភាពជាក់ស្តែងជួយឱ្យអតិថិជនផ្សេងទៀតកាន់តែមានទំនុកចិត្តខ្ពស់ក្នុងការកុម្ម៉ង់ទិញ!
                        </p>

                        {feedbackPhoto ? (
                          <div className="relative inline-block mt-2">
                            <img 
                              src={feedbackPhoto} 
                              alt="Review Preview" 
                              className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-2xl border-2 border-orange-400 shadow-md"
                            />
                            <button
                              type="button"
                              onClick={() => { setFeedbackPhoto(null); setFeedbackPhotoName(''); }}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-lg hover:bg-red-700 transition cursor-pointer"
                              title="លុបរូបថតនេះចេញ"
                            >
                              ✕
                            </button>
                            <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                              <span>✅</span> បានភ្ជាប់រូបភាព ({feedbackPhotoName || 'រូបថត'})
                            </div>
                          </div>
                        ) : (
                          <label className="mt-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-orange-300 hover:border-orange-500 rounded-2xl bg-white hover:bg-orange-50/60 cursor-pointer transition text-center group">
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment"
                              onChange={handleFeedbackPhotoSelect} 
                              className="hidden" 
                            />
                            <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl group-hover:scale-110 transition mb-1.5 shadow-xs">
                              {feedbackPhotoLoading ? (
                                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                '📷'
                              )}
                            </div>
                            <span className="text-xs font-black text-gray-800">
                              {feedbackPhotoLoading ? 'កំពុងដំណើរការរូបភាព...' : 'ចុចទីនេះដើម្បីថត ឬជ្រើសរើសរូបថតស្បែកជើង'}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5">
                              ប្រព័ន្ធនឹងបង្រួមទំហំរូបភាពដោយស្វ័យប្រវត្តិកុំឱ្យធ្ងន់
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setVerifiedOrder(null)}
                          className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 text-xs font-black hover:bg-gray-100 transition cursor-pointer"
                        >
                          ថយក្រោយ
                        </button>
                        <button
                          type="submit"
                          className="bg-[#ff6a00] hover:bg-[#ea580c] text-white px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-orange-500/25 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                          <span>🚀</span> បញ្ជូន Feedback (Submit)
                        </button>
                      </div>

                    </form>
                  )}

                </div>
              )}

            </div>

          </div>
        </div>
      )}
      {/* ⭐️ Full-screen Zoom Lightbox for Customer Review Photo ⭐️ */}
      {reviewZoomPhoto && (
        <div 
          onClick={() => setReviewZoomPhoto(null)}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={reviewZoomPhoto} 
              alt="Customer Review Full" 
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <div className="mt-3 flex items-center justify-between w-full px-2">
              <span className="text-white/90 text-xs font-bold flex items-center gap-1.5">
                <span>📸</span> រូបថតជាក់ស្តែងពីអតិថិជន (Customer Review Photo)
              </span>
              <button
                type="button"
                onClick={() => setReviewZoomPhoto(null)}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-black px-4 py-1.5 rounded-full transition cursor-pointer"
              >
                ✕ បិទ (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⭐️ Share Toast Notification ⭐️ */}
      {shareToast && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 text-xs font-black flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <span>{shareToast}</span>
        </div>
      )}
</div>
  );
}
