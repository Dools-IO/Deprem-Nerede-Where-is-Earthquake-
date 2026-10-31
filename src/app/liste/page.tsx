import { Suspense } from 'react';
import type { Metadata } from 'next';
import EarthquakeTable from '@/components/EarthquakeTable';

export const metadata: Metadata = { title: 'Son depremler listesi · Deprem Nerede?' };

export default function ListPage() {
  return (
    <Suspense>
      <EarthquakeTable initial={null} />
    </Suspense>
  );
}
