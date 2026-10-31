import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { isIpLike, resetIp } from '@/lib/accessControl';
import { deleteAccessRule, saveAccessRule } from '@/lib/accessRulesDb';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/** Kalıcı ban veya beyaz liste ekle/güncelle: { ip, kind: 'ban' | 'allow', note? } */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { ip?: string; kind?: string; note?: string };
  if (!body.ip || !isIpLike(body.ip)) return NextResponse.json({ error: 'invalid ip' }, { status: 400 });
  if (body.kind !== 'ban' && body.kind !== 'allow') return NextResponse.json({ error: 'invalid kind' }, { status: 400 });
  const note = String(body.note ?? '').slice(0, 200);
  const { persisted } = await saveAccessRule(body.ip, body.kind, note);
  if (body.kind === 'allow') resetIp(body.ip);
  console.warn(`[admin] ${body.ip} → ${body.kind}`);
  return NextResponse.json({ ok: true, persisted }, { headers: noStore });
}

/** Kuralı kaldır: ?ip= */
export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const ip = new URL(request.url).searchParams.get('ip') ?? '';
  if (!isIpLike(ip)) return NextResponse.json({ error: 'invalid ip' }, { status: 400 });
  await deleteAccessRule(ip);
  console.warn(`[admin] ${ip} kuralı kaldırıldı`);
  return NextResponse.json({ ok: true }, { headers: noStore });
}
