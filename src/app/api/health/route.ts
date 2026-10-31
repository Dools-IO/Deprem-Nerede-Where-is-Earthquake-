import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Docker/Coolify sağlık kontrolü: hız sınırına takılmaz, dış kaynaklara gitmez */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
