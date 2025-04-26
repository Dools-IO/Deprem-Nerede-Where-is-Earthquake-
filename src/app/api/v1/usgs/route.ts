import { NextResponse } from 'next/server';
import { fetchUSGSEarthquakes } from '@/lib/scrapers/usgs';
import { EarthquakeResponse } from '@/types';

// USGS verileri için önbellek
let usgsCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || usgsCache.earthquakes.length === 0) {
    try {
      const data = await fetchUSGSEarthquakes();
      usgsCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('USGS deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'USGS',
    data: usgsCache.earthquakes,
    lastUpdated: usgsCache.lastUpdated
  });
} 