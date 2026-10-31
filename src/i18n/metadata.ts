import type { Metadata } from 'next';
import { getDictionary, isLocale, LOCALES, localePath, DEFAULT_LOCALE, type Locale } from '@/i18n';

/** Sayfa parametresinden dil (geçersizse varsayılan; geçersiz önekler zaten 404 olur) */
export async function resolveLocale(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

/** Paylaşım önizlemelerindeki mutlak adresler için sitenin kökü */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://earthquake.dools.co';

/** Sayfa başlığı, arama motorları için dil alternatifleri ve paylaşım önizlemesi (Open Graph) */
export function pageMetadata(locale: Locale, path: string, title?: string): Metadata {
  const t = getDictionary(locale);
  const image = { url: `/og/${locale}.png`, width: 1200, height: 630, alt: t.meta.homeTitle };
  return {
    metadataBase: new URL(SITE_URL),
    ...(title ? { title } : {}),
    description: t.meta.description,
    openGraph: {
      type: 'website',
      siteName: t.meta.siteName,
      title: title ? `${title} · ${t.meta.siteName}` : t.meta.homeTitle,
      description: t.meta.description,
      url: localePath(locale, path),
      locale: locale === 'tr' ? 'tr_TR' : 'en_GB',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: title ? `${title} · ${t.meta.siteName}` : t.meta.homeTitle,
      description: t.meta.description,
      images: [image.url],
    },
    alternates: {
      canonical: localePath(locale, path),
      languages: Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])),
    },
  };
}
