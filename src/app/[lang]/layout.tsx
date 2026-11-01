import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import { getDictionary, LOCALES } from '@/i18n';
import { I18nProvider } from '@/i18n/I18nProvider';
import { pageMetadata, resolveLocale } from '@/i18n/metadata';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-sans' });
const display = Space_Grotesk({ subsets: ['latin', 'latin-ext'], variable: '--font-display' });

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
    icons: { icon: '/icon.svg' },
  };
}

export const viewport: Viewport = {
  themeColor: '#060b18',
};

export default async function RootLayout({ children, params }: Params & { children: React.ReactNode }) {
  const locale = await resolveLocale(params);
  return (
    <html lang={locale}>
      <head>
        <Script
          src="https://analytics.dools.co/script.js"
          data-website-id="9f819264-a58a-47e2-b788-0dc5765c7383"
          strategy="afterInteractive"
        />
        <Script
          src="https://analytics.dools.co/recorder.js"
          data-website-id="9f819264-a58a-47e2-b788-0dc5765c7383"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} ${display.variable} font-sans antialiased`}>
        <I18nProvider locale={locale}>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
