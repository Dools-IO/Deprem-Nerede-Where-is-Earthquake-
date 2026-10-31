import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { isIpLike, resetIp } from '@/lib/accessControl';

export const dynamic = 'force-dynamic';

/** Bir IP'nin sayaçlarını sıfırlar: dakikalık/günlük engel hemen kalkar */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { ip } = (await request.json().catch(() => ({}))) as { ip?: string };
  if (!ip || !isIpLike(ip)) return NextResponse.json({ error: 'invalid ip' }, { status: 400 });
  console.warn(`[admin] ${ip} sayaçları sıfırlandı`);
  return NextResponse.json({ ok: true, cleared: resetIp(ip) }, { headers: { 'Cache-Control': 'no-store' } });
}
