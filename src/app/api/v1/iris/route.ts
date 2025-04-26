import { NextResponse } from 'next/server';
import { fetchIRISEarthquakes } from '@/lib/scrapers/iris';
import { EarthquakeResponse } from '@/types';

// IRIS verileri için önbellek
let irisCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || irisCache.earthquakes.length === 0) {
    try {
      const data = await fetchIRISEarthquakes();
      irisCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('IRIS deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'IRIS',
    data: irisCache.earthquakes,
    lastUpdated: irisCache.lastUpdated
  });
} 