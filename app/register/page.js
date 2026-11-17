'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  registerNewStore, 
  generateSlug, 
  STORE_PLANS, 
  isStoreNameOrSlugTaken, 
  fetchAllStores, 
  submitSubscriptionPayment 
} from '../../lib/stores';

function RegisterStoreForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form states
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [businessType, setBusinessType] = useState('shoes_fashion');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [address, setAddress] = useState('');
  
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [pin, setPin] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('FREE');
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'yearly' or 'monthly'

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [duplicateStatus, setDuplicateStatus] = useState({ taken: false, message: '' });
  const [pendingPaidSuccessStore, setPendingPaidSuccessStore] = useState(null);

  // ⭐️ MODAL STATES ⭐️
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGmailVerifyModal, setShowGmailVerifyModal] = useState(false);

  // ⭐️ GMAIL OTP VERIFICATION STATES (FOR FREE PLAN) ⭐️
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpResentAlert, setOtpResentAlert] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [emailDeliveryStatus, setEmailDeliveryStatus] = useState(null);

  // ⭐️ PAID PLAN CHECKOUT & SLIP UPLOAD STATES ⭐️
  const [paymentSlipFile, setPaymentSlipFile] = useState(null);
  const [paymentSlipPreview, setPaymentSlipPreview] = useState(null);
  const [paymentTxRef, setPaymentTxRef] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Pending store data waiting for verification or slip upload
  const [pendingStoreData, setPendingStoreData] = useState(null);

  const [isSyncingStores, setIsSyncingStores] = useState(false);
  const [storesSyncedAt, setStoresSyncedAt] = useState(0);

  // Sync latest store records from Supabase on mount (Prunes any deleted ghost stores)
  useEffect(() => {
    fetchAllStores().then(() => {
      setStoresSyncedAt(Date.now());
    }).catch(() => {});
  }, []);

  // Compute effective slug
  const effectiveSlug = (storeSlug || generateSlug(storeName)).trim();

  // Real-time strict duplicate check for Store Name & URL Slug
  useEffect(() => {
    if (!storeName.trim() && !storeSlug.trim()) {
      setDuplicateStatus({ taken: false, message: '' });
      return;
    }
    const check = isStoreNameOrSlugTaken(storeName.trim(), effectiveSlug);
    setDuplicateStatus(check);
  }, [storeName, storeSlug, effectiveSlug, storesSyncedAt]);

  // Read URL query params (?plan=PRO&cycle=yearly)
  useEffect(() => {
    const planParam = searchParams.get('plan');
    const cycleParam = searchParams.get('cycle');
    if (planParam && STORE_PLANS[planParam.toUpperCase()]) {
      setSelectedPlan(planParam.toUpperCase());
    }
    if (cycleParam === 'monthly' || cycleParam === 'yearly') {
      setBillingCycle(cycleParam);
    }
  }, [searchParams]);

  // Handle store name change -> auto update slug
  const handleStoreNameChange = (val) => {
    setStoreName(val);
    if (!isSlugEdited) {
      setStoreSlug(generateSlug(val));
    }
  };

  // ⭐️ មុខងារផ្ញើលេខកូដ OTP ទៅកាន់ Gmail តាម Resend Cloud Mail API ⭐️
  const sendOtpEmail = async (email, code, storeName) => {
    setIsSendingOtp(true);
    setEmailDeliveryStatus(null);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode: code, storeName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailDeliveryStatus({
          sent: true,
          message: `📬 បានផ្ញើលេខកូដសម្ងាត់ OTP ទៅកាន់ Inbox Gmail ${email} រួចរាល់!`
        });
      } else {
        setEmailDeliveryStatus({
          sent: false,
          needDomain: !!data.needDomainVerification,
          message: data.needDomainVerification 
            ? 'Resend Test Mode: អនុញ្ញាតឱ្យផ្ញើទៅ Email ម្ចាស់គណនី (sabayluk@gmail.com)'
            : (data.error || 'មិនអាចផ្ញើទៅកាន់ Gmail បានឡើយ')
        });
      }
    } catch (err) {
      setEmailDeliveryStatus({
        sent: false,
        message: 'មិនអាចតភ្ជាប់ទៅកាន់ Email Server បានទេ'
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Form submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!storeName.trim()) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះហាងរបស់អ្នក!');
      return;
    }

    // ⭐️ ត្រួតពិនិត្យភាពជាន់គ្នានៃឈ្មោះហាង និង Link ដាច់ខាត ⭐️
    const dupCheck = isStoreNameOrSlugTaken(storeName.trim(), (storeSlug || generateSlug(storeName)).trim());
    if (dupCheck.taken) {
      setErrorMsg(dupCheck.message);
      return;
    }

    if (!ownerName.trim()) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះរបស់ម្ចាស់ហាង!');
      return;
    }
    if (!ownerEmail.trim() || !ownerEmail.includes('@') || !ownerEmail.includes('.')) {
      setErrorMsg('សូមបញ្ចូលអាសយដ្ឋាន Gmail / Email របស់ម្ចាស់ហាងឱ្យបានត្រឹមត្រូវ!');
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

    const cleanStoreData = {
      name: storeName.trim(),
      slug: (storeSlug || generateSlug(storeName)).trim(),
      business_type: businessType,
      phone: phone.trim(),
      telegram: telegram.trim(),
      address: address.trim() || 'រាជធានីភ្នំពេញ',
      owner_name: ownerName.trim(),
      owner_email: ownerEmail.trim().toLowerCase(),
      owner_username: ownerUsername.trim().toLowerCase(),
      pin: pin.trim(),
      plan: selectedPlan,
      billingCycle: billingCycle
    };

    setPendingStoreData(cleanStoreData);

    // ⭐️ FLOW 1: FREE PLAN ($0) -> MUST VERIFY GMAIL WITH OTP FIRST ⭐️
    if (selectedPlan === 'FREE') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setEnteredOtp('');
      setOtpError('');
      setOtpResentAlert(false);
      setShowGmailVerifyModal(true);
      sendOtpEmail(ownerEmail.trim(), code, storeName.trim());
      return;
    }

    // ⭐️ FLOW 2: PAID PLAN -> MUST PAY AND UPLOAD PAYMENT SLIP FIRST ⭐️
    setPaymentSlipFile(null);
    setPaymentSlipPreview(null);
    setPaymentTxRef('');
    setPaymentError('');
    setShowPaymentModal(true);
  };

  // Helper finalize registration & save session
  const handleFinalizeRegistration = async (finalData, isPaid = false, slipUrl = '') => {
    setLoading(true);
    try {
      const planInfo = STORE_PLANS[finalData.plan] || STORE_PLANS.FREE;
      const amount = finalData.billingCycle === 'yearly' ? planInfo.priceYearly : planInfo.price;

      const newStore = await registerNewStore({
        ...finalData,
        email_verified: true,
        payment_status: isPaid ? 'PENDING_APPROVAL' : 'FREE',
        status: isPaid ? 'PENDING_APPROVAL' : 'ACTIVE'
      });

      // 💳 ករណីកញ្ចប់បង់ប្រាក់ (PAID PLAN): កត់ត្រា Slip និងរង់ចាំ Admin Approve ដាច់ខាត (មិនឱ្យ Login ភ្លាមៗឡើយ)
      if (isPaid) {
        if (slipUrl) {
          await submitSubscriptionPayment({
            storeId: newStore.id,
            storeName: newStore.name,
            customerPhone: newStore.phone || '',
            planKey: finalData.plan,
            planName: planInfo.name,
            billingCycle: finalData.billingCycle,
            amount: amount,
            slipUrl: slipUrl,
            notes: paymentTxRef ? `Ref: ${paymentTxRef}` : 'បានបង់ប្រាក់ពេលចុះឈ្មោះហាងថ្មី (Payment on registration)'
          });
        }

        // Telegram instant notification ជូនដំណឹងទៅ Super Admin ឱ្យ Approve
        try {
          fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'new_store_registered_pending_approval',
              store: newStore,
              payment_status: 'PAID_SLIP_PENDING_APPROVAL',
              plan: planInfo.name,
              price: `$${amount} (${finalData.billingCycle === 'yearly' ? 'ប្រចាំឆ្នាំ' : 'ប្រចាំខែ'})`,
              slipUrl: slipUrl || '',
              ref: paymentTxRef || ''
            })
          }).catch(e => console.warn('Telegram notice skipped', e));
        } catch (tgErr) {}

        // 🔔 ជូនដំណឹង Realtime ឆ្លង Tab ទៅកាន់ Admin Dashboard
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('sabay_new_store_alert', JSON.stringify({
              action: 'new_store_registered_pending_approval',
              store: newStore,
              slipUrl: slipUrl || '',
              timestamp: Date.now()
            }));
            if ('BroadcastChannel' in window) {
              const bc = new BroadcastChannel('sabay_stores_sync');
              bc.postMessage({ type: 'NEW_STORE_PENDING_APPROVAL', store: newStore, slipUrl: slipUrl || '' });
              bc.close();
            }
          } catch (_) {}
        }

        setLoading(false);
        setIsSubmittingPayment(false);
        setPendingPaidSuccessStore(newStore);
        return;
      }

      // 🎁 ករណីកញ្ចប់ឥតគិតថ្លៃ (FREE PLAN): ផ្ទៀងផ្ទាត់ Gmail រួចហើយ អនុញ្ញាតឱ្យចូល Dashboard បានភ្លាមៗ
      setSuccessMsg(`🎉 ផ្ទៀងផ្ទាត់ Gmail ជោគជ័យ! ហាង "${newStore.name}" ត្រូវបានបង្កើតរួចរាល់។`);

      // Telegram notification
      try {
        fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'new_store_registered',
            store: newStore,
            payment_status: 'FREE_GMAIL_VERIFIED'
          })
        }).catch(e => console.warn('Telegram notice skipped', e));
      } catch (tgErr) {}

      // 🔔 ជូនដំណឹង Realtime ឆ្លង Tab ទៅកាន់ Admin Dashboard
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sabay_new_store_alert', JSON.stringify({
            action: 'new_store_registered',
            store: newStore,
            timestamp: Date.now()
          }));
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('sabay_stores_sync');
            bc.postMessage({ type: 'NEW_STORE_REGISTERED', store: newStore });
            bc.close();
          }
        } catch (_) {}
      }

      // Auto-login session for owner (Isolated store context)
      if (typeof window !== 'undefined') {
        const ownerStaff = {
          id: `STAFF-${newStore.id}-OWNER`,
          name: newStore.owner_name || newStore.name,
          email: newStore.owner_email,
          username: newStore.owner_username,
          pin: newStore.pin,
          password: newStore.pin,
          role: 'ADMIN',
          roleLabel: 'ម្ចាស់ហាង (Store Admin)',
          phone: newStore.phone,
          avatar: '👑',
          color: 'from-emerald-500 to-teal-600',
          permissions: {
            pos: true, orders: true, inventory: true, upload: true,
            analytics: true, expenses: true, customers: true, feedbacks: true,
            storefront: true, settings: true, invoice: true, api: true,
            staff: true, barcode: true, canViewCost: true
          },
          active: true,
          store_id: newStore.id,
          created_at: new Date().toISOString()
        };
        localStorage.setItem(`sabay_active_staff_${newStore.id}`, JSON.stringify(ownerStaff));
        localStorage.setItem(`sabay_staff_list_${newStore.id}`, JSON.stringify([ownerStaff]));
        localStorage.setItem('sabay_admin_active_store', JSON.stringify(newStore));
        localStorage.setItem('sabay_active_store', JSON.stringify(newStore));
        localStorage.setItem('sabay_admin_authenticated', 'true');
        localStorage.removeItem('sabay_admin_logged_out');
      }

      setTimeout(() => {
        router.push(`/admin/dashboard?store=${newStore.slug}`);
      }, 1500);

    } catch (err) {
      setErrorMsg(err.message || 'មានបញ្ហាបន្តិចបន្តួចពេលបង្កើតហាង សូមព្យាយាមម្តងទៀត!');
      setLoading(false);
      setIsSubmittingPayment(false);
    }
  };

  // ⭐️ VERIFY GMAIL OTP HANDLER (FOR FREE PLAN) ⭐️
  const handleVerifyOtpSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setOtpError('');

    if (!enteredOtp.trim() || enteredOtp.trim().length !== 6) {
      setOtpError('សូមវាយបញ្ចូលលេខកូដសម្ងាត់ OTP ចំនួន ៦ ខ្ទង់!');
      return;
    }

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setOtpError('❌ លេខកូដសម្ងាត់ OTP មិនត្រឹមត្រូវឡើយ! សូមពិនិត្យមើលសារក្នុង Gmail ម្តងទៀត។');
      return;
    }

    setShowGmailVerifyModal(false);
    await handleFinalizeRegistration(pendingStoreData, false);
  };

  // Resend OTP Code
  const handleResendOtp = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newCode);
    setEnteredOtp('');
    setOtpError('');
    setOtpResentAlert(true);
    if (pendingStoreData?.owner_email) {
      sendOtpEmail(pendingStoreData.owner_email, newCode, pendingStoreData.name);
    }
    setTimeout(() => setOtpResentAlert(false), 4000);
  };

  // ⭐️ PAID PLAN CHECKOUT & SLIP SUBMIT HANDLER ⭐️
  const handlePaidSlipSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setPaymentError('');

    if (!paymentSlipPreview) {
      setPaymentError('❌ សូម Upload រូបភាពបង្កាន់ដៃផ្ទេរប្រាក់ (Payment Slip) របស់អ្នកជាមុនសិន! មិនអាចរំលងការបង់ប្រាក់បានឡើយ។');
      return;
    }

    setIsSubmittingPayment(true);
    setShowPaymentModal(false);
    await handleFinalizeRegistration(pendingStoreData, true, paymentSlipPreview);
  };

  const planInfo = STORE_PLANS[selectedPlan] || STORE_PLANS.FREE;
  const currentPrice = billingCycle === 'yearly' ? planInfo.priceYearly : planInfo.price;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-[#ff6a00] selection:text-white">
      
      {/* Top Navigation */}
      <header className="px-6 py-4 bg-white border-b border-slate-200/80 flex items-center justify-between max-w-6xl mx-auto w-full sticky top-0 z-30 shadow-xs">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff6a00] to-orange-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-orange-500/25 group-hover:scale-105 transition">
            🛍️
          </div>
          <div>
            <span className="font-black text-lg tracking-wider text-slate-900">SABAY LUK</span>
            <span className="block text-[10px] text-orange-600 font-bold uppercase tracking-widest">Multi-Store SaaS</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">មានហាងរួចហើយមែនទេ?</span>
          <Link 
            href="/admin/dashboard" 
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-800 border border-slate-300 transition"
          >
            🔑 ចូលគណនី (Log In)
          </Link>
        </div>
      </header>

      {/* Main Registration Card */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col justify-center">
        
        {/* Banner Announcement */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black shadow-xs">
            <span>🎁</span>
            <span>បើកហាងថ្មីថ្ងៃនេះ — ជ្រើសរើស FREE ឬកញ្ចប់អាជីវកម្មតាមតម្រូវការ</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            បង្កើតហាង និងប្រព័ន្ធលក់ POS របស់អ្នកត្រឹម <span className="text-[#ff6a00]">១ នាទី</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            គ្រប់គ្រងទំនិញ ស្តុក ចេញវិក្កយបត្រកម្តៅ ស្កេន KHQR និងមានទំព័រមុខហាងផ្ទាល់ខ្លួនដាច់ដោយឡែក ១០០%
          </p>
        </div>

        {/* ⭐️ WAITING FOR ADMIN APPROVAL VIEW (FOR PAID PLANS) ⭐️ */}
        {pendingPaidSuccessStore ? (
          <div className="bg-white border-2 border-orange-200 rounded-3xl p-6 sm:p-10 shadow-xl shadow-orange-500/10 text-center animate-in zoom-in-95 duration-200 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-4xl shadow-lg shadow-orange-500/30 animate-pulse">
              ⏳
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
                <span>⚠️</span>
                <span>ស្ថានភាព៖ រង់ចាំការត្រួតពិនិត្យ និងអនុម័ត (Pending Approval)</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                បង្កាន់ដៃបង់ប្រាក់ត្រូវបានបញ្ជូនជោគជ័យ!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                សូមអរគុណសម្រាប់ការចុះឈ្មោះកញ្ចប់ <strong className="text-orange-600">{STORE_PLANS[pendingPaidSuccessStore.plan]?.name || pendingPaidSuccessStore.plan}</strong>! ប្រព័ន្ធបានទទួលបង្កាន់ដៃ (Slip) របស់លោកអ្នករួចរាល់ហើយ។
              </p>
            </div>

            {/* Store Information Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 max-w-md mx-auto text-left space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs text-slate-500 font-bold">ឈ្មោះហាង៖</span>
                <span className="text-xs font-black text-slate-900">{pendingPaidSuccessStore.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs text-slate-500 font-bold">តំណភ្ជាប់មុខហាង (Link)៖</span>
                <span className="text-xs font-mono font-bold text-orange-600">/store/{pendingPaidSuccessStore.slug}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs text-slate-500 font-bold">ម្ចាស់ហាង៖</span>
                <span className="text-xs font-bold text-slate-800">{pendingPaidSuccessStore.owner_name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs text-slate-500 font-bold">Gmail ម្ចាស់ហាង៖</span>
                <span className="text-xs font-mono font-bold text-blue-700">{pendingPaidSuccessStore.owner_email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">លេខទូរស័ព្ទ៖</span>
                <span className="text-xs font-mono font-bold text-slate-800">{pendingPaidSuccessStore.phone || '—'}</span>
              </div>
            </div>

            {/* Next Step Instructions */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 max-w-md mx-auto text-left text-xs text-blue-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-blue-950">
                <span>ℹ️</span>
                <span>ដំណាក់កាលបន្ទាប់៖</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-blue-800">
                <li>Super Admin នឹងផ្ទៀងផ្ទាត់បង្កាន់ដៃ និងចុច <strong>Approve</strong> (ជាទូទៅក្នុងរង្វង់ 5 - 15 នាទី)។</li>
                <li>នៅពេល Admin ចុច Approve រួចរាល់ លោកអ្នកអាចប្រើ <strong>Gmail</strong> និង <strong>លេខសម្ងាត់/PIN</strong> ដើម្បី Login ចូលដំណើរការហាងបានភ្លាមៗ។</li>
                <li>ប្រសិនបើលោកអ្នកប្រញាប់ សូមទំនាក់ទំនង Admin តាម Telegram: <strong className="text-blue-950">@Sabayluk</strong> ឬទូរស័ព្ទ <strong className="text-blue-950">096 720 5522</strong>។</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/admin/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white font-black text-xs transition shadow-md active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <span>🔑</span>
                <span>ទៅកាន់ទំព័រ Login (Go to Login)</span>
              </Link>
              <a
                href="https://t.me/Sabayluk"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs transition shadow-md active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>ឆាតទៅ Admin តាម Telegram</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setPendingPaidSuccessStore(null);
                  setStoreName('');
                  setStoreSlug('');
                  setOwnerName('');
                  setOwnerEmail('');
                  setPhone('');
                  setPin('');
                  setPaymentSlipFile(null);
                  setPaymentSlipPreview(null);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition text-center cursor-pointer"
              >
                ➕ ចុះឈ្មោះហាងមួយផ្សេងទៀត
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/60 relative overflow-hidden">
          
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center gap-2">
              <span>🎉</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Store Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 font-black text-xs flex items-center justify-center">1</span>
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">ព័ត៌មានហាង (Store Details)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ឈ្មោះហាងរបស់អ្នក (Store Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    placeholder="ឧ. Angkor Shoe, Bopha Fashion..."
                    className={`w-full bg-slate-50 hover:bg-white focus:bg-white border rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition ${
                      duplicateStatus.taken && duplicateStatus.reason === 'NAME_EXISTS'
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-300 focus:border-[#ff6a00]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ប្រភេទអាជីវកម្ម (Business Type)
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#ff6a00] rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition cursor-pointer"
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

              {/* Store URL Preview & Duplicate Real-time Guard */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  តំណភ្ជាប់មុខហាងផ្ទាល់ខ្លួន (Store URL Slug)
                </label>
                <div className={`flex items-center rounded-2xl bg-slate-50 border overflow-hidden px-3.5 py-2.5 transition ${
                  duplicateStatus.taken && (duplicateStatus.reason === 'SLUG_EXISTS' || duplicateStatus.reason === 'RESERVED_SLUG')
                    ? 'border-rose-400 bg-rose-50/40 focus-within:border-rose-500'
                    : 'border-slate-300 focus-within:border-[#ff6a00] focus-within:bg-white'
                }`}>
                  <span className="text-xs text-slate-400 font-mono select-none">sabayluk.com/store/</span>
                  <input
                    type="text"
                    value={storeSlug}
                    onChange={(e) => {
                      setIsSlugEdited(true);
                      setStoreSlug(generateSlug(e.target.value));
                    }}
                    placeholder="my-store"
                    className="flex-1 bg-transparent text-xs font-mono font-bold text-orange-600 outline-none ml-1"
                  />
                </div>

                {/* Real-time Availability & Conflict Banner */}
                {duplicateStatus.taken ? (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-start gap-2.5 shadow-sm">
                    <span className="text-xl leading-none">🚨</span>
                    <div className="space-y-1.5 flex-1">
                      <div className="font-black text-rose-900">ហាមដាក់ឈ្មោះហាង ឬ Link ជាន់គ្នាដាច់ខាត!</div>
                      <div>{duplicateStatus.message}</div>
                      <div className="text-[11px] text-rose-600 font-medium">⚠️ ប្រសិនបើលោកអ្នកទើបតែបានលុបហាងនេះ សូមចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទៀងផ្ទាត់ឡើងវិញជាមួយ Cloud Database៖</div>
                      <button
                        type="button"
                        disabled={isSyncingStores}
                        onClick={async () => {
                          setIsSyncingStores(true);
                          try {
                            await fetchAllStores();
                            setStoresSyncedAt(Date.now());
                            const check = isStoreNameOrSlugTaken(storeName.trim(), effectiveSlug);
                            setDuplicateStatus(check);
                            if (!check.taken) {
                              setErrorMsg('');
                            }
                          } finally {
                            setIsSyncingStores(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-xs transition cursor-pointer shadow-2xs"
                      >
                        <span>{isSyncingStores ? '🔄 កំពុងផ្ទៀងផ្ទាត់ Cloud...' : '🔄 ពិនិត្យឈ្មោះឡើងវិញ (Re-check Cloud)'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    ✨ Link នេះនឹងក្លាយជាអាសយដ្ឋានផ្លូវការរបស់ហាងអ្នកសម្រាប់ផ្ញើឱ្យអតិថិជនកុម្ម៉ង់ទិញ។
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    លេខទូរស័ព្ទហាង (Phone Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ឧ. 012 345 678"
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#ff6a00] rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Telegram សម្រាប់ទទួលដំណឹង (Username ឬ លេខ)
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="ឧ. @mystore_pos ឬ 012345678"
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#ff6a00] rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ទីតាំងហាង (Location / Address)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ឧ. ផ្ទះលេខ #12, ផ្លូវ 2004, សង្កាត់ទឹកថ្លា, ខណ្ឌសែនសុខ, រាជធានីភ្នំពេញ"
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#ff6a00] rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition"
                />
              </div>
            </div>

            {/* Step 2: Owner Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 font-black text-xs flex items-center justify-center">2</span>
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">គណនីម្ចាស់ហាង (Owner Account)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ឈ្មោះពេញរបស់ម្ចាស់ហាង <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="ឧ. សេង សុវាសនា..."
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    អាសយដ្ឋាន Gmail / Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="ឧ. yourname@gmail.com"
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 ប្រើសម្រាប់ស្វែងរកហាង និងផ្ទៀងផ្ទាត់សុវត្ថិភាព OTP
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Username ចូលប្រព័ន្ធ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerUsername}
                    onChange={(e) => setOwnerUsername(e.target.value)}
                    placeholder="ឧ. admin, mybrand"
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    លេខសម្ងាត់ PIN (៤-៦ ខ្ទង់) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-2xl px-4 py-3 text-base font-mono font-black text-center tracking-widest text-amber-600 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Choose Plan */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 font-black text-xs flex items-center justify-center">3</span>
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">ជ្រើសរើសកញ្ចប់ចាប់ផ្តើម (Starter Plan)</h3>
                </div>
                {/* Monthly / Yearly Switcher */}
                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-[#ff6a00] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    បង់ប្រចាំខែ
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      billingCycle === 'yearly' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>បង់ប្រចាំឆ្នាំ</span>
                    <span className="text-[9px] bg-amber-400 text-slate-900 font-black px-1.5 py-0.2 rounded-full">ចំណេញច្រើន</span>
                  </button>
                </div>
              </div>

              {/* Strategic Tip Banner */}
              {billingCycle === 'yearly' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
                  <span className="text-base shrink-0">💡</span>
                  <span><b>ចំណេញ $2 ដល់ $20 ក្នុងមួយឆ្នាំ៖</b> វេរតែម្តង ប្រើបានពេញ ៣៦៥ ថ្ងៃ មិនបាច់ឈឺក្បាលវេរ $1 ឬ $2 រាល់ខែ!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  {
                    key: 'FREE',
                    title: '🎁 ឥតគិតថ្លៃ (Free)',
                    price: '$0',
                    sub: 'រហូត (Lifetime)',
                    features: ['ទំនិញ ១៥ មុខ (Free)', '១ គណនី Admin', 'លក់លើ POS គ្មានដែនកំណត់', 'ព្រីនវិក្កយបត្រ & KHQR'],
                    badge: 'គ្មានហានិភ័យ'
                  },
                  {
                    key: 'STARTER',
                    title: '🌱 STARTER',
                    price: billingCycle === 'yearly' ? '$10' : '$1',
                    sub: billingCycle === 'yearly' ? '/ឆ្នាំ (សន្សំ $2)' : '/ខែ',
                    features: ['ទំនិញ ២៥ មុខ', '១ Admin + ១ បុគ្គលិក', 'គ្រប់គ្រងស្តុក & របាយការណ៍', 'ផ្ញើវិក្កយបត្រតាម Telegram'],
                    badge: 'ធូរថ្លៃបំផុត'
                  },
                  {
                    key: 'BASIC',
                    title: '⚡ BASIC',
                    price: billingCycle === 'yearly' ? '$20' : '$2',
                    sub: billingCycle === 'yearly' ? '/ឆ្នាំ (សន្សំ $4)' : '/ខែ',
                    features: ['ទំនិញ ៥០ មុខ', '១ Admin + ១ បុគ្គលិក', 'គ្រប់គ្រងអតិថិជន & ប្រាក់ចំណូល', 'លក់ Live & ហាងខ្នាតតូច'],
                    badge: 'ពេញនិយម'
                  },
                  {
                    key: 'PRO',
                    title: '🚀 PRO',
                    price: billingCycle === 'yearly' ? '$30' : '$3',
                    sub: billingCycle === 'yearly' ? '/ឆ្នាំ (សន្សំ $6)' : '/ខែ',
                    features: ['ទំនិញ ១០០ មុខ', '១ Admin + ១ បុគ្គលិក', 'ព្រីនតែម Barcode កម្តៅ', 'បុគ្គលិកឆ្លាស់វេន (Shifts)'],
                    badge: 'ពេញនិយមបំផុត',
                    highlight: true
                  },
                  {
                    key: 'BUSINESS',
                    title: '🔥 BUSINESS',
                    price: billingCycle === 'yearly' ? '$50' : '$5',
                    sub: billingCycle === 'yearly' ? '/ឆ្នាំ (សន្សំ $10)' : '/ខែ',
                    features: ['ទំនិញ ២០០ មុខ', '១ Admin + ២ បុគ្គលិក', 'ស្តុកច្រើន Size/Color', 'របាយការណ៍ហិរញ្ញវត្ថុស៊ីជម្រៅ'],
                    badge: 'សម្រាប់ហាងមធ្យម'
                  },
                  {
                    key: 'PREMIUM',
                    title: '💎 PREMIUM',
                    price: billingCycle === 'yearly' ? '$70' : '$7',
                    sub: billingCycle === 'yearly' ? '/ឆ្នាំ (សន្សំ $14)' : '/ខែ',
                    features: ['ទំនិញ ៥០០ មុខ', '១ Admin + ៣ បុគ្គលិក', 'មុខងារ CRM & កាតសមាជិក', 'បម្រុងទុកទិន្នន័យលើ Cloud'],
                    badge: 'កម្រិតខ្ពស់'
                  },
                  {
                    key: 'ENTERPRISE',
                    title: '👑 ENTERPRISE',
                    price: billingCycle === 'yearly' ? '$100' : '$10',
                    sub: billingCycle === 'yearly' ? '/ឆ្នាំ (សន្សំ $20)' : '/ខែ',
                    features: ['ទំនិញ ១,០០០ មុខ', '១ Admin + ៥ បុគ្គលិក', 'ពហុសាខា & ឃ្លាំងធំ', 'Master Control & VIP Support'],
                    badge: 'កម្រិតធំបំផុត'
                  }
                ].map((item) => {
                  const isSelected = selectedPlan === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => setSelectedPlan(item.key)}
                      className={`relative rounded-3xl p-5 border-2 transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#ff6a00] bg-orange-50/50 shadow-md ring-2 ring-[#ff6a00]/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {item.badge && (
                        <span className={`absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.highlight ? 'bg-[#ff6a00] text-white shadow-xs' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}

                      <div>
                        <h4 className="font-black text-sm text-slate-800">{item.title}</h4>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900">{item.price}</span>
                          <span className="text-xs text-slate-400 font-bold">{item.sub}</span>
                        </div>

                        <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                          {item.features.map((f, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-1.5">
                              <span className="text-emerald-500 font-bold text-xs">✓</span>
                              <span className="truncate font-medium">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        className={`mt-5 w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#ff6a00] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ បានជ្រើសរើស' : 'ជ្រើសរើសកញ្ចប់នេះ'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || duplicateStatus.taken}
                className={`w-full py-4 rounded-2xl font-black text-base shadow-lg transition flex items-center justify-center gap-2 ${
                  duplicateStatus.taken
                    ? 'bg-rose-500 text-white cursor-not-allowed opacity-90 shadow-rose-500/20'
                    : 'bg-gradient-to-r from-[#ff6a00] via-orange-500 to-amber-500 hover:from-[#e65c00] hover:to-orange-600 active:scale-[0.99] text-white shadow-orange-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <span>{duplicateStatus.taken ? '🚫' : (loading ? '⏳' : (selectedPlan === 'FREE' ? '📧' : '💳'))}</span>
                <span>
                  {duplicateStatus.taken 
                    ? 'ឈ្មោះហាង ឬ Link នេះមានម្ចាស់រួចហើយ (សូមប្តូរឈ្មោះដើម្បីបន្ត)'
                    : (loading 
                        ? 'កំពុងដំណើរការ...' 
                        : (selectedPlan === 'FREE' 
                            ? 'បង្កើតហាង (ឥតគិតថ្លៃ $0) — ផ្ទៀងផ្ទាត់តាម Gmail →' 
                            : `បន្តទៅបង់ប្រាក់ & Upload បង្កាន់ដៃ (កញ្ចប់ ${selectedPlan} • $${currentPrice}) →`))}
                </span>
              </button>
              {duplicateStatus.taken ? (
                <p className="text-center text-xs text-rose-600 font-bold mt-2.5">
                  🚨 ប្រព័ន្ធមិនអនុញ្ញាតឱ្យបង្កើតហាងដែលមានឈ្មោះ ឬ Link ជាន់គ្នាជាដាច់ខាត!
                </p>
              ) : (
                <p className="text-center text-[11px] text-slate-500 mt-2.5">
                  {selectedPlan === 'FREE' 
                    ? '🔒 កញ្ចប់ឥតគិតថ្លៃ — តម្រូវឱ្យផ្ទៀងផ្ទាត់ Gmail ដើម្បីសុវត្ថិភាពមុននឹងចូលប្រើប្រាស់'
                    : '💳 កញ្ចប់អាជីវកម្ម — តម្រូវឱ្យបង់ប្រាក់ និង Upload បង្កាន់ដៃផ្ទេរប្រាក់ (Slip) ដើម្បីដំណើរការហាង'}
                </p>
              )}
            </div>

          </form>

        </div>
        )}

      </main>

      {/* ⭐️ MODAL 1: GMAIL VERIFICATION MODAL (FOR FREE PLAN) ⭐️ */}
      {showGmailVerifyModal && pendingStoreData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-5">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl font-black mx-auto shadow-xs">
                📧
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                ផ្ទៀងផ្ទាត់អាសយដ្ឋាន Gmail
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                ដើម្បីសុវត្ថិភាព និងធានាថាអ្នកជាម្ចាស់ពិតប្រាកដ ប្រព័ន្ធបានផ្ញើលេខកូដសម្ងាត់ ៦ ខ្ទង់ (OTP) ទៅកាន់:
              </p>
              <div className="bg-blue-50/80 border border-blue-200 px-3.5 py-2 rounded-xl text-blue-800 font-mono text-xs font-black inline-block">
                {pendingStoreData.owner_email}
              </div>
            </div>

            {/* Resend Real Email Delivery Status & Feedback */}
            {isSendingOtp ? (
              <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 animate-pulse">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>កំពុងបញ្ជូនលេខកូដសម្ងាត់ទៅកាន់ Gmail...</span>
              </div>
            ) : emailDeliveryStatus?.sent ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl space-y-1.5 text-left animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>✅ បានផ្ញើលេខកូដសម្ងាត់ទៅ Inbox Gmail រួចរាល់!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                  សូមចូលទៅកាន់ <strong>Gmail</strong> របស់លោកអ្នក ({pendingStoreData.owner_email}) ពិនិត្យមើលសារក្នុង <strong>Inbox</strong> (ឬ Spam) ដើម្បីយកលេខកូដ ៦ ខ្ទង់មកវាយបញ្ចូលខាងក្រោម។
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 shadow-md space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-black">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    សារជូនដំណឹងលេខកូដសម្ងាត់ OTP
                  </span>
                  <span>ទើបផ្ញើមុននេះបន្តិច</span>
                </div>
                <p className="text-xs font-bold text-slate-100">
                  លេខកូដសម្ងាត់ OTP របស់អ្នកគឺ៖ <span className="font-mono text-amber-400 font-black text-base tracking-widest">{generatedOtp}</span>
                </p>
                <p className="text-[10px] text-slate-400">
                  {emailDeliveryStatus?.needDomain 
                    ? '(Resend Test Mode: អនុញ្ញាតឱ្យផ្ញើទៅ Gmail ម្ចាស់គណនី sabayluk@gmail.com — សម្រាប់ Email ផ្សេងអាចប្រើកូដខាងលើនេះបាន)'
                    : '(លេខកូដនេះមានសុពលភាពរយៈពេល ១០ នាទី — សូមកុំចែករំលែកជាមួយអ្នកដទៃ)'}
                </p>
              </div>
            )}

            {otpResentAlert && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center animate-in fade-in">
                📬 បានផ្ញើលេខកូដសម្ងាត់ថ្មីទៅកាន់ Gmail រួចរាល់!
              </div>
            )}

            {otpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center animate-in shake">
                {otpError}
              </div>
            )}

            {/* OTP Input Form */}
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-center text-xs font-bold text-slate-600 mb-2">
                  វាយបញ្ចូលលេខកូដ ៦ ខ្ទង់ខាងក្រោម:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center font-mono text-2xl font-black tracking-[0.5em] bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-2xl py-3 text-blue-900 outline-none shadow-xs transition"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="flex-1 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  🔄 ផ្ញើលេខកូដម្តងទៀត
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'កំពុងផ្ទៀងផ្ទាត់...' : '✓ ផ្ទៀងផ្ទាត់ និងបង្កើតហាង'}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowGmailVerifyModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold underline cursor-pointer"
                >
                  ✕ បោះបង់ / កែប្រែព័ត៌មាន
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ⭐️ MODAL 2: PAID PLAN PAYMENT CHECKOUT & SLIP UPLOAD (PREMIUM 2-COLUMN STANDARD LAYOUT) ⭐️ */}
      {showPaymentModal && pendingStoreData && (() => {
        const plan = STORE_PLANS[pendingStoreData.plan] || STORE_PLANS.STARTER;
        const totalAmount = pendingStoreData.billingCycle === 'yearly' ? plan.priceYearly : plan.price;
        const khrAmount = (totalAmount * 4100).toLocaleString();

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
              
              {/* ⭐️ FIXED TOP HEADER (ALWAYS VISIBLE & ACCESSIBLE) ⭐️ */}
              <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 z-10 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-2xl bg-orange-50 text-[#ff6a00] flex items-center justify-center text-xl font-black shrink-0 shadow-xs">
                    💳
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 truncate flex items-center gap-2">
                      <span>បង់ប្រាក់តាម KHQR & Upload បង្កាន់ដៃ (Slip)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        {plan.name}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      ហាង៖ <b className="text-slate-700">{pendingStoreData.name}</b> • {pendingStoreData.billingCycle === 'yearly' ? 'គម្រោងប្រចាំឆ្នាំ (១២ ខែ)' : 'គម្រោងប្រចាំខែ (១ ខែ)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 font-black flex items-center justify-center text-sm transition cursor-pointer shrink-0 ml-2"
                  title="បិទ (Close)"
                >
                  ✕
                </button>
              </div>

              {/* ⭐️ SCROLLABLE 2-COLUMN RESPONSIVE BODY ⭐️ */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                
                {paymentError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl text-center animate-in shake">
                    {paymentError}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  
                  {/* 👉 LEFT COLUMN: KHQR CODE & BANK DETAILS (6 COLUMNS) */}
                  <div className="lg:col-span-6 space-y-3.5">
                    
                    {/* Official KHQR Payment Card */}
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-slate-800 shadow-xl space-y-3.5">
                      
                      {/* Top Bank Badge */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 font-black text-[10px] tracking-wider uppercase text-white shadow-xs">
                            ABA BANK
                          </span>
                          <span className="text-xs font-black text-slate-200">គណនីក្រុមហ៊ុនផ្លូវការ</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-black bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>✓ ស្កេនបង់ប្រាក់ភ្លាមៗ</span>
                        </span>
                      </div>

                      {/* KHQR Card Box */}
                      <div className="w-full bg-white p-3 rounded-2xl shadow-xl border-2 border-red-500 text-center">
                        <div className="bg-[#e11938] text-white py-1 px-3 text-center font-black text-xs tracking-wider rounded-lg mb-2 uppercase flex items-center justify-center gap-1.5 shadow-xs">
                          <span>🇰🇭 BAKONG KHQR</span>
                        </div>

                        {/* QR Image Container (Clean & Standard Max Height) */}
                        <div className="overflow-hidden rounded-xl bg-white flex items-center justify-center">
                          <img
                            src="/khqr-aba.jpg"
                            alt="Owner ABA Bakong KHQR"
                            className="w-full max-h-[250px] sm:max-h-[280px] object-contain rounded-lg"
                          />
                        </div>

                        {/* Amount Tag */}
                        <div className="mt-2 text-center bg-orange-50 text-orange-700 font-black text-xs sm:text-sm py-1.5 rounded-xl border border-orange-200 font-mono">
                          ចំនួនទឹកប្រាក់ត្រូវបង់: ${totalAmount}.00 (≈ {khrAmount} ៛)
                        </div>
                      </div>

                      {/* Download Link & Tip */}
                      <div className="flex items-center justify-between text-xs pt-1 px-1">
                        <a
                          href="/khqr-aba.jpg"
                          download="ABA-KHQR-OFFICIAL.jpg"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                        >
                          <span>📥</span>
                          <span>ទាញយករូប QR ទុកស្កេន</span>
                        </a>
                        <span className="text-[11px] text-slate-400 font-medium">ស្កេនបានគ្រប់ App ធនាគារ</span>
                      </div>

                      {/* Bank Account Numbers info */}
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1 font-mono text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">ឈ្មោះគណនី:</span>
                          <span className="font-bold text-white">SENG SOVEASNA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ABA USD:</span>
                          <span className="font-bold text-white">010 723 080</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ABA KHR:</span>
                          <span className="font-bold text-white">004 500 394</span>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* 👉 RIGHT COLUMN: SLIP UPLOAD & SUBMIT (6 COLUMNS) */}
                  <div className="lg:col-span-6 space-y-4">
                    
                    {/* Order Summary Pill */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">កញ្ចប់សេវាកម្ម</span>
                        <p className="text-xs font-black text-slate-900 mt-0.5">
                          {plan.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          ហាង៖ <b>{pendingStoreData.name}</b>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">តម្លៃសរុប</span>
                        <p className="text-lg font-black text-[#ff6a00] leading-none mt-0.5">
                          ${totalAmount}.00
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">≈ {khrAmount} ៛</p>
                      </div>
                    </div>

                    {/* Quick Guide Card */}
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
                      <span className="text-base shrink-0">💡</span>
                      <div className="space-y-0.5">
                        <p className="font-black text-amber-950">របៀបបង់ប្រាក់ និងដំណើរការហាង៖</p>
                        <p className="text-amber-800">
                          ១. ស្កេន KHQR ខាងឆ្វេងនេះ ដើម្បីបង់ប្រាក់តាម App ធនាគារណាក៏បាន។<br/>
                          ២. <b>Screenshot បង្កាន់ដៃ (Slip)</b> រួច Upload ក្នុងប្រអប់ខាងក្រោម។
                        </p>
                      </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handlePaidSlipSubmit} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span>📸 Upload រូបភាពបង្កាន់ដៃផ្ទេរប្រាក់ (Slip)</span>
                            <span className="text-rose-500 font-black">*</span>
                          </label>
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            ចាំបាច់ដាច់ខាត
                          </span>
                        </div>

                        {!paymentSlipPreview ? (
                          <label className="border-2 border-dashed border-slate-300 hover:border-[#ff6a00] hover:bg-orange-50/30 rounded-2xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 group block bg-slate-50/50">
                            <span className="text-3xl group-hover:scale-110 transition">📤</span>
                            <div>
                              <span className="text-xs font-black text-slate-800 block">
                                ចុចទីនេះដើម្បីជ្រើសរើសរូបថតបង្កាន់ដៃ (Upload Slip)
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                គាំទ្រ PNG, JPG ឬ Screenshot វិក្កយបត្រពីធនាគារ
                              </span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              required
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setPaymentSlipFile(file);
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    setPaymentSlipPreview(ev.target?.result);
                                    setPaymentError('');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="p-3 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-200 bg-white shrink-0 shadow-xs">
                                <img src={paymentSlipPreview} alt="Slip" className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 text-emerald-800 font-black text-xs">
                                  <span>✓</span>
                                  <span>បានភ្ជាប់បង្កាន់ដៃជោគជ័យ</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                  {paymentSlipFile?.name || 'receipt_slip.png'}
                                </p>
                                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-1">
                                  រួចរាល់សម្រាប់ការផ្ទៀងផ្ទាត់
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentSlipFile(null);
                                setPaymentSlipPreview(null);
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                            >
                              ប្តូររូបភាព
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Optional Ref or Transaction Note */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          លេខកូដប្រតិបត្តិការ (Transaction ID) ឬកំណត់ចំណាំ (បើមាន)
                        </label>
                        <input
                          type="text"
                          value={paymentTxRef}
                          onChange={(e) => setPaymentTxRef(e.target.value)}
                          placeholder="ឧ. លេខ Ref ABA: 123456789"
                          className="w-full bg-slate-50 focus:bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#ff6a00] shadow-xs transition"
                        />
                      </div>

                      {/* Submit & Cancel Buttons */}
                      <div className="flex gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(false)}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          ‹ ត្រឡប់ក្រោយ
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingPayment || !paymentSlipPreview}
                          className="flex-2 py-3 px-4 bg-gradient-to-r from-[#ff6a00] to-orange-600 hover:from-[#e65c00] hover:to-orange-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg shadow-orange-500/25 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {isSubmittingPayment ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>កំពុងបញ្ជូនបង្កាន់ដៃ...</span>
                            </>
                          ) : (
                            <>
                              <span>📤</span>
                              <span>បញ្ជូនបង្កាន់ដៃ & បើកដំណើរការហាង</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                  </div>

                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p>© 2026 Sabay Luk POS Platform — ប្រព័ន្ធគ្រប់គ្រងហាង និងលក់ទំនិញសម្រាប់អាជីវកម្មកម្ពុជា</p>
      </footer>

    </div>
  );
}

export default function RegisterStorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <p className="font-bold text-sm text-slate-400">កំពុងផ្ទុកទំព័រចុះឈ្មោះ...</p>
      </div>
    }>
      <RegisterStoreForm />
    </Suspense>
  );
}
