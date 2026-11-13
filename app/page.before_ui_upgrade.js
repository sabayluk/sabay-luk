'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function CustomerStorefront() {
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

  // States សម្រាប់ Auto-Slide Hero Banner (5 Slides)
  const [slides, setSlides] = useState([
    { badge: 'NEW COLLECTION 2027', title: 'ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់សម្រាប់អ្នក', desc: 'ស្វែងរកទំនិញម៉ាកយីហោលំដាប់ប្រណិត ធានាទាំងតម្លៃ និងគុណភាពពិតប្រាកដ។', btnText: 'បញ្ជាទិញឥឡូវនេះ', image: '' }
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
  const [customerProvince, setCustomerProvince] = useState('ភ្នំពេញ');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'ABA KHQR'
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ⭐️ States សម្រាប់ Order Success Modal (ជោគជ័យ)
  const [orderSuccessModalOpen, setOrderSuccessModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // ⭐️ States សម្រាប់ Track Order (តាមដានការកុម្ម៉ង់)
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResults, setTrackResults] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [hasSearchedTrack, setHasSearchedTrack] = useState(false);

  // ⭐️ មុខងារស្វែងរកតាមដានការកុម្ម៉ង់ (Search Order Tracking)
  const handleSearchTrackOrder = async (queryToSearch) => {
    const q = (typeof queryToSearch === 'string' ? queryToSearch : trackQuery).trim();
    if (!q) {
      alert('សូមបញ្ចូលលេខទូរស័ព្ទ ឬលេខកូដ Order ID!');
      return;
    }

    setIsTracking(true);
    setHasSearchedTrack(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`order_id.ilike.%${q}%,phone.ilike.%${q}%,phone_number.ilike.%${q}%`)
        .order('id', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrackResults(data || []);
    } catch (err) {
      console.error('Track order error:', err);
      alert('មានបញ្ហាក្នុងការស្វែងរក៖ ' + err.message);
    } finally {
      setIsTracking(false);
    }
  };

  // Helper គណនាដំណាក់កាលនៃ Status
  const getStatusStep = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('cancel') || s.includes('បោះបង់')) return -1;
    if (s.includes('complete') || s.includes('deliver') || s.includes('ជោគជ័យ')) return 3;
    if (s.includes('ship') || s.includes('out') || s.includes('កំពុងដឹក')) return 2;
    if (s.includes('prep') || s.includes('pack') || s.includes('កំពុងរៀបចំ') || s.includes('កំពុងវេច')) return 1;
    return 0; // Pending / ទទួលបានការកុម្ម៉ង់
  };

  const getStatusBadge = (status) => {
    const step = getStatusStep(status);
    if (step === -1) return { text: 'បានបោះបង់ (Cancelled)', bg: 'bg-red-50 text-red-600 border-red-200' };
    if (step === 3) return { text: 'ដឹកជញ្ជូនជោគជ័យ (Delivered)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (step === 2) return { text: 'កំពុងដឹកជញ្ជូន (Out for Delivery)', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (step === 1) return { text: 'កំពុងរៀបចំទំនិញ (Preparing)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { text: 'ទទួលបានការកុម្ម៉ង់ (Pending)', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
  };

  useEffect(() => {
    const savedCover = localStorage.getItem('sabay_luk_cover');
    if (savedCover) {
      setCoverData(JSON.parse(savedCover));
    }
  }, []);

  // ទាញយក Products និង Categories ពី Supabase ផ្ទាល់
  const fetchProducts = async () => {
    const { data: prodData } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (prodData) setProducts(prodData);
  };

  useEffect(() => {
    async function fetchData() {
      // 1. យក Products
      await fetchProducts();

      // 2. យក Categories ពី Supabase Database ផ្ទាល់
      const { data: catData, error: catError } = await supabase.from('categories').select('*');
      if (!catError && catData && catData.length > 0) {
        setCategories(catData);
      } else {
        // Fallback បើគ្មានទិន្នន័យ
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

  // ទាញយក Slides ពី Database ផ្ទាល់ (Table: sliders) ដើម្បីបង្ហាញអតិថិជន
  useEffect(() => {
    async function fetchStorefrontSlides() {
      const { data, error } = await supabase.from('sliders').select('*').order('id', { ascending: true });
      if (data && data.length > 0) {
        const loadedSlides = data.map(slide => ({
          badge: slide.badge || '',
          title: slide.title || '',
          desc: slide.description || '',
          btnText: slide.btn_text || '',
          image: slide.image_url || ''
        }));
        setSlides(loadedSlides); 
      }
    }
    fetchStorefrontSlides();
  }, []);

  // Auto-slide រៀងរាល់ ៤ វិនាទី
  useEffect(() => {
    if (slides.length > 0 && !isPaused) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [slides.length, isPaused]);

  // ⭐️ បើក Modal ជ្រើសរើសទំហំ និងពណ៌ (Handle Click Add To Cart)
  const handleAddToCartClick = async (product) => {
    const isShoeOrHasSize = 
      (product.category && product.category.includes('ស្បែកជើង')) || 
      (product.size && product.size !== 'N/A' && product.size.trim() !== '');

    if (isShoeOrHasSize) {
      setSelectedProductForVariant(product);
      setModalQty(1);
      setModalSelectedColor(product.color || '');
      setLoadingVariants(true);
      setVariantModalOpen(true);

      try {
        // ១. សាកល្បងទាញពី product_variants
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
          // ២. Smart Fallback បើទំនិញចាស់មិនទាន់មានក្នុង product_variants
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
          setModalSelectedSize(firstAvailable.size);
          if (firstAvailable.color) setModalSelectedColor(firstAvailable.color);
        }
      } catch (err) {
        console.error('Error loading variants:', err);
      } finally {
        setLoadingVariants(false);
      }
    } else {
      // សម្រាប់ទំនិញទូទៅដែលគ្មាន Size បន្ថែមចូល Cart ផ្ទាល់
      directAddToCart(product);
    }
  };

  // បន្ថែមទំនិញផ្ទាល់ចូលកន្ត្រក (គ្មាន Size)
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

  // បញ្ជាក់ការជ្រើសរើស Size & Color ចូលក្នុងកន្ត្រក
  const handleConfirmVariantToCart = () => {
    if (!selectedProductForVariant) return;

    // រកមើល Variant ដែលបានរើស
    const selectedVariant = currentProductVariants.find(v => 
      v.size === modalSelectedSize && (!modalSelectedColor || v.color === modalSelectedColor || !v.color)
    ) || currentProductVariants.find(v => v.size === modalSelectedSize);

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

  // កែប្រែចំនួនក្នុង Cart
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

  // ត្រងផលិតផលតាមការស្វែងរក និងប្រភេទ
  const filteredProducts = products.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const itemCat = (item.category || '').trim().toLowerCase();
    const selectedCat = selectedCategory.trim().toLowerCase();
    const matchesCategory = selectedCategory === 'all' || itemCat.includes(selectedCat) || selectedCat.includes(itemCat);
    return matchesSearch && matchesCategory;
  });

  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const totalRiel = Math.round(totalPrice * 4100);

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
      for (const item of cart) {
        // កាត់ចេញពី variant បើមាន
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

        // កាត់ចេញពី products ស្តុកសរុប
        const { data: pData } = await supabase
          .from('products')
          .select('stock_qty')
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

        // កត់ត្រាចូល stock_movements (Audit Log)
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

      // ២. រក្សាទុកចូលតារាង orders ក្នុង Supabase
      const fullAddress = `${customerProvince} - ${customerAddress.trim()}`;
      const customerContact = customerPhone.trim();

      const orderPayload = {
        order_id: generatedOrderId,
        customer_name: customerName.trim(),
        phone: customerContact,
        phone_number: customerContact,
        address: fullAddress,
        delivery_address: fullAddress,
        total_amount: totalPrice,
        subtotal: totalPrice,
        discount: 0,
        payment_method: paymentMethod,
        status: 'Pending',
        order_type: 'ONLINE',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty,
          size: item.size || '',
          color: item.color || '',
          variantId: item.variantId || null,
          image_url: item.image_url || ''
        }))
      };

      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderError) {
        if (orderError.code === '42501' || orderError.message?.includes('row-level security')) {
          throw new Error('តារាង orders ក្នុង Supabase មិនទាន់បានបើកសិទ្ធិ RLS Policy នៅឡើយទេ។ សូម Run SQL Policy ក្នុង Supabase SQL Editor!');
        }
        throw orderError;
      }

      // រៀបចំទិន្នន័យសម្រាប់បង្ហាញផ្ទាំងជោគជ័យ
      setCompletedOrder({
        ...orderPayload,
        customer: customerName.trim(),
        total: totalPrice,
        payment: paymentMethod,
        created_at: new Date().toISOString()
      });

      // សម្អាតកន្ត្រក និងបិទ Modal Checkout
      setCart([]);
      setCheckoutModalOpen(false);
      setIsCartOpen(false);
      setOrderSuccessModalOpen(true);

      // ទាញយកស្តុកទំនិញថ្មីមក Update លើ UI ភ្លាមៗ
      fetchProducts();

    } catch (err) {
      console.error('Checkout error:', err);
      alert('❌ មានបញ្ហាក្នុងការបញ្ជាទិញ: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* 1. Top Announcement Bar */}
      <div className="bg-[#ff6a00] text-white text-xs py-2 px-4 text-center font-medium">
        🔥 ស្វាគមន៍មកកាន់ Sabay Luk - ដឹកជញ្ជូនឥតគិតថ្លៃទូទាំងប្រទេស | 📞 ទំនាក់ទំនងទូរសព្ទ: 0967205522
      </div>

      {/* 2. Main Header & Search */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-200 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="text-2xl font-black text-[#ff6a00] tracking-wider cursor-pointer">
            SABAY LUK
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl flex">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកស្បែកជើង នាឡិកា កាបូប ខ្សែក្រវ៉ាត់..." 
              className="w-full border-2 border-[#ff6a00] rounded-l-xl px-4 py-2 text-sm focus:outline-none"
            />
            <button className="bg-[#ff6a00] text-white px-6 py-2 rounded-r-xl font-bold text-sm hover:bg-[#e65c00] transition">
              ស្វែងរក
            </button>
          </div>

          {/* User & Cart Actions */}
          <div className="flex items-center space-x-3 text-sm font-semibold">
            {/* ប៊ូតុង តាមដានការកុម្ម៉ង់ */}
            <button 
              onClick={() => {
                setTrackModalOpen(true);
              }}
              className="cursor-pointer hover:bg-orange-50 text-gray-700 hover:text-[#ff6a00] flex items-center gap-1.5 bg-gray-100 px-3 py-2 rounded-xl transition text-xs font-bold border border-gray-200"
            >
              <span>🔍</span>
              <span>តាមដានការកុម្ម៉ង់</span>
            </button>

            <a href="/admin/dashboard" className="cursor-pointer hover:text-[#ff6a00] flex items-center gap-1 text-gray-700 text-xs font-bold">
              ⚙️ Admin
            </a>

            <div 
              onClick={() => setIsCartOpen(true)}
              className="cursor-pointer hover:text-[#ff6a00] flex items-center gap-1.5 relative bg-orange-50 px-3.5 py-2 rounded-xl text-[#ff6a00] text-xs font-bold"
            >
              🛒 <span className="font-bold">កន្រ្តក</span>
              <span className="bg-red-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Hero Banner & Categories Navigation */}
      <section className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Categories Sidebar */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="w-5 h-5 text-gray-800">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
                <h3 className="font-extrabold text-sm text-gray-900 tracking-wide">
                  ប្រភេទផលិតផល
                </h3>
              </div>
              <span className="text-gray-400 text-xs font-bold">⌃</span>
            </div>
            
            <ul className="space-y-2 text-sm font-semibold">
              <li>
                <button 
                  onClick={() => setSelectedCategory('all')} 
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.01] active:scale-95 ${selectedCategory === 'all' ? 'bg-gradient-to-r from-[#8a5235] to-[#c66a27] text-white shadow-md font-bold' : 'text-gray-700 bg-gray-50/60 hover:bg-gray-100'}`}
                >
                  <span className="flex items-center gap-3">
                    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                    <span>ទំនិញទាំងអស់</span>
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedCategory === 'all' ? 'bg-white/25 text-white' : 'bg-gray-200/70 text-gray-600'}`}>
                    {products.length}
                  </span>
                </button>
              </li>

              {categories.map((cat) => {
                const count = products.filter(p => {
                  const pCat = (p.category || '').trim().toLowerCase();
                  const catName = cat.name.trim().toLowerCase();
                  return pCat.includes(catName) || catName.includes(pCat);
                }).length;
                const iconType = cat.icon || '';
                
                let iconSvg = <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>;

                if (iconType === 'shoe' || cat.name.includes('ស្បែកជើង')) {
                  iconSvg = <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.2 14.3l-2.6-6.5a2 2 0 00-1.9-1.3H11l-3 3-4.5 1A2 2 0 002 12.5v3A2.5 2.5 0 004.5 18h13a2.5 2.5 0 002.5-2.5 2.5 2.5 0 00.2-1.2z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M2 14.5h18.5"></path><path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5l-4-1.5"></path></svg>;
                } else if (iconType === 'heel' || cat.name.includes('កែង')) {
                  iconSvg = <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-3-7a2 2 0 00-1.8-1.2H12l-4 3-3 1.5A2 2 0 003.5 14L4 18h16.5a1 1 0 00.5-2zM15 8l2 8M6 18v3"></path></svg>;
                } else if (iconType === 'watch' || cat.name.includes('នាឡិកា')) {
                  iconSvg = <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><rect x="7" y="5" width="10" height="14" rx="3" ry="3"></rect><path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6M9 22h6M17 12h1.5M12 9v3l1.5 1.5"></path></svg>;
                } else if (iconType === 'bag' || cat.name.includes('កាបូប')) {
                  iconSvg = <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2"></path><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h.01M15 14h.01"></path></svg>;
                } else if (iconType === 'belt' || cat.name.includes('ខ្សែក្រវ៉ាត់')) {
                  iconSvg = <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 10c-1-3-4-4-7-4S5 7 5 10c0 2.5 2 4 5 4s5-1.5 5-4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M5 10v4c0 3 3 4 7 4s7-1 7-4v-4"></path><path strokeLinecap="round" strokeLinejoin="round" d="M12 10a2 2 0 100-4 2 2 0 000 4z"></path></svg>;
                } else if (iconType === 'shirt' || cat.name.includes('សម្លៀកបំពាក់')) {
                  iconSvg = <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 1.89v1.15a2 2 0 001.62 1.96l1.38.23V20a2 2 0 002 2h11a2 2 0 002-2V8.69l1.38-.23a2 2 0 001.62-1.96V5.35a2 2 0 00-1.34-1.89z"></path></svg>;
                } else if (iconType === 'box' || cat.name.includes('ប្រអប់')) {
                  iconSvg = <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>;
                }

                return (
                  <li key={cat.id || cat.name}>
                    <button 
                      onClick={() => setSelectedCategory(cat.name)} 
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 transform hover:scale-[1.01] active:scale-95 ${selectedCategory === cat.name ? 'bg-gradient-to-r from-[#8a5235] to-[#c66a27] text-white shadow-md font-bold' : 'text-gray-700 bg-gray-50/60 hover:bg-gray-100'}`}
                    >
                      <span className="flex items-center gap-3">
                        {iconSvg}
                        <span>{cat.name}</span>
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${selectedCategory === cat.name ? 'bg-white/25 text-white' : 'bg-gray-200/70 text-gray-600'}`}>
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          
          <div className="mt-8 pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center font-medium">
            Sabay Luk Store © 2026
          </div>
        </div>

        {/* Hero Banner Auto-Slide */}
        <div 
          className="lg:col-span-9 rounded-2xl relative overflow-hidden min-h-[360px] shadow-lg bg-white flex items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out bg-cover bg-center flex flex-col justify-center p-8 md:p-12 text-white ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              style={{ 
                backgroundImage: `url(${slide.image || ''})` 
              }}
            >
              {slide.badge && (
                <span className="bg-[#ff6a00] text-xs font-bold px-3.5 py-1.5 rounded-lg w-max uppercase tracking-wider mb-3 shadow-lg">
                  {slide.badge}
                </span>
              )}
              
              {slide.title && (
                <h1 className="text-2xl md:text-4xl font-black mb-3 leading-tight max-w-xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] text-white">
                  {slide.title}
                </h1>
              )}
              
              {slide.desc && (
                <p className="text-white text-sm md:text-base max-w-lg mb-5 leading-relaxed font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {slide.desc}
                </p>
              )}
              
              {slide.btnText && (
                <button className="bg-[#ff6a00] text-white px-6 py-3 rounded-xl font-bold text-sm md:text-base w-max hover:bg-[#e65c00] transition shadow-xl hover:scale-105">
                  {slide.btnText}
                </button>
              )}
            </div>
          ))}

          {/* Dots Indicators */}
          <div className="absolute bottom-4 right-6 z-20 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`transition-all duration-300 rounded-full shadow-md ${currentSlide === idx ? 'w-8 h-2.5 bg-[#ff6a00]' : 'w-2.5 h-2.5 bg-white/80 hover:bg-white'}`}
              />
            ))}
          </div>
        </div>

      </section>

      {/* 4. Product Grid */}
      <section className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏷️</span>
            <h2 className="text-xl font-black text-gray-900">ផលិតផលទាន់សម័យ</h2>
          </div>
          <span className="text-xs font-bold text-gray-500">បង្ហាញចំនួន ({filteredProducts.length}) មុខទំនិញ</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-400 font-bold">
            រកមិនឃើញផលិតផលដែលអ្នកចង់បានទេ។
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock_qty <= 0;
              const badgeText = isOutOfStock ? 'ដាច់ស្តុក' : (product.stock_qty < 5 ? 'ជិតអស់ស្តុក' : 'New Arrival');
              const badgeColor = isOutOfStock ? 'bg-red-600' : (product.stock_qty < 5 ? 'bg-[#c66a27]' : 'bg-slate-900');

              return (
                <div key={product.id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-xl transition-all duration-300 flex flex-col group relative">
                  
                  {/* រូបភាព និង Badge */}
                  <div className="aspect-square bg-gray-100 rounded-xl mb-3 overflow-hidden relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">គ្មានរូបភាព</div>
                    )}
                    
                    {/* Badge ខាងលើ */}
                    <span className={`absolute top-2.5 right-2.5 ${badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider`}>
                      {badgeText}
                    </span>

                    {/* Stock Tag ខាងក្រោម */}
                    <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-medium">
                      ស្តុក: {product.stock_qty || 0}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 line-clamp-1 mb-1">{product.name}</h3>
                      
                      {/* បង្ហាញ Size និង Color */}
                      <div className="flex flex-wrap gap-1 mb-2 text-[11px] text-gray-500">
                        {product.size && product.size !== 'N/A' && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">Size: {product.size}</span>
                        )}
                        {product.color && (
                          <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-medium">Color: {product.color}</span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-[#c66a27] font-black text-lg">${product.price}</span>
                        <span className="text-gray-400 text-xs font-semibold">({(product.price * 4100).toLocaleString()} ៛)</span>
                      </div>
                    </div>

                    {/* ប៊ូតុងបញ្ចូលក្នុងកន្រ្តក */}
                    <button 
                      onClick={() => handleAddToCartClick(product)}
                      disabled={isOutOfStock}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 ${
                        isOutOfStock 
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-[#1e1b4b] to-[#c66a27] text-white hover:opacity-95 active:scale-95'
                      }`}
                    >
                      <span>🛒</span>
                      <span>{isOutOfStock ? 'ដាច់ស្តុកហើយ' : 'បញ្ចូលក្នុងកន្រ្តក'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ⭐️ 5. MODAL ជ្រើសរើស SIZE & COLOR នៅមុខហាង (STOREFRONT VARIANT SELECTOR) ⭐️ */}
      {variantModalOpen && selectedProductForVariant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* ប៊ូតុងបិទ */}
            <button 
              onClick={() => setVariantModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold"
            >
              ✕
            </button>

            {/* បឋមកថា និងព័ត៌មានទំនិញ */}
            <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
              <img 
                src={selectedProductForVariant.image_url || '/placeholder.png'} 
                alt={selectedProductForVariant.name}
                className="w-20 h-20 object-cover rounded-2xl bg-gray-100 border border-gray-200"
              />
              <div className="flex-1">
                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md uppercase">
                  {selectedProductForVariant.category || 'ម៉ូតស្បែកជើង'}
                </span>
                <h3 className="font-black text-base text-gray-900 mt-1 leading-snug">
                  {selectedProductForVariant.name}
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-[#c66a27] font-black text-xl">${selectedProductForVariant.price}</span>
                  <span className="text-gray-400 text-xs font-bold">({(selectedProductForVariant.price * 4100).toLocaleString()} ៛)</span>
                </div>
              </div>
            </div>

            {loadingVariants ? (
              <div className="py-12 text-center text-gray-400 font-bold flex flex-col items-center gap-2">
                <div className="w-7 h-7 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <span>កំពុងផ្ទុកជម្រើស Size & Color...</span>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {/* 1. ជ្រើសរើសពណ៌ (Colors) */}
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
                            onClick={() => setModalSelectedColor(trimmedClr)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                              isSelected 
                                ? 'bg-[#c66a27] text-white border-[#c66a27] shadow-sm scale-105' 
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

                {/* 2. ជ្រើសរើសទំហំ (Sizes) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                      👟 ជ្រើសរើសទំហំ (Select Size): <span className="text-orange-600 font-black">{modalSelectedSize || 'មិនទាន់រើស'}</span>
                    </label>
                    <span className="text-[11px] text-gray-400 font-medium">ចុចលើ Size ដែលត្រូវជើង</span>
                  </div>

                  {currentProductVariants.length === 0 ? (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 text-center">
                      ទំនិញនេះជា Free Size (ទំហំស្តង់ដារ)
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {currentProductVariants.map((v, idx) => {
                        const isSelected = modalSelectedSize === v.size;
                        const isOut = v.stock_qty <= 0;

                        return (
                          <button
                            key={v.id || idx}
                            type="button"
                            disabled={isOut}
                            onClick={() => {
                              setModalSelectedSize(v.size);
                              if (v.color) setModalSelectedColor(v.color);
                            }}
                            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                              isSelected
                                ? 'border-[#c66a27] bg-orange-50/80 text-[#c66a27] font-black ring-2 ring-[#c66a27] shadow-xs'
                                : isOut
                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                : 'border-gray-200 bg-white hover:border-orange-300 text-gray-800 font-bold'
                            }`}
                          >
                            <span className="text-sm font-black">{v.size}</span>
                            <span className="text-[10px] mt-0.5">
                              {isOut ? 'អស់ស្តុក' : `នៅសល់: ${v.stock_qty}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. ជ្រើសរើសចំនួន (Quantity) */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                  <div>
                    <span className="block text-xs font-extrabold text-gray-800">ចំនួនកុម្ម៉ង់ (Quantity)</span>
                    <span className="text-[11px] text-gray-500">តម្លៃសរុប: ${(selectedProductForVariant.price * modalQty).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-gray-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setModalQty(prev => Math.max(1, prev - 1))}
                      className="w-7 h-7 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
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
                      className="w-7 h-7 flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* ប៊ូតុងដាក់ចូលកន្ត្រក */}
                <button
                  type="button"
                  onClick={handleConfirmVariantToCart}
                  className="w-full bg-gradient-to-r from-[#1e1b4b] to-[#c66a27] text-white py-3.5 rounded-2xl font-black text-sm hover:opacity-95 active:scale-98 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <span>🛒</span>
                  <span>បញ្ចូលក្នុងកន្ត្រក • ${(selectedProductForVariant.price * modalQty).toFixed(2)}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Cart Drawer (កន្រ្តកទំនិញស្តង់ដារ) */}
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

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
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
                      
                      {/* បង្ហាញ Size & Color Tags */}
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
                        <span className="text-xs font-black text-[#c66a27]">${item.price}</span>
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

            {/* បាតកន្ត្រក និងប៊ូតុងទៅកាន់ Checkout */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-gray-100 mt-3 space-y-3">
                <div className="bg-emerald-50 text-emerald-700 text-[11px] p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                  <span>🚚</span>
                  <span>ប្រូម៉ូសិនពិសេស៖ ដឹកជញ្ជូនឥតគិតថ្លៃគ្រប់ទីកន្លែង!</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>សរុប (USD):</span>
                    <span className="font-bold text-gray-800">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>សរុបប្រាក់រៀល:</span>
                    <span className="font-bold text-gray-800">{totalRiel.toLocaleString()} ៛</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-black text-gray-900 pt-1 border-t border-dashed border-gray-200">
                    <span>ទឹកប្រាក់ត្រូវទូទាត់:</span>
                    <span className="text-xl text-[#c66a27]">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutModalOpen(true);
                  }}
                  className="w-full bg-[#ff6a00] text-white py-3.5 rounded-xl font-black text-sm hover:bg-[#e65c00] active:scale-98 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <span>💳</span>
                  <span>បន្តទៅការកុម្ម៉ង់ (Proceed to Checkout)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⭐️ 7. FULL-OPTION CHECKOUT MODAL (ផ្ទាំងបញ្ជាទិញទំនិញស្ដង់ដារ) ⭐️ */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[94vh] overflow-y-auto">
            {/* ប៊ូតុងបិទ */}
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
              {/* ១. ព័ត៌មានអ្នកទទួល */}
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
                </div>
              </div>

              {/* ២. វិធីសាស្ត្រទូទាត់ប្រាក់ (Payment Methods) */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💳</span> ជ្រើសរើសវិធីសាស្ត្រទូទាត់ប្រាក់
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* COD */}
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

                  {/* ABA KHQR */}
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

                {paymentMethod === 'ABA KHQR' && (
                  <div className="bg-white p-3.5 rounded-xl border border-blue-100 flex items-center gap-3 mt-2 animate-in fade-in">
                    <div className="w-12 h-12 bg-blue-900 text-white font-black text-xs rounded-xl flex items-center justify-center flex-shrink-0">
                      KHQR
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-gray-900">ធនាគារ ABA: 096 720 5522 (SABAY LUK)</p>
                      <p className="text-[11px] text-gray-500">លោកអ្នកអាចផ្ទេរប្រាក់មកកាន់លេខខាងលើ ឬស្កេន QR ពេលអ្នកដឹកទាក់ទងមក។</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ៣. សង្ខេបបញ្ជីទំនិញ (Order Summary) */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-2">
                  <span>ទំនិញសរុប ({cart.length} មុខ):</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 mb-2">
                  <span>ថ្លៃដឹកជញ្ជូន:</span>
                  <span>ឥតគិតថ្លៃ (Free)</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
                  <span className="font-black text-sm text-gray-900">ទឹកប្រាក់សរុប (Total):</span>
                  <div className="text-right">
                    <span className="font-black text-xl text-[#c66a27]">${totalPrice.toFixed(2)}</span>
                    <span className="block text-[11px] font-bold text-gray-500">({totalRiel.toLocaleString()} ៛)</span>
                  </div>
                </div>
              </div>

              {/* ប៊ូតុងបញ្ជាក់កុម្ម៉ង់ */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full bg-[#ff6a00] text-white py-4 rounded-2xl font-black text-sm hover:bg-[#e65c00] active:scale-98 transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
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

      {/* ⭐️ 8. ORDER SUCCESS MODAL (ផ្ទាំងជូនដំណឹងកុម្ម៉ង់ជោគជ័យ) ⭐️ */}
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
              <div className="flex justify-between pt-1.5 border-t border-gray-200 text-sm font-black">
                <span className="text-gray-900">សរុបទឹកប្រាក់:</span>
                <span className="text-[#c66a27]">${completedOrder.total.toFixed(2)} ({(completedOrder.total * 4100).toLocaleString()} ៛)</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mb-4">
              📞 ក្រុមការងារយើងខ្ញុំនឹងទាក់ទងទៅកាន់លេខ {completedOrder.phone} របស់អ្នក ដើម្បីបញ្ជាក់ការដឹកជញ្ជូនក្នុងពេលឆាប់ៗនេះ។
            </p>

            <button
              onClick={() => {
                const oid = completedOrder.order_id;
                setOrderSuccessModalOpen(false);
                setCompletedOrder(null);
                setTrackQuery(oid);
                setTrackModalOpen(true);
                handleSearchTrackOrder(oid);
              }}
              className="w-full bg-orange-50 hover:bg-orange-100 text-[#ff6a00] border border-orange-200 py-3 rounded-xl font-bold text-xs transition mb-2.5 flex items-center justify-center gap-1.5"
            >
              <span>🔍</span>
              <span>តាមដានស្ថានភាពការកុម្ម៉ង់នេះ</span>
            </button>

            <button
              onClick={() => {
                setOrderSuccessModalOpen(false);
                setCompletedOrder(null);
              }}
              className="w-full bg-[#1e1b4b] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#2d2975] transition shadow-md"
            >
              ទិញទំនិញបន្ត (Continue Shopping)
            </button>
          </div>
        </div>
      )}

      {/* ⭐️ 9. MODAL តាមដានការកុម្ម៉ង់ (TRACK ORDER MODAL) ⭐️ */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-orange-50 text-[#ff6a00] rounded-xl flex items-center justify-center text-xl font-bold">
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

            {/* Search Box */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearchTrackOrder(); }} className="mb-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    placeholder="បញ្ចូលលេខទូរស័ព្ទ (ឧ. 010723080) ឬ Order ID (ឧ. ONL-123456)..."
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-[#ff6a00] focus:bg-white rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium focus:outline-none transition pl-10"
                  />
                  <span className="absolute left-3.5 top-3.5 text-gray-400 text-sm">🔎</span>
                </div>
                <button
                  type="submit"
                  disabled={isTracking}
                  className="bg-[#ff6a00] hover:bg-[#e65c00] active:scale-95 text-white px-5 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
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

            {/* Results Area (Scrollable) */}
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

                  const steps = [
                    { title: 'ទទួលបានការកុម្ម៉ង់', desc: 'Order Placed', icon: '📝' },
                    { title: 'កំពុងរៀបចំទំនិញ', desc: 'Preparing', icon: '📦' },
                    { title: 'កំពុងដឹកជញ្ជូន', desc: 'Out for Delivery', icon: '🚚' },
                    { title: 'ដឹកជញ្ជូនជោគជ័យ', desc: 'Delivered', icon: '✅' },
                  ];

                  return (
                    <div key={order.id} className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-xs space-y-4 hover:border-orange-200 transition">
                      
                      {/* Order Head */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-[#ff6a00]">{order.order_id}</span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                              {badge.text}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 font-medium">
                            កាលបរិច្ឆេទ: {order.created_at ? new Date(order.created_at).toLocaleString('km-KH') : 'ថ្មីៗ'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-[#c66a27]">
                            ${parseFloat(order.total_amount || 0).toFixed(2)}
                          </span>
                          <span className="block text-[10px] font-bold text-gray-400">
                            ({(parseFloat(order.total_amount || 0) * 4100).toLocaleString()} ៛)
                          </span>
                        </div>
                      </div>

                      {/* Visual Stepper Bar */}
                      {!isCancelled ? (
                        <div className="py-2 px-1">
                          <div className="grid grid-cols-4 relative gap-1">
                            {/* Connecting line */}
                            <div className="absolute top-4 left-6 right-6 h-1 bg-gray-100 -z-0">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500"
                                style={{ 
                                  width: currentStep === 0 ? '12%' : currentStep === 1 ? '40%' : currentStep === 2 ? '75%' : '100%' 
                                }}
                              />
                            </div>

                            {steps.map((st, idx) => {
                              const isPassed = idx <= currentStep;
                              const isCurrent = idx === currentStep;

                              return (
                                <div key={idx} className="flex flex-col items-center text-center z-10">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 shadow-xs ${
                                    isCurrent 
                                      ? 'bg-[#ff6a00] text-white ring-4 ring-orange-100 scale-110 animate-pulse'
                                      : isPassed
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-white border-2 border-gray-200 text-gray-400'
                                  }`}>
                                    {isPassed && !isCurrent ? '✓' : st.icon}
                                  </div>
                                  <span className={`text-[11px] font-black mt-2 leading-tight ${
                                    isCurrent ? 'text-[#ff6a00]' : isPassed ? 'text-gray-800' : 'text-gray-400'
                                  }`}>
                                    {st.title}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-medium hidden sm:block">
                                    {st.desc}
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

                      {/* Customer & Address Details */}
                      <div className="bg-gray-50/80 rounded-2xl p-3.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600">
                        <div>
                          <span className="text-gray-400 block text-[10px] font-bold">អ្នកទទួល:</span>
                          <span className="font-bold text-gray-900">{order.customer_name}</span> ({order.phone_number || order.phone})
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] font-bold">វិធីសាស្ត្រទូទាត់:</span>
                          <span className="font-bold text-gray-900">{order.payment_method || 'COD'}</span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-gray-400 block text-[10px] font-bold">អាសយដ្ឋានដឹកជញ្ជូន:</span>
                          <span className="font-bold text-gray-800">{order.delivery_address || order.address}</span>
                        </div>
                      </div>

                      {/* Items List */}
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

            {/* Footer Support */}
            <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>សេវាកម្មដឹកជញ្ជូនរហ័ស ២៥ ខេត្ត/ក្រុង</span>
              <a href="tel:0967205522" className="text-[#ff6a00] font-bold hover:underline">
                📞 Hotline: 096 720 5522
              </a>
            </div>

          </div>
        </div>
      )}

      {/* 9. Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-10 px-6 text-sm text-gray-500">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-xl font-black text-[#ff6a00] mb-3">SABAY LUK</div>
            <p className="text-xs leading-relaxed mb-3">ប្រព័ន្ធលក់ទំនិញអនឡាញទំនើប និងគួរឱ្យទុកចិត្តបំផុត។</p>
            <p className="text-xs font-bold text-gray-800">📞 លេខទូរសព្ទទំនាក់ទំនង: 0967205522</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-3 text-xs uppercase">ទិដ្ឋភាពទូទៅ</h4>
            <p className="text-xs hover:text-[#ff6a00] cursor-pointer mb-2">អំពីយើង</p>
            <p className="text-xs hover:text-[#ff6a00] cursor-pointer">គោលការណ៍ដឹកជញ្ជូន</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-3 text-xs uppercase">ជំនួយ និងសេវាកម្ម</h4>
            <p className="text-xs hover:text-[#ff6a00] cursor-pointer mb-2">មជ្ឈមណ្ឌលជំនួយ</p>
            <p className="text-xs hover:text-[#ff6a00] cursor-pointer">ទំនាក់ទំនងមកយើង</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-3 text-xs uppercase">ទូទាត់ប្រាក់សុវត្ថិភាព</h4>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="bg-gray-100 px-3 py-1 rounded-md font-bold">ABA KHQR</span>
              <span className="bg-gray-100 px-3 py-1 rounded-md font-bold">COD</span>
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          © 2026 Sabay Luk Store. រក្សាសិទ្ធិគ្រប់យ៉ាង។
        </div>
      </footer>

    </div>
  );
}
