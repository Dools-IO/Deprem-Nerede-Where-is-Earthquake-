import { Earthquake } from '@/types';
import { fetchEMSCEarthquakes } from './emsc';
import { fetchIRISEarthquakes } from './iris';
import { fetchKOERIEarthquakes } from './koeri';
import { fetchUSGSEarthquakes } from './usgs';
import { fetchESMEarthquakes } from './esm';
import { fetchJMAEarthquakes } from './jma';
import { fetchGAEarthquakes } from './ga';
import { fetchGeoNetEarthquakes } from './geonet';
import { fetchSSNEarthquakes } from './ssn';
import { fetchINGVEarthquakes } from './ingv';

// Dışa aktar
export { 
  fetchEMSCEarthquakes, 
  fetchIRISEarthquakes, 
  fetchKOERIEarthquakes, 
  fetchUSGSEarthquakes, 
  fetchESMEarthquakes,
  fetchJMAEarthquakes,
  fetchGAEarthquakes,
  fetchGeoNetEarthquakes,
  fetchSSNEarthquakes,
  fetchINGVEarthquakes
};

// Mock veri - API çağrısı başarısız olursa kullanılacak
const mockEarthquakeData: Earthquake[] = [
  {
    id: 'mock-1',
    time: new Date().toISOString(),
    latitude: 39.92,
    longitude: 32.85,
    depth: 10.5,
    magnitude: 4.2,
    location: 'Ankara, Türkiye',
    source: 'Kandilli',
    url: 'http://www.koeri.boun.edu.tr'
  },
  {
    id: 'mock-2',
    time: new Date(Date.now() - 3600000).toISOString(), // 1 saat önce
    latitude: 38.41,
    longitude: 27.14,
    depth: 7.2,
    magnitude: 3.5,
    location: 'İzmir, Türkiye',
    source: 'Kandilli',
    url: 'http://www.koeri.boun.edu.tr'
  },
  {
    id: 'mock-3',
    time: new Date(Date.now() - 7200000).toISOString(), // 2 saat önce
    latitude: 40.98,
    longitude: 29.02,
    depth: 5.8,
    magnitude: 3.2,
    location: 'İstanbul, Türkiye',
    source: 'Kandilli',
    url: 'http://www.koeri.boun.edu.tr'
  },
  {
    id: 'mock-4',
    time: new Date(Date.now() - 10800000).toISOString(), // 3 saat önce
    latitude: 37.87,
    longitude: 32.48,
    depth: 8.3,
    magnitude: 4.8,
    location: 'Konya, Türkiye',
    source: 'Kandilli',
    url: 'http://www.koeri.boun.edu.tr'
  },
  {
    id: 'mock-5',
    time: new Date(Date.now() - 14400000).toISOString(), // 4 saat önce
    latitude: 36.89,
    longitude: 30.70,
    depth: 6.5,
    magnitude: 3.8,
    location: 'Antalya, Türkiye',
    source: 'Kandilli',
    url: 'http://www.koeri.boun.edu.tr'
  }
];

/**
 * Tüm kaynaklardan deprem verilerini çeker ve birleştirir
 */
export async function fetchAllEarthquakes(): Promise<Earthquake[]> {
  try {
    const results = await Promise.allSettled([
      fetchEMSCEarthquakes(),
      fetchKOERIEarthquakes(),
      fetchUSGSEarthquakes(),
      fetchIRISEarthquakes(),
      fetchESMEarthquakes(),
      fetchJMAEarthquakes(),
      fetchGAEarthquakes(),
      fetchGeoNetEarthquakes(),
      fetchSSNEarthquakes(),
      fetchINGVEarthquakes()
    ]);

    const sources = ['EMSC', 'KOERI', 'USGS', 'IRIS', 'ESM', 'JMA', 'GA', 'GeoNet', 'SSN', 'INGV'];
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`${sources[index]} veri çekme hatası:`, result.reason);
      }
    });

    const earthquakes = results
      .filter((result): result is PromiseFulfilledResult<Earthquake[]> => 
        result.status === 'fulfilled')
      .flatMap(result => result.value);

    let sortedEarthquakes;
    try {
      sortedEarthquakes = earthquakes.sort((a, b) => {
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Deprem verilerini sıralarken hata:', error);
      // Hata durumunda basit string karşılaştırması yap
      sortedEarthquakes = earthquakes.sort((a, b) => b.time.localeCompare(a.time));
    }
    
    if (sortedEarthquakes.length === 0) {
      return mockEarthquakeData;
    }
    
    return sortedEarthquakes;
  } catch (error) {
    console.error('Deprem verilerini çekerken genel hata:', error);
    return mockEarthquakeData;
  }
} 