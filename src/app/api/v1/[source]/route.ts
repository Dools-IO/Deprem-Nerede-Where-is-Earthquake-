import { NextResponse } from 'next/server';
import { getEarthquakeFeed, getSourceEarthquakes } from '@/lib/sources';
import { isSourceId } from '@/lib/sourceInfo';
import { applyFilter, parseFilter } from '@/lib/filters';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
};

export async function GET(request: Request, { params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  // Eski adresler çalışmaya devam etsin
  const ALIASES: Record<string, string> = { koeri: 'kandilli' };
  const id = ALIASES[source.toLowerCase()] ?? source.toLowerCase();

  const filter = parseFilter(new URL(request.url).searchParams);
  if ('error' in filter) {
    return NextResponse.json({ success: false, error: filter.error }, { status: 400 });
  }

  if (id === 'all') {
    const feed = await getEarthquakeFeed();
    const data = applyFilter(feed.earthquakes, filter);
    return NextResponse.json(
      { success: true, source: 'all', count: data.length, lastUpdated: feed.updatedAt, sources: feed.sources, data },
      { headers: CACHE_HEADERS },
    );
  }

  if (!isSourceId(id)) {
    return NextResponse.json({ success: false, error: `Bilinmeyen kaynak: ${source}` }, { status: 404 });
  }

  const { status, earthquakes } = await getSourceEarthquakes(id);
  const data = applyFilter(earthquakes, filter);
  return NextResponse.json(
    {
      success: status.ok || data.length > 0,
      source: id,
      count: data.length,
      lastUpdated: status.updatedAt,
      ...(status.error ? { error: 'Kaynağa şu an ulaşılamıyor' } : {}),
      data,
    },
    status.updatedAt ? { headers: CACHE_HEADERS } : { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
