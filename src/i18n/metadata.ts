import type { Metadata } from 'next';
import { getDictionary, isLocale, LOCALES, localePath, DEFAULT_LOCALE, type Locale } from '@/i18n';

/** Sayfa parametresinden dil (geçersizse varsayılan; geçersiz önekler zaten 404 olur) */
export async function resolveLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

/** Sayfa başlığı ve arama motorları için dil alternatifleri */
export function pageMetadata(locale: Locale, path: string, title?: string): Metadata {
  const t = getDictionary(locale);
  return {
    ...(title ? { title } : {}),
    description: t.meta.description,
    alternates: {
      canonical: localePath(locale, path),
      languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])),
    },
  };
}
