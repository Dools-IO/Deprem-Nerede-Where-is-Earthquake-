import axios from 'axios';
import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';
import { parseString } from 'xml2js';
import { promisify } from 'util';

// SSN RSS feed URL'i
const SSN_RSS_URL = 'http://www.ssn.unam.mx/rss/ultimos-sismos.xml';
const MAX_EARTHQUAKES = 500;

// XML'i Promise olarak parse et
const parseXMLPromise = promisify(parseString);

// XML sonuç tipi
interface XMLResult {
  rss?: {
    channel?: [{
      item?: any[];
    }];
  };
}

/**
 * SSN'den (Meksika Ulusal Sismoloji Servisi) deprem verilerini çeker
 */
export async function fetchSSNEarthquakes(): Promise<Earthquake[]> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log('SSN: Deprem verileri çekiliyor...');
      
      // Proxy API üzerinden veriyi çek
      const proxyUrl = `http://localhost:3000/api/proxy?url=${encodeURIComponent(SSN_RSS_URL)}`;
      const { data } = await axios.get(proxyUrl);

      // XML'i parse et
      const result = await parseXMLPromise(data) as XMLResult;
      const items = result?.rss?.channel?.[0]?.item || [];
      const earthquakes: Earthquake[] = [];

      // Her deprem kaydını işle
      for (const item of items.slice(0, MAX_EARTHQUAKES)) {
        try {
          // Başlıktan magnitude ve konum bilgisini çıkar
          // Format: "3.4, 33 km al SUR de OMETEPEC, GRO"
          const title = item.title?.[0] || '';
          const [magnitudeStr, ...locationParts] = title.split(',');
          const magnitude = parseFloat(magnitudeStr) || 0;
          const location = locationParts.join(',').trim();

          // Açıklamadan koordinat ve derinlik bilgisini çıkar
          // Format: "Lat/Lon: 16.387/-98.436\nProfundidad: 4.3 km"
          const description = item.description?.[0] || '';
          const latLonMatch = description.match(/Lat\/Lon:\s*([-\d.]+)\/([-\d.]+)/);
          const depthMatch = description.match(/Profundidad:\s*([\d.]+)\s*km/);

          const latitude = latLonMatch ? parseFloat(latLonMatch[1]) : 0;
          const longitude = latLonMatch ? parseFloat(latLonMatch[2]) : 0;
          const depth = depthMatch ? parseFloat(depthMatch[1]) : 0;

          // Tarih bilgisini çıkar
          // Format: "Fecha:2025-04-25 16:59:25 (Hora de México)"
          const dateMatch = description.match(/Fecha:([\d\-\s:]+)/);
          const time = dateMatch ? new Date(dateMatch[1].trim()) : new Date();

          // Geçerlilik kontrolü
          if (isNaN(latitude) || isNaN(longitude) || isNaN(magnitude) || isNaN(time.getTime())) {
            console.log('SSN: Geçersiz veri, atlanıyor:', { latitude, longitude, magnitude, time });
            continue;
          }

          earthquakes.push({
            id: generateId(`ssn-${time.getTime()}-${latitude}-${longitude}-${magnitude}`),
            time,
            latitude,
            longitude,
            depth,
            magnitude,
            location,
            source: 'SSN Mexico',
            url: 'http://www.ssn.unam.mx'
          });

        } catch (err) {
          console.error('SSN: Deprem verisi işlenirken hata:', err);
        }
      }

      console.log(`SSN: ${earthquakes.length} deprem verisi çekildi.`);
      return earthquakes;
    } catch (error) {
      console.error(`SSN veri çekme denemesi ${retryCount + 1} başarısız:`, error);
      retryCount++;
      
      if (retryCount === maxRetries) {
        console.error('SSN maksimum deneme sayısına ulaşıldı');
        if (axios.isAxiosError(error)) {
          console.error('SSN hata detayları:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          });
        }
        return [];
      }
      
      // Her denemeden önce bekle (1s, 2s, 4s...)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }
  
  return [];
} 