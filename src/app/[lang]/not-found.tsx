'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';

export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center text-slate-300">
      <p className="mb-2 text-5xl font-bold text-slate-600">404</p>
      <h1 className="mb-6 text-2xl font-semibold text-white">{t.notFound.title}</h1>
      <Link href={href('/')} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
        {t.notFound.back}
      </Link>
    </div>
  );
}
