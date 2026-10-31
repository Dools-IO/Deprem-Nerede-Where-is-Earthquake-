import { Suspense } from 'react';
import type { Metadata } from 'next';
import EarthquakeTable from '@/components/EarthquakeTable';
import { pageMetadata } from '@/lib/pageMetadata';

export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> =>
  pageMetadata(params, '/liste', (t) => t.listTitle);

export default function ListPage() {
  return (
    <Suspense>
      <EarthquakeTable initial={null} />
    </Suspense>
  );
}
