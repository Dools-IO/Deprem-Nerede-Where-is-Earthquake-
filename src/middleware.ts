import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export const config = {
  matcher: '/api/:path*',
};
