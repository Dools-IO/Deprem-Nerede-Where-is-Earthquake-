import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/*
 * Admin uçları: Authorization: Bearer <ADMIN_TOKEN>. ADMIN_TOKEN tanımlı değilse (veya
 * 16 karakterden kısaysa) panel tamamen kapalıdır ve uçlar 404 döner.
 */
const MIN_TOKEN_LENGTH = 16;
const digest = (s: string) => createHash('sha256').update(s).digest();

export const adminEnabled = () => (process.env.ADMIN_TOKEN ?? '').length >= MIN_TOKEN_LENGTH;

/** Yetkisizse hazır yanıtı döner, yetkiliyse null */
export function requireAdmin(request: Request): NextResponse | null {
  const noStore = { 'Cache-Control': 'no-store' };
  if (!adminEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: noStore });
  const given = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';
  // Sabit sürede karşılaştır; uzunluk farkı bile sızmasın
  const ok = timingSafeEqual(digest(given), digest(process.env.ADMIN_TOKEN!));
  if (!ok) {
    console.warn('[admin] hatalı şifre denemesi');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore });
  }
  return null;
}
