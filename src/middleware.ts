import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localePath, preferredLocale } from '@/i18n/config';
import { RATE_LIMITS, type RateRule } from '@/lib/apiPolicy';

/*
 * Örnek başına (in-memory) hız sınırı. Tek sunucuda iş görür; birden çok örnek
 * çalıştırılırsa sayaç Redis gibi ortak bir depoya taşınmalı. Asıl koruma yine önbellek:
 * dış kaynaklara istek sayısı kullanıcı sayısından bağımsız.
 */
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

interface Bucket {
  minuteCount: number;
  minuteReset: number;
  dayCount: number;
  dayReset: number;
}
const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  // Barındırma platformunun eklediği başlıkları kullan; ilk değer istemci IP'sidir
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

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
function ruleFor(pathname: string): { name: keyof typeof RATE_LIMITS; rule: RateRule } {
  const app = pathname.startsWith('/api/app/');
  const history = pathname.endsWith('/history');
  const name = app ? (history ? 'appHistory' : 'app') : history ? 'publicHistory' : 'public';
  return { name, rule: RATE_LIMITS[name] };
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

  const now = Date.now();
  const { name, rule } = ruleFor(pathname);
  const key = `${name}:${clientIp(req)}`;

  if (buckets.size > 20_000) {
    for (const [k, v] of buckets) if (v.dayReset < now && v.minuteReset < now) buckets.delete(k);
  }
  let b = buckets.get(key);
  if (!b) {
    b = { minuteCount: 0, minuteReset: now + MINUTE, dayCount: 0, dayReset: now + DAY };
    buckets.set(key, b);
  }
  if (b.minuteReset < now) {
    b.minuteCount = 0;
    b.minuteReset = now + MINUTE;
  }
  if (b.dayReset < now) {
    b.dayCount = 0;
    b.dayReset = now + DAY;
  }
  b.minuteCount++;
  b.dayCount++;

  const overDay = rule.perDay !== undefined && b.dayCount > rule.perDay;
  const overMinute = b.minuteCount > rule.perMinute;
  const limit = overDay ? rule.perDay! : rule.perMinute;
  const reset = overDay ? b.dayReset : b.minuteReset;
  const remaining = overDay ? 0 : Math.max(0, rule.perMinute - b.minuteCount);
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': new Date(reset).toISOString(),
  };
  if (rule.perDay !== undefined) {
    headers['X-RateLimit-Daily-Limit'] = String(rule.perDay);
    headers['X-RateLimit-Daily-Remaining'] = String(Math.max(0, rule.perDay - b.dayCount));
  }

  if (overDay || overMinute) {
    // İlk aşımda bir kez logla; kimin zorladığı görülsün, log dolmasın
    if (b.minuteCount === rule.perMinute + 1 || b.dayCount === (rule.perDay ?? -1) + 1) {
      console.warn(`[hız sınırı] ${key} ${overDay ? 'günlük' : 'dakikalık'} sınırı aştı`);
    }
    return NextResponse.json(
      {
        success: false,
        error: overDay
          ? 'Daily request limit reached. / Günlük istek sınırı doldu.'
          : 'Too many requests, please wait a minute. / Çok fazla istek, lütfen bir dakika bekleyin.',
      },
      {
        status: 429,
        headers: { ...headers, 'Retry-After': String(Math.ceil((reset - now) / 1000)), 'Cache-Control': 'no-store' },
      },
    );
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

export const config = {
  // API'ler ve sayfalar; Next iç dosyaları ve uzantılı statik dosyalar (resim, favicon) hariç
  matcher: ['/api/:path*', '/((?!_next/|.*\\..*).*)'],
};
