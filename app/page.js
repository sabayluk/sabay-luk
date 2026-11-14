'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../supabase';

// ⭐️ Helper: បំប្លែងទិន្នន័យរូបភាពច្រើនសន្លឹក & បញ្ចុះតម្លៃ ធានាមិនបាត់ ១០០%
const parseProductMeta = (p) => {
  if (!p) return p;
  let images = Array.isArray(p.images) && p.images.length > 0 ? p.images : [];
  let retail_discount = p.retail_discount != null ? parseFloat(p.retail_discount) : 0;
  let wholesale_discount = p.wholesale_discount != null ? parseFloat(p.wholesale_discount) : 0;

  if (p.category_name) {
    try {
      if (typeof p.category_name === 'string' && p.category_name.startsWith('{')) {
        const meta = JSON.parse(p.category_name);
        if (Array.isArray(meta.images) && meta.images.length > 0 && images.length === 0) {
          images = meta.images;
        }
        if (meta.retail_discount != null && !retail_discount) retail_discount = parseFloat(meta.retail_discount);
        if (meta.wholesale_discount != null && !wholesale_discount) wholesale_discount = parseFloat(meta.wholesale_discount);
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
    retail_discount: retail_discount || 0,
    wholesale_discount: wholesale_discount || 0
  };
};

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

export default function CustomerStorefront() {
  // ⭐️ ភាសា (Bilingual: 'km' | 'en') & ពន្លឺថ្ងៃ/យប់ (Theme: 'light' | 'dark')
  const [language, setLanguage] = useState('km');
  const [themeMode, setThemeMode] = useState('light');
  const [isMounted, setIsMounted] = useState(false);

  // Load language & theme from localStorage after mount to prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      try {
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
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [currentProductVariants, setCurrentProductVariants] = useState([]);
  const [modalSelectedSize, setModalSelectedSize] = useState('');
  const [modalSelectedColor, setModalSelectedColor] = useState('');
  const [modalQty, setModalQty] = useState(1);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // ⭐️ States សម្រាប់ Checkout (កុម្ម៉ង់ទិញទំនិញស្ដង់ដារ)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerTelegram, setCustomerTelegram] = useState('');
  const [customerProvince, setCustomerProvince] = useState('ភ្នំពេញ');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'ABA KHQR'
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ⭐️ States សម្រាប់ Order Success Modal (ជោគជ័យ)
  const [orderSuccessModalOpen, setOrderSuccessModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // ⭐️ States សម្រាប់ Multi-Image Gallery ក្នុង Modal
  const [modalActiveImage, setModalActiveImage] = useState('');
  const [modalAllImages, setModalAllImages] = useState([]);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState('');

  // មុខងារទាញយករូបភាព ១ សន្លឹក
  const downloadSingleImage = async (imgUrl, filename) => {
    if (!imgUrl) return;
    try {
      const response = await fetch(imgUrl, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'product-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setDownloadSuccessMsg('✅ បានទាញយករូបភាពដោយជោគជ័យ!');
      setTimeout(() => setDownloadSuccessMsg(''), 3000);
    } catch (e) {
      // Fallback direct open
      const link = document.createElement('a');
      link.href = imgUrl;
      link.target = '_blank';
      link.download = filename || 'product-image.jpg';
      link.click();
    }
  };

  // មុខងារទាញយករូបភាពទាំងអស់ក្នុងពេលតែមួយ (Download All Photos)
  const downloadAllProductImages = async (imagesList, prodName) => {
    if (!imagesList || imagesList.length === 0) return;
    setIsDownloadingAll(true);
    setDownloadSuccessMsg('⏳ កំពុងទាញយករូបភាពទាំងអស់...');
    try {
      const cleanName = (prodName || 'sabay_product')
        .replace(/[^a-zA-Z0-9_\-\u1780-\u17FF]/g, '_')
        .slice(0, 30);
      for (let i = 0; i < imagesList.length; i++) {
        const ext = imagesList[i].split('.').pop()?.split('?')[0] || 'jpg';
        const filename = `${cleanName}_pic_${i + 1}.${ext}`;
        await downloadSingleImage(imagesList[i], filename);
        if (i < imagesList.length - 1) {
          await new Promise(res => setTimeout(res, 400));
        }
      }
      setDownloadSuccessMsg(`🎉 បានទាញយករូបភាពទាំងអស់ (${imagesList.length} សន្លឹក) ជោគជ័យ!`);
      setTimeout(() => setDownloadSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error downloading all images:', err);
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

  const handleLocationPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocationPhotoFile(file);
      setLocationPhotoPreview(URL.createObjectURL(file));
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
  const handleFeedbackPhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('សូមជ្រើសរើសឯកសារជារូបភាព!');
      return;
    }
    setFeedbackPhotoLoading(true);
    setFeedbackPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setFeedbackPhoto(dataUrl);
        setFeedbackPhotoLoading(false);
      };
      img.onerror = () => {
        setFeedbackPhoto(event.target.result);
        setFeedbackPhotoLoading(false);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setFeedbackPhotoLoading(false);
      alert('មានបញ្ហាក្នុងការអានរូបភាព!');
    };
    reader.readAsDataURL(file);
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

  // ⭐️ 3. States សម្រាប់ Recently Viewed Products (ទំនិញដែលបានមើលថ្មីៗ) ⭐️
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load recently viewed on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sabay_recently_viewed');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentlyViewed(parsed);
      }
    } catch (e) {}
  }, []);

  // មុខងារកត់ត្រាទំនិញដែលបានចុចមើល (Record Recently Viewed)
  const recordRecentlyViewedProduct = (product) => {
    if (!product || !product.id) return;
    try {
      const stored = localStorage.getItem('sabay_recently_viewed');
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter(p => String(p.id) !== String(product.id));
      list.unshift({
        id: product.id,
        name: product.name,
        price: product.price,
        retail_discount: product.retail_discount,
        image_url: product.image_url,
        stock_qty: product.stock_qty,
        category: product.category,
        sku: product.sku
      });
      list = list.slice(0, 10);
      localStorage.setItem('sabay_recently_viewed', JSON.stringify(list));
      setRecentlyViewed(list);
    } catch (e) {}
  };

  const clearRecentlyViewed = () => {
    try {
      localStorage.removeItem('sabay_recently_viewed');
      setRecentlyViewed([]);
    } catch (e) {}
  };

  // មុខងារ Share ទំនិញទៅ Telegram, Facebook ឬចម្លង Link
  const handleShareProduct = (e, product, platform = 'native') => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!product) return;

    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sabayluk.com';
    const shareUrl = `${siteUrl}?product=${product.id}`;
    const priceText = product.retail_discount && parseFloat(product.retail_discount) > 0
      ? `$${(parseFloat(product.price) - parseFloat(product.retail_discount)).toFixed(2)} (ចុះពី $${parseFloat(product.price).toFixed(2)})`
      : `$${parseFloat(product.price || 0).toFixed(2)}`;
    const shareTitle = `✨ ${product.name} - SABAY LUK`;
    const shareText = `🔥 មើលទំនិញនេះ៖ ${product.name}\n💰 តម្លៃត្រឹមតែ៖ ${priceText}\n📦 ដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត/ក្រុង!\n🔗 មើលលម្អិត & កុម្ម៉ង់ទិញ៖ ${shareUrl}`;

    if (platform === 'telegram') {
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
      window.open(tgUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'facebook') {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
      window.open(fbUrl, '_blank', 'noopener,noreferrer');
    } else if (platform === 'copy') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        setShareToast('✅ បានចម្លង Link ទំនិញជោគជ័យ!');
        setTimeout(() => setShareToast(''), 3000);
      }
    } else {
      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        setShareToast('✅ បានចម្លង Link ទំនិញជោគជ័យ!');
        setTimeout(() => setShareToast(''), 3000);
      }
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


  // ⭐️ States សម្រាប់ការកំណត់ហាង (Store Settings & Branding)
  const DEFAULT_STORE_SETTINGS = {
    storeName: 'SABAY LUK',
    storeSlogan: 'Premium Store',
    storeDescription: 'ហាងលក់ស្បែកជើង និងម៉ូដទាន់សម័យគុណភាពខ្ពស់ ផ្ដល់ទំនុកចិត្ត និងភាពស៊ីវិល័យសម្រាប់អ្នក។',
    logoUrl: '',
    phone: '096 720 5522',
    phone2: '012 345 678',
    telegram: 'Sabayluk',
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

  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);

  // ⭐️ ធ្វើបច្ចុប្បន្នភាពពណ៌ Brand Theme លើ Storefront ស្វ័យប្រវត្តិ ⭐️
  const brandColor = storeSettings.themeColor || '#ff6a00';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--brand-primary', brandColor);
    }
  }, [brandColor]);

  useEffect(() => {
    const loadSettings = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sabay_store_settings');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setStoreSettings(prev => ({
              ...prev,
              ...parsed,
              bankAccountName: parsed.bankAccountName || 'SENG SOVEASNA',
              bankAccountKhr: parsed.bankAccountKhr || '004 500 394',
              bankAccountUsd: parsed.bankAccountUsd || parsed.bankAccountNumber || '010 723 080',
              khqrImageUrl: parsed.khqrImageUrl || '/khqr-aba.jpg'
            }));
            if (parsed.themeColor && typeof document !== 'undefined') {
              document.documentElement.style.setProperty('--brand-primary', parsed.themeColor);
            }
          } catch (e) {}
        }
      }
    };
    loadSettings();
    window.addEventListener('storage', loadSettings);
    return () => window.removeEventListener('storage', loadSettings);
  }, []);

  useEffect(() => {
    const savedCover = localStorage.getItem('sabay_luk_cover');
    if (savedCover) {
      setCoverData(JSON.parse(savedCover));
    }
  }, []);

  // ទាញយក Products និង Categories ពី Supabase ផ្ទាល់
  const fetchProducts = async () => {
    const { data: prodData } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (prodData) {
      setProducts(prodData.map(parseProductMeta));
    }
  };

  useEffect(() => {
    async function fetchData() {
      await fetchProducts();

      // យក Categories ពី Supabase
      const { data: catData, error: catError } = await supabase.from('categories').select('*');
      if (!catError && catData && catData.length > 0) {
        setCategories(catData);
      } else {
        setCategories([
          { id: '1', name: 'ស្បែកជើង', icon: 'shoe' },
          { id: '2', name: 'នាឡិកា', icon: 'watch' },
          { id: '3', name: 'កាបូប', icon: 'bag' },
          { id: '4', name: 'ខ្សែក្រវ៉ាត់', icon: 'belt' },
        ]);
      }
    }
    fetchData();
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
  const displaySlides = activeSlidesList.length > 0 ? activeSlidesList : slides.slice(0, 1);

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

  // ⭐️ Auto-open product modal if ?product=ID is present in URL (1-Click Shared Link) ⭐️
  useEffect(() => {
    if (typeof window !== 'undefined' && products.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const sharedProdId = params.get('product');
      if (sharedProdId) {
        const found = products.find(p => String(p.id) === String(sharedProdId));
        if (found) {
          handleAddToCartClick(found);
        }
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
    setIsCheckoutOpen(true);
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
        image_url: product.image_url,
        size: 'ស្តង់ដារ',
        color: product.color || '',
        variantId: null,
        maxStock: product.stock_qty,
        qty: 1
      }];
    });
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
          image_url: selectedProductForVariant.image_url,
          size: modalSelectedSize,
          color: modalSelectedColor || selectedProductForVariant.color || '',
          variantId: variantId,
          maxStock: availableStock,
          qty: modalQty
        }
      ];
    });

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
          }
        } catch (sErr) {
          console.error('Slip upload error:', sErr);
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
          }
        } catch (pErr) {
          console.error('Location photo upload error:', pErr);
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
      const customerContact = customerPhone.trim();

      const orderPayload = {
        order_id: generatedOrderId,
        customer_name: customerName.trim(),
        phone: customerContact,
        phone_number: customerContact,
        telegram: customerTelegram.trim().replace(/^@/, '') || null,
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
            coupon_code: appliedCoupon ? appliedCoupon.code : null
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

      setCompletedOrder({
        ...orderPayload,
        customer: customerName.trim(),
        total: totalPrice,
        payment: paymentMethod,
        payment_slip_url: uploadedSlipUrl || null,
        created_at: new Date().toISOString()
      });

      setCart([]);
      setSlipFile(null);
      setSlipPreviewUrl(null);
      setLocationPhotoFile(null);
      setLocationPhotoPreview(null);
      setGoogleMapUrl('');
      setCheckoutModalOpen(false);
      setIsCartOpen(false);
      setOrderSuccessModalOpen(true);

      fetchProducts();

      // 🚨 ៤. ជូនដំណឹងស្វ័យប្រវត្តិតាម Telegram ពេលមានការបញ្ជាទិញថ្មី (New Order Alert)
      try {
        const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('sabay_store_settings') : null;
        const parsedSettings = savedSettings ? JSON.parse(savedSettings) : storeSettings;
        const botToken = (parsedSettings.telegramBotToken || storeSettings.telegramBotToken || '').trim();
        const chatId = (parsedSettings.telegramChatId || storeSettings.telegramChatId || '').trim();

        if (botToken && chatId) {
          fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botToken,
              chatId,
              storeName: parsedSettings.storeName || storeSettings.storeName || 'SABAY LUK',
              action: 'new_order',
              order: {
                order_id: generatedOrderId,
                customer_name: customerName.trim(),
                phone: customerContact,
                address: customerAddress.trim(),
                province: customerProvince,
                delivery_address: fullAddress,
                google_map_url: googleMapUrl || null,
                location_photo_url: uploadedLocationPhotoUrl || null,
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
        }

        // 🚨 ជូនដំណឹងបន្ថែមបើស្តុកធ្លាក់ដល់កម្រិតទាប (Low Stock Alert)
        if (affectedLowStockItems.length > 0 && parsedSettings.enableLowStockAlert !== false && botToken && chatId) {
          fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botToken,
              chatId,
              storeName: parsedSettings.storeName || storeSettings.storeName || 'SABAY LUK',
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
          order_id: generatedOrderId,
          customer_name: customerName.trim(),
          phone: customerContact,
          total: totalPrice,
          itemsCount: cart.length,
          payment: paymentMethod,
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

  // ⭐️ Helper: បង្ហាញរូបសញ្ញា SVG Icon ស្តង់ដារដែលស្រដៀងនឹង Category Management ⭐️
  const getCategorySvgIcon = (cat, isSelected = false) => {
    const iconId = (cat.icon || '').toLowerCase();
    const name = (cat.name || '').toLowerCase();

    // ពិនិត្យតាម Icon ID ឬតាមឈ្មោះ Category
    if (iconId === 'heel' || name.includes('កែង')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-3-7a2 2 0 00-1.8-1.2H12l-4 3-3 1.5A2 2 0 003.5 14L4 18h16.5a1 1 0 00.5-2zM15 8l2 8M6 18v3"></path>
        </svg>
      );
    }
    if (iconId === 'shoe' || name.includes('ស្បែកជើង')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.2 14.3l-2.6-6.5a2 2 0 00-1.9-1.3H11l-3 3-4.5 1A2 2 0 002 12.5v3A2.5 2.5 0 004.5 18h13a2.5 2.5 0 002.5-2.5 2.5 2.5 0 00.2-1.2z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 14.5h18.5"></path>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5l-4-1.5"></path>
        </svg>
      );
    }
    if (iconId === 'watch' || name.includes('នាឡិកា')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <rect x="7" y="5" width="10" height="14" rx="3" ry="3"></rect>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6M9 22h6M17 12h1.5M12 9v3l1.5 1.5"></path>
        </svg>
      );
    }
    if (iconId === 'bag' || name.includes('កាបូប')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2"></path>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h.01M15 14h.01"></path>
        </svg>
      );
    }
    if (iconId === 'belt' || name.includes('ខ្សែក្រវ៉ាត់')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10c-1-3-4-4-7-4S5 7 5 10c0 2.5 2 4 5 4s5-1.5 5-4"></path>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v4c0 3 3 4 7 4s7-1 7-4v-4"></path>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10a2 2 0 100-4 2 2 0 000 4z"></path>
        </svg>
      );
    }
    if (iconId === 'shirt' || name.includes('សម្លៀកបំពាក់') || name.includes('អាវ') || name.includes('ខោ')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 1.89v1.15a2 2 0 001.62 1.96l1.38.23V20a2 2 0 002 2h11a2 2 0 002-2V8.69l1.38-.23a2 2 0 001.62-1.96V5.35a2 2 0 00-1.34-1.89z"></path>
        </svg>
      );
    }
    if (iconId === 'glasses' || name.includes('វ៉ែនតា')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 14h3a3 3 0 003-3V9m6 5h3a3 3 0 003-3V9m-6 3a3 3 0 100-6 3 3 0 000 6zm-9 0a3 3 0 100-6 3 3 0 000 6z"></path>
        </svg>
      );
    }
    if (iconId === 'hat' || name.includes('មួក')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a7 7 0 00-7 7c0 2 1 3.5 2 4.5h10c1-1 2-2.5 2-4.5a7 7 0 00-7-7zM3 16h18a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
        </svg>
      );
    }
    if (iconId === 'perfume' || name.includes('ទឹកអប់')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 2h4M12 2v4m-5 4h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2z"></path>
        </svg>
      );
    }
    if (iconId === 'ring' || name.includes('គ្រឿងអលង្ការ') || name.includes('ចិញ្ចៀន')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8a6 6 0 100 12 6 6 0 000-12zm0-4l2.5 3h-5L12 4z"></path>
        </svg>
      );
    }
    if (iconId === 'tag' || name.includes('ប្រូម៉ូសិន') || name.includes('បញ្ចុះតម្លៃ')) {
      return (
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M4.93 4.93a10 10 0 0114.14 0l1.41 1.41a2 2 0 010 2.83L11 18.66a2 2 0 01-2.83 0L3.52 14.01a2 2 0 010-2.83l1.41-1.41a10 10 0 010-4.84z"></path>
        </svg>
      );
    }

    // Default icon: Clean box SVG
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
      </svg>
    );
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${themeMode === 'dark' ? 'bg-[#0b0f19] text-gray-100 dark' : 'bg-[#fafafa] text-gray-900'} selection:bg-orange-500 selection:text-white pb-16 md:pb-0`}>
      
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
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            {storeSettings.logoUrl ? (
              <img src={storeSettings.logoUrl} alt={storeSettings.storeName} className="h-10 w-auto max-w-[160px] object-contain group-hover:scale-105 transition" />
            ) : (
              <div style={{ backgroundColor: brandColor }} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition">
                {(storeSettings.storeName || 'S').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none group-hover:text-[#ff6a00] transition">
                {storeSettings.storeName || 'SABAY LUK'}
              </div>
              <p className="text-[9px] font-extrabold text-gray-400 tracking-widest uppercase mt-0.5">
                {storeSettings.storeSlogan || 'Premium Store'}
              </p>
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
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-sm font-semibold">
            
            {/* 🌐 Bilingual Switcher (ភាសាខ្មែរ / English) */}
            <button 
              type="button"
              onClick={() => toggleLanguage()}
              className={`cursor-pointer flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-2xl transition text-xs font-black border shadow-2xs ${
                themeMode === 'dark' 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
              title={language === 'km' ? 'Switch to English' : 'ប្តូរជាភាសាខ្មែរ'}
            >
              <span className="text-sm">{language === 'km' ? '🇰🇭' : '🇺🇸'}</span>
              <span>{language === 'km' ? 'ខ្មែរ' : 'EN'}</span>
            </button>

            {/* ☀️ Day / Night Theme Switcher (ពន្លឺថ្ងៃ និងយប់) */}
            <button 
              type="button"
              onClick={toggleThemeMode}
              className={`cursor-pointer flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-2xl transition text-xs font-black border shadow-2xs ${
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
              className={`cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-2xl transition text-xs font-bold border shadow-2xs ${
                themeMode === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-gray-50 hover:bg-orange-50 text-gray-700 hover:text-[#ff6a00] border-gray-200 hover:border-orange-200'
              }`}
            >
              <span className="text-sm">🔍</span>
              <span className="hidden sm:inline">{t('trackOrder', 'តាមដានការកុម្ម៉ង់')}</span>
            </button>

            {/* Cart Button with Total Preview */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="cursor-pointer bg-gradient-to-r from-[#312c5b] to-[#c85f2d] hover:from-[#252248] hover:to-[#b65426] text-white flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl transition shadow-md group active:scale-95 text-xs font-black"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Categories Sidebar */}
          <div className={`lg:col-span-3 ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'} rounded-3xl p-5 border shadow-xs flex flex-col justify-between transition-colors`}>
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-base">📁</span>
                  <h3 className="font-black text-sm text-gray-900 tracking-wide uppercase">
                    ប្រភេទផលិតផល
                  </h3>
                </div>
                <span className="text-gray-400 text-xs font-bold">({products.length})</span>
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
            
            {/* Quick Hotline Box */}
            <div className="mt-6 pt-4 border-t border-gray-100 bg-orange-50/60 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">សេវាបម្រើអតិថិជន ២៤/៧</p>
              <a href="tel:0967205522" className="text-xs font-black text-[#ff6a00] mt-0.5 block hover:underline">
                📞 096 720 5522
              </a>
            </div>
          </div>

          {/* ⭐️ Hero Banner Auto-Slide (Ultra-Modern Cinematic Cover) ⭐️ */}
          <div 
            className="lg:col-span-9 rounded-3xl relative overflow-hidden min-h-[400px] sm:min-h-[440px] shadow-xl bg-gray-950 flex items-center group select-none"
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
                  className={`absolute inset-0 transition-all duration-1000 ease-in-out bg-cover bg-center flex flex-col justify-center p-8 sm:p-12 md:p-16 text-white ${
                    isCurrent ? 'opacity-100 scale-100 z-10 pointer-events-auto' : 'opacity-0 scale-105 z-0 pointer-events-none'
                  }`}
                  style={{ backgroundImage: bgImg }}
                >
                  <div className={`max-w-2xl flex flex-col ${alignClasses} ${slide.align === 'center' ? 'mx-auto' : ''}`}>
                    
                    {/* Glassmorphic Badge Tag */}
                    {slide.badge && (
                      <span 
                        style={{ backgroundColor: brandColor }} 
                        className="inline-flex items-center gap-2 text-white text-[11px] sm:text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 shadow-xl shadow-black/30 backdrop-blur-md border border-white/20 transform transition duration-500 hover:scale-105"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        {slide.badge}
                      </span>
                    )}
                    
                    {/* Main Title */}
                    {slide.title && (
                      <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[42px] font-black mb-3 leading-tight text-white drop-shadow-xl tracking-tight">
                        {slide.title}
                      </h1>
                    )}
                    
                    {/* Description */}
                    {slide.desc && (
                      <p className="text-gray-100/90 text-xs sm:text-sm md:text-base mb-7 leading-relaxed font-medium line-clamp-2 sm:line-clamp-3 drop-shadow-md max-w-xl">
                        {slide.desc}
                      </p>
                    )}
                    
                    {/* CTA Button */}
                    {slide.btnText && (
                      <button 
                        type="button"
                        onClick={() => handleHeroBannerCta(slide)}
                        className="bg-white hover:bg-orange-50 text-gray-900 px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm w-max transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-2.5 cursor-pointer border border-white/40 hover:shadow-orange-500/20"
                      >
                        <span>{slide.btnText}</span>
                        <span className="text-base transition-transform group-hover:translate-x-1">→</span>
                      </button>
                    )}

                  </div>
                </div>
              );
            })}

            {/* Interactive Left & Right Floating Arrows */}
            {displaySlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevHeroSlide}
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-black/40 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-90 border border-white/20 shadow-xl cursor-pointer"
                  title="Slide មុន"
                  aria-label="Previous Slide"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  type="button"
                  onClick={nextHeroSlide}
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-black/40 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-90 border border-white/20 shadow-xl cursor-pointer"
                  title="Slide បន្ទាប់"
                  aria-label="Next Slide"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            )}

            {/* Dots Indicators */}
            {displaySlides.length > 1 && (
              <div className="absolute bottom-5 right-6 sm:right-8 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
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
                          ? 'w-7 sm:w-8 h-2.5 shadow-md' 
                          : 'w-2.5 h-2.5 bg-white/50 hover:bg-white hover:scale-110'
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

            {/* ⭐️ 4. TRUST & GUARANTEE BADGES BAR (៤ ចំណុចបង្កើនទំនុកចិត្ត) ⭐️ */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'} p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5 hover:border-orange-200 transition-colors`}>
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#ff6a00] flex items-center justify-center text-2xl flex-shrink-0">
              🚚
            </div>
            <div>
              <h4 className={`font-black text-xs leading-tight ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('fastDelivery', 'ដឹកជញ្ជូនរហ័សទូទាំងប្រទេស')}</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">{t('fastDeliveryDesc', 'ឥតគិតថ្លៃគ្រប់ ២៥ ខេត្ត/ក្រុង')}</p>
            </div>
          </div>

          <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'} p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5 hover:border-orange-200 transition-colors`}>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl flex-shrink-0">
              🔄
            </div>
            <div>
              <h4 className={`font-black text-xs leading-tight ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('exchangePolicy', 'ធានាប្តូរ Size ឥតគិតថ្លៃ')}</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">{t('exchangePolicyDesc', 'ក្នុងរយៈពេល ៧ ថ្ងៃយ៉ាងងាយ')}</p>
            </div>
          </div>

          <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'} p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5 hover:border-orange-200 transition-colors`}>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl flex-shrink-0">
              🛡️
            </div>
            <div>
              <h4 className={`font-black text-xs leading-tight ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('genuineWarranty', 'ទំនិញគុណភាពពិត ១០០%')}</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">{t('genuineWarrantyDesc', 'ធានាទាំងម៉ូត និងគុណភាពខ្ពស់')}</p>
            </div>
          </div>

          <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'} p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5 hover:border-orange-200 transition-colors`}>
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl flex-shrink-0">
              💬
            </div>
            <div>
              <h4 className={`font-black text-xs leading-tight ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('support247', 'សេវាបម្រើអតិថិជន ២៤/៧')}</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">{t('support247Desc', 'ប្រឹក្សាយោបល់ និងឆ្លើយតបរហ័ស')}</p>
            </div>
          </div>

        </div>
      </section>

      {/* ⭐️ 5. PRODUCT CATALOG WITH SMART FILTER & SORT BAR ⭐️ */}
      <section id="products-section" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        
        {/* 📱 Mobile & Tablet Horizontal Scrolling Category Bar with SVG Icons */}
        <div className="lg:hidden mb-5 overflow-x-auto pb-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap shrink-0 shadow-2xs cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-[#18181b] to-[#27272a] text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className={`p-1 rounded-lg ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'text-gray-500'}`}>
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
            </span>
            <span>ទាំងអស់</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {products.length}
            </span>
          </button>

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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap shrink-0 shadow-2xs cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff6a00] to-[#ea580c] text-white shadow-md shadow-orange-500/25'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={`p-1 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-50 text-[#ff6a00]'}`}>
                  {getCategorySvgIcon(cat, isSelected)}
                </span>
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Catalog Control Bar */}
        <div className={`${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'} p-4 rounded-3xl border shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4 transition-colors`}>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#ff6a00] flex items-center justify-center text-lg font-bold">
              🏷️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                {selectedCategory === 'all' ? (language === 'km' ? 'ទំនិញពេញនិយមទាំងអស់' : 'All Popular Products') : selectedCategory}
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">
                {language === 'km' ? `បង្ហាញចំនួន (${sortedProducts.length}) មុខទំនិញក្នុងស្តុក` : `Showing (${sortedProducts.length}) items in stock`}
              </p>
            </div>
          </div>

          {/* Controls: In-Stock Toggle & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle In-Stock */}
            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-2xl border border-gray-200 text-xs font-bold text-gray-700 select-none">
              <input 
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#ff6a00] rounded"
              />
              <span>{t('inStockOnly', 'មានស្តុកស្រាប់')}</span>
            </label>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-700">
              <span className="text-gray-400">តម្រៀប៖</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-bold text-gray-900"
              >
                <option value="newest">✨ ថ្មីៗបំផុត (Newest)</option>
                <option value="popular">🔥 លក់ដាច់បំផុត (Popular)</option>
                <option value="price_low">📉 តម្លៃទាប ➔ ខ្ពស់</option>
                <option value="price_high">📈 តម្លៃខ្ពស់ ➔ ទាប</option>
              </select>
            </div>
          </div>

        </div>

        {/* Product Grid */}
        {sortedProducts.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-3xl border border-dashed border-gray-200 text-gray-400 font-bold">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm text-gray-600 font-black">រកមិនឃើញផលិតផលដែលអ្នកចង់បានទេ។</p>
            <p className="text-xs text-gray-400 mt-1">សូមសាកល្បងស្វែងរកពាក្យផ្សេង ឬដោះការច្រោះប្រភេទចេញ!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
            {sortedProducts.map((product) => {
              const isOutOfStock = product.stock_qty <= 0;
              const isLowStock = product.stock_qty > 0 && product.stock_qty < 5;
              const badgeText = isOutOfStock ? 'ដាច់ស្តុក' : (isLowStock ? 'ជិតអស់' : 'New');
              const badgeBg = isOutOfStock ? 'bg-red-500' : (isLowStock ? 'bg-[#ff6a00]' : 'bg-[#18181b]');
              
              const sizesList = getProductSizeList(product.size);

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
                        className="font-black text-xs sm:text-sm text-gray-900 line-clamp-1 mb-1 group-hover:text-[#ff6a00] transition cursor-pointer"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                      
                      {/* Available Sizes Pills Preview */}
                      {sizesList.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {sizesList.map((sz, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-600 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                              {sz}
                            </span>
                          ))}
                          {sizesList.length >= 5 && <span className="text-[9px] text-gray-400 font-bold">+</span>}
                        </div>
                      )}

                      {/* Rating & Dynamic Feedback Pill (1 Order = 1 Feedback Verified) */}
                      {(() => {
                        const fbStats = getProductFeedbackStats(product.id, product.name);
                        return (
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <div 
                              onClick={(e) => { e.stopPropagation(); openFeedbackModal(product); }}
                              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition"
                              title="ចុចដើម្បីមើល Feedback"
                            >
                              <span className="text-amber-400 text-xs font-black">★</span>
                              <span className="text-xs font-black text-gray-800">{fbStats.avg}</span>
                              <span className="text-[10px] text-gray-400 font-bold">({fbStats.count} មតិ)</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openFeedbackModal(product, true); }}
                              className="text-[10px] font-black text-[#ff6a00] hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-lg transition border border-orange-200/60 flex items-center gap-1 cursor-pointer"
                              title="សរសេរ Feedback លើទំនិញនេះ (ត្រូវការ Order ID)"
                            >
                              <span>✍️</span> Feedback
                            </button>
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

      {/* ⭐️ 6.5. RECENTLY VIEWED PRODUCTS (ទំនិញដែលបានមើលថ្មីៗ) ⭐️ */}
      {recentlyViewed && recentlyViewed.length > 0 && (
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
              {recentlyViewed.map((prod) => {
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
      )}

      {/* ⭐️ 7. FLOATING QUICK CONTACT (TELEGRAM, MESSENGER, TIKTOK & CALL) ⭐️ */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2 select-none">
        
        {/* Expanded Social Channels Menu */}
        {isSocialMenuOpen && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Telegram Button */}
            {storeSettings.telegram && (
              <a 
                href={storeSettings.telegram.startsWith('http') ? storeSettings.telegram : `https://t.me/${storeSettings.telegram.replace(/^@/, '')}`}
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95">
            
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
                onClick={() => setVariantModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center font-bold text-sm shadow-xs transition"
                title="បិទ (Close)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 2 Columns Layout */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* 📷 LEFT COLUMN: Interactive Photo Gallery & Download Suite (md:col-span-6) */}
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
                          className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition block ${
                            modalActiveImage === imgUrl ? 'border-[#ff6a00] ring-2 ring-orange-200 scale-105' : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
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
                  {/* Title & Stock Status */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                      {selectedProductForVariant.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-amber-400 text-sm">★★★★★</span>
                      {(() => {
                        const fbStats = getProductFeedbackStats(selectedProductForVariant.id, selectedProductForVariant.name);
                        return (
                          <>
                            <span className="text-xs font-black text-gray-800">{fbStats.avg}</span>
                            <button
                              type="button"
                              onClick={() => openFeedbackModal(selectedProductForVariant)}
                              className="text-xs text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
                            >
                              ({fbStats.count} មតិយោបល់អតិថិជន)
                            </button>
                            <button
                              type="button"
                              onClick={() => openFeedbackModal(selectedProductForVariant, true)}
                              className="text-[10px] font-black bg-orange-50 hover:bg-orange-100 text-[#ff6a00] border border-orange-200 px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                              <span>✍️</span> សរសេរ Feedback
                            </button>
                          </>
                        );
                      })()}
                      <span className="text-gray-300">•</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${selectedProductForVariant.stock_qty > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {selectedProductForVariant.stock_qty > 0 ? `មានក្នុងស្តុក (${selectedProductForVariant.stock_qty})` : 'ដាច់ស្តុក'}
                      </span>
                    </div>
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

                  {/* 📤 Social Share Bar (Telegram, Facebook & Copy Link) */}
                  <div className="bg-gray-50 border border-gray-200/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                      <span>📤</span> ចែករំលែកទំនិញ៖
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleShareProduct(e, selectedProductForVariant, 'telegram')}
                        className="bg-[#24A1DE] hover:bg-[#1f8ec4] text-white px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                        title="ផ្ញើទៅកាន់ Telegram"
                      >
                        <span>✈️</span> Telegram
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

                  {/* Trust & Guarantee Badges inside Modal */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-bold text-gray-600">
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-1.5">
                      <span>🚚</span> ដឹកឥតគិតថ្លៃ
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-1.5">
                      <span>🔄</span> ប្តូរ Size ៧ ថ្ងៃ
                    </div>
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-1.5">
                      <span>🛡️</span> គុណភាពពិត ១០០%
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

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ⭐️ 9. CART DRAWER (កន្រ្តកទំនិញស្តង់ដារ) ⭐️ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
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
                {/* 🏷️ Promo Code / Coupon Section in Cart Drawer */}
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                      <span>🏷️</span> កូដបញ្ចុះតម្លៃ (Promo Code)
                    </span>
                    {appliedCoupon && (
                      <button 
                        type="button" 
                        onClick={handleRemoveCoupon} 
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        ✕ ដោះកូដចេញ
                      </button>
                    )}
                  </div>

                  {appliedCoupon ? (
                    <div className="bg-emerald-50 border border-emerald-300 p-2 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-emerald-600 text-white font-mono font-black px-1.5 py-0.5 rounded text-[10px]">
                          {appliedCoupon.code}
                        </span>
                        <span className="font-bold text-[11px]">{appliedCoupon.label}</span>
                      </div>
                      <span className="font-black text-emerald-700 text-xs">
                        -{appliedCoupon.type === 'percent' ? `${appliedCoupon.value}%` : `$${appliedCoupon.value.toFixed(2)}`}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          placeholder="វាយកូដ (ឧ. SABAY10)" 
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold uppercase focus:border-orange-500 outline-none"
                        />
                        <button 
                          type="button" 
                          onClick={() => handleApplyCoupon()}
                          className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95"
                        >
                          ប្រើ
                        </button>
                      </div>

                      {/* Quick Suggestion Pills */}
                      <div className="flex flex-wrap gap-1">
                        {getDisplayCoupons().slice(0, 4).map((cpn) => (
                          <button
                            key={cpn.code}
                            type="button"
                            onClick={() => handleApplyCoupon(cpn.code)}
                            className="bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border border-dashed border-gray-300 hover:border-orange-400 px-1.5 py-0.5 rounded-lg text-[9px] font-black transition cursor-pointer flex items-center gap-0.5"
                          >
                            <span>🏷️</span>
                            <span>{cpn.code}</span>
                            <span className="text-orange-500 font-bold">({cpn.type === 'percent' ? `-${cpn.value}%` : `-$${cpn.value}`})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {couponMsg && (
                    <div className={`text-[10px] font-bold p-1.5 rounded-lg ${couponMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-600'}`}>
                      {couponMsg.text}
                    </div>
                  )}
                </div>

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

      {/* ⭐️ 10. FULL-OPTION CHECKOUT MODAL ⭐️ */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[94vh] overflow-y-auto">
            <button 
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-5">
              <span className="text-2xl">🛍️</span>
              <div>
                <h3 className="font-black text-lg text-gray-900 leading-tight">បញ្ជាក់ការបញ្ជាទិញ (Checkout Order)</h3>
                <p className="text-xs text-gray-500">សូមបំពេញព័ត៌មានដឹកជញ្ជូន និងជ្រើសរើសវិធីសាស្ត្រទូទាត់</p>
              </div>
            </div>

            <form onSubmit={handleProcessOrder} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📍</span> ព័ត៌មានអតិថិជន និងទីតាំងដឹកជញ្ជូន
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      ឈ្មោះអ្នកទទួល <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="ឧ. សុខ ចាន់ណា"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      លេខទូរស័ព្ទទំនាក់ទំនង <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel"
                      required
                      placeholder="ឧ. 096 123 4567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><span>✈️</span> Telegram (ទទួលវិក្កយបត្រ PDF)</span>
                      <span className="text-[10px] text-gray-400 font-normal">មិនបាច់ដាក់ក៏បាន</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="ឧ. @username ឬលេខទូរស័ព្ទ Telegram"
                      value={customerTelegram}
                      onChange={(e) => setCustomerTelegram(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      រាជធានី / ខេត្ត <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={customerProvince}
                      onChange={(e) => setCustomerProvince(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
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
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      អាសយដ្ឋានលម្អិត / ចំណាំ <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="ផ្ទះលេខ ផ្លូវ ឬទីតាំងចំណាំ..."
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* ⭐️ GOOGLE MAPS LOCATION PIN & LINK ⭐️ */}
                  <div className="pt-2 border-t border-gray-200/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <span>🗺️</span> ទីតាំងផែនទី Google Maps (សម្រាប់អ្នកដឹកជញ្ជូន)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleGetCurrentLocation}
                          disabled={isLocating}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-black transition flex items-center gap-1 border border-blue-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <span>{isLocating ? '⏳' : '📍'}</span>
                          <span>{isLocating ? 'កំពុងចាប់ទីតាំង...' : 'ចាប់យក GPS បច្ចុប្បន្ន'}</span>
                        </button>
                        <a
                          href="https://www.google.com/maps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 border border-gray-200"
                        >
                          <span>↗️</span> បើក Maps
                        </a>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        placeholder="បិទភ្ជាប់ (Paste) Link ពី Google Maps នៅទីនេះ (ឧ. https://maps.app.goo.gl/...)"
                        value={googleMapUrl}
                        onChange={(e) => setGoogleMapUrl(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 pr-16"
                      />
                      {googleMapUrl && (
                        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                          <a
                            href={googleMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-1 rounded-lg hover:bg-emerald-200 transition"
                          >
                            មើល
                          </a>
                          <button
                            type="button"
                            onClick={() => setGoogleMapUrl('')}
                            className="text-gray-400 hover:text-red-500 text-xs px-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    {googleMapUrl && (
                      <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <span>✅</span> បានកំណត់ Link ទីតាំង Google Maps រួចរាល់!
                      </p>
                    )}
                  </div>

                  {/* ⭐️ HOUSE / WORKPLACE PHOTO UPLOAD ⭐️ */}
                  <div className="pt-2 border-t border-gray-200/80 space-y-2">
                    <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>🏠</span> រូបថតផ្ទះ ឬកន្លែងធ្វើការ (ជួយអ្នកដឹកស្គាល់ទីតាំង)
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                    </label>

                    {locationPhotoPreview ? (
                      <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-200">
                        <img
                          src={locationPhotoPreview}
                          alt="House / Workplace"
                          className="w-14 h-14 object-cover rounded-lg border border-gray-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">
                            {locationPhotoFile ? locationPhotoFile.name : 'រូបថតទីតាំង'}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✅ បានជ្រើសរើសរូបថតផ្ទះ/កន្លែងធ្វើការ</p>
                          <button
                            type="button"
                            onClick={() => {
                              setLocationPhotoFile(null);
                              setLocationPhotoPreview(null);
                            }}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold mt-0.5 underline cursor-pointer"
                          >
                            លុបរូបថតចេញ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer transition text-xs font-bold text-gray-600">
                        <span>📸</span>
                        <span>ថត ឬ Upload រូបថតផ្ទះ / ស្លាកសញ្ញាកន្លែងធ្វើការ</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLocationPhotoChange}
                          className="hidden"
                        />
                      </label>
                    )}
                    <p className="text-[10px] text-gray-400">
                      ជួយឱ្យអ្នកដឹកជញ្ជូនស្គាល់ច្រកចូល ពណ៌ផ្ទះ ឬស្លាកសញ្ញាបានរហ័ស មិនបាច់ខលសួរច្រើនដង។
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💳</span> ជ្រើសរើសវិធីសាស្ត្រទូទាត់ប្រាក់
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label 
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                      paymentMethod === 'COD' 
                        ? 'border-orange-500 bg-orange-50/70 text-orange-900 shadow-2xs' 
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="accent-orange-600"
                    />
                    <div>
                      <div className="font-black text-xs">💵 បង់ប្រាក់ពេលទទួល (COD)</div>
                      <div className="text-[10px] text-gray-500">ពិនិត្យទំនិញរួច ទើបប្រគល់ប្រាក់ជូនអ្នកដឹក</div>
                    </div>
                  </label>

                  <label 
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                      paymentMethod === 'ABA KHQR' 
                        ? 'border-orange-500 bg-orange-50/70 text-orange-900 shadow-2xs' 
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      checked={paymentMethod === 'ABA KHQR'}
                      onChange={() => setPaymentMethod('ABA KHQR')}
                      className="accent-orange-600"
                    />
                    <div>
                      <div className="font-black text-xs">📱 ស្កេនទូទាត់ ABA KHQR</div>
                      <div className="text-[10px] text-gray-500">ទូទាត់តាម Bakong / គ្រប់ធនាគារ</div>
                    </div>
                  </label>
                </div>

                {/* ⭐️ INTERACTIVE BAKONG / ABA KHQR CARD & SLIP UPLOAD ⭐️ */}
                {paymentMethod === 'ABA KHQR' && (
                  <div className="bg-gradient-to-b from-gray-50 to-white p-4 sm:p-5 rounded-2xl border-2 border-red-100 shadow-sm space-y-4 animate-in fade-in">
                    
                    {/* KHQR Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md max-w-sm mx-auto">
                      {/* KHQR Official Red Header */}
                      <div className="bg-[#E1251B] text-white px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-sm tracking-wider">
                          <span className="bg-white text-[#E1251B] px-1.5 py-0.5 rounded text-[10px] font-black">KH</span>
                          <span>QR</span>
                        </div>
                        <span className="text-[11px] font-bold tracking-wide">BAKONG / ABA PAY</span>
                      </div>

                      {/* Store Name & Amount */}
                      <div className="p-4 text-center border-b border-gray-100">
                        <p className="text-xs font-black text-gray-900 tracking-wide uppercase">
                          {storeSettings.bankAccountName || storeSettings.storeName || 'SENG SOVEASNA'}
                        </p>
                        <div className="mt-1">
                          <span className="text-2xl font-black text-[#ff6a00]">${totalPrice.toFixed(2)}</span>
                          <span className="block text-xs font-bold text-gray-500 mt-0.5">≈ {totalRiel.toLocaleString()} ៛</span>
                        </div>
                      </div>

                      {/* Dynamic Real QR Code Image */}
                      <div className="p-4 flex flex-col items-center justify-center bg-gray-50/50">
                        <div className="bg-white p-3 rounded-2xl border-2 border-gray-200 shadow-inner">
                          <img 
                            src={storeSettings.khqrImageUrl || '/khqr-aba.jpg'} 
                            alt="KHQR Code" 
                            className="w-48 h-auto max-h-64 object-contain rounded-lg"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold mt-2.5 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-2xs">
                          <span>✨</span> <span>ស្កេនបានទាំង <b className="text-emerald-700">ប្រាក់រៀល (KHR)</b> & <b className="text-blue-700">ប្រាក់ដុល្លារ (USD)</b></span>
                        </p>
                      </div>

                      {/* Bank Details & Copy Buttons */}
                      <div className="px-4 py-3.5 bg-gray-50 text-xs border-t border-gray-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-bold">ធនាគារ៖</span>
                          <span className="font-black text-gray-900">ABA Bank (KHQR Multi-Currency)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-bold">ឈ្មោះគណនី៖</span>
                          <span className="font-black text-gray-900 uppercase">
                            {storeSettings.bankAccountName || 'SENG SOVEASNA'}
                          </span>
                        </div>

                        {/* KHR Account */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/70">
                          <span className="text-gray-700 font-bold flex items-center gap-1.5">
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
                          <span className="text-gray-700 font-bold flex items-center gap-1.5">
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
                    <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                          <span>📎</span> ភ្ជាប់វិក្កយបត្រផ្ទេរប្រាក់ (Payment Slip / Screenshot)
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">(ជម្រើស ឬចាំបាច់)</span>
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
                            className="text-gray-400 hover:text-red-500 font-black text-sm p-1"
                            title="ដកចេញ"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="border border-dashed border-gray-300 hover:border-orange-400 bg-gray-50/70 hover:bg-orange-50/50 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition text-center group">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const f = e.target.files[0];
                              if (f) {
                                setSlipFile(f);
                                setSlipPreviewUrl(URL.createObjectURL(f));
                              }
                            }} 
                            className="hidden" 
                          />
                          <span className="text-base group-hover:scale-110 transition">📸</span>
                          <span className="text-xs font-bold text-gray-600 group-hover:text-orange-600">
                            ចុចទីនេះ ដើម្បីភ្ជាប់រូបភាពវិក្កយបត្រផ្ទេរប្រាក់ (Slip)
                          </span>
                        </label>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                        💡 បន្ទាប់ពីផ្ទេរប្រាក់រួច សូមភ្ជាប់រូបភាព Slip ដើម្បីឱ្យហាងឆាប់បញ្ជាក់ការដឹកជញ្ជូន។
                      </p>
                    </div>

                  </div>
                )}
              </div>

              {/* 🏷️ Promo Code / Coupon Section in Checkout Modal */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                    <span>🏷️</span> កូដបញ្ចុះតម្លៃ (Promo Code)
                  </span>
                  {appliedCoupon && (
                    <button 
                      type="button" 
                      onClick={handleRemoveCoupon} 
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      ✕ ដោះកូដចេញ
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-600 text-white font-mono font-black px-2 py-0.5 rounded text-[11px]">
                        {appliedCoupon.code}
                      </span>
                      <span className="font-bold">{appliedCoupon.label}</span>
                    </div>
                    <span className="font-black text-emerald-700">
                      -{appliedCoupon.type === 'percent' ? `${appliedCoupon.value}%` : `$${appliedCoupon.value.toFixed(2)}`}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="វាយបញ្ចូលកូដ (ឧ. SABAY10)" 
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:border-orange-500 outline-none"
                      />
                      <button 
                        type="button" 
                        onClick={() => handleApplyCoupon()}
                        className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-95"
                      >
                        ប្រើកូដ
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {getDisplayCoupons().slice(0, 4).map((cpn) => (
                        <button
                          key={cpn.code}
                          type="button"
                          onClick={() => handleApplyCoupon(cpn.code)}
                          className="bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border border-dashed border-gray-300 hover:border-orange-400 px-2 py-0.5 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1"
                        >
                          <span>🏷️</span>
                          <span>{cpn.code}</span>
                          <span className="text-orange-500 font-bold">({cpn.type === 'percent' ? `-${cpn.value}%` : `-$${cpn.value}`})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {couponMsg && (
                  <div className={`text-[11px] font-bold p-2 rounded-lg ${couponMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-600'}`}>
                    {couponMsg.text}
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-2">
                  <span>ទំនិញសរុប ({cart.length} មុខ):</span>
                  <span>${subtotalPrice.toFixed(2)}</span>
                </div>
                {appliedCoupon && couponDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-600 mb-2">
                    <span>បញ្ចុះតម្លៃ Promo Code ({appliedCoupon.code}):</span>
                    <span>-${couponDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                {isTaxEnabled && taxAmount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-blue-600 mb-2">
                    <span>ពន្ធអាករ (VAT {taxRatePercent}%):</span>
                    <span>{taxMode === 'inclusive' ? '(រួមបញ្ចូល) ' : '+'}${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 mb-2">
                  <span>ថ្លៃដឹកជញ្ជូន:</span>
                  <span>ឥតគិតថ្លៃ (Free)</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                  <span className="font-black text-sm text-gray-900">ទឹកប្រាក់សរុប (Total):</span>
                  <div className="text-right">
                    <span className="font-black text-xl text-[#ff6a00]">${totalPrice.toFixed(2)}</span>
                    <span className="block text-[11px] font-bold text-gray-500">({totalRiel.toLocaleString()} ៛)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full bg-[#ff6a00] hover:bg-[#ea580c] text-white py-4 rounded-2xl font-black text-sm active:scale-98 transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>កំពុងដំណើរការកុម្ម៉ង់...</span>
                    </>
                  ) : (
                    <>
                      <span>✅</span>
                      <span>បញ្ជាក់ការកុម្ម៉ង់ឥឡូវនេះ (Confirm Order)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⭐️ 11. ORDER SUCCESS MODAL ⭐️ */}
      {orderSuccessModalOpen && completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              🎉
            </div>
            
            <h3 className="font-black text-xl text-gray-900 mb-1">ការបញ្ជាទិញទទួលបានជោគជ័យ!</h3>
            <p className="text-xs text-gray-500 mb-4">
              អរគុណសម្រាប់ការគាំទ្រ Sabay Luk! យើងខ្ញុំបានទទួលការកុម្ម៉ង់របស់អ្នករួចរាល់ហើយ។
            </p>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left text-xs space-y-2 mb-5">
              <div className="flex justify-between pb-1.5 border-b border-gray-200 font-bold">
                <span className="text-gray-500">លេខកូដកុម្ម៉ង់ (Order ID):</span>
                <span className="text-orange-600 font-mono text-sm">{completedOrder.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">អ្នកទទួល:</span>
                <span className="font-bold text-gray-800">{completedOrder.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">លេខទូរស័ព្ទ:</span>
                <span className="font-bold text-gray-800">{completedOrder.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">អាសយដ្ឋាន:</span>
                <span className="font-bold text-gray-800 text-right">{completedOrder.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">វិធីសាស្ត្រទូទាត់:</span>
                <span className="font-bold text-gray-800">{completedOrder.payment}</span>
              </div>
              {completedOrder.payment_slip_url && (
                <div className="flex items-center justify-between pb-1 pt-1 border-t border-gray-100">
                  <span className="text-gray-500">វិក្កយបត្រផ្ទេរប្រាក់:</span>
                  <a 
                    href={completedOrder.payment_slip_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#ff6a00] font-bold text-[11px] underline flex items-center gap-1"
                  >
                    <span>🧾</span> មើល Slip ផ្ទេរប្រាក់ ↗
                  </a>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-gray-200 text-sm font-black">
                <span className="text-gray-900">សរុបទឹកប្រាក់:</span>
                <span className="text-[#ff6a00]">${completedOrder.total.toFixed(2)} ({(completedOrder.total * 4100).toLocaleString()} ៛)</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mb-3">
              📞 ក្រុមការងារយើងខ្ញុំនឹងទាក់ទងទៅកាន់លេខ {completedOrder.phone} របស់អ្នក ដើម្បីបញ្ជាក់ការដឹកជញ្ជូនក្នុងពេលឆាប់ៗនេះ។
            </p>

            {/* ⭐️ Telegram & Official PDF Invoice Delivery Banner ⭐️ */}
            <div className="mb-4 p-3.5 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200/80 rounded-2xl text-left flex items-start gap-3">
              <span className="text-2xl mt-0.5">✈️</span>
              <div className="flex-1 text-xs">
                <span className="font-black text-sky-900 block">
                  វិក្កយបត្រ PDF ផ្លូវការត្រូវបានផ្ញើជូនតាម Telegram!
                </span>
                <p className="text-[11px] text-sky-700 mt-0.5 leading-relaxed">
                  ប្រព័ន្ធបានបញ្ជូនវិក្កយបត្រផ្លូវការមាន Logo ហាងទៅកាន់ Telegram រួចរាល់។ លោកអ្នកក៏អាចទាញយក ឬបើកមើលភ្លាមៗនៅទីនេះបានផងដែរ។
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <a
                    href={`/invoice?id=${encodeURIComponent(completedOrder.order_id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white font-black text-[11px] px-3 py-1.5 rounded-xl transition shadow-xs"
                  >
                    <span>📄</span> បើកមើលវិក្កយបត្រ PDF ↗
                  </a>
                  <a
                    href={`/api/invoice/download?orderId=${encodeURIComponent(completedOrder.order_id)}`}
                    download={`Invoice_${completedOrder.order_id}.pdf`}
                    className="inline-flex items-center gap-1 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 font-bold text-[11px] px-3 py-1.5 rounded-xl transition shadow-2xs"
                  >
                    <span>📥</span> ទាញយក PDF
                  </a>
                </div>
              </div>
            </div>

            {/* ⭐️ Direct Feedback Buttons for Completed Order ⭐️ */}
            {completedOrder.items && completedOrder.items.length > 0 && (
              <div className="mb-4 text-left p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-amber-900 flex items-center gap-1.5">
                    <span>⭐</span> ផ្តល់ Feedback លើទំនិញដែលបានកុម្ម៉ង់:
                  </span>
                  <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full font-bold">1 Order = 1 Feedback</span>
                </div>
                <div className="space-y-1.5">
                  {completedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {it.image_url ? (
                          <img src={it.image_url} alt={it.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs">🛍️</div>
                        )}
                        <span className="text-xs font-bold text-gray-800 truncate">{it.name}</span>
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

            <Link
              href={`/track?order=${encodeURIComponent(completedOrder.order_id)}`}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-3.5 rounded-2xl font-black text-xs transition mb-2.5 flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 active:scale-98"
            >
              <span>🚚</span>
              <span>តាមដានការដឹកជញ្ជូនបន្តផ្ទាល់ (Live Tracking /track) ➔</span>
            </Link>

            <button
              onClick={() => {
                setOrderSuccessModalOpen(false);
                setCompletedOrder(null);
              }}
              className="w-full bg-[#18181b] hover:bg-[#27272a] text-white py-3.5 rounded-2xl font-black text-sm transition shadow-md"
            >
              ទិញទំនិញបន្ត (Continue Shopping)
            </button>
          </div>
        </div>
      )}

      {/* ⭐️ 12. TRACK ORDER MODAL ⭐️ */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col">
            
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
                          href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://sabayluk.com')}&text=${encodeURIComponent(`សួស្តីបង! ខ្ញុំចង់សួរនាំពីការកុម្ម៉ង់លេខ #${order.order_id} របស់ខ្ញុំ`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition"
                        >
                          <span>💬</span>
                          <span>ឆាតសួរនាំតាម Telegram</span>
                        </a>
                        <a 
                          href="tel:0967205522" 
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition"
                        >
                          <span>📞</span>
                          <span>ទូរស័ព្ទហាង: 096 720 5522</span>
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
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${themeMode === 'dark' ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-gray-200/90 text-gray-800'} backdrop-blur-lg border-t shadow-[0_-4px_20px_rgba(0,0,0,0.2)] px-2 py-1.5 flex items-center justify-around select-none transition-colors`}>
        
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className={`rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[92vh] overflow-hidden flex flex-col border animate-in zoom-in-95 transition-colors ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
            
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
                      return (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-amber-400 font-black">★ {stats.avg}</span>
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
