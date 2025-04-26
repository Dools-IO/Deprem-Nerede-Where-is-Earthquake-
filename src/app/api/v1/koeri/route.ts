import { NextResponse } from 'next/server';
import { fetchKOERIEarthquakes } from '@/lib/scrapers/koeri';
import { EarthquakeResponse } from '@/types';

// KOERI verileri için önbellek
let koeriCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || koeriCache.earthquakes.length === 0) {
    try {
      const data = await fetchKOERIEarthquakes();
      koeriCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('KOERI deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'KOERI',
    data: koeriCache.earthquakes,
    lastUpdated: koeriCache.lastUpdated
  });
} 