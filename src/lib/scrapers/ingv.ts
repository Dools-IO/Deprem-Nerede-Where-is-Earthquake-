import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';
import * as xml2js from 'xml2js';

const INGV_API_BASE_URL = 'https://webservices.ingv.it/fdsnws/event/1/query';

// CORS proxyleri
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
  'https://proxy.cors.sh/'
];

/**
 * Verilen URL için tüm proxyleri dener
 */
async function fetchWithFallback(url: string, options: RequestInit = {}): Promise<Response> {
  let lastError: Error | null = null;

  // Önce proxy olmadan dene
  try {
    const response = await fetch(url, options);
    if (response.ok) return response;
  } catch (error) {
    console.log('⚠️ INGV: Doğrudan bağlantı başarısız, proxyler deneniyor...');
    lastError = error as Error;
  }

  // Proxyler ile dene
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy === 'https://api.allorigins.win/raw?url=' 
        ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        : `${proxy}${encodeURIComponent(url)}`;

      console.log(`📡 INGV: Proxy deneniyor: ${proxy}`);
      
      const response = await fetch(proxyUrl, {
        ...options,
        headers: {
          ...options.headers,
          'origin': window.location.origin
        }
      });

      if (response.ok) {
        console.log(`✅ INGV: Proxy başarılı: ${proxy}`);
        
        // allorigins için özel işlem
        if (proxy === 'https://api.allorigins.win/raw?url=') {
          const data = await response.json();
          const modifiedResponse = new Response(data.contents, {
            status: 200,
            headers: new Headers({
              'Content-Type': 'application/xml'
            })
          });
          return modifiedResponse;
        }
        
        return response;
      }
    } catch (error) {
      console.log(`⚠️ INGV: Proxy başarısız: ${proxy}`, error);
      lastError = error as Error;
    }
  }

  throw lastError || new Error('Tüm bağlantı denemeleri başarısız oldu');
}

interface INGVEventTime {
  value: string;
}

interface INGVEventValue {
  value: string;
}

interface INGVEventDescription {
  text: string;
}

interface INGVEventOrigin {
  time: INGVEventTime;
  latitude: INGVEventValue;
  longitude: INGVEventValue;
  depth: INGVEventValue;
}

interface INGVEventMagnitude {
  mag: INGVEventValue;
  type: string;
}

interface INGVEvent {
  type: string;
  description: {
    text: string;
  };
  origin: INGVEventOrigin;
  magnitude: INGVEventMagnitude;
  publicID: string;
}

interface INGVResponse {
  'q:quakeml': {
    eventParameters: {
      event: INGVEvent | INGVEvent[];
    };
  };
}

/**
 * XML verisini parse eder ve Earthquake formatına dönüştürür
 */
