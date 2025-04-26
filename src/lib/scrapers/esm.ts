import axios from 'axios';
import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';

// ESM API URL formatı
const ESM_API_BASE_URL = 'https://esm-db.eu/fdsnws/event/1/query';
// Alternatif API URL (CORS veya erişim sorunu olursa)
const ESM_ALT_API_URL = 'https://www.orfeus-eu.org/fdsnws/event/1/query';

// Test amaçlı örnek bir ESM JSON endpoint - gerçek ESM veri modeli incelenmeli
const ESM_TEST_JSON_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson';

const MAX_EARTHQUAKES = 500; // Maksimum deprem sayısı

// ESM API için JSON formatında yanıt tipi
interface ESMEvent {
  publicID?: string;
  time?: {
    value?: string;
  };
  latitude?: {
    value?: number;
  };
  longitude?: {
    value?: number;
  };
  depth?: {
    value?: number;
  };
  magnitude?: number;
  magnitudeType?: string; 
  region?: string;
  description?: string;
}

// USGS Geojson yanıt formatı (yedek olarak)
interface USGSGeoJson {
  type: string;
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: Array<{
    type: string;
    properties: {
      mag: number;
      place: string;
      time: number;
      updated: number;
      tz: number;
      url: string;
      detail: string;
      felt: number | null;
      cdi: number | null;
      mmi: number | null;
      alert: string | null;
      status: string;
      tsunami: number;
      sig: number;
      net: string;
      code: string;
      ids: string;
      sources: string;
      types: string;
      nst: number | null;
      dmin: number | null;
      rms: number;
      gap: number | null;
      magType: string;
      type: string;
      title: string;
    };
    geometry: {
      type: string;
      coordinates: [number, number, number]; // [longitude, latitude, depth]
    };
    id: string;
  }>;
}

/**
 * ESM veritabanından deprem verilerini çeker
 * @param startTime Başlangıç tarihi (YYYY-MM-DDThh:mm:ss formatında)
 * @param endTime Bitiş tarihi (YYYY-MM-DDThh:mm:ss formatında)
 * @param minMagnitude Minimum deprem büyüklüğü (varsayılan: 4)
 */
export async function fetchESMEarthquakes(
  startTime: string = '',
  endTime: string = '',
  minMagnitude: number = 4
): Promise<Earthquake[]> {
  try {
    // Tarih parametreleri boşsa, son 30 günü al
    if (!startTime || !endTime) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      startTime = thirtyDaysAgo.toISOString().split('.')[0];
      endTime = now.toISOString().split('.')[0];
    }
    
    // Stratejileri dene
    let earthquakes: Earthquake[] = [];
    
    // 1. ESM Alternatif Format (USGS GeoJSON Yedek) - XML ve ESM JSON hata veriyorsa
    // USGS 4.5+ dünya geneli depremler ESM için yedek olarak kullanılabilir
    earthquakes = await fetchBackupUSGSData();
    
    if (earthquakes.length === 0) {
      // 2. ESM XML verilerini dene (ana seçenek)
      try {
        earthquakes = await fetchESMXmlData(startTime, endTime, minMagnitude);
      } catch (error) {
        console.error('ESM XML veri alımı başarısız:', error);
      }
    }
    
    return earthquakes;
  } catch (error) {
    console.error('ESM deprem verileri çekilirken genel hata:', error);
    return [];
  }
}

/**
 * USGS verilerini ESM yerine yedek olarak kullanır
 * @returns USGS deprem verileri
 */
async function fetchBackupUSGSData(): Promise<Earthquake[]> {
  try {
    const proxyUrl = `http://localhost:3000/api/proxy?url=${encodeURIComponent(ESM_TEST_JSON_URL)}&format=json`;
    const response = await fetch(proxyUrl);
    const data = await response.json();

    if (!data || !data.features) {
      throw new Error('Geçersiz USGS veri formatı');
    }

    return data.features
      .map((feature: any) => {
        try {
          const { properties, geometry } = feature;
          
          if (!properties || !geometry || !geometry.coordinates) {
            return null;
          }

          const time = new Date(properties.time);
          if (isNaN(time.getTime())) {
            return null;
          }

          const [longitude, latitude, depth] = geometry.coordinates;
          const magnitude = properties.mag || 0;
          const location = properties.place || 'Unknown Location';
          
          return {
            id: generateId(`esm-backup-${properties.code || time.toISOString()}`),
            time: time.toISOString(),
            latitude,
            longitude,
            depth: depth || 10,
            magnitude,
            location,
            source: 'ESM (USGS Backup)',
            url: properties.url || ESM_TEST_JSON_URL
          };
        } catch (err) {
          console.error('ESM Backup veri dönüştürme hatası:', err);
          return null;
        }
      })
      .filter((quake: Earthquake | null): quake is Earthquake => quake !== null)
      .slice(0, MAX_EARTHQUAKES);
  } catch (error) {
    console.error('ESM Backup veri çekme hatası:', error);
    return [];
  }
}

