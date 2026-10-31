import type { Metadata } from 'next';
import HistoryView from '@/components/HistoryView';

export const metadata: Metadata = { title: 'Geçmiş depremler · Deprem Nerede?' };

export default function HistoryPage() {
  return <HistoryView />;
}
