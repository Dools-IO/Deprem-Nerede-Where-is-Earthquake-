import { NextResponse } from 'next/server';
import { fetchINGVEarthquakes } from '@/lib/scrapers/ingv';

export async function GET() {
  try {
    const earthquakes = await fetchINGVEarthquakes();
    return NextResponse.json({ 
      success: true, 
      count: earthquakes.length,
      earthquakes 
    });
  } catch (error) {
    console.error('INGV test hatası:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'INGV verilerini çekerken hata oluştu' 
    }, { status: 500 });
  }
} 