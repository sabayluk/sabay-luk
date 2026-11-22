'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PlansContent() {
  const searchParams = useSearchParams();
  const storeParam = searchParams?.get('store') || '';
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  const commonFeatures = [
    'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
    'ការបញ្ជាទិញ(Orders)',
    'គ្រប់គ្រងស្តុកទំនិញ និងលក់ដុំ/រាយ',
    'គ្រប់គ្រងអតិថិជន',
    'កំណត់ហាង & Logo',
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
  ];

  const plans = [
    {
      key: 'FREE',
      name: '🎁 គំរោង Free',
      priceMonthly: 0,
      priceYearly: 0,
      savingsYearly: 0,
      productsText: 'ទំនិញរហូតដល់ ១៥ មុខ',
      accountsText: 'គណនីគ្រប់គ្រង (1 Admin)',
      badge: '🎁 ឥតគិតថ្លៃជារៀងរហូត',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      desc: 'អ្នកលក់ថ្មីថ្មោង ឬអ្នកចង់តេស្តសាកល្បង (គ្មានហានិភ័យ)',
      features: [
        'ទំនិញរហូតដល់ ១៥ មុខ',
        'គណនីគ្រប់គ្រង (1 Admin)',
        ...commonFeatures
      ],
      popular: false
    },
    {
      key: 'STARTER',
      name: '🌱 គំរោង 1$/1ខែ - 10$/1ឆ្នាំ',
      priceMonthly: 1,
      priceYearly: 10,
      savingsYearly: 2,
      productsText: 'ទំនិញរហូតដល់ ២៥ មុខ',
      accountsText: 'គណនីគ្រប់គ្រង (1 Admin)',
      badge: '🌱 ធូរថ្លៃបំផុតត្រឹម $1/ខែ',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: 'តូបតូចៗ ឬអ្នកលក់ Live តាមផ្ទះ',
      features: [
        'ទំនិញរហូតដល់ ២៥ មុខ',
        'គណនីគ្រប់គ្រង (1 Admin)',
        ...commonFeatures
      ],
      popular: false
    },
    {
      key: 'BASIC',
      name: '⚡ គំរោង 2$/1ខែ - 20$/1ឆ្នាំ',
      priceMonthly: 2,
      priceYearly: 20,
      savingsYearly: 4,
      productsText: 'ទំនិញរហូតដល់ ៥០ មុខ',
      accountsText: 'គណនីបុគ្គលិក ២ នាក់ (Admin + Staff)',
      badge: '⚡ សន្សំសំចៃខ្ពស់',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      desc: 'ហាងខោអាវ ស្បែកជើងខ្នាតតូច',
      features: [
        'ទំនិញរហូតដល់ ៥០ មុខ',
        'គណនីបុគ្គលិក ២ នាក់ (Admin + Staff)',
        ...commonFeatures
      ],
      popular: false
    },
    {
      key: 'PRO',
      name: '🚀 គំរោង 3$/1ខែ - 30$/1ឆ្នាំ',
      priceMonthly: 3,
      priceYearly: 30,
      savingsYearly: 6,
      productsText: 'ទំនិញរហូតដល់ ១០០ មុខ',
      accountsText: 'គណនីបុគ្គលិក 2 នាក់ (Admin + 1 Staff)',
      badge: '🔥 ពេញនិយមបំផុត (Best Value)',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      desc: 'ហាងពេញនិយម មានបុគ្គលិកឆ្លាស់វេន',
      features: [
        'ទំនិញរហូតដល់ ១០០ មុខ',
        'គណនីបុគ្គលិក 2 នាក់ (Admin + 1 Staff)',
        ...commonFeatures
      ],
      popular: true
    },
    {
      key: 'BUSINESS',
      name: '🔥 គំរោង 5$/1ខែ - 50$/1ឆ្នាំ',
      priceMonthly: 5,
      priceYearly: 50,
      savingsYearly: 10,
      productsText: 'ទំនិញរហូតដល់ ២០០ មុខ',
      accountsText: 'គណនីបុគ្គលិក 3 នាក់ (Admin + 2 Staff)',
      badge: '🚀 សម្រាប់ហាងធំ',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      desc: 'ហាងធំគួរសម មានស្តុកច្រើន Size/Color',
      features: [
        'ទំនិញរហូតដល់ ២០០ មុខ',
        'គណនីបុគ្គលិក 3 នាក់ (Admin + 2 Staff)',
        ...commonFeatures
      ],
      popular: false
    },
    {
      key: 'PREMIUM',
      name: '💎 គំរោង 7$/1ខែ - 70$/1ឆ្នាំ',
      priceMonthly: 7,
      priceYearly: 70,
      savingsYearly: 14,
      productsText: 'ទំនិញរហូតដល់ ៥០០ មុខ',
      accountsText: 'គណនីបុគ្គលិក 4 នាក់ (Admin + 3 Staff)',
      badge: '💎 សម្រាប់ហាងលក់ដុំ & រាយ',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      desc: 'ហាងមានមុខទំនិញច្រើន និងបុគ្គលិកច្រើន',
      features: [
        'ទំនិញរហូតដល់ ៥០០ មុខ',
        'គណនីបុគ្គលិក 4 នាក់ (Admin + 3 Staff)',
        ...commonFeatures
      ],
      popular: false
    },
    {
      key: 'ENTERPRISE',
      name: '👑 គំរោង 10$/1ខែ - 100$/1ឆ្នាំ',
      priceMonthly: 10,
      priceYearly: 100,
      savingsYearly: 20,
      productsText: 'ទំនិញរហូតដល់ ១,០០០ មុខ',
      accountsText: 'គណនីបុគ្គលិក 5 នាក់ (Admin + 4 Staff)',
      badge: '👑 កម្រិតកំពូល Full Option',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      desc: 'ហាងធំៗ សាខា ឬឃ្លាំងស្តុកធំ',
      features: [
        'ទំនិញរហូតដល់ ១,០០០ មុខ',
        'គណនីបុគ្គលិក 5 នាក់ (Admin + 4 Staff)',
        ...commonFeatures
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      {/* ⭐️ TOP ANNOUNCEMENT BAR ⭐️ */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-xs font-bold py-2.5 px-4 text-center">
        <span>🎉 ប្រូម៉ូសិនពិសេស៖ ចុះឈ្មោះបើកហាងថ្ងៃនេះ ប្រើប្រាស់ឥតគិតថ្លៃ ១៥ មុខទំនិញ មួយជីវិត! </span>
        <Link href="/register" className="underline font-black hover:text-amber-200 ml-1">
          ចុះឈ្មោះភ្លាម ➔
        </Link>
      </div>

      {/* ⭐️ NAVBAR ⭐️ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform">
              🛍️
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                SABAY LUK
                <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  POS CLOUD
                </span>
              </span>
              <p className="text-[10px] text-slate-500 font-bold -mt-0.5">ប្រព័ន្ធគ្រប់គ្រងការលក់ & ស្តុកទំនិញ</p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/dashboard"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition hidden sm:inline"
            >
              ចូល Dashboard
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>បង្កើតហាងឥតគិតថ្លៃ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ⭐️ HERO SECTION ⭐️ */}
      <section className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black uppercase tracking-wider animate-in fade-in">
          <span>🚀</span>
          <span>Cloud POS & Store Management Software</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          កញ្ចប់តម្លៃធូរថ្លៃបំផុតនៅកម្ពុជា <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500">
            ចាប់ពី $0 ដល់ត្រឹម $3 ក្នុងមួយខែ
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto font-medium leading-relaxed">
          ជួយអ្នកលក់ដូរ និងម្ចាស់ហាងគ្រប់គ្រងការលក់ កាត់ស្តុក Size/Color ចេញវិក្កយបត្រស្កេន ABA KHQR 
          និងមើលរបាយការណ៍ចំណេញខាតបានយ៉ាងងាយស្រួល ពីគ្រប់ទីកន្លែងលើទូរស័ព្ទដៃ និងកុំព្យូទ័រ។
        </p>

        {/* ⭐️ STORE EXPIRY / RENEWAL CALLOUT BANNER (IF ACCESSED VIA ALERT LINK) ⭐️ */}
        {storeParam && (
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-blue-400/40 text-left max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3.5">
              <span className="text-3xl shrink-0 p-2.5 bg-white/10 rounded-2xl border border-white/20">🏪</span>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-2xs mb-1">
                  ⚡ បន្តសុពលភាព / ដំឡើងកញ្ចប់សេវាហាង
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  ហាង៖ <span className="text-amber-300 font-mono underline decoration-amber-400 underline-offset-2">{storeParam}</span>
                </h3>
                <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                  សូមជ្រើសរើសកញ្ចប់សេវាខាងក្រោម ដើម្បីបន្តដំណើរការលក់ កាត់ស្តុក និងចេញវិក្កយបត្រដោយរលូន គ្មានការរអាក់រអួល។
                </p>
              </div>
            </div>
            <Link
              href={`/admin/dashboard?store=${encodeURIComponent(storeParam)}`}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>ចូលផ្ទាំងគ្រប់គ្រងហាង</span>
              <span>➔</span>
            </Link>
          </div>
        )}

        {/* ⭐️ STRATEGIC YEARLY PAYMENT CALLOUT BANNER ⭐️ */}
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-amber-500/10 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 text-left max-w-4xl mx-auto shadow-md">
          <div className="flex items-start gap-3.5">
            <span className="text-3xl shrink-0 p-2 bg-amber-500 text-white rounded-2xl shadow-xs">💡</span>
            <div className="space-y-2">
              <h4 className="font-black text-sm sm:text-base text-slate-900">
                ចំណុចគន្លឹះសំខាន់៖ យុទ្ធសាស្ត្រជ្រើសរើសបង់ប្រចាំឆ្នាំ ($10 / $20 / $30 ក្នុងមួយឆ្នាំ)
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                ដោយសារតម្លៃត្រឹមតែ <b>$1 ឬ $2 ក្នុងមួយខែ</b> វាទាបខ្លាំង ការបង់ផ្តាច់ប្រចាំឆ្នាំ <b>($10/ឆ្នាំ ឬ $20/ឆ្នាំ)</b> ជួយឱ្យលោកអ្នកចំណេញប្រាក់ច្រើន និងចំណេញពេលវេលា <b>វេរលុយតែម្តង ប្រើប្រាស់បានពេញមួយឆ្នាំរលូន</b> មិនបាច់រវល់វេរ $1 ឬ $2 រៀងរាល់ខែឡើយ!
              </p>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-black shadow-xs">
                <span>👉 ចំណេញពី $2 ដល់ $21 ភ្លាមៗ ពេលជ្រើសរើសបង់ផ្តាច់ប្រចាំឆ្នាំ!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Cycle Switcher */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 inline-flex items-center gap-1 text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              បង់ប្រចាំខែ (Monthly)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>⭐ បង់ប្រចាំឆ្នាំ (បង់ផ្តាច់)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                billingCycle === 'yearly' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-700'
              }`}>
                ចំណេញរហូតដល់ $21
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ⭐️ PRICING CARDS GRID ⭐️ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;
            const cycleText = billingCycle === 'yearly' ? '/ឆ្នាំ' : '/ខែ';

            return (
              <div
                key={p.key}
                className={`relative bg-white rounded-3xl p-6 sm:p-8 border transition-all duration-300 flex flex-col justify-between ${
                  p.popular
                    ? 'border-orange-400 ring-2 ring-orange-400/40 shadow-xl shadow-orange-500/10 scale-100 lg:scale-[1.03]'
                    : 'border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300'
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                    ⭐️ ពេញនិយមបំផុត (Recommended)
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                    {billingCycle === 'yearly' && p.savingsYearly > 0 && (
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ចំណេញ ${p.savingsYearly}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
                  </div>

                  <div className="pt-2 pb-1 border-b border-slate-100 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black text-slate-900">${price}</span>
                    <span className="text-xs font-bold text-slate-500">{cycleText}</span>
                    {billingCycle === 'yearly' && p.priceMonthly > 0 && (
                      <span className="text-[11px] font-bold text-emerald-600 ml-auto bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        សល់ត្រឹម ~${(p.priceYearly / 12).toFixed(1)}/ខែ
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">ទំនិញ:</span>
                        <span className="font-black text-slate-800">{p.productsText}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">គណនី:</span>
                        <span className="font-black text-blue-700">{p.accountsText}</span>
                      </div>
                    </div>

                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider pt-1">
                      មុខងាររួមបញ្ចូល (Included Features):
                    </p>
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                      {p.features.map((feat, idx) => {
                        let icon = '✓';
                        if (feat.includes('ទំនិញ')) icon = '📦';
                        else if (feat.includes('POS')) icon = '🛒';
                        else if (feat.includes('Orders') || feat.includes('បញ្ជាទិញ')) icon = '📋';
                        else if (feat.includes('ស្តុក')) icon = '🏬';
                        else if (feat.includes('អតិថិជន')) icon = '👥';
                        else if (feat.includes('Logo') || feat.includes('ហាង')) icon = '🏷️';
                        else if (feat.includes('Admin') || feat.includes('Staff')) icon = '🔑';
                        else if (feat.includes('វិក្កយបត្រស្កេន')) icon = '📱';
                        else if (feat.includes('ទូរស័ព្ទ') || feat.includes('កុំព្យូទ័រ')) icon = '💻';
                        else if (feat.includes('APP ក្នុង telegram')) icon = '✈️';
                        else if (feat.includes('កែប្រែ វិក្កយបត្រ')) icon = '⚙️';
                        else if (feat.includes('Excel') || feat.includes('PDF')) icon = '📊';
                        else if (feat.includes('P&L')) icon = '📈';
                        else if (feat.includes('Low Stock') || feat.includes('ដាស់តឿន')) icon = '⚠️';
                        else if (feat.includes('Storefront ផ្ទាល់ខ្លួន')) icon = '🌐';
                        else if (feat.includes('Storefront ទទួល')) icon = '🛍️';
                        else if (feat.includes('Display') || feat.includes('អេក្រង់')) icon = '🖥️';
                        else if (feat.includes('ស្កេនកូដ')) icon = '🔍';
                        else if (feat.includes('ហិរញ្ញវត្ថុ') || feat.includes('គណនេយ្យ')) icon = '💰';
                        else if (feat.includes('Telegram Bot')) icon = '🤖';

                        return (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                              ✓
                            </span>
                            <span className="text-xs shrink-0 select-none">{icon}</span>
                            <span className="text-[11.5px] text-slate-700 leading-snug font-medium">
                              {feat}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Link
                    href={
                      storeParam 
                        ? `/admin/dashboard?store=${encodeURIComponent(storeParam)}&upgrade=${p.key}&cycle=${billingCycle}`
                        : `/register?plan=${p.key}&cycle=${billingCycle}`
                    }
                    className={`w-full py-3.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                      p.popular
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                        : 'bg-slate-900 hover:bg-black text-white'
                    }`}
                  >
                    <span>
                      {storeParam 
                        ? `⚡ បន្តជាវ ${p.name} សម្រាប់ហាង ${storeParam}` 
                        : (p.priceMonthly === 0 ? '🎁 ចុះឈ្មោះប្រើ Free ឥឡូវនេះ' : `⚡ ជ្រើសរើស ${p.name}`)}
                    </span>
                    <span>➔</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ⭐️ COMPLETE COMPARISON TABLE AS REQUESTED ⭐️ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              📊 តារាងប្រៀបធៀបកញ្ចប់តម្លៃលម្អិត (Official Pricing Matrix)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ជ្រើសរើសកញ្ចប់ដែលស័ក្តិសមបំផុតសម្រាប់ទំហំអាជីវកម្ម និងចំនួនទំនិញក្នុងស្តុករបស់អ្នក
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">កញ្ចប់ (Plan)</th>
                  <th className="px-4 py-3.5">តម្លៃ / ខែ</th>
                  <th className="px-4 py-3.5">បង់ប្រចាំឆ្នាំ (បង់ផ្តាច់)</th>
                  <th className="px-4 py-3.5">ចំនួនទំនិញ (Products)</th>
                  <th className="px-4 py-3.5">ចំនួនគណនី (Accounts)</th>
                  <th className="px-4 py-3.5">ភាពទាក់ទាញ & ស័ក្តិសមសម្រាប់</th>
                  <th className="px-4 py-3.5 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {plans.map((p) => (
                  <tr key={p.key} className={`hover:bg-slate-50/70 transition ${p.popular ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-4 py-4 whitespace-nowrap font-black text-slate-900 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.popular && (
                          <span className="text-[9px] bg-orange-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase">
                            Popular
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-black text-slate-900">
                      ${p.priceMonthly}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {p.priceYearly === 0 ? (
                        <span className="font-bold text-slate-500">$0</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-blue-700">${p.priceYearly} / ឆ្នាំ</span>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            ចំណេញ ${p.savingsYearly}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-bold text-slate-800">
                      {p.productsText}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-bold text-blue-700">
                      {p.accountsText}
                    </td>
                    <td className="px-4 py-4 text-slate-600 text-xs max-w-xs">
                      {p.desc}
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <Link
                        href={
                          storeParam 
                            ? `/admin/dashboard?store=${encodeURIComponent(storeParam)}&upgrade=${p.key}&cycle=yearly`
                            : `/register?plan=${p.key}&cycle=yearly`
                        }
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-[11px] hover:from-blue-700 hover:to-indigo-700 transition active:scale-95 shadow-xs"
                      >
                        {storeParam ? 'បន្តជាវ ➔' : 'ជ្រើសរើស ➔'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ⭐️ 6 CORE FEATURES SHOWCASE ⭐️ */}
      <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase text-blue-600 tracking-wider">ហេតុអ្វីត្រូវជ្រើសរើស SABAY LUK?</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              ប្រព័ន្ធគ្រប់គ្រងការលក់ និងស្តុក ដែលអ្នកលក់គ្រប់រូបត្រូវការ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              រចនាឡើងយ៉ាងយកចិត្តទុកដាក់សម្រាប់អាជីវកម្មនៅកម្ពុជា ងាយយល់ ងាយប្រើ និងមានប្រសិទ្ធភាពខ្ពស់
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl font-black">
                💻
              </div>
              <h3 className="font-black text-base text-slate-900">ប្រព័ន្ធលក់ POS & ស្កេនបាកូដ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                គិតលុយលឿនទាន់ចិត្ត ស្កេនបាកូដ បញ្ចុះតម្លៃ គណនាប្រាក់ដុល្លារ និងរៀលតាមអត្រាប្តូរប្រាក់ជាក់ស្តែង និងចេញវិក្កយបត្រកម្ដៅ (Thermal Receipt)។
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center text-2xl font-black">
                📊
              </div>
              <h3 className="font-black text-base text-slate-900">កាត់ស្តុកតាម Size & Color</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                តារាងបែងចែកស្តុក Variant Matrix ច្បាស់លាស់ លក់ដាច់ទំហំណា កាត់ស្តុកទំហំនោះភ្លាមៗ និងមានប្រព័ន្ធដាស់តឿនពេលទំនិញជិតអស់ស្តុក។
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl font-black">
                💳
              </div>
              <h3 className="font-black text-base text-slate-900">ចេញវិក្កយបត្រស្កេន ABA KHQR</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ភ្ញៀវអាចស្កេនបង់ប្រាក់តាម Bakong KHQR បានគ្រប់ធនាគារ (ABA, Wing, ACLEDA, Canadia...) ដោយសុវត្ថិភាព និងលុយចូលគណនីបងផ្ទាល់។
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-2xl font-black">
                🌐
              </div>
              <h3 className="font-black text-base text-slate-900">វេបសាយមុខហាង Storefront ឥតគិតថ្លៃ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ហាងនីមួយៗទទួលបាន Link វេបសាយមុខហាងមួយភ្លាមៗ (ឧ. /store/your-shop) ដើម្បីផ្ញើឱ្យភ្ញៀវចូលមើលទំនិញ និងកុម្ម៉ង់ទិញបាន ២៤ ម៉ោង។
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl font-black">
                📱
              </div>
              <h3 className="font-black text-base text-slate-900">ប្រើលើទូរស័ព្ទ កុំព្យូទ័រ & iPad</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                មិនចាំបាច់ទិញឧបករណ៍ថ្លៃៗឡើយ! អាចប្រើប្រាស់លើទូរស័ព្ទដៃ iPhone, Android ឬ Tablet ដែលបងមានស្រាប់បានភ្លាមៗ។
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-2xl font-black">
                📈
              </div>
              <h3 className="font-black text-base text-slate-900">របាយការណ៍ចំណេញខាត (P&L)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ដឹងច្បាស់ពីចំណូលសរុប ដើមទុន ប្រាក់ចំណេញសុទ្ធ និងការចំណាយប្រតិបត្តិការប្រចាំថ្ងៃ/ខែ ជួយឱ្យបងសម្រេចចិត្តពង្រីកអាជីវកម្មបានត្រឹមត្រូវ។
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ⭐️ CALL TO ACTION ⭐️ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              រួចរាល់ក្នុងការចាប់ផ្តើមអាជីវកម្មបែបទំនើបហើយឬនៅ?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto font-medium">
              បង្កើតហាងរបស់អ្នកត្រឹមតែ ៦០ វិនាទី គ្មានកុងត្រាចងជើង និងប្រើប្រាស់បានដោយឥតគិតថ្លៃរហូតដល់ ១៥ មុខទំនិញ!
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="bg-gradient-to-r from-[#ff6a00] to-orange-500 hover:from-[#e65c00] hover:to-orange-600 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 transition active:scale-95"
              >
                🚀 ចុះឈ្មោះបង្កើតហាងឥតគិតថ្លៃ ➔
              </Link>
              <Link
                href="/admin/dashboard"
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl border border-slate-700 transition active:scale-95"
              >
                💻 សាកល្បងមើល Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ⭐️ FOOTER ⭐️ */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500 font-medium space-y-2.5">
        <p>© 2026 SABAY LUK POS ERP • All Rights Reserved</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-600">
          <Link href="/" className="hover:text-orange-600 transition">ទំព័រដើម (Home)</Link>
          <span>•</span>
          <Link href="/faq" className="hover:text-orange-600 transition">💡 សំណួរញឹកញាប់ (FAQ)</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-emerald-600 transition">🛡️ គោលការណ៍ឯកជនភាព (Privacy Policy)</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-blue-600 transition">⚖️ លក្ខខណ្ឌប្រើប្រាស់ (Terms of Service)</Link>
        </div>
        <p className="text-slate-400 text-[11px] pt-1">
          ទំនាក់ទំនងម្ចាស់ប្រព័ន្ធ៖ <b>sengsoveasna93@gmail.com</b> • 📞 096 720 5522 • Telegram: @Sabay_luk
        </p>
      </footer>
    </div>
  );
}

export default function PlansAndSaaSPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="animate-spin text-3xl mb-2">⏳</div>
          <p className="text-xs font-bold text-slate-600">កំពុងដំណើរការគម្រោងសេវាកម្ម...</p>
        </div>
      </div>
    }>
      <PlansContent />
    </Suspense>
  );
}
