import { NextResponse } from 'next/server';
import { fetchESMEarthquakes } from '@/lib/scrapers/esm';
import { EarthquakeResponse } from '@/types';

// ESM verileri için önbellek
let esmCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || esmCache.earthquakes.length === 0) {
    try {
      const data = await fetchESMEarthquakes();
      esmCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('ESM deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'ESM',
    data: esmCache.earthquakes,
    lastUpdated: esmCache.lastUpdated
  });
} 