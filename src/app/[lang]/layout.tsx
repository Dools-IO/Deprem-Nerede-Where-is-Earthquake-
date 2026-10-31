import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { I18nProvider } from '@/components/I18nProvider';
import LangSwitch from '@/components/LangSwitch';
import { DICTS, isLang, LANGS, pagePath, type Lang } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

// Yalnız tanımlı diller; her dil için sayfalar derlemede statik üretilir
export const dynamicParams = false;
export const generateStaticParams = () => LANGS.map((lang) => ({ lang }));

type Params = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = DICTS[lang];
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    icons: { icon: '/img/earthquake.png' },
    alternates: { languages: { tr: pagePath('tr', ''), en: pagePath('en', '') } },
  };
}

export const viewport: Viewport = {
  themeColor: '#020617',
};

export default async function RootLayout({ children, params }: Params & { children: React.ReactNode }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = DICTS[lang as Lang];
  const nav = [
    { href: pagePath(lang, ''), label: t.navMap },
    { href: pagePath(lang, '/liste'), label: t.navList },
    { href: pagePath(lang, '/gecmis'), label: t.navHistory },
    { href: pagePath(lang, '/api-docs'), label: t.navApi },
  ];

  return (
    <html lang={lang}>
      <body className={inter.className}>
        <I18nProvider lang={lang}>
          <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
            <Link href={pagePath(lang, '')} className="flex items-center gap-2 font-semibold text-white">
              <span aria-hidden>🌍</span> <span className="hidden sm:inline">{t.brand}</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
                  {n.label}
                </Link>
              ))}
              <LangSwitch />
            </nav>
          </header>
          <main>{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
