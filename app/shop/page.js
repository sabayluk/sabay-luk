'use client';

import dynamic from 'next/dynamic';

const CustomerStorefront = dynamic(
  () => import('../components/CustomerStorefront'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent shadow-md mb-4" />
        <p className="text-slate-600 font-bold text-sm">កំពុងផ្ទុកទំនិញ...</p>
      </div>
    )
  }
);

export default function ShopPage() {
  return <CustomerStorefront storeSlug="sabay-luk" />;
}
