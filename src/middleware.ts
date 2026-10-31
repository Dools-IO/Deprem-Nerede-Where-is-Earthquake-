import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localePath, preferredLocale } from '@/i18n/config';
import { checkAccess, clientIp, type RuleName } from '@/lib/accessControl';

/*
 * Hız sınırı ve ban/izin kuralları lib/accessControl'da; middleware Node çalışma
 * ortamında koşar ki admin uçları aynı sayaçları görebilsin.
 */

/** İstek sitenin kendi sayfasından mı? Eski tarayıcılar Sec-Fetch-Site göndermez; o zaman Referer'a bakılır */
function fromOwnSite(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const referer = req.headers.get('referer');
  try {
    return !!referer && new URL(referer).host === req.headers.get('host');
  } catch {
    return false;
  }
}

/** Hangi kural: sitenin kendi uçları mı, herkese açık API mi, geçmiş mi */
function scopeFor(pathname: string): RuleName {
  if (pathname.startsWith('/api/admin/')) return 'admin';
  const app = pathname.startsWith('/api/app/');
  const history = pathname.endsWith('/history');
  return app ? (history ? 'appHistory' : 'app') : history ? 'publicHistory' : 'public';
}

/*
 * Sayfa adresleri: varsayılan dil önek almaz (/liste), diğer diller alır (/en/liste).
 * Uygulama içinde tüm sayfalar app/[lang] altında olduğundan öneksiz adres içeride
 * varsayılan dile yönlendirilir (rewrite; adres çubuğu değişmez).
 */
function localeRouting(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split('/')[1];
  if (first === DEFAULT_LOCALE) {
    // /tr/liste → /liste: tek bir kanonik adres kalsın
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || '/';
    return NextResponse.redirect(url, 308);
  }
  if (isLocale(first)) return NextResponse.next();
  const url = req.nextUrl.clone();
  // Öneksiz (Türkçe) adres: kullanıcı başka dil seçtiyse ya da ilk ziyarette tarayıcısı
  // Türkçe istemiyorsa o dile yönlendir. Accept-Language göndermeyen arama motorları Türkçede kalır.
  const chosen = req.cookies.get(LOCALE_COOKIE)?.value;
  const wanted = isLocale(chosen) ? chosen : preferredLocale(req.headers.get('accept-language'));
  if (req.method === 'GET' && wanted && wanted !== DEFAULT_LOCALE) {
    url.pathname = localePath(wanted, pathname);
    return NextResponse.redirect(url);
  }
  url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) return localeRouting(req);
  return rateLimit(req);
}

function rateLimit(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Sitenin kendi uçları yalnız sitenin sayfalarından çağrılır; dış kullanım için herkese açık API var
  if (pathname.startsWith('/api/app/') && !fromOwnSite(req)) {
    return NextResponse.json(
      { error: 'This endpoint is for the website only. Use the public API: /api-docs' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Sunucu sağlık kontrolü sayılmaz
  if (pathname === '/api/health') return NextResponse.next();

  const ip = clientIp(req.headers);
  const scope = scopeFor(pathname);
  const d = checkAccess(ip, scope, pathname);

  if (d.action === 'ban') {
    return NextResponse.json(
      { success: false, error: 'Access blocked. / Erişim engellendi.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (d.action === 'limit') {
    // İlk aşımda bir kez logla; kimin zorladığı görülsün, log dolmasın
    if (d.firstRejection) console.warn(`[hız sınırı] ${scope}:${ip} ${d.daily ? 'günlük' : 'dakikalık'} sınırı aştı`);
    return NextResponse.json(
      {
        success: false,
        error: d.daily
          ? 'Daily request limit reached. / Günlük istek sınırı doldu.'
          : 'Too many requests, please wait a minute. / Çok fazla istek, lütfen bir dakika bekleyin.',
      },
      { status: 429, headers: { ...d.headers, 'Retry-After': String(d.retryAfter), 'Cache-Control': 'no-store' } },
    );
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(d.headers)) res.headers.set(k, v);
  return res;
}

export const config = {
  // Node ortamı: sayaçlar admin uçlarıyla aynı süreçte paylaşılır
  runtime: 'nodejs',
  // API'ler ve sayfalar; Next iç dosyaları ve uzantılı statik dosyalar (resim, favicon) hariç
  matcher: ['/api/:path*', '/((?!_next/|.*\\..*).*)'],
};
