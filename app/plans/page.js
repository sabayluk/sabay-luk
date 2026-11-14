'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STORE_PLANS } from '../../lib/stores';

export default function PlansAndSaaSPage() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  const plans = [
    {
      key: 'FREE',
      name: 'កញ្ចប់សាកល្បង (Free Lifetime)',
      priceMonthly: 0,
      priceYearly: 0,
      badge: '🎁 ឥតគិតថ្លៃជារៀងរហូត',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      desc: 'ស័ក្តិសមសម្រាប់អ្នកទើបចាប់ផ្តើមលក់ដំបូង ឬចង់តេស្តប្រព័ន្ធសាកល្បង ប្រើបានរហូត',
      features: [
        'ទំនិញរហូតដល់ ១៥ មុខ',
        'គណនីគ្រប់គ្រង (Admin) ១ នាក់',
        'ប្រព័ន្ធលក់ POS & ចេញវិក្កយបត្រ',
        'ចេញវិក្កយបត្រស្កេន ABA KHQR',
        'មានវេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន',
        'គាំទ្រការប្រើលើទូរស័ព្ទដៃ & កុំព្យូទ័រ'
      ],
      popular: false
    },
    {
      key: 'STARTER',
      name: 'កញ្ចប់ Starter ($1/ខែ)',
      priceMonthly: 1,
      priceYearly: 10,
      badge: '🌱 ធូរថ្លៃបំផុតត្រឹម $1',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: 'សម្រាប់តូបតូចៗ អ្នកលក់តាមផ្សារ ឬអ្នកលក់ Online Live តាមផ្ទះ',
      features: [
        'ទំនិញរហូតដល់ ៥០ មុខ',
        'គណនី Admin ១ + បុគ្គលិក ១ នាក់',
        'កាត់ស្តុក Size & Color លម្អិត',
        'ចេញវិក្កយបត្រស្កេន KHQR & បោះពុម្ព Thermal',
        'របាយការណ៍លក់ និងប្រាក់ចំណេញសង្ខេប',
        'មានវេបសាយមុខហាង Storefront ផ្ទាល់ខ្លួន'
      ],
      popular: false
    },
    {
      key: 'BASIC',
      name: 'កញ្ចប់ Basic ($2/ខែ)',
      priceMonthly: 2,
      priceYearly: 20,
      badge: '⚡ សន្សំសំចៃខ្ពស់',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      desc: 'សម្រាប់ហាងខ្នាតតូច មានបុគ្គលិកជួយគិតលុយ និងស្តុកទំនិញល្មម',
      features: [
        'ទំនិញរហូតដល់ ១០០ មុខ',
        'គណនី Admin ១ + បុគ្គលិក ១ នាក់',
        'តារាងស្តុកទំនិញ Variant Matrix (Size/Color)',
        'ដាស់តឿនទំនិញជិតអស់ពីស្តុក (Low Stock)',
        'កត់ត្រាចំណាយ និងរបាយការណ៍ P&L',
        'វេបសាយ Storefront ទទួលកុម្ម៉ង់ទិញអនឡាញ'
      ],
      popular: false
    },
    {
      key: 'PRO',
      name: 'កញ្ចប់ Pro ($3/ខែ)',
      priceMonthly: 3,
      priceYearly: 30,
      badge: '🔥 ពេញនិយមបំផុត (Best Value)',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      desc: 'សម្រាប់ហាងពេញនិយម មានស្តុកទំនិញច្រើនទំហំ/ពណ៌ និងបុគ្គលិកលក់',
      features: [
        'ទំនិញរហូតដល់ ២៥០ មុខ',
        'គណនី Admin ១ + បុគ្គលិក ២ នាក់',
        'គ្រប់គ្រងបំណុលអតិថិជន & ប្រព័ន្ធ Loyalty Points',
        'របាយការណ៍វិភាគការលក់ និងប្រាក់ចំណេញកម្រិតខ្ពស់',
        'ជូនដំណឹងការបញ្ជាទិញតាម Telegram Bot',
        'វេបសាយ Storefront ជាមួយការទូទាត់ KHQR ស្វ័យប្រវត្ត'
      ],
      popular: true
    },
    {
      key: 'BUSINESS',
      name: 'កញ្ចប់ Business ($5/ខែ)',
      priceMonthly: 5,
      priceYearly: 50,
      badge: '🚀 សម្រាប់ហាងធំ',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      desc: 'សម្រាប់ហាងខ្នាតកណ្តាល និងធំ មានទំនិញច្រើន និងបុគ្គលិកច្រើនផ្នែក',
      features: [
        'ទំនិញរហូតដល់ ៦០០ មុខ',
        'គណនី Admin ១ + បុគ្គលិក ៣ នាក់',
        'មុខងារ POS ពេញលេញ គ្មានដែនកំណត់',
        'នាំចេញទិន្នន័យ Excel & PDF វិក្កយបត្រពន្ធ',
        'គ្រប់គ្រងសិទ្ធិបុគ្គលិកដាច់ដោយឡែកលម្អិត',
        'ការគាំទ្របច្ចេកទេសជាអាទិភាព ២៤/៧'
      ],
      popular: false
    },
    {
      key: 'ENTERPRISE',
      name: 'កញ្ចប់ Enterprise ($10/ខែ)',
      priceMonthly: 10,
      priceYearly: 99,
      badge: '👑 កម្រិតកំពូល Full Option',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      desc: 'សម្រាប់ហាងធំៗ ដេប៉ូបោះដុំ ឬហាងដែលមានសាខា និងទំនិញរាប់ពាន់មុខ',
      features: [
        'ទំនិញរហូតដល់ ២,៥០០ មុខ',
        'គណនី Admin ១ + បុគ្គលិក ៥ នាក់',
        'មុខងារទាំងអស់លើប្រព័ន្ធ SABAY LUK POS',
        'បម្រុងទុកទិន្នន័យស្វ័យប្រវត្តិ (Cloud Backup)',
        'ជំនួយការរៀបចំប្រព័ន្ធពីក្រុមការងារផ្ទាល់',
        'Custom Domain សម្រាប់មុខហាងរបស់អ្នក'
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
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
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

        {/* Billing Cycle Switcher */}
        <div className="pt-4 flex items-center justify-center gap-3">
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
              <span>បង់ប្រចាំឆ្នាំ (Yearly)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                billingCycle === 'yearly' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-700'
              }`}>
                សន្សំ ២០%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ⭐️ PRICING CARDS GRID ⭐️ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
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
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      មុខងាររួមបញ្ចូល (Included Features):
                    </p>
                    <ul className="space-y-2 text-xs font-bold text-slate-700">
                      {p.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500 text-sm font-black shrink-0">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Link
                    href={`/register?plan=${p.key}`}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                      p.popular
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                        : 'bg-slate-900 hover:bg-black text-white'
                    }`}
                  >
                    <span>{p.priceMonthly === 0 ? '🎁 ចុះឈ្មោះប្រើ Free ឥឡូវនេះ' : `⚡ ជ្រើសរើសកញ្ចប់ ${p.name}`}</span>
                    <span>➔</span>
                  </Link>
                </div>
              </div>
            );
          })}
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
      <footer className="bg-white border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500 font-medium space-y-2">
        <p>© 2026 SABAY LUK POS ERP • All Rights Reserved</p>
        <p className="text-slate-400 text-[11px]">
          ទំនាក់ទំនងម្ចាស់ប្រព័ន្ធ៖ <b>sengsoveasna93@gmail.com</b> • 📞 096 720 5522 • Telegram: @Sabayluk
        </p>
      </footer>
    </div>
  );
}