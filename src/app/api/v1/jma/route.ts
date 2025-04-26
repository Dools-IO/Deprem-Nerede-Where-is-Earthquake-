import { NextResponse } from 'next/server';
import { fetchJMAEarthquakes } from '@/lib/scrapers/jma';
import { EarthquakeResponse } from '@/types';

// JMA verileri için önbellek
let jmaCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || jmaCache.earthquakes.length === 0) {
    try {
      const data = await fetchJMAEarthquakes();
      jmaCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('JMA deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'JMA',
    data: jmaCache.earthquakes,
    lastUpdated: jmaCache.lastUpdated
  });
} 