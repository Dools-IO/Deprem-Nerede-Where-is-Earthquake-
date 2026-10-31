'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LOCALES, LOCALE_COOKIE, LOCALE_LABEL, localePath, splitLocale, type Locale } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import Logo from './Logo';
import { IconCode, IconHistory, IconList, IconMap } from './ui';

export default function SiteHeader() {
  const { t, locale, href } = useI18n();
  const { path } = splitLocale(usePathname() ?? '/');
  const [menuOpen, setMenuOpen] = useState(false);

  // Sayfa değişince mobil menüyü kapat
  useEffect(() => setMenuOpen(false), [path]);

  const nav = [
    { path: '/', label: t.nav.map, Icon: IconMap },
    { path: '/liste', label: t.nav.list, Icon: IconList },
    { path: '/gecmis', label: t.nav.history, Icon: IconHistory },
    { path: '/api-docs', label: t.nav.api, Icon: IconCode },
  ];
  const isActive = (p: string) => (p === '/' ? path === '/' : path.startsWith(p));

  // Dil değişince kök düzen değişir; tam sayfa geçişi. Seçim çereze yazılır, sonraki ziyaretlerde geçerli
  const langLink = (l: Locale) => (
    <a
      key={l}
      href={localePath(l, path)}
      hrefLang={l}
      lang={l}
      title={LOCALE_LABEL[l]}
      aria-label={`${t.nav.language}: ${LOCALE_LABEL[l]}`}
      aria-current={l === locale ? 'true' : undefined}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      }}
      className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
        l === locale ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-200'
      }`}
    >
      {l}
    </a>
  );

  return (
    <header className="relative z-[1100] border-b border-white/[0.06] bg-ink-950/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
        <Link href={href('/')} className="group mr-auto flex min-w-0 items-center gap-3">
          <Logo className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover:rotate-12" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[17px] font-bold tracking-tight text-white">{t.meta.siteName}</span>
            <span className="hidden truncate text-[11px] font-medium text-slate-400 sm:block">{t.nav.tagline}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border border-white/[0.06] bg-ink-900/70 p-1 text-sm md:flex">
          {nav.map(({ path: p, label, Icon }) => (
            <Link
              key={p}
              href={href(p)}
              aria-current={isActive(p) ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-medium transition-all ${
                isActive(p)
                  ? 'bg-gradient-to-b from-white/[0.12] to-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive(p) ? 'text-quake-400' : ''}`} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center rounded-xl border border-white/[0.06] bg-ink-900/70 p-1">{LOCALES.map(langLink)}</div>

        <button
          className="rounded-xl border border-white/[0.06] bg-ink-900/70 p-2 text-slate-300 hover:text-white md:hidden"
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
        <nav className="absolute inset-x-0 top-16 grid grid-cols-2 gap-2 border-b border-white/[0.06] bg-ink-950 p-3 text-sm shadow-2xl md:hidden">
          {nav.map(({ path: p, label, Icon }) => (
            <Link
              key={p}
              href={href(p)}
              aria-current={isActive(p) ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 font-medium ${
                isActive(p) ? 'border-quake-500/40 bg-quake-500/10 text-white' : 'border-white/[0.06] bg-ink-900/70 text-slate-300'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive(p) ? 'text-quake-400' : 'text-slate-500'}`} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
