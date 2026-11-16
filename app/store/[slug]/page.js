'use client';

import { useParams } from 'next/navigation';
import CustomerStorefront from '../../components/CustomerStorefront';

export default function StoreFrontBySlug() {
  const params = useParams();
  const slug = params?.slug || '';
  return <CustomerStorefront storeSlug={slug} />;
}
