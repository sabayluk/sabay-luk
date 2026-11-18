'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// ⭐️ Disable SSR for customer storefront to completely eliminate hydration mismatch ⭐️
const CustomerStorefront = dynamic(
  () => import('../../components/CustomerStorefront'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent shadow-md mb-4" />
        <p className="text-slate-600 font-bold text-sm">កំពុងផ្ទុកគេហទំព័រមុខហាង...</p>
      </div>
    )
  }
);

export default function StoreFrontBySlug() {
  const params = useParams();
  const slug = params?.slug || '';
  return <CustomerStorefront storeSlug={slug} />;
}
