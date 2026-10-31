import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'Deprem Nerede? Dünya geneli canlı deprem haritası',
  description:
    'AFAD, Kandilli, EMSC, USGS ve 16 resmi kurumdan dünyadaki tüm depremleri tek haritada, canlı olarak takip edin.',
  icons: { icon: '/img/earthquake.png' },
};

export const viewport: Viewport = {
  themeColor: '#020617',
};

const NAV = [
  { href: '/', label: 'Harita' },
  { href: '/liste', label: 'Liste' },
  { href: '/gecmis', label: 'Geçmiş' },
  { href: '/api-docs', label: 'API' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <span aria-hidden>🌍</span> Deprem Nerede?
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
