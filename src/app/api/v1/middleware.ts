import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting için basit bir önbellek
const rateLimits = new Map<string, { count: number; resetTime: number }>();

// Rate limit ayarları
const RATE_LIMIT = 60; // Dakikada maksimum istek sayısı
const WINDOW_MS = 60 * 1000; // 1 dakika

export function middleware(request: NextRequest) {
  // IP adresini al
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
  const now = Date.now();

  // Rate limit verilerini kontrol et
  const rateData = rateLimits.get(ip) || { count: 0, resetTime: now + WINDOW_MS };

  // Zaman penceresi geçtiyse sıfırla
  if (now > rateData.resetTime) {
    rateData.count = 0;
    rateData.resetTime = now + WINDOW_MS;
  }

  // İstek sayısını artır
  rateData.count++;

  // Rate limit'i güncelle
  rateLimits.set(ip, rateData);

  // Rate limit aşıldıysa hata döndür
  if (rateData.count > RATE_LIMIT) {
    return new NextResponse(JSON.stringify({
      success: false,
      error: 'Rate limit aşıldı. Lütfen bir dakika sonra tekrar deneyin.',
      rateLimitReset: new Date(rateData.resetTime).toISOString()
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': RATE_LIMIT.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateData.resetTime).toISOString()
      }
    });
  }

  // Rate limit bilgilerini header'lara ekle
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
  response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT - rateData.count).toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateData.resetTime).toISOString());

  return response;
}

export const config = {
  matcher: '/api/v1/:path*'
}; 