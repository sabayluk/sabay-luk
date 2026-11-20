'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // ⭐️ ប្រសិនបើបាន Login រួចរាល់ក្នុងរង្វង់ ៣០ ថ្ងៃ (១ ខែ) ចូល Dashboard ភ្លាមៗដោយមិនបាច់សួរ Password ⭐️
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem('sabay_admin_authenticated') === 'true';
      const isLoggedOut = localStorage.getItem('sabay_admin_logged_out') === 'true';
      const expiresAtStr = localStorage.getItem('sabay_admin_session_expires_at');
      const isExpired = expiresAtStr && (Date.now() > parseInt(expiresAtStr, 10));

      if (isAuth && !isLoggedOut && !isExpired) {
        router.replace('/admin/dashboard');
        return;
      }
    }
    // Redirect directly to the Admin / Store Login Portal
    router.replace('/admin/dashboard?login=true');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <p className="text-base font-black text-white tracking-wide">
            🔑 កំពុងបើកផ្ទាំងចូលប្រព័ន្ធ Sabay Luk Login Portal...
          </p>
          <p className="text-xs text-slate-400">
            សូមរង់ចាំមួយភ្លែត ប្រព័ន្ធកំពុងនាំអ្នកទៅកាន់ទំព័រ Login
          </p>
        </div>
      </div>
    </div>
  );
}
