import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Earthquake } from '@/types';

// IRIS API URL
const IRIS_API_URL = 'https://service.iris.edu/fdsnws/event/1/query';

/**
 * IRIS servisinden deprem verilerini çeken fonksiyon
 * Son 500 depremi büyüklük sınırlaması olmadan getirmeye çalışır.
 * IRIS API'si son 180 güne kadar veri sağlayabilir.
 * @returns {Promise<Earthquake[]>} İşlenmiş deprem verileri
 */
export async function fetchIRISEarthquakes(): Promise<Earthquake[]> {
  try {
    console.log('📊 IRIS veri kaynağından deprem verileri alınıyor...');
    
    // Son 180 günün verilerini alalım (IRIS daha uzun süreyi destekler)
    const endtime = new Date().toISOString();
    const starttime = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`IRIS tarih aralığı: ${new Date(starttime).toLocaleDateString()} - ${new Date(endtime).toLocaleDateString()}`);
    
    // API'dan verileri çek
    const response = await axios.get(IRIS_API_URL, {
      params: {
        format: 'text',
        orderby: 'time',
        limit: 500, // Son 500 deprem
        starttime,
        endtime,
        // API bir arama kriteri gerektirir - çok düşük bir magnitudeMinimum değeri kullanarak 
        // neredeyse tüm depremleri alırız
        minmagnitude: 0.1 
      },
    });

    // Yanıt metnini satır satır ayrıştır
    const lines = response.data.split('\n');
    
    // Başlık satırlarını atla (ilk satır yorum satırı "#" ile başlar)
    const dataLines = lines.filter((line: string) => line && !line.startsWith('#'));
    
    console.log(`IRIS API'dan ${dataLines.length} satır deprem verisi alındı.`);
    
    // Veriyi işle
    const earthquakes = dataLines.map((line: string) => {
      const parts = line.split('|');
      
      if (parts.length < 12) {
        return null;
      }
      
      try {
        const [eventId, timeStr, latitudeStr, longitudeStr, depthStr, 
               author, catalog, contributor, contributorId, 
               magType, magnitudeStr, magAuthor, locationName] = parts;
        
        const time = new Date(timeStr);
        const latitude = parseFloat(latitudeStr);
        const longitude = parseFloat(longitudeStr);
        const depth = parseFloat(depthStr);
        const magnitude = parseFloat(magnitudeStr);
        
        // Geçersiz değerler için kontrol
        if (isNaN(latitude) || isNaN(longitude) || isNaN(depth) || isNaN(magnitude) || !time) {
          return null;
        }
        
        return {
          id: `IRIS-${eventId}`,
          time,
          latitude,
          longitude,
          depth,
          magnitude,
          location: locationName || 'Bilinmeyen konum',
          source: 'IRIS',
          url: `https://ds.iris.edu/ds/nodes/dmc/tools/event/${eventId}`
        } as Earthquake;
      } catch (error) {
        console.error('IRIS: Veri satırı işlenirken hata:', line, error);
        return null;
      }
    }).filter(Boolean) as Earthquake[];
    
    console.log(`✅ IRIS'ten ${earthquakes.length} deprem verisi başarıyla işlendi.`);
    return earthquakes;
  } catch (error) {
    console.error('❌ IRIS deprem verilerini alma sırasında hata:', error);
    return []; // Hata durumunda boş dizi döndür
  }
} 