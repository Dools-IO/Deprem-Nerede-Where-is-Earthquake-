import axios from 'axios';
import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';

// GA WFS URL'i
const GA_WFS_URL = 'https://earthquakes.ga.gov.au/geoserver/earthquakes/wfs';
const MAX_EARTHQUAKES = 500;

/**
 * Geoscience Australia'dan deprem verilerini çeker
 */
export async function fetchGAEarthquakes(): Promise<Earthquake[]> {
  try {
    console.log('GA: Deprem verileri çekiliyor...');
    
    // WFS parametreleri
    const params = {
      service: 'WFS',
      request: 'getfeature',
      typeNames: 'earthquakes:earthquakes_seven_days',
      outputFormat: 'application/json',
      CQL_FILTER: "display_flag='Y'"
    };
    
    // URL'yi oluştur
    const queryString = new URLSearchParams(params).toString();
    const targetUrl = `${GA_WFS_URL}?${queryString}`;
    const proxyUrl = `http://localhost:3000/api/proxy?url=${encodeURIComponent(targetUrl)}&format=json`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();

    const earthquakes: Earthquake[] = [];

    if (!data || !data.features || !Array.isArray(data.features)) {
      console.error('GA: WFS yanıtında geçerli veri bulunamadı');
      return [];
    }

    // Son 500 depremi al ve işle
    const recentEarthquakes = data.features
      .sort((a: any, b: any) => {
        const timeA = new Date(a.properties.epicentral_time).getTime();
        const timeB = new Date(b.properties.epicentral_time).getTime();
        return timeB - timeA;
      })
      .slice(0, MAX_EARTHQUAKES);

    // Her deprem kaydını işle
    for (const feature of recentEarthquakes) {
      try {
        if (!feature.properties || !feature.geometry) continue;

        const { properties, geometry } = feature;
        
        // Gerekli alanları çıkar
        const time = new Date(properties.epicentral_time);
        const magnitude = properties.preferred_magnitude || 0;
        const depth = properties.depth || 10;
        const [longitude, latitude] = geometry.coordinates || [0, 0];
        const location = properties.description || 'Australia Region';
        const eventId = properties.event_id || `${time.toISOString()}-${latitude}-${longitude}`;

        // Geçerlilik kontrolü
        if (isNaN(latitude) || isNaN(longitude) || isNaN(magnitude) || isNaN(time.getTime())) {
          console.log('GA: Geçersiz veri, atlanıyor:', { latitude, longitude, magnitude, time });
          continue;
        }

        earthquakes.push({
          id: generateId(`ga-${eventId}`),
          time: time.toISOString(),
          latitude,
          longitude,
          depth,
          magnitude,
          location,
          source: 'GA',
          url: `https://earthquakes.ga.gov.au/#/event/${eventId}`
        });

      } catch (err) {
        console.error('GA: Deprem verisi işlenirken hata:', err);
      }
    }

    console.log(`GA: ${earthquakes.length} deprem verisi çekildi.`);
    return earthquakes;
  } catch (error) {
    console.error('GA deprem verileri çekilirken hata:', error);
    return [];
  }
} 