'use client';

import Link from 'next/link';
import { useI18n } from '@/components/I18nProvider';
import { pagePath } from '@/lib/i18n';

export default function NotFound() {
  const { lang, t } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center text-slate-300">
      <h1 className="mb-4 text-3xl font-bold text-white">404 · {t.notFound}</h1>
      <Link href={pagePath(lang, '')} className="text-sky-400 hover:underline">
        {t.backToMap}
      </Link>
    </div>
  );
}
