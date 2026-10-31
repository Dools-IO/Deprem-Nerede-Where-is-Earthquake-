/*
 * Dil ayarları. Yeni bir dil eklemek için: LOCALES'a kodunu ekleyin, `dictionaries/`
 * altına sözlüğünü yazın (tip, eksik anahtarı derlemede yakalar) ve sourceInfo'daki
 * bölge adlarını tamamlayın.
 */
export const LOCALES = ['tr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Varsayılan dil adreste önek almaz: /liste (tr), /en/liste (en) */
export const DEFAULT_LOCALE: Locale = 'tr';

/** Intl biçimlendiricileri için bölge kodu */
export const INTL_LOCALE: Record<Locale, string> = { tr: 'tr-TR', en: 'en-GB' };

/** Dil seçicide görünen ad */
export const LOCALE_LABEL: Record<Locale, string> = { tr: 'Türkçe', en: 'English' };

export const isLocale = (value: string | undefined): value is Locale =>
  !!value && (LOCALES as readonly string[]).includes(value);

/** Dile göre adres: localePath('en', '/liste') → '/en/liste' */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/**
 * Adresten dil önekini ayırır: '/en/liste' → { locale: 'en', path: '/liste' }.
 * İç yol da ('/tr/liste', statik sayfalarda usePathname bunu verebilir) doğru çözülür.
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split('/');
  if (isLocale(first)) return { locale: first, path: `/${rest.join('/')}` };
  return { locale: DEFAULT_LOCALE, path: pathname || '/' };
}

/** Kullanıcının dil seçimini tutan çerez */
export const LOCALE_COOKIE = 'lang';

/** Accept-Language başlığından tercih: Türkçe yoksa İngilizce, başlık yoksa (arama motorları) karar yok */
export function preferredLocale(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;
  const langs = acceptLanguage.split(',').map((part) => part.trim().toLowerCase());
  return langs.some((l) => l.startsWith('tr')) ? 'tr' : 'en';
}