async function parseINGVXMLResponse(xmlData: string): Promise<Earthquake[]> {
  try {
    // XML verisi kontrolü
    if (!xmlData.trim().startsWith('<?xml') && !xmlData.trim().startsWith('<q:quakeml')) {
      console.warn('⚠️ INGV: Geçersiz XML verisi:', xmlData.substring(0, 100));
      throw new Error('Geçersiz XML verisi');
    }

    const parser = new xml2js.Parser({ 
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false 
    });
    
    const result = await parser.parseStringPromise(xmlData) as INGVResponse;

    if (!result?.['q:quakeml']?.eventParameters?.event) {
      console.warn('⚠️ INGV: Veri bulunamadı');
      return [];
    }

    const events = Array.isArray(result['q:quakeml'].eventParameters.event) 
      ? result['q:quakeml'].eventParameters.event 
      : [result['q:quakeml'].eventParameters.event];

    return events
      .filter(event => event.type === 'earthquake')
      .map(event => {
        try {
          const timeStr = event.origin.time.value;
          const latStr = event.origin.latitude.value;
          const lonStr = event.origin.longitude.value;
          const depthStr = event.origin.depth.value;
          const magStr = event.magnitude.mag.value;
          const location = event.description?.text || 'Bilinmeyen Lokasyon';
          const eventId = event.publicID?.split('eventId=').pop() || '';

        const time = new Date(timeStr);
          const lat = parseFloat(latStr);
          const lon = parseFloat(lonStr);
          const depth = parseFloat(depthStr) / 1000; // Derinliği km'ye çevir
          const mag = parseFloat(magStr);

          // Geçersiz değerleri filtrele
          if (isNaN(lat) || isNaN(lon) || isNaN(depth) || isNaN(mag) || !time || isNaN(time.getTime())) {
            console.warn('⚠️ INGV: Geçersiz veri formatı, bu kayıt atlanıyor:', event);
            return null;
          }

          const earthquake: Earthquake = {
            id: generateId(`ingv-${eventId}-${lat}-${lon}-${depth}`),
            time: time.toISOString(),
            latitude: lat,
            longitude: lon,
            depth,
            magnitude: mag,
            location,
            source: 'INGV',
            url: `https://terremoti.ingv.it/event/${eventId}`
          };

          return earthquake;
        } catch (error) {
          console.warn('⚠️ INGV: Veri dönüştürme hatası:', error);
          return null;
        }
      })
      .filter((earthquake): earthquake is Earthquake => earthquake !== null);
  } catch (error) {
    console.error('❌ INGV: XML parse hatası:', error);
    return [];
  }
}

/**
 * INGV API'den deprem verilerini çeker
 */
export async function fetchINGVEarthquakes(): Promise<Earthquake[]> {
  try {    
    console.log('🚀 INGV: Deprem verileri API\'den çekiliyor...');

    // Son 1 yılın tarihini hesapla
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    // API parametrelerini oluştur
    const params = new URLSearchParams({
      starttime: startDate.toISOString().split('.')[0],
      endtime: endDate.toISOString().split('.')[0],
      minmag: '2',
      limit: '500',
      orderby: 'time' // En son depremleri almak için 'time' kullanıyoruz
    });

    const apiUrl = `${INGV_API_BASE_URL}?${params}`;
    console.log('📡 INGV: API isteği yapılıyor:', apiUrl);
    
    const response = await fetchWithFallback(apiUrl, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'DepremNerede/1.0'
      }
    });

    const xmlData = await response.text();
    
    if (!xmlData || xmlData.trim() === '') {
      throw new Error('API boş yanıt döndü');
    }

    console.log('📥 INGV: XML verisi alındı, işleniyor...');
    
    let earthquakes = await parseINGVXMLResponse(xmlData);

    // Zaman değerlerini kontrol et ve düzelt
    earthquakes = earthquakes.map(eq => {
      try {
        // time değerini Date nesnesine çevir ve tekrar ISO string'e dönüştür
        const timeDate = new Date(eq.time);
        if (isNaN(timeDate.getTime())) {
          console.warn('⚠️ INGV: Geçersiz zaman değeri:', eq.time);
          return null;
        }
        return {
          ...eq,
          time: timeDate.toISOString() // Standart ISO formatına çevir
        };
      } catch (error) {
        console.warn('⚠️ INGV: Zaman dönüştürme hatası:', error);
        return null;
      }
    }).filter((eq): eq is Earthquake => eq !== null);

    // En son depremler önce gelecek şekilde sırala
    earthquakes.sort((a, b) => {
      try {
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        if (isNaN(timeA) || isNaN(timeB)) {
          console.warn('⚠️ INGV: Sıralama için geçersiz tarih değeri');
          return 0;
        }
        return timeB - timeA;
      } catch (error) {
        console.warn('⚠️ INGV: Sıralama hatası:', error);
        return 0;
      }
    });

    console.log(`✅ INGV: API'den toplam ${earthquakes.length} deprem verisi çekildi`);
    return earthquakes;

  } catch (error) {
    console.error('❌ INGV API veri çekme hatası:', error);
    return [];
  }
} 