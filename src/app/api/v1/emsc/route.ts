import { NextResponse } from 'next/server';
import { fetchEMSCEarthquakes } from '@/lib/scrapers/emsc';
import { EarthquakeResponse } from '@/types';

// EMSC verileri için önbellek
let emscCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || emscCache.earthquakes.length === 0) {
    try {
      const data = await fetchEMSCEarthquakes();
      emscCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('EMSC deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'EMSC',
    data: emscCache.earthquakes,
    lastUpdated: emscCache.lastUpdated
  });
} 