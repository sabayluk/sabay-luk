'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabase';

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

  // Function ទាញយកប្រវត្តិចលនាស្តុក (Stock Movements)
  const fetchStockMovements = async () => {
    setLoadingMovements(true);
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, products(name, sku, image_url), product_variants(size, color)')
      .order('created_at', { ascending: false })
      .limit(50);

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

  // បើក Modal នាំចូលស្តុក និងទាញ Variant របស់ទំនិញនោះមកបង្ហាញ
  const handleOpenStockIn = async (product) => {
    setStockInProduct(product);
    setStockInQty('');
    setStockInReason('នាំចូលបន្ថែមពីមេការ');
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

  // បញ្ជាក់ការនាំចូលស្តុក (Process Stock In)
  const handleConfirmStockIn = async (e) => {
    e.preventDefault();
    const qty = parseInt(stockInQty);
    if (!qty || qty <= 0) return alert('សូមបញ្ចូលចំនួននាំចូលឱ្យបានត្រឹមត្រូវ!');
    setStockInLoading(true);

    try {
      const prevTotalQty = stockInProduct.stock_qty || 0;
      const newTotalQty = prevTotalQty + qty;

      // ១. Update ស្តុកសរុបក្នុង products
      const { error: prodErr } = await supabase
        .from('products')
        .update({ stock_qty: newTotalQty, status: 'In Stock' })
        .eq('id', stockInProduct.id);
      if (prodErr) throw prodErr;

      let variantId = null;
      let prevVariantQty = 0;
      let newVariantQty = 0;

      // ២. បើមាន Variant (Size) Update ចូល product_variants ដែរ
      if (stockInSelectedVariant) {
        variantId = stockInSelectedVariant;
        const selectedVar = stockInVariants.find(v => v.id.toString() === variantId.toString());
        prevVariantQty = selectedVar ? selectedVar.stock_qty : 0;
        newVariantQty = prevVariantQty + qty;

        const { error: varErr } = await supabase
          .from('product_variants')
          .update({ stock_qty: newVariantQty })
          .eq('id', variantId);
        if (varErr) throw varErr;
      }

      // ៣. កត់ត្រាចូល stock_movements (Audit Log)
      const { error: movErr } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: stockInProduct.id,
          variant_id: variantId ? parseInt(variantId) : null,
          type: 'PURCHASE',
          qty_change: qty,
          previous_qty: variantId ? prevVariantQty : prevTotalQty,
          new_qty: variantId ? newVariantQty : newTotalQty,
          reason: stockInReason
        }]);
      if (movErr) throw movErr;

      alert(`✅ នាំចូលទំនិញ [${stockInProduct.name}] ចំនួន +${qty} ចូលស្តុកជោគជ័យ!`);
      setStockInModalOpen(false);
      fetchProducts();
      if (inventorySubTab === 'movements') fetchStockMovements();

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
  
  const [isStoreOpen, setIsStoreOpen] = useState(true); // សម្រាប់បើក/បិទ Dropdown គ្រប់គ្រងមុខហាង
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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (!error) setProducts(data || []);
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

  useEffect(() => {
    fetchRealOrders();
  }, []);

  // Function ប្តូរ Status នៃការកុម្ម៉ង់ (Pending ➔ Shipped ➔ Completed)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      // Update លើ UI ភ្លាមៗ
      setRealOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
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
  const [customerName, setCustomerName] = useState('អតិថិជនទូទៅ');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

    const matchedVariant = currentProductVariants.find(v => v.size === modalSelectedSize);
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

    const cartItemId = `${selectedProductForVariant.id}_${modalSelectedSize || 'nosize'}_${modalSelectedColor || 'nocolor'}`;

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
        price: selectedProductForVariant.price,
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
    const cartItemId = variant ? `${product.id}_${variant.id}` : `${product.id}_base`;
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
        price: product.price,
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

  // ៦. ផ្អាកការលក់ (Hold/Park) និងបន្ត (Resume)
  const parkOrder = () => {
    if (posCart.length === 0) return;
    setHoldOrders([...holdOrders, { id: `ORD-${Date.now().toString().slice(-4)}`, cart: posCart, time: new Date().toLocaleTimeString() }]);
    setPosCart([]);
  };

  const resumeOrder = (index) => {
    setPosCart(holdOrders[index].cart);
    setHoldOrders(holdOrders.filter((_, i) => i !== index));
  };

    // ⭐️ មុខងារបញ្ជាក់ការលក់ និងរក្សាទុកប្រវត្តិ History Full Option ⭐️
  const processPayment = async () => {
    if (paymentMethod === 'Cash' && changeAmount < 0) return alert('❌ ទឹកប្រាក់ទទួលមិនគ្រប់គ្រាន់ទេ!');
    setIsProcessingPayment(true);

    try {
      const generatedOrderId = `ORD-${Date.now().toString().slice(-6)}`;

      // ១. កាត់ស្តុកចេញពី product_variants និង products
      for (const item of posCart) {
        if (item.variantId) {
          const { data: vData } = await supabase.from('product_variants').select('stock_qty').eq('id', item.variantId).single();
          const prevVQty = vData ? vData.stock_qty : item.maxStock;
          const newVQty = Math.max(0, prevVQty - item.qty);

          await supabase.from('product_variants').update({ stock_qty: newVQty }).eq('id', item.variantId);
        }

        const { data: pData } = await supabase.from('products').select('stock_qty').eq('id', item.id).single();
        const prevPQty = pData ? pData.stock_qty : 0;
        const newPQty = Math.max(0, prevPQty - item.qty);

        await supabase.from('products').update({ 
          stock_qty: newPQty,
          status: newPQty > 0 ? 'In Stock' : 'Out of Stock'
        }).eq('id', item.id);

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
      const orderPayload = {
        order_id: generatedOrderId,
        customer_name: customerName || 'អតិថិជនទូទៅ',
        phone: 'N/A',
        phone_number: 'N/A',
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
        customer: customerName
      };

      setReceiptData(receipt);
      setPaymentModalOpen(false);
      setPosCart([]);
      setAmountTendered('');
      setDiscount(0);

      // ៤. ⭐️ ធ្វើបច្ចុប្បន្នភាពទិន្នន័យស្តុក និងប្រវត្តិ Orders ភ្លាមៗ ⭐️
      fetchProducts();
      fetchRealOrders();

    } catch (error) {
      console.error('POS Checkout Error:', error);
      alert('❌ មានបញ្ហាក្នុងការទូទាត់ប្រាក់: ' + error.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  
  // ================= ផ្នែក Upload & Add New Product (រួមបញ្ចូល State, Draft & Reorder) =================
  const [name, setName] = useState('');
  const [sku, setSku] = useState(`SL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [category, setCategory] = useState('ស្បែកជើង');
  
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [customTextSize, setCustomTextSize] = useState('');
  const [color, setColor] = useState('');
  
  const [stockQty, setStockQty] = useState('10');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('5');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
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
      setStockQty(parsed.stockQty || '10');
      setCostPrice(parsed.costPrice || '');
      setSellingPrice(parsed.sellingPrice || '');
      setLowStockAlert(parsed.lowStockAlert || '5');
    }
  }, []);

  useEffect(() => {
    const draft = { name, sku, category, selectedSizes, customTextSize, color, stockQty, costPrice, sellingPrice, lowStockAlert };
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

  // មុខងារ Preview រូបភាព
  const handleImageChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
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
      let publicUrl = previewUrl;
      if (file) {
        const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName);
        publicUrl = publicData.publicUrl;
      }

      let finalSize = '';
      let finalStockQty = parseInt(stockQty) || 0;

      if (category.includes('ស្បែកជើង')) {
        if (selectedSizes.length > 0) {
          finalSize = selectedSizes.map(sz => `${sz}:${variantStock[sz] || 0}`).join(', ');
          finalStockQty = selectedSizes.reduce((sum, sz) => sum + (parseInt(variantStock[sz]) || 0), 0);
        }
      } else if (category.includes('សម្លៀកបំពាក់') || category.includes('ខោអាវ')) {
        finalSize = customTextSize.trim();
      } else {
        finalSize = 'N/A';
      }

      const productData = {
        sku: sku || `SL-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name.trim(),
        category: category.trim(),
        size: finalSize,
        color: color,
        stock_qty: finalStockQty,
        cost_price: parseFloat(costPrice) || 0,
        price: parseFloat(sellingPrice) || 0,
        low_stock_alert: parseInt(lowStockAlert) || 5,
        image_url: publicUrl,
        status: finalStockQty > 0 ? 'In Stock' : 'Out of Stock'
      };

      if (editingProductId) {
        // កែប្រែទំនិញដែលមានស្រាប់
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProductId);

        if (updateError) throw updateError;
        setMessage('✅ កែប្រែទំនិញក្នុងស្តុកជោគជ័យ!');
        setEditingProductId(null);
      } else {
        // ⭐️ ១. បញ្ចូលផលិតផលថ្មីទៅតារាង products
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (insertError) throw insertError;

        // ⭐️ ២. បញ្ចូល Variants តាម Size នីមួយៗទៅតារាង product_variants
        if (newProduct && selectedSizes.length > 0 && category.includes('ស្បែកជើង')) {
          const variantsPayload = selectedSizes.map(sz => ({
            product_id: newProduct.id,
            sku: `${newProduct.sku}-${sz}`,
            size: sz,
            color: color || '',
            stock_qty: parseInt(variantStock[sz]) || 0
          }));

          const { data: insertedVariants, error: varError } = await supabase
            .from('product_variants')
            .insert(variantsPayload)
            .select();

          if (varError) console.error('Error inserting variants:', varError);

          // ⭐️ ៣. កត់ត្រាស្តុកដំបូងចូលតារាង stock_movements (Audit Log)
          if (insertedVariants && insertedVariants.length > 0) {
            const movementLogs = insertedVariants.map(v => ({
              product_id: newProduct.id,
              variant_id: v.id,
              type: 'PURCHASE',
              qty_change: v.stock_qty,
              previous_qty: 0,
              new_qty: v.stock_qty,
              reason: 'បញ្ចូលទំនិញថ្មីដំបូង (Initial Stock)'
            }));

            await supabase.from('stock_movements').insert(movementLogs);
          }
        } else if (newProduct && finalStockQty > 0) {
          // សម្រាប់ទំនិញដែលគ្មាន Size
          await supabase.from('stock_movements').insert([{
            product_id: newProduct.id,
            type: 'PURCHASE',
            qty_change: finalStockQty,
            previous_qty: 0,
            new_qty: finalStockQty,
            reason: 'បញ្ចូលទំនិញថ្មីដំបូង (Initial Stock)'
          }]);
        }

        setMessage('🎉 បញ្ចូលទំនិញថ្មី និងកត់ត្រាស្តុកជោគជ័យ!');
        
        const skuMatch = sku.match(/^(.*?-)(\d+)$/);
        if (skuMatch) {
          setSku(`${skuMatch[1]}${parseInt(skuMatch[2], 10) + 1}`);
        }
      }

      localStorage.removeItem('sabay_product_draft'); 
      setFile(null);
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

      {message && (
        <div className={`p-4 mb-6 rounded-2xl font-bold text-sm flex items-center gap-2 ${message.includes('ជោគជ័យ') || message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
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
                onChange={(e) => setSku(e.target.value)} 
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
                      onClick={() => setColor(col)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        color === col
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {col}
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

              <div className="flex gap-2 max-w-sm mt-3">
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
                      setAvailableColors([...availableColors, newColorInput.trim()]);
                      setColor(newColorInput.trim());
                      setNewColorInput('');
                    }
                  }}
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  + បន្ថែម Color
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ៣. ស្តុក និងតម្លៃ */}
        <div>
          <h3 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">💰 ៣. ស្តុក និងតម្លៃ (Stock & Pricing)</h3>
          
          {/* ⭐️ ប្រអប់វាយចំនួនស្តុកតាម Size នីមួយៗ ⭐️ */}
          {selectedSizes.length > 0 && category.includes('ស្បែកជើង') ? (
            <div className="mb-6 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
              <label className="block text-xs font-bold text-blue-800 uppercase mb-3">📦 កំណត់ចំនួនស្តុកតាមទំហំនីមួយៗ (Stock per Size)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {selectedSizes.map(sz => (
                  <div key={sz} className="bg-white border border-blue-200 rounded-xl p-2.5 flex flex-col items-center shadow-sm">
                    <span className="text-[11px] font-black text-gray-600 mb-1.5">Size {sz}</span>
                    <input 
                      type="number" 
                      min="0"
                      value={variantStock[sz] || ''}
                      onChange={(e) => setVariantStock(prev => ({...prev, [sz]: e.target.value}))}
                      placeholder="0"
                      className="w-full text-center border-2 border-gray-100 rounded-lg p-1.5 text-sm font-bold focus:border-orange-500 outline-none text-blue-700 bg-white"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-blue-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">ស្តុកសរុប (Total) លោតស្វ័យប្រវត្តិ៖</span>
                <span className="text-xl font-black text-blue-700">{selectedSizes.reduce((sum, sz) => sum + (parseInt(variantStock[sz]) || 0), 0)} <span className="text-xs text-gray-400">គូ</span></span>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">ចំនួនស្តុកសរុប</label>
              <input 
                type="number" 
                value={stockQty} 
                onChange={(e) => setStockQty(e.target.value)} 
                min="0" 
                required 
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition bg-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">តម្លៃដើម ($)</label>
              <input 
                type="number" 
                step="0.01" 
                value={costPrice} 
                onChange={(e) => setCostPrice(e.target.value)} 
                placeholder="0.00" 
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition bg-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">តម្លៃលក់ចេញ ($) *</label>
              <input 
                type="number" 
                step="0.01" 
                value={sellingPrice} 
                onChange={(e) => setSellingPrice(e.target.value)} 
                placeholder="0.00" 
                required 
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold text-green-600 focus:border-blue-500 outline-none transition bg-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">កម្រិតស្តុកដាស់តឿន</label>
              <input 
                type="number" 
                value={lowStockAlert} 
                onChange={(e) => setLowStockAlert(e.target.value)} 
                min="1" 
                className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-bold text-orange-600 focus:border-blue-500 outline-none transition bg-white" 
              />
            </div>
          </div>
        </div>

        {/* ៤. រូបភាព */}
        <div>
          <h3 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">🖼️️ ៤. រូបភាពផលិតផល (Product Image)</h3>
          <div className="flex flex-col md:flex-row gap-6 items-center bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-32 h-32 bg-white rounded-2xl shadow-inner border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <span className="text-gray-400 text-xs font-bold text-center p-2">គ្មានរូបភាព Preview</span>
              )}
            </div>
            <div className="flex-1 w-full space-y-3">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer" 
              />
              <p className="text-xs text-gray-400">ទ្រទ្រង់ទម្រង់ JPG, PNG ឬ WEBP ទំហំអតិបរមា 5MB។</p>
            </div>
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
                setSku(`SL-${Math.floor(1000 + Math.random() * 9000)}`);
                setSellingPrice('');
                setCostPrice('');
                setStockQty('10');
                setColor('');
                setSelectedSizes([]);
                setPreviewUrl(null);
                setFile(null);
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
    { id: 'box', label: 'ប្រអប់ទំនិញ', svg: <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg> }
  ];

  async function fetchCategoriesFromDB() {
    const { data, error } = await supabase.from('categories').select('*');
    if (!error && data) {
      setCategories(data);
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

  const handleDeleteCategory = async (id) => {
    if (confirm('តើអ្នកពិតជាចង់លុបប្រភេទនេះមែនទេ?')) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) {
        fetchCategoriesFromDB();
      } else {
        alert('❌ មិនអាចលុបបានទេ!');
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

  const CategoryView = () => (
    <div className="animate-in fade-in max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-xl border border-gray-100 mb-10">
      <div className="mb-8 border-b border-gray-100 pb-4">
        <h2 className="text-3xl font-black text-gray-900">🏷️️ គ្រប់គ្រងប្រភេទផលិតផល (Category Management)</h2>
        <p className="text-sm text-gray-500 mt-1">អាចអូស (Drag) ប្ដូរទីតាំងជួរ ព្រមទាំងកែប្រែឈ្មោះ និង Icon បានយ៉ាងងាយស្រួល</p>
      </div>

      {catMessage && (
        <div className={`p-4 mb-6 rounded-2xl font-bold text-sm ${catMessage.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {catMessage}
        </div>
      )}

      {/* Form បន្ថែម Category ថ្មី */}
      <form onSubmit={handleAddCategory} className="space-y-6 mb-10 bg-gray-50 p-6 rounded-2xl border border-gray-200">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-3">១. រើសរូបសញ្ញា Icon សម្គាល់</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
            {quickIcons.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => setNewCatIcon(item.id)}
                className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-bold text-xs ${newCatIcon === item.id ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-gray-200 bg-white text-gray-700'}`}
              >
                {item.svg}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-2">២. ឈ្មោះប្រភេទផលិតផលថ្មី</label>
          <div className="flex gap-4">
            <input 
              type="text" 
              value={newCatName} 
              onChange={(e) => setNewCatName(e.target.value)} 
              placeholder="ឧ. ស្បែកជើងបុរស, ស្បែកជើងកែងនារី..." 
              required 
              className="flex-1 border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-medium focus:border-blue-500 outline-none bg-white"
            />
            <button type="submit" className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-md hover:bg-blue-700 transition">
              + បន្ថែម
            </button>
          </div>
        </div>
      </form>

      {/* តារាងបង្ហាញ Categories (អាច Drag អូសប្ដូរទីតាំងបាន និងមានកែប្រែ Icon) */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">Icon (អូសដើម្បីប្ដូរជួរ)</th>
              <th className="px-6 py-4 font-bold text-gray-600">ឈ្មោះប្រភេទ (Category Name)</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-center">ចំនួនទំនិញ (Products)</th>
              <th className="px-6 py-4 font-bold text-gray-600 text-right">សកម្មភាព (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 ? (
              <tr><td colSpan="3" className="p-8 text-center text-gray-400">មិនទាន់មានប្រភេទផលិតផលទេ។</td></tr>
            ) : (
              categories.map((cat, idx) => {
                const isEditing = editingCategoryId === cat.id;
                const matched = quickIcons.find(i => i.id === (isEditing ? editingCatIcon : cat.icon));
                const displayIcon = matched ? matched.svg : <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-6 h-6 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>;

                return (
                  <tr 
                    key={cat.id} 
                    draggable
                    onDragStart={() => handleCatDragStart(idx)}
                    onDragOver={(e) => handleCatDragOver(e, idx)}
                    onDragEnd={handleCatDragEnd}
                    className="hover:bg-gray-50 transition cursor-grab active:cursor-grabbing"
                  >
                    {/* ផ្នែក Icon */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select 
                          value={editingCatIcon} 
                          onChange={(e) => setEditingCatIcon(e.target.value)}
                          className="border-2 border-blue-500 rounded-lg p-1 text-xs font-bold outline-none bg-white"
                        >
                          {quickIcons.map(qi => (
                            <option key={qi.id} value={qi.id}>{qi.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="text-gray-300 font-bold">☰</span> {displayIcon}
                        </div>
                      )}
                    </td>

                    {/* ផ្នែកឈ្មោះ Category */}
  {/* ផ្នែកឈ្មោះ Category */}
  <td className="px-6 py-4 font-black text-gray-800 text-base">
    {isEditing ? (
      <input 
        type="text" 
        value={editingCatName} 
        onChange={(e) => setEditingCatName(e.target.value)} 
        className="border-2 border-blue-500 px-3 py-1 rounded-xl text-sm font-bold w-full outline-none bg-white"
        autoFocus
      />
    ) : (
      <div>
        <span>{cat.name}</span>
      </div>
    )}
  </td>

  {/* ⭐️ ផ្នែកបង្ហាញចំនួនទំនិញក្នុង Category នេះ ⭐️ */}
  <td className="px-6 py-4 text-center">
    {(() => {
      // រាប់ចំនួនទំនិញដោយមិនខ្វល់រឿងដកឃ្លា ឬអក្សរតូចធំ
      const productCount = products.filter(p => {
        const pCat = (p.category || '').trim().toLowerCase();
        const catName = cat.name.trim().toLowerCase();
        return pCat.includes(catName) || catName.includes(pCat);
      }).length;

      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-black">
          {productCount} មុខទំនិញ
        </span>
      );
    })()}
  </td>

                    {/* ផ្នែកប៊ូតុង Actions */}
                    <td className="px-6 py-4 text-right space-x-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleUpdateCategory(cat.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition">
                            រក្សាទុក
                          </button>
                          <button onClick={() => setEditingCategoryId(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs px-3.5 py-1.5 rounded-lg transition">
                            បោះបង់
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingCategoryId(cat.id); setEditingCatName(cat.name); setEditingCatIcon(cat.icon || 'shoe'); }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-100 transition">
                            ✏️ កែប្រែ (Edit)
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="bg-red-50 hover:bg-red-100 text-red-500 font-bold text-xs px-3 py-1.5 rounded-lg border border-red-100 transition">
                            🗑️ លុប (Delete)
                          </button>
                        </>
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
  );
  

  // ================= ផ្នែក Cover Management =================
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [coverBadge, setCoverBadge] = useState('NEW COLLECTION 2026');
  const [coverTitle, setCoverTitle] = useState('ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់សម្រាប់អ្នក');
  const [coverDesc, setCoverDesc] = useState('ស្វែងរកទំនិញម៉ាកយីហោលំដាប់ប្រណិត ធានាទាំងតម្លៃ និងគុណភាពពិតប្រាកដ។');
  const [coverBtnText, setCoverBtnText] = useState('បញ្ជាទិញឥឡូវនេះ');

  // ទាញយក Cover ពី localStorage ពេលចាប់ផ្តើម
  useEffect(() => {
    const savedCover = localStorage.getItem('sabay_luk_cover');
    if (savedCover) {
      const parsed = JSON.parse(savedCover);
      setCoverBadge(parsed.badge || 'NEW COLLECTION 2026');
      setCoverTitle(parsed.title || 'ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់សម្រាប់អ្នក');
      setCoverDesc(parsed.desc || 'ស្វែងរកទំនិញម៉ាកយីហោលំដាប់ប្រណិត ធានាទាំងតម្លៃ និងគុណភាពពិតប្រាកដ។');
      setCoverBtnText(parsed.btnText || 'បញ្ជាទិញឥឡូវនេះ');
      setCoverPreview(parsed.image || ''); // ទាញយករូបភាព Preview
    }
  }, []);

  const handleSaveCover = async (e) => {
    e.preventDefault();
    setCoverMessage('⏳ កំពុងរកទុក...');

    try {
      let imageUrl = coverPreview;

      // បើមានការជ្រើសរើសរូបភាពថ្មី ធ្វើការ Upload ទៅកាន់ Supabase Storage
      if (coverImage) {
        const fileName = `cover_${Date.now()}.${coverImage.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(fileName, coverImage);
        if (!uploadError) {
          const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName);
          imageUrl = publicData.publicUrl;
        }
      }

      const coverData = {
        badge: coverBadge,
        title: coverTitle,
        desc: coverDesc,
        btnText: coverBtnText,
        image: imageUrl
      };

      localStorage.setItem('sabay_luk_cover', JSON.stringify(coverData));
      setCoverMessage('🎉 រក្សាទុក Cover ហាង និងរូបភាពជោគជ័យ!');
    } catch (err) {
      setCoverMessage('❌ មានបញ្ហា: ' + err.message);
    }
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file)); // បង្ហាញរូប Preview ភ្លាមៗ
    }
  };

  // ================= ផ្នែក Cover Management (Multiple Slides - 5 សន្លឹក Standard DB) =================
  const [slides, setSlides] = useState([
    { badge: 'NEW COLLECTION 2027', title: 'ភាពស៊ីវិល័យ...', desc: '...', btnText: 'បញ្ជាទិញឥឡូវនេះ', image: '' },
    { badge: '', title: '', desc: '', btnText: '', image: '' },
    { badge: '', title: '', desc: '', btnText: '', image: '' },
    { badge: '', title: '', desc: '', btnText: '', image: '' },
    { badge: '', title: '', desc: '', btnText: '', image: '' },
  ]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [coverMessage, setCoverMessage] = useState('');
  
  // States សម្រាប់ Loading UI បែប Standard
  const [isUploadingSlide, setIsUploadingSlide] = useState(false);
  const [isSavingSlides, setIsSavingSlides] = useState(false);

  // ១. ទាញយកទិន្នន័យ Slides ពី Database ពេល Load ចូលផ្ទាំងនេះ
  useEffect(() => {
    async function fetchSlidesFromDB() {
      const { data, error } = await supabase.from('sliders').select('*').order('id', { ascending: true });
      if (data && data.length > 0) {
        const loadedSlides = Array(5).fill(0).map((_, i) => {
          const slide = data.find(s => s.id === i + 1);
          return slide 
            ? { badge: slide.badge || '', title: slide.title || '', desc: slide.description || '', btnText: slide.btn_text || '', image: slide.image_url || '' } 
            : { badge: '', title: '', desc: '', btnText: '', image: '' };
        });
        setSlides(loadedSlides);
      }
    }
    fetchSlidesFromDB();
  }, []);

  const handleSlideChange = (field, value) => {
    const updated = [...slides];
    updated[activeSlideIndex][field] = value;
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
        updated[activeSlideIndex].image = publicData.publicUrl;
        setSlides(updated);
        setCoverMessage('✅ Upload រូបភាពជោគជ័យ! សូមចុចរក្សាទុកទិន្នន័យ។');
      } catch (err) {
        setCoverMessage('❌ Upload បរាជ័យ: ' + err.message);
      } finally {
        setIsUploadingSlide(false);
      }
    }
  };

  

  // ៣. មុខងារ Save ចូល Database ផ្ទាល់ (Supabase Upsert) พร้อม trim() សម្អាតអក្សរទទេ
  const handleSaveAllSlides = async (e) => {
    e.preventDefault();
    setIsSavingSlides(true);
    setCoverMessage('⏳ កំពុងរក្សាទុកទៅក្នុង Database...');

    try {
      const upsertData = slides.map((slide, index) => ({
        id: index + 1, 
        badge: slide.badge ? slide.badge.trim() : '',
        title: slide.title ? slide.title.trim() : '',
        description: slide.desc ? slide.desc.trim() : '', // 👈 កាត់សម្អាតកន្លែងនេះ
        btn_text: slide.btnText ? slide.btnText.trim() : '',
        image_url: slide.image ? slide.image.trim() : ''
      }));

      const { error } = await supabase.from('sliders').upsert(upsertData);
      if (error) throw error;

      setCoverMessage('✅ រក្សាទុក Slides ទាំង 5 សន្លឹកទៅកាន់ Database ជោគជ័យ!');
    } catch (err) {
      setCoverMessage('❌ មានបញ្ហាពេលរក្សាទុក: ' + err.message);
    } finally {
      setIsSavingSlides(false);
    }
  };

  // ⭐️ ផ្ទាំង CoverManagementView ⭐️
  const CoverManagementView = () => (
    <div className="animate-in fade-in max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-xl border border-gray-100 mb-10">
      <div className="mb-8 border-b border-gray-100 pb-4">
        <h2 className="text-3xl font-black text-gray-900">🖼️ គ្រប់គ្រង Cover Slider ហាង (5 សន្លឹក)</h2>
        <p className="text-sm text-gray-500 mt-1">ទិន្នន័យនឹងត្រូវបានភ្ជាប់ទៅកាន់ Database និងបង្ហាញលើវេបសាយផ្ទាល់</p>
      </div>

      {coverMessage && (
        <div className={`p-4 mb-6 rounded-2xl font-bold text-sm ${coverMessage.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {coverMessage}
        </div>
      )}

      {/* Tabs រើសសន្លឹក Slide ទាំង ៥ */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveSlideIndex(idx)}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all whitespace-nowrap shadow-sm ${activeSlideIndex === idx ? 'bg-blue-600 text-white shadow-blue-600/30 shadow-lg scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            📸 សន្លឹកទី {idx + 1}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveAllSlides} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-2">🖼️ រូបភាពផ្ទៃខាងក្រោយសន្លឹកទី {activeSlideIndex + 1}</label>
          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 relative overflow-hidden">
            
            {/* Loading Overlay ពេលកំពុង Upload */}
            {isUploadingSlide && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-blue-600 mt-2">កំពុង Upload...</p>
              </div>
            )}

            {slides[activeSlideIndex].image ? (
              <img src={slides[activeSlideIndex].image} alt="Slide Preview" className="w-32 h-20 object-cover rounded-xl border shadow-md" />
            ) : (
              <div className="w-32 h-20 bg-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400 font-bold">គ្មានរូបភាព</div>
            )}
            <input type="file" accept="image/*" onChange={handleSlideImageUpload} disabled={isUploadingSlide} className="text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-2">១. អក្សរផ្លាកតូចលើគេ (Badge)</label>
          <input type="text" value={slides[activeSlideIndex].badge} onChange={(e) => handleSlideChange('badge', e.target.value)} className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-medium outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-2">២. ចំណងជើងធំ (Main Title)</label>
          <input type="text" value={slides[activeSlideIndex].title} onChange={(e) => handleSlideChange('title', e.target.value)} className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-medium outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-2">៣. អក្សររៀបរាប់លម្អិត (Description)</label>
          <textarea value={slides[activeSlideIndex].desc} onChange={(e) => handleSlideChange('desc', e.target.value)} rows="3" className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-medium outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-2">៤. អក្សរលើប៊ូតុងបញ្ជាទិញ (Button Text)</label>
          <input type="text" value={slides[activeSlideIndex].btnText} onChange={(e) => handleSlideChange('btnText', e.target.value)} className="w-full border-2 border-gray-200 p-3.5 rounded-2xl text-sm font-medium outline-none focus:border-blue-500" />
        </div>
        
        <button type="submit" disabled={isSavingSlides || isUploadingSlide} className="w-full bg-[#ff6a00] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#e65c00] transition shadow-xl disabled:bg-gray-400 disabled:shadow-none flex items-center justify-center gap-3">
          {isSavingSlides ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> កំពុងរក្សាទុក...</>
          ) : (
            '💾 រក្សាទុក Slides ចូល Database'
          )}
        </button>
      </form>
    </div>
  );

    // ================= ស្ថិតិគំរូ & ផ្ទាំងវិភាគទិន្នន័យ (ANALYTICS) =================
  const stats = { totalRevenue: 12540.00, dailySales: 450.00, monthlySales: 4500.00, totalOrders: 156 };

    // ⭐️ ផ្ទាំងវិភាគទិន្នន័យពិតប្រាកដ (REAL ANALYTICS VIEW) ⭐️
  const AnalyticsView = () => (
    <div className="animate-in fade-in pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900">📊 វិភាគទិន្នន័យលក់ពិតប្រាកដ (Real Analytics)</h2>
          <p className="text-sm text-gray-500 mt-0.5">ទិន្នន័យគណនាស្វ័យប្រវត្តិចេញពីការលក់នៅ POS និងកុម្ម៉ង់ពីមុខហាង</p>
        </div>
        <button 
          onClick={fetchRealOrders}
          className="bg-white border border-gray-200 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-gray-50 transition"
        >
          🔄 ធ្វើបច្ចុប្បន្នភាពទិន្នន័យ
        </button>
      </div>

      {/* Metric Cards គណនាចេញពី Database ពិត */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">ចំណូលសរុប (Total Revenue)</p>
          <p className="text-3xl font-black text-green-600 mt-2">${realTotalRevenue.toFixed(2)}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">≈ {(realTotalRevenue * exchangeRate).toLocaleString()} ៛</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">ចំណូលថ្ងៃនេះ (Today Sales)</p>
          <p className="text-3xl font-black text-blue-600 mt-2">${realDailySales.toFixed(2)}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">គិតត្រឹមថ្ងៃនេះ</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">ការបញ្ជាទិញសរុប (Total Orders)</p>
          <p className="text-3xl font-black text-orange-600 mt-2">{realTotalOrdersCount} <span className="text-xs text-gray-400 font-bold">Orders</span></p>
          <p className="text-xs font-bold text-gray-400 mt-1">រាប់បញ្ចូលទាំង POS & Online</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">មធ្យមភាគក្នុង ១ កន្ត្រក (AOV)</p>
          <p className="text-3xl font-black text-purple-600 mt-2">
            ${realTotalOrdersCount > 0 ? (realTotalRevenue / realTotalOrdersCount).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs font-bold text-gray-400 mt-1">ចំណាយជាមធ្យមក្នុង ១ វិក្កយបត្រ</p>
        </div>
      </div>
    </div>
  );

  // State សម្រាប់ Modal មើលលម្អិតការបញ្ជាទិញ (View Order Detail Modal)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [searchOrder, setSearchOrder] = useState('');

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
                          <span className="bg-gray-100 px-2 py-1 rounded-md">{order.payment || 'Cash'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-black text-sm text-green-600">${parseFloat(order.total || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{(parseFloat(order.total || 0) * exchangeRate).toLocaleString()} ៛</p>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status || 'Completed'}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="text-xs font-bold border rounded-lg px-2 py-1 outline-none bg-white cursor-pointer"
                          >
                            <option value="Completed">✓ ជោគជ័យ</option>
                            <option value="Preparing">⏳ កំពុងរៀបចំ</option>
                            <option value="Shipped">🚚 កំពុងដឹក</option>
                            <option value="Cancelled">✕ បោះបង់</option>
                          </select>
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

  // ⭐️ ផ្ទាំង InventoryView ដែលបានកែសម្រួលរួចរាល់ (គ្មាន Modal ចាស់ខុស) ⭐️
    const InventoryView = () => {
    const lowStockCount = products.filter(p => p.stock_qty > 0 && p.stock_qty <= (p.low_stock_alert || 5)).length;
    const outOfStockCount = products.filter(p => p.stock_qty <= 0).length;
    const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock_qty || 0)), 0);

    const filteredInventory = products.filter(p => {
      const pCat = (p.category || '').trim().toLowerCase();
      const filterCat = invCategory.trim().toLowerCase();

      const matchesCategory = invCategory === 'all' || pCat.includes(filterCat) || filterCat.includes(pCat);
      const matchesSearch = p.name.toLowerCase().includes(invSearch.toLowerCase()) || p.sku.toLowerCase().includes(invSearch.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === 'low') matchesStatus = p.stock_qty > 0 && p.stock_qty <= (p.low_stock_alert || 5);
      if (filterStatus === 'out') matchesStatus = p.stock_qty <= 0;
      if (filterStatus === 'normal') matchesStatus = p.stock_qty > (p.low_stock_alert || 5);

      return matchesCategory && matchesSearch && matchesStatus;
    });

    return (
      <div className="animate-in fade-in pb-12 max-w-[1400px] mx-auto relative">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900">🗄️ គ្រប់គ្រងស្តុកស្តង់ដារ (Inventory Management)</h2>
            <p className="text-sm text-gray-500 mt-1">គ្រប់គ្រងចំនួនទំនិញ នាំចូលស្តុក និងតាមដានប្រវត្តិចលនាចេញចូល</p>
          </div>
          <button onClick={() => setActiveTab('upload')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
            <span>+ បន្ថែមផលិតផលថ្មី</span>
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
            <span className="text-gray-400 text-xs font-black uppercase mb-1">សរុបមុខទំនិញ</span>
            <span className="text-3xl font-black text-gray-900">{products.length} <span className="text-xs font-bold text-gray-400">Products</span></span>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-orange-500">
            <span className="text-gray-400 text-xs font-black uppercase mb-1">ស្តុកជិតអស់ / អស់ស្តុក</span>
            <span className="text-3xl font-black text-orange-600">{lowStockCount} <span className="text-lg text-red-500 font-black">({outOfStockCount} Out)</span></span>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-blue-500">
            <span className="text-gray-400 text-xs font-black uppercase mb-1">ប្រភេទ Category</span>
            <span className="text-3xl font-black text-blue-600">{categories.length} <span className="text-xs font-bold text-gray-400">Categories</span></span>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-green-500">
            <span className="text-gray-400 text-xs font-black uppercase mb-1">តម្លៃស្តុកសរុប</span>
            <span className="text-3xl font-black text-green-600">${totalValue.toLocaleString()}</span>
          </div>
        </div>

        {/* ⭐️ Navigation Sub-tabs រវាង "បញ្ជីទំនិញ" និង "ប្រវត្តិចលនាស្តុក" ⭐️ */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 pb-3">
          <button 
            onClick={() => setInventorySubTab('items')} 
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${inventorySubTab === 'items' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            📦 បញ្ជីទំនិញក្នុងស្តុក ({products.length})
          </button>
          <button 
            onClick={() => setInventorySubTab('movements')} 
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${inventorySubTab === 'movements' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            📋 ប្រវត្តិចលនាស្តុក (Audit Log)
          </button>
        </div>

        {inventorySubTab === 'items' ? (
          <>
            {/* Filter & Search Bar */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <input 
                    type="text" 
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    placeholder="ស្វែងរក SKU ឬឈ្មោះផលិតផល..." 
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-gray-200 text-sm font-bold focus:border-blue-500 outline-none transition bg-white"
                  />
                  <span className="absolute left-3.5 top-3.5 text-gray-400 text-sm">🔍</span>
                </div>

                <select value={invCategory} onChange={(e) => setInvCategory(e.target.value)} className="border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold bg-white focus:border-blue-500 outline-none transition">
                  <option value="all">📁 គ្រប់ប្រភេទ ({products.length})</option>
                  {categories.map(c => (
                    <option key={c.id || c.name} value={c.name}>📁 {c.name}</option>
                  ))}
                </select>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold bg-white focus:border-blue-500 outline-none transition">
                  <option value="all">📊 ស្ថានភាពទាំងអស់</option>
                  <option value="normal">🟢 ស្តុកធម្មតា</option>
                  <option value="low">🟠 ស្តុកជិតអស់</option>
                  <option value="out">🔴 អស់ស្តុក</option>
                </select>
              </div>

              <div className="text-xs font-bold text-gray-500 whitespace-nowrap">
                លទ្ធផល: <span className="text-blue-600 font-black">{filteredInventory.length}</span> មុខ
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">SKU</th>
                      <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">ឈ្មោះទំនិញ</th>
                      <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">ប្រភេទ</th>
                      <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">ទំហំ/ពណ៌</th>
                      <th className="px-5 py-4 uppercase text-xs font-black text-gray-500">តម្លៃលក់</th>
                      <th className="px-5 py-4 uppercase text-xs font-black text-gray-500 text-center">ស្តុក</th>
                      <th className="px-5 py-4 uppercase text-xs font-black text-gray-500 text-right pr-6">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInventory.map(product => {
                      let statusBadge = <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-black">In Stock</span>;
                      if (product.stock_qty <= 0) statusBadge = <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-black">Out</span>;
                      else if (product.stock_qty <= (product.low_stock_alert || 5)) statusBadge = <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[10px] font-black">Low</span>;

                                            return (
                        <tr key={product.id} className="hover:bg-gray-50/80 transition">
                          <td className="px-5 py-4 font-black text-blue-600 text-xs">{product.sku}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {product.image_url ? (
                                <img src={product.image_url} className="w-10 h-10 rounded-xl object-cover bg-gray-100 border shadow-xs shrink-0" alt="" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gray-100 border flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">No Pic</div>
                              )}
                              <div>
                                <p className="font-black text-gray-900 text-xs line-clamp-1">{product.name}</p>
                                <div className="mt-0.5">{statusBadge}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-gray-600">{product.category || 'N/A'}</td>
                          <td className="px-5 py-4 text-[11px] text-gray-500">
                            <div>Size: <span className="font-bold text-gray-800">{product.size || 'N/A'}</span></div>
                            <div>Color: <span className="font-bold text-orange-600">{product.color || 'N/A'}</span></div>
                          </td>
                          <td className="px-5 py-4 font-black text-green-600 text-sm">${product.price ? product.price.toFixed(2) : '0.00'}</td>
                          <td className="px-5 py-4 font-black text-gray-900 text-center text-sm">{product.stock_qty}</td>
                          <td className="px-5 py-4 text-right pr-6 whitespace-nowrap space-x-1.5">
                            {/* ⭐️ ប៊ូតុងថ្មី: នាំចូលស្តុកបន្ថែម (Stock In) ⭐️ */}
                            <button 
                              onClick={() => handleOpenStockIn(product)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                              title="នាំចូលស្តុកបន្ថែម"
                            >
                              📥 នាំចូល
                            </button>
                              {/* ⭐️ ប៊ូតុងបោះពុម្ពបាកូដ / ស្លាកតម្លៃ (Barcode Sticker) ⭐️ */}
                            <button 
                              onClick={() => {
                                setBarcodeProduct(product);
                                setBarcodePrintQty(1);
                                setBarcodeModalOpen(true);
                              }}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-purple-200 transition"
                              title="បោះពុម្ព Barcode បិទលើប្រអប់"
                            >
                              🏷️ Barcode
                            </button>

                            {/* ប៊ូតុង Edit */}
                            <button 
                              onClick={() => {
                                setActiveTab('upload');
                                setEditingProductId(product.id);
                                setName(product.name || '');
                                setSku(product.sku || '');
                                setCategory(product.category || (categories[0] ? categories[0].name : ''));
                                setSellingPrice(product.price ? product.price.toString() : '');
                                setCostPrice(product.cost_price ? product.cost_price.toString() : '');
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

                                setPreviewUrl(product.image_url || null);
                                setFile(null);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-3 py-1.5 rounded-xl border border-blue-200 transition"
                            >
                              ✏️ Edit
                            </button>

                            {/* ប៊ូតុង Delete */}
                            <button 
                              onClick={() => {
                                setProductToDelete(product);
                                setDeleteModalOpen(true);
                              }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-3 py-1.5 rounded-xl border border-red-200 transition"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* ⭐️ ផ្ទាំងតារាងប្រវត្តិចលនាស្តុក (Stock Movements Log - Audit Trail) ⭐️ */
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-black text-gray-900 text-base">📋 កំណត់ត្រាចលនាស្តុក (Stock Movement Audit History)</h3>
                <p className="text-xs text-gray-500 mt-0.5">តាមដានរាល់ការ នាំចូល (Purchase), លក់ចេញ (Sale), និងកែតម្រូវស្តុក</p>
              </div>
              <button 
                onClick={fetchStockMovements}
                className="bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
              >
                🔄 Refresh Logs
              </button>
            </div>

            {loadingMovements ? (
              <div className="p-16 text-center text-gray-500 font-bold">កំពុងទាញកំណត់ត្រាចលនាស្តុក...</div>
            ) : stockMovements.length === 0 ? (
              <div className="p-16 text-center text-gray-400 font-bold">មិនទាន់មានកំណត់ត្រាចលនាស្តុកនៅឡើយទេ។</div>
            ) : (
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
                    {stockMovements.map((log) => {
                      const isPositive = log.qty_change > 0;
                      let typeBadge = <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-black">{log.type}</span>;
                      
                      if (log.type === 'PURCHASE') {
                        typeBadge = <span className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-md text-[10px] font-black">📥 នាំចូល (In)</span>;
                      } else if (log.type === 'SALE') {
                        typeBadge = <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md text-[10px] font-black">📤 លក់ចេញ (Sale)</span>;
                      } else if (log.type === 'ADJUSTMENT') {
                        typeBadge = <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md text-[10px] font-black">⚙️ កែតម្រូវ</span>;
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
                          <td className={`px-5 py-4 text-center font-black text-sm ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
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
            )}
          </div>
        )}

        {/* ⭐️ MODAL នាំចូលស្តុកថ្មី (Stock In Modal) ⭐️ */}
        {stockInModalOpen && stockInProduct && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 border border-gray-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-xl font-black text-gray-900">📥 នាំចូលស្តុកទំនិញបន្ថែម</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{stockInProduct.name} ({stockInProduct.sku})</p>
                </div>
                <button 
                  onClick={() => setStockInModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-black"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmStockIn} className="space-y-4">
                {/* បើទំនិញមាន Variants (Sizes) ឱ្យជ្រើសរើស Size នាំចូល */}
                {stockInVariants.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">ជ្រើសរើសទំហំ (Size) ដែលត្រូវនាំចូល</label>
                    <select 
                      value={stockInSelectedVariant}
                      onChange={(e) => setStockInSelectedVariant(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-2xl p-3 text-sm font-bold bg-white focus:border-emerald-500 outline-none"
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
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">ចំនួនដែលត្រូវនាំចូលបន្ថែម (+Qty) *</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={stockInQty}
                    onChange={(e) => setStockInQty(e.target.value)}
                    placeholder="ឧ. 10"
                    className="w-full border-2 border-gray-200 rounded-2xl p-3 text-lg font-black text-emerald-700 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">សម្គាល់ / មូលហេតុ (Reason / Note)</label>
                  <input 
                    type="text"
                    value={stockInReason}
                    onChange={(e) => setStockInReason(e.target.value)}
                    placeholder="ឧ. នាំចូលបន្ថែមពីមេការ ឬទិញបន្ថែម"
                    className="w-full border-2 border-gray-200 rounded-2xl p-3 text-sm font-medium focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setStockInModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-2xl font-bold text-sm transition"
                  >
                    បោះបង់
                  </button>
                  <button 
                    type="submit" 
                    disabled={stockInLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/30 transition disabled:bg-gray-300"
                  >
                    {stockInLoading ? 'កំពុងរក្សាទុក...' : '💾 បញ្ជាក់ការនាំចូល'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
      </div>
    );
  };

  // ⭐️ ផ្ទាំង POS ⭐️
    const PosView = () => {
    const filteredProducts = products.filter(p =>
      (posCategory === 'all' || p.category === posCategory) &&
      (p.name.toLowerCase().includes(posSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(posSearch.toLowerCase())))
    );

    return (
      <div className="flex h-[calc(100vh-80px)] animate-in fade-in bg-gray-100 -m-10">
        
        {/* ផ្នែកខាងឆ្វេង: បញ្ជីទំនិញ និង Categories */}
        <div className="flex-1 flex flex-col h-full p-6">
          <div className="flex justify-between items-center mb-6 gap-4">
            <div>
              <h2 className="text-3xl font-black text-gray-900">ប្រព័ន្ធលក់ (POS)</h2>
              <p className="text-xs text-gray-500 font-bold mt-0.5">អត្រាប្តូរប្រាក់: $1 = {exchangeRate.toLocaleString()} ៛</p>
            </div>
            <div className="flex-1 max-w-lg relative">
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
          <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2">
            <button onClick={() => setPosCategory('all')} className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-sm transition ${posCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'}`}>
              ទំនិញទាំងអស់ ({products.length})
            </button>
            {categories.map(cat => (
              <button key={cat.id || cat.name} onClick={() => setPosCategory(cat.name)} className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-sm transition ${posCategory === cat.name ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'}`}>
                {cat.name}
              </button>
            ))}
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
                    <div className="flex justify-between items-center mt-auto">
                      <p className="text-blue-600 font-black text-base">${product.price.toFixed(2)}</p>
                      <span className="text-[10px] text-gray-400 font-bold">{Math.round(product.price * exchangeRate).toLocaleString()} ៛</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ផ្នែកខាងស្តាំ: កន្រ្តកលក់ (Cart Management) */}
        <div className="w-[440px] bg-white border-l border-gray-200 shadow-2xl flex flex-col h-full z-10 shrink-0">
          <div className="p-5 border-b border-gray-100 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 className="font-black text-lg">🛒 កន្រ្តកទំនិញ</h3>
              <p className="text-[11px] text-slate-400">អតិថិជន: {customerName}</p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="bg-blue-600 text-xs font-bold px-2.5 py-1 rounded-full">{posCart.length} មុខ</span>
              {posCart.length > 0 && (
                <button onClick={clearCart} className="text-red-400 hover:text-red-300 text-xs font-bold bg-white/10 px-2.5 py-1 rounded-lg transition">
                  🗑️ សម្អាត
                </button>
              )}
            </div>
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
                        <div className="flex gap-1.5 mt-0.5">
                          {item.size && <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded">Size: {item.size}</span>}
                          {item.color && <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded">{item.color}</span>}
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
              💳 ទូទាត់ប្រាក់ (PAY)
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
                  <p className="text-blue-600 font-black text-base mt-1">
                    ${selectedProductForVariant.price.toFixed(2)} 
                    <span className="text-xs text-gray-400 font-bold ml-2">({Math.round(selectedProductForVariant.price * exchangeRate).toLocaleString()} ៛)</span>
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
                              onClick={() => setModalSelectedColor(col)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition ${
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

                  {/* ២. ជម្រើសទំហំ (Size Options) */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase">👟 ជ្រើសរើសទំហំ (Size)</label>
                      <span className="text-[11px] font-bold text-gray-400">
                        {currentProductVariants.length > 0 ? `មាន ${currentProductVariants.length} ទំហំ` : 'ទំហំទូទៅ'}
                      </span>
                    </div>

                    {currentProductVariants.length === 0 ? (
                      <div className="p-3 bg-gray-50 rounded-2xl text-xs font-bold text-gray-500 text-center">
                        ទំនិញនេះជាទំហំ Free Size / ទូទៅ (ស្តុកសរុប: {selectedProductForVariant.stock_qty})
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
                        {currentProductVariants.map((v, idx) => {
                          const isOutOfStock = v.stock_qty <= 0;
                          const isSelected = modalSelectedSize === v.size;
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => setModalSelectedSize(v.size)}
                              className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center transition ${
                                isOutOfStock
                                  ? 'bg-gray-100 border-gray-200 opacity-40 cursor-not-allowed'
                                  : isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-102'
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
                  >
                    <span>🛒 បញ្ចូលទៅកន្រ្តក</span>
                    <span>•</span>
                    <span>${(selectedProductForVariant.price * modalQty).toFixed(2)}</span>
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
              <div className="text-center mb-6 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-black text-blue-600 uppercase mb-1">ទឹកប្រាក់ត្រូវទូទាត់សរុប</p>
                <p className="text-4xl font-black text-blue-700">${posTotal.toFixed(2)}</p>
                <p className="text-sm font-bold text-gray-500 mt-1">= {posTotalKHR.toLocaleString()} រៀល</p>
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

        {/* ⭐️ MODAL វិក្កយបត្រកម្តៅ (THERMAL RECEIPT 80MM) ⭐️ */}
        {receiptData && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-[320px] rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] font-mono text-black border border-gray-300">
              <div id="receipt-print-area" className="flex-1 overflow-y-auto text-xs pb-4">
                <div className="text-center mb-3">
                  <h2 className="text-2xl font-black uppercase tracking-widest">SABAY LUK</h2>
                  <p className="text-[10px] text-gray-600">Phnom Penh, Cambodia</p>
                  <p className="text-[10px] text-gray-600">Tel: 096 720 5522</p>
                  <div className="border-b border-black border-dashed my-2"></div>
                  <h3 className="font-bold text-xs">OFFICIAL RECEIPT</h3>
                </div>

                <div className="space-y-0.5 mb-2 text-[11px]">
                  <p>Order : <span className="font-bold">{receiptData.orderId}</span></p>
                  <p>Date  : {receiptData.date}</p>
                  <p>Cashier: Admin</p>
                  <p>Customer: {receiptData.customer || 'General'}</p>
                </div>
                
                <div className="border-b border-black border-dashed my-2"></div>
                <table className="w-full mb-2 text-[11px]">
                  <thead>
                    <tr className="border-b border-black border-dashed"><th className="text-left pb-1">Item</th><th className="text-center pb-1">Qty</th><th className="text-right pb-1">Total</th></tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1">
                          <p className="font-bold line-clamp-1">{item.name}</p>
                          {item.size && <span className="text-[9px] text-gray-600">Size: {item.size}</span>}
                        </td>
                        <td className="py-1 text-center">{item.qty}</td>
                        <td className="py-1 text-right">${(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-b border-black border-dashed my-2"></div>
                
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><p>Subtotal</p><p>${receiptData.subtotal.toFixed(2)}</p></div>
                  <div className="flex justify-between"><p>Discount</p><p>-${receiptData.discount.toFixed(2)}</p></div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-black"><p>TOTAL (USD)</p><p>${receiptData.total.toFixed(2)}</p></div>
                  <div className="flex justify-between font-black text-xs text-gray-700"><p>TOTAL (KHR)</p><p>{receiptData.totalKHR.toLocaleString()} ៛</p></div>
                </div>

                <div className="border-b border-black border-dashed my-2"></div>
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between"><p>Paid By</p><p className="font-bold">{receiptData.method}</p></div>
                  {receiptData.method === 'Cash' && (
                    <>
                      <div className="flex justify-between"><p>Tendered</p><p>${Number(receiptData.tendered).toFixed(2)}</p></div>
                      <div className="flex justify-between font-bold"><p>Change</p><p>${receiptData.change.toFixed(2)}</p></div>
                    </>
                  )}
                </div>
                <div className="border-b border-black border-dashed my-3"></div>
                
                <div className="text-center text-[10px]">
                  <p className="font-bold">សូមអរគុណ! សូមអញ្ជើញមកម្តងទៀត</p>
                  <p className="mt-1">ទំនិញដែលទិញរួចមិនអាចប្តូរជាប្រាក់វិញបានទេ</p>
                </div>
              </div>

              <div className="pt-3 flex gap-2 border-t border-gray-200 mt-2">
                <button onClick={() => setReceiptData(null)} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-300">បិទ (Close)</button>
                <button onClick={() => {
                  const content = document.getElementById('receipt-print-area').innerHTML;
                  const printWindow = window.open('', '', 'height=600,width=400');
                  printWindow.document.write(`<html><head><style>body{font-family:monospace; padding:10px; width:72mm; margin:0 auto; color:black;}</style></head><body>${content}</body></html>`);
                  printWindow.document.close();
                  printWindow.print();
                }} className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-xs hover:bg-gray-800">🖨️ Print</button>
              </div>
            </div>
          </div>
        )}
                {/* ⭐️ MODAL បោះពុម្ពបាកូដ & ស្លាកតម្លៃ (BARCODE STICKER MODAL) ⭐️ */}
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

  const CustomersView = () => (
    <div className="animate-in fade-in">
      <h2 className="text-2xl font-bold mb-6">👥 ប្រព័ន្ធអតិថិជន (CRM)</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr><th className="px-6 py-3">ID</th><th className="px-6 py-3">ឈ្មោះ</th><th className="px-6 py-3">ទំនាក់ទំនង</th><th className="px-6 py-3">ថ្ងៃចុះឈ្មោះ</th><th className="px-6 py-3">ចំណាយសរុប</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customersData.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-500">{c.id}</td><td className="px-6 py-4 font-bold">{c.name}</td><td className="px-6 py-4">{c.phone}</td><td className="px-6 py-4">{c.joined}</td><td className="px-6 py-4 font-black text-green-600">${c.totalSpent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const ApiView = () => (
    <div className="animate-in fade-in">
      <h2 className="text-2xl font-bold mb-6">🔌 ការតភ្ជាប់ប្រព័ន្ធ (API & Integrations)</h2>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-2xl">
        <p className="text-gray-600 mb-6 text-sm">កំណត់ការភ្ជាប់ប្រព័ន្ធខាងក្រៅ ដូចជាការទូទាត់ប្រាក់ និងការជូនដំណឹង (Notifications)។</p>

        <div className="space-y-6">
          <div className="p-5 border rounded-xl bg-gray-50">
            <h3 className="font-bold text-gray-900">Telegram Bot API (ជូនដំណឹង)</h3>
            <p className="text-xs text-gray-500 mb-4">ទទួលសារពេលមានអតិថិជនកុម្ម៉ង់ទិញថ្មី។</p>
            <input type="text" placeholder="Bot Token" className="w-full border p-2.5 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <input type="text" placeholder="Chat ID" className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="p-5 border rounded-xl bg-gray-50">
            <h3 className="font-bold text-gray-900">Payment Gateway (ABA Pay)</h3>
            <p className="text-xs text-gray-500 mb-4">កំណត់ Merchant ID សម្រាប់ការទូទាត់។</p>
            <input type="text" placeholder="Merchant ID" className="w-full border p-2.5 rounded-lg mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <input type="text" placeholder="API Key" className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-700 w-full text-sm">
            រក្សាទុកការកំណត់
          </button>
        </div>
      </div>
    </div>
  );

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
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Modern Sleek Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col shadow-2xl z-20 shrink-0 h-full border-r border-slate-800/60">
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400 tracking-wider">SABAY LUK</h2>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-extrabold tracking-widest">Admin Workspace</p>
          </div>
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 text-sm font-medium overflow-y-auto custom-scrollbar">
          <button 
            type="button"
            onClick={() => setActiveTab('pos')} 
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 font-semibold ${activeTab === 'pos' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02] font-bold' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
          >
            <span className="text-lg">💻</span> ប្រព័ន្ធលក់ (POS)
          </button>

          <div className="pt-2 pb-1">
            <div className="h-px bg-slate-800/80 mx-2"></div>
          </div>

          <button 
            type="button"
            onClick={() => setActiveTab('analytics')} 
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 font-semibold ${activeTab === 'analytics' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02] font-bold' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
          >
            <span className="text-lg">📊</span> វិភាគទិន្នន័យ
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('inventory')} 
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 font-semibold ${activeTab === 'inventory' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02] font-bold' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
          >
            <span className="text-lg">🗄️</span> គ្រប់គ្រងស្តុក
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('upload')} 
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 font-semibold ${activeTab === 'upload' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02] font-bold' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
          >
            <span className="text-lg">📤</span> បញ្ចូលទំនិញថ្មី
          </button>

          {/* 🏬 Modern Dropdown: គ្រប់គ្រងមុខហាង (មិនលោតទៅណា និងមិន Refresh) */}
          <div className="space-y-1.5 pt-1">
            <button 
              type="button"
              onClick={() => setIsStoreOpen(!isStoreOpen)} 
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 text-slate-300 hover:bg-slate-800/80 font-bold bg-slate-900/80 border border-slate-800/60 shadow-sm cursor-pointer"
            >
              <span className="flex items-center gap-3.5"><span className="text-lg">🏬</span> គ្រប់គ្រងមុខហាង</span>
              <span className={`text-xs transition-transform duration-300 ${isStoreOpen ? 'rotate-180 text-blue-400' : 'text-slate-500'}`}>▼</span>
            </button>

            {/* Sub-menus ក្រោម Main Tab */}
            {isStoreOpen && (
              <div className="pl-4 space-y-1.5 border-l-2 border-blue-500/80 ml-4 my-2 animate-in slide-in-from-top-2 duration-200">
                <button 
                  type="button"
                  onClick={() => setActiveTab('categories')} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 text-xs font-bold ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                >
                  <span>🏷️</span> ប្រភេទផលិតផល
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('cover')} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 text-xs font-bold ${activeTab === 'cover' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                >
                  <span>🖼️</span> គ្រប់គ្រង Cover ហាង
                </button>
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={() => setActiveTab('orders')} 
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 font-semibold ${activeTab === 'orders' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02] font-bold' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
          >
            <span className="text-lg">🛒</span> ការបញ្ជាទិញ
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('customers')} 
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 font-semibold ${activeTab === 'customers' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02] font-bold' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
          >
            <span className="text-lg">👥</span> អតិថិជន (CRM)
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('api')} 
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 font-semibold ${activeTab === 'api' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02] font-bold' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
          >
            <span className="text-lg">🔌</span> ការតភ្ជាប់ (API)
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('invoice')} 
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 font-semibold ${activeTab === 'invoice' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 scale-[1.02] font-bold' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`}
          >
            <span className="text-lg">🧾</span> កំណត់វិក្កយបត្រ
          </button>

          <div className="pt-3 pb-1">
            <div className="h-px bg-slate-800/80 mx-2"></div>
          </div>

          <a 
            href="/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 transform hover:scale-[1.02] active:scale-95 text-orange-400 bg-gradient-to-r from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 font-bold border border-orange-500/20 shadow-sm"
          >
            <span>🌐</span> ទៅកាន់ទំព័រហាង (UI)
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10 bg-gray-50 h-full relative">
        {activeTab === 'pos' && PosView()}
        {activeTab === 'analytics' && AnalyticsView()}
        {activeTab === 'inventory' && InventoryView()}
        {activeTab === 'upload' && UploadView()}
        {activeTab === 'categories' && CategoryView()}
        {activeTab === 'cover' && CoverManagementView()}
        {activeTab === 'orders' && OrdersView()}
        {activeTab === 'customers' && CustomersView()}
        {activeTab === 'api' && ApiView()}
        {activeTab === 'invoice' && InvoiceSettingsView()} {/* 👈 ត្រូវមានបន្ទាត់នេះ */}
      </main>
    </div>
  );
}