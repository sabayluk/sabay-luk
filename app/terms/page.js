'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  const [lang, setLang] = useState('km');
  const [activeSection, setActiveSection] = useState('acceptance');

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
    { id: 'acceptance', titleKm: '១. ការទទួលយកលក្ខខណ្ឌ', titleEn: '1. Acceptance of Terms' },
    { id: 'eligibility', titleKm: '២. សិទ្ធិចុះឈ្មោះ & គណនី', titleEn: '2. Eligibility & Accounts' },
    { id: 'acceptable_use', titleKm: '៣. វិធាននៃការប្រើប្រាស់', titleEn: '3. Acceptable Use Policy' },
    { id: 'payments', titleKm: '៤. ការជាវសេវា & ការទូទាត់', titleEn: '4. Subscriptions & Billing' },
    { id: 'khqr_rules', titleKm: '៥. ការទូទាត់ Bakong KHQR', titleEn: '5. KHQR & Payments' },
    { id: 'intellectual_property', titleKm: '៦. កម្មសិទ្ធិបញ្ញា', titleEn: '6. Intellectual Property' },
    { id: 'liability', titleKm: '៧. កម្រិតនៃការទទួលខុសត្រូវ', titleEn: '7. Limitation of Liability' },
    { id: 'governing_law', titleKm: '៨. ច្បាប់គ្រប់គ្រង & យុត្តាធិការ', titleEn: '8. Governing Law' }
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
              <span className="text-[10px] uppercase font-bold text-blue-700 ml-1.5 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                {isEn ? 'Terms & Conditions' : 'លក្ខខណ្ឌប្រើប្រាស់'}
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-3">
            <span>⚖️</span>
            <span>{isEn ? 'Standard Merchant Service Agreement' : 'កិច្ចព្រមព្រៀងសេវាកម្មស្តង់ដារ'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            {isEn ? 'Terms of Service' : 'លក្ខខណ្ឌនៃការប្រើប្រាស់សេវាកម្ម'}
          </h1>
          <p className="mt-3 text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            {isEn
              ? 'Please read these terms carefully before creating or operating a store on Sabay Luk POS Cloud.'
              : 'សូមអានលក្ខខណ្ឌទាំងនេះឱ្យបានច្បាស់លាស់ មុនពេលចុះឈ្មោះ ឬប្រើប្រាស់ប្រព័ន្ធ Sabay Luk POS Cloud។'}
          </p>
          <div className="mt-4 text-[11px] font-bold text-slate-400">
            <span>{isEn ? 'Last Updated:' : 'កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាពចុងក្រោយ:'}</span>{' '}
            <span className="text-slate-700 font-mono font-black">{effectiveDate}</span>
          </div>
        </div>
      </div>

      {/* ⭐️ Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1 hidden lg:block sticky top-24 self-start space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-3 block mb-2">
              {isEn ? 'Navigation' : 'មាតិកា'}
            </span>
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`block px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeSection === s.id
                    ? 'bg-blue-50 text-blue-600 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {isEn ? s.titleEn : s.titleKm}
              </a>
            ))}
          </aside>

          {/* Legal Text */}
          <article className="lg:col-span-3 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xs space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
            
            {/* Section 1 */}
            <section id="acceptance" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-blue-600">§ 1.</span>
                <span>{isEn ? 'Acceptance of Terms' : 'ការទទួលយកលក្ខខណ្ឌនៃការប្រើប្រាស់'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    By accessing, registering for, or using the services of <b>Sabay Luk POS Cloud</b>, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you must not use our platform.
                  </>
                ) : (
                  <>
                    តាមរយៈការចូលប្រើប្រាស់ ការចុះឈ្មោះ ឬការប្រើសេវាកម្មរបស់ <b>Sabay Luk POS Cloud</b> អ្នកបានបញ្ជាក់ថាអ្នកបានអាន យល់ព្រម និងព្រមទទួលកាតព្វកិច្ចច្បាប់ស្របតាមលក្ខខណ្ឌប្រើប្រាស់នេះ និងគោលការណ៍ឯកជនភាពរបស់យើងខ្ញុំ។ ប្រសិនបើអ្នកមិនយល់ព្រមតាមលក្ខខណ្ឌទាំងនេះទេ សូមកុំប្រើប្រាស់ប្រព័ន្ធនេះ។
                  </>
                )}
              </p>
            </section>

            {/* Section 2 */}
            <section id="eligibility" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-blue-600">§ 2.</span>
                <span>{isEn ? 'Account Registration & Security' : 'សិទ្ធិចុះឈ្មោះ & សុវត្ថិភាពគណនី'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    Merchants must be at least 18 years old or possess legal business capacity under the laws of Cambodia. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your store account. You must notify us immediately of any unauthorized breach.
                  </>
                ) : (
                  <>
                    ម្ចាស់ហាងត្រូវមានអាយុយ៉ាងតិច ១៨ ឆ្នាំ ឬមានសមត្ថភាពគតិយុត្តក្នុងការប្រកបអាជីវកម្មស្របតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។ អ្នកមានទំនួលខុសត្រូវទាំងស្រុងក្នុងការរក្សាការសម្ងាត់នៃពាក្យសម្ងាត់គណនី និងរាល់សកម្មភាពទាំងអស់ដែលកើតឡើងក្រោមគណនីហាងរបស់អ្នក។
                  </>
                )}
              </p>
            </section>

            {/* Section 3 */}
            <section id="acceptable_use" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-blue-600">§ 3.</span>
                <span>{isEn ? 'Acceptable Use Policy' : 'វិធាននៃការប្រើប្រាស់ប្រព័ន្ធ'}</span>
              </h2>
              <p>
                {isEn ? 'You agree NOT to use Sabay Luk to sell or promote the following prohibited items:' : 'អ្នកយល់ព្រមមិនប្រើប្រាស់ប្រព័ន្ធ Sabay Luk ដើម្បីលក់ ឬផ្សព្វផ្សាយទំនិញហាមឃាត់ដូចខាងក្រោម៖'}
              </p>
              <ul className="space-y-1.5 pl-4 list-disc marker:text-rose-500 text-xs sm:text-sm text-slate-600">
                <li>{isEn ? 'Illegal narcotics, drugs, or illicit chemical substances.' : 'គ្រឿងញៀន ឬសារធាតុគីមីខុសច្បាប់គ្រប់ប្រភេទ។'}</li>
                <li>{isEn ? 'Firearms, explosives, weapons, or military contraband.' : 'អាវុធជាតិផ្ទុះ គ្រាប់រំសេវ ឬសម្ភារសឹកខុសច្បាប់។'}</li>
                <li>{isEn ? 'Counterfeit goods violating trademarks or copyrights.' : 'ទំនិញក្លែងបន្លំដែលរំលោភលើកម្មសិទ្ធិបញ្ញា ឬពាណិជ្ជសញ្ញា។'}</li>
                <li>{isEn ? 'Fraudulent schemes, pyramid schemes, or money laundering.' : 'ល្បែងស៊ីសងខុសច្បាប់ ឬអំពើលាងលុយកខ្វក់។'}</li>
              </ul>
              <p className="text-[11px] text-slate-500 italic">
                {isEn ? 'Violations will result in immediate termination of the store without prior notice.' : 'ការបំពានវិធានទាំងនេះ នឹងនាំឱ្យមានការបិទគណនីហាងជាបន្ទាន់ដោយមិនបាច់ជូនដំណឹងជាមុន។'}
              </p>
            </section>

            {/* Section 4 */}
            <section id="payments" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-blue-600">§ 4.</span>
                <span>{isEn ? 'Subscriptions & Transparent Pricing' : 'ការជាវសេវា & តម្លាភាពនៃតម្លៃ'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    Sabay Luk offers transparent pricing plans (FREE Lifetime, Starter, Pro, Enterprise, Platinum). Subscriptions are billed on a monthly or annual basis as chosen. There are no surprise setup charges or hidden maintenance fees. You can cancel or upgrade your subscription at any time.
                  </>
                ) : (
                  <>
                    Sabay Luk ផ្តល់ជូនកញ្ចប់សេវាតម្លាភាព (FREE Lifetime, Starter, Pro, Enterprise, Platinum)។ ការជាវសេវាត្រូវគិតជាប្រចាំខែ ឬប្រចាំឆ្នាំតាមការជ្រើសរើសរបស់អ្នក។ គ្មានការគិតថ្លៃលាក់កំបាំង ឬកម្រៃសេវាដំឡើងឡើយ។ អ្នកអាចប្ដូរកញ្ចប់ ឬផ្អាកការជាវបានគ្រប់ពេលវេលា។
                  </>
                )}
              </p>
            </section>

            {/* Section 5 */}
            <section id="khqr_rules" className="space-y-3 scroll-mt-24 bg-emerald-50/70 p-5 sm:p-6 rounded-3xl border border-emerald-200">
              <h2 className="text-lg sm:text-xl font-black text-emerald-950 flex items-center gap-2 pb-1">
                <span>🇰🇭</span>
                <span>{isEn ? 'Bakong KHQR Payments & 0% Commission' : 'ការទូទាត់ Bakong KHQR & គ្មានកាត់កម្រៃជើងសារ (0%)'}</span>
              </h2>
              <p className="text-emerald-900 text-xs sm:text-sm leading-relaxed">
                {isEn ? (
                  <>
                    When customers pay via Bakong KHQR, all transaction funds transfer directly from the customer’s bank account to the merchant’s designated bank account. <b>Sabay Luk is not an intermediary bank and DOES NOT take any commission or percentage fee</b> from merchant retail sales.
                  </>
                ) : (
                  <>
                    នៅពេលអតិថិជនស្កេនទូទាត់ប្រាក់តាម Bakong KHQR ទឹកប្រាក់ទាំងអស់នឹងផ្ទេរផ្ទាល់ពីធនាគាររបស់ភ្ញៀវចូលទៅកាន់គណនីធនាគាររបស់ម្ចាស់ហាងផ្ទាល់។ <b>Sabay Luk មិនមែនជាស្ថាប័នធនាគារកណ្ដាលកាត់កងលុយទេ ហើយមិនកាត់កម្រៃជើងសារពីការលក់របស់បងឡើយ (0% Commission)</b>។
                  </>
                )}
              </p>
            </section>

            {/* Section 6 */}
            <section id="intellectual_property" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-blue-600">§ 6.</span>
                <span>{isEn ? 'Intellectual Property Rights' : 'កម្មសិទ្ធិបញ្ញា'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    The platform software, interface, trademarks, and code of Sabay Luk remain the exclusive intellectual property of Sabay Luk. Conversely, you retain all rights and ownership to the logos, images, trademarks, and product catalog that you upload to your store.
                  </>
                ) : (
                  <>
                    ប្រព័ន្ធកម្មវិធី កូដ ចំណុចប្រទាក់ និងពាណិជ្ជសញ្ញារបស់ Sabay Luk គឺជាកម្មសិទ្ធិបញ្ញាផ្តាច់មុខរបស់ Sabay Luk។ ផ្ទុយទៅវិញ រាល់ Logo រូបភាពទំនិញ និងបញ្ជីឈ្មោះផលិតផលដែលអ្នកបានបញ្ចូលទៅក្នុងហាង គឺជាកម្មសិទ្ធិផ្តាច់មុខរបស់អ្នក។
                  </>
                )}
              </p>
            </section>

            {/* Section 7 */}
            <section id="liability" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-blue-600">§ 7.</span>
                <span>{isEn ? 'Limitation of Liability' : 'កម្រិតនៃការទទួលខុសត្រូវ'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    While we maintain 99.9% uptime and enterprise-grade cloud resilience, Sabay Luk shall not be liable for any indirect, incidental, or consequential damages resulting from third-party telecommunication failures, internet outages, or merchant transactions with buyers.
                  </>
                ) : (
                  <>
                    ទោះបីជាយើងខ្ញុំខិតខំធានាដំណើរការប្រព័ន្ធឱ្យបានរលូន ៩៩.៩% ក៏ដោយ Sabay Luk មិនទទួលខុសត្រូវចំពោះការខាតបង់ដែលបណ្តាលមកពីការដាច់ចរន្តអគ្គិសនី ឬបណ្ដាញអ៊ីនធឺណិតរបស់ក្រុមហ៊ុនទូរគមនាគមន៍ ឬវិវាទពាណិជ្ជកម្មផ្ទាល់រវាងម្ចាស់ហាង និងអ្នកទិញឡើយ។
                  </>
                )}
              </p>
            </section>

            {/* Section 8 */}
            <section id="governing_law" className="space-y-3 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="text-blue-600">§ 8.</span>
                <span>{isEn ? 'Governing Law & Dispute Resolution' : 'ច្បាប់គ្រប់គ្រង & ការដោះស្រាយវិវាទ'}</span>
              </h2>
              <p>
                {isEn ? (
                  <>
                    These Terms of Service are governed by and construed in accordance with the laws of the <b>Kingdom of Cambodia</b>. Any dispute arising out of or in connection with these terms shall first be resolved through friendly negotiation. If unresolved, it shall be submitted to the competent courts of the Kingdom of Cambodia.
                  </>
                ) : (
                  <>
                    លក្ខខណ្ឌនៃការប្រើប្រាស់សេវាកម្មនេះ ត្រូវបានគ្រប់គ្រង និងបកស្រាយស្របតាមច្បាប់នៃ<b>ព្រះរាជាណាចក្រកម្ពុជា</b>។ រាល់វិវាទដែលកើតឡើង ត្រូវដោះស្រាយជាបឋមតាមរយៈការចរចាដោយសន្តិវិធី។ ប្រសិនបើពុំអាចដោះស្រាយបានទេ វិវាទនឹងត្រូវបញ្ជូនទៅតុលាការមានសមត្ថកិច្ចនៃព្រះរាជាណាចក្រកម្ពុជា។
                  </>
                )}
              </p>
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
            <Link href="/privacy" className="hover:text-orange-600 transition">{isEn ? 'Privacy Policy' : 'គោលការណ៍ឯកជនភាព'}</Link>
            <Link href="/plans" className="hover:text-orange-600 transition">{isEn ? 'Pricing' : 'តារាងតម្លៃ'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
