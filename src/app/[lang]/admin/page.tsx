import type { Metadata } from 'next';
import AdminPanel from '@/components/AdminPanel';
import { getDictionary } from '@/i18n';
import { resolveLocale } from '@/i18n/metadata';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = await resolveLocale(params);
  return { title: getDictionary(locale).admin.title, robots: { index: false, follow: false } };
}

export default function AdminPage() {
  return <AdminPanel />;
}
