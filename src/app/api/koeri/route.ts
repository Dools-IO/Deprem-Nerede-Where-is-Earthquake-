import { NextResponse } from 'next/server';
import { fetchKOERIEarthquakes } from '@/lib/scrapers/koeri';

export async function GET() {
  try {
    const earthquakes = await fetchKOERIEarthquakes();

    return new NextResponse(JSON.stringify(earthquakes), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('KOERI API hatası:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Veri çekilemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}   