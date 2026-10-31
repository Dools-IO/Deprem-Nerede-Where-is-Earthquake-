'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nProvider';

export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <div className="page-bg flex items-center justify-center px-4 text-center text-slate-300">
      <div>
      <p className="mb-3 bg-gradient-to-b from-quake-400 to-quake-600 bg-clip-text font-display text-8xl font-bold text-transparent">404</p>
      <h1 className="mb-8 font-display text-2xl font-semibold text-white">{t.notFound.title}</h1>
      <Link href={href('/')} className="rounded-xl bg-gradient-to-b from-quake-400 to-quake-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,90,54,0.8)] hover:brightness-110">
        {t.notFound.back}
      </Link>
      </div>
    </div>
  );
}
