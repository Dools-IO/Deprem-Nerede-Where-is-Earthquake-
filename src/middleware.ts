import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { internalPath, switchPath } from '@/lib/i18n';

/*
 * Basit, örnek başına (in-memory) hız sınırı. Tek sunucuda iş görür; birden çok
 * örnek/serverless çalıştırılıyorsa Upstash, Vercel KV gibi ortak bir depo gerekir.
 * Asıl koruma zaten önbellek: dış kaynaklara istek sayısı kullanıcı sayısından bağımsız.
 */
const LIMIT = 60;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; reset: number }>();

function clientIp(req: NextRequest): string {
  // Barındırma platformunun eklediği başlıkları kullan; ilk değer istemci IP'sidir
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export function middleware(req: NextRequest) {
  return req.nextUrl.pathname.startsWith('/api/') ? rateLimit(req) : routeLanguage(req);
}

function rateLimit(req: NextRequest) {
  const now = Date.now();
  const ip = clientIp(req);

  if (hits.size > 10_000) {
    for (const [key, v] of hits) if (v.reset < now) hits.delete(key);
  }

  let entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    entry = { count: 0, reset: now + WINDOW_MS };
    hits.set(ip, entry);
  }
  entry.count++;

  const remaining = Math.max(0, LIMIT - entry.count);
  const headers = {
    'X-RateLimit-Limit': String(LIMIT),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': new Date(entry.reset).toISOString(),
  };

  if (entry.count > LIMIT) {
    return NextResponse.json(
      { success: false, error: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.' },
      { status: 429, headers: { ...headers, 'Retry-After': String(Math.ceil((entry.reset - now) / 1000)) } },
    );
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

/*
 * Dil yönlendirmesi. Türkçe adresler önek almaz (/liste), İngilizce /en altındadır;
 * ikisi de app/[lang] altındaki iç yola (/tr/liste, /en/liste) yeniden yazılır.
 */
function routeLanguage(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();

  // İç yollar doğrudan açılmasın, tek bir adres kalsın
  if (pathname === '/tr' || pathname.startsWith('/tr/')) {
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }

  // İlk ziyarette tarayıcı Türkçe istemiyorsa İngilizceye yönlendir. Dil seçici çerez yazar,
  // sonrasında seçim geçerlidir. Accept-Language göndermeyen arama motorları Türkçede kalır.
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  if (!isEnglish && req.method === 'GET' && !req.cookies.has('lang') && prefersEnglish(req.headers.get('accept-language'))) {
    url.pathname = switchPath(pathname, 'en');
    return NextResponse.redirect(url);
  }

  url.pathname = internalPath(pathname);
  return NextResponse.rewrite(url);
}

/** Başlık var ve kabul edilen diller arasında Türkçe yoksa */
function prefersEnglish(header: string | null): boolean {
  if (!header) return false;
  return !header.split(',').some((part) => part.trim().toLowerCase().startsWith('tr'));
}

export const config = {
  // Next iç dosyaları ve uzantılı statik dosyalar (resim, favicon) hariç her şey
  matcher: '/((?!_next/|.*\\..*).*)',
};
