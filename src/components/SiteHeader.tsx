'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LOCALES, LOCALE_COOKIE, LOCALE_LABEL, localePath, splitLocale } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';

export default function SiteHeader() {
  const { t, locale, href } = useI18n();
  const { path } = splitLocale(usePathname() ?? '/');
  const [menuOpen, setMenuOpen] = useState(false);

  // Sayfa değişince mobil menüyü kapat
  useEffect(() => setMenuOpen(false), [path]);

  const nav = [
    { path: '/', label: t.nav.map },
    { path: '/liste', label: t.nav.list },
    { path: '/gecmis', label: t.nav.history },
    { path: '/api-docs', label: t.nav.api },
  ];
  const isActive = (p: string) => (p === '/' ? path === '/' : path.startsWith(p));
  const other = LOCALES.find((l) => l !== locale)!;

  const links = (className: string) =>
    nav.map((n) => (
      <Link
        key={n.path}
        href={href(n.path)}
        aria-current={isActive(n.path) ? 'page' : undefined}
        className={`${className} rounded-md px-3 py-1.5 transition-colors ${
          isActive(n.path) ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        {n.label}
      </Link>
    ));

  return (
    <header className="relative z-[1100] border-b border-slate-800 bg-slate-950">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <Link href={href('/')} className="mr-auto flex min-w-0 items-center gap-2 font-semibold text-white">
          <span aria-hidden className="text-lg">🌍</span>
          <span className="truncate">{t.meta.siteName}</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">{links('')}</nav>
        {/* Dil değişince kök düzen değişir; tam sayfa geçişi. Seçim çereze yazılır, sonraki ziyaretlerde geçerli */}
        <a
          href={localePath(other, path)}
          hrefLang={other}
          lang={other}
          title={LOCALE_LABEL[other]}
          aria-label={`${t.nav.language}: ${LOCALE_LABEL[other]}`}
          onClick={() => {
            document.cookie = `${LOCALE_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`;
          }}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300 hover:border-slate-500 hover:text-white"
        >
          {other}
        </a>
        <button
          className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white sm:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={t.nav.menu}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            {menuOpen ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
          </svg>
        </button>
      </div>
      {menuOpen && (
        <nav className="absolute inset-x-0 top-14 flex flex-col gap-1 border-b border-slate-800 bg-slate-950 p-2 text-sm shadow-xl sm:hidden">
          {links('block py-2.5')}
        </nav>
      )}
    </header>
  );
}
