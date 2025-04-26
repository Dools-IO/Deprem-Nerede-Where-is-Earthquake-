import { NextResponse } from 'next/server';
import { fetchAllEarthquakes } from '@/lib/scrapers';
import { EarthquakeResponse } from '@/types';

let earthquakeCache: EarthquakeResponse = {
  earthquakes: [],
  lastUpdated: new Date(0) // 1970-01-01 olarak ayarlayarak ilk çağrıda yenilemeyi zorla
};

// Her 5 dakikada bir güncelleme yapılacak
let lastFetchTime = 0; // İlk çağrıda yenilemeyi zorla
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakika

export async function GET() {
  const now = Date.now();
  
  console.log(`API çağrısı alındı, son güncelleme: ${new Date(lastFetchTime).toISOString()}`);
  console.log(`Şu an: ${new Date(now).toISOString()}, son güncellemeden bu yana geçen süre: ${now - lastFetchTime}ms`);
  
  // Eğer son çekme işleminden beri yeterli süre geçtiyse verileri güncelle
  if (now - lastFetchTime > FETCH_INTERVAL) {
    console.log('Yeterli süre geçti, deprem verileri güncelleniyor...');
    
    try {
      const data = await fetchAllEarthquakes();
      earthquakeCache = {
        earthquakes: data,
        lastUpdated: new Date()
      };
      lastFetchTime = now;
      
      console.log(`Deprem verileri başarıyla güncellendi, ${data.length} kayıt alındı.`);
    } catch (error) {
      console.error('Deprem verilerini güncellerken hata:', error);
      // Hata durumunda en azından önbelleği geri döndür
      if (earthquakeCache.earthquakes.length === 0) {
        // Önbellekte veri yoksa, fetchAllEarthquakes() içindeki mock verileri kullanacak
        const data = await fetchAllEarthquakes();
        earthquakeCache = {
          earthquakes: data,
          lastUpdated: new Date()
        };
      }
    }
  } else {
    console.log('Son güncellemeden bu yana yeterli süre geçmedi, önbellek kullanılıyor.');
    console.log(`Önbellekte ${earthquakeCache.earthquakes.length} deprem kaydı bulunuyor.`);
    
    // Önbellekte veri yoksa, yeniden çekmeyi dene
    if (earthquakeCache.earthquakes.length === 0) {
      console.log('Önbellekte veri yok, yeniden veri çekiliyor...');
      try {
        const data = await fetchAllEarthquakes();
        earthquakeCache = {
          earthquakes: data,
          lastUpdated: new Date()
        };
        lastFetchTime = now;
        
        console.log(`Deprem verileri başarıyla güncellendi, ${data.length} kayıt alındı.`);
      } catch (error) {
        console.error('Deprem verilerini güncellerken hata:', error);
      }
    }
  }

  return NextResponse.json(earthquakeCache);
} 