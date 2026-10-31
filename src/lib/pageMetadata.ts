import type { Metadata } from 'next';
import { DICTS, isLang, pagePath, type Dict, type Page } from '@/lib/i18n';

/** Alt sayfa başlığı ("Başlık · Deprem Nerede?") ve öbür dildeki karşılığının bağlantısı */
export async function pageMetadata(
  params: Promise<{ lang: string }>,
  page: Page,
  title: (t: Dict) => string,
): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = DICTS[lang];
  return {
    title: `${title(t)} · ${t.brand}`,
    alternates: { languages: { tr: pagePath('tr', page), en: pagePath('en', page) } },
  };
}
