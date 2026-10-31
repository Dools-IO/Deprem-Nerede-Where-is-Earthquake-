import { NextResponse } from 'next/server';
import { archiveEnabled, MAX_RANGE_DAYS, queryHistory } from '@/lib/archive';
import { parseHistoryParams } from '@/lib/filters';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!archiveEnabled()) {
    return NextResponse.json(
      { error: 'Geçmiş arşivi bu sunucuda etkin değil (DATABASE_URL tanımlı değil)' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const now = Date.now();
  const params = parseHistoryParams(new URL(request.url).searchParams, now, MAX_RANGE_DAYS);
  if ('error' in params) {
    return NextResponse.json({ error: params.error }, { status: 400 });
  }

  try {
    const result = await queryHistory(params);
    // Tamamen geçmişte kalan aralıklar değişmez sayılır, daha uzun önbelleklenir
    const settled = params.to.getTime() < now - 3600_000;
    return NextResponse.json(
      { from: params.from.toISOString(), to: params.to.toISOString(), ...result },
      {
        headers: {
          'Cache-Control': settled
            ? 'public, max-age=300, s-maxage=3600'
            : 'public, max-age=30, s-maxage=60, stale-while-revalidate=60',
        },
      },
    );
  } catch (err) {
    console.warn(`[arşiv] sorgu hatası: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: 'Arşiv şu anda yanıt vermiyor' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