/**
 * ESM XML verilerini çeker ve işler
 */
async function fetchESMXmlData(startTime: string, endTime: string, minMagnitude: number): Promise<Earthquake[]> {
  try {
    console.log('ESM: XML veri sorgusu yapılıyor...');
    
    // ESM API URL
    const apiUrl = `${ESM_API_BASE_URL}?starttime=${startTime}&endtime=${endTime}&minmagnitude=${minMagnitude}&includeallmagnitudes=true`;
    
    console.log(`ESM: API URL: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'User-Agent': 'Deprem-Nerede-App/1.0'
      }
    });
    
    if (response.status !== 200 || !response.data) {
      console.log(`ESM: XML yanıt hatası, durum kodu: ${response.status}`);
      return [];
    }
    
    const xmlText = response.data;
    console.log(`ESM: XML alındı, uzunluk: ${xmlText.length}`);
    
    // Basitleştirilmiş XML analizi - format çok karmaşık olduğu için temel bilgileri çıkarmaya çalışıyoruz
    const earthquakes: Earthquake[] = [];
    const lines = xmlText.toString().split('\n');
    
    let eventData: Partial<Earthquake> | null = null;
    let eventId = '';
    
    // XML içinde Regex pattern'leri
    const timePattern = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
    const coordinatePattern = /(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)?/;
    const magnitudePattern = /(\d+\.\d+)\s+mw/i;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Yeni deprem başlangıcı 
      if (line.includes('INT-') && !line.includes('<')) {
        // Önceki depremi ekle
        if (eventData && eventData.time && eventData.latitude !== undefined && 
            eventData.longitude !== undefined && eventData.magnitude !== undefined) {
          earthquakes.push(eventData as Earthquake);
        }
        
        // Yeni deprem ID'si
        eventId = `ESM-${Date.now()}-${earthquakes.length}`;
        eventData = {
          id: generateId(eventId),
          source: 'ESM Database',
          url: `https://esm-db.eu/#/event/${eventId}`,
          depth: 10, // Varsayılan derinlik
          location: 'ESM Region'
        };
      }
      
      // Zaman bilgisi
      const timeMatch = line.match(timePattern);
      if (timeMatch && eventData) {
        const timeStr = timeMatch[1];
        const time = new Date(timeStr);
        if (!isNaN(time.getTime())) {
          eventData.time = time;
        }
      }
      
      // Koordinat bilgisi 
      const coordMatch = line.match(coordinatePattern);
      if (coordMatch && eventData) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        const depth = coordMatch[3] ? parseFloat(coordMatch[3]) : 10;
        
        if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          eventData.latitude = lat;
          eventData.longitude = lon;
          eventData.depth = depth > 1000 ? depth / 1000 : depth;
        }
      }
      
      // Magnitüd bilgisi
      const magMatch = line.match(magnitudePattern);
      if (magMatch && eventData) {
        const mag = parseFloat(magMatch[1]);
        if (!isNaN(mag)) {
          eventData.magnitude = mag;
        }
      }
      
      // Bölge bilgisi
      if (line.includes('region') && i + 1 < lines.length) {
        const regionLine = lines[i + 1].trim();
        if (regionLine && eventData && !regionLine.includes('<')) {
          eventData.location = regionLine;
        }
      }
    }
    
    // Son depremi ekle
    if (eventData && eventData.time && eventData.latitude !== undefined && 
        eventData.longitude !== undefined && eventData.magnitude !== undefined) {
      earthquakes.push(eventData as Earthquake);
    }
    
    console.log(`ESM XML: ${earthquakes.length} deprem verisi işlendi`);
    return earthquakes;
  } catch (error) {
    console.error('ESM XML verileri alınırken hata:', error);
    return [];
  }
} 