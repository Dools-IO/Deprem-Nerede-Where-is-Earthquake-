import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

const sources = [
  { id: 'usgs', name: 'USGS' },
  { id: 'ssn', name: 'SSN' },
  { id: 'koeri', name: 'KOERI' },
  { id: 'jma', name: 'JMA' },
  { id: 'iris', name: 'IRIS' },
  { id: 'ingv', name: 'INGV' },
  { id: 'geonet', name: 'GeoNet' },
  { id: 'ga', name: 'GA' },
  { id: 'esm', name: 'ESM' },
  { id: 'emsc', name: 'EMSC' },
];

export const metadata: Metadata = {
  title: 'Deprem Nerede? - Anlık Deprem Bilgileri',
  description: 'Dünya genelindeki son depremleri anlık olarak takip edin. Veriler güvenilir kaynaklardan düzenli olarak güncellenmektedir.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Navigation */}
          <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <Link href="/" className="flex items-center px-2 text-gray-900 font-semibold">
                    Deprem Nerede?
                  </Link>
                </div>
                <div className="flex items-center">
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                    <Link
                      href="/world-map"
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Dünya Haritası
                    </Link>
                    {sources.map((source) => (
                      <Link
                        key={source.id}
                        href={`/source/${source.id}`}
                        className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        {source.name}
                      </Link>
                    ))}
                    <Link
                      href="/api-docs"
                      className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-900"
                    >
                      API Dokümantasyon
                    </Link>
                  </div>
                  {/* Mobil menü butonu */}
                  <div className="sm:hidden">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
                    >
                      <span className="sr-only">Menüyü aç</span>
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {children}
          
          <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
              <p>Made with ❤️ for earthquake awareness and monitoring</p>
              <p>Bu uygulama bir Dools.IO uygulamasıdır.</p>
              <p>© {new Date().getFullYear()} Deprem Nerede - Tüm Hakları Saklıdır.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
} 