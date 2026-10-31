import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { getDictionary, LOCALES } from '@/i18n';
import { I18nProvider } from '@/i18n/I18nProvider';
import { pageMetadata, resolveLocale } from '@/i18n/metadata';
import SiteHeader from '@/components/SiteHeader';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

type Params = { params: Promise<{ lang: string }> };

// Her dil derleme anında üretilir. Bilinmeyen önekler middleware'de zaten Türkçe yola
// yeniden yazılır; eşleşmeyen alt yollar [...rest] ile dilin kendi 404 sayfasını gösterir.
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale);
  return {
    ...pageMetadata(locale, '/'),
    title: { default: t.meta.homeTitle, template: `%s · ${t.meta.siteName}` },
    icons: { icon: '/img/earthquake.png' },
  };
}

export const viewport: Viewport = {
  themeColor: '#020617',
};

export default async function RootLayout({ children, params }: Params & { children: React.ReactNode }) {
  const locale = await resolveLocale(params);
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <I18nProvider locale={locale}>
          <SiteHeader />
          <main>{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
