import { NextResponse } from 'next/server';
import { getEarthquakeFeed, getSourceEarthquakes } from '@/lib/sources';
import { SOURCES, isSourceId } from '@/lib/sourceInfo';
import { applyFilter, parseFilter } from '@/lib/filters';
import { CACHE, PUBLIC_MAX_RECORDS } from '@/lib/apiPolicy';
import { licensesFor, TERMS } from '@/lib/apiLicense';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = { 'Cache-Control': CACHE.publicLive };

export async function GET(request: Request, { params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  // Eski adresler çalışmaya devam etsin
  const ALIASES: Record<string, string> = { koeri: 'kandilli' };
  const id = ALIASES[source.toLowerCase()] ?? source.toLowerCase();

  const filter = parseFilter(new URL(request.url).searchParams);
  if ('error' in filter) {
    return NextResponse.json({ success: false, error: filter.error }, { status: 400 });
  }

  filter.limit = Math.min(filter.limit ?? PUBLIC_MAX_RECORDS, PUBLIC_MAX_RECORDS);

  if (id === 'all') {
    const feed = await getEarthquakeFeed('public');
    const data = applyFilter(feed.earthquakes, filter);
    return NextResponse.json(
      {
        success: true,
        source: 'all',
        count: data.length,
        lastUpdated: feed.updatedAt,
        sources: feed.sources,
        data,
        licenses: licensesFor(data),
        terms: TERMS,
      },
      { headers: CACHE_HEADERS },
    );
  }

  if (!isSourceId(id)) {
    return NextResponse.json({ success: false, error: `Bilinmeyen kaynak: ${source}` }, { status: 404 });
  }

  // Yeniden dağıtım izni olmayan kaynağın verisi API'den verilmez (sitedeki haritada görünür)
  if (!SOURCES[id].publicApi) {
    return NextResponse.json(
      {
        success: false,
        error: `${SOURCES[id].name}: redistribution is not permitted (licence: ${SOURCES[id].license}). / Bu kaynağın verisini yeniden dağıtma izni yok.`,
        licenseUrl: SOURCES[id].licenseUrl,
      },
      { status: 403, headers: { 'Cache-Control': CACHE.none } },
    );
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
      licenses: licensesFor(data),
      terms: TERMS,
    },
    status.updatedAt ? { headers: CACHE_HEADERS } : { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
