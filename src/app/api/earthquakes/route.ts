import { NextResponse } from 'next/server';
import { getEarthquakeFeed } from '@/lib/sources';
import { applyFilter, parseFilter } from '@/lib/filters';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  // Tarayıcı 15 sn, CDN 30 sn önbellekler; CDN süresi dolunca bir dakika daha eski yanıtı verip arkada yeniler
  'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
};

export async function GET(request: Request) {
  const filter = parseFilter(new URL(request.url).searchParams);
  if ('error' in filter) {
    return NextResponse.json({ error: filter.error }, { status: 400 });
  }

  const feed = await getEarthquakeFeed();
  const earthquakes = applyFilter(feed.earthquakes, filter);

  return NextResponse.json({ ...feed, count: earthquakes.length, earthquakes }, { headers: CACHE_HEADERS });
}
