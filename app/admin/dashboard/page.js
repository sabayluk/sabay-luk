'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabase';
import * as XLSX from 'xlsx';

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

// ⭐️ Helper: បង្រួមទំហំរូបភាព (Client-side Compression) ស៊ីមេតិច គុណភាពច្បាស់ដដែល
const compressMediaFile = async (file, maxWidth = 1400, quality = 0.84) => {
  if (!file) return file;
  if (!file.type || !file.type.startsWith('image/')) return file;
  if (file.size < 120 * 1024) return file; // បើតូចជាង 120KB មិនបាច់បង្រួមទេ

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const ext = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'webp' : 'jpg';
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, `.${ext}`), {
                type: ext === 'webp' ? 'image/webp' : 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(newFile);
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

// ⭐️ Helper: ស្វែងរកលេខកូដ SKU ចុងក្រោយបង្អស់ និងបង្កើត SKU បន្ទាប់ដោយស្វ័យប្រវត្តិ (+1)
const computeNextSku = (productList) => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sabay_last_saved_sku');
    if (saved && saved.trim()) {
      return saved.trim();
    }
  }

  if (!productList || productList.length === 0) return 'SL-1001';
  
  // ១. តម្រៀបបញ្ជីទំនិញតាមកាលបរិច្ឆេទបង្កើតចុងក្រោយគេបង្អស់ (Newest created_at first)
  const sorted = [...productList].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  // ២. ពិនិត្យមើល SKU នៃទំនិញដែលបានបញ្ចូលចុងក្រោយគេបង្អស់ (Recent Item)
  for (const item of sorted) {
    if (item && item.sku) {
      const match = item.sku.match(/^([A-Za-z0-9]+-?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const digitsLen = match[2].length;
        const nextNum = parseInt(match[2], 10) + 1;
        return `${prefix}${nextNum.toString().padStart(digitsLen, '0')}`;
      }
    }
  }

  // ៣. បើមិនឃើញទម្រង់ច្បាស់ ស្វែងរកលេខអតិបរមាខ្ពស់បំផុតក្នុងបញ្ជី
  let maxNum = 0;
  let bestPrefix = 'SL-';
  let bestDigitsLen = 4;

  sorted.forEach(p => {
    if (!p.sku) return;
    const match = p.sku.match(/^([A-Za-z0-9]+-?)(\d+)$/);
    if (match) {
      const num = parseInt(match[2], 10);
      if (num > maxNum) {
        maxNum = num;
        bestPrefix = match[1];
        bestDigitsLen = match[2].length;
      }
    }
  });

  if (maxNum > 0) {
    const nextVal = maxNum + 1;
    return `${bestPrefix}${nextVal.toString().padStart(bestDigitsLen, '0')}`;
  }

  return 'SL-1001';
};

export default function UnifiedAdminDashboard() {

    // States សម្រាប់ Inventory Sub-tabs (បញ្ជីទំនិញ vs ប្រវត្តិចលនាស្តុក)
  const [inventorySubTab, setInventorySubTab] = useState('items'); // 'items' | 'movements'
  const [stockMovements, setStockMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // States សម្រាប់ Modal នាំចូលស្តុក (Stock In Modal)
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockInProduct, setStockInProduct] = useState(null);
  const [stockInVariants, setStockInVariants] = useState([]);
  const [stockInSelectedVariant, setStockInSelectedVariant] = useState('');
  const [stockInQty, setStockInQty] = useState('');
  const [stockInReason, setStockInReason] = useState('នាំចូលបន្ថែមពីមេការ');
  const [stockInLoading, setStockInLoading] = useState(false);
  const [stockActionType, setStockActionType] = useState('IN'); // 'IN' = នាំចូល, 'OUT' = កាត់ស្តុកចេញ

  // Filters សម្រាប់ Audit Log ចលនាស្តុក
  const [movementFilterType, setMovementFilterType] = useState('ALL'); // 'ALL' | 'PURCHASE' | 'SALE' | 'ADJUSTMENT'
  const [movementSearch, setMovementSearch] = useState('');

  // Function ទាញយកប្រវត្តិចលនាស្តុក (Stock Movements)
  const fetchStockMovements = async () => {
    setLoadingMovements(true);
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, products(name, sku, image_url), product_variants(size, color)')
      .order('created_at', { ascending: false })
      .limit(250);

    if (!error && data) {
      setStockMovements(data);
    }
    setLoadingMovements(false);
  };

  // ពេលប្តូរទៅ Tab Movements ឱ្យទាញទិន្នន័យស្វ័យប្រវត្តិ
  useEffect(() => {
    if (inventorySubTab === 'movements') {
      fetchStockMovements();
    }
  }, [inventorySubTab]);

  // ⭐️ បើក Modal គ្រប់គ្រងស្តុក (នាំចូលស្តុក +IN ឬ កាត់ស្តុកចេញ -OUT) ⭐️
  const handleOpenStockIn = async (product, mode = 'IN') => {
    setStockInProduct(product);
    setStockActionType(mode);
    setStockInQty('');
    setStockInReason(mode === 'IN' ? 'នាំចូលបន្ថែមពីមេការ' : 'កាត់ស្តុកចេញ / ទំនិញខូចខាត');
    setStockInModalOpen(true);

    // ទាញយក Variants របស់ទំនិញនេះ
    const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id);

    if (variants && variants.length > 0) {
      setStockInVariants(variants);
      setStockInSelectedVariant(variants[0].id.toString());
    } else {
      setStockInVariants([]);
      setStockInSelectedVariant('');
    }
  };

  // ⭐️ បញ្ជាក់ការ នាំចូល ឬ កាត់ស្តុកចេញ (Process Stock In / Stock Out) ⭐️
  const handleConfirmStockIn = async (e) => {
    e.preventDefault();
    const qty = parseInt(stockInQty);
    if (!qty || qty <= 0) return alert('សូមបញ្ចូលចំនួនឱ្យបានត្រឹមត្រូវ (យ៉ាងតិច ១)!');

    // ត្រួតពិនិត្យស្តុកជាក់ស្តែងករណី "កាត់ស្តុកចេញ (Stock Out)"
    let variantId = stockInSelectedVariant ? stockInSelectedVariant : null;
    let selectedVar = variantId ? stockInVariants.find(v => v.id.toString() === variantId.toString()) : null;
    const currentAvailable = selectedVar ? selectedVar.stock_qty : (stockInProduct.stock_qty || 0);

    if (stockActionType === 'OUT' && qty > currentAvailable) {
      return alert(`❌ មិនអាចកាត់ស្តុកបានទេ! ចំនួនកាត់ (${qty}) លើសពីស្តុកជាក់ស្តែងដែលមាន (${currentAvailable})។`);
    }

    setStockInLoading(true);

    try {
      const prevTotalQty = stockInProduct.stock_qty || 0;
      const totalDelta = stockActionType === 'IN' ? qty : -qty;
      const newTotalQty = Math.max(0, prevTotalQty + totalDelta);

      // ១. Update ស្តុកសរុបក្នុង products
      const { error: prodErr } = await supabase
        .from('products')
        .update({ 
          stock_qty: newTotalQty, 
          status: newTotalQty > 0 ? 'In Stock' : 'Out of Stock' 
        })
        .eq('id', stockInProduct.id);
      if (prodErr) throw prodErr;

      let prevVariantQty = 0;
      let newVariantQty = 0;

      // ២. បើមាន Variant (Size) Update ចូល product_variants ដែរ
      if (variantId) {
        prevVariantQty = selectedVar ? selectedVar.stock_qty : 0;
        newVariantQty = Math.max(0, prevVariantQty + totalDelta);

        const { error: varErr } = await supabase
          .from('product_variants')
          .update({ stock_qty: newVariantQty })
          .eq('id', variantId);
        if (varErr) throw varErr;
      }

      // ៣. កត់ត្រាចូល stock_movements (Audit Log)
      const movementType = stockActionType === 'IN' ? 'PURCHASE' : 'ADJUSTMENT';
      const formattedReason = stockActionType === 'IN' 
        ? (stockInReason || 'នាំចូលស្តុកបន្ថែម')
        : `[កាត់ស្តុកចេញ] ${stockInReason || 'កែតម្រូវស្តុក'}`;

      const { error: movErr } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: stockInProduct.id,
          variant_id: variantId ? parseInt(variantId) : null,
          type: movementType,
          qty_change: totalDelta,
          previous_qty: variantId ? prevVariantQty : prevTotalQty,
          new_qty: variantId ? newVariantQty : newTotalQty,
          reason: formattedReason
        }]);
      if (movErr) throw movErr;

      const actionText = stockActionType === 'IN' ? `នាំចូល +${qty}` : `កាត់ស្តុក -${qty}`;
      alert(`✅ ${actionText} លើទំនិញ [${stockInProduct.name}] បានជោគជ័យ និងបានកត់ត្រាប្រវត្តិចលនា!`);
      setStockInModalOpen(false);
      fetchProducts();
      fetchStockMovements();

      // 🚨 ជូនដំណឹងស្វ័យប្រវត្តិតាម Telegram ពេលមានការបញ្ជូលស្តុក ឬកាត់ស្តុក (Stock IN / OUT Alert)
      if (storeSettings.telegramBotToken && storeSettings.telegramChatId) {
        sendTelegramNotification({
          action: 'stock_change',
          stockData: {
            type: stockActionType,
            productName: stockInProduct.name,
            sku: stockInProduct.sku,
            category: stockInProduct.category,
            variantInfo: selectedVar ? `Size: ${selectedVar.size}${selectedVar.color ? ', ពណ៌: ' + selectedVar.color : ''}` : '',
            qtyChange: qty,
            previousQty: variantId ? prevVariantQty : prevTotalQty,
            newQty: variantId ? newVariantQty : newTotalQty,
            reason: stockInReason || (stockActionType === 'IN' ? 'នាំចូលស្តុកបន្ថែម' : 'កាត់ស្តុកចេញ')
          }
        });
      }

      // 🚨 ជូនដំណឹងបន្ថែមបើស្តុកធ្លាក់ដល់កម្រិតទាប (Low Stock Alert)
      if (stockActionType === 'OUT') {
        const threshold = stockInProduct.low_stock_alert || storeSettings.lowStockThreshold || 5;
        if (newTotalQty <= threshold && storeSettings.enableLowStockAlert && storeSettings.telegramBotToken && storeSettings.telegramChatId) {
          sendTelegramNotification({
            action: 'low_stock',
            items: [{
              name: stockInProduct.name,
              sku: stockInProduct.sku,
              category: stockInProduct.category,
              stock_qty: newTotalQty,
              low_stock_alert: threshold,
              price: stockInProduct.price
            }]
          });
        }
      }

    } catch (err) {
      alert('❌ មានបញ្ហា: ' + err.message);
    } finally {
      setStockInLoading(false);
    }
  };

  const handleSaveEditedProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setUploading(true);

    try {
      let publicUrl = editingProduct.image_url;
      if (file) {
        const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName);
        publicUrl = publicData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: editingProduct.name.trim(),
          category: editingProduct.category.trim(),
          price: parseFloat(editingProduct.price) || 0,
          cost_price: parseFloat(editingProduct.cost_price) || 0,
          stock_qty: parseInt(editingProduct.stock_qty) || 0,
          image_url: publicUrl,
          status: parseInt(editingProduct.stock_qty) > 0 ? 'In Stock' : 'Out of Stock'
        })
        .eq('id', editingProduct.id);

      if (updateError) throw updateError;

      alert('✅ កែប្រែទំនិញជោគជ័យ!');
      setEditModalOpen(false);
      setEditingProduct(null);
      setFile(null);
      setPreviewUrl(null);
      fetchProducts();
    } catch (err) {
      alert('❌ មានបញ្ហា: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // State សម្រាប់គ្រប់គ្រងស្តុកតាមទំហំនីមួយៗ (Variant Stock)
  const [variantStock, setVariantStock] = useState({});
  const [disabledVariants, setDisabledVariants] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts(); // ទាញយកស្តុកថ្មីមកបង្ហាញ
    } catch (err) {
      alert('❌ មិនអាចលុបទំនិញនេះបានទេ: ' + err.message);
    }
  };

  const [editingProductId, setEditingProductId] = useState(null); // 👈 ស្គាល់ថាជា ID ពេលកំពុង Edit

  // ⭐️ 1. ប្រកាស State ນີ້នៅផ្នែកខាងលើជាមួយ State ដទៃទៀត (កុំដាក់ក្នុង InventoryView) ⭐️
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  // ⭐️ State សម្រាប់រុញបើក/បិទ Sidebar (Collapsible Admin Sidebar)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_admin_sidebar_open');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default: បើក
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sabay_admin_sidebar_open', String(next));
      }
      return next;
    });
  }; // សម្រាប់បើក/បិទ Dropdown គ្រប់គ្រងមុខហាង
  const [activeTab, setActiveTab] = useState(''); // កំណត់តម្លៃទទេរសិន ដើម្បីកុំឱ្យវាលោតទៅអីមុន
  const [isMounted, setIsMounted] = useState(false); // State ត្រួតពិនិត្យដំណើរការ Load
  const searchInputRef = useRef(null);

  useEffect(() => {
    // អានទិន្នន័យពី LocalStorage ពេល Load លើកដំបូង
    const savedTab = localStorage.getItem('sabay_admin_active_tab');
    if (savedTab) {
      setActiveTab(savedTab); // បើធ្លាប់មានទិន្នន័យ យកមកប្រើ
    } else {
      setActiveTab('pos'); // បើអត់ធ្លាប់មានសោះ ទើបឱ្យលោតទៅ 'pos'
    }
    setIsMounted(true); // បញ្ជាក់ថាអានរួចរាល់
  }, []);

  useEffect(() => {
    // រក្សាទុកទិន្នន័យរាល់ពេលមានការផ្លាស់ប្តូរ Tab ក្រោយពេល Load រួច
    if (isMounted && activeTab !== '') {
      localStorage.setItem('sabay_admin_active_tab', activeTab);
    }
  }, [activeTab, isMounted]);

  // ================= 👥 ផ្នែកគ្រប់គ្រងអតិថិជន FULL OPTION (CRM STATES) =================
  const [customers, setCustomers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_customers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return [
      {
        id: 'CUS-1001',
        name: 'សុខ វិសាល',
        phone: '0967205522',
        telegram: 'visal_sok',
        address: 'ផ្ទះលេខ ១២, ផ្លូវ ២០០, សង្កាត់បឹងកក់, ភ្នំពេញ',
        tier: 'VIP',
        discount_percent: 10,
        notes: 'អតិថិជនពិសេស ទិញស្បែកជើងញឹកញាប់ ចំណូលចិត្ត Size 41 ពណ៌ខ្មៅ',
        joined: '2026-01-15',
        baseSpent: 260.00,
        baseOrderCount: 4
      },
      {
        id: 'CUS-1002',
        name: 'ចាន់ ធីតា',
        phone: '012345678',
        telegram: 'thida_chan',
        address: 'ផ្ទះ 45B, មហាវិថីសហព័ន្ធរុស្ស៊ី, ភ្នំពេញ',
        tier: 'WHOLESALE',
        discount_percent: 15,
        notes: 'ម៉ូយដុំ យកម្ដង 10-20 គូ ផ្ញើតាមឡានក្រុងវីរៈប៊ុនថាំ',
        joined: '2026-03-20',
        baseSpent: 520.00,
        baseOrderCount: 8
      },
      {
        id: 'CUS-1003',
        name: 'គឹម ហេង',
        phone: '0889988776',
        telegram: '',
        address: 'ក្រុងសៀមរាប, ខេត្តសៀមរាប',
        tier: 'LOYAL',
        discount_percent: 5,
        notes: 'អតិថិជនស្មោះត្រង់ ចូលចិត្តម៉ូតស្បែកជើងស្បែក',
        joined: '2026-06-10',
        baseSpent: 120.00,
        baseOrderCount: 2
      },
      {
        id: 'CUS-1004',
        name: 'លីណា',
        phone: '0978877665',
        telegram: 'lina_style',
        address: 'ខេត្តបាត់ដំបង',
        tier: 'REGULAR',
        discount_percent: 0,
        notes: 'កុម្ម៉ង់តាម Online ដឹកជញ្ជូនរហ័ស',
        joined: '2026-08-01',
        baseSpent: 45.00,
        baseOrderCount: 1
      },
      {
        id: 'CUS-1005',
        name: 'veasna',
        phone: '010723080',
        telegram: '',
        address: 'ភ្នំពេញ - 178',
        tier: 'LOYAL',
        discount_percent: 5,
        notes: 'អតិថិជនកុម្ម៉ង់ Online តាម Website',
        joined: '2026-11-10',
        baseSpent: 0,
        baseOrderCount: 0
      }
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_customers', JSON.stringify(customers));
    }
  }, [customers]);

  // ================= 💸 ផ្នែកគ្រប់គ្រងចំណាយ & គណនាប្រាក់ចំណេញសុទ្ធ (EXPENSES & NET PROFIT) =================
  const EXPENSE_CATEGORIES = [
    { id: 'rent', label: 'ថ្លៃជួលតូប / ទីតាំង (Rent)', icon: '🏢', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'utilities', label: 'ទឹក ភ្លើង & អ៊ីនធឺណិត (Utilities)', icon: '💡', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { id: 'salaries', label: 'ប្រាក់ខែបុគ្គលិក & កម្រៃ (Salaries)', icon: '👥', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'delivery', label: 'សេវាដឹកជញ្ជូន & វេចខ្ចប់ (Delivery & Packaging)', icon: '🛵', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
    { id: 'marketing', label: 'ការផ្សព្វផ្សាយ & Ads (Marketing)', icon: '📢', badge: 'bg-pink-50 text-pink-700 border-pink-200' },
    { id: 'refreshments', label: 'ម្ហូបអាហារ & ភេសជ្ជៈបុគ្គលិក (Meals)', icon: '☕', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'supplies', label: 'សម្ភារៈប្រើប្រាស់ & ជួសជុល (Supplies)', icon: '🛠️', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
    { id: 'other', label: 'ចំណាយផ្សេងៗ (Other Miscellaneous)', icon: '📦', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  ];

  const [expenses, setExpenses] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_luk_expenses');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        id: 'EXP-1001',
        title: 'ថ្លៃជួលតូបប្រចាំខែ',
        category: 'rent',
        amount: 250.00,
        date: today,
        paymentMethod: 'ABA',
        recipient: 'ម្ចាស់ទីតាំង',
        note: 'បង់ថ្លៃជួលទីតាំងតូបកណ្តាលក្រុង',
        created_at: new Date().toISOString()
      },
      {
        id: 'EXP-1002',
        title: 'ថ្លៃទឹក ភ្លើង & Wi-Fi អ៊ីនធឺណិត',
        category: 'utilities',
        amount: 35.50,
        date: today,
        paymentMethod: 'ABA',
        recipient: 'EDC / ISP',
        note: 'បង់ថ្លៃភ្លើងហាង និងថ្លៃ Wi-Fi ប្រចាំខែ',
        created_at: new Date().toISOString()
      },
      {
        id: 'EXP-1003',
        title: 'ទិញថង់ និងប្រអប់កាតុងវេចខ្ចប់',
        category: 'delivery',
        amount: 25.00,
        date: today,
        paymentMethod: 'Cash',
        recipient: 'រោងពុម្ពវេចខ្ចប់',
        note: 'ទិញថង់ និងប្រអប់កាតុង ២០០ ប្រអប់',
        created_at: new Date().toISOString()
      }
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_luk_expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  // Try loading from Supabase expenses table if present
  useEffect(() => {
    const fetchExpensesDB = async () => {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          setExpenses(data);
        }
      } catch (e) {}
    };
    fetchExpensesDB();
  }, []);

  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFilterCategory, setExpenseFilterCategory] = useState('all');
  const [expenseFilterPeriod, setExpenseFilterPeriod] = useState('month'); // 'all' | 'today' | 'week' | 'month'
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form states for Add/Edit Expense
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState('rent');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expPaymentMethod, setExpPaymentMethod] = useState('Cash');
  const [expRecipient, setExpRecipient] = useState('');
  const [expNote, setExpNote] = useState('');

  // ================= 👥 ផ្នែកគ្រប់គ្រងបុគ្គលិក & បែងចែកសិទ្ធិ (MULTI-STAFF & ROLES) =================
  const DEFAULT_STAFF_ACCOUNTS = [
    {
      id: 'STAFF-1',
      name: 'វិចិត្រ (ម្ចាស់ហាង)',
      username: 'admin',
      pin: '1234',
      role: 'ADMIN', // 'ADMIN' | 'CASHIER' | 'STOCK'
      roleLabel: 'ម្ចាស់ហាង (Super Admin)',
      phone: '0967205522',
      avatar: '👑',
      color: 'from-amber-500 to-orange-600',
      active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'STAFF-2',
      name: 'សុខា (អ្នកគិតលុយ)',
      username: 'cashier',
      pin: '1111',
      role: 'CASHIER',
      roleLabel: 'អ្នកគិតលុយ (Cashier)',
      phone: '012345678',
      avatar: '💻',
      color: 'from-blue-500 to-indigo-600',
      active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'STAFF-3',
      name: 'ដារ៉ា (អ្នកកាន់ស្តុក)',
      username: 'stock',
      pin: '2222',
      role: 'STOCK',
      roleLabel: 'អ្នកកាន់ស្តុក (Stock Keeper)',
      phone: '0978877665',
      avatar: '🗄️',
      color: 'from-purple-500 to-violet-600',
      active: true,
      created_at: new Date().toISOString()
    }
  ];

  const [staffList, setStaffList] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_staff_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return DEFAULT_STAFF_ACCOUNTS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_staff_list', JSON.stringify(staffList));
    }
  }, [staffList]);

  // Current logged in staff
  const [currentStaff, setCurrentStaff] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_active_staff');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) return parsed;
        } catch (e) {}
      }
    }
    return DEFAULT_STAFF_ACCOUNTS[0]; // Default to Super Admin
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_active_staff', JSON.stringify(currentStaff));
    }
  }, [currentStaff]);

  // Auto redirect if current staff lacks permission for active tab
  useEffect(() => {
    if (!currentStaff) return;
    if (currentStaff.role === 'CASHIER') {
      if (activeTab !== 'pos' && activeTab !== 'orders') {
        setActiveTab('pos');
      }
    } else if (currentStaff.role === 'STOCK') {
      if (activeTab !== 'inventory' && activeTab !== 'upload' && activeTab !== 'categories') {
        setActiveTab('inventory');
      }
    }
  }, [currentStaff, activeTab]);

  // Modals for Staff & Quick Switch
  const [switchStaffModalOpen, setSwitchStaffModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Form states for Add/Edit Staff
  const [staffFormName, setStaffFormName] = useState('');
  const [staffFormUsername, setStaffFormUsername] = useState('');
  const [staffFormPin, setStaffFormPin] = useState('');
  const [staffFormRole, setStaffFormRole] = useState('CASHIER');
  const [staffFormPhone, setStaffFormPhone] = useState('');

  // Switch Staff PIN prompt states
  const [selectedStaffToLogin, setSelectedStaffToLogin] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinInTable, setShowPinInTable] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilterTier, setCustomerFilterTier] = useState('all');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerHistoryModalOpen, setCustomerHistoryModalOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);

  // Form states សម្រាប់បង្កើត/កែប្រែអតិថិជន
  const [custFormName, setCustFormName] = useState('');
  const [custFormPhone, setCustFormPhone] = useState('');
  const [custFormTelegram, setCustFormTelegram] = useState('');
  const [custFormAddress, setCustFormAddress] = useState('');
  const [custFormTier, setCustFormTier] = useState('REGULAR');
  const [custFormDiscount, setCustFormDiscount] = useState('0');
  const [custFormNotes, setCustFormNotes] = useState('');

  // មុខងារគណនាស្ថិតិកុម្ម៉ង់ទិញ និងទឹកប្រាក់ជាក់ស្តែងរបស់អតិថិជនម្នាក់ៗ
  const getCustomerMetrics = (c) => {
    const cleanCPhone = c.phone ? c.phone.replace(/\D/g, '') : '';

    const matchedOrders = (realOrders || []).filter(o => {
      // មិនរាប់ Orders ដែល Cancelled ឡើយ
      if (o.status === 'Cancelled') return false;

      // ១. បើ Order មានភ្ជាប់ Customer ID ជាក់លាក់
      if (o.customer_id && o.customer_id === c.id) return true;

      // ២. ផ្គូផ្គងតាមលេខទូរស័ព្ទ (ត្រូវមានលេខទូរស័ព្ទត្រឹមត្រូវយ៉ាងតិច ៨ ខ្ទង់)
      const cleanOPhone = o.phone ? o.phone.replace(/\D/g, '') : (o.phone_number ? o.phone_number.replace(/\D/g, '') : '');
      const phoneMatches = cleanCPhone.length >= 8 && cleanCPhone === cleanOPhone;

      // ៣. ផ្គូផ្គងតាមឈ្មោះ (មិនរាប់ឈ្មោះទូទៅដូចជា 'អតិថិជនទូទៅ')
      const isNotGeneral = c.name && c.name.trim() !== 'អតិថិជនទូទៅ' && o.customer && o.customer.trim() !== 'អតិថិជនទូទៅ';
      const nameMatches = isNotGeneral && c.name.trim().toLowerCase() === o.customer.trim().toLowerCase();

      // ៤. ⭐️ លក្ខខណ្ឌកាលបរិច្ឆេទស្តង់ដារ៖ អតិថិជនទើបបង្កើតថ្មី មិនត្រូវរាប់បញ្ចូល Orders ចាស់ៗមុនថ្ងៃចុះឈ្មោះឡើយ ⭐️
      const orderDateStr = (o.created_at || o.date || '').slice(0, 10);
      const joinedDateStr = c.joined ? c.joined.slice(0, 10) : '';
      const isOrderAfterJoined = !joinedDateStr || !orderDateStr || orderDateStr >= joinedDateStr;

      return (phoneMatches || nameMatches) && isOrderAfterJoined;
    });

    const realSpent = matchedOrders.reduce((sum, o) => sum + (parseFloat(o.total || o.total_amount) || 0), 0);
    const totalSpent = (c.baseSpent || 0) + realSpent;
    const totalOrders = (c.baseOrderCount || 0) + matchedOrders.length;
    const lastOrderDate = matchedOrders[0]?.created_at || matchedOrders[0]?.date || c.joined;

    return {
      orders: matchedOrders,
      totalOrders,
      totalSpent,
      lastOrderDate
    };
  };

  // បើក Modal បង្កើតអតិថិជនថ្មី
  const openCreateCustomerModal = () => {
    setEditingCustomer(null);
    setCustFormName('');
    setCustFormPhone('');
    setCustFormTelegram('');
    setCustFormAddress('');
    setCustFormTier('REGULAR');
    setCustFormDiscount('0');
    setCustFormNotes('');
    setCustomerModalOpen(true);
  };

  // បើក Modal កែប្រែអតិថិជនចាស់
  const openEditCustomerModal = (c) => {
    setEditingCustomer(c);
    setCustFormName(c.name || '');
    setCustFormPhone(c.phone || '');
    setCustFormTelegram(c.telegram || '');
    setCustFormAddress(c.address || '');
    setCustFormTier(c.tier || 'REGULAR');
    setCustFormDiscount(c.discount_percent != null ? c.discount_percent.toString() : '0');
    setCustFormNotes(c.notes || '');
    setCustomerModalOpen(true);
  };

  // រក្សាទុកអតិថិជន (Save / Update Customer)
  const handleSaveCustomer = (e) => {
    e.preventDefault();
    if (!custFormName.trim()) {
      alert('សូមបញ្ចូលឈ្មោះអតិថិជន!');
      return;
    }
    if (!custFormPhone.trim()) {
      alert('សូមបញ្ចូលលេខទូរស័ព្ទអតិថិជន!');
      return;
    }

    if (editingCustomer) {
      // កែប្រែអតិថិជន
      setCustomers(prev => prev.map(c => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            name: custFormName.trim(),
            phone: custFormPhone.trim(),
            telegram: custFormTelegram.trim().replace(/^@/, ''),
            address: custFormAddress.trim(),
            tier: custFormTier,
            discount_percent: parseFloat(custFormDiscount) || 0,
            notes: custFormNotes.trim()
          };
        }
        return c;
      }));
      alert('✅ កែប្រែព័ត៌មានអតិថិជនជោគជ័យ!');
    } else {
      // បង្កើតអតិថិជនថ្មី
      const newCustomer = {
        id: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
        name: custFormName.trim(),
        phone: custFormPhone.trim(),
        telegram: custFormTelegram.trim().replace(/^@/, ''),
        address: custFormAddress.trim(),
        tier: custFormTier,
        discount_percent: parseFloat(custFormDiscount) || 0,
        notes: custFormNotes.trim(),
        joined: new Date().toISOString().split('T')[0],
        baseSpent: 0,
        baseOrderCount: 0
      };
      setCustomers(prev => [newCustomer, ...prev]);
      alert('🎉 បង្កើតអតិថិជនថ្មីបានជោគជ័យ!');
    }

    setCustomerModalOpen(false);
  };

  // លុបអតិថិជន
  const handleDeleteCustomer = (id) => {
    if (window.confirm('តើបងពិតជាចង់លុបអតិថិជននេះចេញពីប្រព័ន្ធមែនទេ?')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  // លក់ជូនអតិថិជននេះផ្ទាល់ក្នុង POS (Quick Sell)
  const handleQuickSellToCustomer = (c) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    if (c.tier === 'WHOLESALE') {
      handleSwitchPriceMode('wholesale');
    } else {
      handleSwitchPriceMode('retail');
    }
    if (c.discount_percent > 0) {
      setDiscount(c.discount_percent);
    } else {
      setDiscount(0);
    }
    setActiveTab('pos');
  };

  // បើកមើលប្រវត្តិទិញទំនិញ
  const openCustomerHistory = (c) => {
    setSelectedCustomerForHistory(c);
    setCustomerHistoryModalOpen(true);
  };

  // នាំចេញបញ្ជីអតិថិជនជា Excel / CSV
  const exportCustomersToCSV = () => {
    if (customers.length === 0) {
      alert('មិនមានទិន្នន័យអតិថិជនសម្រាប់នាំចេញទេ!');
      return;
    }

    const headers = ['ID', 'ឈ្មោះអតិថិជន', 'លេខទូរស័ព្ទ', 'Telegram', 'ប្រភេទអតិថិជន', 'បញ្ចុះតម្លៃ (%)', 'ចំនួនកុម្ម៉ង់', 'ចំណាយសរុប ($)', 'អាសយដ្ឋាន', 'កំណត់ចំណាំ', 'កាលបរិច្ឆេទចុះឈ្មោះ'];
    
    const rows = customers.map(c => {
      const metric = getCustomerMetrics(c);
      const tierLabel = c.tier === 'VIP' ? 'VIP' : c.tier === 'WHOLESALE' ? 'បោះដុំ' : c.tier === 'LOYAL' ? 'ស្មោះត្រង់' : 'ទូទៅ';
      return [
        `"${c.id}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.telegram ? '@' + c.telegram : '').replace(/"/g, '""')}"`,
        `"${tierLabel}"`,
        `"${c.discount_percent || 0}%"`,
        `"${metric.totalOrders}"`,
        `"${metric.totalSpent.toFixed(2)}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        `"${c.joined || ''}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SabayLuk_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================= ផ្នែកគ្រប់គ្រងទិន្នន័យស្តុក (INVENTORY STATES) =================
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data: prodData } = await supabase.from('products').select('*');
      const { data: catData } = await supabase.from('categories').select('*');
      if (prodData) setProducts(prodData);
      if (catData && catData.length > 0) {
        setCategories(catData);
        // ⭐️ ជួសជុល: ចាប់យក Category ដំបូងគេស្វ័យប្រវត្តិ បើ State ចាស់ខុស ⭐️
        setCategory(prev => catData.find(c => c.name === prev) ? prev : catData[0].name);
      }
    }
    fetchData();
  }, []);

  async function fetchCategories() {
    const { data, error } = await supabase.from('categories').select('*');
    if (!error && data && data.length > 0) {
      setCategories(data);
      // ⭐️ ជួសជុល: ចាប់យក Category ដំបូងគេស្វ័យប្រវត្តិ ⭐️
      setCategory(prev => data.find(c => c.name === prev) ? prev : data[0].name);
    } else {
      setCategories([
        { id: '1', name: 'ស្បែកជើងបុរស', icon: 'shoe' },
        { id: '2', name: 'នាឡិកា', icon: 'watch' },
      ]);
      setCategory('ស្បែកជើងបុរស');
    }
  }
  const [loading, setLoading] = useState(true);

  // States សម្រាប់ Search និង Filter ក្នុងផ្ទាំង Inventory
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('all');
  const [invViewMode, setInvViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sabay_inv_view_mode') || 'table';
    }
    return 'table';
  });
  const [invSortBy, setInvSortBy] = useState('newest');
  const [selectedInvProductIds, setSelectedInvProductIds] = useState([]);
  const [quickStockUpdatingId, setQuickStockUpdatingId] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(parseProductMeta);
      setProducts(mapped);
      // កំណត់ SKU ជាប់លេខចុងក្រោយបង្អស់ដោយស្វ័យប្រវត្តិ
      if (!editingProductId) {
        const currentSavedSku = typeof window !== 'undefined' ? (localStorage.getItem('sabay_current_sku') || localStorage.getItem('sabay_last_saved_sku')) : null;
        if (currentSavedSku) {
          setSku(currentSavedSku);
        } else {
          const nextSku = computeNextSku(mapped);
          setSku(nextSku);
          if (typeof window !== 'undefined') {
            localStorage.setItem('sabay_current_sku', nextSku);
            localStorage.setItem('sabay_last_saved_sku', nextSku);
          }
        }
      }
    }
    setLoading(false);
  }

  async function fetchCategories() {
    const { data, error } = await supabase.from('categories').select('*');
    if (!error && data) {
      setCategories(data);
    } else {
      // ប្រសិនបើទើបតែដំឡើងដំបូង ប្រើ Default Categories
      setCategories([
        { id: '1', name: 'ស្បែកជើង', icon: '👞' },
        { id: '2', name: 'នាឡិកា', icon: '⌚' },
        { id: '3', name: 'កាបូប', icon: '👜' },
        { id: '4', name: 'ខ្សែក្រវ៉ាត់', icon: '👔' },
      ]);
    }
  }

    // ================= ប្រព័ន្ធ POS STATES កម្រិតស្តង់ដារ =================
  const [posCart, setPosCart] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('all');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('%');
  const [holdOrders, setHoldOrders] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(4100); // អត្រាប្តូរប្រាក់រៀល

    // ================= STATES សម្រាប់ ORDERS, REAL ANALYTICS & BARCODE =================
  const [realOrders, setRealOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilterStatus, setOrderFilterStatus] = useState('all');

  // State សម្រាប់ Modal បោះពុម្ពបាកូដ (Barcode Sticker Modal)
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [barcodePrintQty, setBarcodePrintQty] = useState(1);

  // Function ទាញយកទិន្នន័យ Orders ពិតពី Supabase
  const fetchRealOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      const mapped = data.map(o => ({
        ...o,
        customer: o.customer_name || o.customer || 'អតិថិជនទូទៅ',
        total: o.total_amount != null ? o.total_amount : (o.total || 0),
        payment: o.payment_method || o.payment || 'Cash',
        phone: o.phone_number || o.phone || '',
        address: o.delivery_address || o.address || ''
      }));
      setRealOrders(mapped);
    }
    setLoadingOrders(false);
  };

  // ⭐️ States & Realtime Alert សម្រាប់គ្រប់គ្រងការកុម្ម៉ង់ថ្មី (ADMIN & SALES ALERT) ⭐️
  const [newOrderAlert, setNewOrderAlert] = useState(null);

  // សំឡេងកណ្ដឹងជូនដំណឹងពេលមានការកុម្ម៉ង់ថ្មី (Notification Chime)
  const playNewOrderSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  useEffect(() => {
    fetchRealOrders();

    // 1. Supabase Realtime Channel
    let channel;
    try {
      channel = supabase
        .channel('admin_orders_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
          playNewOrderSound();
          fetchRealOrders();
          setNewOrderAlert({
            order_id: payload.new?.order_id || 'ថ្មី',
            customer_name: payload.new?.customer_name || 'អតិថិជន',
            phone: payload.new?.phone || payload.new?.phone_number || '',
            total: payload.new?.total_amount || 0
          });
        })
        .subscribe();
    } catch (e) {}

    // 2. Storage event listener (multi-tab sync)
    const handleStorageOrder = (e) => {
      if (e && e.key === 'sabay_new_order_alert' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          playNewOrderSound();
          fetchRealOrders();
          setNewOrderAlert(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageOrder);

    // 3. BroadcastChannel listener (instant cross-tab sync for Admin & Sales)
    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('sabay_orders_sync');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_ORDER') {
          playNewOrderSound();
          fetchRealOrders();
          setNewOrderAlert(event.data);
        }
      };
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageOrder);
      if (bc) bc.close();
    };
  }, []);

  // Function ប្តូរ Status នៃការកុម្ម៉ង់ (Pending ➔ Preparing ➔ Shipped ➔ Completed)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      // Update លើ UI ភ្លាមៗ
      setRealOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

      const statusLabels = {
        'Pending': '🟡 រង់ចាំការបញ្ជាក់',
        'Preparing': '🔵 កំពុងរៀបចំវេចខ្ចប់',
        'Shipped': '🚚 កំពុងដឹកជញ្ជូន',
        'Completed': '🟢 ដឹកជញ្ជូនជោគជ័យ',
        'Cancelled': '❌ បានបោះបង់'
      };
      setToastNotification(`✅ បានប្តូរស្ថានភាពទៅជា "${statusLabels[newStatus] || newStatus}" រួចរាល់!`);
      setTimeout(() => setToastNotification(null), 3000);
    } catch (err) {
      alert('❌ មិនអាចប្តូរស្ថានភាពបានទេ: ' + err.message);
    }
  };

  // គណនាស្ថិតិពិតប្រាកដចេញពី orders (Real Analytics Calculation)
  const realTotalRevenue = realOrders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const realDailySales = realOrders
    .filter(o => o.status !== 'Cancelled' && (o.created_at ? o.created_at.startsWith(todayStr) : true))
    .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  const realTotalOrdersCount = realOrders.length;

    // State សម្រាប់កំណត់ព័ត៌មានវិក្កយបត្រ (Invoice Settings)
  const [invoiceSettings, setInvoiceSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_invoice_settings');
      if (saved) return JSON.parse(saved);
    }
    return {
      storeName: 'SABAY LUK',
      address: 'Phnom Penh, Cambodia',
      phone: '096 720 5522',
      title: 'OFFICIAL RECEIPT',
      exchangeRate: 4100,
      cashierName: 'Admin',
      showKHR: true,
      thankYouMsg: 'សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត',
      policyNote: 'ទំនិញដែលទិញរួចមិនអាចប្តូរជាប្រាក់វិញបានទេ (អាចប្តូរ Size បានក្នុងរង្វង់ ៣ ថ្ងៃ)'
    };
  });

  const [invoiceSavedMsg, setInvoiceSavedMsg] = useState('');

  // ================= 🏪 ផ្នែកកំណត់ហាង & ម៉ាកយីហោ FULL OPTION (STORE SETTINGS & BRANDING) =================
  const DEFAULT_STORE_SETTINGS = {
    storeName: 'SABAY LUK',
    storeSlogan: 'Premium Store',
    storeDescription: 'ហាងលក់ស្បែកជើង និងម៉ូដទាន់សម័យគុណភាពខ្ពស់ ផ្ដល់ទំនុកចិត្ត និងភាពស៊ីវិល័យសម្រាប់អ្នក។',
    logoUrl: '',
    phone: '096 720 5522',
    phone2: '012 345 678',
    telegram: 'Sabayluk',
    telegramBotToken: '',
    telegramChatId: '',
    enableLowStockAlert: true,
    lowStockThreshold: 5,
    abaMerchantId: '',
    abaApiKey: '',
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
    themePreset: 'orange'
  };

  const [storeSettings, setStoreSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_store_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...DEFAULT_STORE_SETTINGS,
            ...parsed,
            bankAccountName: parsed.bankAccountName || 'SENG SOVEASNA',
            bankAccountKhr: parsed.bankAccountKhr || '004 500 394',
            bankAccountUsd: parsed.bankAccountUsd || parsed.bankAccountNumber || '010 723 080',
            khqrImageUrl: parsed.khqrImageUrl || '/khqr-aba.jpg'
          };
        } catch (e) {}
      }
    }
    return DEFAULT_STORE_SETTINGS;
  });

  const [storeSettingsSavedMsg, setStoreSettingsSavedMsg] = useState('');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState('branding'); // 'branding' | 'contact' | 'announcement' | 'payment' | 'delivery'

  // ⭐️ States សម្រាប់ Bulk Import Excel / CSV ⭐️
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkParsedRows, setBulkParsedRows] = useState([]);
  const [bulkImportMode, setBulkImportMode] = useState('upsert'); // 'upsert' | 'insert'
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState({ current: 0, total: 0, status: '' });
  const [bulkImportResult, setBulkImportResult] = useState(null);
  const bulkFileInputRef = useRef(null);

  // ⭐️ States សម្រាប់ Telegram Notifications ⭐️
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramStatusMsg, setTelegramStatusMsg] = useState('');

  // រក្សាទុកការកំណត់ហាងទាំងអស់ (Save Store Settings)
  const handleSaveStoreSettings = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    localStorage.setItem('sabay_store_settings', JSON.stringify(storeSettings));
    
    // Auto-sync ទៅ invoiceSettings
    const updatedInvoice = {
      ...invoiceSettings,
      storeName: storeSettings.storeName || invoiceSettings.storeName,
      phone: storeSettings.phone || invoiceSettings.phone,
      address: storeSettings.address || invoiceSettings.address,
      exchangeRate: Number(storeSettings.exchangeRate) || 4100,
      policyNote: storeSettings.policyNote || invoiceSettings.policyNote
    };
    setInvoiceSettings(updatedInvoice);
    localStorage.setItem('sabay_invoice_settings', JSON.stringify(updatedInvoice));
    setExchangeRate(Number(storeSettings.exchangeRate) || 4100);

    // Notify other windows/tabs (e.g. Storefront)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }

    setStoreSettingsSavedMsg('🎉 រក្សាទុកការកំណត់ហាង និងម៉ាកយីហោជោគជ័យ!');
    setTimeout(() => setStoreSettingsSavedMsg(''), 3500);
  };

  // Upload Logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressMediaFile(file, 800, 0.9);
      const reader = new FileReader();
      reader.onload = (event) => {
        setStoreSettings(prev => ({ ...prev, logoUrl: event.target.result }));
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert('❌ បរាជ័យក្នុងការ Upload Logo: ' + err.message);
    }
  };

  // Upload KHQR Code Image
  
  // ⭐️ State & Handlers សម្រាប់ Reset Demo Data & នាំចេញ Excel/CSV ⭐️
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetActionType, setResetActionType] = useState('all'); // 'all' | 'orders' | 'movements' | 'customers' | 'products'
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Preset ពណ៌សម្រាប់ Brand Theme
  const THEME_PRESETS = [
    { id: 'orange', name: 'Sunset Orange (លំនាំដើម)', hex: '#ff6a00', desc: 'Streetwear, កីឡា, ថាមពល' },
    { id: 'blue', name: 'Royal Blue (ខៀវ)', hex: '#2563eb', desc: 'ទូទៅ, បច្ចេកវិទ្យា, ស្បែកជើង' },
    { id: 'purple', name: 'Luxury Purple (ស្វាយ)', hex: '#7c3aed', desc: 'Boutique, សំលៀកបំពាក់, អលង្ការ' },
    { id: 'emerald', name: 'Fresh Emerald (បៃតង)', hex: '#059669', desc: 'ធម្មជាតិ, គ្រឿងសម្អាង, Skincare' },
    { id: 'rose', name: 'Crimson Rose (ផ្កាឈូក/ក្រហម)', hex: '#e11d48', desc: 'យុវវ័យ, នារី, Trend ថ្មីៗ' },
    { id: 'dark', name: 'Dark Luxury (ខ្មៅ)', hex: '#0f172a', desc: 'Minimalist, ថ្លៃថ្នូរ, Luxury' }
  ];

  // ⭐️ មុខងារប្តូរពណ៌ Brand Theme ផ្ទាល់ភ្លាមៗ (Instant Auto-Save & Broadcast) ⭐️
  const handleApplyThemeColor = (colorHex, presetId = 'custom') => {
    const updated = {
      ...storeSettings,
      themeColor: colorHex,
      themePreset: presetId
    };
    setStoreSettings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_store_settings', JSON.stringify(updated));
      document.documentElement.style.setProperty('--brand-primary', colorHex);
      window.dispatchEvent(new Event('storage'));
    }
    const matched = THEME_PRESETS.find(p => p.hex.toLowerCase() === colorHex.toLowerCase());
    setStoreSettingsSavedMsg(`🎉 បានប្តូរពណ៌ Theme ទៅជា «${matched ? matched.name : colorHex}» រួចរាល់!`);
    setTimeout(() => setStoreSettingsSavedMsg(''), 3500);
  };

  // Sync brand theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_store_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.themeColor) {
            document.documentElement.style.setProperty('--brand-primary', parsed.themeColor);
          }
        } catch (e) {}
      }
    }
  }, []);

  // ⭐️ មុខងារទាញយកទិន្នន័យស្តុកជា Excel/CSV (Inventory Export) ⭐️
  const exportInventoryToCSV = () => {
    if (products.length === 0) {
      alert('មិនមានទិន្នន័យទំនិញសម្រាប់នាំចេញទេ!');
      return;
    }
    const headers = [
      'ID', 'ឈ្មោះទំនិញ', 'បាកូដ_SKU', 'ប្រភេទ_Category', 'តម្លៃដើមទុន_Cost($)',
      'តម្លៃលក់រាយ_Price($)', 'បញ្ចុះតម្លៃរាយ($)', 'តម្លៃបោះដុំ_Wholesale($)', 'បញ្ចុះតម្លៃដុំ($)',
      'ស្តុកសរុប_Stock', 'កម្រិតស្តុកទាប_Alert', 'ស្ថានភាព_Status'
    ];
    const rows = products.map(p => [
      `"${p.id}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.sku || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${parseFloat(p.cost_price || 0).toFixed(2)}"`,
      `"${parseFloat(p.price || 0).toFixed(2)}"`,
      `"${parseFloat(p.retail_discount || 0).toFixed(2)}"`,
      `"${parseFloat(p.wholesale_price || 0).toFixed(2)}"`,
      `"${parseFloat(p.wholesale_discount || 0).toFixed(2)}"`,
      `"${p.stock_qty || 0}"`,
      `"${p.low_stock_alert || 5}"`,
      `"${p.stock_qty <= 0 ? 'អស់ស្តុក' : p.stock_qty <= (p.low_stock_alert || 5) ? 'ស្តុកជិតអស់' : 'មានក្នុងស្តុក'}"`
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventory_${(storeSettings.storeName || 'Store').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ⭐️ Helper: បំប្លែងជួរដេក Excel / CSV ទៅជា Product Object ⭐️
  const mapRowToProduct = (row, index) => {
    const getVal = (...keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
        if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
          return row[found];
        }
      }
      return '';
    };

    const name = String(getVal('ឈ្មោះទំនិញ', 'ឈ្មោះ', 'name', 'product_name', 'title')).trim();
    let sku = String(getVal('បាកូដ_sku', 'បាកូដ', 'sku', 'barcode', 'code')).trim();
    if (!sku) {
      sku = `SL-${Date.now().toString().slice(-4)}${index + 1}`;
    }

    const category = String(getVal('ប្រភេទ_category', 'ប្រភេទ', 'category', 'category_name')).trim() || 'ទូទៅ';
    const cost_price = parseFloat(getVal('តម្លៃដើមទុន_cost($)', 'តម្លៃដើមទុន', 'cost', 'cost_price', 'cost_price($)')) || 0;
    const price = parseFloat(getVal('តម្លៃលក់រាយ_price($)', 'តម្លៃលក់រាយ', 'តម្លៃលក់', 'price', 'selling_price', 'price($)')) || 0;
    const retail_discount = parseFloat(getVal('បញ្ចុះតម្លៃរាយ($)', 'បញ្ចុះតម្លៃរាយ', 'retail_discount', 'discount')) || 0;
    const wholesale_price = parseFloat(getVal('តម្លៃបោះដុំ_wholesale($)', 'តម្លៃបោះដុំ', 'តម្លៃដុំ', 'wholesale_price', 'wholesale($)')) || 0;
    const wholesale_discount = parseFloat(getVal('បញ្ចុះតម្លៃដុំ($)', 'បញ្ចុះតម្លៃដុំ', 'wholesale_discount')) || 0;
    const stock_qty = parseInt(getVal('ស្តុកសរុប_stock', 'ស្តុក', 'ស្តុកសរុប', 'stock', 'stock_qty', 'qty', 'quantity'), 10) || 0;
    const low_stock_alert = parseInt(getVal('កម្រិតស្តុកទាប_alert', 'កម្រិតស្តុកទាប', 'low_stock_alert', 'alert', 'min_stock'), 10) || 5;
    const size = String(getVal('ទំហំ', 'size', 'size_name')).trim() || 'N/A';
    const color = String(getVal('ពណ៌', 'color', 'color_name')).trim() || 'N/A';
    const image_url = String(getVal('រូបភាព', 'image', 'image_url', 'photo')).trim() || '';

    return {
      name,
      sku,
      category,
      cost_price,
      price,
      retail_discount,
      wholesale_price,
      wholesale_discount,
      stock_qty,
      low_stock_alert,
      size,
      color,
      image_url,
      isValid: !!name
    };
  };

  // ⭐️ មុខងារទាញយកទិន្នន័យស្តុកជា Excel (.xlsx) ⭐️
  const exportInventoryToExcel = () => {
    if (products.length === 0) {
      alert('មិនមានទិន្នន័យទំនិញសម្រាប់នាំចេញទេ!');
      return;
    }
    const headers = [
      'ID', 'ឈ្មោះទំនិញ', 'បាកូដ_SKU', 'ប្រភេទ_Category', 'តម្លៃដើមទុន_Cost($)',
      'តម្លៃលក់រាយ_Price($)', 'បញ្ចុះតម្លៃរាយ($)', 'តម្លៃបោះដុំ_Wholesale($)', 'បញ្ចុះតម្លៃដុំ($)',
      'ស្តុកសរុប_Stock', 'កម្រិតស្តុកទាប_Alert', 'ស្ថានភាព_Status'
    ];
    const data = [
      headers,
      ...products.map(p => [
        p.id,
        p.name || '',
        p.sku || '',
        p.category || '',
        parseFloat(p.cost_price || 0),
        parseFloat(p.price || 0),
        parseFloat(p.retail_discount || 0),
        parseFloat(p.wholesale_price || 0),
        parseFloat(p.wholesale_discount || 0),
        parseInt(p.stock_qty || 0),
        parseInt(p.low_stock_alert || 5),
        p.stock_qty <= 0 ? 'អស់ស្តុក' : p.stock_qty <= (p.low_stock_alert || 5) ? 'ស្តុកជិតអស់' : 'មានក្នុងស្តុក'
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 10 }, { wch: 32 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const storeNameClean = (storeSettings.storeName || 'Store').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Inventory_${storeNameClean}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ⭐️ មុខងារទាញយកគំរូ Excel សម្រាប់បំពេញទិន្នន័យ (Sample Excel Template) ⭐️
  const downloadInventoryTemplate = () => {
    const headers = [
      'ឈ្មោះទំនិញ (Name)*',
      'បាកូដ_SKU (Barcode)',
      'ប្រភេទ_Category',
      'តម្លៃដើមទុន_Cost($)',
      'តម្លៃលក់រាយ_Price($)*',
      'បញ្ចុះតម្លៃរាយ($)',
      'តម្លៃបោះដុំ_Wholesale($)',
      'បញ្ចុះតម្លៃដុំ($)',
      'ស្តុកសរុប_Stock*',
      'កម្រិតស្តុកទាប_Alert',
      'ទំហំ_Size',
      'ពណ៌_Color',
      'រូបភាព_Image_URL'
    ];
    const sampleRows = [
      ['ស្បែកជើងប៉ាតា Nike Air Force 1', 'NK-1001', 'ស្បែកជើង', 25.00, 45.00, 5.00, 35.00, 0, 50, 5, '40, 41, 42, 43', 'White', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff'],
      ['អាវយឺតដៃខ្លី Oversize Premium', 'TS-2002', 'សម្លៀកបំពាក់', 5.50, 12.00, 0, 8.50, 0, 40, 5, 'M, L, XL', 'Black', ''],
      ['កាបូបស្ពាយស្បែកបុរស Luxury', 'BG-3003', 'កាបូប', 14.00, 28.00, 3.00, 20.00, 0, 15, 3, 'Free Size', 'Brown', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
      { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
      { wch: 16 }, { wch: 14 }, { wch: 30 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Template_Inventory_Import_${(storeSettings.storeName || 'Store').replace(/\s+/g, '_')}.xlsx`);
  };

  // ⭐️ មុខងារជ្រើសរើស និងអានឯកសារ Excel / CSV (File Reader) ⭐️
  const handleBulkExcelFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          alert('❌ ឯកសារនេះមិនមានទិន្នន័យទេ! សូមពិនិត្យមើលឯកសារឡើងវិញ។');
          return;
        }

        const parsed = rawRows.map((r, idx) => mapRowToProduct(r, idx)).filter(r => r.name);
        if (parsed.length === 0) {
          alert('❌ មិនអាចស្វែងរកឈ្មោះទំនិញ (Name) ក្នុងជួរឈរណាមួយឡើយ! សូមប្រាកដថាមានជួរឈរ "ឈ្មោះទំនិញ" ឬ "Name"។');
          return;
        }

        setBulkImportFile(file);
        setBulkParsedRows(parsed);
        setBulkImportResult(null);
        setBulkImportModalOpen(true);
      } catch (err) {
        console.error('Error reading excel/csv file:', err);
        alert('❌ បរាជ័យក្នុងការអានឯកសារ Excel/CSV: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ⭐️ មុខងារដំណើរការ Bulk Import ចូល Supabase Database ⭐️
  const handleExecuteBulkImport = async () => {
    if (!bulkParsedRows || bulkParsedRows.length === 0) return;
    setBulkImportLoading(true);
    setBulkImportProgress({ current: 0, total: bulkParsedRows.length, status: 'កំពុងចាប់ផ្តើម...' });

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];
    const lowStockItems = [];

    // បង្កើត Categories ថ្មីបើមិនទាន់មានក្នុង Database
    const existingCatNames = categories.map(c => (c.name || '').trim().toLowerCase());
    const newCatsToCreate = new Set();
    bulkParsedRows.forEach(item => {
      const cat = (item.category || '').trim();
      if (cat && !existingCatNames.includes(cat.toLowerCase())) {
        newCatsToCreate.add(cat);
      }
    });

    if (newCatsToCreate.size > 0) {
      try {
        const catPayload = Array.from(newCatsToCreate).map(c => ({ name: c }));
        await supabase.from('categories').insert(catPayload);
        fetchCategories();
      } catch (e) {
        console.error('Error creating categories:', e);
      }
    }

    for (let i = 0; i < bulkParsedRows.length; i++) {
      const item = bulkParsedRows[i];
      setBulkImportProgress({
        current: i + 1,
        total: bulkParsedRows.length,
        status: `កំពុងបញ្ចូល: ${item.name} (${i + 1}/${bulkParsedRows.length})`
      });

      try {
        const existingProd = bulkImportMode === 'upsert'
          ? products.find(p => p.sku && p.sku.toLowerCase() === item.sku.toLowerCase())
          : null;

        const metaJson = JSON.stringify({
          images: item.image_url ? [item.image_url] : [],
          retail_discount: item.retail_discount || 0,
          wholesale_discount: item.wholesale_discount || 0
        });

        const productPayload = {
          name: item.name,
          sku: item.sku,
          category: item.category || 'ទូទៅ',
          category_name: metaJson,
          size: item.size || 'N/A',
          color: item.color || 'N/A',
          stock_qty: item.stock_qty || 0,
          cost_price: item.cost_price || 0,
          wholesale_price: item.wholesale_price || 0,
          wholesale_discount: item.wholesale_discount || 0,
          price: item.price || 0,
          retail_discount: item.retail_discount || 0,
          low_stock_alert: item.low_stock_alert || 5,
          image_url: item.image_url || '',
          images: item.image_url ? [item.image_url] : [],
          status: item.stock_qty > 0 ? 'In Stock' : 'Out of Stock'
        };

        if (existingProd) {
          // ធ្វើបច្ចុប្បន្នភាពទំនិញចាស់
          let { error: upErr } = await supabase
            .from('products')
            .update(productPayload)
            .eq('id', existingProd.id);

          if (upErr && (upErr.message?.includes('wholesale_price') || upErr.message?.includes('images') || upErr.code === 'PGRST204')) {
            delete productPayload.wholesale_price;
            delete productPayload.retail_discount;
            delete productPayload.wholesale_discount;
            delete productPayload.images;
            const retry = await supabase.from('products').update(productPayload).eq('id', existingProd.id);
            upErr = retry.error;
          }

          if (upErr) throw upErr;

          // កត់ត្រាប្រវត្តិចលនាស្តុក បើស្តុកមានការប្រែប្រួល
          if (item.stock_qty !== existingProd.stock_qty) {
            await supabase.from('stock_movements').insert([{
              product_id: existingProd.id,
              type: 'ADJUST',
              qty_change: item.stock_qty - (existingProd.stock_qty || 0),
              previous_qty: existingProd.stock_qty || 0,
              new_qty: item.stock_qty,
              reason: 'នាំចូលស្តុកតាម Excel/CSV (Bulk Import Update)'
            }]);
          }

          updated++;
        } else {
          // បញ្ចូលជាទំនិញថ្មី
          let insertData = { ...productPayload };
          let { data: newProd, error: inErr } = await supabase
            .from('products')
            .insert([insertData])
            .select()
            .single();

          if (inErr && (inErr.message?.includes('wholesale_price') || inErr.message?.includes('images') || inErr.code === 'PGRST204')) {
            delete insertData.wholesale_price;
            delete insertData.retail_discount;
            delete insertData.wholesale_discount;
            delete insertData.images;
            const retry = await supabase.from('products').insert([insertData]).select().single();
            newProd = retry.data;
            inErr = retry.error;
          }

          if (inErr) throw inErr;

          if (newProd && item.stock_qty > 0) {
            await supabase.from('stock_movements').insert([{
              product_id: newProd.id,
              type: 'IN',
              qty_change: item.stock_qty,
              previous_qty: 0,
              new_qty: item.stock_qty,
              reason: 'នាំចូលស្តុកទំនិញថ្មីតាម Excel/CSV (Bulk Import New)'
            }]);
          }

          inserted++;
        }

        // ត្រួតពិនិត្យស្តុកទាប
        if (item.stock_qty <= (item.low_stock_alert || storeSettings.lowStockThreshold || 5)) {
          lowStockItems.push(item);
        }
      } catch (err) {
        console.error('Error importing product:', item.name, err);
        failed++;
        errors.push(`${item.name}: ${err.message || 'Error'}`);
      }
    }

    setBulkImportLoading(false);
    setBulkImportResult({ inserted, updated, failed, errors });
    fetchProducts();

    // ជូនដំណឹងតាម Telegram បើមានទំនិញទើបនាំចូលសល់ស្តុកតិច
    if (lowStockItems.length > 0 && storeSettings.enableLowStockAlert && storeSettings.telegramBotToken && storeSettings.telegramChatId) {
      sendTelegramNotification({ action: 'low_stock', items: lowStockItems });
    }
  };

  // ⭐️ មុខងារផ្ញើសារតាម Telegram (Telegram Notification Dispatcher) ⭐️
  const sendTelegramNotification = async ({ action, items, message, stockData }) => {
    const token = storeSettings.telegramBotToken || '';
    const chat = storeSettings.telegramChatId || '';

    if (!token || !chat) {
      return { success: false, message: 'សូមបញ្ចូល Telegram Bot Token និង Chat ID ក្នុង Settings ជាមុនសិន!' };
    }

    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: token,
          chatId: chat,
          storeName: storeSettings.storeName || 'SABAY LUK',
          action,
          items,
          message,
          stockData
        })
      });

      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Error sending telegram alert:', err);
      return { success: false, message: err.message };
    }
  };

  // ⭐️ មុខងារតេស្តការតភ្ជាប់ Telegram Bot (Test Telegram Connection) ⭐️
  const handleTestTelegramAlert = async () => {
    setTelegramTesting(true);
    setTelegramStatusMsg('កំពុងសាកល្បងផ្ញើសារទៅកាន់ Telegram...');
    const res = await sendTelegramNotification({ action: 'test' });
    setTelegramTesting(false);
    if (res.success) {
      setTelegramStatusMsg('✅ បានផ្ញើសារសាកល្បងទៅ Telegram ជោគជ័យ! សូមបើកមើលក្នុង Telegram។');
      alert('✅ បានផ្ញើសារសាកល្បងទៅ Telegram ជោគជ័យ! សូមបើក Telegram មើលសារ។');
    } else {
      setTelegramStatusMsg('❌ បរាជ័យក្នុងការផ្ញើសារ: ' + (res.message || 'សូមពិនិត្យមើល Token & Chat ID'));
      alert('❌ បរាជ័យក្នុងការផ្ញើសារ Telegram: ' + (res.message || 'សូមពិនិត្យមើល Token & Chat ID'));
    }
    setTimeout(() => setTelegramStatusMsg(''), 5000);
  };

  // ⭐️ មុខងារត្រួតពិនិត្យ និងផ្ញើ Telegram Low Stock Alert ដោយផ្ទាល់ដៃ (Manual Trigger) ⭐️
  const handleManualStockAlertCheck = async () => {
    const threshold = parseInt(storeSettings.lowStockThreshold, 10) || 5;
    const lowItems = products.filter(p => p.stock_qty <= (p.low_stock_alert || threshold));

    if (lowItems.length === 0) {
      alert(`🎉 អបអរសាទរ! មិនមានទំនិញណាមួយសល់ក្រោម ឬស្មើ ${threshold} ឬអស់ពីស្តុកឡើយ!`);
      return;
    }

    if (!storeSettings.telegramBotToken || !storeSettings.telegramChatId) {
      alert(`⚠️ រកឃើញទំនិញជិតអស់/អស់ស្តុកចំនួន ${lowItems.length} មុខ!\n\nដើម្បីទទួលបានសារស្វ័យប្រវត្តិតាម Telegram សូមកំណត់ Telegram Bot Token និង Chat ID ក្នុង Tab "🔌 API & Integrations"។`);
      setActiveTab('api');
      return;
    }

    if (confirm(`🚨 រកឃើញទំនិញជិតអស់/អស់ស្តុកចំនួន ${lowItems.length} មុខ!\n\nតើបងចង់ផ្ញើរបាយការណ៍សង្ខេបនេះទៅកាន់ Telegram ឥឡូវនេះដែរឬទេ?`)) {
      setTelegramTesting(true);
      const res = await sendTelegramNotification({ action: 'low_stock', items: lowItems });
      setTelegramTesting(false);
      if (res.success) {
        alert(`✅ បានផ្ញើរបាយការណ៍ស្តុកទាបចំនួន ${lowItems.length} មុខ ទៅ Telegram ជោគជ័យ!`);
      } else {
        alert('❌ បរាជ័យក្នុងការផ្ញើសារ: ' + res.message);
      }
    }
  };

  // ⭐️ មុខងារទាញយកកំណត់ត្រាចលនាស្តុកជា Excel/CSV (Stock Movements Export) ⭐️
  const exportStockMovementsToCSV = () => {
    if (stockMovements.length === 0) {
      alert('មិនមានទិន្នន័យចលនាស្តុកសម្រាប់នាំចេញទេ!');
      return;
    }
    const headers = [
      'កាលបរិច្ឆេទ', 'ម៉ោង', 'ឈ្មោះទំនិញ', 'SKU', 'ទំហំ_ពណ៌',
      'ប្រភេទចលនា', 'ចំនួនប្រែប្រួល', 'ស្តុកមុន', 'ស្តុកក្រោយ', 'មូលហេតុ'
    ];
    const rows = stockMovements.map(m => {
      const p = m.products || {};
      const v = m.product_variants || {};
      const d = m.created_at ? new Date(m.created_at) : new Date();
      const dateStr = d.toLocaleDateString();
      const timeStr = d.toLocaleTimeString();
      const variantStr = [v.size, v.color].filter(Boolean).join(' / ') || 'ទូទៅ';
      const typeLabel = m.type === 'PURCHASE' ? 'នាំចូល (Purchase)' : m.type === 'SALE' ? 'លក់ចេញ (Sale)' : 'កាត់ស្តុក (Adjustment)';
      const qtyChange = m.qty_change > 0 ? `+${m.qty_change}` : `${m.qty_change}`;

      return [
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.sku || '').replace(/"/g, '""')}"`,
        `"${variantStr.replace(/"/g, '""')}"`,
        `"${typeLabel}"`,
        `"${qtyChange}"`,
        `"${m.previous_qty || 0}"`,
        `"${m.new_qty || 0}"`,
        `"${(m.reason || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stock_Movements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ⭐️ មុខងារទាញយកបញ្ជីលក់ជា Excel/CSV (Orders Export) ⭐️
  const exportOrdersToCSV = () => {
    if (realOrders.length === 0) {
      alert('មិនមានទិន្នន័យការលក់សម្រាប់នាំចេញទេ!');
      return;
    }
    const headers = [
      'លេខវិក្កយបត្រ', 'កាលបរិច្ឆេទ', 'ឈ្មោះអតិថិជន', 'លេខទូរស័ព្ទ', 'ប្រភេទការលក់',
      'សរុបទឹកប្រាក់($)', 'បញ្ចុះតម្លៃ($)', 'វិធីសាស្ត្រទូទាត់', 'ស្ថានភាព', 'ចំនួនមុខទំនិញ'
    ];
    const rows = realOrders.map(o => {
      const itemsCount = Array.isArray(o.items) ? o.items.reduce((s, it) => s + (it.qty || 1), 0) : 1;
      return [
        `"${o.order_id || o.id}"`,
        `"${o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}"`,
        `"${(o.customer_name || o.customer || 'អតិថិជនទូទៅ').replace(/"/g, '""')}"`,
        `"${(o.phone || o.phone_number || '').replace(/"/g, '""')}"`,
        `"${o.order_type || 'Storefront'}"`,
        `"${parseFloat(o.total_amount || 0).toFixed(2)}"`,
        `"${parseFloat(o.discount || 0).toFixed(2)}"`,
        `"${(o.payment_method || 'Cash').replace(/"/g, '""')}"`,
        `"${o.status || 'Completed'}"`,
        `"${itemsCount}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Orders_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ⭐️ មុខងារ Reset / សម្អាតទិន្នន័យតេស្តហាង ⭐️
  const handleExecuteReset = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      alert('សូមវាយពាក្យ "RESET" ឱ្យបានត្រឹមត្រូវដើម្បីបញ្ជាក់ការលុប!');
      return;
    }

    setIsResetting(true);
    try {
      if (resetActionType === 'orders' || resetActionType === 'all') {
        const { data: ords } = await supabase.from('orders').select('id');
        if (ords && ords.length > 0) {
          const ids = ords.map(o => o.id);
          await supabase.from('orders').delete().in('id', ids);
        }
        setRealOrders([]);
      }

      if (resetActionType === 'movements' || resetActionType === 'all') {
        const { data: mvts } = await supabase.from('stock_movements').select('id');
        if (mvts && mvts.length > 0) {
          const ids = mvts.map(m => m.id);
          await supabase.from('stock_movements').delete().in('id', ids);
        }
        setStockMovements([]);
      }

      if (resetActionType === 'customers' || resetActionType === 'all') {
        localStorage.removeItem('sabay_customers');
        setCustomers([]);
      }

      if (resetActionType === 'products' || resetActionType === 'all') {
        const { data: vars } = await supabase.from('product_variants').select('id');
        if (vars && vars.length > 0) {
          await supabase.from('product_variants').delete().in('id', vars.map(v => v.id));
        }
        const { data: prods } = await supabase.from('products').select('id');
        if (prods && prods.length > 0) {
          await supabase.from('products').delete().in('id', prods.map(p => p.id));
        }
        setProducts([]);
      }

      if (resetActionType === 'all') {
        localStorage.removeItem('sabay_pos_cart');
        localStorage.removeItem('sabay_pos_hold_orders');
        setPosCart([]);
        setHoldOrders([]);
      }

      if (fetchProducts) fetchProducts();
      if (fetchRealOrders) fetchRealOrders();
      if (fetchStockMovements) fetchStockMovements();

      setResetModalOpen(false);
      setResetConfirmText('');
      alert('🎉 សម្អាតទិន្នន័យបានជោគជ័យរួចរាល់!');
    } catch (err) {
      console.error('Reset error:', err);
      alert('❌ មានបញ្ហាក្នុងការសម្អាតទិន្នន័យ: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleKhqrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressMediaFile(file, 800, 0.9);
      const reader = new FileReader();
      reader.onload = (event) => {
        setStoreSettings(prev => ({ ...prev, khqrImageUrl: event.target.result }));
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert('❌ បរាជ័យក្នុងការ Upload KHQR: ' + err.message);
    }
  };

  // មុខងារ Save ការកំណត់វិក្កយបត្រ
  const handleSaveInvoiceSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('sabay_invoice_settings', JSON.stringify(invoiceSettings));
    setExchangeRate(invoiceSettings.exchangeRate); // update exchange rate ក្នុង POS ស្វ័យប្រវត្តិ
    setInvoiceSavedMsg('✅ រក្សាទុកទម្រង់វិក្កយបត្រជោគជ័យ!');
    setTimeout(() => setInvoiceSavedMsg(''), 3000);
  };

  // State សម្រាប់ Modal ជ្រើសរើស Size/Variant ពេលចុចលើទំនិញ
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [currentProductVariants, setCurrentProductVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // States សម្រាប់ទូទាត់ប្រាក់ និងវិក្កយបត្រ
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [thermalPaperSize, setThermalPaperSize] = useState('80mm'); // '80mm' | '58mm'
  const [customerName, setCustomerName] = useState('អតិថិជនទូទៅ');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // ⭐️ របៀបលក់ក្នុង POS (Price Mode: 'retail' | 'wholesale') ⭐️

  const [posPriceMode, setPosPriceMode] = useState('retail'); // 'retail' = លក់រាយ, 'wholesale' = លក់បោះដុំ
  const [modalPriceMode, setModalPriceMode] = useState('retail');


  const [zReportModalOpen, setZReportModalOpen] = useState(false);
  const [shiftStartingCash, setShiftStartingCash] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem('sabay_shift_starting_cash')) || 50.00;
    }
    return 50.00;
  });
  const [actualCashInput, setActualCashInput] = useState('');
  const [actualKhqrInput, setActualKhqrInput] = useState('');
  const [shiftClosingNote, setShiftClosingNote] = useState('');
  const [shiftHistory, setShiftHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sabay_shift_history');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });



  // ⭐️ ស្ដារ និងចងចាំទិន្នន័យចុងក្រោយរបស់ប្រព័ន្ធ POS ពេលបិទបើកឡើងវិញ (LocalStorage Persistence) ⭐️
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ១. ស្ដារ Price Mode (លក់រាយ ឬ លក់បោះដុំ)
    const savedPriceMode = localStorage.getItem('sabay_pos_price_mode');
    if (savedPriceMode === 'wholesale' || savedPriceMode === 'retail') {
      setPosPriceMode(savedPriceMode);
    }

    // ២. ស្ដារ Category ដែលបានជ្រើសរើសចុងក្រោយ
    const savedCategory = localStorage.getItem('sabay_pos_category');
    if (savedCategory) {
      setPosCategory(savedCategory);
    }

    // ៣. ស្ដារទំនិញក្នុងកន្ត្រក (Cart Items)
    try {
      const savedCart = localStorage.getItem('sabay_pos_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosCart(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading saved pos cart:', e);
    }

    // ៤. ស្ដារឈ្មោះ និងលេខទូរស័ព្ទអតិថិជន
    const savedCustomerName = localStorage.getItem('sabay_pos_customer_name');
    if (savedCustomerName) setCustomerName(savedCustomerName);
    const savedCustomerPhone = localStorage.getItem('sabay_pos_customer_phone');
    if (savedCustomerPhone) setCustomerPhone(savedCustomerPhone);

    // ៥. ស្ដារការបញ្ចុះតម្លៃ (Discount)
    const savedDiscount = localStorage.getItem('sabay_pos_discount');
    if (savedDiscount != null && savedDiscount !== '') setDiscount(Number(savedDiscount) || 0);
    const savedDiscountType = localStorage.getItem('sabay_pos_discount_type');
    if (savedDiscountType === '%' || savedDiscountType === '$') setDiscountType(savedDiscountType);

    // ៦. ស្ដារបញ្ជីផ្អាកការលក់ (Hold/Park Orders)
    try {
      const savedHolds = localStorage.getItem('sabay_pos_hold_orders');
      if (savedHolds) {
        const parsedHolds = JSON.parse(savedHolds);
        if (Array.isArray(parsedHolds)) setHoldOrders(parsedHolds);
      }
    } catch (e) {}
  }, []);

  // ⭐️ រក្សាទុកស្វ័យប្រវត្តិនូវរាល់ការផ្លាស់ប្តូរ POS States ចូល LocalStorage ⭐️
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sabay_pos_price_mode', posPriceMode);
    }
  }, [posPriceMode, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sabay_pos_category', posCategory);
    }
  }, [posCategory, isMounted]);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('sabay_pos_cart', JSON.stringify(posCart));
      } catch (e) {}
    }
  }, [posCart, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('sabay_pos_customer_name', customerName);
      localStorage.setItem('sabay_pos_customer_phone', customerPhone);
      localStorage.setItem('sabay_pos_discount', discount.toString());
      localStorage.setItem('sabay_pos_discount_type', discountType);
    }
  }, [customerName, customerPhone, discount, discountType, isMounted]);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('sabay_pos_hold_orders', JSON.stringify(holdOrders));
      } catch (e) {}
    }
  }, [holdOrders, isMounted]);

  // មុខងារគណនាតម្លៃលក់ក្នុង POS (គិតទាំងតម្លៃបោះដុំ និងលក់រាយ)
  const getProductPosPrice = (product, mode = posPriceMode) => {
    if (!product) return 0;
    if (mode === 'wholesale') {
      const wholesaleVal = parseFloat(product.wholesale_price);
      if (!isNaN(wholesaleVal) && wholesaleVal > 0) {
        const discount = parseFloat(product.wholesale_discount) || 0;
        return Math.max(0, wholesaleVal - discount);
      }
    }
    // Fallback ទៅតម្លៃលក់រាយ
    const retailVal = parseFloat(product.price) || 0;
    const discount = parseFloat(product.retail_discount) || 0;
    return Math.max(0, retailVal - discount);
  };

  // មុខងារប្តូររបៀបលក់សរុប (Switch Global Price Mode)
  const handleSwitchPriceMode = (newMode) => {
    setPosPriceMode(newMode);
    // ធ្វើបច្ចុប្បន្នភាពតម្លៃទំនិញទាំងអស់ក្នុងកន្ត្រកភ្លាមៗ
    setPosCart(prev => prev.map(item => {
      const prod = products.find(p => p.id === item.id);
      if (!prod) return item;
      const newPrice = getProductPosPrice(prod, newMode);
      return {
        ...item,
        price: newPrice,
        priceMode: newMode
      };
    }));
  };

  // មុខងារប្តូរតម្លៃដុំ/រាយ សម្រាប់តែទំនិញនីមួយៗក្នុងកន្ត្រក (Toggle Single Item in Cart)
  const toggleItemPriceMode = (cartItemId) => {
    setPosCart(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;
      const nextMode = item.priceMode === 'wholesale' ? 'retail' : 'wholesale';
      const prod = products.find(p => p.id === item.id);
      const newPrice = prod ? getProductPosPrice(prod, nextMode) : item.price;
      return {
        ...item,
        price: newPrice,
        priceMode: nextMode
      };
    }));
  };

  // State បន្ថែមសម្រាប់ Modal Option
  const [modalSelectedSize, setModalSelectedSize] = useState('');
  const [modalSelectedColor, setModalSelectedColor] = useState('');
  const [modalQty, setModalQty] = useState(1);

  // ១. ពេលចុចលើទំនិញក្នុង POS (ទាញទាំង Variants និង Fallback ទំនិញចាស់)
  const handleProductClick = async (product) => {
    if (product.stock_qty <= 0) {
      alert('❌ ផលិតផលនេះអស់ពីស្តុកហើយ (Out of Stock)!');
      return;
    }

    setSelectedProductForVariant(product);
    setModalQty(1);
    setModalPriceMode(posPriceMode);
    setModalSelectedColor(product.color || '');
    setLoadingVariants(true);
    setVariantModalOpen(true);

    try {
      // ក. សាកល្បងទាញយកពី product_variants
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .order('size', { ascending: true });

      if (variants && variants.length > 0) {
        setCurrentProductVariants(variants);
        // រើសយក Size ដំបូងដែលមានស្តុក
        const firstInStock = variants.find(v => v.stock_qty > 0) || variants[0];
        setModalSelectedSize(firstInStock.size);
        if (firstInStock.color) setModalSelectedColor(firstInStock.color);
      } else {
        // ខ. ⭐️ SMART FALLBACK: បើទំនិញចាស់គ្មានក្នុង product_variants គឺទាញពី product.size ផ្ទាល់
        let parsedVariants = [];
        if (product.size && product.size !== 'N/A') {
          if (product.size.includes(':')) {
            // ទម្រង់ "39:5, 40:10"
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
            // ទម្រង់ "39, 40, 41"
            parsedVariants = product.size.split(',').map((sz, idx) => ({
              id: `legacy_${idx}`,
              size: sz.trim(),
              color: product.color || '',
              stock_qty: product.stock_qty,
              isLegacy: true
            }));
          }
        }

        setCurrentProductVariants(parsedVariants);
        if (parsedVariants.length > 0) {
          setModalSelectedSize(parsedVariants[0].size);
        } else {
          setModalSelectedSize('');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVariants(false);
    }
  };

  // ២. បញ្ជាក់ការបញ្ចូលទៅកន្រ្តកពី Modal (Full Option Add to Cart)
  const handleConfirmAddToCart = () => {
    if (!selectedProductForVariant) return;

    const matchedVariant = currentProductVariants.find(v => 
      v.size === modalSelectedSize && (modalSelectedColor ? (v.color || '').trim().toLowerCase() === modalSelectedColor.trim().toLowerCase() : true)
    ) || currentProductVariants.find(v => v.size === modalSelectedSize) || currentProductVariants[0];
    const variantId = matchedVariant && !matchedVariant.isLegacy ? matchedVariant.id : null;
    const maxStock = matchedVariant ? matchedVariant.stock_qty : selectedProductForVariant.stock_qty;

    if (maxStock <= 0) {
      alert('❌ ទំហំនេះអស់ពីស្តុកហើយ!');
      return;
    }

    if (modalQty > maxStock) {
      alert(`❌ ចំនួនលើសស្តុកដែលមាន (ស្តុកនៅសល់ ${maxStock})!`);
      return;
    }

    const activePrice = getProductPosPrice(selectedProductForVariant, modalPriceMode);
    const cartItemId = `${selectedProductForVariant.id}_${modalSelectedSize || 'nosize'}_${modalSelectedColor || 'nocolor'}_${modalPriceMode}`;

    setPosCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        const newQty = existing.qty + modalQty;
        if (newQty > maxStock) {
          alert(`❌ មិនអាចបន្ថែមបានទេ! ចំនួនសរុបក្នុងកន្រ្តកលើសស្តុក (${maxStock})។`);
          return prev;
        }
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: newQty } : item);
      }

      return [...prev, {
        cartItemId,
        id: selectedProductForVariant.id,
        variantId: variantId,
        name: selectedProductForVariant.name,
        sku: selectedProductForVariant.sku,
        size: modalSelectedSize || 'N/A',
        color: modalSelectedColor || selectedProductForVariant.color || 'N/A',
        price: activePrice,
        priceMode: modalPriceMode,
        image_url: selectedProductForVariant.image_url,
        maxStock: maxStock,
        qty: modalQty
      }];
    });

    setVariantModalOpen(false);
    setSelectedProductForVariant(null);
  };

  // ២. បន្ថែមទំនិញចូលកន្រ្តក
  const addItemToPosCart = (product, variant) => {
    const activePrice = getProductPosPrice(product, posPriceMode);
    const cartItemId = variant ? `${product.id}_${variant.id}_${posPriceMode}` : `${product.id}_base_${posPriceMode}`;
    const maxStock = variant ? variant.stock_qty : product.stock_qty;

    if (maxStock <= 0) {
      alert('❌ ទំហំ ឬទំនិញនេះអស់ពីស្តុកហើយ!');
      return;
    }

    setPosCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        if (existing.qty >= maxStock) {
          alert(`❌ មិនអាចបន្ថែមបានទេ! ស្តុកទំហំនេះមានត្រឹមតែ ${maxStock} ប៉ុណ្ណោះ។`);
          return prev;
        }
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item);
      }

      return [...prev, {
        cartItemId,
        id: product.id,
        variantId: variant ? variant.id : null,
        name: product.name,
        sku: variant ? variant.sku : product.sku,
        size: variant ? variant.size : product.size,
        color: variant ? variant.color : product.color,
        price: activePrice,
        priceMode: posPriceMode,
        image_url: product.image_url,
        maxStock: maxStock,
        qty: 1
      }];
    });

    setVariantModalOpen(false);
    setSelectedProductForVariant(null);
    setPosSearch('');
  };

  // ៣. ស្កេនបាកូដ / SKU
  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter' && posSearch.trim() !== '') {
      const query = posSearch.trim().toLowerCase();
      const matchedProduct = products.find(p => p.sku && (p.sku.toLowerCase() === query || p.name.toLowerCase().includes(query)));
      if (matchedProduct) {
        handleProductClick(matchedProduct);
      } else {
        alert('❌ រកមិនឃើញទំនិញក្នុងប្រព័ន្ធទេ!');
        setPosSearch('');
      }
    }
  };

  // ៤. បង្កើន/បន្ថយចំនួនក្នុងកន្រ្តក
  const updatePosQty = (cartItemId, delta) => {
    setPosCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.qty + delta;
        if (newQty > item.maxStock) {
          alert(`❌ ចំនួនលើសស្តុកដែលមាន (នៅសល់ ${item.maxStock})!`);
          return item;
        }
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removePosItem = (cartItemId) => setPosCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  const clearCart = () => setPosCart([]);

  // ៥. គណនាប្រាក់ ($ និង ៛)
  const posSubtotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const posDiscountValue = discountType === '%' ? posSubtotal * (Number(discount) / 100) : Number(discount);
  const posTotal = Math.max(0, posSubtotal - posDiscountValue);
  const posTotalKHR = Math.round(posTotal * exchangeRate);
  const changeAmount = Number(amountTendered) - posTotal;

  // ⭐️ KEYBOARD SHORTCUT KEYS (HOTKEYS) សម្រាប់អ្នកកាន់បេឡា (Cashier Speed) ⭐️
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e) => {
      // ប្រសិនបើមិនមែននៅលើ Tab 'pos' ទេ មិនបាច់ដំណើរការ hotkeys ឡើយ
      if (activeTab !== 'pos') return;

      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      // F2 ➔ ស្វែងរកទំនិញរហ័ស (Focus Quick Search / Barcode)
      if (e.key === 'F2') {
        e.preventDefault();
        if (searchInputRef && searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }

      // F4 ➔ ប្តូររវាងលក់រាយ ↔️ លក់បោះដុំ (Switch Retail / Wholesale)
      if (e.key === 'F4') {
        e.preventDefault();
        handleSwitchPriceMode(posPriceMode === 'wholesale' ? 'retail' : 'wholesale');
        return;
      }

      // F8 ➔ បើកផ្ទាំងទូទាត់ប្រាក់ (Checkout / Pay)
      if (e.key === 'F8') {
        e.preventDefault();
        if (posCart.length > 0 && !paymentModalOpen && !receiptData) {
          setAmountTendered(posTotal.toString());
          setPaymentModalOpen(true);
        }
        return;
      }

      // Space ➔ ចុច Checkout ពេលមិនស្ថិតនៅក្នុង input/textarea
      if (e.code === 'Space' && !isInput && !paymentModalOpen && !receiptData && !variantModalOpen && !zReportModalOpen) {
        if (posCart.length > 0) {
          e.preventDefault();
          setAmountTendered(posTotal.toString());
          setPaymentModalOpen(true);
        }
        return;
      }

      // F9 ➔ ព្រីនវិក្កយបត្រ (Print Receipt) ពេលផ្ទាំង Receipt កំពុងបើក
      if (e.key === 'F9') {
        e.preventDefault();
        const printBtn = document.getElementById('receipt-print-trigger-btn');
        if (printBtn) {
          printBtn.click();
        } else if (receiptData) {
          const printArea = document.getElementById('receipt-print-area');
          if (printArea) {
            const printContent = printArea.innerHTML;
            const printWindow = window.open('', '_blank', 'height=650,width=450');
            const widthCss = thermalPaperSize === '58mm' ? '54mm' : '76mm';
            const pageCss = thermalPaperSize === '58mm' ? '58mm auto' : '80mm auto';
            const fontSize = thermalPaperSize === '58mm' ? '10px' : '11px';
            printWindow.document.write(`
              <html>
                <head>
                  <title>វិក្កយបត្រ ${receiptData.orderId || ''}</title>
                  <style>
                    @page { size: ${pageCss}; margin: 0; }
                    body { font-family: monospace; width: ${widthCss}; margin: 0 auto; padding: 4mm 2mm; font-size: ${fontSize}; line-height: 1.25; color: #000; }
                    th, td { padding: 2px 0; }
                    .border-dashed { border-style: dashed; }
                    .border-b { border-bottom-width: 1px; }
                    .border-t { border-top-width: 1px; }
                    .border-black { border-color: #000; }
                  </style>
                </head>
                <body>
                  ${printContent}
                  <script>
                    window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
                  </script>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        }
        return;
      }

      // Esc ➔ បិទ Modal នានា
      if (e.key === 'Escape') {
        if (zReportModalOpen) setZReportModalOpen(false);
        else if (receiptData) setReceiptData(null);
        else if (paymentModalOpen) setPaymentModalOpen(false);
        else if (variantModalOpen) setVariantModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, posPriceMode, posCart, posTotal, paymentModalOpen, receiptData, variantModalOpen, zReportModalOpen, thermalPaperSize]);

  // ⭐️ គណនាស្ថិតិវេនលក់បច្ចុប្បន្ន (Z-Report Shift Calculation) ⭐️
  const getShiftReportStats = () => {
    // ស្វែងរក Orders ថ្ងៃនេះ
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = (realOrders || []).filter(o => {
      const oDate = o.created_at ? o.created_at.slice(0, 10) : '';
      return oDate === todayStr && o.status !== 'Cancelled';
    });

    const cashOrders = todayOrders.filter(o => o.payment_method === 'Cash' || !o.payment_method);
    const khqrOrders = todayOrders.filter(o => o.payment_method && o.payment_method.toLowerCase().includes('khqr') || o.payment_method === 'Transfer' || o.payment_method === 'Bank');

    const systemCashSales = cashOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const systemKhqrSales = khqrOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const systemTotalSales = systemCashSales + systemKhqrSales;
    const expectedDrawerCash = shiftStartingCash + systemCashSales;

    const actualCash = actualCashInput !== '' ? parseFloat(actualCashInput) : expectedDrawerCash;
    const actualKhqr = actualKhqrInput !== '' ? parseFloat(actualKhqrInput) : systemKhqrSales;

    const cashDiff = actualCash - expectedDrawerCash;
    const khqrDiff = actualKhqr - systemKhqrSales;

    return {
      todayStr,
      orderCount: todayOrders.length,
      cashOrderCount: cashOrders.length,
      khqrOrderCount: khqrOrders.length,
      startingCash: shiftStartingCash,
      systemCashSales,
      systemKhqrSales,
      systemTotalSales,
      expectedDrawerCash,
      actualCash,
      actualKhqr,
      cashDiff,
      khqrDiff,
      todayOrders
    };
  };

  // មុខងារបិទបញ្ជីវេនលក់ (Close Shift / Save Z-Report)
  const handleSaveShiftClose = () => {
    const stats = getShiftReportStats();
    const newRecord = {
      id: 'Z-' + Date.now().toString().slice(-6),
      closedAt: new Date().toISOString(),
      closedBy: storeSettings.storeName || 'Cashier',
      startingCash: stats.startingCash,
      systemCashSales: stats.systemCashSales,
      systemKhqrSales: stats.systemKhqrSales,
      systemTotalSales: stats.systemTotalSales,
      expectedDrawerCash: stats.expectedDrawerCash,
      actualCash: stats.actualCash,
      actualKhqr: stats.actualKhqr,
      cashDiff: stats.cashDiff,
      khqrDiff: stats.khqrDiff,
      orderCount: stats.orderCount,
      notes: shiftClosingNote.trim()
    };

    const updated = [newRecord, ...shiftHistory];
    setShiftHistory(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_shift_history', JSON.stringify(updated));
    }
    alert('✅ បានកត់ត្រាបិទបញ្ជីវេនលក់ប្រចាំថ្ងៃ (Z-Report) ដោយជោគជ័យ!');
    setShiftClosingNote('');
  };

  // ៦. ផ្អាកការលក់ (Hold/Park) និងបន្ត (Resume) រួមទាំងឈ្មោះអតិថិជន
  const parkOrder = () => {
    if (posCart.length === 0) return;
    setHoldOrders([...holdOrders, { 
      id: `ORD-${Date.now().toString().slice(-4)}`, 
      cart: posCart, 
      customer: customerName,
      phone: customerPhone,
      time: new Date().toLocaleTimeString() 
    }]);
    setPosCart([]);
    setCustomerName('អតិថិជនទូទៅ');
    setCustomerPhone('');
  };

  const resumeOrder = (index) => {
    const target = holdOrders[index];
    setPosCart(target.cart);
    setCustomerName(target.customer || 'អតិថិជនទូទៅ');
    setCustomerPhone(target.phone || '');
    setHoldOrders(holdOrders.filter((_, i) => i !== index));
  };

    // ⭐️ មុខងារបញ្ជាក់ការលក់ និងរក្សាទុកប្រវត្តិ History Full Option ⭐️
  const processPayment = async () => {
    if (paymentMethod === 'Cash' && changeAmount < 0) return alert('❌ ទឹកប្រាក់ទទួលមិនគ្រប់គ្រាន់ទេ!');
    setIsProcessingPayment(true);

    try {
      const generatedOrderId = `ORD-${Date.now().toString().slice(-6)}`;
      const affectedLowStockItems = [];

      // ១. កាត់ស្តុកចេញពី product_variants និង products
      for (const item of posCart) {
        if (item.variantId) {
          const { data: vData } = await supabase.from('product_variants').select('stock_qty').eq('id', item.variantId).single();
          const prevVQty = vData ? vData.stock_qty : item.maxStock;
          const newVQty = Math.max(0, prevVQty - item.qty);

          await supabase.from('product_variants').update({ stock_qty: newVQty }).eq('id', item.variantId);
        }

        const { data: pData } = await supabase.from('products').select('stock_qty, low_stock_alert, name, sku, category, price').eq('id', item.id).single();
        const prevPQty = pData ? pData.stock_qty : 0;
        const newPQty = Math.max(0, prevPQty - item.qty);

        await supabase.from('products').update({ 
          stock_qty: newPQty,
          status: newPQty > 0 ? 'In Stock' : 'Out of Stock'
        }).eq('id', item.id);

        // ពិនិត្យកម្រិតស្តុកទាប
        const alertThreshold = pData?.low_stock_alert || storeSettings.lowStockThreshold || 5;
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

        // កត់ត្រាចូល stock_movements
        await supabase.from('stock_movements').insert([{
          product_id: item.id,
          variant_id: item.variantId,
          type: 'SALE',
          qty_change: -item.qty,
          previous_qty: prevPQty,
          new_qty: newPQty,
          reason: `លក់ចេញតាម POS វិក្កយបត្រ ${generatedOrderId} (Size: ${item.size || 'ទូទៅ'})`
        }]);
      }

      // ២. ⭐️ រក្សាទុកប្រវត្តិពេញលេញចូលតារាង orders (Full Option History) ⭐️
      const resolvedCustomerName = customerName && customerName.trim() ? customerName.trim() : 'អតិថិជនទូទៅ';
      const resolvedCustomerPhone = customerPhone && customerPhone.trim() ? customerPhone.trim() : 'N/A';

      const orderPayload = {
        order_id: generatedOrderId,
        customer_name: resolvedCustomerName,
        phone: resolvedCustomerPhone,
        phone_number: resolvedCustomerPhone,
        address: 'POS មុខហាង',
        delivery_address: 'POS មុខហាង',
        total_amount: posTotal,
        subtotal: posSubtotal,
        discount: posDiscountValue,
        payment_method: paymentMethod,
        status: 'Completed',
        order_type: 'POS',
        items: posCart.map(item => ({
          id: item.id,
          name: item.name,
          size: item.size || 'N/A',
          color: item.color || 'N/A',
          price: item.price,
          qty: item.qty,
          image_url: item.image_url
        }))
      };

      const { error: orderError } = await supabase.from('orders').insert([orderPayload]);
      if (orderError) console.error('Order save error:', orderError);

      // ៣. ចងក្រងទិន្នន័យដើម្បីបង្ហាញ Receipt
      const receipt = {
        orderId: generatedOrderId,
        date: new Date().toLocaleString(),
        items: [...posCart],
        subtotal: posSubtotal,
        discount: posDiscountValue,
        total: posTotal,
        totalKHR: posTotalKHR,
        method: paymentMethod,
        tendered: paymentMethod === 'Cash' ? Number(amountTendered) : posTotal,
        change: changeAmount > 0 ? changeAmount : 0,
        customer: resolvedCustomerName,
        phone: resolvedCustomerPhone
      };

      setReceiptData(receipt);
      setPaymentModalOpen(false);
      setPosCart([]);
      setAmountTendered('');
      setDiscount(0);
      setCustomerName('អតិថិជនទូទៅ');
      setCustomerPhone('');

      // ៤. ⭐️ ធ្វើបច្ចុប្បន្នភាពទិន្នន័យស្តុក និងប្រវត្តិ Orders ភ្លាមៗ ⭐️
      fetchProducts();
      fetchRealOrders();

      // 🚨 ជូនដំណឹងស្វ័យប្រវត្តិតាម Telegram បើស្តុកធ្លាក់ដល់កម្រិតទាប (Low Stock Alert)
      if (affectedLowStockItems.length > 0 && storeSettings.enableLowStockAlert && storeSettings.telegramBotToken && storeSettings.telegramChatId) {
        sendTelegramNotification({ action: 'low_stock', items: affectedLowStockItems });
      }

    } catch (error) {
      console.error('POS Checkout Error:', error);
      alert('❌ មានបញ្ហាក្នុងការទូទាត់ប្រាក់: ' + error.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  
  // ================= ផ្នែក Upload & Add New Product (រួមបញ្ចូល State, Draft & Reorder) =================
  const [name, setName] = useState('');
  const [sku, setSku] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sabay_current_sku') || localStorage.getItem('sabay_last_saved_sku') || 'SL-1001';
    }
    return 'SL-1001';
  });
  const [category, setCategory] = useState('ស្បែកជើង');
  
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [customTextSize, setCustomTextSize] = useState('');
  const [color, setColor] = useState('');
  const [selectedColors, setSelectedColors] = useState([]);
  
  const [stockQty, setStockQty] = useState('0');
  const [costPrice, setCostPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleDiscount, setWholesaleDiscount] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [retailDiscount, setRetailDiscount] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('5');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  // មុខងាររក្សាទុកទិន្នន័យ Form ព្រាង មិនឱ្យបាត់ពេល Refresh
  useEffect(() => {
    const draft = localStorage.getItem('sabay_product_draft');
    if (draft) {
      const parsed = JSON.parse(draft);
      setName(parsed.name || '');
      setSku(parsed.sku || `SL-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory(parsed.category || 'ស្បែកជើង');
      setSelectedSizes(parsed.selectedSizes || []);
      setCustomTextSize(parsed.customTextSize || '');
      setColor(parsed.color || '');
      setStockQty(parsed.stockQty !== undefined ? parsed.stockQty : '0');
      setCostPrice(parsed.costPrice || '');
      setWholesalePrice(parsed.wholesalePrice || '');
      setWholesaleDiscount(parsed.wholesaleDiscount || '');
      setSellingPrice(parsed.sellingPrice || '');
      setRetailDiscount(parsed.retailDiscount || '');
      setLowStockAlert(parsed.lowStockAlert || '5');
    }
  }, []);

  useEffect(() => {
    const draft = { name, sku, category, selectedSizes, customTextSize, color, stockQty, costPrice, wholesalePrice, wholesaleDiscount, sellingPrice, retailDiscount, lowStockAlert };
    localStorage.setItem('sabay_product_draft', JSON.stringify(draft));
  }, [name, sku, category, selectedSizes, customTextSize, color, stockQty, costPrice, sellingPrice, lowStockAlert]);

  // States សម្រាប់ Array ប៊ូតុង Size & Color (Load ពី localStorage)
  const [availableSizes, setAvailableSizes] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_custom_sizes');
      return saved ? JSON.parse(saved) : ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'];
    }
    return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'];
  });
  const [newSizeInput, setNewSizeInput] = useState('');

  const [availableColors, setAvailableColors] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabay_custom_colors');
      return saved ? JSON.parse(saved) : ['ខ្មៅ (Black)', 'សូកូឡា (Chocolate)', 'ស (White)', 'ប្រផេះ (Grey)', 'ត្នោត (Brown)', 'ខៀវ (Blue)', 'ក្រហម (Red)'];
    }
    return ['ខ្មៅ (Black)', 'សូកូឡា (Chocolate)', 'ស (White)', 'ប្រផេះ (Grey)', 'ត្នោត (Brown)', 'ខៀវ (Blue)', 'ក្រហម (Red)'];
  });
  const [newColorInput, setNewColorInput] = useState('');

  useEffect(() => { localStorage.setItem('sabay_custom_sizes', JSON.stringify(availableSizes)); }, [availableSizes]);
  useEffect(() => { localStorage.setItem('sabay_custom_colors', JSON.stringify(availableColors)); }, [availableColors]);

  // មុខងាររំកិលទីតាំង Size (Reorder Left/Right)
  const moveSize = (index, direction) => {
    const newArray = [...availableSizes];
    if (index + direction >= 0 && index + direction < newArray.length) {
      [newArray[index], newArray[index + direction]] = [newArray[index + direction], newArray[index]];
      setAvailableSizes(newArray);
    }
  };

  // មុខងាររំកិលទីតាំង Color (Reorder Left/Right)
  const moveColor = (index, direction) => {
    const newArray = [...availableColors];
    if (index + direction >= 0 && index + direction < newArray.length) {
      [newArray[index], newArray[index + direction]] = [newArray[index + direction], newArray[index]];
      setAvailableColors(newArray);
    }
  };

  // មុខងារជ្រើសរើស/ដោះជ្រើសរើសពណ៌ច្រើន (Multi-Select Colors)
  const toggleColor = (colVal) => {
    setSelectedColors(prev => {
      const next = prev.includes(colVal) ? prev.filter(c => c !== colVal) : [...prev, colVal];
      setColor(next.join(', '));
      return next;
    });
  };

  // មុខងារជ្រើសរើសរូបភាពច្រើនសន្លឹក (Multi-Image Select)
  const handleImageChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // ⚡ បង្រួមទំហំរូបភាពស្វ័យប្រវត្តិតាម Canvas (កាត់បន្ថយទំហំ MB មកសល់ត្រឹម KB តែគុណភាពច្បាស់ល្អ)
    const processedFiles = await Promise.all(
      selectedFiles.map(async (f) => {
        if (f.type.startsWith('image/')) {
          return await compressMediaFile(f, 1400, 0.84);
        }
        return f;
      })
    );

    const newItems = processedFiles.map((f, i) => ({
      id: `img_${Date.now()}_${i}_${Math.random()}`,
      url: URL.createObjectURL(f),
      file: f,
      isExisting: false,
      sizeKb: Math.round(f.size / 1024)
    }));

    setProductImages(prev => {
      const updated = [...prev, ...newItems];
      return updated;
    });

    if (processedFiles[0]) {
      setFile(processedFiles[0]);
      setPreviewUrl(URL.createObjectURL(processedFiles[0]));
    }
    e.target.value = '';
  };

  const handleRemoveProductImage = (idxToRemove) => {
    setProductImages(prev => prev.filter((_, idx) => idx !== idxToRemove));
    if (selectedCoverIndex === idxToRemove) {
      setSelectedCoverIndex(0);
    } else if (selectedCoverIndex > idxToRemove) {
      setSelectedCoverIndex(prev => prev - 1);
    }
  };

  const handleSetCoverImage = (idx) => {
    setSelectedCoverIndex(idx);
  };

  // មុខងារចុចរើស Size លឿនៗ
  const toggleSize = (sizeVal) => {
    if (selectedSizes.includes(sizeVal)) {
      setSelectedSizes(selectedSizes.filter(s => s !== sizeVal));
    } else {
      setSelectedSizes([...selectedSizes, sizeVal]);
    }
  };

    const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name || !sellingPrice) return alert('សូមបំពេញឈ្មោះ និងតម្លៃលក់ឱ្យបានត្រឹមត្រូវ!');
    setUploading(true); setMessage('');

    try {
      // ១. Upload រូបភាពច្រើនសន្លឹកចូល Supabase Storage
      let uploadedImageUrls = [];
      for (let i = 0; i < productImages.length; i++) {
        const imgItem = productImages[i];
        if (imgItem.file) {
          const ext = imgItem.file.name.split('.').pop() || 'jpg';
          const fileName = `prod_${Date.now()}_${i}_${Math.floor(100 + Math.random() * 900)}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from('products').upload(fileName, imgItem.file);
          if (uploadErr) throw uploadErr;
          const { data: pData } = supabase.storage.from('products').getPublicUrl(fileName);
          uploadedImageUrls.push(pData.publicUrl);
        } else if (imgItem.url) {
          uploadedImageUrls.push(imgItem.url);
        }
      }

      if (uploadedImageUrls.length === 0 && file) {
        const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName);
        uploadedImageUrls.push(publicData.publicUrl);
      } else if (uploadedImageUrls.length === 0 && previewUrl) {
        uploadedImageUrls.push(previewUrl);
      }

      const publicUrl = uploadedImageUrls[selectedCoverIndex] || uploadedImageUrls[0] || previewUrl || '';

      // ⭐️ ១. រៀបចំ Matrix Combinations (បន្សំ Size & Color) យ៉ាងច្បាស់លាស់ ⭐️
      const activeColors = selectedColors.length > 0 
        ? selectedColors 
        : (color ? color.split(',').map(c => c.trim()).filter(Boolean) : []);
      
      let matrixCombinations = [];

      if (selectedSizes.length > 0 && activeColors.length > 0) {
        selectedSizes.forEach(sz => {
          activeColors.forEach(col => {
            const k = `${sz}__${col}`;
            if (!disabledVariants.includes(k)) {
              matrixCombinations.push({
                sku: `${sku || 'SL-1001'}-${sz}-${col}`.replace(/\s+/g, ''),
                size: sz,
                color: col,
                stock_qty: parseInt(variantStock[k]) || 0
              });
            }
          });
        });
      } else if (selectedSizes.length > 0) {
        selectedSizes.forEach(sz => {
          if (!disabledVariants.includes(sz)) {
            matrixCombinations.push({
              sku: `${sku || 'SL-1001'}-${sz}`.replace(/\s+/g, ''),
              size: sz,
              color: '',
              stock_qty: parseInt(variantStock[sz]) || 0
            });
          }
        });
      } else if (activeColors.length > 0) {
        activeColors.forEach(col => {
          if (!disabledVariants.includes(col)) {
            matrixCombinations.push({
              sku: `${sku || 'SL-1001'}-${col}`.replace(/\s+/g, ''),
              size: 'Free Size',
              color: col,
              stock_qty: parseInt(variantStock[col]) || 0
            });
          }
        });
      }

      // ⭐️ ២. គណនាទំហំ (Size) និងចំនួនស្តុកសរុប (Stock Qty) ពិតប្រាកដចេញពី Variant Matrix ⭐️
      let finalSize = '';
      if (selectedSizes.length > 0) {
        finalSize = selectedSizes.join(', ');
      } else if (customTextSize && customTextSize.trim()) {
        finalSize = customTextSize.trim();
      } else {
        finalSize = 'N/A';
      }

      let finalStockQty = 0;
      if (matrixCombinations.length > 0) {
        finalStockQty = matrixCombinations.reduce((sum, c) => sum + (parseInt(c.stock_qty) || 0), 0);
      } else {
        finalStockQty = parseInt(stockQty, 10) || 0;
      }

      // រៀបចំ JSON metadata រក្សាទុករូបភាព និងការបញ្ចុះតម្លៃធានា ១០០% មិនបាត់
      const metaJson = JSON.stringify({
        images: uploadedImageUrls,
        retail_discount: parseFloat(retailDiscount) || 0,
        wholesale_discount: parseFloat(wholesaleDiscount) || 0
      });

      const productData = {
        sku: sku || `SL-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name.trim(),
        category: category.trim(),
        category_name: metaJson,
        size: finalSize,
        color: color,
        stock_qty: finalStockQty,
        cost_price: parseFloat(costPrice) || 0,
        wholesale_price: parseFloat(wholesalePrice) || 0,
        wholesale_discount: parseFloat(wholesaleDiscount) || 0,
        price: parseFloat(sellingPrice) || 0,
        retail_discount: parseFloat(retailDiscount) || 0,
        low_stock_alert: parseInt(lowStockAlert) || 5,
        image_url: publicUrl,
        images: uploadedImageUrls,
        status: finalStockQty > 0 ? 'In Stock' : 'Out of Stock'
      };

      if (editingProductId) {
        // កែប្រែទំនិញដែលមានស្រាប់
        let updatePayload = { ...productData };
        let { error: updateError } = await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', editingProductId);

        if (updateError && (updateError.message?.includes('wholesale_price') || updateError.message?.includes('images') || updateError.message?.includes('discount') || updateError.code === 'PGRST204')) {
          if (updateError.message?.includes('wholesale_price')) delete updatePayload.wholesale_price;
          if (updateError.message?.includes('retail_discount')) delete updatePayload.retail_discount;
          if (updateError.message?.includes('wholesale_discount')) delete updatePayload.wholesale_discount;
          delete updatePayload.images;
          const retry = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', editingProductId);
          updateError = retry.error;
        }

        if (updateError) throw updateError;

        // ⭐️ ធ្វើបច្ចុប្បន្នភាព Variants នៅពេលកែប្រែទំនិញ (Sync Variants on Edit) ⭐️
        try {
          if (matrixCombinations.length > 0) {
            await supabase.from('product_variants').delete().eq('product_id', editingProductId);
            const vPayload = matrixCombinations.map(c => ({
              product_id: editingProductId,
              sku: c.sku,
              size: c.size,
              color: c.color,
              stock_qty: c.stock_qty
            }));
            await supabase.from('product_variants').insert(vPayload);
          }
        } catch (vSyncErr) {
          console.error('Error syncing variants on edit:', vSyncErr);
        }

        setMessage('✅ កែប្រែទំនិញ និងស្តុកជម្រើសជោគជ័យ!');
        setEditingProductId(null);
      } else {
        // ⭐️ ១. បញ្ចូលផលិតផលថ្មីទៅតារាង products
        let insertPayload = { ...productData };
        let { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([insertPayload])
          .select()
          .single();

        if (insertError && (insertError.message?.includes('wholesale_price') || insertError.message?.includes('images') || insertError.code === 'PGRST204')) {
          if (insertError.message?.includes('wholesale_price')) delete insertPayload.wholesale_price;
          delete insertPayload.images;
          const retry = await supabase
            .from('products')
            .insert([insertPayload])
            .select()
            .single();
          newProduct = retry.data;
          insertError = retry.error;
        }

        if (insertError) throw insertError;

        // ⭐️ ២. បញ្ចូល Variants តាម Size & Color នីមួយៗទៅតារាង product_variants ⭐️
        const targetProdId = newProduct.id;

        if (matrixCombinations.length > 0) {
          const variantsPayload = matrixCombinations.map(c => ({
            product_id: targetProdId,
            sku: c.sku,
            size: c.size,
            color: c.color,
            stock_qty: c.stock_qty
          }));

          const { data: insertedVariants, error: varError } = await supabase
            .from('product_variants')
            .insert(variantsPayload)
            .select();

          if (varError) console.error('Error inserting variants:', varError);

          // ⭐️ ៣. កត់ត្រាស្តុកដំបូងចូលតារាង stock_movements (Audit Log)
          if (insertedVariants && insertedVariants.length > 0) {
            const movementLogs = insertedVariants.map(v => ({
              product_id: targetProdId,
              variant_id: v.id,
              type: 'PURCHASE',
              qty_change: v.stock_qty,
              previous_qty: 0,
              new_qty: v.stock_qty,
              reason: 'បញ្ចូលទំនិញថ្មីដំបូង (Initial Stock)'
            }));

            await supabase.from('stock_movements').insert(movementLogs);
          }
        } else if (finalStockQty > 0) {
          await supabase.from('stock_movements').insert([{
            product_id: targetProdId,
            type: 'PURCHASE',
            qty_change: finalStockQty,
            previous_qty: 0,
            new_qty: finalStockQty,
            reason: 'បញ្ចូលទំនិញថ្មីដំបូង (Initial Stock)'
          }]);
        }

        setMessage('🎉 បញ្ចូលទំនិញថ្មី និងកត់ត្រាស្តុកជោគជ័យ!');
        
        let nextSkuVal = 'SL-1001';
        const match = (sku || '').match(/^([A-Za-z0-9]+-?)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const digitsLen = match[2].length;
          const nextVal = parseInt(match[2], 10) + 1;
          nextSkuVal = `${prefix}${nextVal.toString().padStart(digitsLen, '0')}`;
        } else {
          nextSkuVal = computeNextSku(products);
        }
        setSku(nextSkuVal);
        if (typeof window !== 'undefined') {
          localStorage.setItem('sabay_last_saved_sku', nextSkuVal);
          localStorage.setItem('sabay_current_sku', nextSkuVal);
        }
        setDisabledVariants([]);
      }

      localStorage.removeItem('sabay_product_draft'); 
      setFile(null);
      setPreviewUrl(null);
      setProductImages([]);
      setSelectedCoverIndex(0);
      setWholesalePrice('');
      setWholesaleDiscount('');
      setRetailDiscount('');
      fetchProducts();

    } catch (error) {
      setMessage('❌ មានបញ្ហា: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  //⭐️️ State សម្រាប់ដឹងថាប៊ូតុងណាកំពុងត្រូវបានអូស (Drag)⭐️️
  const [draggedSizeIndex, setDraggedSizeIndex] = useState(null);
  const [draggedColorIndex, setDraggedColorIndex] = useState(null);

  // មុខងារអូស Size ប្ដូរទីតាំង
  const handleSizeDragStart = (index) => { setDraggedSizeIndex(index); };
  const handleSizeDragOver = (e, index) => {
    e.preventDefault();
    if (draggedSizeIndex === null || draggedSizeIndex === index) return;
    const newSizes = [...availableSizes];
    const draggedItem = newSizes[draggedSizeIndex];
    newSizes.splice(draggedSizeIndex, 1);
    newSizes.splice(index, 0, draggedItem);
    setDraggedSizeIndex(index);
    setAvailableSizes(newSizes);
  };
  const handleSizeDragEnd = () => { setDraggedSizeIndex(null); };

  // មុខងារអូស Color ប្ដូរទីតាំង
  const handleColorDragStart = (index) => { setDraggedColorIndex(index); };
  const handleColorDragOver = (e, index) => {
    e.preventDefault();
    if (draggedColorIndex === null || draggedColorIndex === index) return;
    const newColors = [...availableColors];
    const draggedItem = newColors[draggedColorIndex];
    newColors.splice(draggedColorIndex, 1);
    newColors.splice(index, 0, draggedItem);
    setDraggedColorIndex(index);
    setAvailableColors(newColors);
  };
  const handleColorDragEnd = () => { setDraggedColorIndex(null); };
  

  // ⭐ ផ្ទាំង UploadView (រចនាស្ដង់ដារដូចគ្នា 100% សម្រាប់ទាំង Upload និង Edit) ⭐️
  const UploadView = () => (
    <div className="animate-in fade-in max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-xl border border-gray-100 mb-10">
      <div className="mb-8 border-b border-gray-100 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900">
            {editingProductId ? '✏️ កែប្រែព័ត៌មានទំនិញក្នុងស្តុក (Edit Product)' : '📤 បញ្ចូលទំនិញថ្មីចូលស្តុក (Customizable Setup)'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {editingProductId ? 'កំពុងកែប្រែទំនិញដែលមានស្រាប់ក្នុងប្រព័ន្ធ' : 'អាចបន្ថែម និងលុប Size ឬ Color បានដោយសេរី រក្សាទុកស្វ័យប្រវត្តិមិនបាត់ពេល Refresh'}
          </p>
        </div>
        {editingProductId && (
          <span className="bg-orange-100 text-orange-700 font-black text-xs px-4 py-2 rounded-xl border border-orange-200">
             đang Mode Edit
          </span>
        )}
      </div>

      {/* ⭐️ FLOATING TOAST ALERT (ជាប់អេក្រង់ជានិច្ច មិនបាច់រមូរឡើងលើ) ⭐️ */}
      {message && (
        <div className="fixed top-8 right-8 z-[9999] max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-md border-2 ${
            message.includes('ជោគជ័យ') || message.includes('✅') || message.includes('🎉')
              ? 'bg-emerald-950/90 text-white border-emerald-500/80 shadow-emerald-500/20'
              : 'bg-rose-950/90 text-white border-rose-500/80 shadow-rose-500/20'
          }`}>
            <span className="text-2xl shrink-0">
              {message.includes('ជោគជ័យ') || message.includes('✅') || message.includes('🎉') ? '🎉' : '⚠️'}
            </span>
            <div className="flex-1">
              <p className="text-sm font-black tracking-wide leading-snug">{message}</p>
              <p className="text-[10px] text-white/70 mt-0.5">ព័ត៌មានត្រូវបានកត់ត្រាចូលប្រព័ន្ធដោយជោគជ័យ</p>
            </div>
            <button 
              type="button" 
              onClick={() => setMessage('')} 
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs font-bold transition shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveProduct} className="space-y-8">
        
        {/* ១. ព័ត៌មានមូលដ្ឋាន */}
        <div>
          <h3 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">📦 ១. ព័ត៌មានមូលដ្ឋាន (Basic Information)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">ឈ្មោះទំនិញ (Product Name) *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="ឧ. ស្បែកជើង ឬកាបូបប្រេនស្អាត" 
                required 
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-medium focus:border-blue-500 outline-none transition bg-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">លេខកូដ SKU / បាកូដ</label>
              <input 
                type="text" 
                value={sku} 
                onChange={(e) => {
                  setSku(e.target.value);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('sabay_current_sku', e.target.value);
                    localStorage.setItem('sabay_last_saved_sku', e.target.value);
                  }
                }} 
                placeholder="SL-XXXX" 
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold bg-gray-50 focus:border-blue-500 outline-none transition" 
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">ប្រភេទផលិតផល (Category)</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold bg-white focus:border-blue-500 outline-none transition"
              >
                {categories.length === 0 ? (
                  <option value="ស្បែកជើង">ស្បែកជើង (Shoes)</option>
                ) : (
                  categories.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)
                )}
              </select>
            </div>
          </div>
        </div>

        {/* ២. ទំហំ និងពណ៌ */}
        <div>
          <h3 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">🎨 ២. ទំហំ និងពណ៌ (Size & Color Attributes)</h3>
          
          <div className="space-y-6 bg-gray-50 p-6 rounded-3xl border border-gray-200">
            
            {category.includes('ស្បែកជើង') ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">ទំហំស្បែកជើង (អូសដើម្បីប្ដូរទីតាំង / យក Mouse ထားលើដើម្បីលុប)</label>
                <div className="flex flex-wrap gap-2.5 mb-3">
                  {availableSizes.map((sz, idx) => (
                    <div 
                      key={sz} 
                      draggable
                      onDragStart={() => handleSizeDragStart(idx)}
                      onDragOver={(e) => handleSizeDragOver(e, idx)}
                      onDragEnd={handleSizeDragEnd}
                      className="relative inline-flex items-center cursor-grab active:cursor-grabbing group"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSize(sz)}
                        className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all border-2 flex items-center gap-1.5 ${
                          selectedSizes.includes(sz)
                            ? 'bg-[#ff6a00] text-white border-[#ff6a00] shadow-md scale-105'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <span>{sz}</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`តើអ្នកពិតជាចង់លុបទំហំ [${sz}] នេះមែនទេ?`)) {
                            setAvailableSizes(availableSizes.filter(s => s !== sz));
                            setSelectedSizes(selectedSizes.filter(s => s !== sz));
                          }
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                        title="លុប Size នេះ"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 max-w-xs mt-3">
                  <input 
                    type="text" 
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    placeholder="បន្ថែមទំហំថ្មី (ឧ. 49)" 
                    className="flex-1 border border-gray-300 px-3 py-2 rounded-xl text-xs bg-white outline-none focus:border-orange-500"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newSizeInput.trim() && !availableSizes.includes(newSizeInput.trim())) {
                        setAvailableSizes([...availableSizes, newSizeInput.trim()]);
                        setSelectedSizes([...selectedSizes, newSizeInput.trim()]);
                        setNewSizeInput('');
                      }
                    }}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                  >
                    + បន្ថែម Size
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">ទំហំដែលបានរើសរួច: <span className="font-bold text-[#ff6a00]">{selectedSizes.join(', ') || 'មិនទាន់រើស'}</span></p>
              </div>
            ) : category.includes('សម្លៀកបំពាក់') || category.includes('ខោអាវ') ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">ទំហំសម្លៀកបំពាក់ (Clothing Size)</label>
                <input 
                  type="text" 
                  value={customTextSize}
                  onChange={(e) => setCustomTextSize(e.target.value)}
                  placeholder="ឧ. S, M, L, XL, XXL ឬ Free Size" 
                  className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-medium bg-white focus:border-blue-500 outline-none transition" 
                />
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-2xl text-blue-700 text-xs font-bold">
                ℹ️ មុខទំនិញប្រភេទ "{category}" នេះ មិនចាំបាច់កំណត់ទំហំ (Size) ទេ។
              </div>
            )}

            {/* រើសពណ៌ */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">ពណ៌ផលិតផល (អូសដើម្បីប្ដូរទីតាំង / យក Mouse ထားលើដើម្បីលុប)</label>
              <div className="flex flex-wrap gap-2.5 mb-3">
                {availableColors.map((col, idx) => (
                  <div 
                    key={col} 
                    draggable
                    onDragStart={() => handleColorDragStart(idx)}
                    onDragOver={(e) => handleColorDragOver(e, idx)}
                    onDragEnd={handleColorDragEnd}
                    className="relative inline-flex items-center cursor-grab active:cursor-grabbing group"
                  >
                    <button
                      type="button"
                      onClick={() => toggleColor(col)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                        selectedColors.includes(col) || color === col
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-400/40 scale-102'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {(selectedColors.includes(col) || color === col) && <span className="text-emerald-400 font-black">✓</span>}
                      <span>{col}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`តើអ្នកពិតជាចង់លុបពណ៌ [${col}] នេះមែនទេ?`)) {
                          setAvailableColors(availableColors.filter(c => c !== col));
                          if (color === col) setColor('');
                        }
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                      title="លុប Color នេះ"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                <div className="flex gap-2 max-w-sm">
                  <input 
                    type="text" 
                    value={newColorInput}
                    onChange={(e) => setNewColorInput(e.target.value)}
                    placeholder="បន្ថែមពណ៌ថ្មី (ឧ. ទឹកក្រូច)" 
                    className="flex-1 border border-gray-300 px-3 py-2 rounded-xl text-xs bg-white outline-none focus:border-slate-900"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newColorInput.trim() && !availableColors.includes(newColorInput.trim())) {
                        const trimmed = newColorInput.trim();
                        setAvailableColors([...availableColors, trimmed]);
                        toggleColor(trimmed);
                        setNewColorInput('');
                      }
                    }}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                  >
                    + បន្ថែម Color
                  </button>
                </div>

                {selectedColors.length > 0 && (
                  <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                    ពណ៌បានជ្រើសរើស ({selectedColors.length}): <span className="text-[#ff6a00] font-black">{selectedColors.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ៣. ស្តុក និងតម្លៃ */}
        <div>
          <h3 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">💰 ៣. ស្តុក និងតម្លៃ (Stock & Pricing)</h3>
          
          {/* ⭐️ កំណត់ចំនួនស្តុកដាច់ដោយឡែកតាម SIZE & COLOR (VARIANT MATRIX) ⭐️ */}
          {(() => {
            // បង្កើតបញ្ជីជម្រើសបន្សំ (Combinations of Size x Color)
            let variantMatrix = [];
            const activeColors = selectedColors.length > 0 ? selectedColors : (color ? [color] : []);

            if (selectedSizes.length > 0 && activeColors.length > 0) {
              selectedSizes.forEach(sz => {
                activeColors.forEach(col => {
                  variantMatrix.push({
                    key: `${sz}__${col}`,
                    label: `Size ${sz} + ${col}`,
                    sublabel: col,
                    badge: `Size ${sz}`,
                    size: sz,
                    color: col
                  });
                });
              });
            } else if (selectedSizes.length > 0) {
              selectedSizes.forEach(sz => {
                variantMatrix.push({
                  key: sz,
                  label: `Size ${sz}`,
                  badge: `Size ${sz}`,
                  size: sz,
                  color: ''
                });
              });
            } else if (activeColors.length > 0) {
              activeColors.forEach(col => {
                variantMatrix.push({
                  key: col,
                  label: `ពណ៌ ${col}`,
                  badge: col,
                  size: 'Free Size',
                  color: col
                });
              });
            }

            if (variantMatrix.length === 0) return null;

            // ត្រងយកតែបន្សំដែលមិនទាន់ត្រូវបានលុបចេញ (Active Combinations)
            const visibleMatrix = variantMatrix.filter(item => !disabledVariants.includes(item.key));

            // គណនាសរុបស្តុកស្វ័យប្រវត្តិតែលើបន្សំដែលនៅសល់
            const matrixTotal = visibleMatrix.reduce((sum, item) => sum + (parseInt(variantStock[item.key]) || 0), 0);

            return (
              <div className="mb-6 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-5 rounded-3xl border-2 border-blue-200/90 shadow-sm animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-blue-200/70">
                  <div>
                    <h4 className="text-xs font-black text-blue-900 uppercase flex items-center gap-2">
                      <span>📦</span> កំណត់ចំនួនស្តុកតាមទំហំ & ពណ៌ដាច់ដោយឡែក (Stock per Size & Color)
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-gray-500 font-bold">
                        {selectedSizes.length > 0 && activeColors.length > 0 
                          ? `នៅសល់ ${visibleMatrix.length} នៃ ${variantMatrix.length} ជម្រើសបន្សំ (${selectedSizes.length} Sizes × ${activeColors.length} Colors)`
                          : `នៅសល់ ${visibleMatrix.length} នៃ ${variantMatrix.length} ជម្រើស`}
                      </p>
                      {disabledVariants.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDisabledVariants([]);
                            const restoredTotal = variantMatrix.reduce((sum, itm) => sum + (parseInt(variantStock[itm.key]) || 0), 0);
                            setStockQty(restoredTotal.toString());
                          }}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-lg transition flex items-center gap-1 border border-red-200 cursor-pointer shadow-2xs"
                        >
                          <span>↺</span> ស្ដារជម្រើសដែលបានលុប (${disabledVariants.length})
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600">ស្តុកសរុបស្វ័យប្រវត្តិ៖</span>
                    <span className="text-xl font-black text-blue-700 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-2xs">
                      {matrixTotal} <span className="text-xs text-gray-500">គូ/មុខ</span>
                    </span>
                  </div>
                </div>

                {visibleMatrix.length === 0 ? (
                  <div className="text-center py-6 bg-white/70 rounded-2xl border border-dashed border-gray-300">
                    <p className="text-xs font-bold text-gray-400">អ្នកបានលុបជម្រើសបន្សំទាំងអស់ចេញហើយ</p>
                    <button
                      type="button"
                      onClick={() => setDisabledVariants([])}
                      className="mt-2 text-xs font-black text-blue-600 hover:underline cursor-pointer"
                    >
                      + ស្ដារជម្រើសបន្សំឡើងវិញ
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {visibleMatrix.map(item => (
                      <div 
                        key={item.key} 
                        className="relative group bg-white border-2 border-blue-100 hover:border-blue-400 rounded-2xl p-2.5 pt-3 flex flex-col items-center shadow-xs transition"
                      >
                        {/* ប៊ូតុងលុបជម្រើសបន្សំនេះចោល */}
                        <button
                          type="button"
                          title="លុបជម្រើសបន្សំនេះចោល (Delete combination)"
                          onClick={() => {
                            setDisabledVariants(prev => [...prev, item.key]);
                            setVariantStock(prev => {
                              const updated = { ...prev };
                              delete updated[item.key];
                              const newTotal = visibleMatrix
                                .filter(itm => itm.key !== item.key)
                                .reduce((sum, itm) => sum + (parseInt(updated[itm.key]) || 0), 0);
                              setStockQty(newTotal.toString());
                              return updated;
                            });
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-600 text-red-600 hover:text-white flex items-center justify-center text-xs font-black shadow-xs transition cursor-pointer z-10 border border-red-200"
                        >
                          ✕
                        </button>

                        <span className="text-[11px] font-black text-blue-950 text-center line-clamp-1 mb-0.5" title={item.label}>
                          {item.badge}
                        </span>
                        {item.sublabel && (
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 truncate max-w-full">
                            {item.sublabel}
                          </span>
                        )}
                        <input 
                          type="number" 
                          min="0"
                          value={variantStock[item.key] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariantStock(prev => {
                              const updated = { ...prev, [item.key]: val };
                              const newTotal = visibleMatrix.reduce((sum, itm) => sum + (parseInt(updated[itm.key]) || 0), 0);
                              setStockQty(newTotal.toString());
                              return updated;
                            });
                          }}
                          placeholder="0"
                          className="w-full text-center border-2 border-gray-100 rounded-xl p-2 text-sm font-black focus:border-[#ff6a00] outline-none text-blue-700 bg-gray-50 focus:bg-white transition"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="space-y-4">
            {/* ជួរទី ១: ស្តុក & តម្លៃដើម */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(() => {
                const activeCols = selectedColors.length > 0 ? selectedColors : (color ? color.split(',').map(c => c.trim()).filter(Boolean) : []);
                const hasMatrixActive = selectedSizes.length > 0 || activeCols.length > 0;
                
                let autoMatrixTotal = 0;
                if (selectedSizes.length > 0 && activeCols.length > 0) {
                  selectedSizes.forEach(sz => {
                    activeCols.forEach(col => {
                      const k = `${sz}__${col}`;
                      if (!disabledVariants.includes(k)) {
                        autoMatrixTotal += (parseInt(variantStock[k]) || 0);
                      }
                    });
                  });
                } else if (selectedSizes.length > 0) {
                  selectedSizes.forEach(sz => {
                    if (!disabledVariants.includes(sz)) {
                      autoMatrixTotal += (parseInt(variantStock[sz]) || 0);
                    }
                  });
                } else if (activeCols.length > 0) {
                  activeCols.forEach(col => {
                    if (!disabledVariants.includes(col)) {
                      autoMatrixTotal += (parseInt(variantStock[col]) || 0);
                    }
                  });
                }

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase">
                        ចំនួនស្តុកសរុប (Total Stock)
                      </label>
                      {hasMatrixActive && (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          ⚡ គណនាស្វ័យប្រវត្តិ (${autoMatrixTotal})
                        </span>
                      )}
                    </div>
                    <input 
                      type="number" 
                      value={hasMatrixActive ? autoMatrixTotal : stockQty} 
                      onChange={(e) => {
                        if (!hasMatrixActive) setStockQty(e.target.value);
                      }} 
                      readOnly={hasMatrixActive}
                      min="0" 
                      required 
                      className={`w-full border-2 p-3.5 rounded-2xl text-sm font-bold outline-none transition shadow-2xs ${
                        hasMatrixActive 
                          ? 'bg-blue-50/60 border-blue-200 text-blue-900 font-black cursor-not-allowed' 
                          : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                      }`} 
                    />
                  </div>
                );
              })()}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">តម្លៃដើមទុន ($) (Cost Price)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={costPrice} 
                  onChange={(e) => setCostPrice(e.target.value)} 
                  placeholder="0.00" 
                  className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition bg-white shadow-2xs" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">កម្រិតស្តុកដាស់តឿន (Low Stock Alert)</label>
                <input 
                  type="number" 
                  value={lowStockAlert} 
                  onChange={(e) => setLowStockAlert(e.target.value)} 
                  min="1" 
                  className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold text-orange-600 focus:border-blue-500 outline-none transition bg-white shadow-2xs" 
                />
              </div>
            </div>

            {/* ជួរទី ២: បែងចែកផ្នែក «តម្លៃលក់រាយ» និង «តម្លៃបោះដុំ» ជាមួយកន្លែងបញ្ចុះតម្លៃ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 🏷️ ផ្នែកលក់រាយ (Retail Pricing & Discount) */}
              <div className="p-4 bg-emerald-50/60 rounded-3xl border-2 border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5 uppercase">
                    <span>🏷️</span> តម្លៃលក់រាយ (Retail Pricing)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    លក់ចេញពិត: ${(Math.max(0, (parseFloat(sellingPrice) || 0) - (parseFloat(retailDiscount) || 0))).toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">តម្លៃលក់រាយពេញ ($) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={sellingPrice} 
                      onChange={(e) => setSellingPrice(e.target.value)} 
                      placeholder="0.00" 
                      required 
                      className="w-full border-2 border-emerald-200 bg-white p-3 rounded-2xl text-sm font-black text-emerald-700 focus:border-emerald-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">បញ្ចុះតម្លៃលក់រាយ ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={retailDiscount} 
                      onChange={(e) => setRetailDiscount(e.target.value)} 
                      placeholder="ឧ. 2.00 (ចុះ $2)" 
                      className="w-full border-2 border-emerald-200 bg-white p-3 rounded-2xl text-sm font-black text-red-600 focus:border-emerald-500 outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* 📦 ផ្នែកបោះដុំ (Wholesale Pricing & Discount) */}
              <div className="p-4 bg-blue-50/60 rounded-3xl border-2 border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <span className="text-xs font-black text-blue-900 flex items-center gap-1.5 uppercase">
                    <span>📦</span> តម្លៃបោះដុំ (Wholesale Pricing)
                  </span>
                  <span className="text-[11px] font-bold text-blue-700">
                    បោះដុំពិត: ${(Math.max(0, (parseFloat(wholesalePrice) || 0) - (parseFloat(wholesaleDiscount) || 0))).toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">តម្លៃបោះដុំពេញ ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={wholesalePrice} 
                      onChange={(e) => setWholesalePrice(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full border-2 border-blue-200 bg-white p-3 rounded-2xl text-sm font-black text-blue-700 focus:border-blue-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">បញ្ចុះតម្លៃបោះដុំ ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={wholesaleDiscount} 
                      onChange={(e) => setWholesaleDiscount(e.target.value)} 
                      placeholder="ឧ. 1.50 (ចុះ $1.5)" 
                      className="w-full border-2 border-blue-200 bg-white p-3 rounded-2xl text-sm font-black text-red-600 focus:border-blue-500 outline-none" 
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ៤. រូបភាពច្រើនសន្លឹក (Multi-Image Gallery Upload) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
              🖼️️ ៤. រូបភាពផលិតផលច្រើនសន្លឹក (Product Images Gallery)
            </h3>
            <span className="text-xs font-bold text-gray-400">
              បានជ្រើសរើស ({productImages.length}) សន្លឹក
            </span>
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 space-y-4">
            {/* Upload Area / Dropzone */}
            <label className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center group">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
              <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-2 transition">
                📸
              </div>
              <p className="font-black text-sm text-gray-800">
                ចុចទីនេះ ដើម្បីជ្រើសរើសរូបភាព (អាចរើសបានច្រើនក្នុងពេលតែមួយ)
              </p>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                ⚡ ប្រព័ន្ធនឹងបង្រួមទំហំ (Compress) ស្វ័យប្រវត្តិដើម្បីឱ្យ Upload លឿន និងមិនស៊ីទំហំផ្ទុក
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ជ្រើសរើសរូបភាពខាងមុខ ខាងចំហៀង បាតស្បែកជើង ឬពេលពាក់ (JPG, PNG, WEBP)
              </p>
            </label>

            {/* Images Gallery Grid */}
            {productImages.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2.5 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>ចុចលើប៊ូតុង <span className="text-[#ff6a00] font-black">«★ រូបចម្បង»</span> ដើម្បីកំណត់រូបណាដែលត្រូវបង្ហាញនៅខាងមុខគេ</span>
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {productImages.map((img, idx) => {
                    const isCover = idx === selectedCoverIndex;

                    return (
                      <div 
                        key={img.id || idx}
                        className={`relative group bg-white rounded-2xl border-2 overflow-hidden shadow-xs transition ${
                          isCover ? 'border-[#ff6a00] ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="aspect-square bg-gray-100">
                          <img src={img.url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>

                        {/* Top Badges */}
                        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between">
                          {isCover ? (
                            <span className="bg-[#ff6a00] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                              ★ ចម្បង
                            </span>
                          ) : (
                            <span className="bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                              #${idx + 1}
                            </span>
                          )}

                          <button 
                            type="button"
                            onClick={() => handleRemoveProductImage(idx)}
                            className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                            title="លុបរូបនេះចេញ"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Bottom action: Set as Cover */}
                        {!isCover && (
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(idx)}
                            className="w-full bg-gray-900/80 hover:bg-[#ff6a00] text-white text-[10px] font-bold py-1 text-center transition"
                          >
                            ដាក់ជារូបចម្បង
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ⭐️ Submit & Cancel Edit Buttons ⭐️ */}
        <div className="flex gap-4">
          {editingProductId && (
            <button 
              type="button" 
              onClick={() => {
                setEditingProductId(null);
                setName('');
                const nextSkuAfterReset = computeNextSku(products);
                setSku(nextSkuAfterReset);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('sabay_current_sku', nextSkuAfterReset);
                  localStorage.setItem('sabay_last_saved_sku', nextSkuAfterReset);
                }
                setSellingPrice('');
                setCostPrice('');
                setStockQty('10');
                setColor('');
                setSelectedSizes([]);
                  setSelectedColors([]);
                  setVariantStock({});
                setPreviewUrl(null);
                setFile(null);
                setProductImages([]);
                setSelectedCoverIndex(0);
              }}
              className="w-1/3 bg-gray-200 text-gray-700 py-4 rounded-2xl font-black text-lg hover:bg-gray-300 transition-all"
            >
              បោះបង់ការកែប្រែ
            </button>
          )}

          <button 
            type="submit" 
            disabled={uploading} 
            className={`${editingProductId ? 'w-2/3' : 'w-full'} bg-[#ff6a00] text-white py-4 rounded-2xl font-black text-lg shadow-[0_10px_20px_-10px_rgba(255,106,0,0.5)] hover:bg-[#e65c00] transition-all disabled:bg-gray-300`}
          >
            {uploading ? 'កំពុងរក្សាទុក...' : (editingProductId ? '💾 រក្សាទុកការកែប្រែ (Update Product)' : '💾 រក្សាទុកទំនិញថ្មី (Save Product)')}
          </button>
        </div>

      </form>
    </div>
  );

  // ================= ផ្នែក Category Management (មានប៊ូតុង Edit & Delete) =================
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('shoe');
  const [catMessage, setCatMessage] = useState('');
  
  // State សម្រាប់ដឹងថា កំពុង Edit មួយណា
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatIcon, setEditingCatIcon] = useState('');

  const quickIcons = [
    { id: 'shoe', label: 'ស្បែកជើង', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.2 14.3l-2.6-6.5a2 2 0 00-1.9-1.3H11l-3 3-4.5 1A2 2 0 002 12.5v3A2.5 2.5 0 004.5 18h13a2.5 2.5 0 002.5-2.5 2.5 2.5 0 00.2-1.2z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M2 14.5h18.5"></path><path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5l-4-1.5"></path></svg> },
    { id: 'heel', label: 'ស្បែកជើងកែង', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-3-7a2 2 0 00-1.8-1.2H12l-4 3-3 1.5A2 2 0 003.5 14L4 18h16.5a1 1 0 00.5-2zM15 8l2 8M6 18v3"></path></svg> },
    { id: 'watch', label: 'នាឡិកា', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><rect x="7" y="5" width="10" height="14" rx="3" ry="3"></rect><path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6M9 22h6M17 12h1.5M12 9v3l1.5 1.5"></path></svg> },
    { id: 'bag', label: 'កាបូប', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2"></path><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h.01M15 14h.01"></path></svg> },
    { id: 'belt', label: 'ខ្សែក្រវ៉ាត់', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 10c-1-3-4-4-7-4S5 7 5 10c0 2.5 2 4 5 4s5-1.5 5-4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M5 10v4c0 3 3 4 7 4s7-1 7-4v-4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M12 10a2 2 0 100-4 2 2 0 000 4z"></path></svg> },
    { id: 'shirt', label: 'សម្លៀកបំពាក់', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 1.89v1.15a2 2 0 001.62 1.96l1.38.23V20a2 2 0 002 2h11a2 2 0 002-2V8.69l1.38-.23a2 2 0 001.62-1.96V5.35a2 2 0 00-1.34-1.89z"></path></svg> },
    { id: 'glasses', label: 'វ៉ែនតា', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 14h3a3 3 0 003-3V9m6 5h3a3 3 0 003-3V9m-6 3a3 3 0 100-6 3 3 0 000 6zm-9 0a3 3 0 100-6 3 3 0 000 6z"></path></svg> },
    { id: 'hat', label: 'មួក', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4a7 7 0 00-7 7c0 2 1 3.5 2 4.5h10c1-1 2-2.5 2-4.5a7 7 0 00-7-7zM3 16h18a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg> },
    { id: 'perfume', label: 'ទឹកអប់', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 2h4M12 2v4m-5 4h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2z"></path></svg> },
    { id: 'ring', label: 'គ្រឿងអលង្ការ', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8a6 6 0 100 12 6 6 0 000-12zm0-4l2.5 3h-5L12 4z"></path></svg> },
    { id: 'tag', label: 'បញ្ចុះតម្លៃ', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M4.93 4.93a10 10 0 0114.14 0l1.41 1.41a2 2 0 010 2.83L11 18.66a2 2 0 01-2.83 0L3.52 14.01a2 2 0 010-2.83l1.41-1.41a10 10 0 010-4.84z"></path></svg> },
    { id: 'box', label: 'ប្រអប់ទំនិញ', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg> }
  ];

    // មុខងាររំកិលលំដាប់ Category ឡើងលើ / ចុះក្រោម
  const moveCategoryOrder = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;
    setCategories(newCats);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_categories_cache', JSON.stringify(newCats));
      window.dispatchEvent(new Event('storage'));
    }
  };

  async function fetchCategoriesFromDB() {
    const { data, error } = await supabase.from('categories').select('*');
    if (!error && data) {
      setCategories(data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sabay_categories_cache', JSON.stringify(data));
        window.dispatchEvent(new Event('storage'));
      }
    }
  }

  useEffect(() => {
    fetchCategoriesFromDB();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatMessage('⏳ កំពុងបញ្ចូល...');

    try {
      const { error } = await supabase.from('categories').insert([
        { name: newCatName.trim(), icon: newCatIcon }
      ]);
      if (error) throw error;
      setCatMessage('🎉 បង្កើតប្រភេទផលិតផលជោគជ័យ!');
      setNewCatName('');
      setNewCatIcon('shoe');
      fetchCategoriesFromDB();
    } catch (err) {
      setCatMessage('❌ មានបញ្ហា: ' + err.message);
    }
  };

  const handleDeleteCategory = async (catItem) => {
    const catId = catItem.id;
    const catName = catItem.name;
    const productCount = products.filter(p => (p.category || '').trim().toLowerCase() === (catName || '').trim().toLowerCase()).length;
    
    let confirmMsg = `តើបងពិតជាចង់លុបប្រភេទ "${catName}" មែនទេ?`;
    if (productCount > 0) {
      confirmMsg = `⚠️ ប្រភេទ "${catName}" មានទំនិញចំនួន ${productCount} កំពុងប្រើប្រាស់! ប្រសិនបើបងលុប ផលិតផលទាំងនោះអាចនឹងគ្មានប្រភេទ។ តើបងពិតជាចង់លុបមែនទេ?`;
    }

    if (window.confirm(confirmMsg)) {
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (!error) {
        setCatMessage(`✅ បានលុបប្រភេទ "${catName}" ដោយជោគជ័យ!`);
        setTimeout(() => setCatMessage(''), 3000);
        fetchCategoriesFromDB();
      } else {
        alert('❌ មិនអាចលុបបានទេ: ' + error.message);
      }
    }
  };

  // State សម្រាប់អូសប្ដូរទីតាំង Categories (Drag & Drop)
  const [draggedCatIndex, setDraggedCatIndex] = useState(null);

  const handleCatDragStart = (index) => { setDraggedCatIndex(index); };
  const handleCatDragOver = (e, index) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === index) return;
    const newCats = [...categories];
    const draggedItem = newCats[draggedCatIndex];
    newCats.splice(draggedCatIndex, 1);
    newCats.splice(index, 0, draggedItem);
    setDraggedCatIndex(index);
    setCategories(newCats);
  };
  const handleCatDragEnd = () => { setDraggedCatIndex(null); };

  // មុខងារ Update Category (ទាំងឈ្មោះ និង Icon)
  const handleUpdateCategory = async (id) => {
    if (!editingCatName.trim()) return;
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editingCatName.trim(), icon: editingCatIcon })
        .eq('id', id);

      if (error) throw error;
      setCatMessage('✅ កែប្រែប្រភេទផលិតផល និង Icon ជោគជ័យ!');
      setEditingCategoryId(null);
      fetchCategoriesFromDB();
    } catch (err) {
      alert('❌ មិនអាចកែប្រែបានទេ: ' + err.message);
    }
  };

  const CategoryView = () => {
    // គណនាទិន្នន័យស្ថិតិប្រភេទ
    const totalCatCount = categories.length;
    const totalProdCount = products.length;

    return (
      <div className="animate-in fade-in max-w-5xl mx-auto pb-16 space-y-6">
        
        {/* Header & Stats Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl text-xl shadow-md shadow-blue-500/20">
              🏷️
            </span>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                គ្រប់គ្រងប្រភេទផលិតផល <span className="text-xs font-black bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full uppercase">Standard Categories</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                កែប្រែឈ្មោះ, ជ្រើសរើស Icon SVG ស្តង់ដារ និងរៀបចំលំដាប់លំដោយសម្រាប់បង្ហាញលើទំព័រមុខហាង
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 text-center">
              <span className="text-[10px] font-bold text-blue-600 uppercase">ប្រភេទសរុប</span>
              <p className="text-lg font-black text-blue-900 leading-tight">{totalCatCount}</p>
            </div>
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">ទំនិញសរុប</span>
              <p className="text-lg font-black text-emerald-900 leading-tight">{totalProdCount}</p>
            </div>
          </div>
        </div>

        {catMessage && (
          <div className={`p-4 rounded-2xl font-black text-xs flex items-center gap-2 animate-in fade-in ${catMessage.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            <span>{catMessage.includes('❌') ? '⚠️' : '✅'}</span> {catMessage}
          </div>
        )}

        {/* Form បន្ថែម Category ថ្មី (Full Option Card) */}
        <form onSubmit={handleAddCategory} className="bg-white p-7 rounded-3xl border border-gray-200/90 shadow-sm space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span>✨</span> ១. ជ្រើសរើសរូបសញ្ញា Icon SVG ស្តង់ដារ (Category SVG Icon)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Icon នេះនឹងយកទៅបង្ហាញលើ Sidebar និង Mobile Bar នៅទំព័រមុខហាងស្វ័យប្រវត្តិ</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                បានជ្រើសរើស៖ {quickIcons.find(q => q.id === newCatIcon)?.label || 'ស្បែកជើង'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2.5">
              {quickIcons.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setNewCatIcon(item.id)}
                  className={`p-2.5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 font-bold text-xs cursor-pointer ${
                    newCatIcon === item.id 
                      ? 'border-blue-600 bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-105' 
                      : 'border-gray-200 bg-gray-50/70 hover:bg-white hover:border-blue-300 text-gray-700'
                  }`}
                >
                  <div className="scale-110">{item.svg}</div>
                  <span className="text-[10px] truncate max-w-full font-black mt-0.5">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">២. ឈ្មោះប្រភេទផលិតផលថ្មី (Category Name)</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={newCatName} 
                onChange={(e) => setNewCatName(e.target.value)} 
                placeholder="ឧ. ស្បែកជើងបុរស, ស្បែកជើងកែងនារី, កាបូបយួរ..." 
                required 
                className="flex-1 border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none bg-white transition"
              />
              <button 
                type="submit" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs shadow-lg shadow-blue-600/30 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span>➕</span> បន្ថែមប្រភេទថ្មី
              </button>
            </div>
          </div>
        </form>

        {/* តារាងបង្ហាញបញ្ជី Categories (Drag / Move Up / Down & Edit) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/90 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-sm text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <span>📋</span> បញ្ជីប្រភេទផលិតផលដែលមានស្រាប់ ({categories.length})
            </h3>
            <span className="text-[11px] text-gray-400 font-bold hidden sm:inline">
              (អាចចុច ▲ / ▼ ឬអូស Drag ដើម្បីរៀបលំដាប់លើមុខហាង)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase font-black">
                <tr>
                  <th className="px-5 py-4 w-28 text-center">លំដាប់ (Sort)</th>
                  <th className="px-5 py-4 w-24 text-center">Icon SVG</th>
                  <th className="px-5 py-4">ឈ្មោះប្រភេទ (Category Name)</th>
                  <th className="px-5 py-4 text-center">ចំនួនទំនិញក្នុងស្តុក</th>
                  <th className="px-5 py-4 text-right pr-6">សកម្មភាព (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-gray-400 font-bold">
                      មិនទាន់មានប្រភេទផលិតផលទេ។ សូមបន្ថែមនៅផ្នែកខាងលើ!
                    </td>
                  </tr>
                ) : (
                  categories.map((cat, idx) => {
                    const isEditing = editingCategoryId === cat.id;
                    const activeIconId = isEditing ? editingCatIcon : (cat.icon || 'shoe');
                    const matched = quickIcons.find(i => i.id === activeIconId);
                    const displayIcon = matched ? matched.svg : quickIcons[0].svg;
                    const pCount = products.filter(p => (p.category || '').trim().toLowerCase() === (cat.name || '').trim().toLowerCase()).length;

                    return (
                      <tr 
                        key={cat.id || idx} 
                        draggable
                        onDragStart={() => handleCatDragStart(idx)}
                        onDragOver={(e) => handleCatDragOver(e, idx)}
                        onDragEnd={handleCatDragEnd}
                        className="hover:bg-gray-50/70 transition"
                      >
                        {/* ប៊ូតុងរំកិលលំដាប់ Up / Down */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveCategoryOrder(idx, -1)}
                              title="រំកិលឡើងលើ"
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs transition cursor-pointer"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === categories.length - 1}
                              onClick={() => moveCategoryOrder(idx, 1)}
                              title="រំកិលចុះក្រោម"
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs transition cursor-pointer"
                            >
                              ▼
                            </button>
                          </div>
                        </td>

                        {/* Icon SVG */}
                        <td className="px-5 py-4 text-center">
                          {isEditing ? (
                            <select 
                              value={editingCatIcon} 
                              onChange={(e) => setEditingCatIcon(e.target.value)}
                              className="border-2 border-blue-500 rounded-xl p-1.5 text-xs font-bold outline-none bg-white shadow-xs"
                            >
                              {quickIcons.map(qi => (
                                <option key={qi.id} value={qi.id}>{qi.label}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                              {displayIcon}
                            </div>
                          )}
                        </td>

                        {/* ឈ្មោះប្រភេទ */}
                        <td className="px-5 py-4 font-black text-gray-800 text-sm">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={editingCatName} 
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="border-2 border-blue-500 rounded-xl p-2.5 text-sm font-bold w-full outline-none bg-white shadow-xs"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{cat.name}</span>
                              <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-md">
                                {cat.icon || 'shoe'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* ចំនួនទំនិញជាក់ស្តែងក្នុង Category នេះ */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setInvCategory(cat.name);
                              setActiveTab('inventory');
                            }}
                            title="ចុចដើម្បីមើលទំនិញក្នុងស្តុកនៃប្រភេទនេះ"
                            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-black border border-blue-200 transition cursor-pointer shadow-2xs"
                          >
                            <span>📦</span> {pCount} មុខទំនិញ
                          </button>
                        </td>

                        {/* សកម្មភាព (Actions) */}
                        <td className="px-5 py-4 text-right pr-6">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                type="button"
                                onClick={() => handleUpdateCategory(cat.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                              >
                                💾 រក្សាទុក
                              </button>
                              <button 
                                type="button"
                                onClick={() => setEditingCategoryId(null)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                បោះបង់
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditingCatName(cat.name);
                                  setEditingCatIcon(cat.icon || 'shoe');
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                              >
                                ✏️ កែប្រែ
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                              >
                                🗑️ លុប
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };
  
  // ================= ផ្នែក Cover Management (Multiple Slides - 5 សន្លឹក Standard DB + Full Options) =================
  const [slides, setSlides] = useState([
    { id: 1, badge: 'NEW COLLECTION 2026', title: 'ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់', desc: 'ស្វែងរកទំនិញម៉ាកយីហោលំដាប់ប្រណិត ធានាទាំងតម្លៃ និងគុណភាពពិតប្រាកដ។', btnText: 'បញ្ជាទិញឥឡូវនេះ', image: '', isActive: true, align: 'left', overlay: 'medium', btnAction: 'products', btnLink: '' },
    { id: 2, badge: '🔥 HOT PROMOTION', title: 'ការបញ្ចុះតម្លៃពិសេសប្រចាំខែ', desc: 'ទំនិញពេញនិយមបញ្ចុះតម្លៃរហូតដល់ ៥០% រួសរាន់ឡើងចំនួនមានកំណត់!', btnText: 'ទិញទំនិញប្រូម៉ូសិន', image: '', isActive: true, align: 'left', overlay: 'medium', btnAction: 'products', btnLink: '' },
    { id: 3, badge: '✨ NEW ARRIVAL', title: 'ម៉ូតទាន់សម័យទើបមកដល់ថ្មីៗ', desc: 'ម៉ូតថ្មីទាក់ទាញ គុណភាពខ្ពស់ សាកសមគ្រប់កាលៈទេសៈ។', btnText: 'ស្វែងរកម៉ូតថ្មី', image: '', isActive: true, align: 'left', overlay: 'medium', btnAction: 'products', btnLink: '' },
    { id: 4, badge: '🚚 FAST DELIVERY', title: 'ដឹកជញ្ជូនរហ័សទូទាំង ២៥ ខេត្ត-ក្រុង', desc: 'សេវាកម្មដឹកជញ្ជូនឆាប់រហ័ស ធានាសុវត្ថិភាពទំនិញ ១០០%។', btnText: 'មើលទំនិញទាំងអស់', image: '', isActive: false, align: 'left', overlay: 'medium', btnAction: 'products', btnLink: '' },
    { id: 5, badge: '💎 LUXURY VIBE', title: 'បទពិសោធន៍ទិញទំនិញលំដាប់ VIP', desc: 'សេវាកម្មរួសរាយ គុណភាពផ្ទៀងផ្ទាត់ត្រឹមត្រូវ។', btnText: 'ទំនាក់ទំនងមកយើង', image: '', isActive: false, align: 'left', overlay: 'medium', btnAction: 'telegram', btnLink: '' },
  ]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [coverMessage, setCoverMessage] = useState('');
  
  // States សម្រាប់ Loading UI បែប Standard
  const [isUploadingSlide, setIsUploadingSlide] = useState(false);
  const [isSavingSlides, setIsSavingSlides] = useState(false);
  const [directImageUrlInput, setDirectImageUrlInput] = useState('');

  // ១. ទាញយកទិន្នន័យ Slides ពី Database ពេល Load ចូលផ្ទាំងនេះ
  useEffect(() => {
    async function fetchSlidesFromDB() {
      let localData = null;
      try {
        const cached = localStorage.getItem('sabay_luk_covers_data');
        if (cached) localData = JSON.parse(cached);
      } catch (e) {}

      const { data, error } = await supabase.from('sliders').select('*').order('id', { ascending: true });
      if (data && data.length > 0) {
        const loadedSlides = Array(5).fill(0).map((_, i) => {
          const slide = data.find(s => s.id === i + 1);
          const localItem = Array.isArray(localData) ? (localData.find(l => l.id === i + 1) || localData[i]) : null;
          return {
            id: i + 1,
            badge: slide?.badge || localItem?.badge || '',
            title: slide?.title || localItem?.title || '',
            desc: slide?.description || localItem?.desc || '',
            btnText: slide?.btn_text || localItem?.btnText || '',
            image: slide?.image_url || localItem?.image || '',
            isActive: localItem?.isActive !== undefined ? localItem.isActive : Boolean(slide?.image_url || slide?.title),
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
    }
    fetchSlidesFromDB();
  }, []);

  const handleSlideChange = (field, value) => {
    const updated = [...slides];
    updated[activeSlideIndex] = { ...updated[activeSlideIndex], [field]: value };
    setSlides(updated);
  };

  // ២. មុខងារ Upload រូបភាព (មាន Loading វិលៗ)
  const handleSlideImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploadingSlide(true);
      setCoverMessage('⏳ កំពុង Upload រូបភាពចូលក្នុង Server...');
      try {
        const fileName = `slide_${activeSlideIndex}_${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName);
        const updated = [...slides];
        updated[activeSlideIndex] = { ...updated[activeSlideIndex], image: publicData.publicUrl };
        setSlides(updated);
        setCoverMessage('✅ Upload រូបភាពជោគជ័យ! សូមចុចរក្សាទុកទិន្នន័យ។');
      } catch (err) {
        setCoverMessage('❌ Upload បរាជ័យ: ' + err.message);
      } finally {
        setIsUploadingSlide(false);
      }
    }
  };

  // មុខងារបញ្ចូល Image URL ផ្ទាល់
  const handleApplyDirectImageUrl = () => {
    if (!directImageUrlInput.trim()) return;
    const updated = [...slides];
    updated[activeSlideIndex] = { ...updated[activeSlideIndex], image: directImageUrlInput.trim() };
    setSlides(updated);
    setDirectImageUrlInput('');
    setCoverMessage('✅ បានដាក់រូបភាពពី Link ជោគជ័យ! សូមចុចរក្សាទុក។');
    setTimeout(() => setCoverMessage(''), 3000);
  };

  // មុខងារសម្អាតទិន្នន័យសន្លឹកបច្ចុប្បន្ន
  const handleClearCurrentSlide = () => {
    if (!window.confirm(`តើអ្នកពិតជាចង់សម្អាតទិន្នន័យសន្លឹកទី ${activeSlideIndex + 1} នេះមែនទេ?`)) return;
    const updated = [...slides];
    updated[activeSlideIndex] = {
      id: activeSlideIndex + 1,
      badge: '',
      title: '',
      desc: '',
      btnText: 'បញ្ជាទិញឥឡូវនេះ',
      image: '',
      isActive: false,
      align: 'left',
      overlay: 'medium',
      btnAction: 'products',
      btnLink: ''
    };
    setSlides(updated);
    setCoverMessage(`🗑️ បានសម្អាតសន្លឹកទី ${activeSlideIndex + 1} រួចរាល់!`);
  };

  // មុខងារដាក់ទិន្នន័យគំរូស្អាតៗ (Fill Demo Content)
  const handleFillDemoSlides = () => {
    if (!window.confirm('តើអ្នកចង់បំពេញទិន្នន័យគំរូ Cover ស្អាតៗបែបប្រណិតទាំង ៥ សន្លឹកមែនទេ?')) return;
    const demo = [
      {
        id: 1,
        badge: '✨ NEW COLLECTION 2026',
        title: 'ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់សម្រាប់អ្នក',
        desc: 'ស្វែងរកទំនិញម៉ាកយីហោលំដាប់ប្រណិត ធានាទាំងតម្លៃ គុណភាព និងការពេញចិត្តពិតប្រាកដ។',
        btnText: 'បញ្ជាទិញឥឡូវនេះ',
        image: slides[0]?.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
        isActive: true,
        align: 'left',
        overlay: 'medium',
        btnAction: 'products',
        btnLink: ''
      },
      {
        id: 2,
        badge: '🔥 HOT PROMOTION -50%',
        title: 'ការបញ្ចុះតម្លៃពិសេសប្រចាំរដូវកាល',
        desc: 'ប្រញាប់ឡើង! ទំនិញពេញនិយមបញ្ចុះតម្លៃរហូតដល់ ៥០% សម្រាប់សប្តាហ៍នេះប៉ុណ្ណោះ។',
        btnText: 'មើលទំនិញបញ្ចុះតម្លៃ',
        image: slides[1]?.image || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80',
        isActive: true,
        align: 'left',
        overlay: 'dark',
        btnAction: 'products',
        btnLink: ''
      },
      {
        id: 3,
        badge: '⚡ FLASH SALE TODAY',
        title: 'ម៉ូតទាន់សម័យ ទើបមកដល់ក្តៅៗ',
        desc: 'អាប់ដេតស្ទីលថ្មីរបស់អ្នកជាមួយការរចនាទាន់សម័យ ធានាគុណភាពក្រណាត់ល្អឥតខ្ចោះ។',
        btnText: 'ស្វែងរកម៉ូតថ្មីៗ',
        image: slides[2]?.image || 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80',
        isActive: true,
        align: 'center',
        overlay: 'medium',
        btnAction: 'products',
        btnLink: ''
      },
      {
        id: 4,
        badge: '🚚 FAST DELIVERY 25 PROVINCES',
        title: 'ដឹកជញ្ជូនរហ័សទូទាំងប្រទេស',
        desc: 'សេវាកម្មដឹកជញ្ជូនលឿនទាន់ចិត្ត ពិនិត្យទំនិញមុនទូទាត់ប្រាក់ ធានាសុវត្ថិភាព ១០០%។',
        btnText: 'មើលទំនិញទាំងអស់',
        image: slides[3]?.image || 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1600&q=80',
        isActive: true,
        align: 'left',
        overlay: 'medium',
        btnAction: 'products',
        btnLink: ''
      },
      {
        id: 5,
        badge: '💎 VIP CUSTOMER CARE',
        title: 'ប្រឹក្សាយោបល់ និងសេវាកម្មកម្រិត VIP',
        desc: 'ក្រុមការងារជំនាញរង់ចាំស្វាគមន៍ និងផ្តល់យោបល់គ្រប់ពេលវេលា។ ឆាតមកយើងឥឡូវនេះ!',
        btnText: 'ឆាតទៅកាន់ Telegram',
        image: slides[4]?.image || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80',
        isActive: true,
        align: 'right',
        overlay: 'dark',
        btnAction: 'telegram',
        btnLink: ''
      }
    ];
    setSlides(demo);
    setCoverMessage('✨ បានបំពេញទិន្នន័យគំរូ Cover ទាំង ៥ សន្លឹកជោគជ័យ! សូមចុចរក្សាទុក។');
  };

  // ៣. មុខងារ Save ចូល Database ផ្ទាល់ (Supabase Upsert) & LocalStorage Cache
  const handleSaveAllSlides = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSavingSlides(true);
    setCoverMessage('⏳ កំពុងរក្សាទុក Slides ទាំង 5 សន្លឹកទៅកាន់ Database & Website...');

    try {
      const upsertData = slides.map((slide, index) => ({
        id: index + 1, 
        badge: slide.badge ? slide.badge.trim() : '',
        title: slide.title ? slide.title.trim() : '',
        description: slide.desc ? slide.desc.trim() : '',
        btn_text: slide.btnText ? slide.btnText.trim() : '',
        image_url: slide.image ? slide.image.trim() : ''
      }));

      const { error } = await supabase.from('sliders').upsert(upsertData);
      if (error) console.warn('Supabase sliders save note:', error.message);

      // Save full rich options to localStorage & broadcast event
      localStorage.setItem('sabay_luk_covers_data', JSON.stringify(slides));
      if (slides[0]) {
        localStorage.setItem('sabay_luk_cover', JSON.stringify(slides[0]));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }

      setCoverMessage('🎉 រក្សាទុក Slides ទាំង 5 សន្លឹកទៅកាន់ Database និង Website ជោគជ័យ!');
      setTimeout(() => setCoverMessage(''), 4500);
    } catch (err) {
      setCoverMessage('❌ មានបញ្ហាពេលរក្សាទុក: ' + err.message);
    } finally {
      setIsSavingSlides(false);
    }
  };

  // ⭐️ ផ្ទាំង CoverManagementView (Full Option & Live Interactive WYSIWYG) ⭐️
  const CoverManagementView = () => {
    const cur = slides[activeSlideIndex] || slides[0] || {};
    const primary = storeSettings?.primaryColor || '#ff6a00';

    // Helper overlay style
    const getOverlayGradient = (overlayType, alignType) => {
      let darkness = '0.85';
      let mid = '0.5';
      let edge = '0.15';
      if (overlayType === 'light') {
        darkness = '0.65';
        mid = '0.3';
        edge = '0.05';
      } else if (overlayType === 'dark') {
        darkness = '0.92';
        mid = '0.7';
        edge = '0.35';
      }

      if (alignType === 'center') {
        return `linear-gradient(to top, rgba(0,0,0,${darkness}) 0%, rgba(0,0,0,${mid}) 50%, rgba(0,0,0,${edge}) 100%)`;
      } else if (alignType === 'right') {
        return `linear-gradient(to left, rgba(0,0,0,${darkness}) 0%, rgba(0,0,0,${mid}) 60%, rgba(0,0,0,${edge}) 100%)`;
      }
      return `linear-gradient(to right, rgba(0,0,0,${darkness}) 0%, rgba(0,0,0,${mid}) 60%, rgba(0,0,0,${edge}) 100%)`;
    };

    return (
      <div className="animate-in fade-in max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20 flex-shrink-0">
              🖼️
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  គ្រប់គ្រង Cover Slider ហាង
                </h2>
                <span className="text-[11px] font-black bg-orange-100 text-orange-700 px-3 py-1 rounded-full uppercase tracking-wider">
                  Full Option 5 Slides
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                រៀបចំផ្ទាំងបដាផ្សព្វផ្សាយ (Hero Banner) ខាងមុខហាង ងាយស្រួលប្រើប្រាស់ និងមាន Live Preview ផ្ទាល់ៗ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleFillDemoSlides}
              className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-xs transition border border-amber-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>✨</span> បញ្ចូលទិន្នន័យគំរូ
            </button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs transition border border-gray-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>👁️</span> មើលមុខហាង
            </a>
            <button
              type="button"
              onClick={handleSaveAllSlides}
              disabled={isSavingSlides || isUploadingSlide}
              style={{ backgroundColor: primary }}
              className="px-6 py-2.5 rounded-2xl text-white font-black text-xs shadow-lg transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSavingSlides ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> កំពុងរក្សាទុក...</>
              ) : (
                <><span>💾</span> រក្សាទុកទាំងអស់</>
              )}
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {coverMessage && (
          <div className={`p-4 rounded-2xl font-black text-xs flex items-center gap-2.5 animate-in fade-in shadow-xs ${
            coverMessage.includes('❌') 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            <span>{coverMessage.includes('❌') ? '⚠️' : '🎉'}</span>
            <span>{coverMessage}</span>
          </div>
        )}

        {/* ⭐️ 1. LIVE WYSIWYG PREVIEW CARD (ផ្ទាំងបង្ហាញគំរូផ្ទាល់ដូចមុខហាងពិត) ⭐️ */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 text-white relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
              <span className="text-xs font-black text-slate-300 ml-2">
                📺 ផ្ទាំងគំរូបង្ហាញលើមុខហាង (Live Storefront Preview) — សន្លឹកទី {activeSlideIndex + 1}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                cur.isActive !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-700 text-gray-400'
              }`}>
                {cur.isActive !== false ? '🟢 កំពុងបើកបង្ហាញ' : '⚪ កំពុងបិទ (Inactive)'}
              </span>

              {/* Prev / Next preview switcher */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSlideIndex(prev => (prev === 0 ? 4 : prev - 1))}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-black transition cursor-pointer"
                  title="Slide មុន"
                >
                  ‹
                </button>
                <span className="text-xs font-bold text-slate-400 px-1">{activeSlideIndex + 1}/5</span>
                <button
                  type="button"
                  onClick={() => setActiveSlideIndex(prev => (prev === 4 ? 0 : prev + 1))}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-black transition cursor-pointer"
                  title="Slide បន្ទាប់"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Banner Simulator Screen */}
          <div 
            className="rounded-2xl relative overflow-hidden min-h-[340px] sm:min-h-[400px] bg-slate-950 flex items-center shadow-inner border border-white/10"
            style={{
              backgroundImage: cur.image 
                ? `${getOverlayGradient(cur.overlay, cur.align)}, url("${cur.image}")`
                : 'linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Warning if inactive */}
            {cur.isActive === false && (
              <div className="absolute top-4 right-4 z-20 bg-amber-500/90 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-1.5">
                <span>⚠️</span> សន្លឹកនេះកំពុងបិទ (មិនបង្ហាញលើ Web ទេ)
              </div>
            )}

            {/* Slide Content Box */}
            <div className={`p-8 sm:p-14 w-full flex flex-col ${
              cur.align === 'center' ? 'items-center text-center' : cur.align === 'right' ? 'items-end text-right' : 'items-start text-left'
            }`}>
              
              {/* Badge Tag */}
              {cur.badge ? (
                <span 
                  style={{ backgroundColor: primary }} 
                  className="inline-flex items-center gap-1.5 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 shadow-xl shadow-black/30 backdrop-blur-sm"
                >
                  <span>✨</span> {cur.badge}
                </span>
              ) : (
                <span className="text-[10px] text-white/40 italic mb-2">(គ្មាន Badge)</span>
              )}

              {/* Main Title */}
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 leading-tight max-w-2xl text-white drop-shadow-lg tracking-tight">
                {cur.title || <span className="text-white/40 italic">សូមបញ្ចូលចំណងជើងធំ...</span>}
              </h1>

              {/* Description */}
              <p className="text-gray-200 text-xs sm:text-sm md:text-base max-w-xl mb-7 leading-relaxed font-medium line-clamp-3 drop-shadow-md">
                {cur.desc || <span className="text-white/40 italic">សូមបញ្ចូលអក្សររៀបរាប់...</span>}
              </p>

              {/* CTA Button */}
              {cur.btnText ? (
                <div className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-2xl transition hover:scale-105 active:scale-95 cursor-default">
                  <span>{cur.btnText}</span>
                  <span className="text-sm">→</span>
                </div>
              ) : null}
            </div>

            {/* Simulated Dots */}
            <div className="absolute bottom-5 right-7 z-10 flex items-center gap-2">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`transition-all duration-300 rounded-full ${
                    i === activeSlideIndex 
                      ? 'w-7 h-2 bg-white shadow-md' 
                      : 'w-2 h-2 bg-white/40'
                  }`}
                  style={{ backgroundColor: i === activeSlideIndex ? primary : undefined }}
                />
              ))}
            </div>

            {/* Bottom animated progress indicator mockup */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
              <div style={{ backgroundColor: primary }} className="h-full w-2/3"></div>
            </div>
          </div>
        </div>

        {/* ⭐️ 2. SLIDE SELECTOR STRIP (កាតរើសសន្លឹក Slide ទាំង ៥) ⭐️ */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>🗂️</span> ជ្រើសរើសសន្លឹកដែលត្រូវកែប្រែ (Select Slide to Edit)
            </h3>
            <span className="text-xs text-gray-400 font-medium">ចុចលើសន្លឹកនីមួយៗដើម្បីកែសម្រួល</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {slides.map((s, idx) => {
              const isSelected = activeSlideIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex flex-col gap-2 cursor-pointer ${
                    isSelected 
                      ? 'border-orange-500 bg-orange-50/50 shadow-md shadow-orange-500/10 scale-[1.02]' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {/* Thumbnail / Image Preview */}
                  <div className="w-full h-20 rounded-xl bg-gray-100 relative overflow-hidden flex items-center justify-center border border-gray-200/60">
                    {s.image ? (
                      <img src={s.image} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-300 text-xs">
                        <span className="text-xl">🖼️</span>
                        <span className="text-[10px] font-bold mt-0.5">គ្មានរូប</span>
                      </div>
                    )}
                    <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-xs">
                      #{idx + 1}
                    </span>
                    <span className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      s.isActive !== false ? 'bg-emerald-500' : 'bg-gray-400'
                    }`} title={s.isActive !== false ? 'Active' : 'Inactive'} />
                  </div>

                  {/* Title & Status */}
                  <div className="overflow-hidden">
                    <p className="text-xs font-black text-gray-800 truncate">
                      {s.title || `សន្លឹកទី ${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {s.badge || 'គ្មានផ្លាក'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ⭐️ 3. FULL OPTION EDIT FORM FOR SELECTED SLIDE ⭐️ */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-200/80 shadow-xs space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <span className="text-[11px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wider">
                កំពុងកែសម្រួល: សន្លឹកទី {activeSlideIndex + 1} នៃ ៥
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-2">
                ⚙️ ការកំណត់លម្អិតសន្លឹក Cover #{activeSlideIndex + 1}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Active Toggle Switch */}
              <button
                type="button"
                onClick={() => handleSlideChange('isActive', cur.isActive === false ? true : false)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer border ${
                  cur.isActive !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                }`}>
                <span>{cur.isActive !== false ? '🟢' : '⚪'}</span>
                <span>{cur.isActive !== false ? 'បើកបង្ហាញលើ Web (Active)' : 'បិទសន្លឹកនេះ (Inactive)'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearCurrentSlide}
                className="px-3.5 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition cursor-pointer flex items-center gap-1.5"
                title="សម្អាតទិន្នន័យសន្លឹកនេះ"
              >
                <span>🗑️</span> សម្អាត
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveAllSlides} className="space-y-7">
            
            {/* 1. Cover Image Controls */}
            <div className="space-y-3 bg-gray-50/80 p-5 rounded-3xl border border-gray-200/80">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span>🖼️</span> ១. រូបភាពផ្ទៃខាងក្រោយ Cover (Background Image)
                </label>
                <span className="text-[11px] text-gray-400 font-medium">
                  ទំហំដែលសមស្របបំផុត៖ 1920x800px ឬ 1600x700px (16:9 / 21:9)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Preview Image Box */}
                <div className="md:col-span-4 h-36 bg-white rounded-2xl border-2 border-dashed border-gray-300 relative overflow-hidden flex items-center justify-center shadow-xs">
                  {isUploadingSlide && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center z-10">
                      <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[11px] font-black text-orange-600 mt-2">កំពុង Upload រូបភាព...</p>
                    </div>
                  )}

                  {cur.image ? (
                    <>
                      <img src={cur.image} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleSlideChange('image', '')}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-1.5 rounded-xl text-xs transition cursor-pointer"
                        title="លុបរូបភាព"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-3xl text-gray-300 block mb-1">🖼️</span>
                      <p className="text-xs font-bold text-gray-400">មិនទាន់មានរូបភាព</p>
                      <p className="text-[10px] text-gray-400">សូម Upload ឬដាក់ Link រូបភាព</p>
                    </div>
                  )}
                </div>

                {/* Upload & Link Options */}
                <div className="md:col-span-8 space-y-3">
                  {/* File Upload Button */}
                  <div className="flex items-center gap-3">
                    <label className="bg-white hover:bg-gray-100 text-gray-800 px-5 py-3 rounded-2xl border border-gray-300 font-black text-xs cursor-pointer transition shadow-2xs flex items-center gap-2">
                      <span>📁</span> ជ្រើសរើសរូបពីកុំព្យូទ័រ / ទូរស័ព្ទ
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleSlideImageUpload} 
                        disabled={isUploadingSlide} 
                        className="hidden" 
                      />
                    </label>
                    <span className="text-xs text-gray-400 font-medium">ឬ</span>
                  </div>

                  {/* Direct Link Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="🔗 ឬបិទភ្ជាប់ Image URL ផ្ទាល់ (https://...)"
                      value={directImageUrlInput}
                      onChange={(e) => setDirectImageUrlInput(e.target.value)}
                      className="flex-1 bg-white border border-gray-200 px-4 py-2.5 rounded-2xl text-xs font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                    />
                    <button
                      type="button"
                      onClick={handleApplyDirectImageUrl}
                      className="px-4 py-2.5 rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-xs transition cursor-pointer whitespace-nowrap shadow-2xs"
                    >
                      ដាក់រូប
                    </button>
                  </div>

                  {cur.image && (
                    <p className="text-[11px] text-gray-500 truncate">
                      <span className="font-bold">Link រូបបច្ចុប្បន្ន:</span> {cur.image}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Visual Effects: Overlay & Alignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Overlay Darkness */}
              <div className="bg-gray-50/80 p-5 rounded-3xl border border-gray-200/80 space-y-2">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                  🌓 កម្រិតស្រមោលងងឹត (Gradient Overlay)
                </label>
                <p className="text-[11px] text-gray-400">ជួយឱ្យអក្សរងាយមើលឃើញច្បាស់នៅលើរូបភាពភ្លឺ</p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: 'light', label: '☀️ ស្រាល (35%)', desc: 'រូបភាពភ្លឺច្បាស់' },
                    { id: 'medium', label: '⚖️ ល្មម (65%)', desc: 'ស្តង់ដារលំនាំដើម' },
                    { id: 'dark', label: '🌙 ងងឹត (85%)', desc: 'អក្សរច្បាស់ខ្លាំង' }
                  ].map(ov => (
                    <button
                      key={ov.id}
                      type="button"
                      onClick={() => handleSlideChange('overlay', ov.id)}
                      className={`p-3 rounded-2xl text-xs font-black transition text-center cursor-pointer border ${
                        (cur.overlay || 'medium') === ov.id 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div>{ov.label}</div>
                      <div className="text-[9px] opacity-70 mt-0.5">{ov.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Alignment */}
              <div className="bg-gray-50/80 p-5 rounded-3xl border border-gray-200/80 space-y-2">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                  📐 តម្រឹមកថាខណ្ឌ (Text Alignment)
                </label>
                <p className="text-[11px] text-gray-400">កំណត់ទីតាំងអក្សរលើផ្ទាំង Cover</p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: 'left', label: '⬅️ ខាងឆ្វេង (Left)' },
                    { id: 'center', label: '⏺️ កណ្តាល (Center)' },
                    { id: 'right', label: '➡️ ខាងស្តាំ (Right)' }
                  ].map(al => (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => handleSlideChange('align', al.id)}
                      className={`p-3 rounded-2xl text-xs font-black transition text-center cursor-pointer border ${
                        (cur.align || 'left') === al.id 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {al.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Badge Tag with Presets */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>🏷️ ២. ផ្លាកតូចលើគេ (Badge Tag)</span>
                <span className="text-[11px] text-gray-400 font-normal">ឧ. NEW ARRIVAL, PROMOTION, HOT DEAL</span>
              </label>
              <input
                type="text"
                placeholder="វាយអក្សរ Badge នៅទីនេះ..."
                value={cur.badge || ''}
                onChange={(e) => handleSlideChange('badge', e.target.value)}
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold text-gray-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
              />

              {/* Quick Preset Badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-gray-400 font-bold">ជ្រើសរើសរហ័ស៖</span>
                {[
                  '🔥 HOT DEAL',
                  '✨ NEW ARRIVAL 2026',
                  '⚡ SALE UP TO 50%',
                  '💎 LUXURY COLLECTION',
                  '🎉 SPECIAL PROMOTION',
                  '🛍️ BEST SELLER',
                  '🚚 FREE DELIVERY'
                ].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSlideChange('badge', tag)}
                    className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-600 transition cursor-pointer border border-gray-200"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Main Title */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                📢 ៣. ចំណងជើងធំ (Main Title)
              </label>
              <input
                type="text"
                placeholder="ឧ. ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់សម្រាប់អ្នក..."
                value={cur.title || ''}
                onChange={(e) => handleSlideChange('title', e.target.value)}
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-base font-black text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
              />
            </div>

            {/* 5. Description */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                📝 ៤. អក្សររៀបរាប់លម្អិត (Description)
              </label>
              <textarea
                rows="3"
                placeholder="រៀបរាប់ព័ត៌មានបន្ថែមពីប្រូម៉ូសិន គុណភាពទំនិញ ឬការធានា..."
                value={cur.desc || ''}
                onChange={(e) => handleSlideChange('desc', e.target.value)}
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-medium text-gray-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition leading-relaxed"
              />
            </div>

            {/* 6. CTA Button & Action Link */}
            <div className="bg-gray-50/80 p-5 rounded-3xl border border-gray-200/80 space-y-4">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                🔘 ៥. ប៊ូតុងបញ្ជាទិញ & សកម្មភាពពេលចុច (CTA Button & Link)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1.5 block">អក្សរលើប៊ូតុង (Button Text)</label>
                  <input
                    type="text"
                    placeholder="ឧ. បញ្ជាទិញឥឡូវនេះ, មើលទំនិញ..."
                    value={cur.btnText || ''}
                    onChange={(e) => handleSlideChange('btnText', e.target.value)}
                    className="w-full bg-white border border-gray-200 p-3 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1.5 block">សកម្មភាពពេលអតិថិជនចុច (Button Action)</label>
                  <select
                    value={cur.btnAction || 'products'}
                    onChange={(e) => handleSlideChange('btnAction', e.target.value)}
                    className="w-full bg-white border border-gray-200 p-3 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="products">🛒 រំកិលទៅមើលទំនិញទាំងអស់ (Scroll to Products)</option>
                    <option value="telegram">💬 ឆាតទៅកាន់ Telegram ហាង (Open Telegram)</option>
                    <option value="phone">📞 ខលទូរស័ព្ទទៅកាន់ហាងផ្ទាល់ (Call Store Phone)</option>
                    <option value="custom">🔗 តំណភ្ជាប់ផ្ទាល់ខ្លួន (Custom URL)</option>
                  </select>
                </div>
              </div>

              {/* If custom URL selected */}
              {cur.btnAction === 'custom' && (
                <div className="pt-1">
                  <label className="text-[11px] font-bold text-gray-500 mb-1 block">បញ្ចូល URL ផ្ទាល់ខ្លួន (Link Target)</label>
                  <input
                    type="url"
                    placeholder="https://t.me/... ឬ https://facebook.com/..."
                    value={cur.btnLink || ''}
                    onChange={(e) => handleSlideChange('btnLink', e.target.value)}
                    className="w-full bg-white border border-gray-200 p-3 rounded-2xl text-xs font-medium text-gray-800 outline-none focus:border-orange-500"
                  />
                </div>
              )}
            </div>

            {/* Bottom Save Action Bar */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>💡</span> ព័ត៌មានទាំងអស់នឹងត្រូវបាន Sync ភ្លាមៗទៅកាន់ទំព័រមុខហាង
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSavingSlides || isUploadingSlide}
                  style={{ backgroundColor: primary }}
                  className="w-full sm:w-auto text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isSavingSlides ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> កំពុងរក្សាទុក...</>
                  ) : (
                    <><span>💾</span> រក្សាទុក Slides ទាំង 5 សន្លឹកទៅកាន់ Database</>
                  )}
                </button>
              </div>
            </div>

          </form>
        </div>

      </div>
    );
  };

  // ⭐️ States សម្រាប់ផ្ទាំងវិភាគទិន្នន័យលក់ & ប្រវត្តិលក់ស្តង់ដារ ⭐️
  const [analyticsPeriod, setAnalyticsPeriod] = useState('all'); // 'today' | 'yesterday' | '7days' | 'month' | 'all'
  const [analyticsChannel, setAnalyticsChannel] = useState('all'); // 'all' | 'POS' | 'ONLINE'
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analyticsSubTab, setAnalyticsSubTab] = useState('overview'); // 'overview' | 'history' | 'top_products'
  const [topProductsSortBy, setTopProductsSortBy] = useState('profit'); // 'profit' | 'revenue' | 'qty'
  const [rewardCopiedMsg, setRewardCopiedMsg] = useState('');

  // ⭐️ STATES & VIEW សម្រាប់គ្រប់គ្រង CUSTOMER FEEDBACKS (ADMIN) ⭐️
  const [adminFeedbacks, setAdminFeedbacks] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sabay_luk_product_feedbacks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [
      {
        id: 'fb-seed-1',
        order_id: 'ONL-874752',
        product_id: '069c3069-6ba4-400b-a78a-4e61bc685fac',
        product_name: 'ស្បែកជ់ើងបុរស',
        customer_name: 'veasna',
        rating: 5,
        comment: 'ស្បែកជើងពាក់ស្រួលណាស់ បាតទន់ គុណភាពល្អឥតខ្ចោះ ស្អាតដូចក្នុងរូបថត ១០០%!',
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
        tags: ['👌 ទំហំពាក់ត្រូវល្អ', '💯 ណែនាំឱ្យទិញ', '✨ ស្អាតដូចក្នុងរូប'],
        created_at: '2026-11-11T09:15:00Z',
        is_verified: true
      }
    ];
  });

  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackStarFilter, setFeedbackStarFilter] = useState('all');

  // Reload feedbacks on storage change
  useEffect(() => {
    const handleStorageChangeFb = (e) => {
      if (!e || !e.key || e.key === 'sabay_luk_product_feedbacks') {
        try {
          const saved = localStorage.getItem('sabay_luk_product_feedbacks');
          if (saved) setAdminFeedbacks(JSON.parse(saved));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChangeFb);
    return () => window.removeEventListener('storage', handleStorageChangeFb);
  }, []);

  const handleDeleteFeedback = (fbId) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបមតិយោបល់ Feedback នេះមែនទេ?')) return;
    const updated = adminFeedbacks.filter(f => f.id !== fbId);
    setAdminFeedbacks(updated);
    localStorage.setItem('sabay_luk_product_feedbacks', JSON.stringify(updated));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
  };

  const FeedbacksView = () => {
    const filtered = adminFeedbacks.filter(fb => {
      const matchSearch = !feedbackSearch || 
        (fb.customer_name && fb.customer_name.toLowerCase().includes(feedbackSearch.toLowerCase())) ||
        (fb.product_name && fb.product_name.toLowerCase().includes(feedbackSearch.toLowerCase())) ||
        (fb.order_id && fb.order_id.toLowerCase().includes(feedbackSearch.toLowerCase())) ||
        (fb.comment && fb.comment.toLowerCase().includes(feedbackSearch.toLowerCase()));

      const matchStar = feedbackStarFilter === 'all' || String(fb.rating) === String(feedbackStarFilter);
      return matchSearch && matchStar;
    });

    const totalCount = adminFeedbacks.length;
    const avgScore = totalCount > 0 
      ? (adminFeedbacks.reduce((a, b) => a + (Number(b.rating) || 5), 0) / totalCount).toFixed(1)
      : '5.0';
    const fiveStarCount = adminFeedbacks.filter(f => Number(f.rating) === 5).length;

    return (
      <div className="animate-in fade-in max-w-7xl mx-auto space-y-6 pb-16">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20 flex-shrink-0">
              💬
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  គ្រប់គ្រង Feedback & មតិយោបល់អតិថិជន
                </h2>
                <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">
                  100% Verified Buyers
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                មតិយោបល់ពិតប្រាកដដែលផ្ទៀងផ្ទាត់ដោយប្រព័ន្ធ (១ ការបញ្ជាទិញ = ១ Feedback លើទំនិញដែលបានទិញ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs transition border border-gray-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span>👁️</span> មើលលើមុខហាង
            </a>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
            <span className="text-xs font-bold text-gray-400 block mb-1">Feedback សរុប</span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">{totalCount}</div>
            <span className="text-[11px] text-emerald-600 font-bold mt-1 block">✅ ផ្ទៀងផ្ទាត់តាម Order ពិត</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
            <span className="text-xs font-bold text-gray-400 block mb-1">ពិន្ទុមធ្យម (Avg Rating)</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-500 flex items-baseline gap-1">
              ★ {avgScore}
              <span className="text-xs text-gray-400 font-normal">/ 5.0</span>
            </div>
            <span className="text-[11px] text-gray-400 font-bold mt-1 block">ការពេញចិត្តរបស់អតិថិជន</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
            <span className="text-xs font-bold text-gray-400 block mb-1">ពិន្ទុ ៥ ផ្កាយ (5 Stars)</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{fiveStarCount}</div>
            <span className="text-[11px] text-gray-400 font-bold mt-1 block">{totalCount > 0 ? Math.round((fiveStarCount / totalCount) * 100) : 100}% នៃការវាយតម្លៃ</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
            <span className="text-xs font-bold text-gray-400 block mb-1">លក្ខខណ្ឌសុវត្ថិភាព</span>
            <div className="text-base sm:text-lg font-black text-blue-600 mt-1">1 Order = 1 Review</div>
            <span className="text-[11px] text-blue-500 font-bold mt-0.5 block">🛡️ ទប់ស្កាត់ Spam ១០០%</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="ស្វែងរកតាមឈ្មោះ, ទំនិញ, ឬ Order ID..."
              value={feedbackSearch}
              onChange={(e) => setFeedbackSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-medium outline-none focus:border-orange-500"
            />
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'ទាំងអស់' },
              { id: '5', label: '★ 5 ផ្កាយ' },
              { id: '4', label: '★ 4 ផ្កាយ' },
              { id: '3', label: '★ 3 ផ្កាយ' },
              { id: '2', label: '★ 2 ផ្កាយ' },
              { id: '1', label: '★ 1 ផ្កាយ' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFeedbackStarFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap cursor-pointer border ${
                  feedbackStarFilter === f.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedbacks List Table / Cards */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <span className="text-4xl block mb-2">💬</span>
              <h4 className="text-sm font-black text-gray-800">មិនមាន Feedback ត្រូវនឹងការស្វែងរកទេ</h4>
              <p className="text-xs text-gray-400 mt-1">សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬតម្រងផ្កាយ</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((fb) => (
                <div key={fb.id} className="p-5 hover:bg-gray-50/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-gray-900">{fb.customer_name || 'អតិថិជន'}</span>
                      <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <span>✅</span> Verified Buyer
                      </span>
                      <span className="text-[11px] font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                        #{fb.order_id}
                      </span>
                      <span className="text-amber-400 text-xs font-black ml-1">
                        {'★'.repeat(Number(fb.rating) || 5)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {fb.created_at ? new Date(fb.created_at).toLocaleString('km-KH') : 'ថ្មីៗ'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                      <span>🛍️ ទំនិញ:</span>
                      <span className="text-gray-900">{fb.product_name}</span>
                    </div>

                    <p className="text-xs text-gray-700 leading-relaxed font-medium pt-0.5">
                      "{fb.comment}"
                    </p>

                    {Array.isArray(fb.tags) && fb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {fb.tags.map((t, idx) => (
                          <span key={idx} className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteFeedback(fb.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs border border-red-200 transition cursor-pointer flex items-center gap-1"
                      title="លុប Feedback នេះ"
                    >
                      <span>🗑️</span> លុប
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };

  // ================= ស្ថិតិគំរូ & ផ្ទាំងវិភាគទិន្នន័យ (ANALYTICS) =================
  const stats = { totalRevenue: 12540.00, dailySales: 450.00, monthlySales: 4500.00, totalOrders: 156 };

    // ⭐️ ផ្ទាំងវិភាគទិន្នន័យលក់ & ប្រវត្តិលក់ស្តង់ដារ (STANDARD SALES ANALYTICS & HISTORY) ⭐️
  const AnalyticsView = () => {
    // ១. ចម្រាញ់ Order តាមកាលបរិច្ឆេទ (Date Filter)
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
    const sevenDaysAgoTime = Date.now() - (7 * 86400000);
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const filteredByDateOrders = realOrders.filter(o => {
      if (!o.created_at) return true;
      const orderDateStr = o.created_at.slice(0, 10);
      const orderTime = new Date(o.created_at).getTime();

      if (analyticsPeriod === 'today') return orderDateStr === todayStr;
      if (analyticsPeriod === 'yesterday') return orderDateStr === yesterdayStr;
      if (analyticsPeriod === '7days') return orderTime >= sevenDaysAgoTime;
      if (analyticsPeriod === 'month') return orderDateStr >= monthStartStr;
      return true; // 'all'
    });

    // ២. ចម្រាញ់តាម Channel (POS ឬ ONLINE) និង Search
    const finalFilteredOrders = filteredByDateOrders.filter(o => {
      const matchChannel = analyticsChannel === 'all' || (o.order_type || 'POS').toUpperCase() === analyticsChannel.toUpperCase();
      const searchLower = analyticsSearch.toLowerCase();
      const matchSearch = !analyticsSearch || 
        (o.order_id || '').toLowerCase().includes(searchLower) ||
        (o.customer || '').toLowerCase().includes(searchLower) ||
        (o.phone || '').toLowerCase().includes(searchLower);
      return matchChannel && matchSearch;
    });

    // ⭐️ Helper គណនាថ្លៃដើម (Cost of Goods Sold) នៃ Order មួយ ⭐️
    const getOrderCost = (order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      return items.reduce((sum, it) => {
        const prod = products.find(p => p.id === it.id);
        const costPerUnit = prod && prod.cost_price ? parseFloat(prod.cost_price) : 0;
        return sum + (costPerUnit * (it.qty || 1));
      }, 0);
    };

    // ⭐️ Helper គណនាម៉ែត្រិកហិរញ្ញវត្ថុពេញលេញ (Revenue, Cost, Profit, Margin) តាមកាលបរិច្ឆេទ ⭐️
    const computeMetrics = (ordersList) => {
      const completed = ordersList.filter(o => o.status !== 'Cancelled');
      const rev = completed.reduce((sum, o) => sum + (parseFloat(o.total_amount != null ? o.total_amount : o.total) || 0), 0);
      const cost = completed.reduce((sum, o) => sum + getOrderCost(o), 0);
      const profit = Math.max(0, rev - cost);
      const margin = rev > 0 ? ((profit / rev) * 100) : 0;
      const count = completed.length;
      const itemsCount = completed.reduce((sum, o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        return sum + items.reduce((s, it) => s + (it.qty || 1), 0);
      }, 0);
      return { rev, cost, profit, margin, count, itemsCount };
    };

    // ៣. គណនាប្រាក់ចំណេញសុទ្ធតាមពេលវេលា (Today, 7 Days, Month, All-Time)
    const todayOrders = realOrders.filter(o => o.created_at && o.created_at.slice(0, 10) === todayStr);
    const todayPnl = computeMetrics(todayOrders);

    const weekOrders = realOrders.filter(o => o.created_at && new Date(o.created_at).getTime() >= sevenDaysAgoTime);
    const weekPnl = computeMetrics(weekOrders);

    const monthOrders = realOrders.filter(o => o.created_at && o.created_at.slice(0, 7) === now.toISOString().slice(0, 7));
    const monthPnl = computeMetrics(monthOrders);

    const allPnl = computeMetrics(realOrders);

    // ៤. គណនាស្ថិតិសម្រាប់កាលវិភាគដែលបានជ្រើសរើស (Selected Period)
    const completedOrders = finalFilteredOrders.filter(o => o.status !== 'Cancelled');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount != null ? o.total_amount : o.total) || 0), 0);
    const totalCost = completedOrders.reduce((sum, o) => sum + getOrderCost(o), 0);
    const grossProfit = Math.max(0, totalRevenue - totalCost);
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;
    const totalOrdersCount = completedOrders.length;
    const aov = totalOrdersCount > 0 ? (totalRevenue / totalOrdersCount) : 0;

    // ចំនួនទំនិញលក់បានសរុប (Total Items Sold)
    const totalItemsSold = completedOrders.reduce((sum, o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      return sum + items.reduce((s, it) => s + (it.qty || 1), 0);
    }, 0);

    // បែងចែកចំណូលតាម Channel
    const posOrders = completedOrders.filter(o => (o.order_type || 'POS').toUpperCase() === 'POS');
    const posRevenue = posOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    const onlineOrders = completedOrders.filter(o => (o.order_type || 'POS').toUpperCase() === 'ONLINE');
    const onlineRevenue = onlineOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    // ៤. គណនាផលិតផលលក់ដាច់ & ចំណេញបំផុត (Top Selling & Profitable Products)
    const productSalesMap = {};
    completedOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach(it => {
        if (!it.id && !it.name) return;
        const key = it.id || it.name;
        const matchedProd = products.find(p => p.id === it.id || (p.name && it.name && p.name.trim().toLowerCase() === it.name.trim().toLowerCase()));
        const unitCost = matchedProd && matchedProd.cost_price ? parseFloat(matchedProd.cost_price) : 0;
        const unitPrice = parseFloat(it.price) || (matchedProd ? parseFloat(matchedProd.price) : 0) || 0;
        const quantity = it.qty || 1;

        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            id: it.id || matchedProd?.id,
            name: it.name || matchedProd?.name || 'ទំនិញ',
            sku: matchedProd?.sku || it.sku || 'N/A',
            category: matchedProd?.category || 'ទូទៅ',
            image_url: it.image_url || matchedProd?.image_url,
            qty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0
          };
        }
        productSalesMap[key].qty += quantity;
        productSalesMap[key].revenue += (unitPrice * quantity);
        productSalesMap[key].cost += (unitCost * quantity);
        productSalesMap[key].profit = Math.max(0, productSalesMap[key].revenue - productSalesMap[key].cost);
        productSalesMap[key].margin = productSalesMap[key].revenue > 0 
          ? ((productSalesMap[key].profit / productSalesMap[key].revenue) * 100) 
          : 0;
      });
    });

    const sortedTopProducts = Object.values(productSalesMap).sort((a, b) => {
      if (topProductsSortBy === 'profit') return b.profit - a.profit;
      if (topProductsSortBy === 'revenue') return b.revenue - a.revenue;
      return b.qty - a.qty;
    });

    const topSellingProducts = sortedTopProducts.slice(0, 5);

    // ⭐️ គណនាអតិថិជនស្មោះត្រង់ (Top Repeat & Loyal Customers Analytics) ⭐️
    const customerOrdersMap = {};

    completedOrders.forEach(o => {
      const name = (o.customer_name || o.customer || '').trim();
      const phone = (o.phone || o.phone_number || '').trim();
      if (!name && !phone) return;
      if ((!name || name === 'អតិថិជនទូទៅ' || name === 'General Customer') && (!phone || phone === 'N/A')) return;

      const key = phone && phone !== 'N/A' ? phone.replace(/\s+/g, '') : name.toLowerCase();
      
      const crmProfile = customers.find(c => 
        (c.phone && phone && c.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')) ||
        (c.name && name && c.name.trim().toLowerCase() === name.toLowerCase())
      );

      if (!customerOrdersMap[key]) {
        customerOrdersMap[key] = {
          key,
          name: name || (crmProfile ? crmProfile.name : 'អតិថិជន'),
          phone: phone && phone !== 'N/A' ? phone : (crmProfile ? crmProfile.phone : ''),
          telegram: crmProfile?.telegram || '',
          crmTier: crmProfile?.tier || null,
          ordersCount: 0,
          totalSpent: 0,
          lastOrderDate: o.created_at || null
        };
      }

      const orderTotal = parseFloat(o.total_amount != null ? o.total_amount : o.total) || 0;
      customerOrdersMap[key].ordersCount += 1;
      customerOrdersMap[key].totalSpent += orderTotal;

      if (o.created_at && (!customerOrdersMap[key].lastOrderDate || new Date(o.created_at) > new Date(customerOrdersMap[key].lastOrderDate))) {
        customerOrdersMap[key].lastOrderDate = o.created_at;
      }
    });

    // Merge baseline from CRM customers
    customers.forEach(c => {
      const key = c.phone ? c.phone.replace(/\s+/g, '') : (c.name || '').trim().toLowerCase();
      if (!customerOrdersMap[key] && ((c.baseOrderCount && c.baseOrderCount > 0) || (c.baseSpent && c.baseSpent > 0))) {
        customerOrdersMap[key] = {
          key,
          name: c.name,
          phone: c.phone || '',
          telegram: c.telegram || '',
          crmTier: c.tier || null,
          ordersCount: c.baseOrderCount || 0,
          totalSpent: c.baseSpent || 0,
          lastOrderDate: c.joined || null
        };
      } else if (customerOrdersMap[key] && c.baseOrderCount) {
        customerOrdersMap[key].ordersCount += (c.baseOrderCount || 0);
        customerOrdersMap[key].totalSpent += (c.baseSpent || 0);
      }
    });

    const topRepeatCustomers = Object.values(customerOrdersMap)
      .map(c => {
        const aov = c.ordersCount > 0 ? (c.totalSpent / c.ordersCount) : 0;
        let tierLabel = '🥉 Regular';
        let tierBadgeClass = 'bg-gray-100 text-gray-700 border-gray-200';
        let rewardCode = 'SABAY10';
        let rewardDesc = 'បញ្ចុះតម្លៃ 10%';

        if (c.ordersCount >= 5 || c.totalSpent >= 200) {
          tierLabel = '👑 VIP Diamond';
          tierBadgeClass = 'bg-purple-100 text-purple-900 border-purple-300';
          rewardCode = 'VIP5';
          rewardDesc = 'ចុះ $5.00 ឬ 15%';
        } else if (c.ordersCount >= 3 || c.totalSpent >= 100) {
          tierLabel = '🥇 Gold Member';
          tierBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
          rewardCode = 'KHMERNEWYEAR';
          rewardDesc = 'បញ្ចុះតម្លៃ 15%';
        } else if (c.ordersCount >= 2 || c.totalSpent >= 40) {
          tierLabel = '🥈 Silver Member';
          tierBadgeClass = 'bg-blue-100 text-blue-900 border-blue-300';
          rewardCode = 'WELCOME2';
          rewardDesc = 'ចុះ $2.00';
        }

        return {
          ...c,
          aov,
          tierLabel,
          tierBadgeClass,
          rewardCode,
          rewardDesc
        };
      })
      .sort((a, b) => b.ordersCount !== a.ordersCount ? b.ordersCount - a.ordersCount : b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Helper ចម្លងកូដរង្វាន់សម្រាប់អតិថិជន
    const handleCopyRewardCode = (customer) => {
      const code = customer.rewardCode || 'SABAY10';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
        setRewardCopiedMsg(`🎉 បានចម្លងកូដ [${code}] ជូនអតិថិជន ${customer.name} រួចរាល់! អាចផ្ញើតាម Telegram ឬ SMS`);
        setTimeout(() => setRewardCopiedMsg(''), 4000);
      }
    };

    // ៥. គណនាចំណូលប្រចាំ ៧ ថ្ងៃចុងក្រោយសម្រាប់ Bar Chart
    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - (i * 86400000));
      const dStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('km-KH', { weekday: 'short' });
      const dayRev = realOrders
        .filter(o => o.status !== 'Cancelled' && o.created_at && o.created_at.slice(0, 10) === dStr)
        .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
      last7DaysData.push({ date: dStr, label: dayName, revenue: dayRev });
    }
    const maxDayRevenue = Math.max(...last7DaysData.map(d => d.revenue), 10);

    // ៦. មុខងារទាញយករបាយការណ៍ជា Excel / CSV
    const exportSalesToCSV = () => {
      if (finalFilteredOrders.length === 0) return alert('គ្មានទិន្នន័យសម្រាប់ Export ទេ!');
      const headers = ['Order ID', 'កាលបរិច្ឆេទ', 'ប៉ុស្តិ៍លក់', 'ឈ្មោះអតិថិជន', 'លេខទូរស័ព្ទ', 'ចំនួនទំនិញ', 'វិធីទូទាត់', 'ស្ថានភាព', 'ចំណូលសរុប ($)', 'ថ្លៃដើម ($)', 'ចំណេញ ($)'];
      const rows = finalFilteredOrders.map(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        const cost = items.reduce((sum, it) => {
          const prod = products.find(p => p.id === it.id);
          return sum + ((prod && prod.cost_price ? parseFloat(prod.cost_price) : 0) * (it.qty || 1));
        }, 0);
        const total = parseFloat(o.total || 0);
        const profit = total - cost;
        return [
          o.order_id || o.id,
          o.created_at ? new Date(o.created_at).toLocaleString() : '',
          o.order_type || 'POS',
          `"${(o.customer || 'អតិថិជនទូទៅ').replace(/"/g, '""')}"`,
          o.phone || 'N/A',
          items.reduce((s, it) => s + (it.qty || 1), 0),
          o.payment || 'Cash',
          o.status || 'Completed',
          total.toFixed(2),
          cost.toFixed(2),
          profit.toFixed(2)
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Sabay_Luk_Sales_${analyticsPeriod}_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="animate-in fade-in pb-12 space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2.5">
              <span>📊</span> ទិន្នន័យលក់ & ប្រវត្តិលក់ស្តង់ដារ (Sales Analytics)
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-bold">
              របាយការណ៍ហិរញ្ញវត្ថុ ចំណូល ចំណេញសុទ្ធ និងប្រវត្តិលក់លម្អិតចេញពីប្រព័ន្ធ POS និង Website
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={fetchRealOrders}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-2xs transition flex items-center gap-1.5"
            >
              <span>🔄</span> Refresh
            </button>
            <button 
              onClick={exportSalesToCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
            >
              <span>📥</span> Export CSV / Excel
            </button>
          </div>
        </div>

        {/* Date Filter & Channel Filter Bar */}
        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-gray-500 uppercase mr-1 flex items-center gap-1">
              <span>📅</span> កាលបរិច្ឆេទ:
            </span>
            {[
              { id: 'today', label: '⚡ ថ្ងៃនេះ' },
              { id: 'yesterday', label: '📅 ម្សិលមិញ' },
              { id: '7days', label: '📊 ៧ ថ្ងៃចុងក្រោយ' },
              { id: 'month', label: '📆 ខែនេះ' },
              { id: 'all', label: '🌐 ទាំងអស់' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setAnalyticsPeriod(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  analyticsPeriod === p.id 
                    ? 'bg-slate-900 text-white shadow-sm font-black' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">ប៉ុស្តិ៍លក់:</span>
            <select
              value={analyticsChannel}
              onChange={(e) => setAnalyticsChannel(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-gray-50 text-gray-800 outline-none"
            >
              <option value="all">🏪 គ្រប់ប៉ុស្តិ៍លក់</option>
              <option value="POS">🛒 POS មុខហាង</option>
              <option value="ONLINE">🌐 Website Online</option>
            </select>
          </div>
        </div>

        {/* ⭐️ 1. ផ្ទាំងសង្ខេបប្រាក់ចំណេញសុទ្ធតាមពេលវេលា (NET PROFIT & LOSS TIME-SERIES BREAKDOWN) ⭐️ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>📈</span> ប្រាក់ចំណេញសុទ្ធពិតប្រាកដ (Net Profit Overview)
            </h3>
            <span className="text-[10px] font-bold text-gray-400">គណនា៖ តម្លៃលក់ចេញ - ថ្លៃដើមទុនទំនិញ</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. ចំណេញសុទ្ធថ្ងៃនេះ */}
            <div className="bg-white p-5 rounded-3xl border-2 border-emerald-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-emerald-400 transition">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-black text-emerald-800 uppercase flex items-center gap-1">
                    <span>⚡</span> ចំណេញសុទ្ធថ្ងៃនេះ (Today)
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">{todayPnl.count} វិក្កយបត្រ • {todayPnl.itemsCount} មុខ</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                  {todayPnl.margin.toFixed(0)}% Margin
                </span>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-emerald-600">+${todayPnl.profit.toFixed(2)}</p>
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
                  <span>ចំណូល: <b className="text-gray-900">${todayPnl.rev.toFixed(2)}</b></span>
                  <span>ថ្លៃដើម: <b className="text-gray-500">${todayPnl.cost.toFixed(2)}</b></span>
                </div>
              </div>
            </div>

            {/* 2. ចំណេញសុទ្ធ ៧ ថ្ងៃចុងក្រោយ */}
            <div className="bg-white p-5 rounded-3xl border-2 border-blue-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-blue-400 transition">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-black text-blue-800 uppercase flex items-center gap-1">
                    <span>📊</span> ចំណេញសុទ្ធ ៧ ថ្ងៃ (Week)
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">{weekPnl.count} វិក្កយបត្រ • {weekPnl.itemsCount} មុខ</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                  {weekPnl.margin.toFixed(0)}% Margin
                </span>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-blue-600">+${weekPnl.profit.toFixed(2)}</p>
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
                  <span>ចំណូល: <b className="text-gray-900">${weekPnl.rev.toFixed(2)}</b></span>
                  <span>ថ្លៃដើម: <b className="text-gray-500">${weekPnl.cost.toFixed(2)}</b></span>
                </div>
              </div>
            </div>

            {/* 3. ចំណេញសុទ្ធខែនេះ */}
            <div className="bg-white p-5 rounded-3xl border-2 border-purple-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-purple-400 transition">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-black text-purple-800 uppercase flex items-center gap-1">
                    <span>📆</span> ចំណេញសុទ្ធខែនេះ (Month)
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">{monthPnl.count} វិក្កយបត្រ • {monthPnl.itemsCount} មុខ</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                  {monthPnl.margin.toFixed(0)}% Margin
                </span>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-purple-600">+${monthPnl.profit.toFixed(2)}</p>
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
                  <span>ចំណូល: <b className="text-gray-900">${monthPnl.rev.toFixed(2)}</b></span>
                  <span>ថ្លៃដើម: <b className="text-gray-500">${monthPnl.cost.toFixed(2)}</b></span>
                </div>
              </div>
            </div>

            {/* 4. ចំណេញសុទ្ធសរុបទាំងអស់ */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-black text-emerald-400 uppercase flex items-center gap-1">
                    <span>🏆</span> ចំណេញសុទ្ធសរុប (All Time)
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">{allPnl.count} វិក្កយបត្រ • {allPnl.itemsCount} មុខ</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {allPnl.margin.toFixed(0)}%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-emerald-400">+${allPnl.profit.toFixed(2)}</p>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mt-1.5 pt-1.5 border-t border-slate-700/60">
                  <span>ចំណូល: <b>${allPnl.rev.toFixed(0)}</b></span>
                  <span>≈ {(allPnl.profit * exchangeRate).toLocaleString()} ៛</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ⭐️ 2. តារាងរបាយការណ៍ហិរញ្ញវត្ថុចំណេញ-ខាត (CONSOLIDATED P&L FINANCIAL STATEMENT) ⭐️ */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2">
                <span>📑</span> តារាងរបាយការណ៍ចំណេញ-ខាត (P&L Financial Statement) — {
                  analyticsPeriod === 'today' ? 'ថ្ងៃនេះ' :
                  analyticsPeriod === 'yesterday' ? 'ម្សិលមិញ' :
                  analyticsPeriod === '7days' ? '៧ ថ្ងៃចុងក្រោយ' :
                  analyticsPeriod === 'month' ? 'ខែនេះ' : 'សរុបទាំងអស់'
                }
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">បែងចែកចំណូលពីការលក់, ថ្លៃដើមទំនិញ និងប្រាក់ចំណេញដុល/សុទ្ធច្បាស់លាស់</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-3 py-1 rounded-xl bg-gray-100 text-gray-800">
                {totalOrdersCount} វិក្កយបត្រ
              </span>
              <span className="text-xs font-black px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                Profit Margin: {profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Step 1: Gross Sales */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-600 uppercase">១. ចំណូលលក់សរុប (Revenue)</span>
                <span className="text-base">💵</span>
              </div>
              <p className="text-2xl font-black text-gray-900">${totalRevenue.toFixed(2)}</p>
              <div className="text-[11px] text-gray-500 space-y-0.5 pt-1 border-t border-gray-200">
                <div className="flex justify-between"><span>លក់តាម POS មុខហាង:</span> <b>${posRevenue.toFixed(2)}</b></div>
                <div className="flex justify-between"><span>លក់តាម Website Online:</span> <b>${onlineRevenue.toFixed(2)}</b></div>
              </div>
            </div>

            {/* Step 2: Cost of Goods Sold */}
            <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-red-800 uppercase">២. ថ្លៃដើមទំនិញ (Cost / COGS)</span>
                <span className="text-base">📦</span>
              </div>
              <p className="text-2xl font-black text-red-600">-${totalCost.toFixed(2)}</p>
              <div className="text-[11px] text-red-700 space-y-0.5 pt-1 border-t border-red-200">
                <div className="flex justify-between"><span>ទំនិញលក់បានសរុប:</span> <b>{totalItemsSold} មុខ/គូ</b></div>
                <div className="flex justify-between"><span>ថ្លៃដើមធៀបចំណូល:</span> <b>{totalRevenue > 0 ? ((totalCost / totalRevenue) * 100).toFixed(1) : 0}%</b></div>
              </div>
            </div>

            {/* Step 3: Net Profit */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border-2 border-emerald-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 uppercase">៣. ប្រាក់ចំណេញសុទ្ធ (Net Profit)</span>
                <span className="text-base">🏆</span>
              </div>
              <p className="text-2xl font-black text-emerald-700">+${grossProfit.toFixed(2)}</p>
              <div className="text-[11px] text-emerald-800 space-y-0.5 pt-1 border-t border-emerald-200">
                <div className="flex justify-between"><span>គិតជាប្រាក់រៀល:</span> <b>≈ {(grossProfit * exchangeRate).toLocaleString()} ៛</b></div>
                <div className="flex justify-between"><span>អត្រាចំណេញ (Margin):</span> <b>{profitMargin.toFixed(1)}%</b></div>
              </div>
            </div>
          </div>
        </div>

        {/* ⭐️ TOAST NOTIFICATION FOR REWARD CODE COPY ⭐️ */}
        {rewardCopiedMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 border border-emerald-500/40">
            <span className="text-2xl animate-bounce">🎁</span>
            <span className="text-xs font-bold leading-relaxed">{rewardCopiedMsg}</span>
          </div>
        )}

        {/* ⭐️ 7-DAY REVENUE BAR CHART ⭐️ */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>📊</span> គំនូសតាងចំណូល ៧ ថ្ងៃចុងក្រោយ
              </h4>
              <p className="text-xs text-gray-400 font-bold mt-0.5">តាមដានការកើនឡើងនៃចំណូលប្រចាំថ្ងៃ និងនិន្នាការនៃការលក់</p>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
              ចំណូលសរុប ៧ ថ្ងៃ: ${last7DaysData.reduce((s, d) => s + d.revenue, 0).toFixed(2)}
            </span>
          </div>

          {/* Bars Container */}
          <div className="grid grid-cols-7 gap-2 items-end h-48 pt-6 border-b border-gray-100 pb-2">
            {last7DaysData.map((d, idx) => {
              const heightPercent = maxDayRevenue > 0 ? Math.max(12, Math.round((d.revenue / maxDayRevenue) * 100)) : 12;
              const isToday = d.date === todayStr;

              return (
                <div key={idx} className="flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-black text-gray-600 opacity-0 group-hover:opacity-100 transition duration-200">
                    ${d.revenue.toFixed(0)}
                  </span>
                  <div 
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 ${
                      isToday 
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-md shadow-emerald-500/20' 
                        : 'bg-gradient-to-t from-blue-600 to-indigo-400 hover:from-blue-700 hover:to-indigo-500'
                    }`}
                  />
                  <span className={`text-[11px] font-bold ${isToday ? 'text-emerald-700 font-black' : 'text-gray-500'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ⭐️ 2-COLUMNS: TOP 5 BEST-SELLING PRODUCTS & TOP REPEAT CUSTOMERS ⭐️ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Top 5 Best-Selling & Profitable Products */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
              <div>
                <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>🏆</span> តារាងទំនិញលក់ដាច់បំផុត (Top 5 Best-Sellers)
                </h4>
                <p className="text-xs text-gray-400 font-bold mt-0.5">វិភាគទំនិញដែលរកចំណូល និងប្រាក់ចំណេញបានច្រើនជាងគេ</p>
              </div>

              {/* Sort Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setTopProductsSortBy('profit')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    topProductsSortBy === 'profit' 
                      ? 'bg-emerald-600 text-white shadow-xs font-black' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  💎 ចំណេញ
                </button>
                <button
                  type="button"
                  onClick={() => setTopProductsSortBy('revenue')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    topProductsSortBy === 'revenue' 
                      ? 'bg-slate-900 text-white shadow-xs font-black' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  💰 ចំណូល
                </button>
                <button
                  type="button"
                  onClick={() => setTopProductsSortBy('qty')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    topProductsSortBy === 'qty' 
                      ? 'bg-blue-600 text-white shadow-xs font-black' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🔥 ចំនួន
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {topSellingProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs font-bold">
                  មិនទាន់មានទិន្នន័យលក់ផលិតផលក្នុងចន្លោះពេលនេះនៅឡើយទេ។
                </div>
              ) : (
                topSellingProducts.map((p, idx) => {
                  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-gray-100/60 transition space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl select-none shrink-0">{medals[idx] || (idx + 1)}</span>
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-11 h-11 rounded-xl object-cover border border-gray-200 bg-white shrink-0 shadow-2xs" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gray-200 text-[9px] font-bold text-gray-400 flex items-center justify-center shrink-0">No Pic</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-black text-gray-900 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-0.5">
                              <span className="bg-gray-200/70 text-gray-600 px-1.5 py-0.5 rounded-md">{p.category || 'ទូទៅ'}</span>
                              <span>SKU: {p.sku || 'N/A'}</span>
                              <span>• លក់បាន: <b className="text-gray-700">{p.qty} មុខ</b></span>
                            </div>
                          </div>
                        </div>

                        {/* Revenue & Profit */}
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-emerald-600">
                            +${p.profit.toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">ចំណេញ</span>
                          </p>
                          <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                            ចំណូល: ${p.revenue.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Financial Bar Breakdown */}
                      <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] font-bold text-gray-500">
                        <div className="flex items-center gap-3">
                          <span>ថ្លៃដើម COGS: <b className="text-red-500">${p.cost.toFixed(2)}</b></span>
                          <span className="text-gray-300">|</span>
                          <span>ចំណូលសរុប: <b className="text-gray-800">${p.revenue.toFixed(2)}</b></span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px]">
                          Margin: {p.margin.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Top Repeat Customers (Loyalty & VIP Insights) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>❤️</span> អតិថិជនស្មោះត្រង់ (Top Repeat VIPs)
                </h4>
                <p className="text-xs text-gray-400 font-bold mt-0.5">អតិថិជនទិញច្រើនដង និងរក្សាភ្ញៀវម៉ូយ</p>
              </div>
              <span className="text-[11px] font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-100">
                Top 5 VIPs
              </span>
            </div>

            <div className="space-y-3">
              {topRepeatCustomers.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs font-bold">
                  មិនទាន់មានទិន្នន័យអតិថិជនទិញដដែលៗនៅឡើយទេ។
                </div>
              ) : (
                topRepeatCustomers.map((c, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-gray-100/60 transition space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {c.name ? c.name.slice(0, 2).toUpperCase() : 'VIP'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-black text-gray-900">{c.name}</p>
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border ${c.tierBadgeClass}`}>
                              {c.tierLabel}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-bold">{c.phone || 'គ្មានលេខទូរស័ព្ទ'}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-purple-700">${c.totalSpent.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{c.ordersCount} លើក</p>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-[10px] font-bold">
                      <div className="text-gray-500">
                        <span>AOV: <b>${c.aov.toFixed(1)}/កន្ត្រក</b></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {c.telegram && (
                          <a
                            href={`https://t.me/${c.telegram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                            title="ផ្ញើសារ Telegram"
                          >
                            <span>✈️</span> Chat
                          </a>
                        )}
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                            title="ហៅទូរស័ព្ទ"
                          >
                            <span>📞</span> Call
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyRewardCode(c)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-black transition flex items-center gap-1 shadow-xs active:scale-95"
                          title={`ចម្លងកូដ ${c.rewardCode} ជូនភ្ញៀវ (${c.rewardDesc})`}
                        >
                          <span>🎁</span> កូដ {c.rewardCode}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* ⭐️ DETAILED SALES HISTORY TABLE (តារាងប្រវត្តិលក់លម្អិតស្តង់ដារ) ⭐️ */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/60">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <span>📋</span> ប្រវត្តិការលក់លម្អិត ({finalFilteredOrders.length} វិក្កយបត្រ)
              </h3>
              <p className="text-xs text-gray-500 font-bold mt-0.5">
                ចុចលើប៊ូតុងសកម្មភាពដើម្បីមើលទំនិញលម្អិត បោះពុម្ពវិក្កយបត្រ ឬពិនិត្យ Slip ផ្ទេរប្រាក់
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={analyticsSearch}
                onChange={(e) => setAnalyticsSearch(e.target.value)}
                placeholder="ស្វែងរក Order ID ឬឈ្មោះភ្ញៀវ..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white outline-none focus:border-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/90 border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">កាលបរិច្ឆេទ & ម៉ោង</th>
                  <th className="px-5 py-3.5">ប៉ុស្តិ៍</th>
                  <th className="px-5 py-3.5">អតិថិជន</th>
                  <th className="px-5 py-3.5">វិធីទូទាត់</th>
                  <th className="px-5 py-3.5 text-right">ថ្លៃដើម ($)</th>
                  <th className="px-5 py-3.5 text-right">ចំណូល ($)</th>
                  <th className="px-5 py-3.5 text-right">ចំណេញ ($)</th>
                  <th className="px-5 py-3.5 text-center">ស្ថានភាព</th>
                  <th className="px-5 py-3.5 text-right pr-6">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-xs">
                {finalFilteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-16 text-gray-400 font-bold">
                      មិនមានទិន្នន័យការលក់ត្រូវតាមការកំណត់នេះទេ។
                    </td>
                  </tr>
                ) : (
                  finalFilteredOrders.map(order => {
                    const items = Array.isArray(order.items) ? order.items : [];
                    const cost = items.reduce((sum, it) => {
                      const prod = products.find(p => p.id === it.id);
                      return sum + ((prod && prod.cost_price ? parseFloat(prod.cost_price) : 0) * (it.qty || 1));
                    }, 0);
                    const total = parseFloat(order.total || 0);
                    const profit = Math.max(0, total - cost);
                    const isOnline = (order.order_type || 'POS').toUpperCase() === 'ONLINE';

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition">
                        <td className="px-5 py-3.5 font-black text-blue-600">
                          {order.order_id || order.id}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap font-bold">
                          {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isOnline ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {order.order_type || 'POS'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-gray-900">{order.customer || 'អតិថិជនទូទៅ'}</p>
                          {order.phone && order.phone !== 'N/A' && (
                            <p className="text-[10px] text-gray-400">{order.phone}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold">
                              {order.payment || 'Cash'}
                            </span>
                            {(order.payment_slip_url || (items[0] && items[0].payment_slip_url)) && (
                              <button
                                onClick={() => setViewingSlipUrl(order.payment_slip_url || items[0].payment_slip_url)}
                                className="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-black"
                                title="មើល Slip ផ្ទេរប្រាក់"
                              >
                                🧾 Slip
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right text-gray-500 font-bold">
                          ${cost.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-gray-900">
                          ${total.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-emerald-600">
                          +${profit.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <select
                              value={order.status || 'Pending'}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className={`text-[11px] font-bold border rounded-xl px-2.5 py-1.5 outline-none cursor-pointer shadow-2xs transition ${
                                order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                order.status === 'Preparing' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' :
                                order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-300' :
                                'bg-amber-50 text-amber-700 border-amber-300'
                              }`}
                            >
                              <option value="Pending">🟡 រង់ចាំបញ្ជាក់ (Pending)</option>
                              <option value="Preparing">🔵 កំពុងវេចខ្ចប់ (Processing)</option>
                              <option value="Shipped">🚚 កំពុងដឹក (Out for Delivery)</option>
                              <option value="Completed">🟢 ជោគជ័យ (Delivered)</option>
                              <option value="Cancelled">❌ បោះបង់ (Cancelled)</option>
                            </select>

                            {/* 1-Click Fast Progress Button */}
                            {(!order.status || order.status === 'Pending') && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'Preparing')}
                                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black px-2 py-1.5 rounded-lg shadow-xs transition"
                                title="ចុចប្តូរទៅដំណាក់កាលទី ២៖ កំពុងរៀបចំវេចខ្ចប់"
                              >
                                🔵 វេចខ្ចប់
                              </button>
                            )}
                            {order.status === 'Preparing' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'Shipped')}
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-black px-2 py-1.5 rounded-lg shadow-xs transition animate-pulse"
                                title="ចុចប្តូរទៅដំណាក់កាលទី ៣៖ កំពុងដឹកជញ្ជូន"
                              >
                                🚚 បញ្ជូនដឹក
                              </button>
                            )}
                            {order.status === 'Shipped' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'Completed')}
                                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black px-2 py-1.5 rounded-lg shadow-xs transition"
                                title="ចុចប្តូរទៅដំណាក់កាលទី ៤៖ បានប្រគល់ជោគជ័យ"
                              >
                                🟢 ជោគជ័យ
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right pr-6 whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-blue-200 transition"
                            title="មើលមុខទំនិញដែលបានទិញ"
                          >
                            👁️ មើល
                          </button>
                          <button
                            onClick={() => {
                              setReceiptData({
                                orderId: order.order_id || order.id,
                                date: order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString(),
                                items: items,
                                subtotal: order.subtotal || order.total,
                                discount: order.discount || 0,
                                total: order.total,
                                totalKHR: Math.round((order.total || 0) * exchangeRate),
                                method: order.payment || 'Cash',
                                tendered: order.total,
                                change: 0,
                                customer: order.customer,
                                phone: order.phone
                              });
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-gray-300 transition"
                            title="បោះពុម្ពវិក្កយបត្រឡើងវិញ"
                          >
                            🖨️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };


  // State សម្រាប់ Modal មើលលម្អិតការបញ្ជាទិញ (View Order Detail Modal)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [searchOrder, setSearchOrder] = useState('');
  const [viewingSlipUrl, setViewingSlipUrl] = useState(null);

  // ⭐️ ផ្ទាំងប្រវត្តិការបញ្ជាទិញ FULL OPTION (ORDERS HISTORY VIEW) ⭐️
  const OrdersView = () => {
    // (លុប useState ចេញពីត្រង់នេះ គឺដំណើរការស្រួលភ្លាម)
    const filteredOrders = realOrders.filter(o => {
      const matchStatus = orderFilterStatus === 'all' ? true : o.status === orderFilterStatus;
      const orderIdStr = (o.order_id || o.id || '').toString().toLowerCase();
      const customerStr = (o.customer || '').toLowerCase();
      const matchSearch = orderIdStr.includes(searchOrder.toLowerCase()) || customerStr.includes(searchOrder.toLowerCase());
      return matchStatus && matchSearch;
    });

    return (
      <div className="animate-in fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900">🛒 ប្រវត្តិការទិញ-លក់ (Order History)</h2>
            <p className="text-sm text-gray-500 mt-0.5">តាមដានរាល់វិក្កយបត្រ មើលមុខទំនិញដែលបានទិញ និងបោះពុម្ពវិក្កយបត្រឡើងវិញ</p>
          </div>
          
          <div className="flex gap-3 items-center">
            <input 
              type="text"
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
              placeholder="ស្វែងរក Order ID ឬឈ្មោះភ្ញៀវ..."
              className="border-2 border-gray-200 px-4 py-2 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white"
            />
            <button 
              type="button"
              onClick={exportOrdersToCSV}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="ទាញយកបញ្ជីលក់ជា Excel/CSV"
            >
              <span>📊</span>
              <span>Export Excel</span>
            </button>
            <button 
              onClick={fetchRealOrders}
              className="bg-white border border-gray-200 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-gray-50 transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {['all', 'Completed', 'Preparing', 'Shipped', 'Cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setOrderFilterStatus(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                orderFilterStatus === st 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {st === 'all' && `ទាំងអស់ (${realOrders.length})`}
              {st === 'Completed' && '✓ ជោគជ័យ (Completed)'}
              {st === 'Preparing' && '⏳ កំពុងរៀបចំ (Preparing)'}
              {st === 'Shipped' && '🚚 កំពុងដឹក (Shipped)'}
              {st === 'Cancelled' && '✕ បានបោះបង់'}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          {loadingOrders ? (
            <div className="p-16 text-center text-gray-400 font-bold">កំពុងទាញយកប្រវត្តិការបញ្ជាទិញ...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-16 text-center text-gray-400 font-bold">មិនទាន់មានប្រវត្តិការបញ្ជាទិញនៅឡើយទេ។</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase">កាលបរិច្ឆេទ</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase">អតិថិជន</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase">ប្រភេទ</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase">វិធីទូទាត់</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase">តម្លៃសរុប</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase">ស្ថានភាព</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase text-right pr-6">សកម្មភាព (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredOrders.map(order => {
                    let statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    if (order.status === 'Completed') statusColor = 'bg-green-50 text-green-700 border-green-200';
                    if (order.status === 'Shipped') statusColor = 'bg-purple-50 text-purple-700 border-purple-200';
                    if (order.status === 'Cancelled') statusColor = 'bg-red-50 text-red-700 border-red-200';

                    const displayId = order.order_id || order.id;

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition">
                        <td className="px-6 py-4 font-black text-blue-600 text-xs">{displayId}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {order.created_at ? new Date(order.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : 'POS Sale'}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 text-xs">{order.customer || 'អតិថិជនទូទៅ'}</p>
                          {order.phone && <p className="text-[10px] text-gray-400 font-bold">{order.phone}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${order.order_type === 'ONLINE' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-700'}`}>
                            {order.order_type || 'POS'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-gray-100 px-2 py-1 rounded-md">{order.payment || 'Cash'}</span>
                            {(order.payment_slip_url || (Array.isArray(order.items) && order.items[0]?.payment_slip_url)) && (
                              <button 
                                onClick={() => setViewingSlipUrl(order.payment_slip_url || order.items[0]?.payment_slip_url)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-black text-[10px] px-2 py-1 rounded-lg border border-blue-200 transition inline-flex items-center gap-1 shadow-2xs"
                                title="ពិនិត្យវិក្កយបត្រផ្ទេរប្រាក់ (Payment Slip)"
                              >
                                🧾 Slip
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-black text-sm text-green-600">${parseFloat(order.total || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{(parseFloat(order.total || 0) * exchangeRate).toLocaleString()} ៛</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={order.status || 'Pending'}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className={`text-xs font-bold border rounded-xl px-2.5 py-1.5 outline-none cursor-pointer shadow-2xs transition ${
                                order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                order.status === 'Preparing' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' :
                                order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-300' :
                                'bg-amber-50 text-amber-700 border-amber-300'
                              }`}
                            >
                              <option value="Pending">🟡 រង់ចាំបញ្ជាក់ (Pending)</option>
                              <option value="Preparing">🔵 កំពុងវេចខ្ចប់ (Processing)</option>
                              <option value="Shipped">🚚 កំពុងដឹក (Out for Delivery)</option>
                              <option value="Completed">🟢 ជោគជ័យ (Delivered)</option>
                              <option value="Cancelled">❌ បោះបង់ (Cancelled)</option>
                            </select>

                            {/* 1-Click Fast Progress Button */}
                            {(!order.status || order.status === 'Pending') && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'Preparing')}
                                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black px-2 py-1.5 rounded-lg shadow-xs transition"
                                title="ចុចប្តូរទៅដំណាក់កាលទី ២៖ កំពុងរៀបចំវេចខ្ចប់"
                              >
                                🔵 វេចខ្ចប់
                              </button>
                            )}
                            {order.status === 'Preparing' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'Shipped')}
                                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-black px-2 py-1.5 rounded-lg shadow-xs transition animate-pulse"
                                title="ចុចប្តូរទៅដំណាក់កាលទី ៣៖ កំពុងដឹកជញ្ជូន"
                              >
                                🚚 បញ្ជូនដឹក
                              </button>
                            )}
                            {order.status === 'Shipped' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'Completed')}
                                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black px-2 py-1.5 rounded-lg shadow-xs transition"
                                title="ចុចប្តូរទៅដំណាក់កាលទី ៤៖ បានប្រគល់ជោគជ័យ"
                              >
                                🟢 ជោគជ័យ
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right pr-6 space-x-1.5 whitespace-nowrap">
                          {/* ⭐️ ប៊ូតុងមើលលម្អិតទំនិញ ⭐️ */}
                          <button 
                            onClick={() => setSelectedOrderDetails(order)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-blue-200 transition"
                            title="មើលមុខទំនិញដែលបានទិញ"
                          >
                            👁️ មើលទំនិញ
                          </button>

                          {/* ⭐️ ប៊ូតុង Re-Print វិក្កយបត្រ ⭐️ */}
                          <button 
                            onClick={() => {
                              const items = order.items && Array.isArray(order.items) ? order.items : [];
                              setReceiptData({
                                orderId: displayId,
                                date: order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString(),
                                items: items,
                                subtotal: order.subtotal || order.total,
                                discount: order.discount || 0,
                                total: order.total,
                                totalKHR: Math.round(order.total * exchangeRate),
                                method: order.payment || 'Cash',
                                tendered: order.total,
                                change: 0,
                                customer: order.customer
                              });
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-gray-300 transition"
                            title="បោះពុម្ពវិក្កយបត្រឡើងវិញ"
                          >
                            🖨️ Re-Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ⭐️ MODAL មើលលម្អិតមុខទំនិញក្នុង ORDER (VIEW ORDER ITEMS MODAL) ⭐️ */}
        {selectedOrderDetails && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-black text-gray-900">📦 មុខទំនិញក្នុងវិក្កយបត្រ #{selectedOrderDetails.order_id || selectedOrderDetails.id}</h3>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">អតិថិជន: {selectedOrderDetails.customer || 'ទូទៅ'}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrderDetails(null)} 
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Items List */}
              <div className="max-h-80 overflow-y-auto space-y-3 pr-1 mb-5">
                {selectedOrderDetails.items && Array.isArray(selectedOrderDetails.items) && selectedOrderDetails.items.length > 0 ? (
                  selectedOrderDetails.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      {item.image_url ? (
                        <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover bg-white border shrink-0" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-bold">No Pic</div>
                      )}
                      <div className="flex-1">
                        <h4 className="text-xs font-black text-gray-900 line-clamp-1">{item.name}</h4>
                        <div className="flex gap-2 mt-0.5 text-[10px]">
                          {item.size && item.size !== 'N/A' && <span className="bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded">Size: {item.size}</span>}
                          {item.color && item.color !== 'N/A' && <span className="bg-gray-200 text-gray-700 font-bold px-1.5 py-0.5 rounded">{item.color}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-500">${item.price} x {item.qty}</p>
                        <p className="text-sm font-black text-blue-600">${(item.price * item.qty).toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-xs font-bold">
                    វិក្កយបត្រចាស់នេះមិនទាន់មានបញ្ជីទំនិញលម្អិតទេ។
                  </div>
                )}
              </div>

              {/* Order Total Summary */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5 text-xs font-bold">
                <div className="flex justify-between text-gray-500">
                  <span>វិធីទូទាត់:</span>
                  <span className="text-gray-900">{selectedOrderDetails.payment || 'Cash'}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>ទឹកប្រាក់សរុប:</span>
                  <span className="text-blue-600">${parseFloat(selectedOrderDetails.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Delivery Address, Google Maps & House Photo */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5 mt-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-gray-500 block text-[10px] uppercase">អាសយដ្ឋានដឹកជញ្ជូន:</span>
                    <p className="font-bold text-gray-900 mt-0.5 break-words">
                      {(selectedOrderDetails.address || selectedOrderDetails.delivery_address || 'មិនមានអាសយដ្ឋាន').replace(/\[📍\s*Maps:[^\]]+\]/gi, '').replace(/\[🏠\s*រូបផ្ទះ:[^\]]+\]/gi, '').trim()}
                    </p>
                  </div>
                  {selectedOrderDetails.phone && (
                    <a
                      href={`tel:${selectedOrderDetails.phone}`}
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-xl font-black text-[10px] border border-emerald-200 shrink-0 flex items-center gap-1 transition shadow-2xs"
                    >
                      <span>📞</span> ខល
                    </a>
                  )}
                </div>

                {/* Google Maps Button */}
                {(() => {
                  const addr = selectedOrderDetails.address || selectedOrderDetails.delivery_address || '';
                  const match = addr.match(/\[📍\s*Maps:\s*([^\]]+)\]/i);
                  const mapUrl = match ? match[1].trim() : (selectedOrderDetails.items?.[0]?.google_map_url || null);
                  if (!mapUrl) return null;
                  return (
                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                        <span>🗺️</span> ទីតាំងលើ Google Maps:
                      </span>
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-[10px] font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <span>📍</span> បើកមើលលើ Maps
                      </a>
                    </div>
                  );
                })()}

                {/* House / Workplace Photo */}
                {(() => {
                  const addr = selectedOrderDetails.address || selectedOrderDetails.delivery_address || '';
                  const match = addr.match(/\[🏠\s*រូបផ្ទះ:\s*([^\]]+)\]/i);
                  const photoUrl = match ? match[1].trim() : (selectedOrderDetails.items?.[0]?.location_photo_url || null);
                  if (!photoUrl) return null;
                  return (
                    <div className="pt-2 border-t border-gray-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                          <span>🏠</span> រូបថតផ្ទះ / កន្លែងធ្វើការ:
                        </span>
                        <a
                          href={photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-blue-600 underline"
                        >
                          ពង្រីកធំ
                        </a>
                      </div>
                      <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-gray-200 bg-white group">
                        <img src={photoUrl} alt="House / Workplace Location" className="w-full h-32 object-cover group-hover:scale-105 transition" />
                      </a>
                    </div>
                  );
                })()}
              </div>

              {/* Payment Slip Display in Modal */}
              {(selectedOrderDetails.payment_slip_url || (Array.isArray(selectedOrderDetails.items) && selectedOrderDetails.items[0]?.payment_slip_url)) && (
                <div className="mt-4 p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                      <span>🧾</span> វិក្កយបត្រផ្ទេរប្រាក់ (Payment Slip):
                    </span>
                    <button 
                      onClick={() => setViewingSlipUrl(selectedOrderDetails.payment_slip_url || selectedOrderDetails.items[0]?.payment_slip_url)}
                      className="text-[11px] font-black text-blue-600 hover:text-blue-800 underline"
                    >
                      ពង្រីកមើលធំ
                    </button>
                  </div>
                  <div 
                    onClick={() => setViewingSlipUrl(selectedOrderDetails.payment_slip_url || selectedOrderDetails.items[0]?.payment_slip_url)}
                    className="cursor-pointer overflow-hidden rounded-xl border border-blue-200/80 bg-white group flex justify-center p-1"
                  >
                    <img 
                      src={selectedOrderDetails.payment_slip_url || selectedOrderDetails.items[0]?.payment_slip_url} 
                      alt="Payment Slip" 
                      className="h-44 w-auto object-contain rounded-lg group-hover:scale-105 transition duration-200 shadow-sm"
                    />
                  </div>
                </div>
              )}

              <button 
                onClick={() => setSelectedOrderDetails(null)}
                className="w-full mt-4 bg-slate-900 text-white py-3 rounded-2xl font-bold text-xs hover:bg-slate-800 transition"
              >
                បិទ (Close)
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  // ================= 💸 ផ្ទាំងគ្រប់គ្រងចំណាយ & គណនាប្រាក់ចំណេញសុទ្ធ (EXPENSES & TRUE NET PROFIT VIEW) =================
  const ExpensesView = () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
    const sevenDaysAgoTime = Date.now() - (7 * 86400000);
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // ១. ចម្រាញ់ Order តាមកាលបរិច្ឆេទ
    const periodOrders = realOrders.filter(o => {
      if (o.status === 'Cancelled') return false;
      if (!o.created_at) return true;
      const orderDateStr = o.created_at.slice(0, 10);
      const orderTime = new Date(o.created_at).getTime();

      if (expenseFilterPeriod === 'today') return orderDateStr === todayStr;
      if (expenseFilterPeriod === 'yesterday') return orderDateStr === yesterdayStr;
      if (expenseFilterPeriod === 'week') return orderTime >= sevenDaysAgoTime;
      if (expenseFilterPeriod === 'month') return orderDateStr >= monthStartStr;
      return true; // 'all'
    });

    // Helper គណនាថ្លៃដើមទំនិញ
    const getOrderCost = (order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      return items.reduce((sum, it) => {
        const prod = products.find(p => p.id === it.id);
        const costPerUnit = prod && prod.cost_price ? parseFloat(prod.cost_price) : 0;
        return sum + (costPerUnit * (it.qty || 1));
      }, 0);
    };

    const periodRevenue = periodOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount != null ? o.total_amount : o.total) || 0), 0);
    const periodCOGS = periodOrders.reduce((sum, o) => sum + getOrderCost(o), 0);
    const periodGrossProfit = Math.max(0, periodRevenue - periodCOGS);
    const grossMarginPercent = periodRevenue > 0 ? ((periodGrossProfit / periodRevenue) * 100) : 0;

    // ២. ចម្រាញ់ចំណាយតាមកាលបរិច្ឆេទ
    const filteredByPeriodExpenses = expenses.filter(exp => {
      if (!exp.date) return true;
      const expDateStr = exp.date.slice(0, 10);
      const expTime = new Date(exp.date).getTime();

      if (expenseFilterPeriod === 'today') return expDateStr === todayStr;
      if (expenseFilterPeriod === 'yesterday') return expDateStr === yesterdayStr;
      if (expenseFilterPeriod === 'week') return expTime >= sevenDaysAgoTime;
      if (expenseFilterPeriod === 'month') return expDateStr >= monthStartStr;
      return true; // 'all'
    });

    // ៣. ចម្រាញ់ចំណាយតាម Category និង Search
    const finalFilteredExpenses = filteredByPeriodExpenses.filter(exp => {
      const matchCat = expenseFilterCategory === 'all' || exp.category === expenseFilterCategory;
      const q = expenseSearch.toLowerCase();
      const matchSearch = !expenseSearch ||
        (exp.title || '').toLowerCase().includes(q) ||
        (exp.recipient || '').toLowerCase().includes(q) ||
        (exp.note || '').toLowerCase().includes(q) ||
        (exp.id || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    const periodTotalExpenses = filteredByPeriodExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const periodNetProfit = periodGrossProfit - periodTotalExpenses;
    const netMarginPercent = periodRevenue > 0 ? ((periodNetProfit / periodRevenue) * 100) : 0;
    const isProfitable = periodNetProfit >= 0;

    // ៤. វិភាគភាគរយចំណាយតាមប្រភេទនីមួយៗ
    const categoryTotals = EXPENSE_CATEGORIES.map(cat => {
      const catExpenses = filteredByPeriodExpenses.filter(e => e.category === cat.id);
      const total = catExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const percent = periodTotalExpenses > 0 ? ((total / periodTotalExpenses) * 100) : 0;
      return { ...cat, total, percent, count: catExpenses.length };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    // Save or Edit Expense
    const handleSaveExpense = async (e) => {
      e.preventDefault();
      if (!expTitle.trim()) {
        alert('សូមបញ្ចូលឈ្មោះ ឬបរិយាយចំណាយ!');
        return;
      }
      const numAmount = parseFloat(expAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        alert('សូមបញ្ចូលចំនួនទឹកប្រាក់ឱ្យបានត្រឹមត្រូវ (ធំជាង 0)!');
        return;
      }

      if (editingExpense) {
        const updated = expenses.map(item => item.id === editingExpense.id ? {
          ...item,
          title: expTitle.trim(),
          category: expCategory,
          amount: numAmount,
          date: expDate,
          paymentMethod: expPaymentMethod,
          recipient: expRecipient.trim(),
          note: expNote.trim()
        } : item);
        setExpenses(updated);
        try {
          await supabase.from('expenses').update({
            title: expTitle.trim(),
            category: expCategory,
            amount: numAmount,
            date: expDate,
            payment_method: expPaymentMethod,
            recipient: expRecipient.trim(),
            note: expNote.trim()
          }).eq('id', editingExpense.id);
        } catch (err) {}
        setToastNotification(`✅ បានកែប្រែចំណាយ "${expTitle}" ជោគជ័យ!`);
      } else {
        const newId = `EXP-${Date.now().toString().slice(-6)}`;
        const newRecord = {
          id: newId,
          title: expTitle.trim(),
          category: expCategory,
          amount: numAmount,
          date: expDate,
          paymentMethod: expPaymentMethod,
          recipient: expRecipient.trim(),
          note: expNote.trim(),
          created_at: new Date().toISOString()
        };
        setExpenses([newRecord, ...expenses]);
        try {
          await supabase.from('expenses').insert([{
            id: newId,
            title: expTitle.trim(),
            category: expCategory,
            amount: numAmount,
            date: expDate,
            payment_method: expPaymentMethod,
            recipient: expRecipient.trim(),
            note: expNote.trim()
          }]);
        } catch (err) {}
        setToastNotification(`✅ បានកត់ត្រាចំណាយថ្មី $${numAmount.toFixed(2)} ជោគជ័យ!`);
      }
      setTimeout(() => setToastNotification(null), 3500);
      setExpenseModalOpen(false);
      setEditingExpense(null);
      setExpTitle('');
      setExpAmount('');
      setExpRecipient('');
      setExpNote('');
    };

    const handleOpenEdit = (exp) => {
      setEditingExpense(exp);
      setExpTitle(exp.title || '');
      setExpCategory(exp.category || 'rent');
      setExpAmount(String(exp.amount || ''));
      setExpDate(exp.date ? exp.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setExpPaymentMethod(exp.paymentMethod || 'Cash');
      setExpRecipient(exp.recipient || '');
      setExpNote(exp.note || '');
      setExpenseModalOpen(true);
    };

    const handleDeleteExpense = async (id, title) => {
      if (!window.confirm(`តើបងពិតជាចង់លុបចំណាយ "${title}" នេះមែនទេ?`)) return;
      setExpenses(prev => prev.filter(e => e.id !== id));
      try {
        await supabase.from('expenses').delete().eq('id', id);
      } catch (err) {}
      setToastNotification(`🗑️ បានលុបចំណាយ "${title}" រួចរាល់!`);
      setTimeout(() => setToastNotification(null), 3000);
    };

    // Export to Excel
    const handleExportExcel = () => {
      if (finalFilteredExpenses.length === 0) {
        alert('មិនមានទិន្នន័យចំណាយសម្រាប់ទាញចេញទេ!');
        return;
      }
      const dataToExport = finalFilteredExpenses.map((exp, idx) => {
        const catObj = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
        return {
          'ល.រ': idx + 1,
          'លេខសម្គាល់ (ID)': exp.id,
          'កាលបរិច្ឆេទ': exp.date || '',
          'បរិយាយចំណាយ': exp.title || '',
          'ប្រភេទចំណាយ': catObj ? catObj.label : exp.category,
          'ទឹកប្រាក់ ($)': (parseFloat(exp.amount) || 0).toFixed(2),
          'ទឹកប្រាក់ (រៀល)': Math.round((parseFloat(exp.amount) || 0) * exchangeRate).toLocaleString() + ' ៛',
          'វិធីទូទាត់': exp.paymentMethod || 'Cash',
          'អ្នកទទួលប្រាក់': exp.recipient || '',
          'កំណត់ចំណាំ': exp.note || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Store_Expenses');
      XLSX.writeFile(workbook, `Sabay_Luk_Expenses_${expenseFilterPeriod}_${todayStr}.xlsx`);
    };

    const periodLabels = {
      'today': 'ថ្ងៃនេះ (Today)',
      'yesterday': 'ម្សិលមិញ (Yesterday)',
      'week': '៧ ថ្ងៃចុងក្រោយ (7 Days)',
      'month': 'ខែនេះ (This Month)',
      'all': 'ពេលវេលាទាំងអស់ (All Time)'
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                💸
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                  គ្រប់គ្រងចំណាយ & គណនាប្រាក់ចំណេញសុទ្ធ (Store Expenses & Net Profit)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  ដឹងច្បាស់ពីចំណូល ថ្លៃដើមទំនិញ ចំណាយប្រតិបត្តិការទូទៅ និងប្រាក់ចំណេញសុទ្ធពិតប្រាកដ (P&L Analysis)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-2xl border border-emerald-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>📥</span>
              <span>ទាញចេញ Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setExpTitle('');
                setExpCategory('rent');
                setExpAmount('');
                setExpDate(todayStr);
                setExpPaymentMethod('Cash');
                setExpRecipient('');
                setExpNote('');
                setExpenseModalOpen(true);
              }}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-2xl transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>កត់ត្រាចំណាយថ្មី</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200 w-fit">
          {[
            { id: 'today', label: '📅 ថ្ងៃនេះ' },
            { id: 'yesterday', label: '📅 ម្សិលមិញ' },
            { id: 'week', label: '📅 ៧ ថ្ងៃចុងក្រោយ' },
            { id: 'month', label: '📅 ខែនេះ' },
            { id: 'all', label: '📅 ទាំងអស់' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setExpenseFilterPeriod(tab.id)}
              className={`text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer ${
                expenseFilterPeriod === tab.id
                  ? 'bg-white text-emerald-700 shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ⭐️ 5 EXECUTIVE FINANCIAL KPI CARDS ⭐️ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* 1. REVENUE */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-gray-400 text-xs font-bold mb-1">
                <span>ចំណូលសរុប (Revenue)</span>
                <span className="text-base">💰</span>
              </div>
              <div className="text-xl font-black text-gray-900 mt-1">
                ${periodRevenue.toFixed(2)}
              </div>
              <div className="text-[10px] font-bold text-gray-400 mt-0.5">
                {(periodRevenue * exchangeRate).toLocaleString()} ៛
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-500 font-bold flex justify-between">
              <span>វិក្កយបត្រលក់:</span>
              <span className="text-gray-800">{periodOrders.length} Orders</span>
            </div>
          </div>

          {/* 2. COGS (COST OF GOODS SOLD) */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-gray-400 text-xs font-bold mb-1">
                <span>ថ្លៃដើមទំនិញ (COGS)</span>
                <span className="text-base">📦</span>
              </div>
              <div className="text-xl font-black text-rose-600 mt-1">
                ${periodCOGS.toFixed(2)}
              </div>
              <div className="text-[10px] font-bold text-gray-400 mt-0.5">
                {(periodCOGS * exchangeRate).toLocaleString()} ៛
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-500 font-bold flex justify-between">
              <span>សមាមាត្រថ្លៃដើម:</span>
              <span className="text-rose-600">{periodRevenue > 0 ? ((periodCOGS / periodRevenue) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>

          {/* 3. GROSS PROFIT */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-gray-400 text-xs font-bold mb-1">
                <span>ចំណេញដុល (Gross Profit)</span>
                <span className="text-base">📈</span>
              </div>
              <div className="text-xl font-black text-blue-600 mt-1">
                +${periodGrossProfit.toFixed(2)}
              </div>
              <div className="text-[10px] font-bold text-gray-400 mt-0.5">
                {(periodGrossProfit * exchangeRate).toLocaleString()} ៛
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-500 font-bold flex justify-between">
              <span>Gross Margin:</span>
              <span className="text-blue-600 font-black">{grossMarginPercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* 4. TOTAL OPERATIONAL EXPENSES */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-gray-400 text-xs font-bold mb-1">
                <span>ចំណាយប្រតិបត្តិការ (Expenses)</span>
                <span className="text-base">💸</span>
              </div>
              <div className="text-xl font-black text-amber-600 mt-1">
                -${periodTotalExpenses.toFixed(2)}
              </div>
              <div className="text-[10px] font-bold text-gray-400 mt-0.5">
                {(periodTotalExpenses * exchangeRate).toLocaleString()} ៛
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-500 font-bold flex justify-between">
              <span>ចំនួនប្រតិបត្តិការ:</span>
              <span className="text-amber-700">{filteredByPeriodExpenses.length} កំណត់ត្រា</span>
            </div>
          </div>

          {/* 5. TRUE NET PROFIT (THE CROWN METRIC) */}
          <div className={`rounded-3xl p-4 shadow-md flex flex-col justify-between text-white ${
            isProfitable 
              ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/20' 
              : 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 shadow-rose-500/20'
          }`}>
            <div>
              <div className="flex items-center justify-between text-white/80 text-xs font-bold mb-1">
                <span>ចំណេញសុទ្ធ (Net Profit)</span>
                <span className="text-base">{isProfitable ? '💎' : '⚠️'}</span>
              </div>
              <div className="text-2xl font-black tracking-tight mt-1">
                {isProfitable ? `+$${periodNetProfit.toFixed(2)}` : `-$${Math.abs(periodNetProfit).toFixed(2)}`}
              </div>
              <div className="text-[10px] font-bold text-white/80 mt-0.5">
                {(periodNetProfit * exchangeRate).toLocaleString()} ៛
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/20 text-[10px] text-white/90 font-black flex justify-between">
              <span>{isProfitable ? 'ចំណេញសុទ្ធពិត:' : 'ខាតបង់ប្រតិបត្តិការ:'}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full">{netMarginPercent.toFixed(1)}% Margin</span>
            </div>
          </div>

        </div>

        {/* ⭐️ FINANCIAL STATEMENT FLOW WATERFALL ⭐️ */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-lg border border-slate-700/60">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="text-base">📊</span>
              <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase text-slate-200">
                លំហូរគណនាប្រាក់ចំណេញសុទ្ធពិតប្រាកដ (P&L Formula Breakdown) — {periodLabels[expenseFilterPeriod]}
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-white/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-white/10 font-bold">
              GAAP Standard P&L
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ចំណូលពីការលក់</span>
              <div className="text-base sm:text-lg font-black text-emerald-400">${periodRevenue.toFixed(2)}</div>
              <span className="text-[9px] text-slate-400">(+) Gross Sales</span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 relative">
              <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-black text-rose-400 z-10 hidden md:flex">
                -
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ថ្លៃដើមទំនិញ</span>
              <div className="text-base sm:text-lg font-black text-rose-400">${periodCOGS.toFixed(2)}</div>
              <span className="text-[9px] text-slate-400">(-) COGS</span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 relative">
              <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-black text-blue-400 z-10 hidden md:flex">
                =
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ចំណេញដុល</span>
              <div className="text-base sm:text-lg font-black text-blue-400">${periodGrossProfit.toFixed(2)}</div>
              <span className="text-[9px] text-slate-400">(=) Gross Profit</span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 relative">
              <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-black text-amber-400 z-10 hidden md:flex">
                -
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">ចំណាយប្រតិបត្តិការ</span>
              <div className="text-base sm:text-lg font-black text-amber-400">${periodTotalExpenses.toFixed(2)}</div>
              <span className="text-[9px] text-slate-400">(-) OPEX</span>
            </div>

            <div className="col-span-2 md:col-span-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-3 border border-emerald-500/40 relative">
              <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-xs font-black text-slate-900 z-10 hidden md:flex">
                =
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-300 block mb-1">ចំណេញសុទ្ធពិតប្រាកដ</span>
              <div className={`text-base sm:text-lg font-black ${isProfitable ? 'text-emerald-300' : 'text-rose-400'}`}>
                ${periodNetProfit.toFixed(2)}
              </div>
              <span className="text-[9px] text-emerald-400/80 font-bold">(=) True Net Profit</span>
            </div>

          </div>
        </div>

        {/* ⭐️ EXPENSE BREAKDOWN BY CATEGORY ⭐️ */}
        {categoryTotals.length > 0 && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-base">🏷️</span>
                <h4 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide">
                  ការបែងចែកចំណាយតាមប្រភេទ (Expense Distribution)
                </h4>
              </div>
              <span className="text-xs text-gray-400 font-bold">
                សរុប {categoryTotals.length} ប្រភេទចំណាយ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categoryTotals.map(cat => (
                <div key={cat.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-emerald-200 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      <span className="truncate max-w-[130px]">{cat.label.split('(')[0]}</span>
                    </span>
                    <span className="text-xs font-black text-gray-900">${cat.total.toFixed(2)}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(5, cat.percent))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                    <span>{cat.count} កំណត់ត្រា</span>
                    <span className="text-emerald-600 font-black">{cat.percent.toFixed(1)}% នៃចំណាយ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ⭐️ EXPENSES TABLE & FILTER BAR ⭐️ */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          
          {/* Table Header Filter Toolbar */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="ស្វែងរកចំណាយ, អ្នកទទួល, កំណត់ចំណាំ..."
                className="w-full bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none transition"
              />
              <span className="absolute left-3.5 top-3 text-gray-400 text-xs">🔍</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={expenseFilterCategory}
                onChange={(e) => setExpenseFilterCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
              >
                <option value="all">📂 គ្រប់ប្រភេទចំណាយទាំងអស់</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>

              <span className="text-xs text-gray-400 font-bold px-2">
                សរុប: {finalFilteredExpenses.length} ចំណាយ
              </span>
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-[10px] text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">កាលបរិច្ឆេទ</th>
                  <th className="px-5 py-3">បរិយាយចំណាយ</th>
                  <th className="px-5 py-3">ប្រភេទចំណាយ</th>
                  <th className="px-5 py-3 text-right">ទឹកប្រាក់ ($)</th>
                  <th className="px-5 py-3 text-center">វិធីទូទាត់</th>
                  <th className="px-5 py-3">អ្នកទទួល / សម្គាល់</th>
                  <th className="px-5 py-3 text-right pr-6">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {finalFilteredExpenses.length > 0 ? (
                  finalFilteredExpenses.map((exp) => {
                    const catObj = EXPENSE_CATEGORIES.find(c => c.id === exp.category) || {
                      icon: '📦',
                      label: exp.category,
                      badge: 'bg-gray-50 text-gray-700 border-gray-200'
                    };

                    return (
                      <tr key={exp.id} className="hover:bg-gray-50/60 transition group">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-gray-900 block">{exp.date}</span>
                          <span className="text-[10px] font-mono text-gray-400">{exp.id}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-black text-gray-900 block">{exp.title}</span>
                          {exp.note && (
                            <span className="text-[10px] text-gray-400 line-clamp-1 italic">{exp.note}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl border ${catObj.badge}`}>
                            <span>{catObj.icon}</span>
                            <span>{catObj.label.split('(')[0]}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span className="font-black text-sm text-amber-600 block">
                            -${parseFloat(exp.amount || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">
                            {(parseFloat(exp.amount || 0) * exchangeRate).toLocaleString()} ៛
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 border border-gray-200">
                            {exp.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 font-medium">
                          {exp.recipient || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right pr-6 whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] px-2.5 py-1.5 rounded-xl border border-blue-200 transition cursor-pointer"
                            title="កែប្រែចំណាយ"
                          >
                            ✏️ កែ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] px-2.5 py-1.5 rounded-xl border border-red-200 transition cursor-pointer"
                            title="លុបចំណាយ"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">💸</div>
                      <p className="font-bold text-gray-600 text-xs">មិនទាន់មានទិន្នន័យចំណាយក្នុងកាលបរិច្ឆេទនេះឡើយ!</p>
                      <p className="text-[11px] text-gray-400 mt-1">សូមចុចប៊ូតុង "កត់ត្រាចំណាយថ្មី" ខាងលើដើម្បីចាប់ផ្តើម។</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* ⭐️ ADD / EDIT EXPENSE MODAL ⭐️ */}
        {expenseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base font-bold">
                    {editingExpense ? '✏️' : '➕'}
                  </span>
                  <div>
                    <h3 className="font-black text-sm text-gray-900">
                      {editingExpense ? 'កែប្រែទិន្នន័យចំណាយ' : 'កត់ត្រាចំណាយប្រតិបត្តិការថ្មី'}
                    </h3>
                    <p className="text-[10px] text-gray-400">បញ្ចូលទឹកប្រាក់ និងព័ត៌មានលម្អិតនៃចំណាយ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
                
                {/* Title */}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    ឈ្មោះ ឬបរិយាយចំណាយ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="ឧ. ថ្លៃជួលតូបខែនេះ, ថ្លៃភ្លើង, ទិញថង់វេចខ្ចប់..."
                    className="w-full bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2.5 font-medium outline-none transition"
                  />
                </div>

                {/* Amount in USD & KHR live preview */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      ចំនួនទឹកប្រាក់ ($ USD) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2.5 font-black text-base text-amber-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-400 block mb-1">
                      សមមូលជារៀល (៛ KHR)
                    </label>
                    <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 font-black text-sm text-gray-600 flex items-center">
                      {expAmount && !isNaN(parseFloat(expAmount)) 
                        ? `${Math.round(parseFloat(expAmount) * exchangeRate).toLocaleString()} ៛` 
                        : '0 ៛'}
                    </div>
                  </div>
                </div>

                {/* Category & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      ប្រភេទចំណាយ
                    </label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-bold text-gray-800 outline-none cursor-pointer"
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      វិធីសាស្ត្រទូទាត់
                    </label>
                    <select
                      value={expPaymentMethod}
                      onChange={(e) => setExpPaymentMethod(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-bold text-gray-800 outline-none cursor-pointer"
                    >
                      <option value="Cash">💵 សាច់ប្រាក់ផ្ទាល់ (Cash)</option>
                      <option value="ABA">📱 ផ្ទេរតាម ABA Pay</option>
                      <option value="Wing">📱 ផ្ទេរតាម Wing / Bakong</option>
                      <option value="Bank">🏦 ផ្ទេរតាមធនាគារផ្សេងៗ</option>
                    </select>
                  </div>
                </div>

                {/* Date & Recipient */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      កាលបរិច្ឆេទចំណាយ
                    </label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      អ្នកទទួលប្រាក់ / ក្រុមហ៊ុន
                    </label>
                    <input
                      type="text"
                      value={expRecipient}
                      onChange={(e) => setExpRecipient(e.target.value)}
                      placeholder="ឧ. ម្ចាស់ទីតាំង, EDC, ដឹកជញ្ជូន..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium outline-none"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    កំណត់ចំណាំបន្ថែម (Note)
                  </label>
                  <textarea
                    rows={2}
                    value={expNote}
                    onChange={(e) => setExpNote(e.target.value)}
                    placeholder="បញ្ជាក់ព័ត៌មានបន្ថែមអំពីការចំណាយនេះ..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setExpenseModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold transition"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black transition shadow-md shadow-emerald-600/20"
                  >
                    {editingExpense ? 'រក្សាទុកការកែប្រែ' : 'កត់ត្រាចំណាយ'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    );
  };

  // ================= 👥 ផ្ទាំងគ្រប់គ្រងបុគ្គលិក & បែងចែកសិទ្ធិ (MULTI-STAFF & ROLES VIEW) =================
  const StaffManagementView = () => {
    // Save or Edit Staff
    const handleSaveStaff = (e) => {
      e.preventDefault();
      if (!staffFormName.trim() || !staffFormUsername.trim() || !staffFormPin.trim()) {
        alert('សូមបំពេញឈ្មោះ, ឈ្មោះប្រើប្រាស់ (Username) និងលេខសម្ងាត់ PIN (៤ ខ្ទង់)!');
        return;
      }
      if (staffFormPin.length < 4) {
        alert('លេខសម្ងាត់ PIN ត្រូវមានយ៉ាងតិច ៤ ខ្ទង់!');
        return;
      }

      const roleObj = {
        'ADMIN': { label: 'ម្ចាស់ហាង (Super Admin)', avatar: '👑', color: 'from-amber-500 to-orange-600' },
        'CASHIER': { label: 'អ្នកគិតលុយ (Cashier)', avatar: '💻', color: 'from-blue-500 to-indigo-600' },
        'STOCK': { label: 'អ្នកកាន់ស្តុក (Stock Keeper)', avatar: '🗄️', color: 'from-purple-500 to-violet-600' }
      }[staffFormRole] || { label: staffFormRole, avatar: '👤', color: 'from-gray-500 to-slate-600' };

      if (editingStaff) {
        setStaffList(prev => prev.map(s => s.id === editingStaff.id ? {
          ...s,
          name: staffFormName.trim(),
          username: staffFormUsername.trim().toLowerCase(),
          pin: staffFormPin.trim(),
          role: staffFormRole,
          roleLabel: roleObj.label,
          avatar: roleObj.avatar,
          color: roleObj.color,
          phone: staffFormPhone.trim()
        } : s));
        setToastNotification(`✅ បានកែប្រែគណនីបុគ្គលិក "${staffFormName}" ជោគជ័យ!`);
      } else {
        const newStaff = {
          id: `STAFF-${Date.now().toString().slice(-4)}`,
          name: staffFormName.trim(),
          username: staffFormUsername.trim().toLowerCase(),
          pin: staffFormPin.trim(),
          role: staffFormRole,
          roleLabel: roleObj.label,
          avatar: roleObj.avatar,
          color: roleObj.color,
          phone: staffFormPhone.trim(),
          active: true,
          created_at: new Date().toISOString()
        };
        setStaffList(prev => [...prev, newStaff]);
        setToastNotification(`🎉 បានបង្កើតគណនីបុគ្គលិកថ្មី "${staffFormName}" ជោគជ័យ!`);
      }

      setTimeout(() => setToastNotification(null), 3500);
      setStaffModalOpen(false);
      setEditingStaff(null);
      setStaffFormName('');
      setStaffFormUsername('');
      setStaffFormPin('');
      setStaffFormPhone('');
    };

    const handleOpenEditStaff = (staff) => {
      setEditingStaff(staff);
      setStaffFormName(staff.name || '');
      setStaffFormUsername(staff.username || '');
      setStaffFormPin(staff.pin || '');
      setStaffFormRole(staff.role || 'CASHIER');
      setStaffFormPhone(staff.phone || '');
      setStaffModalOpen(true);
    };

    const handleDeleteStaff = (staff) => {
      if (staffList.length <= 1) {
        alert('មិនអាចលុបគណនីបុគ្គលិកចុងក្រោយបានទេ!');
        return;
      }
      if (staff.id === currentStaff?.id) {
        alert('មិនអាចលុបគណនីដែលកំពុង Log In នេះបានទេ! សូមប្តូរទៅគណនីផ្សេងសិន។');
        return;
      }
      if (!window.confirm(`តើបងពិតជាចង់លុបគណនីបុគ្គលិក "${staff.name}" នេះមែនទេ?`)) return;
      setStaffList(prev => prev.filter(s => s.id !== staff.id));
      setToastNotification(`🗑️ បានលុបគណនី "${staff.name}" រួចរាល់!`);
      setTimeout(() => setToastNotification(null), 3000);
    };

    const handleToggleActive = (staff) => {
      if (staff.id === currentStaff?.id) {
        alert('មិនអាចផ្អាកគណនីដែលកំពុងដំណើរការនេះបានទេ!');
        return;
      }
      setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, active: !s.active } : s));
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
                👥
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                  គ្រប់គ្រងបុគ្គលិក & បែងចែកសិទ្ធិ (Multi-Staff & Roles Permission)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  បែងចែកសិទ្ធិបុគ្គលិកដាច់ដោយឡែក (ម្ចាស់ហាង, អ្នកគិតលុយ POS, អ្នកកាន់ស្តុក) ធានាសុវត្ថិភាពទិន្នន័យចំណេញ និងថ្លៃដើម
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedStaffToLogin(null);
                setEnteredPin('');
                setPinError('');
                setSwitchStaffModalOpen(true);
              }}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs px-4 py-2.5 rounded-2xl border border-amber-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <span>🔒</span>
              <span>ប្តូរគណនីបុគ្គលិក (Switch)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingStaff(null);
                setStaffFormName('');
                setStaffFormUsername('');
                setStaffFormPin('');
                setStaffFormRole('CASHIER');
                setStaffFormPhone('');
                setStaffModalOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs px-4 py-2.5 rounded-2xl transition shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>បន្ថែមបុគ្គលិកថ្មី</span>
            </button>
          </div>
        </div>

        {/* ⭐️ ROLE EXPLANATION CARDS ⭐️ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Super Admin Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 rounded-3xl border border-amber-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-xl shadow-sm">
                👑
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                Full Control
              </span>
            </div>
            <div>
              <h4 className="font-black text-sm text-gray-900">ម្ចាស់ហាង (Super Admin)</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                មានសិទ្ធិមើលឃើញ និងគ្រប់គ្រងបានទាំងអស់៖ របាយការណ៍ចំណេញសុទ្ធ ថ្លៃដើមទំនិញ ស្តុក លក់ POS ចំណាយ និងគ្រប់គ្រងបុគ្គលិក។
              </p>
            </div>
            <div className="pt-2 border-t border-amber-200/60 text-[10px] font-bold text-amber-800 flex items-center gap-1">
              <span>✅</span> ឃើញថ្លៃដើម & ប្រាក់ចំណេញ ១០០%
            </div>
          </div>

          {/* 2. Cashier Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-5 rounded-3xl border border-blue-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-sm">
                💻
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900">
                POS Only
              </span>
            </div>
            <div>
              <h4 className="font-black text-sm text-gray-900">អ្នកគិតលុយ (Cashier)</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                ឃើញ និងប្រើប្រាស់បានតែផ្ទាំងលក់ POS មុខហាង និងវិក្កយបត្រប៉ុណ្ណោះ។ មិនអាចចូលមើលរបាយការណ៍ហិរញ្ញវត្ថុ ឬថ្លៃដើមឡើយ។
              </p>
            </div>
            <div className="pt-2 border-t border-blue-200/60 text-[10px] font-bold text-blue-800 flex items-center gap-1">
              <span>🔒</span> លាក់ថ្លៃដើម និងប្រាក់ចំណេញសុទ្ធ
            </div>
          </div>

          {/* 3. Stock Keeper Card */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50/60 p-5 rounded-3xl border border-purple-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center text-xl shadow-sm">
                🗄️
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900">
                Inventory Only
              </span>
            </div>
            <div>
              <h4 className="font-black text-sm text-gray-900">អ្នកកាន់ស្តុក (Stock Keeper)</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                មានសិទ្ធិតែលើការកែប្រែចំនួនស្តុក នាំទំនិញចូល (Stock In) និង Import Excel។ មិនអាចចូលមើលប្រព័ន្ធលក់ ឬលុយកាក់បានឡើយ។
              </p>
            </div>
            <div className="pt-2 border-t border-purple-200/60 text-[10px] font-bold text-purple-800 flex items-center gap-1">
              <span>🔒</span> មិនមានសិទ្ធិលើប្រព័ន្ធលុយកាក់
            </div>
          </div>

        </div>

        {/* ⭐️ STAFF MEMBERS TABLE ⭐️ */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-gray-900">បញ្ជីគណនីបុគ្គលិកទាំងអស់ ({staffList.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPinInTable(prev => !prev)}
              className="text-xs font-bold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              {showPinInTable ? '🔒 លាក់លេខ PIN' : '👁️ បង្ហាញលេខ PIN'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-[10px] text-gray-400 font-black uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">បុគ្គលិក</th>
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">តួនាទី (Role)</th>
                  <th className="px-5 py-3">លេខទូរស័ព្ទ</th>
                  <th className="px-5 py-3 text-center">លេខសម្ងាត់ PIN</th>
                  <th className="px-5 py-3 text-center">ស្ថានភាព</th>
                  <th className="px-5 py-3 text-right pr-6">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffList.map((staff) => {
                  const isCurrent = staff.id === currentStaff?.id;

                  return (
                    <tr key={staff.id} className={`hover:bg-gray-50/60 transition ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${staff.color || 'from-gray-500 to-slate-600'} text-white flex items-center justify-center text-base shadow-xs shrink-0`}>
                            {staff.avatar || '👤'}
                          </span>
                          <div>
                            <span className="font-black text-gray-900 text-xs flex items-center gap-1.5">
                              {staff.name}
                              {isCurrent && (
                                <span className="text-[9px] bg-blue-600 text-white px-2 py-0.2 rounded-full font-bold">
                                  កំពុងប្រើប្រាស់
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">{staff.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-gray-700">
                        @{staff.username}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl border ${
                          staff.role === 'ADMIN' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          staff.role === 'CASHIER' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                          'bg-purple-50 text-purple-800 border-purple-300'
                        }`}>
                          <span>{staff.avatar}</span>
                          <span>{staff.roleLabel}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 font-medium">
                        {staff.phone || '-'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <span className="font-mono font-bold text-xs bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-800">
                          {showPinInTable ? staff.pin : '••••'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(staff)}
                          disabled={isCurrent}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition ${
                            staff.active 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {staff.active ? '🟢 សកម្ម' : '⚪ ផ្អាក'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right pr-6 whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditStaff(staff)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] px-2.5 py-1.5 rounded-xl border border-blue-200 transition cursor-pointer"
                          title="កែប្រែគណនី"
                        >
                          ✏️ កែ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff)}
                          disabled={isCurrent}
                          className={`font-bold text-[11px] px-2.5 py-1.5 rounded-xl border transition ${
                            isCurrent 
                              ? 'opacity-30 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200' 
                              : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 cursor-pointer'
                          }`}
                          title="លុបគណនី"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* ⭐️ ADD / EDIT STAFF MODAL ⭐️ */}
        {staffModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base font-bold">
                    {editingStaff ? '✏️' : '👥'}
                  </span>
                  <div>
                    <h3 className="font-black text-sm text-gray-900">
                      {editingStaff ? 'កែប្រែគណនីបុគ្គលិក' : 'បន្ថែមគណនីបុគ្គលិកថ្មី'}
                    </h3>
                    <p className="text-[10px] text-gray-400">កំណត់ឈ្មោះ តួនាទី និងលេខសម្ងាត់ PIN</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
                
                {/* Staff Name */}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    ឈ្មោះពេញរបស់បុគ្គលិក <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={staffFormName}
                    onChange={(e) => setStaffFormName(e.target.value)}
                    placeholder="ឧ. សុខា, វិចិត្រ, ធីតា..."
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 font-bold outline-none transition"
                  />
                </div>

                {/* Username & PIN */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={staffFormUsername}
                      onChange={(e) => setStaffFormUsername(e.target.value)}
                      placeholder="ឧ. cashier1"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 font-mono font-bold outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      លេខសម្ងាត់ PIN (៤ ខ្ទង់) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      required
                      value={staffFormPin}
                      onChange={(e) => setStaffFormPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 font-mono font-black text-center tracking-widest text-base outline-none transition"
                    />
                  </div>
                </div>

                {/* Role Select */}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    តួនាទី និងសិទ្ធិកាន់កាប់ (Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={staffFormRole}
                    onChange={(e) => setStaffFormRole(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-bold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="CASHIER">💻 អ្នកគិតលុយ (Cashier) — ប្រើបានតែ POS មុខហាង</option>
                    <option value="STOCK">🗄️ អ្នកកាន់ស្តុក (Stock Keeper) — គ្រប់គ្រងស្តុក & នាំចូល</option>
                    <option value="ADMIN">👑 ម្ចាស់ហាង (Super Admin) — គ្រប់គ្រងបានទាំងអស់ពេញលេញ</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    លេខទូរស័ព្ទបុគ្គលិក
                  </label>
                  <input
                    type="text"
                    value={staffFormPhone}
                    onChange={(e) => setStaffFormPhone(e.target.value)}
                    placeholder="ឧ. 012 345 678"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStaffModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold transition"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-black transition shadow-md shadow-blue-600/20"
                  >
                    {editingStaff ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតគណនី'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    );
  };

  const ordersData = [
    { id: 'ORD-9012', customer: 'សុខ សាន្ត', date: '2026-09-23', total: 85.00, status: 'Preparing', payment: 'ABA Pay' },
    { id: 'ORD-9013', customer: 'ចាន់ ធីតា', date: '2026-09-23', total: 150.00, status: 'Shipped', payment: 'COD' },
  ];
  const customersData = [
    { id: 'CUS-001', name: 'សុខ សាន្ត', phone: '0967205522', email: 'sok@example.com', joined: '2026-01-15', totalSpent: 340.00 },
    { id: 'CUS-002', name: 'ចាន់ ធីតា', phone: '012345678', email: 'thida@example.com', joined: '2026-05-20', totalSpent: 150.00 },
  ];

  
  // មុខងារលុបទំនិញពីស្តុកយ៉ាងមានប្រសិទ្ធភាព (Delete Product)
  const handleDeleteProduct = async (id) => {
    if (window.confirm('តើអ្នកពិតជាចង់លុបទំនិញនេះចេញពីស្តុក និង Database មែនទេ?')) {
      try {
        // បម្លែង ID ឱ្យត្រូវតាមទម្រង់ (មិនថាជា string ឬ number គឺលុបបានទាំងអស់)
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // លុបជោគជ័យ ធ្វើការទាញយកទិន្នន័យស្តុកថ្មីមកបង្ហាញភ្លាមៗ
        alert('🗑️ លុបទំនិញបានជោគជ័យ!');
        fetchProducts(); 
      } catch (err) {
        alert('❌ មិនអាចលុបទំនិញនេះបានទេ: ' + err.message);
      }
    }
  };

    // ⭐️ ផ្ទាំង InventoryView កម្រិតខ្ពស់ ទាន់សម័យ ឡូយ រស់រវើក និងងាយស្រួលប្រើប្រាស់បំផុត (ULTRA-MODERN INVENTORY SUITE) ⭐️
  const InventoryView = () => {
    const totalItems = products.length;
    const totalUnits = products.reduce((sum, p) => sum + (Number(p.stock_qty) || 0), 0);
    const lowStockCount = products.filter(p => p.stock_qty > 0 && p.stock_qty <= (p.low_stock_alert || 5)).length;
    const outOfStockCount = products.filter(p => p.stock_qty <= 0).length;
    const inStockCount = products.filter(p => p.stock_qty > (p.low_stock_alert || 5)).length;
    const totalRetailValue = products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (Number(p.stock_qty) || 0)), 0);
    const totalCostValue = products.reduce((sum, p) => sum + ((Number(p.cost_price) || 0) * (Number(p.stock_qty) || 0)), 0);
    const inStockRate = totalItems > 0 ? Math.round((inStockCount / totalItems) * 100) : 100;

    // Filter Logic
    const filteredInventory = products.filter(p => {
      const pCat = (p.category || '').trim().toLowerCase();
      const filterCat = invCategory.trim().toLowerCase();

      const matchesCategory = invCategory === 'all' || pCat.includes(filterCat) || filterCat.includes(pCat);
      const matchesSearch = p.name.toLowerCase().includes(invSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(invSearch.toLowerCase()));
      
      let matchesStatus = true;
      if (filterStatus === 'low') matchesStatus = p.stock_qty > 0 && p.stock_qty <= (p.low_stock_alert || 5);
      if (filterStatus === 'out') matchesStatus = p.stock_qty <= 0;
      if (filterStatus === 'normal') matchesStatus = p.stock_qty > (p.low_stock_alert || 5);

      return matchesCategory && matchesSearch && matchesStatus;
    });

    // Sort Logic
    const sortedInventory = [...filteredInventory].sort((a, b) => {
      if (invSortBy === 'stock_asc') return (Number(a.stock_qty) || 0) - (Number(b.stock_qty) || 0);
      if (invSortBy === 'stock_desc') return (Number(b.stock_qty) || 0) - (Number(a.stock_qty) || 0);
      if (invSortBy === 'price_asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (invSortBy === 'price_desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (invSortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    // ⭐️ មុខងារកែប្រែចំនួនស្តុកលឿនរហ័ស (+ / - Quick Adjust) ដោយមិនបាច់បើក Modal ⭐️
    const handleQuickStockAdjust = async (product, delta) => {
      const currentQty = Number(product.stock_qty) || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === currentQty) return;

      setQuickStockUpdatingId(product.id);

      // Optimistic update
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock_qty: newQty } : p));

      try {
        const { error } = await supabase
          .from('products')
          .update({ stock_qty: newQty })
          .eq('id', product.id);

        if (error) throw error;

        // Log movement
        try {
          await supabase.from('stock_movements').insert([{
            product_id: product.id,
            type: delta > 0 ? 'PURCHASE' : 'ADJUSTMENT',
            qty_change: delta,
            previous_qty: currentQty,
            new_qty: newQty,
            reason: delta > 0 ? 'កែតម្រូវបន្ថែមរហ័ស (+)' : 'កែតម្រូវបន្ថយរហ័ស (-)'
          }]);
        } catch (logErr) {}

        setToastNotification(`✅ បានកែប្រែស្តុក "${product.name}": ${currentQty} ➔ ${newQty}`);
        setTimeout(() => setToastNotification(null), 2500);
      } catch (err) {
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock_qty: currentQty } : p));
        alert('❌ មិនអាចកែប្រែស្តុកបានទេ: ' + err.message);
      } finally {
        setQuickStockUpdatingId(null);
      }
    };

    // Bulk selection handlers
    const handleToggleSelectAll = () => {
      if (selectedInvProductIds.length === sortedInventory.length && sortedInventory.length > 0) {
        setSelectedInvProductIds([]);
      } else {
        setSelectedInvProductIds(sortedInventory.map(p => p.id));
      }
    };

    const handleToggleSelectProduct = (id) => {
      setSelectedInvProductIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    };

    const handleBulkDelete = async () => {
      if (selectedInvProductIds.length === 0) return;
      if (!window.confirm(`តើបងពិតជាចង់លុបទំនិញទាំង ${selectedInvProductIds.length} មុខនេះចេញពីស្តុកមែនទេ?`)) return;

      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', selectedInvProductIds);

        if (error) throw error;

        setToastNotification(`🗑️ បានលុបទំនិញទាំង ${selectedInvProductIds.length} មុខជោគជ័យ!`);
        setTimeout(() => setToastNotification(null), 3000);
        setSelectedInvProductIds([]);
        fetchProducts();
      } catch (err) {
        alert('❌ បរាជ័យក្នុងការលុបទំនិញជាបណ្តុំ: ' + err.message);
      }
    };

    const handleCopySku = (skuText) => {
      if (!skuText) return;
      navigator.clipboard.writeText(skuText);
      setToastNotification(`📋 បានចម្លង SKU: ${skuText}`);
      setTimeout(() => setToastNotification(null), 2000);
    };

    return (
      <div className="animate-in fade-in pb-16 max-w-[1440px] mx-auto relative select-none">
        
        {/* ⭐️ ULTRA-MODERN HEADER & ACTIONS TOOLBAR ⭐️ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 shrink-0">
              🗄️
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  គ្រប់គ្រងស្តុកទំនិញ (Smart Stock Hub)
                </h2>
                <span className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Realtime Sync
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">
                តាមដានចំនួនស្តុកជាក់ស្តែង ចលនាទំនិញ នាំចូលរហ័ស និងតម្លៃទុនស្តុកសរុប
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              ref={bulkFileInputRef} 
              accept=".xlsx, .xls, .csv" 
              onChange={handleBulkExcelFileChange} 
              className="hidden" 
            />

            {/* ប៊ូតុង បន្ថែមផលិតផលថ្មី */}
            <button 
              type="button"
              onClick={() => setActiveTab('upload')} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-blue-500/25 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>+ បន្ថែមទំនិញថ្មី</span>
            </button>

            {/* Import Excel */}
            <button 
              type="button" 
              onClick={() => bulkFileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="ទាញទំនិញចូលប្រព័ន្ធរាប់រយមុខតាម Excel/CSV"
            >
              <span>📥</span>
              <span>Import Excel</span>
            </button>

            {/* Export .xlsx */}
            <button 
              type="button" 
              onClick={exportInventoryToExcel}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              title="ទាញយកទិន្នន័យស្តុកជា Excel (.xlsx)"
            >
              <span>📊</span>
              <span>Export .xlsx</span>
            </button>

            {/* គំរូ Template */}
            <button 
              type="button" 
              onClick={downloadInventoryTemplate}
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              title="ទាញយកឯកសារគំរូ Excel"
            >
              <span>📋</span>
              <span>គំរូ Template</span>
            </button>

            {/* Telegram Alert */}
            <button 
              type="button" 
              onClick={handleManualStockAlertCheck}
              disabled={telegramTesting}
              className={`border px-3 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                (lowStockCount + outOfStockCount) > 0 
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
              title="ផ្ញើការជូនដំណឹងទំនិញជិតអស់ស្តុកទៅកាន់ Telegram"
            >
              <span>🔔</span>
              <span>Telegram</span>
              {(lowStockCount + outOfStockCount) > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                  {lowStockCount + outOfStockCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ⭐️ 4 VIBRANT EXECUTIVE KPI CARDS WITH PROGRESS GAUGES ⭐️ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* Card 1: Total SKUs */}
          <div className="bg-gradient-to-br from-blue-50/80 via-white to-white p-5 rounded-3xl border border-blue-100/80 shadow-xs relative overflow-hidden group hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs font-black uppercase tracking-wider">សរុបមុខទំនិញ</span>
              <span className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-lg font-black group-hover:scale-110 transition-transform">
                📦
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">{totalItems}</span>
                <span className="text-xs font-black text-blue-600">SKUs</span>
              </div>
              <p className="text-[11px] text-gray-500 font-bold mt-1">
                សរុប <span className="text-gray-900 font-black">{totalUnits.toLocaleString()}</span> ឯកតា (Units) ក្នុងស្តុក
              </p>
            </div>
          </div>

          {/* Card 2: Total Valuation */}
          <div className="bg-gradient-to-br from-emerald-50/80 via-white to-white p-5 rounded-3xl border border-emerald-100/80 shadow-xs relative overflow-hidden group hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs font-black uppercase tracking-wider">តម្លៃស្តុកសរុប (លក់)</span>
              <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg font-black group-hover:scale-110 transition-transform">
                💰
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-600">
                  ${totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-bold mt-1">
                ដើមទុន: <span className="text-gray-800 font-black">${totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
            </div>
          </div>

          {/* Card 3: Stock Health Gauge */}
          <div className="bg-gradient-to-br from-purple-50/80 via-white to-white p-5 rounded-3xl border border-purple-100/80 shadow-xs relative overflow-hidden group hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs font-black uppercase tracking-wider">សុខភាពស្តុក (In-Stock)</span>
              <span className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-lg font-black group-hover:scale-110 transition-transform">
                🟢
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-600">{inStockRate}%</span>
                <span className="text-xs font-bold text-gray-500">ពេញស្តុក</span>
              </div>
              {/* Mini Segmented Progress Bar */}
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex mt-2">
                <div style={{ width: `${(inStockCount / (totalItems || 1)) * 100}%` }} className="bg-emerald-500 h-full" title={`មានស្តុក: ${inStockCount}`}></div>
                <div style={{ width: `${(lowStockCount / (totalItems || 1)) * 100}%` }} className="bg-amber-500 h-full" title={`ជិតអស់: ${lowStockCount}`}></div>
                <div style={{ width: `${(outOfStockCount / (totalItems || 1)) * 100}%` }} className="bg-rose-500 h-full" title={`ដាច់ស្តុក: ${outOfStockCount}`}></div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mt-1">
                <span className="text-emerald-600 font-black">{inStockCount} ស្តុកពេញ</span>
                <span className="text-amber-600 font-black">{lowStockCount} ជិតអស់</span>
                <span className="text-rose-600 font-black">{outOfStockCount} ដាច់ស្តុក</span>
              </div>
            </div>
          </div>

          {/* Card 4: Stock Alerts */}
          <div className={`p-5 rounded-3xl border shadow-xs relative overflow-hidden transition ${
            (lowStockCount + outOfStockCount) > 0 
              ? 'bg-gradient-to-br from-rose-50/90 via-white to-white border-rose-200' 
              : 'bg-gradient-to-br from-gray-50 via-white to-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-xs font-black uppercase tracking-wider">ទំនិញប្រកាសអាសន្ន</span>
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black ${
                (lowStockCount + outOfStockCount) > 0 ? 'bg-rose-500/10 text-rose-600 animate-pulse' : 'bg-gray-100 text-gray-400'
              }`}>
                ⚠️
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${ (lowStockCount + outOfStockCount) > 0 ? 'text-rose-600' : 'text-gray-900' }`}>
                  {lowStockCount + outOfStockCount}
                </span>
                <span className="text-xs font-black text-rose-600">មុខទំនិញ</span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-gray-500 font-bold">
                  {outOfStockCount > 0 ? `🔴 ${outOfStockCount} ដាច់ស្តុក` : '🟢 គ្មានដាច់ស្តុក'}
                </span>
                {(lowStockCount + outOfStockCount) > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterStatus(filterStatus === 'low' ? 'all' : 'low')}
                    className="text-[10px] font-black text-rose-600 bg-rose-100 hover:bg-rose-200 px-2 py-0.5 rounded-lg transition cursor-pointer"
                  >
                    {filterStatus === 'low' ? 'បង្ហាញទាំងអស់' : '⚡ ច្រោះមើល'}
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ⭐️ SUB-NAVIGATION TABS & VIEW SWITCHER ⭐️ */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setInventorySubTab('items')} 
              className={`px-4 py-2 rounded-2xl font-black text-xs transition cursor-pointer flex items-center gap-2 ${
                inventorySubTab === 'items' 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>📦</span>
              <span>បញ្ជីទំនិញក្នុងស្តុក</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                inventorySubTab === 'items' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {products.length}
              </span>
            </button>

            <button 
              type="button"
              onClick={() => {
                setInventorySubTab('movements');
                fetchStockMovements();
              }} 
              className={`px-4 py-2 rounded-2xl font-black text-xs transition cursor-pointer flex items-center gap-2 ${
                inventorySubTab === 'movements' 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>📋</span>
              <span>កំណត់ត្រាចលនាស្តុក (Audit Log)</span>
            </button>
          </div>

          {/* View Switcher: Table View vs Grid Cards */}
          {inventorySubTab === 'items' && (
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/80">
              <button
                type="button"
                onClick={() => {
                  setInvViewMode('table');
                  if (typeof window !== 'undefined') localStorage.setItem('sabay_inv_view_mode', 'table');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  invViewMode === 'table' ? 'bg-white text-blue-600 shadow-xs ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="មើលជាទម្រង់តារាងលម្អិត"
              >
                <span>📑</span>
                <span>តារាង (Table)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInvViewMode('grid');
                  if (typeof window !== 'undefined') localStorage.setItem('sabay_inv_view_mode', 'grid');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  invViewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="មើលជាទម្រង់កាតរូបភាពទំនើប"
              >
                <span>🎴</span>
                <span>កាត (Cards)</span>
              </button>
            </div>
          )}
        </div>

        {inventorySubTab === 'items' ? (
          <>
            {/* ⭐️ FILTER, SEARCH & SORT BAR ⭐️ */}
            <div className="bg-white p-5 rounded-3xl shadow-xs border border-gray-200 mb-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <input 
                    type="text" 
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder="ស្វែងរក SKU, បាកូដ, ឈ្មោះផលិតផល..." 
                    className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
                  />
                  <span className="absolute left-3.5 top-3 text-gray-400 text-xs">🔍</span>
                  {invSearch && (
                    <button 
                      type="button"
                      onClick={() => setInvSearch('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Dropdown & Sort */}
                <div className="flex flex-wrap items-center gap-2">
                  <select 
                    value={invCategory} 
                    onChange={(e) => setInvCategory(e.target.value)} 
                    className="border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold bg-white focus:border-blue-500 outline-none transition cursor-pointer"
                  >
                    <option value="all">📁 គ្រប់ប្រភេទ ({products.length})</option>
                    {categories.map(c => (
                      <option key={c.id || c.name} value={c.name}>📁 {c.name}</option>
                    ))}
                  </select>

                  <select 
                    value={invSortBy} 
                    onChange={(e) => setInvSortBy(e.target.value)} 
                    className="border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold bg-white focus:border-blue-500 outline-none transition cursor-pointer"
                  >
                    <option value="newest">⏱️ ទើបបញ្ចូលថ្មី</option>
                    <option value="stock_asc">📉 ស្តុកតិចទៅច្រើន</option>
                    <option value="stock_desc">📈 ស្តុកច្រើនទៅតិច</option>
                    <option value="price_asc">💵 តម្លៃទាបទៅខ្ពស់</option>
                    <option value="price_desc">💎 តម្លៃខ្ពស់ទៅទាប</option>
                    <option value="name">🔤 ឈ្មោះ (A - Z)</option>
                  </select>
                </div>
              </div>

              {/* Quick Status Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider mr-1">ស្ថានភាព:</span>
                  
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      filterStatus === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🌟 ទាំងអស់ ({products.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterStatus('normal')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      filterStatus === 'normal'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <span>🟢 មានក្នុងស្តុក ({inStockCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterStatus('low')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      filterStatus === 'low'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <span>🟠 ជិតអស់ ({lowStockCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterStatus('out')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      filterStatus === 'out'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <span>🔴 អស់ពីស្តុក ({outOfStockCount})</span>
                  </button>
                </div>

                <div className="text-xs font-bold text-gray-500">
                  បង្ហាញ: <span className="text-blue-600 font-black">{sortedInventory.length}</span> មុខទំនិញ
                </div>
              </div>
            </div>

            {/* ⭐️ FLOATING BULK ACTIONS BAR (WHEN ITEMS ARE SELECTED) ⭐️ */}
            {selectedInvProductIds.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                  <span className="text-xs font-black">
                    បានជ្រើសរើស: <span className="text-blue-400">{selectedInvProductIds.length}</span> មុខ
                  </span>
                </div>

                <div className="h-4 w-px bg-slate-800"></div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const firstProd = products.find(p => p.id === selectedInvProductIds[0]);
                      if (firstProd) {
                        setBarcodeProduct(firstProd);
                        setBarcodePrintQty(selectedInvProductIds.length);
                        setBarcodeModalOpen(true);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>🏷️</span> ព្រីន Barcode
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>🗑️</span> លុបចោល
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedInvProductIds([])}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    ✕ បោះបង់
                  </button>
                </div>
              </div>
            )}

            {/* ⭐️ VIEW MODE 1: ULTRA-MODERN INTERACTIVE TABLE VIEW ⭐️ */}
            {invViewMode === 'table' ? (
              <div className="bg-white rounded-3xl shadow-xs border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-black">
                      <tr>
                        <th className="px-4 py-4 w-10 text-center">
                          <input 
                            type="checkbox"
                            checked={sortedInventory.length > 0 && selectedInvProductIds.length === sortedInventory.length}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                          />
                        </th>
                        <th className="px-4 py-4">SKU / កូដ</th>
                        <th className="px-4 py-4">ឈ្មោះផលិតផល</th>
                        <th className="px-4 py-4">ប្រភេទ</th>
                        <th className="px-4 py-4">ទំហំ / ពណ៌</th>
                        <th className="px-4 py-4">តម្លៃលក់ & ថ្លៃដើម</th>
                        <th className="px-4 py-4 text-center">ចំនួនស្តុក & សុខភាព</th>
                        <th className="px-5 py-4 text-right pr-6">សកម្មភាពគ្រប់គ្រង</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {sortedInventory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                            <span className="text-4xl block mb-2">🔍</span>
                            <span className="font-bold text-sm">រកមិនឃើញទំនិញស្របតាមលក្ខខណ្ឌស្វែងរកនេះឡើយ។</span>
                          </td>
                        </tr>
                      ) : (
                        sortedInventory.map(product => {
                          const isSelected = selectedInvProductIds.includes(product.id);
                          const isLow = product.stock_qty > 0 && product.stock_qty <= (product.low_stock_alert || 5);
                          const isOut = product.stock_qty <= 0;
                          const isUpdating = quickStockUpdatingId === product.id;

                          return (
                            <tr 
                              key={product.id} 
                              className={`transition-colors duration-150 ${
                                isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/80'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="px-4 py-4 text-center">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectProduct(product.id)}
                                  className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                                />
                              </td>

                              {/* SKU with 1-click Copy */}
                              <td className="px-4 py-4 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleCopySku(product.sku)}
                                  className="font-mono text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer transition active:scale-95"
                                  title="ចុចដើម្បីចម្លង (Copy SKU)"
                                >
                                  <span>{product.sku || 'N/A'}</span>
                                  <span className="text-[10px] opacity-60">📋</span>
                                </button>
                              </td>

                              {/* Product Thumbnail & Name with Hover Zoom Preview */}
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  {product.image_url ? (
                                    <div className="relative group/preview shrink-0">
                                      <img 
                                        src={product.image_url} 
                                        className="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-gray-200 shadow-xs cursor-pointer group-hover/preview:scale-105 transition" 
                                        alt={product.name || ''} 
                                      />
                                      {/* Pop-up Large Preview on Hover */}
                                      <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50 w-64 p-3 bg-white rounded-3xl shadow-2xl border-2 border-slate-900 opacity-0 invisible group-hover/preview:opacity-100 group-hover/preview:visible transition-all duration-200 pointer-events-none">
                                        <div className="w-full h-56 bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100">
                                          <img src={product.image_url} className="w-full h-full object-contain" alt="" />
                                        </div>
                                        <div className="mt-2.5 px-1">
                                          <p className="text-xs font-black text-gray-900 truncate">{product.name}</p>
                                          <div className="flex items-center justify-between mt-1 text-[11px] font-bold">
                                            <span className="text-blue-600">SKU: {product.sku}</span>
                                            <span className="text-emerald-600">ស្តុក: {product.stock_qty}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                      គ្មានរូប
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <p className="font-black text-gray-900 text-xs truncate max-w-xs" title={product.name}>
                                      {product.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {isOut ? (
                                        <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse">
                                          🔴 ដាច់ស្តុក
                                        </span>
                                      ) : isLow ? (
                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse">
                                          🟠 ជិតអស់ ({product.stock_qty})
                                        </span>
                                      ) : (
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                          🟢 មានស្តុក
                                        </span>
                                      )}
                                      <span className="text-[10px] text-gray-400 font-bold">Alert: {product.low_stock_alert || 5}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="px-4 py-4 text-xs font-bold text-gray-600 whitespace-nowrap">
                                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                                  {product.category || 'ទូទៅ'}
                                </span>
                              </td>

                              {/* Size & Color */}
                              <td className="px-4 py-4 text-[11px] text-gray-500 whitespace-nowrap">
                                <div>Size: <span className="font-bold text-gray-800">{product.size ? product.size.replace(/:\d+/g, '') : 'N/A'}</span></div>
                                <div className="mt-0.5">Color: <span className="font-bold text-orange-600">{product.color || 'N/A'}</span></div>
                              </td>

                              {/* Prices */}
                              <td className="px-4 py-4 text-xs whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-emerald-600 text-sm">
                                    ${(Math.max(0, (Number(product.price) || 0) - (Number(product.retail_discount) || 0))).toFixed(2)}
                                  </span>
                                  {product.retail_discount > 0 && (
                                    <span className="text-[10px] text-gray-400 line-through font-bold">
                                      ${parseFloat(product.price).toFixed(2)}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-100">រាយ</span>
                                </div>

                                {product.wholesale_price && parseFloat(product.wholesale_price) > 0 && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-0.5">
                                    <span>${(Math.max(0, Number(product.wholesale_price) - (Number(product.wholesale_discount) || 0))).toFixed(2)}</span>
                                    <span className="text-[9px] text-indigo-400">ដុំ</span>
                                  </div>
                                )}

                                {product.cost_price && parseFloat(product.cost_price) > 0 && (
                                  <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    ដើម: ${parseFloat(product.cost_price).toFixed(2)}
                                  </div>
                                )}
                              </td>

                              {/* Stock Counter with Quick Inline Stepper */}
                              <td className="px-4 py-4 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
                                    <button
                                      type="button"
                                      disabled={isUpdating || product.stock_qty <= 0}
                                      onClick={() => handleQuickStockAdjust(product, -1)}
                                      className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-gray-700 hover:text-rose-600 font-black text-sm flex items-center justify-center shadow-xs transition active:scale-90 disabled:opacity-30 cursor-pointer"
                                      title="បន្ថយស្តុក ១ ឯកតា (-1)"
                                    >
                                      -
                                    </button>
                                    
                                    <span className={`w-10 text-center font-black text-sm ${
                                      isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-gray-900'
                                    }`}>
                                      {isUpdating ? '⏳' : product.stock_qty}
                                    </span>

                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleQuickStockAdjust(product, 1)}
                                      className="w-7 h-7 rounded-lg bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-600 font-black text-sm flex items-center justify-center shadow-xs transition active:scale-90 disabled:opacity-30 cursor-pointer"
                                      title="បន្ថែមស្តុក ១ ឯកតា (+1)"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Mini Stock Progress Bar */}
                                  <div className="w-20 bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                                    <div 
                                      style={{ width: `${Math.min(100, Math.max(5, (product.stock_qty / (product.low_stock_alert || 5) * 50)))}%` }} 
                                      className={`h-full ${isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Action Buttons */}
                              <td className="px-5 py-4 text-right pr-6 whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* នាំចូលស្តុក (Stock In Modal) */}
                                  <button 
                                    type="button"
                                    onClick={() => handleOpenStockIn(product, 'IN')}
                                    className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-black text-xs px-2.5 py-1.5 rounded-xl border border-emerald-200 hover:border-emerald-600 transition cursor-pointer shadow-2xs"
                                    title="នាំចូលស្តុកបន្ថែម (+ Stock In)"
                                  >
                                    + នាំចូល
                                  </button>

                                  {/* កាត់ស្តុកចេញ (Stock Out Modal) */}
                                  <button 
                                    type="button"
                                    onClick={() => handleOpenStockIn(product, 'OUT')}
                                    className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-black text-xs px-2 py-1.5 rounded-xl border border-rose-200 hover:border-rose-600 transition cursor-pointer shadow-2xs"
                                    title="កាត់ស្តុកចេញ (- Stock Out)"
                                  >
                                    - កាត់
                                  </button>

                                  {/* Barcode Sticker */}
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setBarcodeProduct(product);
                                      setBarcodePrintQty(1);
                                      setBarcodeModalOpen(true);
                                    }}
                                    className="bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-black text-xs p-1.5 rounded-xl border border-purple-200 hover:border-purple-600 transition cursor-pointer"
                                    title="បោះពុម្ព Barcode"
                                  >
                                    🏷️
                                  </button>

                                  {/* Edit Product */}
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('upload');
                                      setEditingProductId(product.id);
                                      setName(product.name || '');
                                      setSku(product.sku || '');
                                      setCategory(product.category || (categories[0] ? categories[0].name : ''));
                                      setSellingPrice(product.price ? product.price.toString() : '');
                                      setCostPrice(product.cost_price ? product.cost_price.toString() : '');
                                      setWholesalePrice(product.wholesale_price ? product.wholesale_price.toString() : '');
                                      setWholesaleDiscount(product.wholesale_discount ? product.wholesale_discount.toString() : '');
                                      setRetailDiscount(product.retail_discount ? product.retail_discount.toString() : '');
                                      setStockQty(product.stock_qty ? product.stock_qty.toString() : '10');
                                      setLowStockAlert(product.low_stock_alert ? product.low_stock_alert.toString() : '5');
                                      setColor(product.color || '');
                                      
                                      if (product.size && product.size !== 'N/A') {
                                        if (product.size.includes(':')) {
                                          const pairs = product.size.split(', ');
                                          const loadedSizes = [];
                                          const loadedStock = {};
                                          pairs.forEach(pair => {
                                            const [sz, qty] = pair.split(':');
                                            loadedSizes.push(sz);
                                            loadedStock[sz] = qty;
                                          });
                                          setSelectedSizes(loadedSizes);
                                          setVariantStock(loadedStock);
                                          setCustomTextSize('');
                                        } else {
                                          setSelectedSizes(product.size.split(', '));
                                          setVariantStock({});
                                          setCustomTextSize(product.size);
                                        }
                                      } else {
                                        setSelectedSizes([]);
                                        setVariantStock({});
                                        setCustomTextSize('');
                                      }

                                      const parsedProd = parseProductMeta(product);
                                      const loadedImgs = (parsedProd.images || []).map((u, i) => ({
                                        id: `img_${i}_${Date.now()}`,
                                        url: u,
                                        isExisting: true
                                      }));
                                      setProductImages(loadedImgs);
                                      setSelectedCoverIndex(0);
                                      setPreviewUrl(product.image_url || null);
                                      setFile(null);

                                      (async () => {
                                        try {
                                          const { data: dbVars } = await supabase
                                            .from('product_variants')
                                            .select('*')
                                            .eq('product_id', product.id);

                                          if (dbVars && dbVars.length > 0) {
                                            const extractedSizes = Array.from(new Set(dbVars.map(v => v.size).filter(s => s && s !== 'Free Size' && s !== 'N/A')));
                                            const extractedColors = Array.from(new Set(dbVars.map(v => v.color).filter(c => c && c.trim() !== '')));
                                            const loadedStock = {};

                                            dbVars.forEach(v => {
                                              if (v.size && v.color) {
                                                loadedStock[`${v.size}__${v.color}`] = v.stock_qty;
                                              } else if (v.size) {
                                                loadedStock[v.size] = v.stock_qty;
                                              } else if (v.color) {
                                                loadedStock[v.color] = v.stock_qty;
                                              }
                                            });

                                            if (extractedSizes.length > 0) setSelectedSizes(extractedSizes);
                                            if (extractedColors.length > 0) {
                                              setSelectedColors(extractedColors);
                                              setColor(extractedColors.join(', '));
                                            }
                                            setVariantStock(loadedStock);
                                          }
                                        } catch (e) {}
                                      })();

                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-black text-xs p-1.5 rounded-xl border border-blue-200 hover:border-blue-600 transition cursor-pointer"
                                    title="កែប្រែព័ត៌មានទំនិញ"
                                  >
                                    ✏️
                                  </button>

                                  {/* Delete Product */}
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setProductToDelete(product);
                                      setDeleteModalOpen(true);
                                    }}
                                    className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-black text-xs p-1.5 rounded-xl border border-red-200 hover:border-red-600 transition cursor-pointer"
                                    title="លុបទំនិញនេះចេញពីស្តុក"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>

                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ⭐️ VIEW MODE 2: VISUAL GRID CARDS VIEW (រចនាបែបទំនើប ឡូយ និងរស់រវើក) ⭐️ */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {sortedInventory.length === 0 ? (
                  <div className="col-span-full bg-white p-16 text-center rounded-3xl border border-gray-200 text-gray-400">
                    <span className="text-5xl block mb-3">🔍</span>
                    <p className="font-bold text-base text-gray-700">រកមិនឃើញទំនិញស្របតាមលក្ខខណ្ឌស្វែងរកនេះឡើយ</p>
                  </div>
                ) : (
                  sortedInventory.map(product => {
                    const isSelected = selectedInvProductIds.includes(product.id);
                    const isLow = product.stock_qty > 0 && product.stock_qty <= (product.low_stock_alert || 5);
                    const isOut = product.stock_qty <= 0;
                    const isUpdating = quickStockUpdatingId === product.id;

                    return (
                      <div 
                        key={product.id}
                        className={`bg-white rounded-3xl overflow-hidden border transition-all duration-200 flex flex-col group hover:shadow-xl hover:-translate-y-1 ${
                          isSelected ? 'border-blue-500 ring-2 ring-blue-300 shadow-md' : 'border-gray-200 shadow-xs'
                        }`}
                      >
                        {/* Card Image Area with Floating Badges */}
                        <div className="relative aspect-square bg-gray-50 overflow-hidden border-b border-gray-100 flex items-center justify-center">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="text-gray-300 text-4xl">🛍️</div>
                          )}

                          {/* Floating Top Left: Checkbox & SKU */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProduct(product.id)}
                              className="w-4 h-4 rounded text-blue-600 bg-white/90 cursor-pointer accent-blue-600 shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleCopySku(product.sku)}
                              className="font-mono text-[10px] font-black bg-slate-950/80 backdrop-blur-md text-white px-2 py-0.5 rounded-lg border border-white/20 shadow-xs cursor-pointer active:scale-95"
                              title="ចុច Copy SKU"
                            >
                              {product.sku}
                            </button>
                          </div>

                          {/* Floating Top Right: Status Badge */}
                          <div className="absolute top-3 right-3 z-10">
                            {isOut ? (
                              <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md animate-pulse">
                                🔴 ដាច់ស្តុក
                              </span>
                            ) : isLow ? (
                              <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md animate-pulse">
                                🟠 ជិតអស់ ({product.stock_qty})
                              </span>
                            ) : (
                              <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
                                🟢 ស្តុក: {product.stock_qty}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold mb-1">
                              <span className="bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">{product.category || 'ទូទៅ'}</span>
                              <span className="text-gray-400">Alert: {product.low_stock_alert || 5}</span>
                            </div>

                            <h4 className="font-black text-gray-900 text-sm line-clamp-2 leading-snug mt-1 group-hover:text-blue-600 transition-colors" title={product.name}>
                              {product.name}
                            </h4>

                            {/* Price */}
                            <div className="mt-2.5 flex items-baseline gap-2">
                              <span className="text-lg font-black text-emerald-600">
                                ${(Math.max(0, (Number(product.price) || 0) - (Number(product.retail_discount) || 0))).toFixed(2)}
                              </span>
                              {product.retail_discount > 0 && (
                                <span className="text-xs text-gray-400 line-through font-bold">
                                  ${parseFloat(product.price).toFixed(2)}
                                </span>
                              )}
                              {product.wholesale_price && parseFloat(product.wholesale_price) > 0 && (
                                <span className="text-[11px] font-bold text-indigo-600 ml-auto bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                  ដុំ: ${parseFloat(product.wholesale_price).toFixed(2)}
                                </span>
                              )}
                            </div>

                            {/* Stock Health Progress Bar */}
                            <div className="mt-3">
                              <div className="flex justify-between items-center text-[10px] font-black mb-1">
                                <span className="text-gray-500">កម្រិតស្តុក:</span>
                                <span className={isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}>
                                  {product.stock_qty} ឯកតា
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  style={{ width: `${Math.min(100, Math.max(8, (product.stock_qty / (product.low_stock_alert || 5) * 50)))}%` }} 
                                  className={`h-full transition-all duration-300 ${
                                    isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Quick Stepper & Actions */}
                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                            {/* Inline Stock Stepper */}
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                              <button
                                type="button"
                                disabled={isUpdating || product.stock_qty <= 0}
                                onClick={() => handleQuickStockAdjust(product, -1)}
                                className="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 text-gray-700 hover:text-rose-600 font-black text-xs flex items-center justify-center shadow-xs transition active:scale-90 disabled:opacity-30 cursor-pointer"
                                title="-1"
                              >
                                -
                              </button>
                              
                              <span className="w-7 text-center font-black text-xs text-gray-900">
                                {isUpdating ? '⏳' : product.stock_qty}
                              </span>

                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleQuickStockAdjust(product, 1)}
                                className="w-6 h-6 rounded-lg bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-600 font-black text-xs flex items-center justify-center shadow-xs transition active:scale-90 disabled:opacity-30 cursor-pointer"
                                title="+1"
                              >
                                +
                              </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              <button 
                                type="button"
                                onClick={() => handleOpenStockIn(product, 'IN')}
                                className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white p-2 rounded-xl text-xs font-black transition cursor-pointer shadow-2xs"
                                title="នាំចូលស្តុក (+ Stock In)"
                              >
                                📥
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  setBarcodeProduct(product);
                                  setBarcodePrintQty(1);
                                  setBarcodeModalOpen(true);
                                }}
                                className="bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white p-2 rounded-xl text-xs font-black transition cursor-pointer"
                                title="Barcode"
                              >
                                🏷️
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  setActiveTab('upload');
                                  setEditingProductId(product.id);
                                  setName(product.name || '');
                                  setSku(product.sku || '');
                                  setCategory(product.category || (categories[0] ? categories[0].name : ''));
                                  setSellingPrice(product.price ? product.price.toString() : '');
                                  setCostPrice(product.cost_price ? product.cost_price.toString() : '');
                                  setWholesalePrice(product.wholesale_price ? product.wholesale_price.toString() : '');
                                  setWholesaleDiscount(product.wholesale_discount ? product.wholesale_discount.toString() : '');
                                  setRetailDiscount(product.retail_discount ? product.retail_discount.toString() : '');
                                  setStockQty(product.stock_qty ? product.stock_qty.toString() : '10');
                                  setLowStockAlert(product.low_stock_alert ? product.low_stock_alert.toString() : '5');
                                  setColor(product.color || '');
                                  
                                  if (product.size && product.size !== 'N/A') {
                                    if (product.size.includes(':')) {
                                      const pairs = product.size.split(', ');
                                      const loadedSizes = [];
                                      const loadedStock = {};
                                      pairs.forEach(pair => {
                                        const [sz, qty] = pair.split(':');
                                        loadedSizes.push(sz);
                                        loadedStock[sz] = qty;
                                      });
                                      setSelectedSizes(loadedSizes);
                                      setVariantStock(loadedStock);
                                    } else {
                                      setSelectedSizes(product.size.split(', '));
                                      setVariantStock({});
                                    }
                                  }
                                  const parsedProd = parseProductMeta(product);
                                  setPreviewUrl(product.image_url || null);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white p-2 rounded-xl text-xs font-black transition cursor-pointer"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  setProductToDelete(product);
                                  setDeleteModalOpen(true);
                                }}
                                className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white p-2 rounded-xl text-xs font-black transition cursor-pointer"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        ) : (
          /* ⭐️ ផ្ទាំងតារាងប្រវត្តិចលនាស្តុក (Stock Movements Log - Audit Trail) ⭐️ */
          <div className="bg-white rounded-3xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-gray-900 text-base">📋 កំណត់ត្រាចលនាស្តុក (Stock Movement Audit History)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">តាមដានរាល់ការ នាំចូល (Purchase), លក់ចេញ (Sale), និងកាត់ស្តុក/កែតម្រូវ</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={movementSearch}
                      onChange={(e) => setMovementSearch(e.target.value)}
                      placeholder="ស្វែងរក SKU, ឈ្មោះ, មូលហេតុ..."
                      className="pl-8 pr-3 py-2 text-xs font-bold border border-gray-300 rounded-xl bg-white outline-none focus:border-blue-500 w-56"
                    />
                    <span className="absolute left-2.5 top-2 text-gray-400 text-xs">🔍</span>
                  </div>
                  <button 
                    type="button"
                    onClick={exportStockMovementsToCSV}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="ទាញយកកំណត់ត្រាចលនាស្តុកជា Excel/CSV"
                  >
                    <span>📊</span>
                    <span>Export Excel</span>
                  </button>
                  <button 
                    onClick={fetchStockMovements}
                    className="bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Filters for Audit Log */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200/60">
                {[
                  { id: 'ALL', label: `ទាំងអស់ (${stockMovements.length})` },
                  { id: 'PURCHASE', label: '📥 នាំចូល (Purchase)' },
                  { id: 'SALE', label: '📤 លក់ចេញ (Sale)' },
                  { id: 'ADJUSTMENT', label: '⚙️ កាត់ស្តុក / កែតម្រូវ (Adjustment)' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMovementFilterType(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      movementFilterType === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const filteredMovements = stockMovements.filter(m => {
                const matchesType = movementFilterType === 'ALL' || m.type === movementFilterType;
                const prodName = m.products?.name || '';
                const prodSku = m.products?.sku || '';
                const reason = m.reason || '';
                const q = movementSearch.toLowerCase();
                const matchesSearch = !q || prodName.toLowerCase().includes(q) || prodSku.toLowerCase().includes(q) || reason.toLowerCase().includes(q);
                return matchesType && matchesSearch;
              });

              if (loadingMovements) {
                return <div className="p-16 text-center text-gray-500 font-bold">កំពុងទាញកំណត់ត្រាចលនាស្តុក...</div>;
              }

              if (filteredMovements.length === 0) {
                return <div className="p-16 text-center text-gray-400 font-bold">មិនមានកំណត់ត្រាចលនាស្តុកស្របតាមលក្ខខណ្ឌនេះឡើយ។</div>;
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">កាលបរិច្ឆេទ</th>
                        <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">ទំនិញ</th>
                        <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">ទំហំ / ពណ៌</th>
                        <th className="px-5 py-4 uppercase text-xs font-black text-gray-500 text-center">ប្រភេទចលនា</th>
                        <th className="px-5 py-4 uppercase text-xs font-black text-gray-500 text-center">ចំនួនប្រែប្រួល</th>
                        <th className="px-5 py-4 uppercase text-xs font-black text-gray-500 text-center">ស្តុកចាស់ ➔ ថ្មី</th>
                        <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">មូលហេតុ / សម្គាល់</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {filteredMovements.map((log) => {
                        const isPositive = log.qty_change > 0;
                        let typeBadge = <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-black">{log.type}</span>;
                        
                        if (log.type === 'PURCHASE') {
                          typeBadge = <span className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-md text-[10px] font-black">📥 នាំចូល (In)</span>;
                        } else if (log.type === 'SALE') {
                          typeBadge = <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md text-[10px] font-black">📤 លក់ចេញ (Sale)</span>;
                        } else if (log.type === 'ADJUSTMENT') {
                          typeBadge = <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md text-[10px] font-black">⚙️ កាត់ស្តុក / កែតម្រូវ</span>;
                        }

                        return (
                          <tr key={log.id} className="hover:bg-gray-50/80 transition text-xs">
                            <td className="px-5 py-4 text-gray-500 font-bold whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                {log.products?.image_url && (
                                  <img src={log.products.image_url} className="w-8 h-8 rounded-lg object-cover bg-gray-100 border shrink-0" alt="" />
                                )}
                                <div>
                                  <p className="font-black text-gray-900">{log.products?.name || 'ទំនិញទូទៅ'}</p>
                                  <p className="text-[10px] text-gray-400 font-bold">{log.products?.sku}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-gray-600">
                              {log.product_variants?.size ? `Size: ${log.product_variants.size}` : 'ទូទៅ'}
                            </td>
                            <td className="px-5 py-4 text-center">{typeBadge}</td>
                            <td className={`px-5 py-4 text-center font-black text-sm ${isPositive ? 'text-green-600' : 'text-rose-600'}`}>
                              {isPositive ? `+${log.qty_change}` : log.qty_change}
                            </td>
                            <td className="px-5 py-4 text-center font-bold text-gray-600">
                              {log.previous_qty} ➔ <span className="text-gray-900 font-black">{log.new_qty}</span>
                            </td>
                            <td className="px-5 py-4 text-gray-500 italic max-w-xs truncate">
                              {log.reason || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* ⭐️ MODAL គ្រប់គ្រងចលនាស្តុក: នាំចូល (+IN) & កាត់ស្តុកចេញ (-OUT) ⭐️ */}
        {stockInModalOpen && stockInProduct && (() => {
          const selectedVar = stockInVariants.find(v => v.id.toString() === stockInSelectedVariant);
          const currentAvailable = selectedVar ? selectedVar.stock_qty : (stockInProduct.stock_qty || 0);

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100 animate-in zoom-in-95">
                
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <img 
                      src={stockInProduct.image_url || ''} 
                      className="w-12 h-12 rounded-xl object-cover bg-gray-100 border shrink-0" 
                      alt="" 
                    />
                    <div>
                      <h3 className="text-lg font-black text-gray-900 line-clamp-1">{stockInProduct.name}</h3>
                      <p className="text-xs text-blue-600 font-bold">SKU: {stockInProduct.sku} • ស្តុកសរុប: {stockInProduct.stock_qty}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setStockInModalOpen(false)} 
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-black cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* ⭐️ TABS: នាំចូលស្តុក (+IN) vs កាត់ស្តុកចេញ (-OUT) ⭐️ */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setStockActionType('IN');
                      setStockInReason('នាំចូលបន្ថែមពីមេការ');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      stockActionType === 'IN'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-gray-600 hover:text-emerald-700 hover:bg-white/60'
                    }`}
                  >
                    <span>📥</span>
                    <span>នាំចូលស្តុក (+ Stock In)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStockActionType('OUT');
                      setStockInReason('កាត់ស្តុកចេញ / ទំនិញខូចខាត');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      stockActionType === 'OUT'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'text-gray-600 hover:text-rose-700 hover:bg-white/60'
                    }`}
                  >
                    <span>📤</span>
                    <span>កាត់ស្តុកចេញ (- Stock Out)</span>
                  </button>
                </div>

                {/* Banner ព័ត៌មានស្តុកដែលអាចកាត់បាន */}
                {stockActionType === 'OUT' && (
                  <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <span>⚠️</span> ស្តុកដែលអាចកាត់បានខ្ពស់បំផុត៖
                    </span>
                    <span className="font-black text-rose-700 bg-white px-2 py-0.5 rounded-lg border border-rose-200">
                      {currentAvailable} គូ/មុខ
                    </span>
                  </div>
                )}

                <form onSubmit={handleConfirmStockIn} className="space-y-4">
                  {/* បើទំនិញមាន Variants (Sizes) ឱ្យជ្រើសរើស Size */}
                  {stockInVariants.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                        ជ្រើសរើសទំហំ (Size) {stockActionType === 'IN' ? 'ដែលត្រូវនាំចូល' : 'ដែលត្រូវកាត់ស្តុក'}
                      </label>
                      <select 
                        value={stockInSelectedVariant}
                        onChange={(e) => setStockInSelectedVariant(e.target.value)}
                        className={`w-full border-2 rounded-2xl p-3 text-sm font-bold bg-white outline-none transition ${
                          stockActionType === 'IN' ? 'focus:border-emerald-500 border-gray-200' : 'focus:border-rose-500 border-gray-200'
                        }`}
                      >
                        {stockInVariants.map(v => (
                          <option key={v.id} value={v.id}>
                            Size: {v.size} {v.color ? `(${v.color})` : ''} - ស្តុកបច្ចុប្បន្ន: {v.stock_qty}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                      {stockActionType === 'IN' ? 'ចំនួនដែលត្រូវនាំចូលបន្ថែម (+Qty) *' : 'ចំនួនដែលត្រូវកាត់ចេញវិញ (-Qty) *'}
                    </label>
                    <input 
                      type="number"
                      min="1"
                      max={stockActionType === 'OUT' ? currentAvailable : undefined}
                      required
                      value={stockInQty}
                      onChange={(e) => setStockInQty(e.target.value)}
                      placeholder="ឧ. 5"
                      className={`w-full border-2 rounded-2xl p-3.5 text-xl font-black outline-none transition ${
                        stockActionType === 'IN'
                          ? 'border-gray-200 text-emerald-700 focus:border-emerald-500 bg-emerald-50/20'
                          : 'border-gray-200 text-rose-700 focus:border-rose-500 bg-rose-50/20'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">សម្គាល់ / មូលហេតុ (Reason / Note)</label>
                    <input 
                      type="text"
                      value={stockInReason}
                      onChange={(e) => setStockInReason(e.target.value)}
                      placeholder={stockActionType === 'IN' ? 'ឧ. នាំចូលបន្ថែមពីមេការ ឬទិញបន្ថែម' : 'ឧ. ទំនិញខូចខាត, បាត់បង់, ឬកែតម្រូវស្តុក'}
                      className="w-full border-2 border-gray-200 rounded-2xl p-3 text-sm font-medium focus:border-blue-500 outline-none"
                    />
                    
                    {/* ប៊ូតុងមូលហេតុលឿនៗ (Quick Reasons) */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {stockActionType === 'IN' ? (
                        ['នាំចូលបន្ថែមពីមេការ', 'រោងចក្រដឹកមកដល់', 'ទិញចូលស្តុកថ្មី'].map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setStockInReason(r)}
                            className="text-[10px] font-bold bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200 transition cursor-pointer"
                          >
                            + {r}
                          </button>
                        ))
                      ) : (
                        ['ទំនិញខូចខាត', 'បាត់បង់/បាក់បែក', 'ប្តូរទំនិញសងម៉ូយ', 'កែសម្រួលស្តុកជាក់ស្តែង'].map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setStockInReason(r)}
                            className="text-[10px] font-bold bg-gray-100 hover:bg-rose-50 hover:text-rose-700 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200 transition cursor-pointer"
                          >
                            - {r}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setStockInModalOpen(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-2xl font-bold text-sm transition cursor-pointer"
                    >
                      បោះបង់
                    </button>
                    <button 
                      type="submit" 
                      disabled={stockInLoading}
                      className={`flex-1 py-3.5 rounded-2xl font-black text-sm shadow-lg transition cursor-pointer disabled:bg-gray-300 text-white ${
                        stockActionType === 'IN'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                          : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                      }`}
                    >
                      {stockInLoading 
                        ? 'កំពុងរក្សាទុក...' 
                        : stockActionType === 'IN' 
                        ? '📥 បញ្ជាក់ការនាំចូល' 
                        : '📤 បញ្ជាក់ការកាត់ស្តុក'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && productToDelete && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-gray-100 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-black">
                🗑
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">លុបទំនិញពីស្តុក?</h3>
              <p className="text-sm text-gray-500 mb-6">
                តើអ្នកពិតជាចង់លុបទំនិញ <span className="font-bold text-gray-800">"{productToDelete.name}"</span> នេះចេញពី Database មែនទេ?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setDeleteModalOpen(false); setProductToDelete(null); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-2xl font-bold text-sm transition"
                >
                  បោះបង់ (Cancel)
                </button>
                <button 
                  onClick={confirmDeleteProduct}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-red-600/30 transition"
                >
                  យល់ព្រមលុប (Delete)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ⭐️ MODAL នាំចូលទិន្នន័យស្តុកតាម EXCEL / CSV (BULK IMPORT MODAL) ⭐️ */}
        {bulkImportModalOpen && (
          <div className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 animate-in zoom-in-95">
              
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-black">
                    📥
                  </div>
                  <div>
                    <h3 className="text-xl font-black">នាំចូលទិន្នន័យស្តុកតាម Excel / CSV</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Bulk Inventory Import & Automatic Smart Sync</p>
                  </div>
                </div>
                <button 
                  onClick={() => { if (!bulkImportLoading) { setBulkImportModalOpen(false); setBulkParsedRows([]); setBulkImportResult(null); } }}
                  disabled={bulkImportLoading}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50">
                {/* File Summary Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-black">
                      📊
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">{bulkImportFile?.name || 'ឯកសារ Excel/CSV'}</h4>
                      <p className="text-xs text-gray-500">
                        រកឃើញទិន្នន័យទំនិញសរុប: <span className="font-black text-emerald-600">{bulkParsedRows.length} មុខ</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => bulkFileInputRef.current?.click()}
                      disabled={bulkImportLoading}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      🔄 ប្តូរឯកសារថ្មី
                    </button>
                    <button
                      type="button"
                      onClick={downloadInventoryTemplate}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>📋</span>
                      <span>ទាញយកគំរូ</span>
                    </button>
                  </div>
                </div>

                {/* Import Mode Options */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <h4 className="font-black text-gray-900 text-xs uppercase tracking-wider mb-3">របៀបបញ្ចូលទិន្នន័យ (Import Mode):</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${bulkImportMode === 'upsert' ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="radio" 
                        name="importMode" 
                        value="upsert" 
                        checked={bulkImportMode === 'upsert'} 
                        onChange={() => setBulkImportMode('upsert')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-black text-sm text-gray-900 block">🔄 ធ្វើបច្ចុប្បន្នភាព + បញ្ចូលថ្មី (Smart Upsert)</span>
                        <span className="text-xs text-gray-500 mt-0.5 block">
                          បើទំនិញមាន SKU ដូចគ្នារួចហើយ ប្រព័ន្ធនឹងធ្វើបច្ចុប្បន្នភាពស្តុក & តម្លៃ។ បើ SKU ថ្មី នឹងបញ្ចូលជាទំនិញថ្មី។ <b>(ណែនាំឱ្យប្រើ)</b>
                        </span>
                      </div>
                    </label>

                    <label className={`p-4 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition ${bulkImportMode === 'insert' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="radio" 
                        name="importMode" 
                        value="insert" 
                        checked={bulkImportMode === 'insert'} 
                        onChange={() => setBulkImportMode('insert')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-black text-sm text-gray-900 block">➕ បញ្ចូលជាទំនិញថ្មីទាំងអស់ (Insert Only)</span>
                        <span className="text-xs text-gray-500 mt-0.5 block">
                          បង្កើតកំណត់ត្រាផលិតផលថ្មីទាំងអស់ក្នុង Database ដោយមិនប៉ះពាល់ទំនិញចាស់។
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Loading Progress Bar */}
                {bulkImportLoading && (
                  <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-emerald-800 animate-pulse">
                        ⏳ {bulkImportProgress.status}
                      </span>
                      <span className="text-xs font-bold text-gray-600">
                        {Math.round((bulkImportProgress.current / (bulkImportProgress.total || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-150"
                        style={{ width: `${(bulkImportProgress.current / (bulkImportProgress.total || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Import Result Notification */}
                {bulkImportResult && (
                  <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900">
                    <div className="flex items-center gap-2 font-black text-base mb-1">
                      <span>🎉</span>
                      <span>ការនាំចូលទិន្នន័យបានបញ្ចប់ដោយជោគជ័យ!</span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      • បញ្ចូលថ្មី: <b>{bulkImportResult.inserted}</b> មុខ | 
                      • ធ្វើបច្ចុប្បន្នភាព: <b>{bulkImportResult.updated}</b> មុខ | 
                      • បរាជ័យ: <b>{bulkImportResult.failed}</b> មុខ
                    </p>
                    {bulkImportResult.errors && bulkImportResult.errors.length > 0 && (
                      <div className="mt-2 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg max-h-24 overflow-y-auto">
                        {bulkImportResult.errors.map((err, idx) => (
                          <div key={idx}>⚠️ {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Preview Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                    <h4 className="font-black text-gray-800 text-xs uppercase tracking-wider">
                      ផ្ទាំងមើលទិន្នន័យមុននឹងបញ្ចូល (Preview Data - {bulkParsedRows.length} Rows)
                    </h4>
                    <span className="text-[11px] text-gray-500">
                      បង្ហាញ ១០ ជួរដំបូង
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-black">
                          <th className="p-3">#</th>
                          <th className="p-3">ឈ្មោះទំនិញ</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3">ប្រភេទ (Category)</th>
                          <th className="p-3 text-right">ដើមទុន ($)</th>
                          <th className="p-3 text-right">តម្លៃលក់ ($)</th>
                          <th className="p-3 text-center">ស្តុក</th>
                          <th className="p-3 text-center">កម្រិត Alert</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bulkParsedRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 text-gray-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-bold text-gray-900 max-w-[200px] truncate">{row.name}</td>
                            <td className="p-3 font-mono text-gray-600 font-semibold">{row.sku}</td>
                            <td className="p-3">
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                {row.category}
                              </span>
                            </td>
                            <td className="p-3 text-right text-gray-500 font-mono">${row.cost_price.toFixed(2)}</td>
                            <td className="p-3 text-right font-black text-emerald-600 font-mono">${row.price.toFixed(2)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${row.stock_qty <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                {row.stock_qty}
                              </span>
                            </td>
                            <td className="p-3 text-center text-gray-400">{row.low_stock_alert}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bulkParsedRows.length > 10 && (
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500 font-bold">
                      ... និងទំនិញផ្សេងទៀតចំនួន {bulkParsedRows.length - 10} មុខទៀតដែលត្រៀមរួចជាស្រេច
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => { setBulkImportModalOpen(false); setBulkParsedRows([]); setBulkImportResult(null); }}
                  disabled={bulkImportLoading}
                  className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>

                <div className="flex items-center gap-3">
                  {bulkImportResult ? (
                    <button
                      type="button"
                      onClick={() => { setBulkImportModalOpen(false); setBulkParsedRows([]); setBulkImportResult(null); }}
                      className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg transition cursor-pointer"
                    >
                      ✓ រួចរាល់ (Close)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExecuteBulkImport}
                      disabled={bulkImportLoading || bulkParsedRows.length === 0}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {bulkImportLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>កំពុងនាំចូល...</span>
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          <span>ចាប់ផ្តើមនាំចូល ({bulkParsedRows.length} មុខ)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    );
  };

  // ⭐️ ផ្ទាំង POS ⭐️
    const PosView = () => {
    // ស្វែងរកប្រភេទ Category បន្ថែមដែលមានស្រាប់ក្នុង products ប៉ុន្តែមិនទាន់មានក្នុង categories list
    const extraCategoryNames = Array.from(new Set(
      products
        .map(p => (p.category || '').trim())
        .filter(c => c && !categories.some(cat => (cat.name || '').trim().toLowerCase() === c.toLowerCase()))
    ));

    const filteredProducts = products.filter(p => {
      const matchCat = posCategory === 'all' || 
        p.category === posCategory || 
        ((p.category || '').trim().toLowerCase() === (posCategory || '').trim().toLowerCase());
      const query = (posSearch || '').toLowerCase();
      const matchSearch = (p.name || '').toLowerCase().includes(query) || 
        (p.sku && p.sku.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });

    return (
      <div className="flex h-[calc(100vh-80px)] animate-in fade-in bg-gray-100 -m-10">
        
        {/* ផ្នែកខាងឆ្វេង: បញ្ជីទំនិញ និង Categories */}
        <div className="flex-1 flex flex-col h-full p-6">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-900">ប្រព័ន្ធលក់ (POS)</h2>
                <p className="text-xs text-gray-500 font-bold mt-0.5">អត្រាប្តូរប្រាក់: $1 = {exchangeRate.toLocaleString()} ៛</p>
              </div>
              
              {/* ⭐️ KEYBOARD SHORTCUT HELPER BADGES ⭐️ */}
              <div className="hidden xl:flex items-center gap-1.5 bg-slate-900/90 text-white px-3 py-1.5 rounded-2xl text-[11px] font-bold border border-slate-700 shadow-sm">
                <span className="text-amber-400 font-black">⚡ Shortcuts:</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-slate-300"><b>F2</b> ស្វែងរក</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-slate-300"><b>F4</b> រាយ/ដុំ</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-emerald-400"><b>F8 / Space</b> គិតលុយ</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-blue-400"><b>F9</b> ព្រីន</span>
              </div>
            </div>

            {/* ⭐️ Z-REPORT / របាយការណ៍បិទបញ្ជីវេនលក់ BUTTON ⭐️ */}
            <button
              type="button"
              onClick={() => setZReportModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer transition transform hover:scale-[1.02] active:scale-95 shrink-0"
            >
              <span>📋</span>
              <span>បិទបញ្ជីវេនលក់ (Z-Report)</span>
            </button>

            {/* ⭐️ TOGGLE របៀបលក់: លក់រាយ (Retail) vs លក់បោះដុំ (Wholesale) ⭐️ */}
            <div className="bg-white p-1 rounded-2xl border-2 border-gray-200 shadow-sm flex items-center shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchPriceMode('retail')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  posPriceMode === 'retail'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>🛍️</span>
                <span>លក់រាយ (Retail)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPriceMode('wholesale')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  posPriceMode === 'wholesale'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-300'
                    : 'text-gray-600 hover:text-purple-700 hover:bg-purple-50'
                }`}
              >
                <span>💼</span>
                <span>លក់បោះដុំ (Wholesale)</span>
              </button>
            </div>

            <div className="flex-1 max-w-md relative">
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder="ស្វែងរកឈ្មោះ ឬស្កេនបាកូដ (SKU)..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-blue-100 shadow-sm focus:border-blue-500 font-bold outline-none transition bg-white"
              />
              <span className="absolute left-4 top-3.5 text-blue-500 text-lg">🔍</span>
            </div>
          </div>

          {/* Categories Tab */}
          <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2 items-center">
            {/* ប៊ូតុង ទំនិញទាំងអស់ */}
            <button
              type="button"
              onClick={() => setPosCategory('all')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-sm transition flex items-center gap-2 cursor-pointer border ${
                posCategory === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                  : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-gray-200/80'
              }`}
            >
              <span>ទំនិញទាំងអស់</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tracking-tight ${
                posCategory === 'all' ? 'bg-white/25 text-white' : 'bg-blue-50 text-blue-700'
              }`}>
                ({products.length})
              </span>
            </button>

            {/* ប៊ូតុង ប្រភេទផលិតផលនីមួយៗ (បង្ហាញចំនួនច្បាស់ៗ ឧ. (5)) */}
            {categories.map(cat => {
              const catName = cat.name || '';
              const count = products.filter(
                p => (p.category || '').trim().toLowerCase() === catName.trim().toLowerCase()
              ).length;
              const isSelected = posCategory === catName || (posCategory || '').trim().toLowerCase() === catName.trim().toLowerCase();

              return (
                <button
                  key={cat.id || catName}
                  type="button"
                  onClick={() => setPosCategory(catName)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-sm transition flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                      : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-gray-200/80'
                  }`}
                >
                  <span>{catName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tracking-tight ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : count > 0
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-gray-50 text-gray-400'
                  }`}>
                    ({count})
                  </span>
                </button>
              );
            })}

            {/* ប្រភេទផ្សេងៗប្រសិនបើមានក្នុងផលិតផល ប៉ុន្តែមិនទាន់មានក្នុងតារាង Categories */}
            {extraCategoryNames.map(extraCat => {
              const count = products.filter(
                p => (p.category || '').trim().toLowerCase() === extraCat.trim().toLowerCase()
              ).length;
              const isSelected = posCategory === extraCat || (posCategory || '').trim().toLowerCase() === extraCat.trim().toLowerCase();

              return (
                <button
                  key={`extra-${extraCat}`}
                  type="button"
                  onClick={() => setPosCategory(extraCat)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-sm transition flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                      : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-gray-200/80'
                  }`}
                >
                  <span>{extraCat}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tracking-tight ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : count > 0
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-gray-50 text-gray-400'
                  }`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>


          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-2 pb-10">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock_qty <= 0;
                return (
                  <div 
                    key={product.id} 
                    onClick={() => handleProductClick(product)} 
                    className={`bg-white p-3 rounded-2xl shadow-sm hover:shadow-xl cursor-pointer border-2 transition transform hover:-translate-y-1 flex flex-col ${isOutOfStock ? 'opacity-50 border-gray-200 grayscale' : 'border-transparent hover:border-blue-500'}`}
                  >
                    <div className="aspect-square bg-gray-100 rounded-xl mb-3 overflow-hidden relative">
                      {product.image_url ? (
                        <img src={product.image_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="absolute inset-0 flex justify-center items-center text-gray-400 text-xs">គ្មានរូប</span>
                      )}
                      <span className={`absolute top-2 right-2 text-white text-[10px] px-2 py-0.5 rounded-md font-bold ${isOutOfStock ? 'bg-red-600' : 'bg-black/70'}`}>
                        {isOutOfStock ? 'អស់ស្តុក' : `ស្តុក: ${product.stock_qty}`}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-800 line-clamp-1 mb-1">{product.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold mb-2">{product.sku}</p>
                    <div className="flex justify-between items-end mt-auto pt-2 border-t border-gray-100">
                      <div>
                        {posPriceMode === 'wholesale' ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                                ដុំ
                              </span>
                              <p className="text-purple-700 font-black text-base">
                                ${getProductPosPrice(product, 'wholesale').toFixed(2)}
                              </p>
                            </div>
                            {product.wholesale_price && parseFloat(product.wholesale_price) > 0 ? (
                              <p className="text-[9px] text-gray-400 line-through font-bold">
                                រាយ: ${parseFloat(product.price).toFixed(2)}
                              </p>
                            ) : (
                              <span className="text-[8px] text-orange-500 font-bold block">
                                គ្មានតម្លៃដុំ (គិតថ្លៃរាយ)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                រាយ
                              </span>
                              <p className="text-blue-600 font-black text-base">
                                ${getProductPosPrice(product, 'retail').toFixed(2)}
                              </p>
                            </div>
                            {product.wholesale_price && parseFloat(product.wholesale_price) > 0 && (
                              <p className="text-[9px] text-purple-600 font-bold">
                                ដុំ: ${parseFloat(product.wholesale_price).toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold">
                        {Math.round(getProductPosPrice(product, posPriceMode) * exchangeRate).toLocaleString()} ៛
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ផ្នែកខាងស្តាំ: កន្រ្តកលក់ (Cart Management) */}
        <div className="w-[440px] bg-white border-l border-gray-200 shadow-2xl flex flex-col h-full z-10 shrink-0">
          <div className="p-4 border-b border-gray-100 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base flex items-center gap-1.5">
                  <span>🛒</span> កន្រ្តកទំនិញ (POS Cart)
                </h3>
                <button
                  type="button"
                  onClick={() => handleSwitchPriceMode(posPriceMode === 'wholesale' ? 'retail' : 'wholesale')}
                  className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                    posPriceMode === 'wholesale'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 hover:bg-purple-500/30'
                      : 'bg-blue-500/20 text-blue-300 border-blue-400/40 hover:bg-blue-500/30'
                  }`}
                  title="ចុចដើម្បីប្តូររបៀបលក់ ដុំ / រាយ"
                >
                  <span>{posPriceMode === 'wholesale' ? '💼' : '🛍️'}</span>
                  <span>{posPriceMode === 'wholesale' ? 'តម្លៃបោះដុំ' : 'តម្លៃលក់រាយ'}</span>
                  <span className="text-[9px] opacity-70">↺</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[220px] mt-0.5">
                អតិថិជន: <span className="text-white font-bold">{customerName || 'អតិថិជនទូទៅ'}</span>
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="bg-blue-600 text-xs font-bold px-2.5 py-1 rounded-full">{posCart.length} មុខ</span>
              {posCart.length > 0 && (
                <button onClick={clearCart} className="text-red-400 hover:text-red-300 text-xs font-bold bg-white/10 px-2.5 py-1 rounded-lg transition cursor-pointer">
                  🗑️ សម្អាត
                </button>
              )}
            </div>
          </div>

          {/* ⭐️ កន្លែង ADD ឈ្មោះអតិថិជនក្នុង POS (CUSTOMER INFO BAR) ⭐️ */}
          <div className="bg-slate-800/95 border-b border-slate-700/80 px-4 py-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                <span>👤</span> ព័ត៌មានអតិថិជន (Customer)
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerName('អតិថិជនទូទៅ');
                    setCustomerPhone('');
                    setDiscount(0);
                  }}
                  className="text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-blue-300 hover:text-white px-2 py-0.5 rounded-lg border border-slate-600 transition"
                  title="កំណត់ជាអតិថិជនទូទៅ"
                >
                  ⚡ ទូទៅ
                </button>
                <button
                  type="button"
                  onClick={openCreateCustomerModal}
                  className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded-lg transition flex items-center gap-1 shadow-xs"
                  title="បង្កើតអតិថិជនថ្មី"
                >
                  <span>+</span> អតិថិជន
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-7 relative">
                <input
                  type="text"
                  list="pos-customer-datalist"
                  value={customerName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerName(val);
                    const matched = customers.find(c => c.name && c.name.toLowerCase() === val.toLowerCase());
                    if (matched) {
                      if (matched.phone) setCustomerPhone(matched.phone);
                      if (matched.discount_percent > 0) setDiscount(matched.discount_percent);
                      if (matched.tier === 'WHOLESALE') handleSwitchPriceMode('wholesale');
                    }
                  }}
                  placeholder="វាយឈ្មោះអតិថិជន..."
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs font-bold rounded-xl pl-2.5 pr-6 py-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none placeholder-slate-500 shadow-inner"
                />
                {customerName && customerName !== 'អតិថិជនទូទៅ' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName('');
                      setCustomerPhone('');
                      setDiscount(0);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-black"
                  >
                    ✕
                  </button>
                )}
                {/* Datalist for fast auto-complete from registered customers */}
                <datalist id="pos-customer-datalist">
                  {customers.map((c, i) => (
                    <option key={i} value={c.name}>{c.phone ? `${c.phone} - ${c.tier}` : c.tier}</option>
                  ))}
                </datalist>
              </div>

              <div className="col-span-5">
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerPhone(val);
                    const matched = customers.find(c => c.phone && c.phone === val);
                    if (matched) {
                      setCustomerName(matched.name);
                      if (matched.discount_percent > 0) setDiscount(matched.discount_percent);
                      if (matched.tier === 'WHOLESALE') handleSwitchPriceMode('wholesale');
                    }
                  }}
                  placeholder="លេខទូរស័ព្ទ..."
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs font-bold rounded-xl px-2.5 py-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none placeholder-slate-500 shadow-inner"
                />
              </div>
            </div>

            {/* បង្ហាញព័ត៌មានកម្រិតអតិថិជនក្នុង POS (Customer Tier Badge) */}
            {(() => {
              const currentCust = customers.find(c => 
                (c.name && customerName && c.name.toLowerCase() === customerName.toLowerCase()) || 
                (c.phone && customerPhone && c.phone === customerPhone)
              );
              if (currentCust) {
                return (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-700 animate-in fade-in">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-amber-400 text-[10px]">
                        {currentCust.tier === 'VIP' ? '🥇 VIP' : currentCust.tier === 'WHOLESALE' ? '💼 បោះដុំ' : currentCust.tier === 'LOYAL' ? '🥈 ស្មោះត្រង់' : '🥉 ទូទៅ'}
                      </span>
                      {currentCust.discount_percent > 0 && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                          បញ្ចុះ {currentCust.discount_percent}%
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[10px] truncate max-w-[120px] font-medium">{currentCust.address || 'គ្មានអាសយដ្ឋាន'}</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {posCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <span className="text-5xl mb-3 opacity-40">🛍️</span>
                <p className="text-base font-bold text-gray-600">កន្រ្តកលក់ទទេរ</p>
                <p className="text-xs text-gray-400 mt-1">ចុចលើទំនិញ ឬស្កេនបាកូដដើម្បីលក់</p>
              </div>
            ) : (
              posCart.map(item => (
                <div key={item.cartItemId} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex gap-3">
                  <img src={item.image_url} className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0" alt="" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.size && <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded">Size: {item.size}</span>}
                          {item.color && <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded">{item.color}</span>}
                          {/* ប៊ូតុងចុចប្តូរតម្លៃដុំ/រាយ លើទំនិញនេះ */}
                          <button
                            type="button"
                            onClick={() => toggleItemPriceMode(item.cartItemId)}
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition border ${
                              item.priceMode === 'wholesale'
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
                            }`}
                            title="ចុចដើម្បីប្តូរតម្លៃទំនិញនេះ រវាង ដុំ/រាយ"
                          >
                            {item.priceMode === 'wholesale' ? '💼 ដុំ' : '🛍️ រាយ'}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => removePosItem(item.cartItemId)} className="text-gray-300 hover:text-red-500 font-bold text-xs">✕</button>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                        <button onClick={() => updatePosQty(item.cartItemId, -1)} className="w-6 h-6 bg-white rounded shadow-xs text-gray-700 font-black text-xs hover:bg-gray-50">-</button>
                        <span className="text-xs font-black w-5 text-center">{item.qty}</span>
                        <button onClick={() => updatePosQty(item.cartItemId, 1)} className="w-6 h-6 bg-white rounded shadow-xs text-gray-700 font-black text-xs hover:bg-gray-50">+</button>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-blue-600 text-sm">${(item.price * item.qty).toFixed(2)}</span>
                        <p className="text-[9px] text-gray-400 font-bold">{Math.round(item.price * item.qty * exchangeRate).toLocaleString()} ៛</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing & Checkout Footer */}
          <div className="p-5 bg-white border-t border-gray-100 shadow-lg rounded-t-3xl">
            <div className="flex gap-2 mb-4">
              <button onClick={parkOrder} disabled={posCart.length === 0} className="flex-1 bg-orange-50 text-orange-600 border border-orange-200 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-100 disabled:opacity-40 transition">
                ⏸ ផ្អាកទុកសិន
              </button>
              {holdOrders.length > 0 && (
                <button onClick={() => resumeOrder(0)} className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-100 transition shadow-xs">
                  ▶ បន្ត ({holdOrders[0].id})
                </button>
              )}
            </div>

            <div className="space-y-2 mb-4 text-xs font-bold text-gray-600 border-b border-dashed border-gray-200 pb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">សរុបរង (Subtotal):</span>
                <span>${posSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">បញ្ចុះតម្លៃ (Discount):</span>
                <div className="flex items-center gap-1 w-28">
                  <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full border border-gray-200 rounded-lg p-1 text-right font-bold outline-none" />
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="border border-gray-200 rounded-lg bg-gray-50 font-bold p-1 outline-none">
                    <option value="%">%</option>
                    <option value="$">$</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end mb-5">
              <div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider block">ទឹកប្រាក់សរុប (Total)</span>
                <span className="text-xs text-orange-600 font-black">{posTotalKHR.toLocaleString()} ៛</span>
              </div>
              <span className="text-4xl font-black text-blue-600">${posTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={() => {
                setAmountTendered(posTotal.toString()); // កំណត់ទឹកប្រាក់ស្មើស្រាប់
                setPaymentModalOpen(true);
              }}
              disabled={posCart.length === 0}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition disabled:bg-gray-300 disabled:shadow-none"
            >
              💳 ទូទាត់ប្រាក់ (PAY) [F8 / Space]
            </button>
          </div>
        </div>

                {/* ⭐️ MODAL ជ្រើសរើសទំហំ & ពណ៌ FULL OPTION ⭐️ */}
        {variantModalOpen && selectedProductForVariant && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95">
              
              {/* Header: បង្ហាញព័ត៌មានសង្ខេបពីទំនិញ */}
              <div className="flex gap-4 pb-4 border-b border-gray-100 items-center">
                <img 
                  src={selectedProductForVariant.image_url || ''} 
                  className="w-16 h-16 rounded-2xl object-cover bg-gray-100 border shrink-0" 
                  alt="" 
                />
                <div className="flex-1">
                  <h3 className="text-base font-black text-gray-900 line-clamp-1">{selectedProductForVariant.name}</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">SKU: {selectedProductForVariant.sku}</p>

                  {/* ជ្រើសរើសរបៀបគិតថ្លៃក្នុង Modal (រាយ vs ដុំ) */}
                  <div className="flex items-center gap-1.5 mt-2 bg-gray-100 p-0.5 rounded-xl border border-gray-200 w-fit">
                    <button
                      type="button"
                      onClick={() => setModalPriceMode('retail')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                        modalPriceMode === 'retail'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span>🛍️ រាយ:</span>
                      <span>${getProductPosPrice(selectedProductForVariant, 'retail').toFixed(2)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalPriceMode('wholesale')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                        modalPriceMode === 'wholesale'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-purple-700'
                      }`}
                    >
                      <span>💼 ដុំ:</span>
                      <span>${getProductPosPrice(selectedProductForVariant, 'wholesale').toFixed(2)}</span>
                    </button>
                  </div>

                  <p className="text-blue-600 font-black text-base mt-1.5">
                    ${getProductPosPrice(selectedProductForVariant, modalPriceMode).toFixed(2)} 
                    <span className="text-xs text-gray-400 font-bold ml-2">({Math.round(getProductPosPrice(selectedProductForVariant, modalPriceMode) * exchangeRate).toLocaleString()} ៛)</span>
                  </p>
                </div>
                <button 
                  onClick={() => setVariantModalOpen(false)} 
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {loadingVariants ? (
                <div className="py-12 text-center text-gray-400 font-bold text-xs">កំពុងទាញយកទិន្នន័យ...</div>
              ) : (
                <div className="py-4 space-y-5">
                  
                  {/* ១. ជម្រើសពណ៌ (Color Options) */}
                  {selectedProductForVariant.color && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-2">🎨 ជ្រើសរើសពណ៌ (Color)</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedProductForVariant.color.split(',').map((c, idx) => {
                          const col = c.trim();
                          const isSelected = modalSelectedColor === col;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setModalSelectedColor(col);
                                // ⭐️ ពេលប្តូរពណ៌ ត្រួតពិនិត្យ និងជ្រើសរើស Size ដែលមានក្នុងពណ៌នោះភ្លាមៗ ⭐️
                                const variantsForCol = currentProductVariants.filter(v => !v.color || v.color.trim().toLowerCase() === col.trim().toLowerCase());
                                const hasCurrentSize = variantsForCol.some(v => v.size === modalSelectedSize);
                                if (!hasCurrentSize && variantsForCol.length > 0) {
                                  const firstInStock = variantsForCol.find(v => v.stock_qty > 0) || variantsForCol[0];
                                  setModalSelectedSize(firstInStock.size);
                                }
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition cursor-pointer ${
                                isSelected 
                                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {col} {isSelected && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ២. ជម្រើសទំហំ (Size Options) ត្រងតាមពណ៌ដែលបានជ្រើសរើស មិនឱ្យចេញស្ទួនឡើយ */}
                  {(() => {
                    const filteredVariants = modalSelectedColor
                      ? currentProductVariants.filter(v => !v.color || v.color.trim().toLowerCase() === modalSelectedColor.trim().toLowerCase())
                      : currentProductVariants;

                    const displayVariants = filteredVariants.length > 0 ? filteredVariants : currentProductVariants;

                    return (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-bold text-gray-600 uppercase">👟 ជ្រើសរើសទំហំ (Size)</label>
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                            {displayVariants.length > 0 ? `មាន ${displayVariants.length} ទំហំ` : 'ទំហំទូទៅ'}
                          </span>
                        </div>

                        {displayVariants.length === 0 ? (
                          <div className="p-3 bg-gray-50 rounded-2xl text-xs font-bold text-gray-500 text-center">
                            ទំនិញនេះជាទំហំ Free Size / ទូទៅ (ស្តុកសរុប: {selectedProductForVariant.stock_qty})
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
                            {displayVariants.map((v, idx) => {
                              const isOutOfStock = v.stock_qty <= 0;
                              const isSelected = modalSelectedSize === v.size;
                              return (
                                <button
                                  key={v.id || idx}
                                  type="button"
                                  disabled={isOutOfStock}
                                  onClick={() => setModalSelectedSize(v.size)}
                                  className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center transition cursor-pointer ${
                                    isOutOfStock
                                      ? 'bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed'
                                      : isSelected
                                      ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-102 ring-2 ring-blue-300'
                                      : 'border-gray-200 bg-white text-gray-800 hover:border-blue-300'
                                  }`}
                                >
                                  <span className="text-sm font-black">{v.size}</span>
                                  <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-blue-100' : isOutOfStock ? 'text-red-500' : 'text-gray-400'}`}>
                                    {isOutOfStock ? 'អស់' : `សល់: ${v.stock_qty}`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ៣. ជ្រើសរើសចំនួនទិញ (+ / -) */}
                  <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                    <span className="text-xs font-bold text-gray-700 uppercase">ចំនួនទិញ (Quantity)</span>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                        className="w-8 h-8 rounded-xl bg-white border border-gray-300 font-black text-gray-700 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="text-base font-black text-gray-900 w-6 text-center">{modalQty}</span>
                      <button 
                        type="button"
                        onClick={() => setModalQty(modalQty + 1)}
                        className="w-8 h-8 rounded-xl bg-white border border-gray-300 font-black text-gray-700 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* ប៊ូតុងបញ្ជាក់ការបន្ថែមចូលកន្រ្តក */}
                  <button
                    type="button"
                    onClick={handleConfirmAddToCart}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                      modalPriceMode === 'wholesale'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-600/30'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                    }`}
                  >
                    <span>🛒 បញ្ចូលទៅកន្រ្តក (${modalPriceMode === 'wholesale' ? 'តម្លៃបោះដុំ' : 'តម្លៃលក់រាយ'})</span>
                    <span>•</span>
                    <span>${(getProductPosPrice(selectedProductForVariant, modalPriceMode) * modalQty).toFixed(2)}</span>
                  </button>

                </div>
              )}
            </div>
          </div>
        )}

        {/* ⭐️ MODAL ទូទាត់ប្រាក់ (PAYMENT MODAL) ⭐️ */}
        {paymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">ការទូទាត់ប្រាក់ (Checkout)</h2>
                <button onClick={() => setPaymentModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold">✕</button>
              </div>

              {/* Total Display */}
              <div className="text-center mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[11px] font-black text-blue-600 uppercase mb-0.5">ទឹកប្រាក់ត្រូវទូទាត់សរុប</p>
                <p className="text-3xl font-black text-blue-700">${posTotal.toFixed(2)}</p>
                <p className="text-xs font-bold text-gray-500 mt-0.5">= {posTotalKHR.toLocaleString()} រៀល</p>
              </div>

              {/* ⭐️ កន្លែង ADD / កែសម្រួលឈ្មោះអតិថិជនក្នុង MODAL ទូទាត់ ⭐️ */}
              <div className="mb-5 p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1.5 uppercase">
                    <span>👤</span> ឈ្មោះអតិថិជន (Customer Name)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerName('អតិថិជនទូទៅ');
                      setCustomerPhone('');
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    ⚡ អតិថិជនទូទៅ
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      list="pos-customer-datalist-modal"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="ឈ្មោះអតិថិជន..."
                      className="w-full bg-white border border-gray-300 text-gray-900 text-xs font-bold rounded-xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <datalist id="pos-customer-datalist-modal">
                      {customers.map((c, i) => (
                        <option key={i} value={c.name}>{c.phone ? `${c.phone} - ${c.tier}` : c.tier}</option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="លេខទូរស័ព្ទ (ស្រេចចិត្ត)..."
                      className="w-full bg-white border border-gray-300 text-gray-900 text-xs font-bold rounded-xl px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['Cash', 'ABA Pay / KHQR'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3.5 rounded-xl font-black text-sm border-2 transition ${paymentMethod === method ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {method === 'Cash' ? '💵 សាច់ប្រាក់ (Cash)' : '📱 ស្កេន KHQR (ABA)'}
                  </button>
                ))}
              </div>

              {paymentMethod === 'Cash' && (
                <div className="mb-6 space-y-4">
                  {/* Quick Tender Buttons */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ទឹកប្រាក់រហ័ស (Quick Cash)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[posTotal, 5, 10, 20, 50, 100].map((val, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAmountTendered(val.toString())}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black py-2 rounded-xl transition"
                        >
                          {idx === 0 ? 'Exact' : `$${val}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">ទឹកប្រាក់ទទួលបាន ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      className="w-full text-2xl font-black p-3.5 rounded-xl border-2 border-gray-300 focus:border-blue-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  {amountTendered && (
                    <div className={`flex justify-between items-center p-4 rounded-xl border ${changeAmount >= 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      <div>
                        <span className="font-bold text-xs uppercase block">ប្រាក់អាប់ (Change):</span>
                        <span className="text-xs font-bold opacity-70">≈ {Math.round(Math.max(0, changeAmount) * exchangeRate).toLocaleString()} ៛</span>
                      </div>
                      <span className="text-2xl font-black">${changeAmount > 0 ? changeAmount.toFixed(2) : '0.00'}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={processPayment}
                disabled={isProcessingPayment}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition shadow-xl disabled:bg-gray-400 flex justify-center items-center gap-2"
              >
                {isProcessingPayment ? 'កំពុងកាត់ស្តុក & បញ្ជាក់...' : '✓ បញ្ជាក់ការលក់ (COMPLETE SALE)'}
              </button>
            </div>
          </div>
        )}

        {/* ⭐️ MODAL វិក្កយបត្រកម្តៅស្តង់ដារ (THERMAL RECEIPT 80MM / 58MM WITH KHQR) ⭐️ */}
        {receiptData && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl p-5 flex flex-col max-h-[92vh] font-mono text-black border border-gray-300 max-w-sm w-full animate-in zoom-in-95">
              
              {/* Top Controls: 80mm vs 58mm Paper Size Switcher */}
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-200">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setThermalPaperSize('80mm')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      thermalPaperSize === '80mm'
                        ? 'bg-white text-black shadow-xs font-black'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    🖨️ 80mm ស្តង់ដារ
                  </button>
                  <button
                    type="button"
                    onClick={() => setThermalPaperSize('58mm')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      thermalPaperSize === '58mm'
                        ? 'bg-white text-black shadow-xs font-black'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    📱 58mm ខ្នាតតូច
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptData(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Thermal Slip Content Area */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div 
                  id="receipt-print-area" 
                  className={`mx-auto bg-white p-3 border border-dashed border-gray-300 text-black leading-tight ${
                    thermalPaperSize === '58mm' ? 'w-[245px] text-[10px]' : 'w-[310px] text-xs'
                  }`}
                >
                  {/* Store Header */}
                  <div className="text-center mb-2.5 space-y-1">
                    {storeSettings.logoUrl && (
                      <img 
                        src={storeSettings.logoUrl} 
                        alt="Logo" 
                        className="h-10 mx-auto object-contain filter grayscale contrast-200 mb-1" 
                      />
                    )}
                    <h2 className="text-xl font-black uppercase tracking-wider leading-none">
                      {storeSettings.storeName || 'SABAY LUK'}
                    </h2>
                    {storeSettings.storeSlogan && (
                      <p className="text-[10px] text-gray-600 font-bold">{storeSettings.storeSlogan}</p>
                    )}
                    <p className="text-[10px] text-gray-700">អាសយដ្ឋាន: {storeSettings.address || 'ភ្នំពេញ, កម្ពុជា'}</p>
                    <p className="text-[10px] text-gray-700 font-bold">ទូរស័ព្ទ: {storeSettings.phone || '096 720 5522'}</p>
                    <div className="border-b border-black border-dashed my-2"></div>
                    <h3 className="font-black text-xs uppercase tracking-widest">
                      *** វិក្កយបត្រផ្លូវការ / RECEIPT ***
                    </h3>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-0.5 mb-2 text-[11px]">
                    <div className="flex justify-between">
                      <span>លេខវិក្កយបត្រ:</span>
                      <span className="font-bold">{receiptData.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>កាលបរិច្ឆេទ:</span>
                      <span>{receiptData.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>អ្នកគិតប្រាក់:</span>
                      <span>Admin</span>
                    </div>
                    <div className="flex justify-between">
                      <span>អតិថិជន:</span>
                      <span className="font-bold truncate max-w-[140px]">{receiptData.customer || 'អតិថិជនទូទៅ'}</span>
                    </div>
                    {receiptData.phone && receiptData.phone !== 'N/A' && (
                      <div className="flex justify-between">
                        <span>លេខទូរស័ព្ទ:</span>
                        <span className="font-bold">{receiptData.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Items Table */}
                  <div className="border-b border-black border-dashed my-2"></div>
                  <table className="w-full mb-2 text-[11px]">
                    <thead>
                      <tr className="border-b border-black border-dashed text-[10px] font-bold">
                        <th className="text-left pb-1">មុខទំនិញ (Item)</th>
                        <th className="text-center pb-1 w-10">ចំនួន</th>
                        <th className="text-right pb-1 w-16">តម្លៃសរុប</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptData.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200/50">
                          <td className="py-1">
                            <p className="font-bold line-clamp-1">{item.name}</p>
                            <div className="text-[9px] text-gray-600 flex gap-2">
                              {item.size && <span>Size: {item.size}</span>}
                              {item.color && <span>Color: {item.color}</span>}
                              <span>@${Number(item.price).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="py-1 text-center font-bold">{item.qty}</td>
                          <td className="py-1 text-right font-bold">${(item.price * item.qty).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-b border-black border-dashed my-2"></div>
                  
                  {/* Financial Totals */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>តម្លៃសរុប (Subtotal):</span>
                      <span>${receiptData.subtotal.toFixed(2)}</span>
                    </div>
                    {receiptData.discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>បញ្ចុះតម្លៃ (Discount):</span>
                        <span>-${receiptData.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm pt-1.5 border-t border-black">
                      <span>សរុប (USD):</span>
                      <span>${receiptData.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-xs text-gray-800">
                      <span>សរុប (KHR):</span>
                      <span>{receiptData.totalKHR.toLocaleString()} ៛</span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="border-b border-black border-dashed my-2"></div>
                  <div className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between">
                      <span>វិធីសាស្ត្រទូទាត់:</span>
                      <span className="font-black uppercase">{receiptData.method}</span>
                    </div>
                    {receiptData.method === 'Cash' && (
                      <>
                        <div className="flex justify-between">
                          <span>ប្រាក់ទទួល (Tendered):</span>
                          <span>${Number(receiptData.tendered || receiptData.total).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>ប្រាក់អាប់ (Change):</span>
                          <span>${receiptData.change.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* KHQR Code Section */}
                  {storeSettings.khqrImageUrl ? (
                    <div className="my-3 p-2 border border-black border-dashed rounded-lg text-center space-y-1 bg-white">
                      <p className="text-[10px] font-black uppercase">📱 ស្កេន KHQR ដើម្បីទូទាត់ប្រាក់</p>
                      <img 
                        src={storeSettings.khqrImageUrl} 
                        alt="KHQR Code" 
                        className="w-28 h-28 mx-auto object-contain p-1 border border-black" 
                      />
                      <p className="text-[9px] font-black text-gray-800 uppercase">{storeSettings.bankAccountName || storeSettings.storeName}</p>
                      <div className="text-[8.5px] font-bold text-gray-600 flex flex-col items-center gap-0.5 pt-0.5">
                        {storeSettings.bankAccountKhr && (
                          <div className="flex items-center gap-1">
                            <span>៛ KHR:</span>
                            <span className="font-mono font-black">{storeSettings.bankAccountKhr}</span>
                          </div>
                        )}
                        {(storeSettings.bankAccountUsd || storeSettings.bankAccountNumber) && (
                          <div className="flex items-center gap-1">
                            <span>$ USD:</span>
                            <span className="font-mono font-black">{storeSettings.bankAccountUsd || storeSettings.bankAccountNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-b border-black border-dashed my-2.5"></div>
                  )}
                  
                  {/* Receipt Footer */}
                  <div className="text-center text-[10px] space-y-0.5 pt-1">
                    <p className="font-black">{storeSettings.thankYouMsg || 'សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត'}</p>
                    <p className="text-[9px] text-gray-600">{storeSettings.policyNote || 'ទំនិញដែលទិញរួចមិនអាចប្តូរជាប្រាក់វិញបានទេ'}</p>
                    <p className="text-[8px] text-gray-400 mt-1">*** System Powered by Sabay Luk POS ***</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-2 border-t border-gray-200 mt-2">
                <button 
                  type="button"
                  onClick={() => setReceiptData(null)} 
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold text-xs hover:bg-gray-200 transition cursor-pointer"
                >
                  បិទ (Close)
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const content = document.getElementById('receipt-print-area').innerHTML;
                    const printWindow = window.open('', '_blank', 'height=650,width=450');
                    const widthCss = thermalPaperSize === '58mm' ? '54mm' : '76mm';
                    const pageCss = thermalPaperSize === '58mm' ? '58mm auto' : '80mm auto';
                    const fontSize = thermalPaperSize === '58mm' ? '10px' : '11px';

                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <title>Receipt - ${receiptData.orderId}</title>
                          <style>
                            @page {
                              size: ${pageCss};
                              margin: 0mm;
                            }
                            * {
                              box-sizing: border-box;
                              -webkit-print-color-adjust: exact;
                              print-color-adjust: exact;
                            }
                            body {
                              font-family: 'Courier New', Courier, monospace, 'Hanuman', 'Siemreap', sans-serif;
                              width: ${widthCss};
                              margin: 0 auto;
                              padding: 2.5mm;
                              color: #000;
                              background: #fff;
                              font-size: ${fontSize};
                              line-height: 1.3;
                            }
                            img {
                              max-width: 100%;
                              height: auto;
                              display: block;
                              margin: 0 auto;
                            }
                            .text-center { text-align: center; }
                            .text-right { text-align: right; }
                            .text-left { text-align: left; }
                            .font-bold { font-weight: bold; }
                            .font-black { font-weight: 900; }
                            .flex { display: flex; }
                            .justify-between { justify-content: space-between; }
                            table {
                              width: 100%;
                              border-collapse: collapse;
                              font-size: inherit;
                            }
                            th, td {
                              padding: 2px 0;
                            }
                            .border-dashed { border-style: dashed; }
                            .border-b { border-bottom-width: 1px; }
                            .border-t { border-top-width: 1px; }
                            .border-black { border-color: #000; }
                          </style>
                        </head>
                        <body>
                          ${content}
                          <script>
                            window.onload = function() {
                              window.print();
                              setTimeout(function() { window.close(); }, 500);
                            };
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }} 
                  id="receipt-print-trigger-btn"
                  className="flex-1 bg-black hover:bg-gray-800 text-white py-3 rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>ព្រីន (${thermalPaperSize}) [F9]</span>
                </button>
              </div>
            </div>
          </div>
        )}
                {/* ⭐️ MODAL របាយការណ៍បិទបញ្ជីវេនលក់ប្រចាំថ្ងៃ (DAILY CASH DRAWER & Z-REPORT MODAL) ⭐️ */}
        {zReportModalOpen && (() => {
          const stats = getShiftReportStats();
          return (
            <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 animate-in zoom-in-95">
                
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-black">
                      📋
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        របាយការណ៍បិទបញ្ជីវេនលក់ប្រចាំថ្ងៃ (Z-Report)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        កាលបរិច្ឆេទ៖ {stats.todayStr} • ម៉ោង៖ {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setZReportModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-800 text-xs">
                  
                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                      <span className="text-[11px] font-bold text-emerald-700 block">💵 សរុបការលក់សាច់ប្រាក់ (Cash)</span>
                      <span className="text-xl font-black text-emerald-900 mt-1 block">
                        ${stats.systemCashSales.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">({stats.cashOrderCount} វិក្កយបត្រ)</span>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                      <span className="text-[11px] font-bold text-blue-700 block">📱 សរុបផ្ទេរ (KHQR / Bank)</span>
                      <span className="text-xl font-black text-blue-900 mt-1 block">
                        ${stats.systemKhqrSales.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-blue-600 font-bold">({stats.khqrOrderCount} វិក្កយបត្រ)</span>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
                      <span className="text-[11px] font-bold text-purple-700 block">✨ ចំណូលសរុបប្រចាំវេន</span>
                      <span className="text-xl font-black text-purple-900 mt-1 block">
                        ${stats.systemTotalSales.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-purple-600 font-bold">≈ {(stats.systemTotalSales * exchangeRate).toLocaleString()} ៛</span>
                    </div>
                  </div>

                  {/* Cash Drawer Comparison Section */}
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div>
                        <h4 className="font-black text-sm text-gray-900">💰 ផ្ទៀងផ្ទាត់សាច់ប្រាក់ក្នុងកេស (Cash in Drawer Reconciliation)</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">ប្រៀបធៀបសាច់ប្រាក់ជាក់ស្តែង ជាមួយតួលេខក្នុងប្រព័ន្ធ</p>
                      </div>
                      <span className="text-xs font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-xl">
                        លុយដើមវេន៖ ${stats.startingCash.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Expected */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                        <span className="text-[11px] font-bold text-gray-500 block uppercase">១. ប្រព័ន្ធគណនាឃើញ (Expected)</span>
                        <div className="flex justify-between items-center text-xs">
                          <span>លុយអាប់ដើមវេន៖</span>
                          <span className="font-black">${stats.startingCash.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>+ លក់បានសាច់ប្រាក់៖</span>
                          <span className="font-black text-emerald-600">+${stats.systemCashSales.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-dashed pt-2 flex justify-between items-center font-black text-sm text-gray-900">
                          <span>សរុបលុយត្រូវមានក្នុងកេស៖</span>
                          <span className="text-blue-600">${stats.expectedDrawerCash.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Actual Input */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
                        <span className="text-[11px] font-bold text-gray-500 block uppercase">២. សាច់ប្រាក់រាប់ជាក់ស្តែង (Actual Count)</span>
                        <div>
                          <label className="text-[11px] font-bold text-gray-700 block mb-1">
                            💵 លុយសុទ្ធរាប់ឃើញជាក់ស្តែង ($):
                          </label>
                          <input 
                            type="number"
                            step="0.01"
                            value={actualCashInput}
                            onChange={(e) => setActualCashInput(e.target.value)}
                            placeholder={`ឧ. ${stats.expectedDrawerCash.toFixed(2)}`}
                            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl p-2 font-black text-sm text-gray-900 outline-none"
                          />
                        </div>
                        <div className={`p-2.5 rounded-xl font-black text-xs flex justify-between items-center ${
                          Math.abs(stats.cashDiff) < 0.01 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : stats.cashDiff > 0 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-rose-100 text-rose-800'
                        }`}>
                          <span>ភាពខុសគ្នា (Discrepancy):</span>
                          <span>
                            {Math.abs(stats.cashDiff) < 0.01 
                              ? '✅ ស្មើគ្នាត្រឹមត្រូវ (Perfect Match)' 
                              : stats.cashDiff > 0 
                                ? `+${stats.cashDiff.toFixed(2)} (លើស)` 
                                : `-${Math.abs(stats.cashDiff).toFixed(2)} (ខ្វះ)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Closing Note */}
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        📝 ចំណាំពេលបិទវេន (Closing Note / Handover):
                      </label>
                      <input 
                        type="text"
                        value={shiftClosingNote}
                        onChange={(e) => setShiftClosingNote(e.target.value)}
                        placeholder="ឧ. ប្តូរវេនទៅកញ្ញា ធីតា, ប្រគល់លុយគ្រប់ចំនួន..."
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Previous Shift Closings Table */}
                  {shiftHistory.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-black text-sm text-gray-900">🕒 ប្រវត្តិបិទបញ្ជីវេនលក់ថ្មីៗ (Recent Shift Closings)</h4>
                      <div className="border border-gray-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-100 text-gray-600 font-black">
                            <tr>
                              <th className="p-3">កាលបរិច្ឆេទ/ម៉ោង</th>
                              <th className="p-3">វិក្កយបត្រ</th>
                              <th className="p-3">លក់សាច់ប្រាក់</th>
                              <th className="p-3">លក់ KHQR</th>
                              <th className="p-3">សរុប</th>
                              <th className="p-3">ស្ថានភាពលុយកេស</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {shiftHistory.slice(0, 5).map((sh, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-600">{new Date(sh.closedAt).toLocaleString()}</td>
                                <td className="p-3 font-bold text-gray-900">{sh.orderCount} កុម្ម៉ង់</td>
                                <td className="p-3 font-black text-emerald-600">${parseFloat(sh.systemCashSales || 0).toFixed(2)}</td>
                                <td className="p-3 font-black text-blue-600">${parseFloat(sh.systemKhqrSales || 0).toFixed(2)}</td>
                                <td className="p-3 font-black text-gray-900">${parseFloat(sh.systemTotalSales || 0).toFixed(2)}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                                    Math.abs(sh.cashDiff || 0) < 0.01 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : (sh.cashDiff > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
                                  }`}>
                                    {Math.abs(sh.cashDiff || 0) < 0.01 ? '✓ គ្រប់ចំនួន' : (sh.cashDiff > 0 ? `+${sh.cashDiff.toFixed(2)}` : `-${Math.abs(sh.cashDiff).toFixed(2)}`)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer Buttons */}
                <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const printContent = `
                        <div style="font-family: monospace; padding: 10px; width: 300px; text-align: center;">
                          <h2 style="margin: 0;">${storeSettings.storeName || 'SABAY LUK'}</h2>
                          <p style="margin: 4px 0; font-size: 11px;">របាយការណ៍បិទបញ្ជីវេនលក់ (Z-Report)</p>
                          <hr style="border-style: dashed;" />
                          <div style="text-align: left; font-size: 11px; line-height: 1.6;">
                            <div>កាលបរិច្ឆេទ៖ ${stats.todayStr}</div>
                            <div>ម៉ោងបិទ៖ ${new Date().toLocaleTimeString()}</div>
                            <div>សរុបវិក្កយបត្រ៖ ${stats.orderCount}</div>
                            <hr style="border-style: dashed;" />
                            <div>លុយដើមវេន៖ ${stats.startingCash.toFixed(2)}</div>
                            <div>លក់សាច់ប្រាក់៖ +${stats.systemCashSales.toFixed(2)}</div>
                            <div>លក់ KHQR៖ ${stats.systemKhqrSales.toFixed(2)}</div>
                            <div style="font-weight: bold;">ចំណូលសរុប៖ ${stats.systemTotalSales.toFixed(2)}</div>
                            <hr style="border-style: dashed;" />
                            <div>លុយត្រូវមានក្នុងកេស៖ ${stats.expectedDrawerCash.toFixed(2)}</div>
                            <div>លុយរាប់ជាក់ស្តែង៖ ${stats.actualCash.toFixed(2)}</div>
                            <div style="font-weight: bold;">ខុសគ្នា៖ ${stats.cashDiff.toFixed(2)}</div>
                          </div>
                          <hr style="border-style: dashed;" />
                          <p style="font-size: 10px; margin-top: 15px;">ហត្ថលេខាបេឡាករ៖ .....................</p>
                        </div>
                      `;
                      const printWin = window.open('', '_blank', 'height=650,width=450');
                      printWin.document.write(`<html><body onload="window.print(); setTimeout(function(){window.close();}, 500);">${printContent}</body></html>`);
                      printWin.document.close();
                    }}
                    className="px-5 py-3 rounded-2xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>🖨️</span> ព្រីន Z-Report (Slip)
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZReportModalOpen(false)}
                      className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 font-black text-xs hover:bg-gray-100 transition cursor-pointer"
                    >
                      បិទផ្ទាំង
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveShiftClose}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>💾</span> បញ្ជាក់បិទបញ្ជីវេនលក់ (Confirm Close)
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {barcodeModalOpen && barcodeProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="text-base font-black text-gray-900">🏷️ បោះពុម្ពស្លាក Barcode</h3>
                <button 
                  onClick={() => setBarcodeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              {/* ស្លាកបាកូដគំរូ (Barcode Sticker Preview 50x30mm) */}
              <div className="p-4 bg-gray-50 rounded-2xl flex flex-col items-center justify-center mb-4 border border-dashed border-gray-300">
                <div id="barcode-sticker-area" className="bg-white p-4 rounded-xl border border-gray-400 w-64 text-center font-mono text-black shadow-xs">
                  <p className="font-black text-xs tracking-wider uppercase">SABAY LUK STORE</p>
                  <p className="font-bold text-[11px] line-clamp-1 my-1">{barcodeProduct.name}</p>
                  
                  {/* បាកូដក្លែងធ្វើជាបន្ទាត់ Code 128 ស្អាតច្បាស់ */}
                  <div className="my-2 flex flex-col items-center">
                    <div className="tracking-[3px] font-black text-2xl scale-y-125 select-none font-mono">
                      ||| | |||| | || ||| ||
                    </div>
                    <span className="text-[10px] font-bold tracking-widest mt-0.5">{barcodeProduct.sku}</span>
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-1 border-t border-dashed border-gray-300 text-xs">
                    <span className="font-bold text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                      {barcodeProduct.size ? `Size: ${barcodeProduct.size}` : 'Standard'}
                    </span>
                    <span className="font-black text-sm text-black">${barcodeProduct.price ? barcodeProduct.price.toFixed(2) : '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* ប៊ូតុង Print Sticker */}
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setBarcodeModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-xs transition"
                >
                  បោះបង់
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const content = document.getElementById('barcode-sticker-area').innerHTML;
                    const printWindow = window.open('', '', 'height=400,width=400');
                    printWindow.document.write(`
                      <html>
                        <head>
                          <style>
                            body { font-family: monospace; display: flex; justify-content: center; align-items: center; margin: 0; padding: 10px; color: black; }
                            .sticker { text-align: center; border: 1px dashed black; padding: 10px; width: 60mm; }
                          </style>
                        </head>
                        <body>
                          <div class="sticker">${content}</div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-black text-xs shadow-md shadow-purple-600/30 transition flex items-center justify-center gap-1.5"
                >
                  🖨️ បោះពុម្ពស្លាក
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

    // ⭐️ ផ្ទាំងកែប្រែទម្រង់វិក្កយបត្រ (INVOICE SETTINGS VIEW) ⭐️
  const InvoiceSettingsView = () => (
    <div className="animate-in fade-in max-w-6xl mx-auto pb-12">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-3xl font-black text-gray-900">🧾 កំណត់ទម្រង់វិក្កយបត្រ (Invoice & Receipt Customizer)</h2>
        <p className="text-sm text-gray-500 mt-1">កែប្រែព័ត៌មានក្បាលវិក្កយបត្រ លេខទូរសព្ទ អត្រាប្តូរប្រាក់ និងលក្ខខណ្ឌប្តូរទំនិញ</p>
      </div>

      {invoiceSavedMsg && (
        <div className="p-4 mb-6 rounded-2xl font-bold text-sm bg-green-50 text-green-700 border border-green-200">
          {invoiceSavedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ផ្នែកខាងឆ្វេង: Form កែប្រែព័ត៌មាន */}
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <form onSubmit={handleSaveInvoiceSettings} className="space-y-5">
            <div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-3">🏢 ១. ព័ត៌មានក្បាលវិក្កយបត្រ (Header)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">ឈ្មោះហាង (Store Name) *</label>
                  <input 
                    type="text" 
                    value={invoiceSettings.storeName}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, storeName: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">លេខទូរសព្ទ (Tel) *</label>
                    <input 
                      type="text" 
                      value={invoiceSettings.phone}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, phone: e.target.value})}
                      className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">ចំណងជើងវិក្កយបត្រ (Title)</label>
                    <input 
                      type="text" 
                      value={invoiceSettings.title}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, title: e.target.value})}
                      className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">អាសយដ្ឋានហាង (Address)</label>
                  <input 
                    type="text" 
                    value={invoiceSettings.address}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, address: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-3">💵 ២. អត្រាប្តូរប្រាក់ និងគិតលុយ (Currency & Cashier)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">អត្រាប្រាក់រៀល ($1 = ? ៛)</label>
                  <input 
                    type="number" 
                    value={invoiceSettings.exchangeRate}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, exchangeRate: Number(e.target.value)})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-black text-blue-600 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">ឈ្មោះអ្នកគិតលុយ (Cashier)</label>
                  <input 
                    type="text" 
                    value={invoiceSettings.cashierName}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, cashierName: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide mb-3">📝 ៣. ជើងវិក្កយបត្រ & លក្ខខណ្ឌ (Footer & Policy)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">សារថ្លែងអំណរគុណ (Thank You Message)</label>
                  <input 
                    type="text" 
                    value={invoiceSettings.thankYouMsg}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, thankYouMsg: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">គោលការណ៍ / លក្ខខណ្ឌប្តូរទំនិញ (Policy Note)</label>
                  <textarea 
                    rows="2"
                    value={invoiceSettings.policyNote}
                    onChange={(e) => setInvoiceSettings({...invoiceSettings, policyNote: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition"
            >
              💾 រក្សាទុកការកំណត់វិក្កយបត្រ (Save Invoice Settings)
            </button>
          </form>
        </div>

        {/* ផ្នែកខាងស្តាំ: Live Preview សន្លឹកវិក្កយបត្រជាក់ស្តែង */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">👁️ គំរូសន្លឹកវិក្កយបត្រផ្ទាល់ (Live Preview 80mm)</p>
          
          <div className="bg-white w-[320px] rounded-2xl shadow-xl p-6 font-mono text-black border border-gray-300">
            <div className="text-center mb-3">
              <h2 className="text-2xl font-black uppercase tracking-widest">{invoiceSettings.storeName || 'SABAY LUK'}</h2>
              <p className="text-[10px] text-gray-600">{invoiceSettings.address || 'Phnom Penh, Cambodia'}</p>
              <p className="text-[10px] text-gray-600">Tel: {invoiceSettings.phone || '096 720 5522'}</p>
              <div className="border-b border-black border-dashed my-2"></div>
              <h3 className="font-bold text-xs">{invoiceSettings.title || 'OFFICIAL RECEIPT'}</h3>
            </div>

            <div className="space-y-0.5 mb-2 text-[11px]">
              <p>Order : <span className="font-bold">ORD-SAMPLE</span></p>
              <p>Date  : {new Date().toLocaleString()}</p>
              <p>Cashier: {invoiceSettings.cashierName || 'Admin'}</p>
              <p>Customer: អតិថិជនទូទៅ</p>
            </div>
            
            <div className="border-b border-black border-dashed my-2"></div>
            <table className="w-full mb-2 text-[11px]">
              <thead>
                <tr className="border-b border-black border-dashed">
                  <th className="text-left pb-1">Item</th>
                  <th className="text-center pb-1">Qty</th>
                  <th className="text-right pb-1">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1">
                    <p className="font-bold">ស្បែកជើងបុរស</p>
                    <span className="text-[9px] text-gray-600">Size: 41</span>
                  </td>
                  <td className="py-1 text-center">1</td>
                  <td className="py-1 text-right">$20.00</td>
                </tr>
                <tr>
                  <td className="py-1">
                    <p className="font-bold">ស្បែកជើងបុរស</p>
                    <span className="text-[9px] text-gray-600">Size: 39</span>
                  </td>
                  <td className="py-1 text-center">1</td>
                  <td className="py-1 text-right">$20.00</td>
                </tr>
              </tbody>
            </table>
            <div className="border-b border-black border-dashed my-2"></div>
            
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between"><p>Subtotal</p><p>$40.00</p></div>
              <div className="flex justify-between"><p>Discount</p><p>-$0.00</p></div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
                <p>TOTAL (USD)</p><p>$40.00</p>
              </div>
              <div className="flex justify-between font-black text-xs text-gray-700">
                <p>TOTAL (KHR)</p>
                <p>{(40 * (invoiceSettings.exchangeRate || 4100)).toLocaleString()} ៛</p>
              </div>
            </div>

            <div className="border-b border-black border-dashed my-2"></div>
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between"><p>Paid By</p><p className="font-bold">ABA Pay / KHQR</p></div>
            </div>
            <div className="border-b border-black border-dashed my-3"></div>
            
            <div className="text-center text-[10px]">
              <p className="font-bold">{invoiceSettings.thankYouMsg || 'សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត'}</p>
              <p className="mt-1 text-[9px] text-gray-600">{invoiceSettings.policyNote}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  const CustomersView = () => {
    // ត្រងទិន្នន័យអតិថិជនតាមការស្វែងរក និងប្រភេទ Tier
    const filteredCustomers = customers.filter(c => {
      const matchSearch = 
        (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone || '').includes(customerSearch) ||
        (c.telegram || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.address || '').toLowerCase().includes(customerSearch.toLowerCase());
      
      const matchTier = customerFilterTier === 'all' ? true : c.tier === customerFilterTier;
      return matchSearch && matchTier;
    });

    // គណនាស្ថិតិសរុប
    const totalCustomersCount = customers.length;
    const vipCount = customers.filter(c => c.tier === 'VIP' || c.tier === 'LOYAL').length;
    const wholesaleCount = customers.filter(c => c.tier === 'WHOLESALE').length;
    const lifetimeRevenue = customers.reduce((sum, c) => {
      const m = getCustomerMetrics(c);
      return sum + m.totalSpent;
    }, 0);

    return (
      <div className="animate-in fade-in pb-16 space-y-6">
        
        {/* ១. Header & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl text-xl shadow-md shadow-blue-500/20">
                👥
              </span>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  ប្រព័ន្ធគ្រប់គ្រងអតិថិជន <span className="text-xs font-black bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full uppercase">Full CRM</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">គ្រប់គ្រងព័ត៌មានអតិថិជន, ប្រភេទ VIP/បោះដុំ, ប្រវត្តិកុម្ម៉ង់ទិញ និងទាក់ទងផ្ទាល់</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={exportCustomersToCSV}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 border border-gray-200 shadow-2xs cursor-pointer"
            >
              <span>📥</span> នាំចេញ Excel / CSV
            </button>
            <button
              type="button"
              onClick={openCreateCustomerModal}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-600/30 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base">➕</span> បង្កើតអតិថិជនថ្មី
            </button>
          </div>
        </div>

        {/* ២. កាតស្ថិតិអតិថិជនសំខាន់ៗ (KPIs) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50/80 to-white p-5 rounded-3xl border border-blue-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase">អតិថិជនសរុប</span>
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black">👥</span>
            </div>
            <p className="text-2xl font-black text-blue-950 mt-2">{totalCustomersCount}</p>
            <p className="text-[11px] text-gray-400 font-bold mt-0.5">បានចុះឈ្មោះក្នុងប្រព័ន្ធ</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50/80 to-white p-5 rounded-3xl border border-amber-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase">VIP & ស្មោះត្រង់</span>
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-black">🥇</span>
            </div>
            <p className="text-2xl font-black text-amber-950 mt-2">{vipCount}</p>
            <p className="text-[11px] text-amber-600 font-bold mt-0.5">ទទួលបានការបញ្ចុះតម្លៃពិសេស</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50/80 to-white p-5 rounded-3xl border border-purple-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 uppercase">អតិថិជនបោះដុំ</span>
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-black">💼</span>
            </div>
            <p className="text-2xl font-black text-purple-950 mt-2">{wholesaleCount}</p>
            <p className="text-[11px] text-purple-600 font-bold mt-0.5">ម៉ូយដុំទិញបរិមាណច្រើន</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/80 to-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase">ចំណូលសរុបអតិថិជន</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-black">💰</span>
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-2">${lifetimeRevenue.toFixed(2)}</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Lifetime Customer Value</p>
          </div>
        </div>

        {/* ៣. របារស្វែងរក & តម្រង (Search & Filters) */}
        <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="ស្វែងរកតាម ឈ្មោះ, លេខទូរស័ព្ទ, អាសយដ្ឋាន..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-9 pr-8 py-2.5 text-xs font-bold text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            {customerSearch && (
              <button
                type="button"
                onClick={() => setCustomerSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-black"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'ទាំងអស់', count: customers.length },
              { id: 'VIP', label: '🥇 VIP', count: customers.filter(c => c.tier === 'VIP').length },
              { id: 'WHOLESALE', label: '💼 បោះដុំ', count: customers.filter(c => c.tier === 'WHOLESALE').length },
              { id: 'LOYAL', label: '🥈 ស្មោះត្រង់', count: customers.filter(c => c.tier === 'LOYAL').length },
              { id: 'REGULAR', label: '🥉 ទូទៅ', count: customers.filter(c => c.tier === 'REGULAR').length },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCustomerFilterTier(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  customerFilterTier === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  customerFilterTier === tab.id ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ៤. តារាងបញ្ជីអតិថិជន (Customers Table) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-black">
                <tr>
                  <th className="px-5 py-4">អតិថិជន (Customer)</th>
                  <th className="px-5 py-4">ប្រភេទ & បញ្ចុះតម្លៃ</th>
                  <th className="px-5 py-4">ទំនាក់ទំនង (Contact)</th>
                  <th className="px-5 py-4">អាសយដ្ឋានដឹកជញ្ជូន</th>
                  <th className="px-5 py-4 text-center">កុម្ម៉ង់ & ចំណាយសរុប</th>
                  <th className="px-5 py-4">កំណត់ចំណាំ</th>
                  <th className="px-5 py-4 text-right pr-6">សកម្មភាព (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">👥</span>
                        <p className="font-bold text-sm text-gray-500">រកមិនឃើញអតិថិជនត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ</p>
                        <button
                          type="button"
                          onClick={openCreateCustomerModal}
                          className="mt-2 text-xs font-black text-blue-600 hover:underline cursor-pointer"
                        >
                          + ចុចទីនេះដើម្បីបង្កើតអតិថិជនថ្មី
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => {
                    const metric = getCustomerMetrics(c);

                    // Badge តាម Tier
                    let tierBadge = (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-xl text-[10px] font-black border border-gray-200">
                        🥉 ទូទៅ
                      </span>
                    );
                    let avatarBg = 'from-slate-600 to-slate-800';

                    if (c.tier === 'VIP') {
                      tierBadge = (
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-xs">
                          🥇 VIP ({c.discount_percent || 10}%)
                        </span>
                      );
                      avatarBg = 'from-amber-500 to-yellow-600';
                    } else if (c.tier === 'WHOLESALE') {
                      tierBadge = (
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-xs">
                          💼 បោះដុំ ({c.discount_percent || 15}%)
                        </span>
                      );
                      avatarBg = 'from-purple-600 to-indigo-600';
                    } else if (c.tier === 'LOYAL') {
                      tierBadge = (
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-xs">
                          🥈 ស្មោះត្រង់ ({c.discount_percent || 5}%)
                        </span>
                      );
                      avatarBg = 'from-emerald-600 to-teal-600';
                    }

                    // អក្សរកាត់សម្រាប់ Avatar
                    const initial = (c.name || 'C').trim().slice(0, 2).toUpperCase();

                    return (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition">
                        {/* ឈ្មោះ & ID */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${avatarBg} text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0`}>
                              {initial}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-sm">{c.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 font-bold">{c.id}</span>
                                <span className="text-[10px] text-gray-400 font-medium">• ចុះឈ្មោះ: {c.joined || 'ថ្មី'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* ប្រភេទ & បញ្ចុះតម្លៃ */}
                        <td className="px-5 py-4">
                          <div>
                            {tierBadge}
                            {c.discount_percent > 0 && (
                              <p className="text-[10px] text-emerald-600 font-bold mt-1">
                                បញ្ចុះតម្លៃ: {c.discount_percent}% លើវិក្កយបត្រ
                              </p>
                            )}
                          </div>
                        </td>

                        {/* ទំនាក់ទំនង */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {c.phone && (
                              <a
                                href={`tel:${c.phone}`}
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-black hover:underline"
                                title="ចុចដើម្បីទូរស័ព្ទផ្ទាល់"
                              >
                                <span>📞</span> {c.phone}
                              </a>
                            )}
                            {c.telegram && (
                              <div>
                                <a
                                  href={`https://t.me/${c.telegram.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800 font-bold hover:underline"
                                  title="ផ្ញើសារ Telegram"
                                >
                                  <span>✈️</span> @{c.telegram.replace(/^@/, '')}
                                </a>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* អាសយដ្ឋាន */}
                        <td className="px-5 py-4">
                          <div className="max-w-[200px]">
                            {c.address ? (
                              <p className="text-[11px] text-gray-700 font-bold line-clamp-2" title={c.address}>
                                📍 {c.address}
                              </p>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">មិនទាន់បញ្ជាក់</span>
                            )}
                          </div>
                        </td>

                        {/* ចំនួនកុម្ម៉ង់ & ចំណាយ */}
                        <td className="px-5 py-4 text-center">
                          <div>
                            <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                              ${metric.totalSpent.toFixed(2)}
                            </span>
                            <p className="text-[10px] text-gray-500 font-bold mt-1">
                              ទិញបាន {metric.totalOrders} លើក
                            </p>
                          </div>
                        </td>

                        {/* កំណត់ចំណាំ */}
                        <td className="px-5 py-4">
                          <p className="text-[11px] text-gray-500 italic max-w-[160px] line-clamp-2" title={c.notes}>
                            {c.notes || '-'}
                          </p>
                        </td>

                        {/* សកម្មភាព (Actions) */}
                        <td className="px-5 py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* មើលប្រវត្តិទិញ */}
                            <button
                              type="button"
                              onClick={() => openCustomerHistory(c)}
                              title="មើលប្រវត្តិកុម្ម៉ង់ទិញលម្អិត"
                              className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                            >
                              👁️
                            </button>

                            {/* លក់ជូនក្នុង POS ភ្លាមៗ */}
                            <button
                              type="button"
                              onClick={() => handleQuickSellToCustomer(c)}
                              title="ចេញវិក្កយបត្រលក់ជូនអតិថិជននេះ (Go to POS)"
                              className="p-2 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
                            >
                              🛒
                            </button>

                            {/* កែប្រែព័ត៌មាន */}
                            <button
                              type="button"
                              onClick={() => openEditCustomerModal(c)}
                              title="កែប្រែព័ត៌មានអតិថិជន"
                              className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                            >
                              ✏️
                            </button>

                            {/* លុបអតិថិជន */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(c.id)}
                              title="លុបអតិថិជន"
                              className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ៥. MODAL បង្កើត / កែប្រែអតិថិជន (Add / Edit Customer Modal) */}
        {customerModalOpen && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{editingCustomer ? '✏️' : '➕'}</span>
                  <h3 className="font-black text-gray-900 text-base">
                    {editingCustomer ? 'កែប្រែព័ត៌មានអតិថិជន' : 'បង្កើតអតិថិជនថ្មី (New Customer)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center text-sm font-black transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ឈ្មោះអតិថិជន */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      ឈ្មោះអតិថិជន (Full Name) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={custFormName}
                      onChange={(e) => setCustFormName(e.target.value)}
                      placeholder="ឧ. សុខ វិសាល"
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition bg-white"
                    />
                  </div>

                  {/* លេខទូរស័ព្ទ */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      លេខទូរស័ព្ទ (Phone) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={custFormPhone}
                      onChange={(e) => setCustFormPhone(e.target.value)}
                      placeholder="012 345 678"
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition bg-white"
                    />
                  </div>

                  {/* Telegram */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      Telegram Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">@</span>
                      <input
                        type="text"
                        value={custFormTelegram}
                        onChange={(e) => setCustFormTelegram(e.target.value)}
                        placeholder="username"
                        className="w-full border-2 border-gray-200 rounded-2xl pl-8 pr-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition bg-white"
                      />
                    </div>
                  </div>

                  {/* ប្រភេទអតិថិជន (Tier) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      កម្រិតអតិថិជន (Customer Tier)
                    </label>
                    <select
                      value={custFormTier}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustFormTier(val);
                        // Default discount based on tier
                        if (val === 'VIP') setCustFormDiscount('10');
                        else if (val === 'WHOLESALE') setCustFormDiscount('15');
                        else if (val === 'LOYAL') setCustFormDiscount('5');
                        else setCustFormDiscount('0');
                      }}
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition bg-white"
                    >
                      <option value="REGULAR">🥉 អតិថិជនទូទៅ (Regular)</option>
                      <option value="LOYAL">🥈 អតិថិជនស្មោះត្រង់ (Loyal - 5%)</option>
                      <option value="VIP">🥇 អតិថិជន VIP (VIP - 10%)</option>
                      <option value="WHOLESALE">💼 អតិថិជនបោះដុំ (Wholesale - 15%)</option>
                    </select>
                  </div>

                  {/* ការបញ្ចុះតម្លៃផ្ទាល់ខ្លួន (%) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      ការបញ្ចុះតម្លៃផ្ទាល់ខ្លួន (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={custFormDiscount}
                      onChange={(e) => setCustFormDiscount(e.target.value)}
                      placeholder="0"
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-black text-emerald-600 focus:border-emerald-500 outline-none transition bg-white"
                    />
                  </div>

                  {/* អាសយដ្ឋានដឹកជញ្ជូន */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      អាសយដ្ឋានដឹកជញ្ជូន (Delivery Address)
                    </label>
                    <input
                      type="text"
                      value={custFormAddress}
                      onChange={(e) => setCustFormAddress(e.target.value)}
                      placeholder="ផ្ទះលេខ, ផ្លូវ, សង្កាត់, រាជធានី/ខេត្ត..."
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition bg-white"
                    />
                  </div>

                  {/* កំណត់ចំណាំ */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      កំណត់ចំណាំផ្ទាល់ខ្លួន (Notes)
                    </label>
                    <textarea
                      rows="2"
                      value={custFormNotes}
                      onChange={(e) => setCustFormNotes(e.target.value)}
                      placeholder="ឧ. ចំណូលចិត្តទំហំ Size 41, ពណ៌ខ្មៅ, ដឹកតាមវីរៈប៊ុនថាំ..."
                      className="w-full border-2 border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:border-blue-500 outline-none transition bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCustomerModalOpen(false)}
                    className="px-5 py-3 rounded-2xl text-xs font-black text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-blue-600/30 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    💾 {editingCustomer ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតអតិថិជន'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ៦. MODAL មើលប្រវត្តិកុម្ម៉ង់ទិញលម្អិតរបស់អតិថិជន (Customer Purchase History Modal) */}
        {customerHistoryModalOpen && selectedCustomerForHistory && (() => {
          const c = selectedCustomerForHistory;
          const metric = getCustomerMetrics(c);
          return (
            <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50/40 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-blue-600 text-white rounded-2xl text-lg shadow-md shadow-blue-500/20">
                      📜
                    </span>
                    <div>
                      <h3 className="font-black text-gray-900 text-base">
                        ប្រវត្តិកុម្ម៉ង់ទិញរបស់ {c.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-bold">
                        {c.id} • ទូរស័ព្ទ: {c.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerHistoryModalOpen(false);
                      setSelectedCustomerForHistory(null);
                    }}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center text-sm font-black transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  
                  {/* Summary Banner */}
                  <div className="grid grid-cols-3 gap-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">កុម្ម៉ង់សរុប</span>
                      <p className="text-xl font-black text-white mt-0.5">{metric.totalOrders} លើក</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ទឹកប្រាក់សរុប</span>
                      <p className="text-xl font-black text-emerald-400 mt-0.5">${metric.totalSpent.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ប្រភេទអតិថិជន</span>
                      <p className="text-sm font-black text-amber-300 mt-1">{c.tier} ({c.discount_percent || 0}%)</p>
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div>
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <span>🛍️</span> បញ្ជីវិក្កយបត្រ និងទំនិញដែលបានទិញ ({metric.orders.length})
                    </h4>

                    {metric.orders.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <span className="text-2xl">📦</span>
                        <p className="text-xs font-bold text-gray-500 mt-2">មិនទាន់មានវិក្កយបត្រក្នុងប្រព័ន្ធនៅឡើយទេ</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">អតិថិជននេះមានទិន្នន័យចំណាយដើម ${c.baseSpent || 0}</p>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 text-gray-600 font-black border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3">លេខវិក្កយបត្រ</th>
                              <th className="px-4 py-3">កាលបរិច្ឆេទ</th>
                              <th className="px-4 py-3">ប្រភព</th>
                              <th className="px-4 py-3">ទំនិញ</th>
                              <th className="px-4 py-3 text-right">ទឹកប្រាក់</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {metric.orders.map((ord, idx) => (
                              <tr key={ord.id || idx} className="hover:bg-gray-50/70 transition">
                                <td className="px-4 py-3 font-black text-blue-600">{ord.order_id || ord.id}</td>
                                <td className="px-4 py-3 text-gray-500 font-medium">
                                  {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : (ord.date || '-')}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                                    ord.order_type === 'POS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {ord.order_type || 'POS'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-700 font-medium max-w-[200px]">
                                  {Array.isArray(ord.items) && ord.items.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {ord.items.map((it, i) => (
                                        <div key={i} className="truncate text-[11px]">
                                          • {it.name || it.product_name} x{it.qty || it.quantity || 1}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">ទំនិញទូទៅ</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                                  ${(parseFloat(ord.total || ord.total_amount) || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                  <span className="text-xs text-gray-500 font-bold">
                    📍 {c.address || 'គ្មានអាសយដ្ឋាន'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerHistoryModalOpen(false);
                      handleQuickSellToCustomer(c);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🛒</span> ចេញវិក្កយបត្រលក់ជូនអតិថិជននេះ (Go to POS)
                  </button>
                </div>

              </div>
            </div>
          );
        })()}

      </div>
    );
  };

  // ================= 🏪 ផ្ទាំងកំណត់ហាង & ម៉ាកយីហោ (STORE SETTINGS & BRANDING VIEW) =================
  const StoreSettingsView = () => (
    <div className="animate-in fade-in max-w-6xl mx-auto pb-16 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="p-3 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-2xl text-xl shadow-md shadow-orange-500/20">
            🏪
          </span>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              ការកំណត់ហាង & ម៉ាកយីហោ <span className="text-xs font-black bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full uppercase">White Label Ready</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              កែប្រែ Logo, ឈ្មោះហាង, ព័ត៌មានទំនាក់ទំនង, គណនី KHQR និងការបង្ហាញទាំងអស់លើ Website ដោយងាយស្រួល
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-1.5 border border-gray-200"
          >
            <span>👁️</span> មើលមុខហាងផ្ទាល់
          </a>
          <button
            type="button"
            onClick={handleSaveStoreSettings}
            className="bg-gradient-to-r from-[#ff6a00] to-orange-600 hover:from-[#e55f00] hover:to-orange-700 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-orange-500/25 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>💾</span> រក្សាទុកការកំណត់
          </button>
        </div>
      </div>

      {storeSettingsSavedMsg && (
        <div className="p-4 rounded-2xl font-black text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 animate-in fade-in">
          <span>✅</span> {storeSettingsSavedMsg}
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'branding', label: '🎨 ម៉ាកយីហោ & Logo', desc: 'ឈ្មោះហាង, Logo, ពាក្យស្លោក' },
          { id: 'theme', label: '🌈 ពណ៌ Brand & Theme', desc: 'ប្តូរពណ៌ចម្បងរបស់ Website' },
          { id: 'contact', label: '📞 ទំនាក់ទំនង & អាសយដ្ឋាន', desc: 'ទូរស័ព្ទ, Telegram, ទីតាំង' },
          { id: 'announcement', label: '📢 សាររត់លើគេ', desc: 'Marquee Announcement' },
          { id: 'payment', label: '💳 គណនី KHQR / ABA', desc: 'Bank QR & Merchant Info' },
          { id: 'delivery', label: '🚚 ដឹកជញ្ជូន & អត្រាប្តូរប្រាក់', desc: 'ថ្លៃដឹក & អត្រាប្រាក់រៀល' },
          { id: 'data', label: '🧹 សម្អាតទិន្នន័យ & Export', desc: 'Reset ទិន្នន័យតេស្ត & ទាញយក Excel' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSettingsSubTab(tab.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeSettingsSubTab === tab.id
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200/80'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid Content + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form: Tab Content */}
        <div className="lg:col-span-8 bg-white p-7 rounded-3xl border border-gray-200/90 shadow-sm space-y-6">
          
          {/* TAB 1: BRANDING & LOGO */}
          {activeSettingsSubTab === 'branding' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span>🎨</span> ១. ម៉ាកយីហោ & រូបភាព Logo (Brand Identity)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">រូបភាព Logo នឹងបង្ហាញលើ Header ខាងលើគេ, ផ្នែកខាងក្រោម (Footer) និងវិក្កយបត្រ</p>
              </div>

              {/* Logo Upload Box */}
              <div className="p-5 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/70 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-xs shrink-0 relative group">
                  {storeSettings.logoUrl ? (
                    <img src={storeSettings.logoUrl} alt="Store Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-2xl shadow-xs">
                      {(storeSettings.storeName || 'S').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs font-black text-gray-800">
                    {storeSettings.logoUrl ? '✅ បានកំណត់រូបភាព Logo ផ្ទាល់ខ្លួនរួចរាល់' : '📷 មិនទាន់មាន Logo (កំពុងប្រើ Logo អក្សរកាត់គំរូ)'}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    ទំហំដែលណែនាំ៖ 400x120px ឬ 512x512px (PNG, SVG, JPG, WebP ផ្ទៃថ្លា Transparent កាន់តែស្អាត)
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                      <span>📤</span> Upload Logo ថ្មី
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {storeSettings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setStoreSettings(prev => ({ ...prev, logoUrl: '' }))}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold transition border border-red-200 cursor-pointer"
                      >
                        លុប Logo ចេញ
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Store Name & Slogan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    ឈ្មោះហាង (Store Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeSettings.storeName}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                    placeholder="ឧ. Sabay Luk"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-black focus:border-[#ff6a00] outline-none transition bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    ពាក្យស្លោកហាង (Slogan / Subtitle)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.storeSlogan}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeSlogan: e.target.value })}
                    placeholder="ឧ. Premium Store"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-bold focus:border-[#ff6a00] outline-none transition bg-white"
                  />
                </div>
              </div>

              {/* Store Description (About) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  ការពិពណ៌នាអំពីហាង (About Store / Description)
                </label>
                <textarea
                  rows="3"
                  value={storeSettings.storeDescription}
                  onChange={(e) => setStoreSettings({ ...storeSettings, storeDescription: e.target.value })}
                  placeholder="ពិពណ៌នាសង្ខេបអំពីហាង និងគុណភាពទំនិញ ដែលបង្ហាញលើ Footer ខាងក្រោមគេ..."
                  className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-medium focus:border-[#ff6a00] outline-none transition bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT & LOCATION */}
          {activeSettingsSubTab === 'contact' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span>📞</span> ២. ព័ត៌មានទំនាក់ទំនង & អាសយដ្ឋាន (Contact & Location)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">លេខទូរស័ព្ទ និង Telegram នឹងបង្ហាញលើប៊ូតុងទាក់ទងរហ័ស លើ Header និងលើវិក្កយបត្រ</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    លេខទូរស័ព្ទចម្បង (Primary Phone) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeSettings.phone}
                    onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                    placeholder="096 720 5522"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-bold focus:border-[#ff6a00] outline-none transition bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    លេខទូរស័ព្ទទី ២ (Secondary Phone)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.phone2}
                    onChange={(e) => setStoreSettings({ ...storeSettings, phone2: e.target.value })}
                    placeholder="012 345 678"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-bold focus:border-[#ff6a00] outline-none transition bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Telegram របស់ហាង (Username ឬ Link)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">@</span>
                    <input
                      type="text"
                      value={storeSettings.telegram}
                      onChange={(e) => setStoreSettings({ ...storeSettings, telegram: e.target.value.replace(/^@/, '') })}
                      placeholder="Sabayluk"
                      className="w-full border-2 border-gray-200 pl-8 pr-4 py-3 rounded-2xl text-sm font-bold focus:border-[#ff6a00] outline-none transition bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    ម៉ោងបម្រើការងារ (Business Hours)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.businessHours}
                    onChange={(e) => setStoreSettings({ ...storeSettings, businessHours: e.target.value })}
                    placeholder="8:00 AM - 9:00 PM"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-bold focus:border-[#ff6a00] outline-none transition bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Facebook Page URL
                  </label>
                  <input
                    type="text"
                    value={storeSettings.facebook}
                    onChange={(e) => setStoreSettings({ ...storeSettings, facebook: e.target.value })}
                    placeholder="https://facebook.com/yourpage"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-medium focus:border-[#ff6a00] outline-none transition bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    TikTok Profile URL
                  </label>
                  <input
                    type="text"
                    value={storeSettings.tiktok}
                    onChange={(e) => setStoreSettings({ ...storeSettings, tiktok: e.target.value })}
                    placeholder="https://tiktok.com/@yourshop"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-medium focus:border-[#ff6a00] outline-none transition bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    អាសយដ្ឋានទីតាំងហាងជាក់ស្តែង (Physical Store Address)
                  </label>
                  <input
                    type="text"
                    value={storeSettings.address}
                    onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                    placeholder="ផ្ទះលេខ, ផ្លូវ, សង្កាត់, ខណ្ឌ, រាជធានីភ្នំពេញ"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-medium focus:border-[#ff6a00] outline-none transition bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANNOUNCEMENT BAR */}
          {activeSettingsSubTab === 'announcement' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span>📢</span> ៣. របារសាររត់ជូនដំណឹងលើគេ (Top Announcement Marquee Bar)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">សារផ្សព្វផ្សាយពិសេសដែលរត់លើគេបង្អស់នៃគេហទំព័រ (Header Top)</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div>
                  <p className="text-xs font-black text-gray-800">បើកបង្ហាញរបាររត់ខាងលើ (Enable Top Banner)</p>
                  <p className="text-[11px] text-gray-500">បើបិទ នោះគេហទំព័រនឹងលាក់របារខ្មៅខាងលើគេបង្អស់</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeSettings.showAnnouncement}
                    onChange={(e) => setStoreSettings({ ...storeSettings, showAnnouncement: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  ខ្លឹមសារសាររត់ (Announcement Marquee Text)
                </label>
                <textarea
                  rows="3"
                  value={storeSettings.announcementText}
                  onChange={(e) => setStoreSettings({ ...storeSettings, announcementText: e.target.value })}
                  placeholder="ឧ. 🔥 ដឹកជញ្ជូនឥតគិតថ្លៃ ២៥ ខេត្ត/ក្រុង • ធានាប្តូរ Size ក្នុងរយៈពេល ៧ ថ្ងៃ • ទំនិញម៉ាកសុទ្ធ ១០០%"
                  className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-bold focus:border-[#ff6a00] outline-none transition bg-white"
                />
              </div>

              {/* Preview Box */}
              <div className="bg-slate-950 text-white p-3 rounded-xl text-xs font-medium border border-slate-800 flex items-center justify-between">
                <span className="truncate">{storeSettings.announcementText}</span>
                <span className="text-[10px] text-orange-400 font-bold shrink-0 ml-2">📞 {storeSettings.phone}</span>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT & KHQR */}
          {activeSettingsSubTab === 'payment' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span>💳</span> ៤. គណនីទូទាត់ប្រាក់ & KHQR Code (Payment & QR)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">ព័ត៌មាននេះនឹងបង្ហាញលើផ្ទាំងទូទាត់ប្រាក់របស់អតិថិជន និងលើសន្លឹកវិក្កយបត្រ POS</p>
              </div>

              {/* KHQR Upload */}
              <div className="p-5 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/70 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-28 h-28 rounded-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                  {storeSettings.khqrImageUrl ? (
                    <img src={storeSettings.khqrImageUrl} alt="KHQR Code" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="text-center p-2">
                      <span className="text-2xl">📱</span>
                      <p className="text-[9px] font-bold text-gray-400 mt-1">KHQR ស្វ័យប្រវត្តិ</p>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs font-black text-gray-800">
                    {storeSettings.khqrImageUrl ? '✅ បាន Upload រូបភាព KHQR ផ្ទាល់របស់ហាង' : '📷 កំពុងប្រើប្រាស់ KHQR Code ស្វ័យប្រវត្តិតាមទឹកប្រាក់'}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    បងអាច Upload រូបភាព Bakong / ABA KHQR ផ្ទាល់របស់ហាង ដើម្បីឱ្យអតិថិជនស្កេនបាញ់លុយចូលគណនីផ្ទាល់បានរហ័ស
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                      <span>📤</span> Upload KHQR របស់ហាង
                      <input type="file" accept="image/*" onChange={handleKhqrUpload} className="hidden" />
                    </label>
                    {storeSettings.khqrImageUrl && (
                      <button
                        type="button"
                        onClick={() => setStoreSettings(prev => ({ ...prev, khqrImageUrl: '' }))}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold transition border border-red-200 cursor-pointer"
                      >
                        លុប QR ចេញ
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    ឈ្មោះម្ចាស់គណនីធនាគារ (Account Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeSettings.bankAccountName}
                    onChange={(e) => setStoreSettings({ ...storeSettings, bankAccountName: e.target.value })}
                    placeholder="SENG SOVEASNA"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-black focus:border-[#ff6a00] outline-none transition bg-white uppercase"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">ឈ្មោះបង្ហាញលើ KHQR</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center justify-center">៛</span>
                      លេខគណនីប្រាក់រៀល KHR
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">KHR</span>
                  </label>
                  <input
                    type="text"
                    value={storeSettings.bankAccountKhr || ''}
                    onChange={(e) => setStoreSettings({ ...storeSettings, bankAccountKhr: e.target.value })}
                    placeholder="004 500 394"
                    className="w-full border-2 border-emerald-200 p-3 rounded-2xl text-sm font-black focus:border-emerald-500 outline-none transition bg-emerald-50/30"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">ឧ. 004 500 394 (សម្រាប់ភ្ញៀវផ្ទេរប្រាក់រៀល)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black inline-flex items-center justify-center">$</span>
                      លេខគណនីប្រាក់ដុល្លារ USD
                    </span>
                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">USD</span>
                  </label>
                  <input
                    type="text"
                    value={storeSettings.bankAccountUsd || storeSettings.bankAccountNumber || ''}
                    onChange={(e) => setStoreSettings({ 
                      ...storeSettings, 
                      bankAccountUsd: e.target.value,
                      bankAccountNumber: e.target.value 
                    })}
                    placeholder="010 723 080"
                    className="w-full border-2 border-blue-200 p-3 rounded-2xl text-sm font-black focus:border-blue-500 outline-none transition bg-blue-50/30"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">ឧ. 010 723 080 (សម្រាប់ភ្ញៀវផ្ទេរប្រាក់ដុល្លារ)</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DELIVERY & RATES */}
          {activeSettingsSubTab === 'delivery' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span>🚚</span> ៥. សេវាដឹកជញ្ជូន & អត្រាប្តូរប្រាក់ (Delivery & Rates)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">កំណត់ថ្លៃដឹកជញ្ជូនគិតប្រាក់លើកន្ត្រក និងអត្រាប្តូរប្រាក់រៀល</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    ថ្លៃដឹកក្នុងភ្នំពេញ ($)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={storeSettings.deliveryPhnomPenh}
                    onChange={(e) => setStoreSettings({ ...storeSettings, deliveryPhnomPenh: e.target.value })}
                    placeholder="1.50"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-black text-blue-600 focus:border-blue-500 outline-none transition bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    ថ្លៃដឹកតាមខេត្ត ($)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={storeSettings.deliveryProvince}
                    onChange={(e) => setStoreSettings({ ...storeSettings, deliveryProvince: e.target.value })}
                    placeholder="2.00"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-black text-blue-600 focus:border-blue-500 outline-none transition bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    អត្រាប្រាក់រៀល ($1 = ? ៛)
                  </label>
                  <input
                    type="number"
                    value={storeSettings.exchangeRate}
                    onChange={(e) => setStoreSettings({ ...storeSettings, exchangeRate: Number(e.target.value) })}
                    placeholder="4100"
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-sm font-black text-emerald-600 focus:border-emerald-500 outline-none transition bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  គោលការណ៍ប្តូរទំនិញ / លក្ខខណ្ឌ (Return Policy Note)
                </label>
                <textarea
                  rows="2"
                  value={storeSettings.policyNote}
                  onChange={(e) => setStoreSettings({ ...storeSettings, policyNote: e.target.value })}
                  placeholder="ទំនិញដែលទិញរួចមិនអាចប្តូរជាប្រាក់វិញបានទេ (អាចប្តូរ Size បានក្នុងរង្វង់ ៧ ថ្ងៃ)"
                  className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-medium focus:border-[#ff6a00] outline-none transition bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 6: BRAND THEME COLOR */}
          {activeSettingsSubTab === 'theme' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span>🌈</span> ពណ៌សម្គាល់ម៉ាកយីហោ & Theme ហាង (Brand Theme Color)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ជ្រើសរើសពណ៌ចម្បងដែលស័ក្តិសមជាមួយផលិតផល និង Brand របស់ហាងបង។ ពណ៌នេះនឹងផ្លាស់ប្តូររូបរាងប៊ូតុង, ផ្លាកសញ្ញា, និង Menu នៅលើ Website ទាំងមូល។
                </p>
              </div>

              {/* Presets Grid */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-3">
                  🎨 ពណ៌ដែលពេញនិយម (Popular Brand Palettes)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {THEME_PRESETS.map(preset => {
                    const isSelected = (storeSettings.themeColor || '#ff6a00').toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyThemeColor(preset.hex, preset.id)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-gray-900 bg-gray-50/80 shadow-md ring-2 ring-gray-900/10'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-xl shadow-xs shrink-0 flex items-center justify-center text-white font-black text-sm"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {isSelected ? '✓' : ''}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-900 truncate">{preset.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold truncate">{preset.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Picker */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-gray-800 flex items-center gap-2">
                    <span>🎯</span> រើសពណ៌ផ្ទាល់ខ្លួនតាមចិត្ត (Custom Hex Color)
                  </p>
                  <p className="text-[11px] text-gray-500">
                    បងអាចចុចរើសពណ៌ ឬវាយកូដ Hex (ឧ. #ff6a00, #2563eb, #10b981)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="color"
                    value={storeSettings.themeColor || '#ff6a00'}
                    onChange={(e) => handleApplyThemeColor(e.target.value, 'custom')}
                    className="w-11 h-11 rounded-xl cursor-pointer border-2 border-gray-200 p-0.5 bg-white"
                  />
                  <input 
                    type="text"
                    value={storeSettings.themeColor || '#ff6a00'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        handleApplyThemeColor(val, 'custom');
                      } else {
                        setStoreSettings(prev => ({ ...prev, themeColor: val }));
                      }
                    }}
                    placeholder="#ff6a00"
                    className="w-28 border-2 border-gray-200 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-white text-center uppercase"
                  />
                </div>
              </div>

              {/* Live UI Preview Card */}
              <div className="p-5 rounded-3xl border-2 border-gray-200 bg-white space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-black text-gray-500 uppercase flex items-center gap-1.5">
                    <span>👁️</span> ឧទាហរណ៍បង្ហាញផ្ទាល់ (Live UI Preview)
                  </span>
                  <span 
                    className="text-[10px] font-black px-2.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: storeSettings.themeColor || '#ff6a00' }}
                  >
                    {storeSettings.themeColor || '#ff6a00'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button 
                    type="button"
                    className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition"
                    style={{ backgroundColor: storeSettings.themeColor || '#ff6a00' }}
                  >
                    🛒 បញ្ជាទិញឥឡូវនេះ (CTA Button)
                  </button>
                  <span 
                    className="text-xs font-black px-3 py-1.5 rounded-xl border flex items-center gap-1"
                    style={{ 
                      color: storeSettings.themeColor || '#ff6a00',
                      borderColor: storeSettings.themeColor || '#ff6a00',
                      backgroundColor: `${storeSettings.themeColor || '#ff6a00'}15`
                    }}
                  >
                    🏷️ បញ្ចុះតម្លៃ 20% Off
                  </span>
                  <span 
                    className="text-xs font-black px-3 py-1.5 rounded-full text-white"
                    style={{ backgroundColor: storeSettings.themeColor || '#ff6a00' }}
                  >
                    ★ Best Seller
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DATA MANAGEMENT & STORE RESET */}
          {activeSettingsSubTab === 'data' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span>🧹</span> ការគ្រប់គ្រងទិន្នន័យ & នាំចេញរបាយការណ៍ (Data Management & Export)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ទាញយករបាយការណ៍ទាំងអស់ជា Excel/CSV ឬសម្អាតទិន្នន័យតេស្តចោល មុនពេលប្រគល់ Website ឱ្យអតិថិជនប្រើប្រាស់ផ្លូវការ
                </p>
              </div>

              {/* ១. កាតទាញយករបាយការណ៍ Excel */}
              <div className="p-6 rounded-3xl bg-emerald-50/60 border-2 border-emerald-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-emerald-600 text-white rounded-xl text-sm">📊</span>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 uppercase">១. នាំចេញរបាយការណ៍ទាំងអស់ (Backup & Export Reports)</h4>
                      <p className="text-[11px] text-emerald-800">ឯកសារ CSV គាំទ្រភាសាខ្មែរ ១០០% អាចបើកក្នុង Microsoft Excel ឬ Google Sheets</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={exportInventoryToCSV}
                    className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 p-3.5 rounded-2xl text-xs font-black transition flex flex-col items-center gap-1.5 shadow-2xs cursor-pointer text-center"
                  >
                    <span className="text-xl">🗄️</span>
                    <span>របាយការណ៍ស្តុកទំនិញ</span>
                    <span className="text-[10px] text-gray-400 font-bold">({products.length} Products)</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportOrdersToCSV}
                    className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 p-3.5 rounded-2xl text-xs font-black transition flex flex-col items-center gap-1.5 shadow-2xs cursor-pointer text-center"
                  >
                    <span className="text-xl">🛒</span>
                    <span>របាយការណ៍ការលក់</span>
                    <span className="text-[10px] text-gray-400 font-bold">({realOrders.length} Orders)</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportStockMovementsToCSV}
                    className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 p-3.5 rounded-2xl text-xs font-black transition flex flex-col items-center gap-1.5 shadow-2xs cursor-pointer text-center"
                  >
                    <span className="text-xl">📋</span>
                    <span>កំណត់ត្រាចលនាស្តុក</span>
                    <span className="text-[10px] text-gray-400 font-bold">({stockMovements.length} Logs)</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportCustomersToCSV}
                    className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 p-3.5 rounded-2xl text-xs font-black transition flex flex-col items-center gap-1.5 shadow-2xs cursor-pointer text-center"
                  >
                    <span className="text-xl">👥</span>
                    <span>បញ្ជីអតិថិជន CRM</span>
                    <span className="text-[10px] text-gray-400 font-bold">({customers.length} Customers)</span>
                  </button>
                </div>
              </div>

              {/* ២. សម្អាតទិន្នន័យតេស្តតាមផ្នែក (Selective Clear) */}
              <div className="p-6 rounded-3xl bg-amber-50/60 border-2 border-amber-200/80 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-amber-200 pb-3">
                  <span className="p-2 bg-amber-600 text-white rounded-xl text-sm">🧹</span>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 uppercase">២. សម្អាតទិន្នន័យតេស្តតាមផ្នែក (Selective Reset)</h4>
                    <p className="text-[11px] text-amber-800">លុបទិន្នន័យចាស់ៗដែលបានតេស្ត ទៅតាមផ្នែកនីមួយៗដោយសុវត្ថិភាព</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setResetActionType('orders');
                      setResetConfirmText('');
                      setResetModalOpen(true);
                    }}
                    className="bg-white hover:bg-red-50 text-red-700 border border-red-200 p-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer"
                  >
                    <span>🛒 លុបប្រវត្តិលក់ ({realOrders.length})</span>
                    <span>🗑️</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetActionType('movements');
                      setResetConfirmText('');
                      setResetModalOpen(true);
                    }}
                    className="bg-white hover:bg-red-50 text-red-700 border border-red-200 p-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer"
                  >
                    <span>📋 លុបចលនាស្តុក ({stockMovements.length})</span>
                    <span>🗑️</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetActionType('customers');
                      setResetConfirmText('');
                      setResetModalOpen(true);
                    }}
                    className="bg-white hover:bg-red-50 text-red-700 border border-red-200 p-3 rounded-2xl text-xs font-black transition flex items-center justify-between cursor-pointer"
                  >
                    <span>👥 លុបបញ្ជីភ្ញៀវតេស្ត ({customers.length})</span>
                    <span>🗑️</span>
                  </button>
                </div>
              </div>

              {/* ៣. DANGER ZONE: សម្អាតទិន្នន័យទាំងអស់ (Complete Store Factory Reset) */}
              <div className="p-6 rounded-3xl bg-red-50/70 border-2 border-red-200 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-red-600 text-white rounded-xl text-sm">⚠️</span>
                  <div>
                    <h4 className="text-xs font-black text-red-950 uppercase">៣. តំបន់ប្រុងប្រយ័ត្នខ្ពស់៖ Factory Store Reset (សម្រាប់លក់ Website ឱ្យអតិថិជន)</h4>
                    <p className="text-[11px] text-red-800">
                      សកម្មភាពនេះនឹងសម្អាតរាល់ទិន្នន័យតេស្តទាំងអស់ (ប្រវត្តិលក់, ចលនាស្តុក, កន្ត្រក POS, អតិថិជន និងផលិតផល) ទុកឱ្យនៅស្អាត ១០០% សម្រាប់អតិថិជនថ្មីចាប់ផ្តើមលក់។ (ឈ្មោះហាង និងការកំណត់ Settings ត្រូវបានរក្សាទុក)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResetActionType('all');
                    setResetConfirmText('');
                    setResetModalOpen(true);
                  }}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-red-600/30 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🔥</span> សម្អាតទិន្នន័យតេស្តទាំងអស់តែមួយចុច (Complete Reset)
                </button>
              </div>
            </div>
          )}

          {/* ⭐️ Modal សម្អាតទិន្នន័យតេស្ត (Reset Confirmation Modal) ⭐️ */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto shadow-xs">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-gray-900">
                {resetActionType === 'all' ? 'បញ្ជាក់ការសម្អាតទិន្នន័យហាងទាំងអស់' : 'បញ្ជាក់ការលុបទិន្នន័យ'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {resetActionType === 'all'
                  ? 'រាល់ការបញ្ជាទិញ, ចលនាស្តុក, អតិថិជន និងផលិតផលតេស្ត នឹងត្រូវបានលុបជាអចិន្ត្រៃយ៍ មិនអាចត្រឡប់ក្រោយបានទេ!'
                  : 'ទិន្នន័យដែលបានជ្រើសរើសនឹងត្រូវលុបជាអចិន្ត្រៃយ៍!'}
              </p>
            </div>

            <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-center">
              <p className="text-[11px] font-black text-red-800 mb-1">
                សូមវាយពាក្យ <span className="font-mono bg-white px-2 py-0.5 rounded border border-red-300 text-red-600">RESET</span> ដើម្បីបញ្ជាក់៖
              </p>
              <input 
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="វាយពាក្យ RESET"
                autoFocus
                className="w-full border-2 border-red-300 p-2.5 rounded-xl text-center text-sm font-black text-red-600 uppercase outline-none bg-white focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmText('');
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl text-xs font-black transition cursor-pointer"
              >
                បោះបង់
              </button>
              <button
                type="button"
                disabled={isResetting || resetConfirmText.trim().toUpperCase() !== 'RESET'}
                onClick={handleExecuteReset}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-3 rounded-2xl text-xs font-black transition shadow-lg shadow-red-600/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isResetting ? 'កំពុងសម្អាត...' : '🗑️ បញ្ជាក់ការលុប'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Save Button at Bottom */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSaveStoreSettings}
              className="bg-gradient-to-r from-[#ff6a00] to-orange-600 hover:from-[#e55f00] hover:to-orange-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-orange-500/30 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>💾</span> រក្សាទុកការកំណត់ហាង (Save Store Settings)
            </button>
          </div>

        </div>

        {/* Right Column: Live Storefront Mockup Preview */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>👁️</span> គំរូផ្សាយផ្ទាល់លើ Website
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Mock Header */}
            <div className="bg-white text-gray-900 rounded-2xl p-3 border border-gray-200 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {storeSettings.logoUrl ? (
                    <img src={storeSettings.logoUrl} alt="" className="h-8 max-w-[90px] object-contain" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center">
                      {(storeSettings.storeName || 'S').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-xs leading-none">{storeSettings.storeName || 'SABAY LUK'}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{storeSettings.storeSlogan || 'Premium Store'}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  📞 {storeSettings.phone}
                </span>
              </div>
            </div>

            {/* Mock Floating Buttons */}
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 space-y-2">
              <p className="text-[10px] font-bold text-slate-400">ប៊ូតុងទាក់ទងលោតលើអេក្រង់ (Floating Buttons):</p>
              <div className="flex items-center gap-2">
                <span className="bg-sky-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  ✈️ @{storeSettings.telegram || 'Sabayluk'}
                </span>
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  📞 {storeSettings.phone || '096 720 5522'}
                </span>
              </div>
            </div>

            {/* Mock KHQR Card */}
            <div className="bg-white text-gray-900 p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-3">
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 shadow-2xs">
                {storeSettings.khqrImageUrl ? (
                  <img src={storeSettings.khqrImageUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl">📱</span>
                )}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-black truncate uppercase">{storeSettings.bankAccountName || 'SENG SOVEASNA'}</p>
                <div className="text-[10px] font-bold space-y-1 mt-1">
                  <div className="text-emerald-700 flex items-center justify-between bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <span className="flex items-center gap-1 font-black">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-200 text-emerald-900 text-[8px] inline-flex items-center justify-center font-black">៛</span>
                      KHR:
                    </span>
                    <span className="font-mono font-black">{storeSettings.bankAccountKhr || '004 500 394'}</span>
                  </div>
                  <div className="text-blue-700 flex items-center justify-between bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    <span className="flex items-center gap-1 font-black">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-200 text-blue-900 text-[8px] inline-flex items-center justify-center font-black">$</span>
                      USD:
                    </span>
                    <span className="font-mono font-black">{storeSettings.bankAccountUsd || storeSettings.bankAccountNumber || '010 723 080'}</span>
                  </div>
                </div>
                <p className="text-[9px] text-emerald-600 font-black mt-1.5 text-right">អត្រា: $1 = {storeSettings.exchangeRate} ៛</p>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-400 italic">
                រាល់ការផ្លាស់ប្តូរទិន្នន័យ នឹងធ្វើបច្ចុប្បន្នភាពលើ Website ភ្លាមៗដោយស្វ័យប្រវត្តិ!
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );

  const ApiView = () => {
    const isTelegramConfigured = !!(storeSettings.telegramBotToken && storeSettings.telegramChatId);

    return (
      <div className="animate-in fade-in pb-12 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-black text-gray-900">🔌 ការតភ្ជាប់ប្រព័ន្ធ (API & Integrations)</h2>
            <p className="text-gray-500 text-sm mt-1">កំណត់ការភ្ជាប់ប្រព័ន្ធជូនដំណឹង Telegram Bot ស្វ័យប្រវត្តិ និង Payment Gateway</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 ${isTelegramConfigured ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
            <span className={`w-2 h-2 rounded-full ${isTelegramConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            {isTelegramConfigured ? 'Telegram Bot Active' : 'Not Configured'}
          </span>
        </div>

        <div className="space-y-6">
          {/* ✈️ Telegram Bot Alert Settings Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center text-2xl font-black shrink-0">
                  ✈️
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Telegram Bot Notifications (ជូនដំណឹងស្វ័យប្រវត្តិ)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">ទទួលសារផ្ទាល់ខ្លួន ឬក្នុងគ្រុប Telegram ពេលទំនិញជិតអស់ស្តុក (Low Stock Alert) និងពេលមានការកុម្ម៉ង់ថ្មី</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={storeSettings.enableLowStockAlert !== false}
                  onChange={(e) => setStoreSettings({ ...storeSettings, enableLowStockAlert: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                    Telegram Bot Token <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={storeSettings.telegramBotToken || ''} 
                    onChange={(e) => setStoreSettings({ ...storeSettings, telegramBotToken: e.target.value.trim() })}
                    placeholder="ឧ. 7123456789:AAHxxxxx_xxxxxxxxxxxxxxx" 
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-mono focus:border-blue-500 outline-none transition bg-white" 
                  />
                  <p className="text-[11px] text-gray-400 mt-1">ទទួលបានពីការ Chat បង្កើត Bot ជាមួយ @BotFather</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                    Telegram Chat ID <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={storeSettings.telegramChatId || ''} 
                    onChange={(e) => setStoreSettings({ ...storeSettings, telegramChatId: e.target.value.trim() })}
                    placeholder="ឧ. 123456789 ឬ -100xxxxxxxxxx" 
                    className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-mono focus:border-blue-500 outline-none transition bg-white" 
                  />
                  <p className="text-[11px] text-gray-400 mt-1">អាចជា User ID ឬ Group/Channel ID សម្រាប់ទទួលសារ</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                  កម្រិតស្តុកទាបសម្រាប់ Alert (Default Low Stock Threshold)
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={storeSettings.lowStockThreshold || 5} 
                    onChange={(e) => setStoreSettings({ ...storeSettings, lowStockThreshold: parseInt(e.target.value, 10) || 5 })}
                    className="w-32 border-2 border-gray-200 p-3 rounded-2xl text-sm font-black focus:border-blue-500 outline-none transition bg-white" 
                  />
                  <span className="text-xs text-gray-500">
                    ទំនិញណាសល់ <b>ស្មើ ឬតិចជាង {storeSettings.lowStockThreshold || 5}</b> នឹងរាប់ជា "ជិតអស់ស្តុក" ហើយផ្ញើសារ Alert។
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {telegramStatusMsg && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-900 animate-in fade-in">
                  {telegramStatusMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={handleSaveStoreSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>💾</span>
                  <span>រក្សាទុកការកំណត់</span>
                </button>

                <button 
                  type="button"
                  onClick={handleTestTelegramAlert}
                  disabled={telegramTesting || !storeSettings.telegramBotToken || !storeSettings.telegramChatId}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 px-5 py-3 rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {telegramTesting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                      <span>កំពុងតេស្តផ្ញើសារ...</span>
                    </>
                  ) : (
                    <>
                      <span>🔔</span>
                      <span>សាកល្បងផ្ញើសារ Test Telegram</span>
                    </>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={handleManualStockAlertCheck}
                  disabled={telegramTesting}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-2xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>📦</span>
                  <span>ស្កេនទំនិញសល់ស្តុកទាប & ផ្ញើ Report</span>
                </button>
              </div>

              {/* Instructions Guide */}
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl text-xs space-y-2 mt-4">
                <p className="font-black text-amber-400 text-sm">💡 ការណែនាំខ្លីៗអំពីរបៀបបង្កើត Telegram Bot (ត្រឹមតែ ១ នាទី):</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>បើកកម្មវិធី <b>Telegram</b> ស្វែងរក <b>@BotFather</b> រួចចុច <code>/start</code> ហើយវាយ <code>/newbot</code>។</li>
                  <li>ដាក់ឈ្មោះ Bot របស់បង (ឧ. <i>SabayLuk Alert Bot</i>) និងដាក់ username បញ្ចប់ដោយ bot (ឧ. <i>sabayluk_alert_bot</i>)។</li>
                  <li>ចម្លង <b>HTTP API Token</b> ដែល @BotFather ផ្ញើមក យកមកបិទភ្ជាប់ក្នុងប្រអប់ <b>Telegram Bot Token</b> ខាងលើ។</li>
                  <li>ដើម្បីយក <b>Chat ID</b>: ឆាតទៅកាន់ <b>@userinfobot</b> វានឹងប្រាប់ <code>Id: 123456789</code> របស់បងភ្លាម ឬបើចង់ឱ្យ Alert ចូល Group គ្រាន់តែ Add Bot ចូល Group រួចយក Group Chat ID (ផ្តើមដោយ <code>-100...</code>)។</li>
                </ol>
              </div>
            </div>
          </div>

          {/* 💳 Payment Gateway Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center text-2xl font-black shrink-0">
                💳
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Payment Gateway (ABA Payway API)</h3>
                <p className="text-xs text-gray-500 mt-0.5">កំណត់ Merchant ID សម្រាប់ទូទាត់ប្រាក់ស្វ័យប្រវត្តិតាម ABA KHQR</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                  Merchant ID
                </label>
                <input 
                  type="text" 
                  value={storeSettings.abaMerchantId || ''} 
                  onChange={(e) => setStoreSettings({ ...storeSettings, abaMerchantId: e.target.value.trim() })}
                  placeholder="ABA Merchant ID" 
                  className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-mono focus:border-blue-500 outline-none transition bg-white" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                  API Key
                </label>
                <input 
                  type="text" 
                  value={storeSettings.abaApiKey || ''} 
                  onChange={(e) => setStoreSettings({ ...storeSettings, abaApiKey: e.target.value.trim() })}
                  placeholder="ABA API Key" 
                  className="w-full border-2 border-gray-200 p-3 rounded-2xl text-xs font-mono focus:border-blue-500 outline-none transition bg-white" 
                />
              </div>
            </div>

            <button 
              type="button"
              onClick={handleSaveStoreSettings}
              className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>💾</span>
              <span>រក្សាទុក Merchant ID</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ⭐️ បន្ថែមលក្ខខណ្ឌ Loading នេះ ដើម្បីកុំឱ្យ UI បង្ហាញចេញមុនពេលអាន LocalStorage រួចរាល់
  if (!isMounted || activeTab === '') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#ff6a00] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#ff6a00] font-bold text-sm tracking-widest animate-pulse">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden relative">
      {/* ⭐️ REALTIME FLOATING NEW ORDER ALERT TOAST FOR ADMIN & SALES ⭐️ */}
      {newOrderAlert && (
        <div className="fixed top-5 right-5 z-50 bg-slate-950 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-3.5 border-2 border-emerald-500 animate-in slide-in-from-top-4 max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl shrink-0 animate-bounce">
            🛍️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                New Order ថ្មី!
              </span>
              <span className="text-[10px] text-slate-400">ទើបកុម្ម៉ង់មុននេះបន្តិច</span>
            </div>
            <p className="text-xs font-black text-white mt-1 truncate">
              #{newOrderAlert.order_id} • {newOrderAlert.customer_name}
            </p>
            <p className="text-[11px] font-bold text-emerald-400">
              ទឹកប្រាក់: ${Number(newOrderAlert.total || 0).toFixed(2)} {newOrderAlert.phone ? `• 📞 ${newOrderAlert.phone}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNewOrderAlert(null)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modern Sleek Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0 -translate-x-full overflow-hidden opacity-0 pointer-events-none'} transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col shadow-2xl z-30 shrink-0 h-full border-r border-slate-800/60 relative`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="overflow-hidden min-w-0">
            {storeSettings.logoUrl ? (
              <img src={storeSettings.logoUrl} alt="Store Logo" className="h-8 max-w-[130px] object-contain" />
            ) : (
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 tracking-wider truncate">
                {storeSettings.storeName || 'SABAY LUK'}
              </h2>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest truncate">Admin Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* ⭐️ ប៊ូតុងរុញបិទរបារម៉ឺនុយ (Collapse Button) ⭐️ */}
            <button 
              type="button"
              onClick={toggleSidebar}
              className="w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs cursor-pointer border border-slate-700/80 active:scale-90 group"
              title="រុញបិទរបារម៉ឺនុយ (Collapse Sidebar)"
            >
              <span className="text-xs font-black group-hover:-translate-x-0.5 transition-transform">◀</span>
            </button>
          </div>
        </div>

        {/* ⭐️ ULTRA-MODERN TAB NAVIGATION WITH SLEEK SCROLLBAR & MICRO-INTERACTIONS ⭐️ */}
        <nav 
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.14) transparent' }}
          className="flex-1 px-3 py-3.5 space-y-4 overflow-y-auto custom-scrollbar select-none"
        >
          {/* SECTION 1: CORE OPERATIONS (ផ្នែកលក់ & គ្រប់គ្រងស្តុក) */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>ប្រតិបត្តិការលក់ & ស្តុក</span>
              <span className="text-[9px] text-slate-600 font-mono">01</span>
            </p>

            {/* POS TAB (ADMIN & CASHIER) */}
            {(!currentStaff || currentStaff.role === 'ADMIN' || currentStaff.role === 'CASHIER') && (
              <button 
                type="button"
                onClick={() => setActiveTab('pos')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'pos' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'pos' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'pos' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-blue-400 group-hover:bg-slate-700'
                  }`}>
                    💻
                  </span>
                  <span className="text-xs truncate">ប្រព័ន្ធលក់ (POS)</span>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'pos' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  ⚡ SALE
                </span>
              </button>
            )}

            {/* ANALYTICS TAB (SUPER ADMIN ONLY) */}
            {(!currentStaff || currentStaff.role === 'ADMIN') && (
              <button 
                type="button"
                onClick={() => setActiveTab('analytics')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'analytics' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'analytics' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'analytics' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-emerald-400 group-hover:bg-slate-700'
                  }`}>
                    📊
                  </span>
                  <span className="text-xs truncate">វិភាគទិន្នន័យ (P&L)</span>
                </div>
              </button>
            )}

            {/* INVENTORY TAB (ADMIN & STOCK KEEPER) */}
            {(!currentStaff || currentStaff.role === 'ADMIN' || currentStaff.role === 'STOCK') && (
              <button 
                type="button"
                onClick={() => setActiveTab('inventory')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'inventory' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'inventory' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'inventory' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-purple-400 group-hover:bg-slate-700'
                  }`}>
                    🗄️
                  </span>
                  <span className="text-xs truncate">គ្រប់គ្រងស្តុក</span>
                </div>
              </button>
            )}

            {/* UPLOAD PRODUCT TAB (ADMIN & STOCK KEEPER) */}
            {(!currentStaff || currentStaff.role === 'ADMIN' || currentStaff.role === 'STOCK') && (
              <button 
                type="button"
                onClick={() => setActiveTab('upload')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'upload' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'upload' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'upload' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-sky-400 group-hover:bg-slate-700'
                  }`}>
                    📤
                  </span>
                  <span className="text-xs truncate">បញ្ចូលទំនិញថ្មី</span>
                </div>
              </button>
            )}
          </div>

          {/* SECTION 2: STOREFRONT & CUSTOMERS (ផ្នែកមុខហាង & អតិថិជន) */}
          <div className="space-y-1 pt-1 border-t border-slate-800/60">
            <p className="px-3 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>មុខហាង & អតិថិជន</span>
              <span className="text-[9px] text-slate-600 font-mono">02</span>
            </p>

            {/* STOREFRONT DROPDOWN (ADMIN & STOCK KEEPER) */}
            {(!currentStaff || currentStaff.role === 'ADMIN' || currentStaff.role === 'STOCK') && (
              <div className="space-y-1">
                <button 
                  type="button"
                  onClick={() => setIsStoreOpen(!isStoreOpen)} 
                  className={`w-full group flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    isStoreOpen || activeTab === 'categories' || activeTab === 'cover'
                      ? 'bg-slate-800/90 text-white border border-slate-700/60 shadow-xs' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 bg-slate-800 text-amber-400 group-hover:scale-110 transition-transform">
                      🏬
                    </span>
                    <span className="text-xs font-bold truncate">គ្រប់គ្រងមុខហាង</span>
                  </div>
                  <span className={`text-[10px] transition-transform duration-300 mr-1 ${isStoreOpen ? 'rotate-180 text-blue-400' : 'text-slate-500'}`}>
                    ▼
                  </span>
                </button>

                {/* Sub-menus */}
                {isStoreOpen && (
                  <div className="pl-3 space-y-1 border-l-2 border-blue-500/60 ml-4 my-1.5 animate-in slide-in-from-top-2 duration-200">
                    <button 
                      type="button"
                      onClick={() => setActiveTab('categories')} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-xs font-bold cursor-pointer active:scale-[0.98] ${
                        activeTab === 'categories' 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                          : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <span>🏷️</span>
                      <span>ប្រភេទផលិតផល</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('cover')} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-xs font-bold cursor-pointer active:scale-[0.98] ${
                        activeTab === 'cover' 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                          : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <span>🖼️</span>
                      <span>គ្រប់គ្រង Cover ហាង</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ORDERS TAB (ADMIN & CASHIER) */}
            {(!currentStaff || currentStaff.role === 'ADMIN' || currentStaff.role === 'CASHIER') && (
              <button 
                type="button"
                onClick={() => setActiveTab('orders')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'orders' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'orders' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'orders' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-orange-400 group-hover:bg-slate-700'
                  }`}>
                    🛒
                  </span>
                  <span className="text-xs truncate">ការបញ្ជាទិញ</span>
                </div>
                {realOrders.filter(o => o.status === 'Pending').length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse ${
                    activeTab === 'orders' ? 'bg-white text-slate-900' : 'bg-orange-500 text-white'
                  }`}>
                    {realOrders.filter(o => o.status === 'Pending').length}
                  </span>
                )}
              </button>
            )}

            {/* EXPENSES & NET PROFIT TAB (SUPER ADMIN ONLY) */}
            {(!currentStaff || currentStaff.role === 'ADMIN') && (
              <button 
                type="button"
                onClick={() => setActiveTab('expenses')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'expenses' 
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'expenses' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'expenses' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-emerald-400 group-hover:bg-slate-700'
                  }`}>
                    💸
                  </span>
                  <span className="text-xs truncate">ចំណាយ & ចំណេញសុទ្ធ</span>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === 'expenses' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  P&L
                </span>
              </button>
            )}

            {/* CUSTOMERS CRM TAB (SUPER ADMIN ONLY) */}
            {(!currentStaff || currentStaff.role === 'ADMIN') && (
              <button 
                type="button"
                onClick={() => setActiveTab('customers')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'customers' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'customers' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'customers' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-teal-400 group-hover:bg-slate-700'
                  }`}>
                    👥
                  </span>
                  <span className="text-xs truncate">អតិថិជន (CRM)</span>
                </div>
              </button>
            )}

            {/* FEEDBACKS TAB (SUPER ADMIN ONLY) */}
            {(!currentStaff || currentStaff.role === 'ADMIN') && (
              <button 
                type="button"
                onClick={() => setActiveTab('feedbacks')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'feedbacks' 
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'feedbacks' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'feedbacks' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-amber-400 group-hover:bg-slate-700'
                  }`}>
                    💬
                  </span>
                  <span className="text-xs truncate">មតិយោបល់ (Feedbacks)</span>
                </div>
                {adminFeedbacks.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'feedbacks' ? 'bg-white/25 text-white' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  }`}>
                    {adminFeedbacks.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* SECTION 3: SYSTEM & CONFIGURATION (SUPER ADMIN ONLY) */}
          {(!currentStaff || currentStaff.role === 'ADMIN') && (
            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <p className="px-3 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>ប្រព័ន្ធ & ការកំណត់</span>
                <span className="text-[9px] text-slate-600 font-mono">03</span>
              </p>

              {/* API & TELEGRAM TAB */}
              <button 
                type="button"
                onClick={() => setActiveTab('api')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'api' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'api' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'api' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-violet-400 group-hover:bg-slate-700'
                  }`}>
                    🔌
                  </span>
                  <span className="text-xs truncate">ការតភ្ជាប់ (API & Bot)</span>
                </div>
              </button>

              {/* STORE SETTINGS TAB */}
              <button 
                type="button"
                onClick={() => setActiveTab('settings')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'settings' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-600/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'settings' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'settings' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-orange-400 group-hover:bg-slate-700'
                  }`}>
                    🏪
                  </span>
                  <span className="text-xs truncate">កំណត់ហាង & Logo</span>
                </div>
              </button>

              {/* INVOICE SETTINGS TAB */}
              <button 
                type="button"
                onClick={() => setActiveTab('invoice')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'invoice' 
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'invoice' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'invoice' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-rose-400 group-hover:bg-slate-700'
                  }`}>
                    🧾
                  </span>
                  <span className="text-xs truncate">កំណត់វិក្កយបត្រ</span>
                </div>
              </button>

              {/* MULTI-STAFF MANAGEMENT TAB */}
              <button 
                type="button"
                onClick={() => setActiveTab('staff')} 
                className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'staff' 
                    ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 font-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-bold'
                }`}
              >
                {activeTab === 'staff' && (
                  <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-xs"></span>
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110 ${
                    activeTab === 'staff' ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800/80 text-indigo-400 group-hover:bg-slate-700'
                  }`}>
                    👥
                  </span>
                  <span className="text-xs truncate">គ្រប់គ្រងបុគ្គលិក</span>
                </div>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-bold">
                  {staffList.length} នាក់
                </span>
              </button>
            </div>
          )}

          {/* ACTIVE STAFF PROFILE CARD AT BOTTOM */}
          <div className="pt-2 pb-1 border-t border-slate-800/80 mt-2">
            <div className="bg-slate-950/90 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${currentStaff?.color || 'from-amber-500 to-orange-600'} text-white flex items-center justify-center text-base shrink-0 shadow-xs`}>
                  {currentStaff?.avatar || '👑'}
                </span>
                <div className="min-w-0">
                  <span className="font-black text-xs text-white block truncate leading-tight">
                    {currentStaff?.name || 'Admin'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block truncate">
                    {currentStaff?.roleLabel || 'Super Admin'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStaffToLogin(null);
                  setEnteredPin('');
                  setPinError('');
                  setSwitchStaffModalOpen(true);
                }}
                className="bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl text-[10px] font-black transition border border-slate-700/80 shrink-0 cursor-pointer"
                title="ប្តូរបុគ្គលិក ឬចាក់សោ PIN"
              >
                🔒 ប្តូរ
              </button>
            </div>
          </div>

          {/* QUICK STOREFRONT LINK AT BOTTOM */}
          <div className="pt-1 pb-1">
            <a 
              href="/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] active:scale-95 text-orange-300 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 hover:from-orange-500/20 hover:to-amber-500/20 font-bold border border-orange-500/25 shadow-xs group"
            >
              <span className="flex items-center gap-2.5 text-xs">
                <span className="text-base group-hover:rotate-12 transition-transform">🌐</span>
                <span>មើលមុខហាងផ្ទាល់</span>
              </span>
              <span className="text-xs text-orange-400 group-hover:translate-x-0.5 transition-transform">↗</span>
            </a>
          </div>
        </nav>
      </aside>

      {/* ⭐️ Floating Toggle Button ពេល Sidebar ត្រូវបិទ (ងាយស្រួលចុចបើកវិញ) ⭐️ */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 hover:from-blue-600 hover:to-blue-500 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-2.5 text-xs font-black transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer group animate-in slide-in-from-left-4 fade-in"
          title="ចុចដើម្បីបើករបារម៉ឺនុយ (Open Sidebar Menu)"
        >
          <span className="text-base group-hover:rotate-12 transition-transform">☰</span>
          <span className="tracking-wide">បើកម៉ឺនុយ</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50 h-full relative">
        {/* ⭐️ TOP STAFF STATUS & SWITCH BAR ⭐️ */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/90 backdrop-blur-md px-4 sm:px-5 py-3 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentStaff?.color || 'from-amber-500 to-orange-600'} text-white flex items-center justify-center text-xl shadow-xs shrink-0`}>
              {currentStaff?.avatar || '👑'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-gray-900">{currentStaff?.name || 'វិចិត្រ (ម្ចាស់ហាង)'}</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  currentStaff?.role === 'ADMIN' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  currentStaff?.role === 'CASHIER' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  'bg-purple-100 text-purple-800 border border-purple-200'
                }`}>
                  {currentStaff?.roleLabel || 'ម្ចាស់ហាង (Super Admin)'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                {currentStaff?.role === 'ADMIN' && '🔓 សិទ្ធិគ្រប់គ្រងពេញលេញ (Full Access) — គ្រប់គ្រងមុខងារទាំងអស់'}
                {currentStaff?.role === 'CASHIER' && '💻 សិទ្ធិអ្នកគិតលុយ (Cashier) — ប្រើប្រាស់ POS & ការបញ្ជាទិញ (គ្មានសិទ្ធិមើលថ្លៃដើម/របាយការណ៍ចំណេញ)'}
                {currentStaff?.role === 'STOCK' && '🗄️ សិទ្ធិអ្នកកាន់ស្តុក (Stock Keeper) — គ្រប់គ្រងស្តុក, បញ្ចូលទំនិញ & ប្រភេទមុខទំនិញ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedStaffToLogin(null);
                setEnteredPin('');
                setPinError('');
                setSwitchStaffModalOpen(true);
              }}
              className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="ប្តូរបុគ្គលិកប្រើប្រាស់ (Switch Staff Account)"
            >
              <span>🔒</span>
              <span>ប្តូរគណនី (Switch Profile)</span>
            </button>
          </div>
        </div>

        {activeTab === 'pos' && PosView()}
        {activeTab === 'analytics' && AnalyticsView()}
        {activeTab === 'inventory' && InventoryView()}
        {activeTab === 'upload' && UploadView()}
        {activeTab === 'categories' && CategoryView()}
        {activeTab === 'cover' && CoverManagementView()}
        {activeTab === 'orders' && OrdersView()}
        {activeTab === 'expenses' && ExpensesView()}
        {activeTab === 'customers' && CustomersView()}
        {activeTab === 'feedbacks' && FeedbacksView()}
        {activeTab === 'api' && ApiView()}
        {activeTab === 'settings' && StoreSettingsView()}
        {activeTab === 'invoice' && InvoiceSettingsView()}
        {activeTab === 'staff' && StaffManagementView()}
      </main>

      {/* ⭐️ SLIP LIGHTBOX MODAL ⭐️ */}
      {viewingSlipUrl && (
        <div 
          onClick={() => setViewingSlipUrl(null)}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 p-5 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span>🧾</span> វិក្កយបត្រផ្ទេរប្រាក់ (Payment Slip)
              </h4>
              <button 
                onClick={() => setViewingSlipUrl(null)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center max-h-[70vh] overflow-auto bg-gray-50 rounded-2xl p-2 border border-gray-100">
              <img 
                src={viewingSlipUrl} 
                alt="Payment Slip" 
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow"
              />
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <a 
                href={viewingSlipUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                download="payment_slip.jpg"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
              >
                📥 ទាញយករូបភាពពេញ (Download)
              </a>
              <button 
                onClick={() => setViewingSlipUrl(null)} 
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl transition"
              >
                បិទ (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⭐️ MODAL ប្តូរគណនីបុគ្គលិក / ចាក់សោ PIN (SWITCH STAFF PROFILE WITH PIN MODAL) ⭐️ */}
      {switchStaffModalOpen && (
        <div 
          onClick={() => {
            setSwitchStaffModalOpen(false);
            setSelectedStaffToLogin(null);
            setEnteredPin('');
            setPinError('');
          }}
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl font-bold">
                  🔒
                </div>
                <div>
                  <h3 className="text-base font-black">ប្តូរគណនីបុគ្គលិក (Switch Staff Profile)</h3>
                  <p className="text-[11px] text-slate-400">ជ្រើសរើសគណនី និងវាយបញ្ចូលលេខសម្ងាត់ PIN ៤ ខ្ទង់</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSwitchStaffModalOpen(false);
                  setSelectedStaffToLogin(null);
                  setEnteredPin('');
                  setPinError('');
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Staff Selection Cards */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2.5">
                  ជ្រើសរើសគណនីបុគ្គលិក:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {staffList.filter(s => s.active !== false).map(staff => {
                    const isSelected = (selectedStaffToLogin?.id || currentStaff?.id) === staff.id;
                    const isCurrent = currentStaff?.id === staff.id;
                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => {
                          setSelectedStaffToLogin(staff);
                          setEnteredPin('');
                          setPinError('');
                        }}
                        className={`p-3 rounded-2xl text-left border-2 transition-all flex flex-col items-center text-center gap-2 cursor-pointer ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${staff.color || 'from-indigo-500 to-blue-600'} text-white flex items-center justify-center text-2xl shadow-xs`}>
                          {staff.avatar || '👤'}
                        </span>
                        <div className="w-full">
                          <span className="font-black text-xs text-gray-900 block truncate">
                            {staff.name}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold block truncate">
                            {staff.role === 'ADMIN' ? 'Super Admin' : staff.role === 'CASHIER' ? 'Cashier' : 'Stock'}
                          </span>
                          {isCurrent && (
                            <span className="inline-block mt-1 text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                              ● កំពុងប្រើ
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN Input Section */}
              {(() => {
                const targetStaff = selectedStaffToLogin || currentStaff || staffList[0];
                const handleVerifyPin = (pinToTest) => {
                  const checkPin = pinToTest || enteredPin;
                  if (!targetStaff) return;
                  if (checkPin === targetStaff.pin) {
                    setCurrentStaff(targetStaff);
                    setSwitchStaffModalOpen(false);
                    setSelectedStaffToLogin(null);
                    setEnteredPin('');
                    setPinError('');
                    if (targetStaff.role === 'CASHIER') setActiveTab('pos');
                    else if (targetStaff.role === 'STOCK') setActiveTab('inventory');
                    setToastNotification(`🎉 សូមស្វាគមន៍ "${targetStaff.name}" (${targetStaff.roleLabel})!`);
                    setTimeout(() => setToastNotification(null), 3500);
                  } else {
                    setPinError('❌ លេខកូដ PIN មិនត្រឹមត្រូវទេ! សូមសាកល្បងម្តងទៀត។');
                    setEnteredPin('');
                  }
                };

                const handleKeyClick = (val) => {
                  if (enteredPin.length >= 4) return;
                  const nextPin = enteredPin + val;
                  setEnteredPin(nextPin);
                  setPinError('');
                  if (nextPin.length === 4) {
                    handleVerifyPin(nextPin);
                  }
                };

                const handleBackspace = () => {
                  setEnteredPin(prev => prev.slice(0, -1));
                  setPinError('');
                };

                return (
                  <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200 text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-gray-700">
                        វាយបញ្ចូលកូដ PIN (៤ ខ្ទង់) របស់ <b className="text-gray-900">{targetStaff?.name}</b>:
                      </span>
                    </div>

                    {/* PIN Dots */}
                    <div className="flex items-center justify-center gap-3 py-1">
                      {[0, 1, 2, 3].map(idx => (
                        <div
                          key={idx}
                          className={`w-4 h-4 rounded-full border-2 transition-all ${
                            enteredPin.length > idx 
                              ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-xs' 
                              : 'bg-white border-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {pinError && (
                      <p className="text-xs font-bold text-red-600 animate-bounce">
                        {pinError}
                      </p>
                    )}

                    {/* Numeric Keypad */}
                    <div className="max-w-[240px] mx-auto grid grid-cols-3 gap-2 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleKeyClick(num.toString())}
                          className="h-11 bg-white hover:bg-indigo-50 border border-gray-200 rounded-xl font-black text-base text-gray-800 shadow-xs hover:border-indigo-300 active:scale-95 transition cursor-pointer"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setEnteredPin(''); setPinError(''); }}
                        className="h-11 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl font-bold text-xs text-gray-600 active:scale-95 transition cursor-pointer"
                      >
                        C
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeyClick('0')}
                        className="h-11 bg-white hover:bg-indigo-50 border border-gray-200 rounded-xl font-black text-base text-gray-800 shadow-xs hover:border-indigo-300 active:scale-95 transition cursor-pointer"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={handleBackspace}
                        className="h-11 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl font-bold text-sm text-gray-600 active:scale-95 transition cursor-pointer"
                      >
                        ⌫
                      </button>
                    </div>

                    {/* PIN Hint for Quick Testing */}
                    <div className="pt-2 border-t border-gray-200/80 text-[11px] text-gray-500 font-medium">
                      💡 កូដ PIN លំនាំដើម: <b>Admin:</b> 1234 • <b>Cashier:</b> 1111 • <b>Stock:</b> 2222
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSwitchStaffModalOpen(false);
                  setSelectedStaffToLogin(null);
                  setEnteredPin('');
                  setPinError('');
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                បិទ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}