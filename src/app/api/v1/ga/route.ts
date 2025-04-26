import { NextResponse } from 'next/server';
import { fetchGAEarthquakes } from '@/lib/scrapers/ga';
import { EarthquakeResponse } from '@/types';

// GA verileri için önbellek
let gaCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || gaCache.earthquakes.length === 0) {
    try {
      const data = await fetchGAEarthquakes();
      gaCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('GA deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'GA',
    data: gaCache.earthquakes,
    lastUpdated: gaCache.lastUpdated
  });
} 