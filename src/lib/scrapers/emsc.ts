import axios from 'axios';
import * as cheerio from 'cheerio';
import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';
import { EarthquakeData } from '@/types/earthquake';
import { parseISO } from 'date-fns';

// Global SockJS tanımı
declare global {
  interface Window {
    SockJS: any;
  }
}

// API URL tanımları
const EMSC_BASE_URL = 'https://www.emsc-csem.org/';
// FDSN API URL - 500 deprem verisi XML formatında alınabilir
const EMSC_FDSN_API_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query?limit=500';
const MAX_EARTHQUAKES = 500; // Maksimum deprem sayısı
const SOURCE_LABEL = 'Seismic Portal'; // Veri kaynağı etiketi

// Son alınan depremler (WebSocket için)
let cachedEarthquakes: Earthquake[] = [];
// Tüm alınan deprem ID'lerini izlemek için
const receivedEarthquakeIds = new Set<string>();
let wsClient: any = null;

/**
 * Belirtilen süre kadar bekler
 * @param ms Milisaniye cinsinden bekleme süresi
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * WebSocket bağlantısını başlatır ve deprem verilerini dinler
 * Bu fonksiyon istemci tarafında (browser) çalışır
 */
export function initEarthquakeWebSocket() {
  if (typeof window === 'undefined') return null;
  
  try {
    if (!window.SockJS) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js';
      script.async = true;
      script.onload = initWebSocketConnection;
      document.head.appendChild(script);
    } else {
      initWebSocketConnection();
    }
    
    return wsClient;
  } catch (error) {
    console.error('EMSC WebSocket başlatma hatası:', error);
    return null;
  }
}

/**
 * SockJS kullanarak WebSocket bağlantısını başlatır
 */
function initWebSocketConnection() {
  try {
    if (wsClient) {
      try {
        wsClient.close();
      } catch (err) {
        console.error('WebSocket kapatma hatası:', err);
      }
    }
    
    wsClient = new window.SockJS('https://www.seismicportal.eu/standing_order');
    
    wsClient.onmessage = function(e: any) {
      try {
        const data = JSON.parse(e.data);
        
        if (data && typeof data === 'object') {
          const {
            id: eventId,
            time: timestamp,
            magnitude,
            flynn_region: region,
            lat: latitude,
            lon: longitude,
            depth,
            auth: source,
            evid: extractedId
          } = data;
          
          if (!timestamp || !magnitude || !latitude || !longitude) return;
          
          const time = new Date(timestamp);
          if (isNaN(time.getTime())) return;
          
          const id = generateId(`emsc-${extractedId || eventId || `${latitude}-${longitude}-${time.toISOString()}`}`);
          
          const earthquake: Earthquake = {
            id,
            time,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            depth: parseFloat(depth) || 10,
            magnitude: parseFloat(magnitude),
            location: region || 'Bilinmeyen Bölge',
            source: source || SOURCE_LABEL,
            url: `${EMSC_BASE_URL}Earthquake/${eventId}`
          };
          
          if (!receivedEarthquakeIds.has(id)) {
            receivedEarthquakeIds.add(id);
            cachedEarthquakes = [earthquake, ...cachedEarthquakes]
              .sort((a, b) => b.time.getTime() - a.time.getTime());
            
            if (cachedEarthquakes.length > MAX_EARTHQUAKES) {
              cachedEarthquakes = cachedEarthquakes.slice(0, MAX_EARTHQUAKES);
            }
          } else {
            cachedEarthquakes = cachedEarthquakes.map(eq => 
              eq.id === id ? earthquake : eq
            );
          }
        }
      } catch (err) {
        console.error('EMSC WebSocket veri işleme hatası:', err);
      }
    };
    
    wsClient.onclose = function() {
      setTimeout(initWebSocketConnection, 5000);
    };
  } catch (error) {
    console.error('WebSocket bağlantı hatası:', error);
  }
}

/**
 * WebSocket önbelleğindeki deprem verilerini döndürür
 */
export function getCachedEarthquakes(): Earthquake[] {
  return cachedEarthquakes;
}

/**
 * Yeni bir deprem verisini önbelleğe ekler
 * @param earthquake Eklenecek deprem verisi
 * @returns true: yeni eklendi, false: zaten vardı
 */
export function addToCache(earthquake: Earthquake): boolean {
  if (!receivedEarthquakeIds.has(earthquake.id)) {
    receivedEarthquakeIds.add(earthquake.id);
    cachedEarthquakes = [earthquake, ...cachedEarthquakes]
      .sort((a, b) => b.time.getTime() - a.time.getTime());
    
    // Maksimum sayıyı kontrol et
    if (cachedEarthquakes.length > MAX_EARTHQUAKES) {
      cachedEarthquakes = cachedEarthquakes.slice(0, MAX_EARTHQUAKES);
    }
    
    return true;
  } else {
    // ID'si aynı ama içeriği güncellenmiş olabilir
    cachedEarthquakes = cachedEarthquakes.map(eq => 
      eq.id === earthquake.id ? earthquake : eq
    );
    return false;
  }
}

