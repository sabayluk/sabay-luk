'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-black text-slate-300 tracking-wider">
          កំពុងភ្ជាប់ទៅកាន់ផ្ទាំងគ្រប់គ្រង Sabay Luk Admin...
        </p>
      </div>
    </div>
  );
}
