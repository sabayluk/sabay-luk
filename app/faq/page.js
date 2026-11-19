'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getLandingFaqs } from '../../lib/landingTranslations';

export default function FAQPage() {
  const [lang, setLang] = useState('km');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openIndex, setOpenIndex] = useState(0);

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
  const faqs = useMemo(() => getLandingFaqs(lang), [lang]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    faqs.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [faqs]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchCat = selectedCategory === 'all' || faq.category === selectedCategory;
      const qText = (faq.q + ' ' + faq.a).toLowerCase();
      const matchSearch = !searchQuery.trim() || qText.includes(searchQuery.trim().toLowerCase());
      return matchCat && matchSearch;
    });
  }, [faqs, selectedCategory, searchQuery]);

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
              <span className="text-[10px] uppercase font-bold text-orange-600 ml-1.5 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200">
                Help & FAQ
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
              <span>{isEn ? 'Start Free' : 'បង្កើតហាង Free'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ⭐️ Hero Search Header */}
      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 mb-3">
              {isEn ? '💡 Help Center & Knowledge Base' : '💡 មជ្ឈមណ្ឌលជំនួយ & ចម្លើយចម្ងល់'}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {isEn ? 'Frequently Asked Questions' : 'សំណួរដែលសួរញឹកញាប់'}
            </h1>
            <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              {isEn 
                ? 'Find instant, straightforward answers regarding Sabay Luk POS, Bakong KHQR, pricing, privacy, and store setup.' 
                : 'ស្វែងរកចម្លើយច្បាស់ៗអំពីការប្រើប្រាស់ប្រព័ន្ធ Sabay Luk POS ការស្កេន KHQR តម្លៃ សុវត្ថិភាព និងការគ្រប់គ្រងហាង។'}
            </p>

            {/* Live Search Bar */}
            <div className="mt-8 max-w-xl mx-auto relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search any question (e.g. KHQR, Telegram, Free, Printer)...' : 'ស្វែងរកសំណួរ (ឧ. KHQR, Telegram, Free, ម៉ាស៊ីនព្រីន, ស្តុក)...'}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 bg-white shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none text-xs sm:text-sm font-bold text-slate-800 transition"
              />
              <span className="absolute left-4 top-3.5 text-slate-400 text-lg">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 text-xs font-bold w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                🌟 {isEn ? 'All Questions' : 'ទាំងអស់'} ({faqs.length})
              </button>
              {categories.map((cat, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ⭐️ FAQ Accordion List */}
          <div className="space-y-3.5">
            {filteredFaqs.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                <span className="text-4xl block mb-2">🔍</span>
                <p className="font-bold text-sm text-slate-700">
                  {isEn ? 'No questions matched your search query.' : 'រកមិនឃើញសំណួរស្របតាមពាក្យគន្លឹះនេះឡើយ។'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isEn ? 'Try another keyword or message our Telegram support directly.' : 'សូមសាកល្បងពាក្យផ្សេង ឬទាក់ទងមកកាន់ Telegram ក្រុមការងារយើងផ្ទាល់។'}
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="mt-4 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-xs hover:bg-orange-100 transition cursor-pointer"
                >
                  {isEn ? 'Reset Search' : 'បង្ហាញសំណួរទាំងអស់ឡើងវិញ'}
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isOpen
                        ? 'border-orange-300 ring-2 ring-orange-100 shadow-md bg-white'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-3 cursor-pointer select-none transition"
                    >
                      <div className="space-y-1">
                        {faq.category && (
                          <span className="inline-block text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            {faq.category}
                          </span>
                        )}
                        <h3 className={`text-sm sm:text-base font-black transition-colors ${isOpen ? 'text-orange-600' : 'text-slate-900'}`}>
                          {faq.q}
                        </h3>
                      </div>
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base font-black transition-transform duration-200 ${
                        isOpen ? 'bg-orange-500 text-white rotate-45' : 'bg-slate-100 text-slate-600'
                      }`}>
                        +
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-1 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100 animate-in fade-in duration-150">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ⭐️ Need More Help CTA */}
          <div className="mt-14 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 text-center relative overflow-hidden">
            <div className="relative z-10">
              <span className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 text-2xl flex items-center justify-center mx-auto mb-3">
                💬
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                {isEn ? 'Still have questions or need custom setup?' : 'នៅមានចម្ងល់ ឬចង់បានការរៀបចំហាងផ្ទាល់?'}
              </h3>
              <p className="mt-2 text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
                {isEn
                  ? 'Our team is ready to assist you directly via Telegram or Phone call 7 days a week.'
                  : 'ក្រុមការងារបច្ចេកទេស និងជំនួយការ Sabay Luk រីករាយនឹងឆ្លើយតប និងជួយបង ២៤/៧។'}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="https://t.me/sabay_luk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition shadow-md active:scale-95 inline-flex items-center gap-2"
                >
                  <span>✈️</span>
                  <span>Telegram: @sabay_luk</span>
                </a>
                <a
                  href="tel:0967205522"
                  className="px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs transition shadow-md active:scale-95 inline-flex items-center gap-2"
                >
                  <span>📞</span>
                  <span>Hotline: 096 720 5522</span>
                </a>
              </div>
            </div>
          </div>
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
            <Link href="/privacy" className="hover:text-orange-600 transition">{isEn ? 'Privacy Policy' : 'គោលការណ៍ឯកជនភាព'}</Link>
            <Link href="/terms" className="hover:text-orange-600 transition">{isEn ? 'Terms of Service' : 'លក្ខខណ្ឌប្រើប្រាស់'}</Link>
            <Link href="/plans" className="hover:text-orange-600 transition">{isEn ? 'Pricing' : 'តារាងតម្លៃ'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
