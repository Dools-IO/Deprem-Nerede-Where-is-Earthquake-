import axios from 'axios';
import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';

// GeoNet API URL'i
const GEONET_API_URL = 'https://api.geonet.org.nz/quake';
const MAX_EARTHQUAKES = 500;

/**
 * GeoNet'ten deprem verilerini çeker
 * MMI parametresi -1 ile 8 arasında olmalıdır
 * -1: MMI hesaplanamayacak kadar küçük depremler
 * 8: En yüksek şiddetli depremler
 */
export async function fetchGeoNetEarthquakes(): Promise<Earthquake[]> {
  try {
    console.log('GeoNet: Deprem verileri çekiliyor...');
    
    // En düşük MMI değeri ile tüm depremleri çek (-1)
    const targetUrl = `${GEONET_API_URL}?MMI=-1`;
    const proxyUrl = `http://localhost:3000/api/proxy?url=${encodeURIComponent(targetUrl)}&format=json`;
    
    const response = await fetch(proxyUrl);
    const data = await response.json();

    const earthquakes: Earthquake[] = [];

    if (!data || !data.features || !Array.isArray(data.features)) {
      console.error('GeoNet: API yanıtında geçerli veri bulunamadı');
      return [];
    }

    // Son 500 depremi al ve işle
    const recentEarthquakes = data.features
      .sort((a: any, b: any) => {
        const timeA = new Date(a.properties.time).getTime();
        const timeB = new Date(b.properties.time).getTime();
        return timeB - timeA;
      })
      .slice(0, MAX_EARTHQUAKES);

    // Her deprem kaydını işle
    for (const feature of recentEarthquakes) {
      try {
        if (!feature.properties || !feature.geometry) continue;

        const { properties, geometry } = feature;
        
        // Gerekli alanları çıkar
        const time = new Date(properties.time);
        const magnitude = properties.magnitude || 0;
        const depth = properties.depth || 0;
        const [longitude, latitude] = geometry.coordinates || [0, 0];
        const location = properties.locality || 'New Zealand Region';
        const publicID = properties.publicID;

        // Geçerlilik kontrolü
        if (isNaN(latitude) || isNaN(longitude) || isNaN(magnitude) || isNaN(time.getTime())) {
          console.log('GeoNet: Geçersiz veri, atlanıyor:', { latitude, longitude, magnitude, time });
          continue;
        }

        earthquakes.push({
          id: generateId(`geonet-${publicID}`),
          time: time.toISOString(),
          latitude,
          longitude,
          depth,
          magnitude,
          location,
          source: 'GeoNet',
          url: `https://geonet.org.nz/earthquake/${publicID}`
        });

      } catch (err) {
        console.error('GeoNet: Deprem verisi işlenirken hata:', err);
      }
    }

    console.log(`GeoNet: ${earthquakes.length} deprem verisi çekildi.`);
    return earthquakes;
  } catch (error) {
    console.error('GeoNet deprem verileri çekilirken hata:', error);
    return [];
  }
} 