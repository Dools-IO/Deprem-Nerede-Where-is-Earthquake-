import 'server-only';
import { NextResponse } from 'next/server';
import { archiveEnabled, MAX_RANGE_DAYS, queryHistory } from '@/lib/archive';
import { parseHistoryParams } from '@/lib/filters';
import { CACHE, PUBLIC_HISTORY_MAX_DAYS, PUBLIC_MAX_RECORDS } from '@/lib/apiPolicy';
import { PUBLIC_SOURCE_IDS } from '@/lib/sourceInfo';
import { licensesFor, TERMS } from '@/lib/apiLicense';
import type { FeedScope } from '@/lib/sources';

/** /api/history (herkese açık) ve /api/app/history (site) ortak işleyicisi */
export async function handleHistory(request: Request, scope: FeedScope) {
  const isPublic = scope === 'public';
  if (!archiveEnabled()) {
    return NextResponse.json(
      { error: 'History archive is not enabled on this server. / Geçmiş arşivi bu sunucuda etkin değil.' },
      { status: 503, headers: { 'Cache-Control': CACHE.none } },
    );
  }
  const now = Date.now();
  const maxDays = isPublic ? PUBLIC_HISTORY_MAX_DAYS : MAX_RANGE_DAYS;
  const params = parseHistoryParams(new URL(request.url).searchParams, now, maxDays);
  if ('error' in params) {
    return NextResponse.json({ error: params.error }, { status: 400 });
  }
  if (isPublic) params.limit = Math.min(params.limit, PUBLIC_MAX_RECORDS);

  try {
    const result = await queryHistory({ ...params, ...(isPublic ? { onlySources: PUBLIC_SOURCE_IDS } : {}) });
    // Tamamen geçmişte kalan aralıklar değişmez sayılır, daha uzun önbelleklenir
    const settled = params.to.getTime() < now - 3600_000;
    return NextResponse.json(
      {
        from: params.from.toISOString(),
        to: params.to.toISOString(),
        ...result,
        ...(isPublic ? { licenses: licensesFor(result.earthquakes), terms: TERMS } : {}),
      },
      { headers: { 'Cache-Control': settled ? CACHE.historySettled : CACHE.historyRecent } },
    );
  } catch (err) {
    console.warn(`[arşiv] sorgu hatası: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json(
      { error: 'Archive is not responding. / Arşiv şu anda yanıt vermiyor.' },
      { status: 503, headers: { 'Cache-Control': CACHE.none } },
    );
  }
}
