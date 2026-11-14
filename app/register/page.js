'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerNewStore, generateSlug, STORE_PLANS } from '../../lib/stores';

export default function RegisterStorePage() {
  const router = useRouter();

  // Form states
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [businessType, setBusinessType] = useState('shoes_fashion');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [address, setAddress] = useState('');
  
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [pin, setPin] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('FREE');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle store name change -> auto update slug
  const handleStoreNameChange = (val) => {
    setStoreName(val);
    if (!isSlugEdited) {
      setStoreSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!storeName.trim()) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះហាងរបស់អ្នក!');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះរបស់ម្ចាស់ហាង!');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('សូមបញ្ចូលលេខទូរស័ព្ទសម្រាប់ទាក់ទង!');
      return;
    }
    if (!ownerUsername.trim()) {
      setErrorMsg('សូមកំណត់ Username សម្រាប់ចូលប្រើ!');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setErrorMsg('លេខសម្ងាត់ PIN ត្រូវមានយ៉ាងតិច ៤ ខ្ទង់!');
      return;
    }

    setLoading(true);

    try {
      const newStore = await registerNewStore({
        name: storeName.trim(),
        slug: storeSlug.trim() || generateSlug(storeName),
        business_type: businessType,
        phone: phone.trim(),
        telegram: telegram.trim(),
        address: address.trim() || 'រាជធានីភ្នំពេញ',
        owner_name: ownerName.trim(),
        owner_username: ownerUsername.trim().toLowerCase(),
        pin: pin.trim(),
        plan: selectedPlan
      });

      setSuccessMsg(`🎉 អបអរសាទរ! ហាង "${newStore.name}" ត្រូវបានបង្កើតជោគជ័យ!`);
      
      // Auto-login session for owner
      if (typeof window !== 'undefined') {
        localStorage.setItem('sabay_admin_authenticated', 'true');
        localStorage.removeItem('sabay_admin_logged_out');
        const ownerStaff = {
          id: `STAFF-OWNER-${newStore.id.slice(-4)}`,
          name: newStore.owner_name,
          username: newStore.owner_username,
          pin: newStore.pin,
          role: 'ADMIN',
          roleLabel: 'ម្ចាស់ហាង (Super Admin)',
          phone: newStore.phone,
          avatar: '👑',
          color: 'from-amber-500 to-orange-600',
          active: true,
          store_id: newStore.id
        };
        localStorage.setItem('sabay_active_staff', JSON.stringify(ownerStaff));
      }

      setTimeout(() => {
        router.push(`/admin/dashboard?store=${newStore.slug}`);
      }, 1200);

    } catch (err) {
      setErrorMsg(err.message || 'មានបញ្ហាបន្តិចបន្តួចពេលបង្កើតហាង សូមព្យាយាមម្តងទៀត!');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-slate-100 flex flex-col justify-between selection:bg-[#ff6a00] selection:text-white">
      
      {/* Top Navigation */}
      <header className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff6a00] to-orange-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-orange-500/25 group-hover:scale-105 transition">
            🛍️
          </div>
          <div>
            <span className="font-black text-lg tracking-wider text-white">SABAY LUK</span>
            <span className="block text-[10px] text-orange-400 font-bold uppercase tracking-widest">Multi-Store SaaS</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">មានហាងរួចហើយមែនទេ?</span>
          <Link 
            href="/admin/dashboard" 
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-white border border-slate-700 transition"
          >
            🔑 ចូលគណនី (Log In)
          </Link>
        </div>
      </header>

      {/* Main Registration Card */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col justify-center">
        
        {/* Banner Announcement */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
            <span>🎁</span>
            <span>បើកហាងថ្មីថ្ងៃនេះ — ប្រើប្រាស់ FREE 100% គ្មានកំណត់កាលបរិច្ឆេទ</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            បង្កើតហាង និងប្រព័ន្ធលក់ POS របស់អ្នកត្រឹម <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6a00] to-amber-400">១ នាទី</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            គ្រប់គ្រងទំនិញ ស្តុក ចេញវិក្កយបត្រកម្តៅ ស្កេន KHQR និងមានទំព័រមុខហាងផ្ទាល់ខ្លួនដាច់ដោយឡែក ១០០%
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center gap-2">
              <span>🎉</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Store Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <span className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-400 font-black text-xs flex items-center justify-center">1</span>
                <h3 className="font-black text-sm text-white uppercase tracking-wider">ព័ត៌មានហាង (Store Details)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    ឈ្មោះហាងរបស់អ្នក (Store Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    placeholder="ឧ. Angkor Shoe, Bopha Fashion..."
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-[#ff6a00] rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    ប្រភេទអាជីវកម្ម (Business Type)
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-[#ff6a00] rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none transition cursor-pointer"
                  >
                    <option value="shoes_fashion">👟 ស្បែកជើង និងម៉ូដសម្លៀកបំពាក់</option>
                    <option value="clothing">👗 សម្លៀកបំពាក់ & កាបូប</option>
                    <option value="cosmetics">💄 គ្រឿងសម្អាង & ថែរក្សាសម្រស់</option>
                    <option value="grocery">🏪 តូបលក់រាយ & គ្រឿងទេស</option>
                    <option value="coffee_drink">☕ ហាងកាហ្វេ & ភេសជ្ជៈ</option>
                    <option value="electronics">📱 ទូរស័ព្ទ & គ្រឿងអេឡិចត្រូនិក</option>
                    <option value="other">📦 អាជីវកម្មទូទៅផ្សេងៗ</option>
                  </select>
                </div>
              </div>

              {/* Store URL Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  តំណភ្ជាប់មុខហាងផ្ទាល់ខ្លួន (Store URL Slug)
                </label>
                <div className="flex items-center rounded-2xl bg-slate-950/90 border border-slate-700/80 overflow-hidden px-3.5 py-2.5 focus-within:border-[#ff6a00]">
                  <span className="text-xs text-slate-500 font-mono select-none">sabayluk.com/store/</span>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => {
                      setIsSlugEdited(true);
                      setStoreSlug(generateSlug(e.target.value));
                    }}
                    placeholder="my-store"
                    className="flex-1 bg-transparent text-xs font-mono font-bold text-orange-400 outline-none ml-1"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ភ្ញៀវអាចចូលមើលម៉ូដទំនិញ និងកុម្ម៉ង់ផ្ទាល់តាមតំណភ្ជាប់នេះ
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    លេខទូរស័ព្ទហាង <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="096 720 5522"
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-[#ff6a00] rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Telegram ម្ចាស់ហាង (Username ឬ Link)
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="ឧ. Sabayluk (ដើម្បីទទួលដំណឹង)"
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-[#ff6a00] rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Owner & Login Credentials */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <span className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-400 font-black text-xs flex items-center justify-center">2</span>
                <h3 className="font-black text-sm text-white uppercase tracking-wider">គណនីម្ចាស់ហាង (Owner Account)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    ឈ្មោះពេញរបស់ម្ចាស់ហាង <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="ឧ. វិចិត្រ, សុខា..."
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Username ចូលប្រព័ន្ធ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerUsername}
                    onChange={(e) => setOwnerUsername(e.target.value)}
                    placeholder="ឧ. admin, sokha"
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    លេខសម្ងាត់ PIN (៤-៦ ខ្ទង់) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-2xl px-4 py-3 text-base font-mono font-black text-center tracking-widest text-amber-400 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Choose Plan */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">3</span>
                  <h3 className="font-black text-sm text-white uppercase tracking-wider">ជ្រើសរើសកញ្ចប់ចាប់ផ្តើម (Starter Plan)</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-bold">អាចផ្លាស់ប្តូរនៅពេលក្រោយបានគ្រប់ពេល</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {[
                  {
                    key: 'FREE',
                    title: '🎁 ឥតគិតថ្លៃ (Free)',
                    price: '$0',
                    sub: 'រហូត (Lifetime)',
                    features: ['ទំនិញរហូតដល់ ១៥ មុខ', '១ គណនី Admin', 'លក់លើ POS គ្មានដែនកំណត់', 'ព្រីនវិក្កយបត្រ & KHQR'],
                    badge: 'ពេញនិយមបំផុត'
                  },
                  {
                    key: 'STARTER',
                    title: '🌱 Starter Plan',
                    price: '$1',
                    sub: '/ខែ ឬ $10/ឆ្នាំ',
                    features: ['ទំនិញរហូតដល់ ៥០ មុខ', '១ Admin + ១ បុគ្គលិក', 'គ្រប់គ្រងស្តុក & របាយការណ៍', 'ផ្ញើវិក្កយបត្រតាម Telegram'],
                    badge: 'ធូរថ្លៃបំផុត'
                  },
                  {
                    key: 'PRO',
                    title: '🚀 Pro Plan',
                    price: '$3',
                    sub: '/ខែ ឬ $30/ឆ្នាំ',
                    features: ['ទំនិញរហូតដល់ ២៥០ មុខ', '១ Admin + ២ បុគ្គលិក', 'ព្រីនតែម Barcode កម្តៅ', 'វិភាគចំណេញសុទ្ធ P&L'],
                    badge: 'មុខងារពេញលេញ'
                  }
                ].map(plan => {
                  const isSelected = selectedPlan === plan.key;
                  return (
                    <div
                      key={plan.key}
                      onClick={() => setSelectedPlan(plan.key)}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'bg-gradient-to-b from-orange-500/15 to-transparent border-[#ff6a00] shadow-lg shadow-orange-500/10'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {plan.badge && (
                        <span className={`absolute -top-2.5 right-4 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isSelected ? 'bg-[#ff6a00] text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {plan.badge}
                        </span>
                      )}

                      <div>
                        <h4 className="font-black text-sm text-white">{plan.title}</h4>
                        <div className="flex items-baseline gap-1 my-2">
                          <span className="text-2xl font-black text-white">{plan.price}</span>
                          <span className="text-xs text-slate-400">{plan.sub}</span>
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-slate-300 mt-3 pt-3 border-t border-slate-800">
                          {plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <span className="text-emerald-400">✓</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 pt-2">
                        <span className={`block w-full py-1.5 rounded-xl text-center text-xs font-black transition ${
                          isSelected ? 'bg-[#ff6a00] text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isSelected ? '✓ បានជ្រើសរើស' : 'ជ្រើសរើសកញ្ចប់នេះ'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#ff6a00] via-orange-500 to-amber-500 hover:from-[#e65c00] hover:to-orange-600 active:scale-[0.99] text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? '⏳' : '🎉'}</span>
                <span>
                  {loading 
                    ? 'កំពុងបង្កើតហាងរបស់អ្នក...' 
                    : (selectedPlan === 'FREE' ? 'បង្កើតហាង និងចាប់ផ្តើមលក់ FREE ឥឡូវនេះ' : `បង្កើតហាង និងចាប់ផ្តើមលក់ (កញ្ចប់ ${selectedPlan})`)}
                </span>
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-2.5">
                🔒 មិនបាច់ដាក់កាតធនាគារ — ចុះឈ្មោះភ្លាម ចូលប្រើប្រព័ន្ធ POS បានភ្លាម
              </p>
            </div>

          </form>

        </div>

      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        <p>© 2026 Sabay Luk POS Platform — ប្រព័ន្ធគ្រប់គ្រងហាង និងលក់ទំនិញសម្រាប់អាជីវកម្មកម្ពុជា</p>
      </footer>

    </div>
  );
}
