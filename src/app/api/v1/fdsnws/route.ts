import { NextResponse } from 'next/server';
import { fetchFDSNEarthquakes } from '@/lib/scrapers/fdsnws';
import { EarthquakeResponse } from '@/types';

// FDSNWS verileri için önbellek
let fdsnwsCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || fdsnwsCache.earthquakes.length === 0) {
    try {
      const data = await fetchFDSNEarthquakes();
      fdsnwsCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('FDSNWS deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'FDSNWS',
    data: fdsnwsCache.earthquakes,
    lastUpdated: fdsnwsCache.lastUpdated
  });
} 