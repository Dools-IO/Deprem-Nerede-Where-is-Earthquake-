import { NextResponse } from 'next/server';
import { fetchINGVEarthquakes } from '@/lib/scrapers/ingv';
import { EarthquakeResponse } from '@/types';

// INGV verileri için önbellek
let ingvCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || ingvCache.earthquakes.length === 0) {
    try {
      const data = await fetchINGVEarthquakes();
      ingvCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('INGV deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'INGV',
    data: ingvCache.earthquakes,
    lastUpdated: ingvCache.lastUpdated
  });
} 