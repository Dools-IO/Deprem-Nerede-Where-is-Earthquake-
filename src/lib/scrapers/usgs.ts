import axios from 'axios';
import { Earthquake } from '@/types';
import { generateId } from '@/utils/helpers';

// USGS REST API URL - Son 30 gündeki depremleri alır
const USGS_API_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
const MAX_EARTHQUAKES = 500; // Maksimum deprem sayısı

/**
 * USGS web API'sinden deprem verilerini çeker
 */
export async function fetchUSGSEarthquakes(): Promise<Earthquake[]> {
  try {
    // USGS doğrudan JSON API sağlıyor, scraping'e gerek yok
    const { data } = await axios.get(USGS_API_URL);
    const earthquakes: Earthquake[] = [];

    if (!data || !data.features || !Array.isArray(data.features)) {
      console.error('USGS: API yanıtında geçerli veri bulunamadı');
      return [];
    }

    // Her deprem kaydını işle
    for (const feature of data.features) {
      // Maksimum deprem sayısına ulaştığımızda döngüden çık
      if (earthquakes.length >= MAX_EARTHQUAKES) {
        break;
      }
      
      try {
        // Temel veri kontrolü
        if (!feature || !feature.properties || !feature.geometry) {
          console.log('USGS: Eksik özelliklere sahip öğe atlanıyor');
          continue;
        }
        
        const { properties, geometry } = feature;
        
        if (!properties.time || !geometry.coordinates || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 3) {
          console.log('USGS: Gerekli alanlar eksik, öğe atlanıyor');
          continue;
        }
        
        // Gerekli alanları çıkar
        let time = new Date();
        try {
          time = new Date(properties.time);
          if (isNaN(time.getTime())) {
            time = new Date(); // Geçersiz tarih, şu anki zamanı kullan
          }
        } catch (err) {
          console.error('USGS: Zaman dönüştürme hatası:', err);
        }
        
        const magnitude = typeof properties.mag === 'number' ? properties.mag : 0;
        const place = properties.place || 'Bilinmeyen Lokasyon';
        const detailUrl = properties.url || USGS_API_URL;
        
        // Konum bilgisini çıkar
        let longitude = 0;
        let latitude = 0;
        let depth = 0;
        
        try {
          [longitude, latitude, depth] = geometry.coordinates.map((v: any) => parseFloat(String(v)));
          
          if (isNaN(longitude)) longitude = 0;
          if (isNaN(latitude)) latitude = 0;
          if (isNaN(depth)) depth = 0;
        } catch (err) {
          console.error('USGS: Koordinat dönüştürme hatası:', err);
        }
        
        // Benzersiz ID oluştur
        const id = generateId(`usgs-${properties.code || properties.ids || time.toISOString()}`);
        
        earthquakes.push({
          id,
          time,
          latitude,
          longitude,
          depth,
          magnitude,
          location: place,
          source: 'USGS',
          url: detailUrl
        });
      } catch (err) {
        console.error('Error parsing USGS earthquake feature:', err);
      }
    }

    console.log(`USGS: ${earthquakes.length} deprem verisi çekildi.`);
    return earthquakes;
  } catch (error) {
    console.error('Error fetching USGS earthquakes:', error);
    return [];
  }
} 