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
  // 🚨 ត្រូវប្រាកដថាបានបន្ថែម State នេះនៅទីនេះ
  const [isPaused, setIsPaused] = useState(false);

  // States សម្រាប់ Auto-Slide Hero Banner (5 Slides)
  const [slides, setSlides] = useState([
    { badge: 'NEW COLLECTION 2027', title: 'ភាពស៊ីវិល័យ និងគុណភាពខ្ពស់សម្រាប់អ្នក', desc: 'ស្វែងរកទំនិញម៉ាកយីហោលំដាប់ប្រណិត ធានាទាំងតម្លៃ និងគុណភាពពិតប្រាកដ។', btnText: 'បញ្ជាទិញឥឡូវនេះ', image: '' }
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const savedCover = localStorage.getItem('sabay_luk_cover');
    if (savedCover) {
      setCoverData(JSON.parse(savedCover));
    }
  }, []);

  // ទាញយក Products និង Categories ពី Supabase ផ្ទាល់
  useEffect(() => {
    async function fetchData() {
      // 1. យក Products ពី Supabase
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) setProducts(prodData);

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
    if (slides.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

  // មុខងារបន្ថែមចូលកន្រ្តក (Add to Cart)
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // ត្រងផលិតផលតាមការស្វែងរក និងប្រភេទ (មានការទប់ស្កាត់រឿងដកឃ្លា ឬអក្សរតូចធំ)
const filteredProducts = products.filter((item) => {
  const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

  const itemCat = (item.category || '').trim().toLowerCase();
  const selectedCat = selectedCategory.trim().toLowerCase();

  // ⭐️️ ប្រើ includes ដើម្បីឱ្យវាទាញទំនិញមកបង្ហាញត្រូវទោះបីឈ្មោះសរសេរស្ਦុះស្ដារបែបណាក៏ដោយ ⭐️
  const matchesCategory = selectedCategory === 'all' || itemCat.includes(selectedCat) || selectedCat.includes(itemCat);

  return matchesSearch && matchesCategory;
});

  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

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
          <div className="flex items-center space-x-6 text-sm font-semibold">
            <div className="cursor-pointer hover:text-[#ff6a00] flex items-center gap-1">👤 គណនី</div>
            <div 
              onClick={() => setIsCartOpen(true)}
              className="cursor-pointer hover:text-[#ff6a00] flex items-center gap-1 relative"
            >
              🛒 កន្រ្តក 
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Hero Banner & Categories Navigation (Balanced Standard Layout) */}
      <section className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Categories Sidebar (បង្ហាញ SVG Icon ត្រូវរហូត មិនចេញអក្សរ) */}
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
              {/* 1. ទំនិញទាំងអស់ */}
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

              {/* 2. Categories ផ្សេងៗ */}
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
            Sabay Luk Store © 2025
          </div>
        </div>

        {/* Modern Auto-Slide Hero Banner ( chiếm 9 ភាគ - សមាមាត្រស្អាតល្អ ) */}
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

      {/* 4. Product Grid (រចនាស្ដង់ដារស្អាតដូចក្នុងរូបភាព) */}
      <section className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏷️</span>
            <h2 className="text-xl font-black text-gray-900">ផលិតផលថ្មី</h2>
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
              // កំណត់ Badge ស្វ័យប្រវត្តិ (ឧ. New Arrival ឬ Best Seller តាមស្តុក ឬលក្ខខណ្ឌ)
              const badgeText = product.stock_qty < 5 ? 'Best Seller' : 'New Arrival';
              const badgeColor = product.stock_qty < 5 ? 'bg-[#c66a27]' : 'bg-slate-900';

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
                  </div>

                  <div className="flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 line-clamp-1 mb-1">{product.name}</h3>
                      
                      {/* បង្ហាញ Size និង Color */}
                      <div className="flex flex-wrap gap-1 mb-2 text-[11px] text-gray-500">
                        {product.size && product.size !== 'N/A' && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">Size: {product.size}</span>
                        )}
                        {product.color && (
                          <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-medium">Color: {product.color}</span>
                        )}
                      </div>

                      <p className="text-[#c66a27] font-black text-lg mb-3">${product.price}</p>
                    </div>

                    {/* ប៊ូតុងបញ្ចូលក្នុងកន្រ្តកពណ៌ Gradient ស្អាត */}
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-full bg-gradient-to-r from-[#312e81] to-[#c66a27] text-white py-2.5 rounded-xl text-xs font-bold hover:opacity-95 transition shadow-sm"
                    >
                      បញ្ចូលក្នុងកន្រ្តក
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black">🛒 កន្រ្តកទំនិញរបស់អ្នក (Shopping Cart)</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-sm">កន្រ្តកទំនិញរបស់អ្នកទទេរ។</div>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg bg-white" />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-gray-500">${item.price} x {item.qty}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateCartQty(item.id, -1)} className="w-5 h-5 bg-white border rounded text-xs font-bold">-</button>
                        <span className="text-xs font-bold">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} className="w-5 h-5 bg-white border rounded text-xs font-bold">+</button>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-[#ff6a00]">${(item.price * item.qty).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 font-bold text-xs">🗑️</button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4">
              <div className="flex justify-between items-center mb-4 text-base font-bold">
                <span>សរុបទឹកប្រាក់ (Total):</span>
                <span className="text-xl text-[#ff6a00]">${totalPrice.toFixed(2)}</span>
              </div>
              <button 
                onClick={() => alert('មុខងារទូទាត់ប្រាក់ (Checkout) នឹងត្រូវបើកដំណើរការជូនដំណឹងតាម Telegram បន្តទៀត!')}
                className="w-full bg-[#ff6a00] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#e65c00] transition shadow-md"
              >
                💳 បញ្ជាទិញឥឡូវនេះ (Checkout)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Footer */}
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
              <span className="bg-gray-100 px-3 py-1 rounded-md font-bold">ABA Pay</span>
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