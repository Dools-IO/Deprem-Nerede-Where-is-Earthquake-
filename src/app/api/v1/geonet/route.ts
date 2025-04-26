import { NextResponse } from 'next/server';
import { fetchGeoNetEarthquakes } from '@/lib/scrapers/geonet';
import { EarthquakeResponse } from '@/types';

// GeoNet verileri için önbellek
let geonetCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || geonetCache.earthquakes.length === 0) {
    try {
      const data = await fetchGeoNetEarthquakes();
      geonetCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('GeoNet deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'GeoNet',
    data: geonetCache.earthquakes,
    lastUpdated: geonetCache.lastUpdated
  });
} 