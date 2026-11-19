'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState('km');
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('sabay_site_lang');
      if (savedLang === 'en' || savedLang === 'km') {
        setLang(savedLang);
      }
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'km' ? 'en' : 'km';
    setLang(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_site_lang', nextLang);
    }
  };

  const isEn = lang === 'en';
  const effectiveDate = isEn ? 'November 20, 2026' : 'ថ្ងៃទី ២០ ខែ វិច្ឆិកា ឆ្នាំ ២០២៦';

  const sections = [
    { id: 'intro', titleKm: '១. សេចក្តីផ្តើម & អត្តសញ្ញាណ', titleEn: '1. Introduction & Controller' },
    { id: 'laws', titleKm: '២. មូលដ្ឋានច្បាប់អនុវត្ត', titleEn: '2. Legal Basis & Compliance' },
    { id: 'collection', titleKm: '៣. ប្រភេទទិន្នន័យដែលយើងប្រមូល', titleEn: '3. Data We Collect' },
    { id: 'purpose', titleKm: '៤. គោលបំណងនៃការប្រើប្រាស់', titleEn: '4. Purpose of Processing' },
    { id: 'ownership', titleKm: '៥. ភាពជាម្ចាស់ & មិនលក់ទិន្នន័យ', titleEn: '5. Data Ownership & Non-Sale' },
    { id: 'security', titleKm: '៦. សុវត្ថិភាព & ការការពារទិន្នន័យ', titleEn: '6. Security & Encryption' },
    { id: 'rights', titleKm: '៧. សិទ្ធិរបស់ម្ចាស់ទិន្នន័យ', titleEn: '7. Your Legal Rights' },
    { id: 'cookies', titleKm: '៨. គោលការណ៍ Cookies & Session', titleEn: '8. Cookies & Storage' },
    { id: 'retention', titleKm: '៩. ការរក្សាទុក & លុបទិន្នន័យ', titleEn: '9. Data Retention & Deletion' },
    { id: 'contact', titleKm: '១០. ព័ត៌មានទំនាក់ទំនងផ្លូវការ', titleEn: '10. Contact Information' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white flex flex-col justify-between">
      {/* ⭐️ Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white p-1 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <img src="/sabayluk_icon.png" alt="Sabay Luk Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-black text-xl text-slate-900 group-hover:text-orange-600 transition">SABAY LUK</span>
              <span className="text-[10px] uppercase font-bold text-emerald-700 ml-1.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                {isEn ? 'Legal Center' : 'ឯកសារច្បាប់'}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 transition cursor-pointer active:scale-95"
            >
              <span>{isEn ? '🇰🇭 KH' : '🇬🇧 EN'}</span>
            </button>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-orange-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
            >
              <span>←</span>
              <span>{isEn ? 'Home' : 'ទំព័រដើម'}</span>
            </Link>

            <Link
              href="/register?plan=FREE"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm active:scale-95 transition"
            >
              <span>🚀</span>
              <span>{isEn ? 'Register Free' : 'បង្កើតហាង Free'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ⭐️ Hero Banner */}
      <div className="bg-gradient-to-b from-white to-slate-100/60 border-b border-slate-200 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <span>🛡️</span>
            <span>{isEn ? '100% Legal Compliance Guarantee' : 'អនុលោមតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា ១០០%'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            {isEn ? 'Privacy Policy' : 'គោលការណ៍ឯកជនភាព'}
          </h1>
          <p className="mt-3 text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            {isEn
              ? 'This document outlines how Sabay Luk POS collects, processes, protects, and respects the data of merchants and customers under Cambodian law and international standards.'
              : 'ឯកសារនេះបញ្ជាក់ពីរបៀបដែល Sabay Luk POS ប្រមូល រក្សាទុក ការពារ និងគោរពសិទ្ធិលើទិន្នន័យរបស់ម្ចាស់អាជីវកម្ម និងអតិថិជនស្របតាមច្បាប់ជាធរមាន។'}
          </p>
          <div className="mt-4 text-[11px] font-bold text-slate-400">
            <span>{isEn ? 'Effective Date:' : 'កាលបរិច្ឆេទអនុវត្តផ្លូវការ:'}</span>{' '}
            <span className="text-slate-700 font-mono font-black">{effectiveDate}</span>
          </div>
        </div>
      </div>

      {/* ⭐️ Content Body */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 hidden lg:block sticky top-24 self-start space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-3 block mb-2">
              {isEn ? 'Table of Contents' : 'មាតិកាឯកសារ'}
            </span>
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`block px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeSection === s.id
                    ? 'bg-orange-50 text-orange-600 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {isEn ? s.titleEn : s.titleKm}
              </a>
            ))}
          </aside>

          {/* Main Legal Content */}
          <article className="lg:col-span-3 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xs space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
            
            {/* Section 1 */}
            <section id="intro" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-orange-500">§ 1.</span>
                <span>{isEn ? 'Introduction & Data Controller' : 'សេចក្តីផ្តើម & អត្តសញ្ញាណអ្នកគ្រប់គ្រងទិន្នន័យ'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    Welcome to <b>Sabay Luk POS Cloud</b> (referred to as <b>"Sabay Luk"</b>, <b>"We"</b>, <b>"Us"</b>, or <b>"Our Platform"</b>). We are committed to protecting your personal information and your right to privacy. This Privacy Policy applies to all services provided via our platform (including <code>sabayluk.com</code>, mobile web apps, PWA, and related storefronts).
                  </>
                ) : (
                  <>
                    សូមស្វាគមន៍មកកាន់ <b>Sabay Luk POS Cloud</b> (តទៅនេះហៅកាត់ថា <b>«Sabay Luk»</b> ឬ <b>«ប្រព័ន្ធយើងខ្ញុំ»</b>)។ យើងខ្ញុំមានការប្តេជ្ញាចិត្តយ៉ាងម៉ឺងម៉ាត់បំផុតក្នុងការការពារព័ត៌មានផ្ទាល់ខ្លួន និងសិទ្ធិឯកជនភាពរបស់អ្នក។ គោលការណ៍ឯកជនភាពនេះ អនុវត្តចំពោះរាល់សេវាកម្មទាំងអស់ដែលដំណើរការលើប្រព័ន្ធ Sabay Luk (រួមមានគេហទំព័រ <code>sabayluk.com</code>, Web App, PWA និងគេហទំព័រមុខហាងដៃគូនានា)។
                  </>
                )}
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <p className="font-bold text-slate-800">{isEn ? 'Data Controller Information:' : 'ព័ត៌មានអ្នកគ្រប់គ្រងទិន្នន័យ (Data Controller):'}</p>
                <ul className="mt-1.5 space-y-1 text-slate-600">
                  <li>• <b>{isEn ? 'Platform Name:' : 'ឈ្មោះប្រព័ន្ធ៖'}</b> Sabay Luk POS Cloud Platform</li>
                  <li>• <b>{isEn ? 'Jurisdiction:' : 'ដែនយុត្តាធិការ៖'}</b> {isEn ? 'Phnom Penh, Kingdom of Cambodia' : 'រាជធានីភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា'}</li>
                  <li>• <b>{isEn ? 'Data Protection Officer (DPO):' : 'មន្ត្រីការពារទិន្នន័យ (DPO)៖'}</b> support@sabayluk.com / Telegram: @sabay_luk</li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section id="laws" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-orange-500">§ 2.</span>
                <span>{isEn ? 'Legal Basis & Regulatory Compliance' : 'មូលដ្ឋានច្បាប់អនុវត្តនៃព្រះរាជាណាចក្រកម្ពុជា'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    This Policy is established in strict adherence to the laws and statutory regulations of the Kingdom of Cambodia, including:
                  </>
                ) : (
                  <>
                    គោលការណ៍នេះត្រូវបានបង្កើតឡើងស្របតាមច្បាប់ និងលិខិតបទដ្ឋានគតិយុត្តជាធរមាននៃព្រះរាជាណាចក្រកម្ពុជា រួមមាន៖
                  </>
                )}
              </p>
              <ul className="space-y-2 pl-4 list-disc marker:text-orange-500 text-xs sm:text-sm">
                <li>
                  <b>{isEn ? 'Law on Electronic Commerce (2019):' : 'ច្បាប់ស្តីពីពាណិជ្ជកម្មតាមប្រព័ន្ធអេឡិចត្រូនិក (២០១៩)៖'}</b>{' '}
                  {isEn 
                    ? 'Compliance with legal provisions on electronic contracts, consumer protection, and personal data storage obligations.'
                    : 'អនុលោមតាមបទប្បញ្ញត្តិស្ដីពីកិច្ចសន្យាអេឡិចត្រូនិក កិច្ចការពារទិន្នន័យបុគ្គល និងការរក្សាទុកទិន្នន័យដោយសុវត្ថិភាព។'}
                </li>
                <li>
                  <b>{isEn ? 'Law on Consumer Protection (2019):' : 'ច្បាប់ស្តីពីកិច្ចការពារអ្នកប្រើប្រាស់ (២០១៩)៖'}</b>{' '}
                  {isEn
                    ? 'Ensuring transparent pricing, fair trading, protection against fraudulent activities, and clear disclosure of terms.'
                    : 'ធានាតម្លាភាពនៃតម្លៃ សិទ្ធិទទួលបានព័ត៌មានត្រឹមត្រូវ និងការការពារអ្នកប្រើប្រាស់ពីការបោកបញ្ឆោត។'}
                </li>
                <li>
                  <b>{isEn ? 'National Bank of Cambodia (NBC) Bakong Guidelines:' : 'សេចក្តីណែនាំស្តីពីការទូទាត់ Bakong KHQR របស់ធនាគារជាតិនៃកម្ពុជា៖'}</b>{' '}
                  {isEn
                    ? 'Full compliance with national digital payment standards, ensuring financial integrity and zero unauthorized tampering with transaction data.'
                    : 'ធានាសុចរិតភាពនៃការទូទាត់ប្រាក់តាមប្រព័ន្ធអេឡិចត្រូនិកជាតិ និងការមិនកែបន្លំទិន្នន័យប្រតិបត្តិការហិរញ្ញវត្ថុ។'}
                </li>
                <li>
                  <b>{isEn ? 'International GDPR Standards:' : 'ស្តង់ដារការពារទិន្នន័យអន្តរជាតិ (GDPR Principles)៖'}</b>{' '}
                  {isEn
                    ? 'Respecting user consent, right to access, right to rectification, data portability, and right to erasure.'
                    : 'គោរពសិទ្ធិយល់ព្រម សិទ្ធិពិនិត្យមើល សិទ្ធិកែតម្រូវ និងសិទ្ធិស្នើសុំលុបទិន្នន័យចោល។'}
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="collection" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-orange-500">§ 3.</span>
                <span>{isEn ? 'Categories of Data We Collect' : 'ប្រភេទទិន្នន័យដែលយើងប្រមូល'}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-black text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                    <span>👤</span> {isEn ? 'Merchant Account Information' : 'ព័ត៌មានគណនីម្ចាស់ហាង'}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isEn 
                      ? 'Store Name, Owner Name, Contact Phone Number, Login Password (strictly encrypted via one-way cryptographic hashing), and Store Logo.'
                      : 'ឈ្មោះហាង, ឈ្មោះម្ចាស់ហាង, លេខទូរស័ព្ទទំនាក់ទំនង, ពាក្យសម្ងាត់ (ត្រូវបាន Encrypt ការពារមិនឱ្យនរណាម្នាក់មើលឃើញ) និង Logo ហាង។'}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-black text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                    <span>📦</span> {isEn ? 'Store Catalog & Stock' : 'ទិន្នន័យទំនិញ & ស្តុក'}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isEn
                      ? 'Product Titles, SKUs, Barcodes, Cost and Retail Prices, Stock Quantities, Categories, Size/Color variants, and product images.'
                      : 'ឈ្មោះទំនិញ, លេខកូដ SKU, បាកូដ, ថ្លៃដើម, តម្លៃលក់, ចំនួនស្តុក, ប្រភេទ និងរូបភាពផលិតផល។'}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-black text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                    <span>💳</span> {isEn ? 'Banking & KHQR Verification' : 'ព័ត៌មានធនាគារ & KHQR'}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isEn
                      ? 'Merchant ABA/Bakong Account ID and recipient name for generating KHQR. WE DO NOT COLLECT OR STORE BANK PINs, PASSWORDS, OR CARD CVVs.'
                      : 'លេខគណនី ABA/Bakong និងឈ្មោះម្ចាស់គណនីសម្រាប់បង្កើត KHQR។ យើងដាច់ខាតមិនប្រមូល ឬរក្សាទុកលេខកូដសម្ងាត់ធនាគារ PIN ឬ CVV ឡើយ។'}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-black text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                    <span>🧾</span> {isEn ? 'Customer Order Data' : 'ព័ត៌មានការកុម្ម៉ង់របស់ភ្ញៀវ'}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {isEn
                      ? 'Customer Name, Delivery Phone Number, Shipping Address, items purchased, and uploaded payment slip images for merchant verification.'
                      : 'ឈ្មោះអតិថិជន, លេខទូរស័ព្ទទទួលទំនិញ, អាសយដ្ឋានដឹកជញ្ជូន, ទំនិញដែលបានជាវ និងរូបភាព Slip សម្រាប់ផ្ទៀងផ្ទាត់។'}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="purpose" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-orange-500">§ 4.</span>
                <span>{isEn ? 'Purpose of Processing' : 'គោលបំណងនៃការប្រើប្រាស់ទិន្នន័យ'}</span>
              </h2>
              <p>
                {isEn ? 'We process collected data exclusively for the following legitimate business purposes:' : 'យើងខ្ញុំប្រើប្រាស់ទិន្នន័យដែលបានប្រមូលក្នុងគោលបំណងច្បាស់លាស់ និងស្របច្បាប់ដូចខាងក្រោម៖'}
              </p>
              <ul className="space-y-1.5 pl-4 list-disc marker:text-orange-500 text-xs sm:text-sm">
                <li>{isEn ? 'To operate Cloud POS checkout, manage real-time inventory deductions, and generate receipts.' : 'ដើម្បីដំណើរការប្រព័ន្ធគិតលុយ POS កាត់ស្តុកទំនិញ Real-time និងចេញវិក្កយបត្រ។'}</li>
                <li>{isEn ? 'To host your public E-Commerce Storefront so customers can order directly online.' : 'ដើម្បីដំណើរការគេហទំព័រមុខហាង E-Commerce ឱ្យអតិថិជនកុម្ម៉ង់ទិញអនឡាញបាន។'}</li>
                <li>{isEn ? 'To send automated Telegram Bot alerts for orders and low-stock warnings as requested by the merchant.' : 'ដើម្បីផ្ញើសារដំណឹង Telegram ស្វ័យប្រវត្តិតាមការកំណត់របស់ម្ចាស់ហាង។'}</li>
                <li>{isEn ? 'To calculate IFRS standard profit & loss financial summaries for store owners.' : 'ដើម្បីគណនារបាយការណ៍ចំណូល-ចំណាយ និងប្រាក់ចំណេញសុទ្ធជូនម្ចាស់ហាង។'}</li>
                <li>{isEn ? 'To ensure cybersecurity, combat fraud, and provide technical troubleshooting.' : 'ដើម្បីធានាសន្តិសុខប្រព័ន្ធ ការពារការក្លែងបន្លំ និងដោះស្រាយបញ្ហាបច្ចេកទេស។'}</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="ownership" className="space-y-3 scroll-mt-24 bg-amber-50/60 p-5 sm:p-6 rounded-3xl border border-amber-200">
              <h2 className="text-lg sm:text-xl font-black text-amber-950 flex items-center gap-2 pb-1">
                <span>🔒</span>
                <span>{isEn ? 'Data Ownership & Strict Non-Sale Policy' : 'ភាពជាម្ចាស់លើទិន្នន័យ & ការមិនលក់ទិន្នន័យ ១០០%'}</span>
              </h2>
              <p className="text-amber-900 text-xs sm:text-sm font-medium leading-relaxed">
                {isEn ? (
                  <>
                    <b>1. You Own Your Business Data:</b> The merchant retains 100% intellectual property and commercial ownership over all catalog items, customer databases, sales figures, and inventory records stored on Sabay Luk.<br/><br/>
                    <b>2. We DO NOT Sell or Rent Data:</b> Sabay Luk strictly will NEVER sell, lease, monetize, disclose, or trade any merchant data or customer personal information to third-party advertisers, data brokers, or marketing networks.
                  </>
                ) : (
                  <>
                    <b>១. ម្ចាស់ហាងជាម្ចាស់ទិន្នន័យ ១០០%៖</b> ម្ចាស់ហាងរក្សាកម្មសិទ្ធិបញ្ញា និងសិទ្ធិអាជីវកម្មពេញលេញលើរាល់បញ្ជីទំនិញ ទិន្នន័យអតិថិជន ចំណូលលក់ និងកំណត់ត្រាស្តុកទាំងអស់។<br/><br/>
                    <b>២. ដាច់ខាតមិនលក់ ឬជួលទិន្នន័យ៖</b> Sabay Luk ប្រកាន់ខ្ជាប់នូវគោលការណ៍តឹងរ៉ឹងបំផុត ដោយ<b>ដាច់ខាតមិនលក់ មិនជួល មិនចែករំលែក ឬយកទិន្នន័យរបស់បង ឬលេខទូរស័ព្ទភ្ញៀវទៅធ្វើអាជីវកម្មជាមួយក្រុមហ៊ុនផ្សាយពាណិជ្ជកម្មណាមួយឡើយ</b>។
                  </>
                )}
              </p>
            </section>

            {/* Section 6 */}
            <section id="security" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-orange-500">§ 6.</span>
                <span>{isEn ? 'Data Security & Technical Safeguards' : 'វិធានការសន្តិសុខ & ការការពារទិន្នន័យ'}</span>
              </h2>
              <p>
                {isEn ? 'We implement industry-leading technical and organizational security measures:' : 'យើងខ្ញុំអនុវត្តវិធានការសន្តិសុខបច្ចេកវិទ្យាកម្រិតខ្ពស់ស្របតាមស្តង់ដារអន្តរជាតិ៖'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <span className="text-2xl block mb-1">🔐</span>
                  <p className="font-black text-xs text-slate-800">SSL/TLS 256-bit</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{isEn ? 'End-to-end data encryption' : 'ការពារទិន្នន័យពេលបញ្ជូន'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <span className="text-2xl block mb-1">🛡️</span>
                  <p className="font-black text-xs text-slate-800">Row-Level Security</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{isEn ? 'Strict store database isolation' : 'ញែកទិន្នន័យហាងដាច់ពីគ្នា'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <span className="text-2xl block mb-1">💾</span>
                  <p className="font-black text-xs text-slate-800">Automated Backup</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{isEn ? 'Daily disaster recovery replication' : 'រក្សាទុកទិន្នន័យបម្រុងជាប្រចាំ'}</p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section id="rights" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-orange-500">§ 7.</span>
                <span>{isEn ? 'Your Legal Rights' : 'សិទ្ធិស្របច្បាប់របស់ម្ចាស់ទិន្នន័យ'}</span>
              </h2>
              <p>
                {isEn
                  ? 'Under applicable laws of Cambodia and international privacy frameworks, you are entitled to the following rights:'
                  : 'ស្របតាមច្បាប់ជាធរមាន និងស្តង់ដារការពារទិន្នន័យ អ្នកមានសិទ្ធិពេញលេញដូចខាងក្រោម៖'}
              </p>
              <ul className="space-y-2 pl-4 list-disc marker:text-orange-500 text-xs sm:text-sm">
                <li>
                  <b>{isEn ? 'Right to Access:' : 'សិទ្ធិពិនិត្យមើលទិន្នន័យ៖'}</b>{' '}
                  {isEn ? 'You can view all your stored products, invoices, and transactions at any time in your dashboard.' : 'បងអាចចូលមើលទិន្នន័យផលិតផល ប្រវត្តិលក់ និងវិក្កយបត្រទាំងអស់ក្នុង Dashboard គ្រប់ពេល។'}
                </li>
                <li>
                  <b>{isEn ? 'Right to Rectification:' : 'សិទ្ធិកែតម្រូវទិន្នន័យ៖'}</b>{' '}
                  {isEn ? 'You can update, correct, or modify store details, prices, and staff permissions directly.' : 'បងអាចកែប្រែព័ត៌មានហាង តម្លៃទំនិញ និងសិទ្ធិបុគ្គលិកបានភ្លាមៗ។'}
                </li>
                <li>
                  <b>{isEn ? 'Right to Data Portability (Export):' : 'សិទ្ធាទាញយកទិន្នន័យ (Data Portability)៖'}</b>{' '}
                  {isEn ? 'You have the right to export your complete product catalog, sales logs, and customer profiles into Excel (.xlsx) or CSV format anytime.' : 'បងមានសិទ្ធិទាញយក (Export) បញ្ជីទំនិញ ប្រវត្តិលក់ និងបញ្ជីអតិថិជនជា Excel/CSV បានគ្រប់ពេលវេលា។'}
                </li>
                <li>
                  <b>{isEn ? 'Right to Erasure ("Right to be Forgotten"): ' : 'សិទ្ធិស្នើសុំលុបទិន្នន័យ (Right to Erasure)៖ '}</b>{' '}
                  {isEn ? 'You may request permanent deletion of your account and associated store data by contacting our DPO.' : 'បងអាចស្នើសុំលុបគណនី និងទិន្នន័យហាងចេញពីប្រព័ន្ធជាស្ថាពរបានគ្រប់ពេល។'}
                </li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="cookies" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-orange-500">§ 8.</span>
                <span>{isEn ? 'Cookies & Local Storage Policy' : 'គោលការណ៍ Cookies & ការរក្សាទុកទិន្នន័យក្នុង Browser'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    We use cookies and browser <code>localStorage</code> strictly for functional and operational needs: keeping you securely logged in, remembering your language preference (Khmer / English), and caching cart items for uninterrupted POS operation. We do NOT use third-party tracking cookies for targeted surveillance advertising.
                  </>
                ) : (
                  <>
                    យើងប្រើប្រាស់ Cookies និង <code>localStorage</code> ក្នុង Browser សម្រាប់តែដំណើរការចាំបាច់ប៉ុណ្ណោះ ដូចជា៖ រក្សា Session ចូលប្រើប្រាស់ឱ្យមានសុវត្ថិភាព, ចងចាំភាសាដែលបងបានរើស (ខ្មែរ / អង់គ្លេស) និងរក្សាទំនិញក្នុងកន្ត្រក POS ឱ្យលក់បានរលូន។ យើង<b>មិនប្រើប្រាស់ Tracking Cookies របស់ភាគីទីបីដើម្បីលួចតាមដានផ្សាយពាណិជ្ជកម្មឡើយ</b>។
                  </>
                )}
              </p>
            </section>

            {/* Section 9 */}
            <section id="retention" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-orange-500">§ 9.</span>
                <span>{isEn ? 'Data Retention & Deletion Policy' : 'រយៈពេលនៃការរក្សាទុក & ការលុបទិន្នន័យ'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    We retain merchant business records as long as your account remains active or as required by commercial and tax accounting regulations. Upon receiving an explicit account deletion request, your store database and uploaded images will be permanently purged within thirty (30) business days.
                  </>
                ) : (
                  <>
                    យើងខ្ញុំរក្សាទុកទិន្នន័យអាជីវកម្ម ដរាបណាគណនីរបស់បងនៅតែបន្តដំណើរការ ឬស្របតាមតម្រូវការច្បាប់ពាណិជ្ជកម្ម និងគណនេយ្យពន្ធដារ។ នៅពេលទទួលបានការស្នើសុំលុបគណនីជាផ្លូវការ ទិន្នន័យហាង និងរូបភាពទាំងអស់នឹងត្រូវលុបបំបាត់ជាស្ថាពរចេញពី Server ក្នុងរយៈពេលសាមសិប (៣០) ថ្ងៃនៃថ្ងៃធ្វើការ។
                  </>
                )}
              </p>
            </section>

            {/* Section 10 */}
            <section id="contact" className="space-y-3 scroll-mt-24 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800">
              <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 pb-1">
                <span>📞</span>
                <span>{isEn ? 'Official Contact & Data Protection Officer' : 'ព័ត៌មានទំនាក់ទំនងផ្លូវការ & មន្ត្រីការពារទិន្នន័យ'}</span>
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm">
                {isEn
                  ? 'If you have any questions, inquiries regarding this Privacy Policy, or wish to exercise your data rights, please contact our Data Protection Officer:'
                  : 'ប្រសិនបើបងមានសំណួរ ចម្ងល់ ឬចង់អនុវត្តសិទ្ធិលើទិន្នន័យ សូមទាក់ទងមកកាន់មន្ត្រីការពារទិន្នន័យរបស់យើងខ្ញុំ៖'}
              </p>
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
                  <span className="text-slate-400 block text-[11px] font-bold">✈️ Telegram Official Support:</span>
                  <a href="https://t.me/sabay_luk" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-bold hover:underline">
                    @sabay_luk
                  </a>
                </div>
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
                  <span className="text-slate-400 block text-[11px] font-bold">📞 Hotline Support:</span>
                  <a href="tel:0967205522" className="text-white font-bold hover:underline">
                    096 720 5522 / 012 345 678
                  </a>
                </div>
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
                  <span className="text-slate-400 block text-[11px] font-bold">✉️ Email Support:</span>
                  <span className="text-white font-bold font-mono">support@sabayluk.com</span>
                </div>
                <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
                  <span className="text-slate-400 block text-[11px] font-bold">📍 Physical Address:</span>
                  <span className="text-white font-bold">
                    {isEn ? 'Phnom Penh, Kingdom of Cambodia' : 'រាជធានីភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា'}
                  </span>
                </div>
              </div>
            </section>

          </article>
        </div>
      </main>

      {/* ⭐️ Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-xs text-slate-500 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/sabayluk_icon.png" alt="" className="w-5 h-5 object-contain" />
            <span className="font-black text-slate-800">SABAY LUK POS CLOUD</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <Link href="/" className="hover:text-orange-600 transition">{isEn ? 'Home' : 'ទំព័រដើម'}</Link>
            <Link href="/faq" className="hover:text-orange-600 transition">{isEn ? 'FAQ' : 'សំណួរញឹកញាប់'}</Link>
            <Link href="/terms" className="hover:text-orange-600 transition">{isEn ? 'Terms of Service' : 'លក្ខខណ្ឌប្រើប្រាស់'}</Link>
            <Link href="/plans" className="hover:text-orange-600 transition">{isEn ? 'Pricing' : 'តារាងតម្លៃ'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
