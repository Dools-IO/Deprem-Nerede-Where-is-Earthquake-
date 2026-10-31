import { NextResponse } from 'next/server';
import { getEarthquakeFeed } from '@/lib/sources';
import { applyFilter, parseFilter } from '@/lib/filters';
import { CACHE, PUBLIC_MAX_RECORDS } from '@/lib/apiPolicy';
import { licensesFor, TERMS } from '@/lib/apiLicense';

export const dynamic = 'force-dynamic';

/** Herkese açık birleşik akış: yalnız yeniden dağıtım lisansı olan kaynaklar, en fazla 500 kayıt */
export async function GET(request: Request) {
  const filter = parseFilter(new URL(request.url).searchParams);
  if ('error' in filter) {
    return NextResponse.json({ error: filter.error }, { status: 400 });
  }
  const limit = Math.min(filter.limit ?? PUBLIC_MAX_RECORDS, PUBLIC_MAX_RECORDS);

  const feed = await getEarthquakeFeed('public');
  const matched = applyFilter(feed.earthquakes, { ...filter, limit: undefined });
  const earthquakes = matched.slice(0, limit);

  return NextResponse.json(
    {
      ...feed,
      count: earthquakes.length,
      truncated: matched.length > earthquakes.length,
      earthquakes,
      licenses: licensesFor(earthquakes),
      terms: TERMS,
    },
    { headers: { 'Cache-Control': CACHE.publicLive } },
  );
}