/**
 * Test verileri - geçici olarak kullanılacak
 */
export function loadTestEarthquakes() {
  // Test için örnek veriler
  const testData: Earthquake[] = [
    {
      id: 'test-1',
      time: new Date(),
      latitude: 40.7128,
      longitude: -74.006,
      depth: 10,
      magnitude: 5.2,
      location: 'TEST - New York, USA',
      source: SOURCE_LABEL,
      url: 'https://www.emsc-csem.org'
    },
    {
      id: 'test-2',
      time: new Date(Date.now() - 3600000), // 1 saat önce
      latitude: 37.7749,
      longitude: -122.4194,
      depth: 15,
      magnitude: 4.8,
      location: 'TEST - San Francisco, USA',
      source: SOURCE_LABEL,
      url: 'https://www.emsc-csem.org'
    },
    {
      id: 'test-3',
      time: new Date(Date.now() - 7200000), // 2 saat önce
      latitude: 39.9042,
      longitude: 116.4074,
      depth: 8,
      magnitude: 6.1,
      location: 'TEST - Beijing, China',
      source: SOURCE_LABEL,
      url: 'https://www.emsc-csem.org'
    }
  ];
  
  // Test verilerini önbelleğe ekle
  testData.forEach(earthquake => {
    addToCache(earthquake);
  });
  
  // console.log('Test verileri yüklendi:', testData.length);
  return cachedEarthquakes;
}

/**
 * FDSN API'den deprem verilerini XML formatında çeker
 */
export async function fetchEMSCEarthquakesFromFDSN(): Promise<Earthquake[]> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const targetUrl = EMSC_FDSN_API_URL;
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await axios.get(proxyUrl, {
        timeout: 30000, // 30 saniye
      });
      
      if (!response.data) {
        throw new Error('Veri alınamadı');
      }

      const $ = cheerio.load(response.data, {
        xmlMode: true
      });
      
      const earthquakes: Earthquake[] = [];
      
      $('event').each((index, element) => {
        try {
          const $event = $(element);
          
          const time = new Date($event.find('time > value').text());
          if (isNaN(time.getTime())) return;
          
          const latitude = parseFloat($event.find('latitude > value').text());
          const longitude = parseFloat($event.find('longitude > value').text());
          const depth = parseFloat($event.find('depth > value').text()) / 1000; // km'ye çevir
          const magnitude = parseFloat($event.find('magnitude > mag > value').text());
          const region = $event.find('description > text').text() || 'Bilinmeyen Bölge';
          const eventId = $event.attr('publicID') || '';
          
          if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(magnitude)) {
            const uniqueId = generateId(`emsc-${eventId || ''}-${time.getTime()}-${latitude}-${longitude}-${magnitude}`);
            
            const earthquake: Earthquake = {
              id: uniqueId,
              time,
              latitude,
              longitude,
              depth: isNaN(depth) ? 10 : depth,
              magnitude,
              location: region,
              source: SOURCE_LABEL,
              url: `${EMSC_BASE_URL}Earthquake/${eventId}`
            };
            
            earthquakes.push(earthquake);
          }
        } catch (err) {
          console.error('EMSC veri ayrıştırma hatası:', err);
        }
      });
      
      if (earthquakes.length > 0) {
        return earthquakes;
      } else {
        throw new Error('Deprem verisi bulunamadı');
      }
    } catch (error) {
      console.error(`EMSC veri çekme denemesi ${retryCount + 1} başarısız:`, error);
      retryCount++;
      
      if (retryCount === maxRetries) {
        console.error('EMSC maksimum deneme sayısına ulaşıldı');
        return [];
      }
      
      // Artan bekleme süresi (2s, 4s, 8s)
      await delay(Math.pow(2, retryCount + 1) * 1000);
    }
  }
  
  return [];
}

/**
 * EMSC deprem verilerini çeker
 * Öncelikle FDSN API'den veri çekmeyi dener, başarısız olursa WebSocket önbelleğine bakar
 */
export async function fetchEMSCEarthquakes(): Promise<Earthquake[]> {
  try {
    await fetchEMSCEarthquakesFromFDSN();
    
    if (cachedEarthquakes.length === 0) {
      loadTestEarthquakes();
    }
    
    return cachedEarthquakes;
  } catch (error) {
    console.error('EMSC veri alma hatası:', error);
    
    if (cachedEarthquakes.length === 0) {
      return loadTestEarthquakes();
    }
    
    return cachedEarthquakes;
  }
} 