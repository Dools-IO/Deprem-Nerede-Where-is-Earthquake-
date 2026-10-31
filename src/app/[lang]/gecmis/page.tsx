import type { Metadata } from 'next';
import HistoryView from '@/components/HistoryView';
import { getDictionary } from '@/i18n';
import { pageMetadata, resolveLocale } from '@/i18n/metadata';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return pageMetadata(locale, '/gecmis', getDictionary(locale).meta.historyTitle);
}

export default function HistoryPage() {
  return <HistoryView />;
}
