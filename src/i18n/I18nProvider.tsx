'use client';

import { createContext, useContext, useMemo } from 'react';
import { DICTIONARIES, localePath, type Dictionary, type Locale } from '@/i18n';
import { getFormatters, type Formatters } from '@/lib/format';

interface I18n {
  locale: Locale;
  t: Dictionary;
  fmt: Formatters;
  /** Uygulama içi adresi aktif dile çevirir: href('/liste') */
  href: (path: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<I18n>(
    () => ({ locale, t: DICTIONARIES[locale], fmt: getFormatters(locale), href: (p) => localePath(locale, p) }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n, I18nProvider içinde kullanılmalı');
  return ctx;
}
