'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LANDING_TRANSLATIONS, getLandingPlans, getLandingFaqs } from '../lib/landingTranslations';
import { fetchAllStores, getLocalStores, DEFAULT_FLAGSHIP_STORE, fetchPartnerStoresWithStats, sortStoresByPerformance } from '../lib/stores';

export default function SaaSPlatformLandingPage() {
  const [lang, setLang] = useState('km');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [openFaq, setOpenFaq] = useState(null);
  const [partnerStores, setPartnerStores] = useState([DEFAULT_FLAGSHIP_STORE]);
  const [loadingStores, setLoadingStores] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('sabay_site_lang');
      if (savedLang === 'en' || savedLang === 'km') {
        setLang(savedLang);
      }
      try {
        const local = getLocalStores();
        const active = (local || []).filter(s => s && s.slug && s.status === 'ACTIVE');
        if (active.length > 0) {
          setPartnerStores(sortStoresByPerformance(active));
        }
      } catch (e) {}
    }
  }, []);

  // Fetch real active partner stores with smart product & sales ranking (Top stores first, new stores last)
  useEffect(() => {
    let isMounted = true;
    async function loadStores() {
      try {
        const ranked = await fetchPartnerStoresWithStats();
        if (!isMounted) return;
        // Strictly filter active stores with a valid slug for public storefront
        const active = (ranked || []).filter(s => s && s.slug && s.status === 'ACTIVE');
        if (active.length > 0) {
          setPartnerStores(active);
        }
      } catch (e) {
        console.warn('Failed to load partner stores:', e);
      } finally {
        if (isMounted) setLoadingStores(false);
      }
    }
    loadStores();
    return () => { isMounted = false; };
  }, []);

  const getStoreCategoryName = (type) => {
    const map = {
      shoes_fashion: lang === 'km' ? 'ស្បែកជើង & ម៉ូដ' : 'Shoes & Fashion',
      clothing: lang === 'km' ? 'សំលៀកបំពាក់' : 'Clothing & Apparel',
      cosmetics: lang === 'km' ? 'គ្រឿងសម្អាង' : 'Beauty & Cosmetics',
      grocery: lang === 'km' ? 'ភេសជ្ជៈ & គ្រឿងទេស' : 'Grocery & Food',
      electronics: lang === 'km' ? 'គ្រឿងអេឡិចត្រូនិច' : 'Electronics',
      general: lang === 'km' ? 'ទំនិញទូទៅ' : 'General Merchandise'
    };
    return map[type] || (lang === 'km' ? 'ហាងលក់ទំនិញ' : 'Retail Store');
  };

  const getStoreLogoUrl = (st) => {
    if (st.id === 'store_default_sabayluk' || st.slug === 'sabay-luk') {
      return '/sabayluk_icon.png';
    }
    return st.settings?.logoUrl || st.settings?.logo || st.logo || null;
  };

  const [copiedSlug, setCopiedSlug] = useState(null);
  const [openingSlug, setOpeningSlug] = useState(null);
  const [browserToast, setBrowserToast] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ⭐️ មុខងារបង្កើតតំណភ្ជាប់ URL គេហទំព័រមុខហាងគេចផុតពី PWA Capture (Escape PWA to Normal Web Tab) ⭐️
  const getCleanStoreUrl = (slug) => {
    let origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3000';
    if (origin.includes('localhost:')) {
      origin = origin.replace('localhost:', '127.0.0.1:');
    }
    return `${origin}/store/${slug}`;
  };

  // ⭐️ បើកគេហទំព័រមុខហាងជា Tab លើ Web Browser (Google Chrome / Edge) មិនឱ្យចេញជា APP ⭐️
  const handleOpenStoreInBrowser = (e, slug) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    
    const targetUrl = getCleanStoreUrl(slug);
    setOpeningSlug(slug);

    try {
      const win = window.open(targetUrl, '_blank');
      if (win) win.focus();
    } catch (_) {
      window.location.href = targetUrl;
    }

    setTimeout(() => {
      setOpeningSlug(null);
    }, 800);
  };

  const handleCopyStoreLink = (slug) => {
    const targetUrl = getCleanStoreUrl(slug);
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(targetUrl);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2500);
    }
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'km' ? 'en' : 'km';
    setLang(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabay_site_lang', nextLang);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const t = LANDING_TRANSLATIONS[lang] || LANDING_TRANSLATIONS.km;
  const plans = getLandingPlans(lang);
  const faqs = getLandingFaqs(lang);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      {/* ⭐️ Top Announcement Bar */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 text-white text-xs sm:text-sm py-2 px-4 text-center font-bold flex flex-wrap items-center justify-center gap-2 shadow-sm">
        <span className="animate-pulse">{t.promo_badge}</span>
        <span>{t.promo_text}</span>
        <Link href="/register?plan=FREE" className="underline hover:text-amber-200 ml-1 inline-flex items-center gap-1 font-black">
          {t.promo_link}
        </Link>
        <span className="opacity-60 hidden sm:inline">|</span>
        <Link href="/login" className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded-full text-[11px] font-black inline-flex items-center gap-1 transition active:scale-95">
          <span>🔑</span>
          <span>{lang === 'km' ? 'ចូលប្រព័ន្ធហាង' : 'Store Login'}</span>
        </Link>
      </div>

      {/* ⭐️ Main Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-transparent flex items-center justify-center group-hover:scale-105 transition transform">
              <img 
                src="/sabayluk_icon.png" 
                alt="Sabay Luk Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight text-slate-900 group-hover:text-orange-600 transition">SABAY LUK</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  POS Cloud
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-wide">{t.brand_sub}</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-600">
            <a href="#partner-stores" className="hover:text-orange-600 transition flex items-center gap-1.5 text-slate-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{t.nav_partner_stores || 'ហាងដៃគូសហការ'}</span>
            </a>
            <a href="#features" className="hover:text-orange-600 transition">{t.nav_features}</a>
            <a href="#solutions" className="hover:text-orange-600 transition">{t.nav_solutions}</a>
            <a href="#pricing" className="hover:text-orange-600 transition">{t.nav_pricing}</a>
            <Link href="/faq" className="hover:text-orange-600 transition flex items-center gap-1 text-orange-600">
              <span>💡</span>
              <span>{t.nav_faq || 'សំណួរញឹកញាប់'}</span>
            </Link>
            <Link href="/privacy" className="hover:text-emerald-600 transition">
              {lang === 'km' ? 'ឯកជនភាព' : 'Privacy'}
            </Link>
            <Link href="/terms" className="hover:text-blue-600 transition">
              {lang === 'km' ? 'លក្ខខណ្ឌ' : 'Terms'}
            </Link>
          </nav>

          {/* Action CTAs & Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 transition shadow-xs cursor-pointer active:scale-95"
              title={lang === 'km' ? 'Switch to English' : 'ប្តូរទៅជាភាសាខ្មែរ'}
            >
              <span className="text-sm">{lang === 'km' ? '🇰🇭' : '🇬🇧'}</span>
              <span className="font-black">{lang === 'km' ? 'KH' : 'EN'}</span>
            </button>

            {/* Partner Stores Live Button (Replaces Demo button) */}
            <a
              href="#partner-stores"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-slate-700 hover:text-orange-600 hover:bg-orange-50 border border-slate-200 transition"
              title={lang === 'km' ? 'មើលហាងដៃគូដែលកំពុងដំណើរការ Live' : 'View Live Partner Stores'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>🏪</span>
              <span>{t.btn_partner_stores || 'ហាងដៃគូ Live'}</span>
            </a>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-slate-900 bg-slate-100 hover:bg-slate-200 hover:text-orange-600 border border-slate-300 transition shadow-xs active:scale-95"
              title={lang === 'km' ? 'ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រងហាងរបស់អ្នក (Store Sign In)' : 'Sign In to your store'}
            >
              <span>🔑</span>
              <span>{t.btn_login || 'ចូលប្រព័ន្ធ (Login)'}</span>
            </Link>

            <Link
              href="/register?plan=FREE"
              className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 active:scale-95 transition transform"
            >
              <span>🚀</span>
              <span className="hidden xs:inline sm:inline">{t.btn_create_free}</span>
              <span className="xs:hidden sm:hidden">បង្កើតហាង</span>
            </Link>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center text-base transition active:scale-95 cursor-pointer border border-slate-200 shrink-0 ml-0.5"
              aria-label="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* ⭐️ Mobile Navigation Slide-Down Drawer ⭐️ */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-1.5 text-xs font-bold text-slate-700">
              <a 
                href="#partner-stores" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{t.nav_partner_stores || 'ហាងដៃគូសហការ (Live)'}</span>
              </a>
              <a 
                href="#features" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition"
              >
                {t.nav_features}
              </a>
              <a 
                href="#solutions" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition"
              >
                {t.nav_solutions}
              </a>
              <a 
                href="#pricing" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition"
              >
                {t.nav_pricing}
              </a>
              <a 
                href="#how-it-works" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition"
              >
                {t.nav_how_it_works}
              </a>
              <Link 
                href="/faq" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-orange-50 text-orange-600 font-bold transition"
              >
                <span>💡</span>
                <span>{lang === 'km' ? 'មជ្ឈមណ្ឌលសំណួរញឹកញាប់ (FAQs Hub)' : 'Interactive FAQs Hub'}</span>
              </Link>
              <Link 
                href="/privacy" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-700 font-bold transition"
              >
                <span>🛡️</span>
                <span>{lang === 'km' ? 'គោលការណ៍ឯកជនភាព (Privacy Policy) — ច្បាប់ ១០០%' : 'Privacy Policy'}</span>
              </Link>
              <Link 
                href="/terms" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-blue-700 font-bold transition"
              >
                <span>⚖️</span>
                <span>{lang === 'km' ? 'លក្ខខណ្ឌប្រើប្រាស់សេវាកម្ម (Terms of Service)' : 'Terms of Service'}</span>
              </Link>
            </nav>
            <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-900 font-black text-center text-xs flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <span>🔑</span>
                <span>{t.btn_login || 'ចូលប្រព័ន្ធ (Store Login)'}</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ⭐️ Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 bg-gradient-to-b from-orange-50/50 via-white to-slate-50">
        {/* Glow decoration */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-orange-300/30 to-amber-200/30 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs sm:text-sm font-black mb-8 animate-in fade-in duration-500 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
            <span>{t.hero_badge}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.2] max-w-4xl mx-auto">
            {t.hero_title_1} <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 bg-clip-text text-transparent">
              {t.hero_title_highlight}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
            {t.hero_subtitle}
          </p>

          {/* Primary CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            <Link
              href="/register?plan=FREE"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition transform"
            >
              <span>🚀</span>
              <span>{t.hero_cta_register}</span>
            </Link>

            {/* Replaced Demo Button with Live Partner Stores Link */}
            <a
              href="#partner-stores"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-base font-black bg-white hover:bg-orange-50 text-slate-800 border-2 border-slate-200 shadow-sm hover:border-orange-300 transition"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>🏪</span>
              <span>{t.hero_cta_partner_stores || 'មើលហាងដៃគូសហការ Live'}</span>
            </a>

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-base font-black bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-900/25 hover:scale-105 active:scale-95 transition transform border border-slate-800"
              title={lang === 'km' ? 'ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រងហាងរបស់អ្នក' : 'Sign in to your store'}
            >
              <span>🔑</span>
              <span>{t.hero_cta_login || 'ចូលប្រព័ន្ធហាង (Sign In)'}</span>
            </Link>
          </div>

          {/* Trust Highlights Strip */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-black shrink-0">
                🎁
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">{t.trust_free_title}</p>
                <p className="text-[11px] text-slate-500 font-semibold">{t.trust_free_desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-black shrink-0">
                🇰🇭
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">{t.trust_khqr_title}</p>
                <p className="text-[11px] text-slate-500 font-semibold">{t.trust_khqr_desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center text-lg font-black shrink-0">
                🚚
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">{t.trust_delivery_title}</p>
                <p className="text-[11px] text-slate-500 font-semibold">{t.trust_delivery_desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-lg font-black shrink-0">
                ✈️
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">{t.trust_telegram_title}</p>
                <p className="text-[11px] text-slate-500 font-semibold">{t.trust_telegram_desc}</p>
              </div>
            </div>
          </div>

          {/* ⭐️ Live Partner Stores Quick Strip (Shows Real Stores Live) */}
          <div className="mt-8 pt-6 border-t border-slate-200/60 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                  {lang === 'km' ? 'ហាងដៃគូសហការផ្ទាល់ (Live):' : 'Active Live Partner Stores:'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
                {partnerStores.slice(0, 4).map((st) => {
                  const logo = getStoreLogoUrl(st);
                  return (
                    <a
                      key={st.slug || st.id}
                      href={`/store/${st.slug}`}
                      onClick={(e) => handleOpenStoreInBrowser(e, st.slug)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 shadow-xs hover:shadow-sm transition transform active:scale-95 cursor-pointer"
                      title={lang === 'km' ? `បើកទំព័រ ${st.name} លើ Browser` : `Open ${st.name} in Web Browser`}
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt={st.name}
                          className="w-4 h-4 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[9px] font-black">
                          {st.name?.slice(0, 1)?.toUpperCase() || '🛍️'}
                        </span>
                      )}
                      <span className="text-xs font-black text-slate-800 group-hover:text-orange-600 transition">
                        {st.name}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-slate-400 group-hover:translate-x-0.5 transition-transform">↗</span>
                    </a>
                  );
                })}
                <a
                  href="#partner-stores"
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 underline ml-1"
                >
                  {lang === 'km' ? 'មើលទាំងអស់ →' : 'View All →'}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ⭐️ Hero Visual Mockup Preview */}
        <div className="mt-14 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-slate-900 p-2 sm:p-4 shadow-2xl shadow-orange-500/10 border-4 border-slate-800">
            {/* Mock browser header */}
            <div className="flex items-center justify-between pb-3 px-3 border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-slate-400 hidden sm:inline">sabayluk.com/admin/dashboard (Sabay Luk POS Pro)</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t.pos_connected}</span>
              </div>
            </div>

            {/* Mockup POS Interface UI */}
            <div className="bg-slate-950 rounded-2xl p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 text-left font-sans">
              {/* Left POS Catalog preview (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-orange-500 text-white text-xs font-black">{t.pos_cat_shoes}</span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">{t.pos_cat_clothes}</span>
                    <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">{t.pos_cat_bags}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
                    <span className="text-amber-400">📷</span>
                    <span>{t.pos_gun_ready}</span>
                  </div>
                </div>

                {/* Sample product cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 hover:border-orange-500/50 transition">
                    <div className="h-24 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-3xl">
                      👟
                    </div>
                    <p className="text-xs font-black text-white mt-2 truncate">Nike Air Force 1 '07</p>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-orange-400 font-black">$45.00</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded font-bold">{t.pos_stock_label}: 18</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 hover:border-orange-500/50 transition">
                    <div className="h-24 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-3xl">
                      ⚡
                    </div>
                    <p className="text-xs font-black text-white mt-2 truncate">Adidas Samba OG</p>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-orange-400 font-black">$52.00</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded font-bold">{t.pos_stock_label}: 12</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 hover:border-orange-500/50 transition">
                    <div className="h-24 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-3xl">
                      👞
                    </div>
                    <p className="text-xs font-black text-white mt-2 truncate">Puma Suede Classic</p>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-orange-400 font-black">$38.00</span>
                      <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded font-bold">{t.pos_stock_label}: 4 ({t.pos_low_stock})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right POS Cart & Checkout Preview (4 cols) */}
              <div className="lg:col-span-4 bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-xs">
                    <span className="font-black text-white">{t.pos_cart_title}</span>
                    <span className="text-emerald-400 font-bold">{t.pos_items_count}</span>
                  </div>

                  <div className="space-y-2 mt-3 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Nike Air Force 1 (Size 42) x1</span>
                      <span className="font-bold text-white">$45.00</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Puma Suede (Size 41) x1</span>
                      <span className="font-bold text-white">$38.00</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{t.pos_total_usd}</span>
                    <span className="text-xl font-black text-orange-400">$83.00</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{t.pos_total_khr}</span>
                    <span className="font-bold text-slate-200">340,300 ៛</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-center">
                      <p className="text-[10px] text-blue-300 font-bold">🇰🇭 Bakong KHQR</p>
                      <p className="text-xs font-black text-blue-200 mt-0.5">{t.pos_scan_aba}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-center">
                      <p className="text-[10px] text-emerald-300 font-bold">💵 Cash / COD</p>
                      <p className="text-xs font-black text-emerald-200 mt-0.5">{t.pos_cash_cod}</p>
                    </div>
                  </div>

                  <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs shadow-md mt-2 flex items-center justify-center gap-1.5">
                    <span>{t.pos_print_btn}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ⭐️ Live Partner Stores Showcase (ហាងដែលសហការជាមួយ website យើងផ្ទាល់) */}
      <section id="partner-stores" className="py-20 sm:py-24 bg-gradient-to-b from-white via-orange-50/20 to-slate-50 border-b border-slate-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-3 border border-emerald-200 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{t.partner_section_eyebrow || '🏪 ដៃគូអាជីវកម្មពិតប្រាកដ • LIVE PARTNER STORES'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {t.partner_section_title || 'ហាងដែលសហការ & កំពុងដំណើរការលើប្រព័ន្ធ Sabay Luk'}
            </h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base font-medium">
              {t.partner_section_desc || 'ទស្សនាគេហទំព័រមុខហាងពិតប្រាកដ (Public Storefronts) របស់ដៃគូដែលកំពុងប្រើប្រាស់ Sabay Luk POS Cloud ក្នុងការលក់ទំនិញអនឡាញ និងគ្រប់គ្រងការបញ្ជាទិញ។'}
            </p>
            {/* Safety guarantee banner */}
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold shadow-xs">
              <span className="text-emerald-600 text-base">🛡️</span>
              <span>
                {lang === 'km'
                  ? 'រាល់តំណភ្ជាប់ទាំងអស់គឺបើកបង្ហាញតែគេហទំព័រមុខហាង (Customer Storefront) សម្រាប់អតិថិជនប៉ុណ្ណោះ — ផ្ទាំងគ្រប់គ្រងខាងក្នុងត្រូវបានការពារយ៉ាងតឹងរ៉ឹង'
                  : 'All links strictly open customer storefront websites only — internal administrative dashboards remain private and protected.'}
              </span>
            </div>
          </div>

          {/* Stores Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {(loadingStores && partnerStores.length === 0) ? (
              // Loading skeleton
              [1, 2, 3].map((sk) => (
                <div key={sk} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-200"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="h-10 bg-slate-100 rounded-xl"></div>
                  <div className="h-10 bg-slate-200 rounded-xl"></div>
                </div>
              ))
            ) : partnerStores.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500 font-medium">
                {lang === 'km' ? 'មិនទាន់មានហាងដៃគូបង្ហាញ' : 'No partner stores to display yet'}
              </div>
            ) : (
              partnerStores.map((st, idx) => {
                const logo = getStoreLogoUrl(st);
                const catName = getStoreCategoryName(st.business_type);
                const storefrontUrl = getCleanStoreUrl(st.slug);
                const desc = st.settings?.storeDescription || st.settings?.announcementText || (lang === 'km' ? 'ហាងលក់ទំនិញគុណភាពខ្ពស់ ផ្ដល់ទំនុកចិត្ត និងការបញ្ជាទិញរហ័សតាមអនឡាញ។' : 'Quality merchandise store offering fast & reliable online shopping.');

                return (
                  <div
                    key={st.slug || st.id}
                    className="bg-white rounded-3xl p-6 border-2 border-slate-200/90 hover:border-orange-400 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                  >
                    <div>
                      {/* Store Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {logo ? (
                            <img
                              src={logo}
                              alt={st.name}
                              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm group-hover:scale-105 transition"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
                              {st.name?.slice(0, 1)?.toUpperCase() || '🛍️'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-black text-lg text-slate-900 group-hover:text-orange-600 transition">
                                {st.name}
                              </h3>
                              <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-black" title="ដៃគូផ្ទៀងផ្ទាត់ផ្លូវការ">
                                ✓ Verified
                              </span>
                            </div>
                            <p className="text-xs font-bold text-orange-600 mt-0.5">
                              {catName}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live</span>
                          </span>

                          {idx === 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 text-slate-950 text-[10px] font-black shadow-xs border border-amber-300 animate-in fade-in" title="ហាងជួរមុខគេ មានទំនិញ និងការលក់ច្រើនជាងគេ">
                              <span>🏆</span>
                              <span>#1 Top</span>
                            </span>
                          )}
                          {idx === 1 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black" title="ចំណាត់ថ្នាក់លេខ ២">
                              <span>⭐</span>
                              <span>#2</span>
                            </span>
                          )}
                          {idx > 1 && (st.productCount > 0 || st.orderCount > 0) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-black">
                              <span>#{idx + 1}</span>
                            </span>
                          )}
                          {idx > 1 && (!st.productCount && !st.orderCount) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black" title="ហាងទើបបង្កើតថ្មី">
                              <span>🌱</span>
                              <span>{lang === 'km' ? 'ហាងថ្មី' : 'New'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Store Description */}
                      <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 font-medium mb-3">
                        {desc}
                      </p>

                      {/* ⭐️ Product Count & Sales Badges (Visual Ranking Highlights) ⭐️ */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {(st.productCount > 0) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-black shadow-2xs">
                            <span>📦</span>
                            <span>{st.productCount} {lang === 'km' ? 'មុខទំនិញ' : 'Products'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold">
                            <span>📦</span>
                            <span>{lang === 'km' ? 'ទំនិញថ្មីៗ (Coming Soon)' : 'Products soon'}</span>
                          </span>
                        )}

                        {(st.orderCount > 0) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black shadow-2xs">
                            <span>⚡</span>
                            <span>{st.orderCount} {lang === 'km' ? 'ការលក់ & បញ្ជាទិញ' : 'Orders'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-800 text-[10px] font-bold">
                            <span>🌱</span>
                            <span>{lang === 'km' ? 'ហាងទើបបង្កើតថ្មី' : 'Newly Registered'}</span>
                          </span>
                        )}
                      </div>

                      {/* Quick Metadata */}
                      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 font-medium mb-5">
                        {st.address && (
                          <div className="flex items-center gap-2 truncate">
                            <span>📍</span>
                            <span className="truncate">{st.address}</span>
                          </div>
                        )}
                        {st.phone && (
                          <div className="flex items-center gap-2">
                            <span>📞</span>
                            <span>{st.phone}</span>
                          </div>
                        )}
                        {st.telegram && (
                          <div className="flex items-center gap-2 text-sky-600">
                            <span>✈️</span>
                            <span>{st.telegram.startsWith('@') ? st.telegram : `@${st.telegram}`}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Public Storefront Link Button (Standard Browser Web Tab, NOT APP) */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenStoreInBrowser(e, st.slug)}
                        disabled={openingSlug === st.slug}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 active:scale-95 transition transform cursor-pointer disabled:opacity-80"
                        title={lang === 'km' ? 'បើកលើ Web Browser (Google Chrome / Edge)' : 'Open in Web Browser'}
                      >
                        <span className="text-base">{openingSlug === st.slug ? '⏳' : '🌐'}</span>
                        <span>
                          {openingSlug === st.slug
                            ? (lang === 'km' ? 'កំពុងបើកលើ Browser...' : 'Opening in Browser...')
                            : (t.partner_visit_storefront || 'ចូលមើលគេហទំព័រមុខហាង')}
                        </span>
                        <span className="text-base group-hover:translate-x-1 transition-transform">↗</span>
                      </button>

                      {/* Browser Link Address & Quick Copy Button */}
                      <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-600">
                        <a
                          href={`/store/${st.slug}`}
                          onClick={(e) => handleOpenStoreInBrowser(e, st.slug)}
                          className="hover:text-orange-600 hover:underline truncate flex items-center gap-1.5"
                          title="ចុចដើម្បីបើកលើ Web Browser"
                        >
                          <span className="text-xs">🔗</span>
                          <span className="truncate">sabayluk.com/store/{st.slug}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyStoreLink(st.slug)}
                          className="px-2 py-0.5 rounded-lg bg-white hover:bg-orange-50 border border-slate-200 text-slate-700 hover:text-orange-600 text-[10px] font-bold shrink-0 transition active:scale-95 shadow-2xs"
                          title="ចម្លងតំណភ្ជាប់ Link"
                        >
                          {copiedSlug === st.slug ? '✓ បានចម្លង' : '📋 Copy Link'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Callout to invite more merchants */}
          <div className="mt-14 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-black shrink-0">
                🚀
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">
                  {lang === 'km' ? 'តើអ្នកចង់ដាក់ហាងរបស់អ្នកលក់លើ Sabay Luk ដែរឬទេ?' : 'Want to launch your store on Sabay Luk?'}
                </h4>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  {lang === 'km' ? 'ចុះឈ្មោះបង្កើតហាងដោយឥតគិតថ្លៃក្នុងរយៈពេល ៦០ វិនាទី និងទទួលបានគេហទំព័រផ្ទាល់ខ្លួនភ្លាមៗ' : 'Register your free store in 60 seconds and get your own branded storefront instantly.'}
                </p>
              </div>
            </div>
            <Link
              href="/register?plan=FREE"
              className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition whitespace-nowrap"
            >
              {t.btn_create_free} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ⭐️ Features Showcase (ចំណុចពិសេសទាំង ៦ ធំៗ) */}
      <section id="features" className="py-20 sm:py-28 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">{t.feat_eyebrow}</h2>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {t.feat_title}
            </p>
            <p className="mt-4 text-slate-600 text-sm sm:text-base font-medium">
              {t.feat_desc}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-orange-300 transition group">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-black mb-6 group-hover:scale-110 transition">
                ⚡
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.feat_1_title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.feat_1_desc}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-orange-300 transition group">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-black mb-6 group-hover:scale-110 transition">
                📦
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.feat_2_title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.feat_2_desc}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-orange-300 transition group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-black mb-6 group-hover:scale-110 transition">
                🇰🇭
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.feat_3_title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.feat_3_desc}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-orange-300 transition group">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl font-black mb-6 group-hover:scale-110 transition">
                ✈️
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.feat_4_title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.feat_4_desc}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-orange-300 transition group">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center text-3xl font-black mb-6 group-hover:scale-110 transition">
                📊
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.feat_5_title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.feat_5_desc}
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 hover:shadow-xl hover:border-orange-300 transition group">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl font-black mb-6 group-hover:scale-110 transition">
                🛍️
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{t.feat_6_title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t.feat_6_desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ⭐️ Supported Business Types */}
      <section id="solutions" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">{t.sol_eyebrow}</h2>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t.sol_title}
          </p>
          <p className="mt-4 text-slate-600 text-sm sm:text-base font-medium max-w-2xl mx-auto">
            {t.sol_desc}
          </p>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-left">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-md transition">
              <span className="text-3xl mb-4 block">👗</span>
              <h4 className="font-black text-slate-900 text-base mb-1.5">{t.sol_1_title}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{t.sol_1_desc}</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-md transition">
              <span className="text-3xl mb-4 block">👟</span>
              <h4 className="font-black text-slate-900 text-base mb-1.5">{t.sol_2_title}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{t.sol_2_desc}</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-md transition">
              <span className="text-3xl mb-4 block">💄</span>
              <h4 className="font-black text-slate-900 text-base mb-1.5">{t.sol_3_title}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{t.sol_3_desc}</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-md transition">
              <span className="text-3xl mb-4 block">🛒</span>
              <h4 className="font-black text-slate-900 text-base mb-1.5">{t.sol_4_title}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{t.sol_4_desc}</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:shadow-md transition">
              <span className="text-3xl mb-4 block">📦</span>
              <h4 className="font-black text-slate-900 text-base mb-1.5">{t.sol_5_title}</h4>
              <p className="text-slate-500 text-xs leading-relaxed">{t.sol_5_desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ⭐️ Pricing Section (តារាងតម្លៃប្រកបដោយតម្លាភាព) */}
      <section id="pricing" className="py-20 sm:py-28 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">{t.pricing_eyebrow}</h2>
            <p className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {t.pricing_title}
            </p>
            <p className="mt-4 text-slate-600 text-sm sm:text-base font-medium">
              {t.pricing_desc}
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-100 border border-slate-200/90 shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.billing_monthly}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t.billing_yearly}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  billingCycle === 'yearly' ? 'bg-amber-300 text-slate-950' : 'bg-emerald-100 text-emerald-700 animate-pulse'
                }`}>
                  {t.billing_save_badge}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plans.map((p) => {
              const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly;
              const period = billingCycle === 'yearly' ? t.per_year : t.per_month;

              return (
                <div
                  key={p.key}
                  className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 ${
                    p.popular
                      ? 'bg-slate-900 text-white ring-4 ring-orange-500 shadow-2xl scale-100 md:-translate-y-2'
                      : 'bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300 hover:shadow-lg'
                  }`}
                >
                  {/* Top Badge */}
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                      {p.popular && (
                        <span className="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
                          MOST POPULAR
                        </span>
                      )}
                    </div>

                    <h3 className={`text-xl font-black ${p.popular ? 'text-white' : 'text-slate-900'}`}>{p.name}</h3>
                    <p className={`text-xs mt-0.5 font-bold ${p.popular ? 'text-orange-400' : 'text-slate-500'}`}>{p.title}</p>
                    <p className={`text-xs mt-2 leading-relaxed ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>{p.desc}</p>

                    {/* Price display */}
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black tracking-tight">
                        ${price}
                      </span>
                      <span className={`text-xs font-bold ${p.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                        {period}
                      </span>
                      {billingCycle === 'yearly' && p.savingsYearly > 0 && (
                        <span className="ml-2 text-[11px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {lang === 'km' ? `សន្សំ $${p.savingsYearly}` : `Save $${p.savingsYearly}`}
                        </span>
                      )}
                    </div>

                    {/* Core limits highlight */}
                    <div className={`mt-5 p-3 rounded-2xl text-xs font-bold space-y-1 ${p.popular ? 'bg-slate-800/80 text-slate-200' : 'bg-white border border-slate-200 text-slate-700'}`}>
                      <p className="flex items-center gap-1.5">
                        <span>📦</span>
                        <span><b>{p.productsText}</b></span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span>👤</span>
                        <span><b>{p.staffText}</b></span>
                      </p>
                    </div>

                    {/* Features List */}
                    <ul className="mt-6 space-y-2.5 text-xs">
                      {p.features.map((f, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 font-medium">
                          <span className={`shrink-0 font-bold ${p.popular ? 'text-orange-400' : 'text-emerald-600'}`}>✓</span>
                          <span className={p.popular ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Register Button */}
                  <div className="mt-8 pt-4 border-t border-slate-200/40">
                    <Link
                      href={`/register?plan=${p.key}&cycle=${billingCycle}`}
                      className={`w-full py-3.5 rounded-2xl font-black text-xs text-center flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${p.ctaClass}`}
                    >
                      <span>{p.ctaText}</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ⭐️ How it Works in 3 Steps */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">{t.steps_eyebrow}</h2>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t.steps_title}
          </p>
          <p className="mt-4 text-slate-600 text-sm sm:text-base font-medium max-w-xl mx-auto">
            {t.steps_desc}
          </p>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative">
              <span className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 font-black text-xl flex items-center justify-center mb-6">
                1
              </span>
              <h3 className="text-lg font-black text-slate-900 mb-2">{t.step_1_title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                {t.step_1_desc}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative">
              <span className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 font-black text-xl flex items-center justify-center mb-6">
                2
              </span>
              <h3 className="text-lg font-black text-slate-900 mb-2">{t.step_2_title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                {t.step_2_desc}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative">
              <span className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 font-black text-xl flex items-center justify-center mb-6">
                3
              </span>
              <h3 className="text-lg font-black text-slate-900 mb-2">{t.step_3_title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                {t.step_3_desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ⭐️ FAQ Section */}
      <section id="faq" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2">{t.faq_eyebrow}</h2>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{t.faq_title}</p>
            <p className="mt-3 text-slate-600 text-sm">{t.faq_desc}</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-black text-sm sm:text-base text-slate-900 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {faq.category && (
                      <span className="text-[10px] uppercase font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 shrink-0">
                        {faq.category}
                      </span>
                    )}
                    <span>{faq.q}</span>
                  </div>
                  <span className="text-orange-600 font-bold ml-4 text-lg">
                    {openFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="p-5 bg-white text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Link to dedicated FAQ Hub */}
          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-orange-600 text-white font-black text-xs transition shadow-md cursor-pointer active:scale-95"
            >
              <span>💡 {lang === 'km' ? 'ស្វែងរកសំណួរ និងមើលចម្លើយទាំងអស់ (10 FAQs)' : 'Browse & Search All 10 FAQs'}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ⭐️ Final CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            {t.cta_title}
          </h2>
          <p className="mt-4 text-orange-100 text-sm sm:text-base max-w-2xl mx-auto font-medium">
            {t.cta_desc}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register?plan=FREE"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-900 font-black text-sm shadow-xl hover:bg-slate-100 hover:scale-105 active:scale-95 transition transform cursor-pointer"
            >
              🚀 {t.cta_btn_start}
            </Link>
            <a
              href="#partner-stores"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-black/30 hover:bg-black/40 text-white border border-white/30 font-black text-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🏪</span>
              <span>{t.hero_cta_partner_stores || 'មើលហាងដៃគូសហការ Live'}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ⭐️ Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-white p-0.5 border border-slate-700 shrink-0 shadow-xs flex items-center justify-center">
                <img src="/sabayluk_icon.png" alt="Sabay Luk Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-lg text-white">SABAY LUK POS</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              {t.footer_desc}
            </p>
            <p className="text-slate-500 text-[11px]">
              &copy; {new Date().getFullYear()} Sabay Luk Platform. {t.footer_copyright}
            </p>
          </div>

          <div>
            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-3">
              {lang === 'km' ? 'ផលិតផល & សេវាកម្ម' : 'Products & Services'}
            </h4>
            <ul className="space-y-2">
              <li><a href="#partner-stores" className="hover:text-white transition">{lang === 'km' ? 'ហាងដៃគូសហការ' : 'Partner Stores'}</a></li>
              <li><a href="#features" className="hover:text-white transition">{t.feat_1_title}</a></li>
              <li><a href="#features" className="hover:text-white transition">{t.feat_2_title}</a></li>
              <li><a href="#features" className="hover:text-white transition">{t.feat_3_title}</a></li>
              <li><a href="#features" className="hover:text-white transition">{t.feat_4_title}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-3">{t.footer_quick_links}</h4>
            <ul className="space-y-2">
              <li><Link href="/login" className="hover:text-orange-400 font-bold text-orange-400 transition">🔑 {t.btn_login || 'ចូលប្រព័ន្ធ (Store Login)'}</Link></li>
              <li><a href="#partner-stores" className="hover:text-white transition">🏪 {lang === 'km' ? 'ហាងដៃគូសហការ (Live Stores)' : 'Partner Stores (Live)'}</a></li>
              <li><Link href="/plans" className="hover:text-white transition">💎 {t.nav_pricing} (Plans)</Link></li>
              <li><Link href="/faq" className="hover:text-orange-400 font-bold transition">💡 {lang === 'km' ? 'សំណួរញឹកញាប់ (FAQ)' : 'FAQ & Knowledge'}</Link></li>
              <li><Link href="/privacy" className="hover:text-emerald-400 font-bold transition">🛡️ {lang === 'km' ? 'គោលការណ៍ឯកជនភាព (Privacy Policy)' : 'Privacy Policy'}</Link></li>
              <li><Link href="/terms" className="hover:text-blue-400 font-bold transition">⚖️ {lang === 'km' ? 'លក្ខខណ្ឌប្រើប្រាស់ (Terms of Service)' : 'Terms of Service'}</Link></li>
              <li><Link href="/register" className="hover:text-white transition">🚀 {t.btn_create_free}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-3">{t.footer_contact_title}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span>📞</span>
                <span>096 720 5522 / 012 345 678</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✈️</span>
                <a
                  href="https://t.me/sabay_luk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition font-medium"
                >
                  Telegram: @sabay_luk
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>📍</span>
                <span>{lang === 'km' ? 'ភ្នំពេញ, ព្រះរាជាណាចក្រកម្ពុជា' : 'Phnom Penh, Kingdom of Cambodia'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-Strip */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Sabay Luk POS Cloud Platform. {lang === 'km' ? 'រក្សាសិទ្ធិគ្រប់យ៉ាងស្របតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។' : 'All rights reserved under the laws of the Kingdom of Cambodia.'}
          </div>
          <div className="flex items-center gap-4 font-bold">
            <Link href="/privacy" className="hover:text-slate-300 transition">{lang === 'km' ? 'គោលការណ៍ឯកជនភាព (Privacy)' : 'Privacy Policy'}</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-300 transition">{lang === 'km' ? 'លក្ខខណ្ឌប្រើប្រាស់ (Terms)' : 'Terms of Service'}</Link>
            <span>•</span>
            <Link href="/faq" className="hover:text-slate-300 transition">{lang === 'km' ? 'សំណួរញឹកញាប់ (FAQ)' : 'FAQ'}</Link>
          </div>
        </div>
      </footer>

      {/* ⭐️ Floating Toast Notification for Web Browser Launch */}
      {browserToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-orange-500 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xl">🌐</span>
          <span className="text-xs sm:text-sm font-black tracking-wide">{browserToast}</span>
        </div>
      )}
    </div>
  );
}
