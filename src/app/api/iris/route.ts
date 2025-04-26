import { NextResponse } from 'next/server';
import { fetchIRISEarthquakes } from '@/lib/scrapers/iris';
import { Earthquake, EarthquakeResponse } from '@/types';

// IRIS verileri için önbellek
let irisCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date()
};

// Her 15 dakikada bir güncelleme yapılacak
let lastFetchTime = 0;
const FETCH_INTERVAL = 15 * 60 * 1000; // 15 dakika

export async function GET() {
  const now = Date.now();
  
  console.log(`IRIS API çağrısı alındı, son güncelleme: ${new Date(lastFetchTime).toISOString()}`);
  console.log(`Şu an: ${new Date(now).toISOString()}, son güncellemeden bu yana geçen süre: ${now - lastFetchTime}ms`);
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL || irisCache.earthquakes.length === 0) {
    console.log('Yeterli süre geçti veya önbellek boş, IRIS deprem verileri güncelleniyor...');
    
    try {
      const data = await fetchIRISEarthquakes();
      irisCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
      
      console.log(`IRIS deprem verileri başarıyla güncellendi, ${data.length} kayıt alındı.`);
    } catch (error) {
      console.error('IRIS deprem verilerini güncellerken hata:', error);
    }
  } else {
    console.log('Son güncellemeden bu yana yeterli süre geçmedi, önbellek kullanılıyor.');
    console.log(`Önbellekte ${irisCache.earthquakes.length} IRIS deprem kaydı bulunuyor.`);
  }

  return NextResponse.json(irisCache);
} 