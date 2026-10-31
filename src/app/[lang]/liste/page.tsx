import { Suspense } from 'react';
import type { Metadata } from 'next';
import EarthquakeTable from '@/components/EarthquakeTable';
import { getDictionary } from '@/i18n';
import { pageMetadata, resolveLocale } from '@/i18n/metadata';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata(locale, '/liste', getDictionary(locale).meta.listTitle);
}

export default function ListPage() {
  return (
    <Suspense>
      <EarthquakeTable initial={null} />
    </Suspense>
  );
}
