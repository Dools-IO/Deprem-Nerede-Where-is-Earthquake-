import { NextResponse } from 'next/server';
import { fetchSSNEarthquakes } from '@/lib/scrapers/ssn';
import { EarthquakeResponse } from '@/types';

// SSN verileri için önbellek
let ssnCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || ssnCache.earthquakes.length === 0) {
    try {
      const data = await fetchSSNEarthquakes();
      ssnCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
    } catch (error) {
      console.error('SSN deprem verilerini güncellerken hata:', error);
      // Hata durumunda mevcut önbelleği kullan
    }
  }

  return NextResponse.json({
    success: true,
    source: 'SSN',
    data: ssnCache.earthquakes,
    lastUpdated: ssnCache.lastUpdated
  });
} 