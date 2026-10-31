import type { Metadata } from 'next';
import HistoryView from '@/components/HistoryView';
import { pageMetadata } from '@/lib/pageMetadata';

export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> =>
  pageMetadata(params, '/gecmis', (t) => t.historyTitle);

export default function HistoryPage() {
  return <HistoryView />;
}
