import { NextResponse } from 'next/server';
import { getEarthquakeFeed } from '@/lib/sources';
import { CACHE } from '@/lib/apiPolicy';

export const dynamic = 'force-dynamic';

/** Sitenin haritası ve listesi için tam akış (tüm kaynaklar). Dışarıdan çağrılamaz, bkz. middleware. */
export async function GET() {
  const feed = await getEarthquakeFeed('app');
  return NextResponse.json(feed, { headers: { 'Cache-Control': CACHE.appLive } });
}
